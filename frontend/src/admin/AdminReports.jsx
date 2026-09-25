// AdminReports — admin (split from screens-admin.jsx)
import { useEffect, useState } from 'react';
import { AppShell, DoctorAvatar, EmptyState, Icon, MiniBarChart, PageHeader, SkeletonRows, Sparkline, useStore } from '../shared/components.jsx';
import { findDoctor, SPECIALTIES } from '../shared/data.js';
import { downloadCSV } from './helpers.js';

// ---------- Reports ----------
// Prototype reports — computed from the in-memory demo data.
function AdminReports() {
  const store = useStore();
  const appts = store.appointments;

  // Simulated fetch (same 600ms pattern as the other admin pages) —
  // skeletons/spinner before the report data appears
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const completed = appts.filter(a => a.status === 'completed').length;
  const cancelled = appts.filter(a => a.status === 'cancelled').length;
  const completionRate = appts.length ? Math.round((completed / appts.length) * 100) : 0;
  const cancellationRate = appts.length ? ((cancelled / appts.length) * 100).toFixed(1) : '0.0';

  // Trend lines are prototype data (same approach as the Dashboard cards) —
  // each series ends at the card's current value so line and number agree
  const stats = [
    { label: 'Total appointments', value: appts.length, icon: 'calendar-days', tone: 'success', trend: [19, 20, 21, 21, 23, 24, 25] },
    { label: 'Completed visits', value: completed, icon: 'check-circle-2', tone: 'success', trend: [3, 4, 4, 5, 5, 6, 6] },
    { label: 'Completion rate', value: `${completionRate}%`, icon: 'trending-up', tone: 'success', trend: [18, 20, 19, 22, 21, 25, 24] },
    // Rising cancellations are bad news — the trend line reads red
    { label: 'Cancellation rate', value: `${cancellationRate}%`, icon: 'x-circle', tone: 'error', trend: [6, 5.5, 7, 6.5, 7.5, 8, 8] },
  ];

  // Appointments per specialty, computed from the demo data
  const bySpecialty = SPECIALTIES
    .map(sp => {
      const doctorIds = store.doctors.filter(d => d.specialty === sp).map(d => d.id);
      const list = appts.filter(a => doctorIds.includes(a.doctorId));
      const done = list.filter(a => a.status === 'completed');
      const revenue = done.reduce((sum, a) => {
        const doc = window.findDoctor(a.doctorId);
        return sum + (doc ? doc.fee : 0);
      }, 0);
      return {
        specialty: sp,
        total: list.length,
        completed: done.length,
        cancelled: list.filter(a => a.status === 'cancelled').length,
        revenue,
      };
    })
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const chartData = bySpecialty.slice(0, 6).map(r => ({ label: r.specialty, value: r.total }));
  // Highlight the peak specialty bar, same as the Dashboard week chart
  const peak = Math.max(...chartData.map(d => d.value));

  // Busiest doctors by appointment count (3 rows to visually match the specialty chart beside it)
  const byDoctor = store.doctors
    .map(d => ({ ...d, count: appts.filter(a => a.doctorId === d.id).length }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <AppShell current="reports">
      <div className="page">
        <PageHeader
          title="Reports"
          subtitle="Appointment activity across specialties and doctors."
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Reports' }]}
          actions={<button className="btn btn-secondary" onClick={() => {
            downloadCSV('medicacare-reports-by-specialty.csv', [
              ['Specialty', 'Appointments', 'Completed', 'Cancelled', 'Revenue (completed)'],
              ...bySpecialty.map(r => [r.specialty, r.total, r.completed, r.cancelled, r.revenue]),
            ]);
            store.pushToast({ title: 'Export ready', msg: 'Specialty breakdown exported to CSV.' });
          }}><Icon name="download" size={14} /> Export CSV</button>}
        />

        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {stats.map((s, i) => (
            <div key={i} className={'card stat-card' + (s.trend ? ' stat-card-spark' : '')}>
              {loading ? (
                <>
                  <span className="skel" style={{ height: 12, width: '70%' }} />
                  <span className="skel" style={{ height: 26, width: '32%' }} />
                  <span className="skel" style={{ height: 22, width: '40%' }} />
                </>
              ) : (
                <>
                  <div className="stat-label"><Icon name={s.icon} size={14} /> {s.label}</div>
                  <div className="stat-row">
                    <div className="stat-value">{s.value}</div>
                    {s.trend && <Sparkline data={s.trend} tone={s.tone} delay={350 + i * 200} />}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="two-col" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><h2 className="h-section">Appointments by specialty</h2></div>
            <div className="card-body">
              {loading ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="spinner" role="status" aria-label="Loading chart" />
                </div>
              ) : (
                <MiniBarChart
                  data={chartData.map(d => ({ ...d, highlight: d.value === peak }))}
                  height={160} trend delay={350}
                />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="h-section">Busiest doctors</h2></div>
            <div>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="list-item">
                    <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                    <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="skel" style={{ height: 10, width: '60%' }} />
                      <span className="skel" style={{ height: 10, width: '45%' }} />
                    </div>
                    {/* Mirror the real row's right-side appointments pill */}
                    <span className="skel" style={{ width: 92, height: 22, borderRadius: 'var(--r-pill)', flexShrink: 0 }} />
                  </div>
                ))
              ) : byDoctor.map(d => (
                <div key={d.id} className="list-item">
                  <DoctorAvatar doctor={d} size={28} />
                  <div className="list-item-body">
                    <div className="list-item-title">{d.name}</div>
                    <div className="list-item-sub">{d.specialty} · {d.room}</div>
                  </div>
                  {/* Neutral stat pill — same right-side treatment as the
                      status badges on the other list rows */}
                  <span className="badge badge-neutral" style={{ flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{d.count}</span>
                    {d.count === 1 ? 'appointment' : 'appointments'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Breakdown by specialty</h2></div>
          <div className="table-wrap">
            <table className="table table-responsive-stack">
              <thead>
                <tr>
                  <th>Specialty</th>
                  <th className="col-num">Appointments</th>
                  <th className="col-num">Completed</th>
                  <th className="col-num">Cancelled</th>
                  <th className="col-num">Revenue (completed)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows rows={6} cols={5} />
                  : bySpecialty.length === 0 ? (
                  <tr><td colSpan={5} className="empty-cell" style={{ padding: 0 }}>
                    <EmptyState icon="calendar-x" title="No appointment data yet" message="Reports will appear once appointments are booked." />
                  </td></tr>
                ) : bySpecialty.map(r => (
                  <tr key={r.specialty}>
                    <td data-label="Specialty" style={{ fontWeight: 500 }}>{r.specialty}</td>
                    <td data-label="Appointments" className="col-num">{r.total}</td>
                    <td data-label="Completed" className="col-num">{r.completed}</td>
                    <td data-label="Cancelled" className="col-num">{r.cancelled}</td>
                    <td data-label="Revenue (completed)" className="col-num">₱{r.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="t-muted" style={{ fontSize: 12, marginTop: 12 }}>
          Note: figures are computed from the prototype's fictional demo data.
        </p>
      </div>
    </AppShell>
  );
}

export { AdminReports };
