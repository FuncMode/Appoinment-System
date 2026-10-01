// AdminDashboard — admin (split from screens-admin.jsx)
import { useEffect, useState } from 'react';
import { AppShell, EmptyState, Icon, MiniBarChart, navigate, PageHeader, Pagination, PatientAvatar, SkeletonRows, Sparkline, StatusBadge, useStore } from '../shared/components.jsx';
import { findDoctor, findPatient, formatDate, statusMeta, timeValue } from '../shared/data.js';
import { downloadCSV, localToday } from './helpers.js';

// ---------- Admin Dashboard ----------
function AdminDashboard() {
  const store = useStore();
  const now = new Date();
  const today = localToday();
  const todayAppts = store.appointments.filter(a => a.date === today);
  // Today's schedule table: sorted chronologically and paginated (same pattern
  // as the other admin tables) so a full clinic day doesn't stretch the card
  const [schedulePage, setSchedulePage] = useState(1);
  const SCHEDULE_PAGE = 5;
  const todaySorted = [...todayAppts].sort((a, b) => timeValue(a.time) - timeValue(b.time));
  const lastSchedulePage = Math.max(1, Math.ceil(todaySorted.length / SCHEDULE_PAGE));
  const safeSchedulePage = Math.min(schedulePage, lastSchedulePage);
  const pagedToday = todaySorted.slice((safeSchedulePage - 1) * SCHEDULE_PAGE, safeSchedulePage * SCHEDULE_PAGE);
  const pending = store.appointments.filter(a => a.status === 'pending');

  // Simulated fetch (same 600ms pattern as the other admin lists) so the
  // dashboard shows skeletons before the data appears
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  // Real context per card — computed from the live store, never hardcoded
  // (the old copy — "+3 from yesterday", "4 need review" — contradicted the
  // card values and read as template filler)
  const confirmedToday = todayAppts.filter(a => a.status === 'confirmed').length;
  const pendingToday = todayAppts.filter(a => a.status === 'pending').length;
  const pendingArrivedToday = pending.filter(a => a.createdAt === today).length;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newThisMonth = store.patients.filter(p => p.joined && String(p.joined).startsWith(monthKey)).length;
  const onLeave = store.doctors.filter(d => d.status === 'on-leave').length;

  // Trend sparklines — computed from real store data (counts per day over the
  // last 7 days). Cards with no data at all render without a sparkline.
  const dayCounts = (list, dateKey) => {
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      counts.push(list.filter(x => (x[dateKey] || '') === iso).length);
    }
    return counts.some(c => c > 0) ? counts : null;
  };
  const stats = [
    { label: 'Today\'s appointments', value: todayAppts.length, delta: `${confirmedToday} confirmed · ${pendingToday} pending`, icon: 'calendar', kind: 'neutral', trend: dayCounts(store.appointments, 'date') },
    { label: 'Pending confirmation',   value: pending.length,   delta: `${pendingArrivedToday} arrived today`, icon: 'clock', kind: 'warn', trend: dayCounts(pending, 'createdAt') },
    { label: 'Total patients',         value: store.patients.length, delta: newThisMonth ? `${newThisMonth} new this month` : 'No new patients this month',  icon: 'users-round', kind: 'up', trend: dayCounts(store.patients.filter(p => p.joined), 'joined') },
    { label: 'Active doctors',         value: store.doctors.filter(d => d.status !== 'on-leave').length, delta: `${onLeave} on leave`, icon: 'stethoscope', kind: 'neutral', trend: null },
  ];

  // Chart data — computed from the live appointments store (no prototype
  // numbers). Week ranges bucket per day (Mon–Sun); the 30-day range buckets
  // per 5-day span. Empty ranges render "—" instead of invented rates.
  const [range, setRange] = useState('this-week');
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
  const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const countByDate = {};
  for (const a of store.appointments) countByDate[a.date] = (countByDate[a.date] || 0) + 1;
  const weekData = (start) => WEEK.map((label, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { label, value: countByDate[toISO(d)] || 0 };
  });
  // 30 days: 6 buckets × 5 days, oldest → newest
  const data30 = [];
  for (let i = 5; i >= 0; i--) {
    const bStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 5 - 4);
    const bEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 5);
    let value = 0;
    for (const a of store.appointments) if (a.date >= toISO(bStart) && a.date <= toISO(bEnd)) value++;
    data30.push({ label: bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value });
  }
  // Range summary — real rates from the appointments in the selected range;
  // completion/cancellation show "—" when the range has no appointments.
  const rangeSummary = (startISO, endISO, days, totalLabel) => {
    const inRange = store.appointments.filter(a => a.date >= startISO && a.date <= endISO);
    const total = inRange.length;
    const completed = inRange.filter(a => a.status === 'completed').length;
    const cancelled = inRange.filter(a => a.status === 'cancelled' || a.status === 'no-show').length;
    return {
      totalLabel,
      total,
      avg: Math.round(total / days),
      completion: total ? `${Math.round((completed / total) * 100)}%` : '—',
      cancellation: total ? `${Math.round((cancelled / total) * 100)}%` : '—',
    };
  };
  const ranges = {
    'this-week': {
      label: 'Appointments this week',
      data: weekData(monday),
      summary: rangeSummary(toISO(monday), toISO(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)), 7, 'Total this week'),
    },
    'last-week': {
      label: 'Appointments last week',
      data: weekData(lastMonday),
      summary: rangeSummary(toISO(lastMonday), toISO(new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + 6)), 7, 'Total last week'),
    },
    '30-days': {
      label: 'Appointments (last 30 days)',
      data: data30,
      summary: rangeSummary(toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), today, 30, 'Total (30 days)'),
    },
  };
  const active = ranges[range];
  // Highlight the peak bar of whichever range is active, instead of a
  // hardcoded day
  const peak = Math.max(...active.data.map(d => d.value), 0);

  return (
    <AppShell current="a-dashboard">
      <div className="page">
        <PageHeader
          title="Admin overview"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 380, maxWidth: '100%', height: 14 }} />
            : `${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · ${todayAppts.length} appointments scheduled today`}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => {
                downloadCSV('medicacare-today-appointments.csv', [
                  ['Time', 'Patient', 'Phone', 'Doctor', 'Specialty', 'Reason', 'Status'],
                  ...todayAppts.map(a => {
                    const d = window.findDoctor(a.doctorId);
                    const p = window.findPatient(a.patientId);
                    return [a.time, p?.name || 'Unknown', p?.phone || '', d?.name || 'Unknown', d?.specialty || '', a.reason, window.statusMeta(a.status).label];
                  }),
                ]);
                store.pushToast({ title: 'Export ready', msg: `${todayAppts.length} appointment(s) exported to CSV.` });
              }}><Icon name="download" size={14} /> Export</button>
              <button className="btn btn-primary" onClick={() => navigate('/admin/appointments')}><Icon name="calendar-days" size={14} /> Manage appointments</button>
            </>
          }
        />

        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {stats.map((s, i) => (
            <div key={i} className={'card stat-card' + (s.trend ? ' stat-card-spark' : '')}>
              {loading ? (
                <>
                  <span className="skel" style={{ height: 12, width: '70%' }} />
                  <span className="skel" style={{ height: 26, width: '32%' }} />
                  <span className="skel" style={{ height: 10, width: '55%' }} />
                </>
              ) : (
                <>
                  <div className="stat-label"><Icon name={s.icon} size={14} /> {s.label}</div>
                  <div className="stat-row">
                    <div className="stat-value">{s.value}</div>
                    {s.trend && <Sparkline data={s.trend} tone={s.kind === 'up' ? 'success' : 'primary'} delay={350 + i * 200} />}
                  </div>
                  <div className={'stat-delta ' + (s.kind === 'up' ? 'up' : s.kind === 'warn' ? 'warn' : '')}>
                    {s.delta}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="two-col" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <h2 className="h-section">{active.label}</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['this-week', 'This week'], ['last-week', 'Last week'], ['30-days', '30 days']].map(([key, label]) => (
                  <button key={key} className={'chip filter' + (range === key ? ' on' : '')} onClick={() => setRange(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body compact">
              {loading ? (
                <div style={{ height: 208, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="spinner" role="status" aria-label="Loading chart" />
                </div>
              ) : active.summary.total === 0 ? (
                <EmptyState
                  icon="bar-chart-3"
                  title="No appointment data yet"
                  message="Charts fill in as appointments are recorded — data comes from the database once the backend is connected."
                />
              ) : (
                <>
                  {/* Highlight the peak bar of whichever range is active,
                      instead of a hardcoded day */}
                  {/* key={range} remounts the chart so the entrance
                      animation replays on every filter switch; delay=350
                      holds a beat after the skeletons clear */}
                  <MiniBarChart
                    key={range} delay={350}
                    data={active.data.map(d => ({ ...d, highlight: d.value === peak }))}
                    height={140} trend
                  />
                  <div className="divider" style={{ margin: '10px 0' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    <div>
                      <div className="t-help">{active.summary.totalLabel}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{active.summary.total}</div>
                    </div>
                    <div>
                      <div className="t-help">Avg. per day</div>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{active.summary.avg}</div>
                    </div>
                    <div>
                      <div className="t-help">Completion rate</div>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--success)' }}>{active.summary.completion}</div>
                    </div>
                    <div>
                      <div className="t-help">Cancellation rate</div>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{active.summary.cancellation}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="h-section">Pending reviews</h2>
              <button className="btn btn-ghost sm" onClick={() => navigate('/admin/appointments?status=pending')}>See all <Icon name="arrow-right" size={13} /></button>
            </div>
            <div>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="list-item">
                    <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                    <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="skel" style={{ height: 10, width: '60%' }} />
                      <span className="skel" style={{ height: 10, width: '85%' }} />
                    </div>
                  </div>
                ))
              ) : pending.length === 0 ? (
                <EmptyState
                  icon="clipboard-check"
                  title="Nothing to review"
                  message="No appointments are waiting for confirmation. New patient bookings will appear here."
                />
              ) : pending.slice(0, 4).map(a => {
                const d = window.findDoctor(a.doctorId);
                const p = window.findPatient(a.patientId);
                return (
                  <div key={a.id} className="list-item">
                    <PatientAvatar person={p} size={28} />
                    <div className="list-item-body">
                      <div className="list-item-title">{p.name}</div>
                      <div className="list-item-sub">{d.specialty} · {window.formatDate(a.date)} {a.time}</div>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="h-section">Today's schedule</h2>
            <button className="btn btn-ghost sm" onClick={() => navigate('/admin/appointments')}>Open queue <Icon name="arrow-right" size={13} /></button>
          </div>
          <div className="table-wrap">
            <table className="table table-responsive-stack">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="col-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows mirroring the real ones: the Patient cell has
                  // an avatar + phone line like the loaded rows, and every cell
                  // carries data-label so the mobile stacked-card view renders
                  // with labels (plain <SkeletonRows/> bars ignore that layout)
                  Array.from({ length: 5 }).map((_, r) => (
                    <tr key={r}>
                      <td data-label="Time" className="td-nowrap"><span className="skel" style={{ width: 44, height: 12 }} /></td>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <span className="skel" style={{ width: 120, maxWidth: '100%', height: 12, display: 'block' }} />
                            <span className="skel" style={{ width: 88, height: 10, display: 'block', marginTop: 4 }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Doctor" className="cell-primary-truncate"><span className="skel" style={{ width: '70%', height: 12 }} /></td>
                      <td data-label="Specialty" className="td-nowrap"><span className="skel" style={{ width: '65%', height: 12 }} /></td>
                      <td data-label="Reason" className="cell-primary-truncate"><span className="skel" style={{ width: '75%', height: 12 }} /></td>
                      <td data-label="Status"><span className="skel" style={{ width: 64, height: 18 }} /></td>
                      <td className="col-actions"><span className="skel" style={{ width: 64, height: 28 }} /></td>
                    </tr>
                  ))
                ) : todayAppts.length === 0 ? (
                  <tr><td colSpan={7} className="empty-cell"><EmptyState icon="calendar-x" title="No appointments today" message="The schedule is clear." /></td></tr>
                ) : pagedToday.map(a => {
                  const d = window.findDoctor(a.doctorId);
                  const p = window.findPatient(a.patientId);
                  return (
                    <tr key={a.id}>
                      <td data-label="Time" className="td-nowrap" style={{ fontWeight: 500 }}>{a.time}</td>
                      <td data-label="Patient"><div className="cell-with-avatar"><PatientAvatar person={p} size={28} /><div><div className="cell-primary cell-primary-truncate" style={{ maxWidth: 150 }}>{p.name}</div><div className="cell-secondary">{p.phone}</div></div></div></td>
                      <td data-label="Doctor" className="cell-primary-truncate" style={{ maxWidth: 140 }}>{d.name}</td>
                      <td data-label="Specialty" className="td-nowrap">{d.specialty}</td>
                      <td data-label="Reason" className="cell-primary-truncate" style={{ maxWidth: 170 }}>{a.reason}</td>
                      <td data-label="Status"><StatusBadge status={a.status} /></td>
                      <td className="col-actions"><button className="btn btn-ghost sm" onClick={() => navigate('/admin/appointments')}>Manage</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && todaySorted.length > 0 && (
            <Pagination page={safeSchedulePage} setPage={setSchedulePage} total={todaySorted.length} pageSize={SCHEDULE_PAGE} label="appointments" />
          )}
        </div>
      </div>
    </AppShell>
  );
}

export { AdminDashboard };
