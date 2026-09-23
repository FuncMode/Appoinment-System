import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PageHeader, SortableTh, PageSpinner,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart, Sparkline, DoctorRatingPill, computeDoctorRating,
} from './components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, formatDayRange, isClinicDay, timeValue,
} from './data.js';

// ============================================================
// CSV export helpers (downloadFile is the shared helper from data.js)
// ============================================================
function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
// rows = array of arrays; first row is the header. BOM keeps Excel happy with ₱.
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  downloadFile(filename, '\uFEFF' + csv, 'text/csv;charset=utf-8');
}

// Printable daily schedule for one doctor (staff print the day's patient
// list for doctors who are not at a workstation). The HTML is rendered into
// a hidden print iframe — the browser's print dialog then offers
// "Save as PDF" as the destination (see printDoctorSchedule below).
function buildDoctorScheduleHTML(doctor, appts, dateStr) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const count = (s) => appts.filter(a => a.status === s).length;
  const rows = appts.length ? appts.map((a, i) => {
    const p = window.findPatient(a.patientId);
    const sub = p ? `${p.age} yrs old · ${p.gender === 'F' ? 'Female' : 'Male'}` : 'Record not found in registry';
    return `<tr>
      <td class="c-num">${i + 1}</td>
      <td class="c-time"><strong>${esc(a.time)}</strong></td>
      <td class="c-patient"><strong>${esc(p ? p.name : 'Unknown patient')}</strong><span class="sub">${esc(sub)}</span></td>
      <td>${esc(p ? p.phone : '—')}</td>
      <td>${esc(a.reason)}</td>
      <td>${esc(window.statusMeta(a.status).label)}</td>
    </tr>`;
  }).join('') : '<tr class="empty"><td colspan="6">No appointments scheduled for this day.</td></tr>';
  const stamp = `${window.formatDate(localToday())} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  const clinicDays = Array.isArray(doctor.avail) && doctor.avail.length ? ` · Clinic days: ${esc(window.formatDayRange(doctor.avail))}` : '';
  const leaveChip = doctor.status === 'on-leave' ? ' <small>(On leave)</small>' : '';
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Dr. ${esc(doctor.name.replace(/^Dr\.\s*/, ''))} — schedule ${esc(window.formatDate(dateStr))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #000000; background: #ffffff; font-size: 12px; margin: 0; }
  .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 10px; }
  .brand { margin: 0 0 3px; font-size: 21px; font-weight: 700; letter-spacing: .3px; }
  .addr { margin: 0; color: #000000; font-size: 10.5px; line-height: 1.5; }
  .doc-label { margin: 0 0 4px; text-align: right; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; }
  .doc-time { margin: 0; text-align: right; color: #000000; font-size: 10px; }
  .doctor-block { display: flex; justify-content: space-between; align-items: center; margin: 18px 0 2px; }
  .doc-name { margin: 0; font-size: 16px; font-weight: 700; }
  .doc-name small { font-size: 11px; font-weight: 400; }
  .doc-sub { margin: 3px 0 0; color: #000000; font-size: 11px; }
  .date-line { margin: 0 0 14px; font-size: 12.5px; font-weight: 600; }
  .summary { display: flex; gap: 8px; margin: 0 0 14px; }
  .stat { flex: 1; border: 1px solid #000000; border-radius: 6px; padding: 7px 10px; }
  .stat .n { display: block; font-size: 17px; font-weight: 700; line-height: 1.2; }
  .stat .l { font-size: 9.5px; text-transform: uppercase; letter-spacing: .6px; }
  table { border-collapse: collapse; width: 100%; font-size: 11.5px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { text-align: left; padding: 6px 9px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .6px; border-bottom: 2px solid #000000; }
  td { padding: 8px 9px; border-bottom: 1px solid #000000; vertical-align: top; }
  .c-num { width: 22px; }
  .c-time { white-space: nowrap; width: 72px; }
  .c-patient .sub { display: block; font-size: 10px; margin-top: 1px; }
  .empty td { text-align: center; padding: 28px; font-style: italic; }
  .signs { display: flex; justify-content: space-between; margin-top: 46px; page-break-inside: avoid; }
  .sign { width: 44%; text-align: center; }
  .sign .line { height: 24px; border-bottom: 1px solid #000000; }
  .sign .who { margin-top: 4px; font-size: 10px; }
  .foot { margin-top: 28px; padding-top: 8px; border-top: 1px solid #000000; font-size: 10px; }
</style></head>
<body>
  <div class="letterhead">
    <div>
      <p class="brand">MedicaCare</p>
      <p class="addr">221 Rizal Avenue, Quezon City, Metro Manila<br>+63 (2) 8567 4400 · care@medicacare.ph</p>
    </div>
    <div>
      <p class="doc-label">Daily Schedule</p>
      <p class="doc-time">Printed ${esc(stamp)}</p>
    </div>
  </div>
  <div class="doctor-block">
    <div>
      <h3 class="doc-name">${esc(doctor.name)} ${leaveChip}</h3>
      <p class="doc-sub">${esc(doctor.specialty)} · ${esc(doctor.room)} · Consultation fee: ₱${doctor.fee.toLocaleString()}${clinicDays}</p>
    </div>
  </div>
  <p class="date-line">${esc(window.formatDateLong(dateStr))}</p>
  <div class="summary">
    <div class="stat"><span class="n">${appts.length}</span><span class="l">Total</span></div>
    <div class="stat"><span class="n">${count('confirmed')}</span><span class="l">Confirmed</span></div>
    <div class="stat"><span class="n">${count('completed')}</span><span class="l">Completed</span></div>
    <div class="stat"><span class="n">${count('pending')}</span><span class="l">Pending</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Time</th>
        <th>Patient</th>
        <th>Contact no.</th>
        <th>Reason for visit</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="signs">
    <div class="sign"><div class="line"></div><div class="who">Prepared by (MedicaCare staff)</div></div>
    <div class="sign"><div class="line"></div><div class="who">${esc(doctor.name)} — signature over printed name</div></div>
  </div>
  <p class="foot">
    Generated by the MedicaCare staff console for the doctor's reference · ${esc(stamp)} · Prototype: fictional demo data — not a medical document.
  </p>
</body>
</html>`;
}

// Print / save as PDF — renders the schedule HTML into a hidden iframe and
// opens the browser's native print dialog on top of it. "Save as PDF" is one
// of the dialog's destinations, so staff get a real PDF file with no extra
// library (and a paper printout works exactly the same way). The document
// <title> inside the iframe becomes the suggested PDF filename.
function printDoctorSchedule(doctor, appts, dateStr) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  const cleanup = () => setTimeout(() => { if (frame.parentNode) frame.parentNode.removeChild(frame); }, 300);
  frame.addEventListener('load', () => {
    try {
      const win = frame.contentWindow;
      win.addEventListener('afterprint', cleanup);
      win.focus();
      // Brief delay so the iframe document settles before the dialog opens
      setTimeout(() => win.print(), 200);
    } catch { cleanup(); }
  });
  frame.srcdoc = buildDoctorScheduleHTML(doctor, appts, dateStr);
  document.body.appendChild(frame);
  // Safety net for browsers that never fire afterprint (dialog left open)
  setTimeout(cleanup, 600000);
}

// Local (not UTC) YYYY-MM-DD so "today" matches the user's timezone (guideline 15)
function localToday() {
  const n = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// SortableTh now lives in components.jsx (shared with the patient History table);
// timeValue lives in data.js (shared across all portals' time sorts)


// ============================================================
// Admin screens
// ============================================================

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

  // Trend lines are prototype data (same approach as the chart ranges below) —
  // each series ends at the card's current value so line and number agree.
  const stats = [
    { label: 'Today\'s appointments', value: todayAppts.length, delta: `${confirmedToday} confirmed · ${pendingToday} pending`, icon: 'calendar', kind: 'neutral', trend: [1, 3, 2, 4, 3, 1, 2] },
    { label: 'Pending confirmation',   value: pending.length,   delta: `${pendingArrivedToday} arrived today`, icon: 'clock', kind: 'warn', trend: [5, 6, 4, 7, 8, 6, 9] },
    { label: 'Total patients',         value: store.patients.length, delta: newThisMonth ? `${newThisMonth} new this month` : 'No new patients this month',  icon: 'users-round', kind: 'up', trend: [18, 19, 20, 20, 22, 23, 24] },
    { label: 'Active doctors',         value: store.doctors.filter(d => d.status !== 'on-leave').length, delta: `${onLeave} on leave`, icon: 'stethoscope', kind: 'neutral', trend: [16, 15, 16, 14, 15, 16, 16] },
  ];

  // Chart ranges for the dashboard activity card (prototype data per range)
  const [range, setRange] = useState('this-week');
  const ranges = {
    'this-week': {
      label: 'Appointments this week',
      data: [
        { label: 'Mon', value: 24 },
        { label: 'Tue', value: 31 },
        { label: 'Wed', value: 28 },
        { label: 'Thu', value: 35 },
        { label: 'Fri', value: 42 },
        { label: 'Sat', value: 18 },
        { label: 'Sun', value: 9 },
      ],
      summary: { totalLabel: 'Total this week', total: 187, avg: 27, completion: '94%', cancellation: '4.2%' },
    },
    'last-week': {
      label: 'Appointments last week',
      data: [
        { label: 'Mon', value: 19 },
        { label: 'Tue', value: 26 },
        { label: 'Wed', value: 22 },
        { label: 'Thu', value: 30 },
        { label: 'Fri', value: 36 },
        { label: 'Sat', value: 15 },
        { label: 'Sun', value: 7 },
      ],
      summary: { totalLabel: 'Total last week', total: 155, avg: 22, completion: '92%', cancellation: '5.1%' },
    },
    '30-days': {
      label: 'Appointments (last 30 days)',
      data: [
        { label: 'Aug 11', value: 96 },
        { label: 'Aug 16', value: 118 },
        { label: 'Aug 21', value: 124 },
        { label: 'Aug 26', value: 109 },
        { label: 'Aug 31', value: 135 },
        { label: 'Sep 5', value: 122 },
      ],
      summary: { totalLabel: 'Total (30 days)', total: 704, avg: 23, completion: '93%', cancellation: '4.6%' },
    },
  };
  const active = ranges[range];
  // Highlight the peak bar of whichever range is active, instead of a
  // hardcoded day
  const peak = Math.max(...active.data.map(d => d.value));

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

// ---------- Patients Management ----------
function PatientsMgmt() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  // Labs & medications — the staff-side creation path for the patient's
  // Medical Records sections (opened per patient from the table row)
  const [recordsFor, setRecordsFor] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gender, setGender] = useState('all');
  const PAGE = 4;

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = store.patients.filter(p => {
    if (gender !== 'all' && p.gender !== gender) return false;
    if (!query) return true;
    const hay = (p.name + ' ' + p.email + ' ' + p.phone).toLowerCase();
    return hay.includes(query.toLowerCase());
  });
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const doDelete = () => {
    setDelLoading(true);
    setTimeout(() => {
      // Sync the static PATIENTS registry so findPatient() drops the patient too
      const idx = window.PATIENTS.findIndex(x => x.id === confirmDel.id);
      if (idx > -1) window.PATIENTS.splice(idx, 1);
      store.setPatients(store.patients.filter(x => x.id !== confirmDel.id));
      setDelLoading(false);
      setConfirmDel(null);
      store.pushActivity(CURRENT_ADMIN.name, 'Deleted patient record', confirmDel.name);
      store.pushToast({ title: 'Patient removed', msg: `${confirmDel.name}'s record has been deleted.` });
    }, 600);
  };

  return (
    <AppShell current="patients">
      <div className="page">
        <PageHeader
          title="Patients"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 160, maxWidth: '100%', height: 14 }} />
            : `${store.patients.length} registered patients`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Patients' }]}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => {
                downloadCSV('medicacare-patients.csv', [
                  ['ID', 'Name', 'Email', 'Phone', 'Gender', 'Age', 'Joined', 'Last visit'],
                  ...filtered.map(p => [
                    p.id, p.name, p.email || '', p.phone,
                    p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : (p.gender || ''),
                    p.age, p.joined || '', p.lastVisit || '',
                  ]),
                ]);
                store.pushToast({ title: 'Export ready', msg: `${filtered.length} patient(s) exported to CSV.` });
              }}><Icon name="download" size={14} /> Export CSV</button>
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="user-plus" size={14} /> Add patient</button>
            </>
          }
        />

        <div className="card">
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by name, email, or phone..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-secondary sm" onClick={() => setFilterOpen(o => !o)}>
              <Icon name="filter" size={14} /> Filter{gender !== 'all' ? (gender === 'M' ? ': Male' : ': Female') : ''}
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> matching
            </div>
          </div>

          {filterOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Filter by gender:</span>
              {[['all', 'All'], ['M', 'Male'], ['F', 'Female']].map(([k, l]) => (
                <button key={k} className={'chip filter' + (gender === k ? ' on' : '')} onClick={() => { setGender(k); setPage(1); }}>{l}</button>
              ))}
            </div>
          )}

          <div className="table-wrap">
            <table className="table table-responsive-stack">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Gender / Age</th>
                  <th>Joined</th>
                  <th>Last visit</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows mirroring the real ones: the Patient cell has
                  // an avatar + ID line, the Contact cell has two lines, and
                  // every cell carries data-label so the mobile stacked-card
                  // view keeps its labels
                  Array.from({ length: 6 }).map((_, r) => (
                    <tr key={r}>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <span className="skel" style={{ width: 110, maxWidth: '100%', height: 12, display: 'block' }} />
                            <span className="skel" style={{ width: 64, height: 10, display: 'block', marginTop: 4 }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Contact">
                        <div><span className="skel" style={{ width: 130, maxWidth: '100%', height: 11, display: 'inline-block' }} /></div>
                        <div style={{ marginTop: 3 }}><span className="skel" style={{ width: 92, height: 10, display: 'inline-block' }} /></div>
                      </td>
                      <td data-label="Gender / Age"><span className="skel" style={{ width: 60, height: 12 }} /></td>
                      <td data-label="Joined"><span className="skel" style={{ width: 72, height: 12 }} /></td>
                      <td data-label="Last visit"><span className="skel" style={{ width: 72, height: 12 }} /></td>
                      <td className="col-actions"><span className="skel" style={{ width: 24, height: 24 }} /></td>
                    </tr>
                  ))
                )
                  : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="empty-cell" style={{ padding: 0 }}>
                      <EmptyState icon="user-x" title={`No patients found for "${query}"`}
                        message="Try a different name, or add a new patient record."
                        actions={<>
                          <button className="btn btn-secondary" onClick={() => setQuery('')}>Clear search</button>
                          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="user-plus" size={14} /> Add patient</button>
                        </>} />
                    </td></tr>
                  ) : paged.map(p => (
                    <tr key={p.id}>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <PatientAvatar person={p} size={28} />
                          <div>
                            <div className="cell-primary cell-primary-truncate">{p.name}</div>
                            <div className="cell-secondary t-mono">{p.id.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Contact">
                        <div>{p.email || <span className="t-muted">—</span>}</div>
                        <div className="cell-secondary">{p.phone}</div>
                      </td>
                      <td data-label="Gender / Age">{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '—'}{p.age ? `, ${p.age}` : ''}</td>
                      <td data-label="Joined">{window.formatDate(p.joined)}</td>
                      <td data-label="Last visit">{p.lastVisit ? window.formatDate(p.lastVisit) : <span className="t-muted">Never</span>}</td>
                      <td className="col-actions">
                        {/* No edit action: personal info is owned by the patient —
                            they manage it on their Profile page, and those changes
                            reflect here automatically */}
                        <button className="btn-icon" title="Labs & medications" aria-label="Manage labs and medications" onClick={() => setRecordsFor(p)}><Icon name="folder-open" size={16} /></button>
                        <button className="btn-icon" title="Delete" aria-label="Delete patient" onClick={() => setConfirmDel(p)} style={{ color: 'var(--error)' }}><Icon name="trash-2" size={16} /></button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="patients" />}
        </div>
      </div>

      <PatientFormModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(newP) => {
          const id = 'p' + Date.now();
          const rec = {
            ...newP,
            id,
            joined: new Date().toISOString().slice(0, 10), lastVisit: null,
            // Default to a dummy portrait when no photo was uploaded
            photo: newP.photo || `https://randomuser.me/api/portraits/${newP.gender === 'F' ? 'women' : 'men'}/${Math.floor(Math.random() * 99) + 1}.jpg`,
          };
          // Keep the static PATIENTS registry (used by findPatient) in sync
          window.PATIENTS.unshift(rec);
          store.setPatients([...window.PATIENTS]);
          setAddOpen(false);
          store.pushToast({ title: 'Patient added', msg: `${newP.name} has been added to your records.` });
        }} />
      <PatientRecordsModal patient={recordsFor} onClose={() => setRecordsFor(null)} />
      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={delLoading}
        title="Delete patient record?"
        message={confirmDel ? `${confirmDel.name}'s account and all associated data will be permanently deleted. This action cannot be undone.` : ''}
        confirmLabel="Delete permanently"
        kind="danger"
      />
    </AppShell>
  );
}

function PatientFormModal({ open, onClose, patient, onSave }) {
  const isEdit = !!patient;
  const [form, setForm] = useState({ name: '', email: '', phone: '', gender: 'M', age: '' });
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setForm(patient ? { name: patient.name, email: patient.email || '', phone: patient.phone, gender: patient.gender, age: patient.age } : { name: '', email: '', phone: '', gender: 'M', age: '' });
      setPhoto(patient?.photo || '');
      setPhotoError('');
      setErrors({});
    }
  }, [open, patient]);
  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file (JPG or PNG).');
      return;
    }
    if (file.size > 1024 * 1024) {
      setPhotoError('Image is too large. Please choose one under 1 MB.');
      return;
    }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.age) e.age = 'Age is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ ...form, photo });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit patient' : 'Add new patient'}
      subtitle={isEdit ? 'Update the patient\'s information below.' : 'Enter the new patient\'s details to create a record.'}
      size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>{isEdit ? 'Save changes' : 'Add patient'}</button>
      </>}
    >
      <div className="stack md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {photo
            ? <img src={photo} alt="Patient" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
            : <PatientAvatar person={{ name: form.name }} size={64} />}
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoChange} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary sm" onClick={() => photoInputRef.current && photoInputRef.current.click()}>
                <Icon name="upload" size={14} /> Upload photo
              </button>
              {photo && <button type="button" className="btn btn-ghost sm" onClick={() => setPhoto('')}>Remove</button>}
            </div>
            <div className="t-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              Optional. Defaults to a portrait photo. JPG/PNG up to 1 MB.
            </div>
            {photoError && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{photoError}</div>}
          </div>
        </div>
        <Field label="Full name" required error={errors.name}>
          <TextInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="e.g., Juan dela Cruz" />
        </Field>
        <Field label="Email" error={errors.email} help="Optional but recommended for reminders">
          <TextInput type="email" icon="mail" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} error={errors.email} placeholder="patient@example.com" />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <TextInput type="tel" icon="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} error={errors.phone} placeholder="+63 917 000 0000" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Gender">
            <SelectInput value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
            </SelectInput>
          </Field>
          <Field label="Age" required error={errors.age}>
            <TextInput type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} error={errors.age} placeholder="0" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Patient records (labs & medications, staff-encoded) ----------
// Staff-side creation path for the Medical Records sections in the patient
// portal: lab results and prescriptions are encoded here (Admin console →
// Patients → Labs & medications) and read live from the shared store.
function PatientRecordsModal({ patient, onClose }) {
  const store = useStore();
  const [tab, setTab] = useState('labs');
  const [adding, setAdding] = useState(false);
  const [labForm, setLabForm] = useState({ date: '', name: '', category: 'Hematology', status: 'Final', findings: [] });
  const [labErrors, setLabErrors] = useState({});
  const [medForm, setMedForm] = useState({ name: '', dose: '', form: 'Tablet', frequency: '', prescriberId: '', startDate: '', status: 'Active', instructions: '' });
  const [medErrors, setMedErrors] = useState({});

  if (!patient) return null;

  const labs = (store.labs || []).filter(l => l.patientId === patient.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const meds = (store.meds || []).filter(m => m.patientId === patient.id)
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));

  const openAdd = () => {
    setLabForm({ date: localToday(), name: '', category: 'Hematology', status: 'Final', findings: [{ item: '', value: '', unit: '', range: '', flag: '' }] });
    setMedForm({ name: '', dose: '', form: 'Tablet', frequency: '', prescriberId: '', startDate: localToday(), status: 'Active', instructions: '' });
    setLabErrors({});
    setMedErrors({});
    setAdding(true);
  };
  const setLab = (k, v) => { setLabForm(f => ({ ...f, [k]: v })); if (labErrors[k]) setLabErrors(x => ({ ...x, [k]: null })); };
  const setMed = (k, v) => { setMedForm(f => ({ ...f, [k]: v })); if (medErrors[k]) setMedErrors(x => ({ ...x, [k]: null })); };
  const setFinding = (i, k, v) => setLabForm(f => ({ ...f, findings: f.findings.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const addFinding = () => setLabForm(f => ({ ...f, findings: [...f.findings, { item: '', value: '', unit: '', range: '', flag: '' }] }));
  const removeFinding = (i) => setLabForm(f => ({ ...f, findings: f.findings.filter((_, j) => j !== i) }));

  const saveLab = () => {
    const e = {};
    if (!labForm.name.trim()) e.name = 'Test name is required';
    if (!labForm.date) e.date = 'Date is required';
    const findings = labForm.findings.filter(f => f.item.trim() || f.value.trim());
    if (!findings.length) e.findings = 'Add at least one finding (item and value)';
    else if (findings.some(f => !f.item.trim() || !f.value.trim())) e.findings = 'Each finding needs an item and a value';
    setLabErrors(e);
    if (Object.keys(e).length) return;
    const rec = {
      id: 'lab' + Date.now(),
      patientId: patient.id,
      date: labForm.date,
      name: labForm.name.trim(),
      category: labForm.category,
      status: labForm.status,
      results: findings.map(f => ({ item: f.item.trim(), value: f.value.trim(), unit: f.unit.trim(), range: f.range.trim(), flag: f.flag })),
    };
    store.setLabs([...(store.labs || []), rec]);
    store.pushActivity(CURRENT_ADMIN.name, 'Added lab result', `${patient.name} · ${rec.name}`);
    store.pushToast({ title: 'Lab result saved', msg: `${rec.name} was added to ${patient.name}'s medical records.` });
    setAdding(false);
  };
  const deleteLab = (l) => {
    store.setLabs((store.labs || []).filter(x => x.id !== l.id));
    store.pushActivity(CURRENT_ADMIN.name, 'Deleted lab result', `${patient.name} · ${l.name}`);
    store.pushToast({ title: 'Lab result removed', msg: `${l.name} was deleted from ${patient.name}'s records.` });
  };
  const saveMed = () => {
    const e = {};
    if (!medForm.name.trim()) e.name = 'Medicine name is required';
    if (!medForm.frequency.trim()) e.frequency = 'Frequency is required';
    if (!medForm.prescriberId) e.prescriberId = 'Select the prescriber';
    setMedErrors(e);
    if (Object.keys(e).length) return;
    const rec = {
      id: 'med' + Date.now(),
      patientId: patient.id,
      name: medForm.name.trim(),
      dose: medForm.dose.trim(),
      form: medForm.form,
      frequency: medForm.frequency.trim(),
      prescriberId: medForm.prescriberId,
      startDate: medForm.startDate || localToday(),
      status: medForm.status,
      instructions: medForm.instructions.trim(),
    };
    store.setMeds([...(store.meds || []), rec]);
    store.pushActivity(CURRENT_ADMIN.name, 'Added medication', `${patient.name} · ${rec.name}`);
    store.pushToast({ title: 'Medication saved', msg: `${rec.name} was added to ${patient.name}'s medical records.` });
    setAdding(false);
  };
  const deleteMed = (m) => {
    store.setMeds((store.meds || []).filter(x => x.id !== m.id));
    store.pushActivity(CURRENT_ADMIN.name, 'Deleted medication', `${patient.name} · ${m.name}`);
    store.pushToast({ title: 'Medication removed', msg: `${m.name} was deleted from ${patient.name}'s records.` });
  };

  return (
    <Modal
      open onClose={onClose} size="lg"
      title={`Labs & medications for ${patient.name}`}
      subtitle="Staff-encoded entries shown in the patient's Medical Records page."
      icon="flask-conical" iconKind="info"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button className={'chip filter' + (tab === 'labs' ? ' on' : '')} onClick={() => { setTab('labs'); setAdding(false); }}>Labs ({labs.length})</button>
        <button className={'chip filter' + (tab === 'meds' ? ' on' : '')} onClick={() => { setTab('meds'); setAdding(false); }}>Medications ({meds.length})</button>
      </div>

      {tab === 'labs' && !adding && (
        labs.length === 0 ? (
          <EmptyState icon="flask-conical" title="No lab results on file"
            message="Add a lab result and it appears in the patient's Medical Records page."
            actions={<button className="btn btn-primary" onClick={openAdd}><Icon name="plus" size={14} /> Add lab result</button>} />
        ) : (
          <div className="stack md">
            {labs.map(l => (
              <div key={l.id} className="list-item" style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div className="list-item-body" style={{ whiteSpace: 'normal', overflow: 'visible' }}>
                  <div className="list-item-title">{l.name}</div>
                  <div className="list-item-sub">{window.formatDate(l.date)} · {l.category} · {l.results.length} finding{l.results.length === 1 ? '' : 's'} · {l.status}</div>
                </div>
                <button className="btn-icon" title="Delete lab result" aria-label={`Delete ${l.name}`} style={{ color: 'var(--error)' }} onClick={() => deleteLab(l)}>
                  <Icon name="trash-2" size={15} />
                </button>
              </div>
            ))}
            <div><button className="btn btn-primary sm" onClick={openAdd}><Icon name="plus" size={13} /> Add lab result</button></div>
          </div>
        )
      )}

      {tab === 'labs' && adding && (
        <div className="stack md">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <Field label="Test name" required error={labErrors.name}>
              <TextInput value={labForm.name} onChange={e => setLab('name', e.target.value)} error={labErrors.name} placeholder="e.g., Complete Blood Count (CBC)" />
            </Field>
            <Field label="Category">
              <SelectInput value={labForm.category} onChange={e => setLab('category', e.target.value)}>
                {['Hematology', 'Clinical Chemistry', 'Microbiology', 'Immunology', 'Radiology'].map(c => <option key={c}>{c}</option>)}
              </SelectInput>
            </Field>
            <Field label="Date" required error={labErrors.date}>
              <TextInput type="date" value={labForm.date} onChange={e => setLab('date', e.target.value)} error={labErrors.date} />
            </Field>
          </div>
          <Field label="Status">
            <SelectInput value={labForm.status} onChange={e => setLab('status', e.target.value)}>
              <option>Final</option>
              <option>Pending</option>
            </SelectInput>
          </Field>
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Findings <span className="req">*</span></div>
            {labForm.findings.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 96px auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                <TextInput placeholder="Item (e.g., Hemoglobin)" value={f.item} onChange={e => setFinding(i, 'item', e.target.value)} />
                <TextInput placeholder="Value" value={f.value} onChange={e => setFinding(i, 'value', e.target.value)} />
                <TextInput placeholder="Unit" value={f.unit} onChange={e => setFinding(i, 'unit', e.target.value)} />
                <TextInput placeholder="Ref. range" value={f.range} onChange={e => setFinding(i, 'range', e.target.value)} />
                <SelectInput value={f.flag} onChange={e => setFinding(i, 'flag', e.target.value)} aria-label="Flag">
                  <option value="">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </SelectInput>
                <button className="btn-icon" title="Remove finding" aria-label="Remove finding" onClick={() => removeFinding(i)}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
            {labErrors.findings && <div className="field-error"><Icon name="alert-circle" size={12} /> {labErrors.findings}</div>}
            <button type="button" className="btn btn-secondary sm" onClick={addFinding}><Icon name="plus" size={13} /> Add finding</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveLab}>Save lab result</button>
          </div>
        </div>
      )}
      {tab === 'meds' && !adding && (
        meds.length === 0 ? (
          <EmptyState icon="pill" title="No medications on file"
            message="Add a prescription and it appears in the patient's Medical Records page."
            actions={<button className="btn btn-primary" onClick={openAdd}><Icon name="plus" size={14} /> Add medication</button>} />
        ) : (
          <div className="stack md">
            {meds.map(m => {
              const doc = window.findDoctor(m.prescriberId);
              return (
                <div key={m.id} className="list-item" style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div className="list-item-body" style={{ whiteSpace: 'normal', overflow: 'visible' }}>
                    <div className="list-item-title">{m.name} <span className="t-muted" style={{ fontWeight: 400 }}>{m.dose ? `· ${m.dose} ${m.form}` : ''}</span></div>
                    <div className="list-item-sub">{m.frequency} · {doc ? doc.name : '—'} · started {window.formatDate(m.startDate)}</div>
                  </div>
                  <Badge kind={m.status === 'Active' ? 'success' : 'neutral'} dot={false}>{m.status}</Badge>
                  <button className="btn-icon" title="Delete medication" aria-label={`Delete ${m.name}`} style={{ color: 'var(--error)' }} onClick={() => deleteMed(m)}>
                    <Icon name="trash-2" size={15} />
                  </button>
                </div>
              );
            })}
            <div><button className="btn btn-primary sm" onClick={openAdd}><Icon name="plus" size={13} /> Add medication</button></div>
          </div>
        )
      )}

      {tab === 'meds' && adding && (
        <div className="stack md">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <Field label="Medicine name" required error={medErrors.name}>
              <TextInput value={medForm.name} onChange={e => setMed('name', e.target.value)} error={medErrors.name} placeholder="e.g., Amoxicillin" />
            </Field>
            <Field label="Dose">
              <TextInput value={medForm.dose} onChange={e => setMed('dose', e.target.value)} placeholder="e.g., 500 mg" />
            </Field>
            <Field label="Form">
              <SelectInput value={medForm.form} onChange={e => setMed('form', e.target.value)}>
                {['Tablet', 'Capsule', 'Syrup', 'Topical cream', 'Injection'].map(f => <option key={f}>{f}</option>)}
              </SelectInput>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Frequency" required error={medErrors.frequency}>
              <TextInput value={medForm.frequency} onChange={e => setMed('frequency', e.target.value)} error={medErrors.frequency} placeholder="e.g., Three times daily" />
            </Field>
            <Field label="Prescriber" required error={medErrors.prescriberId}>
              <SelectInput value={medForm.prescriberId} onChange={e => setMed('prescriberId', e.target.value)} error={medErrors.prescriberId}>
                <option value="">Select a doctor...</option>
                {store.doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Start date">
              <TextInput type="date" value={medForm.startDate} onChange={e => setMed('startDate', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Status">
              <SelectInput value={medForm.status} onChange={e => setMed('status', e.target.value)}>
                <option>Active</option>
                <option>Completed</option>
              </SelectInput>
            </Field>
            <Field label="Instructions" help="Shown under the medicine name in the patient's records.">
              <TextInput value={medForm.instructions} onChange={e => setMed('instructions', e.target.value)} placeholder="e.g., Take after meals" />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveMed}>Save medication</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------- Doctors Management ----------
function DoctorsMgmt() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [specialty, setSpecialty] = useState('all');
  const PAGE = 4;
  // Simulated fetch — skeleton rows while "loading", same as Patients page
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = store.doctors.filter(d => {
    if (specialty !== 'all' && d.specialty !== specialty) return false;
    if (!query) return true;
    const hay = (d.name + ' ' + d.specialty).toLowerCase();
    return hay.includes(query.toLowerCase());
  });
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const doDelete = () => {
    setDelLoading(true);
    setTimeout(() => {
      // Sync the static DOCTORS registry so patient-side findDoctor() drops the doctor too
      const idx = window.DOCTORS.findIndex(x => x.id === confirmDel.id);
      if (idx > -1) window.DOCTORS.splice(idx, 1);
      store.setDoctors(store.doctors.filter(x => x.id !== confirmDel.id));
      // Portal access dies with the profile — remove the doctor's account too
      store.setUsers(store.users.filter(u => !(u.role === 'doctor' && u.doctorId === confirmDel.id)));
      // End the removed doctor's portal session, if they are logged in — the
      // doctor route guard then shows the login screen with an explanation
      if (store.doctorSession && store.doctorSession.doctorId === confirmDel.id) store.logoutDoctor();
      setDelLoading(false);
      setConfirmDel(null);
      store.pushActivity(CURRENT_ADMIN.name, 'Deleted doctor', confirmDel.name);
      store.pushToast({ title: 'Doctor removed', msg: `${confirmDel.name}'s profile has been deleted.` });
    }, 600);
  };

  // Apply the portal-access payload collected by DoctorFormModal against
  // store.users — grant (new account), reset (new password), or revoke.
  // Access is admin-issued: this is the only place doctor accounts are created.
  const applyAccess = (docRec, access) => {
    if (!access) return;
    const existing = store.users.find(u => u.role === 'doctor' && u.doctorId === docRec.id);
    if (access.mode === 'grant' && !existing) {
      const account = {
        id: 'u' + Date.now().toString(36),
        name: docRec.name,
        email: access.email,
        password: access.password,
        role: 'doctor',
        doctorId: docRec.id,
        createdAt: localToday(),
      };
      store.setUsers([...store.users, account]);
      store.pushActivity(CURRENT_ADMIN.name, 'Granted portal access', `${docRec.name} · ${account.email}`);
      store.pushToast({ title: 'Portal access granted', msg: `${docRec.name} can now sign in at the Doctor portal as ${account.email}.` });
    } else if (access.mode === 'reset' && existing) {
      store.setUsers(store.users.map(u => u.id === existing.id ? { ...u, password: access.password } : u));
      // End the doctor's session so the new password is required on next login
      if (store.doctorSession && store.doctorSession.doctorId === docRec.id) store.logoutDoctor();
      store.pushActivity(CURRENT_ADMIN.name, 'Reset portal password', `${docRec.name} · ${existing.email}`);
      store.pushToast({ title: 'Password reset', msg: `${docRec.name}'s portal password has been changed.` });
    } else if (access.mode === 'revoke' && existing) {
      store.setUsers(store.users.filter(u => u.id !== existing.id));
      if (store.doctorSession && store.doctorSession.doctorId === docRec.id) store.logoutDoctor();
      store.pushActivity(CURRENT_ADMIN.name, 'Revoked portal access', docRec.name);
      store.pushToast({ title: 'Portal access revoked', msg: `${docRec.name} can no longer sign in at the Doctor portal.` });
    }
  };

  // Staff print the day's patient list for a doctor (PDF via the browser's
  // native "Save as PDF"), then encode the doctor's written notes afterwards
  const printSchedule = (d) => {
    const today = localToday();
    const list = store.appointments
      .filter(a => a.doctorId === d.id && a.date === today)
      .sort((a, b) => timeValue(a.time) - timeValue(b.time));
    printDoctorSchedule(d, list, today);
    store.pushToast({
      title: 'Print dialog opened',
      msg: `Choose "Save as PDF" as the destination to download today's ${list.length} appointment(s) as a PDF.`,
    });
  };

  return (
    <AppShell current="doctors">
      <div className="page">
        <PageHeader
          title="Doctors"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 240, maxWidth: '100%', height: 14 }} />
            : `${store.doctors.length} doctors across ${window.SPECIALTIES.length} specialties`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Doctors' }]}
          actions={<>
            <button className="btn btn-secondary" onClick={() => {
              downloadCSV('medicacare-doctors.csv', [
                ['ID', 'Name', 'Specialty', 'Status', 'Clinic days', 'Experience (yrs)', 'Avg. rating', 'Ratings', 'Consultation fee (₱)', 'Room'],
                ...filtered.map(d => {
                  const { count, avg } = computeDoctorRating(store.ratings, d.id);
                  return [
                    d.id, d.name, d.specialty, window.doctorStatusMeta(d.status).label,
                    Array.isArray(d.avail) ? d.avail.join(', ') : '',
                    d.exp, count ? avg : '', count, d.fee, d.room,
                  ];
                }),
              ]);
              store.pushToast({ title: 'Export ready', msg: `${filtered.length} doctor(s) exported to CSV.` });
            }}><Icon name="download" size={14} /> Export CSV</button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={14} /> Add doctor</button>
          </>}
        />

        <div className="card">
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by name or specialty..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <SelectInput style={{ maxWidth: 180 }} value={specialty} onChange={e => { setSpecialty(e.target.value); setPage(1); }}>
              <option value="all">All specialties</option>
              {window.SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </div>

          <div className="table-wrap">
            <table className="table table-responsive-stack table-compact">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Status</th>
                  <th>Availability</th>
                  <th>Experience</th>
                  <th>Rating</th>
                  <th>Fee</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows mirroring the real ones: the Doctor cell has
                  // an avatar + room line, Status is a badge pill, and every
                  // cell carries data-label for the mobile stacked-card view
                  Array.from({ length: 5 }).map((_, r) => (
                    <tr key={r}>
                      <td data-label="Doctor">
                        <div className="cell-with-avatar">
                          <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <span className="skel" style={{ width: 110, maxWidth: '100%', height: 12, display: 'block' }} />
                            <span className="skel" style={{ width: 90, height: 10, display: 'block', marginTop: 4 }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Specialty"><span className="skel" style={{ width: '65%', height: 12 }} /></td>
                      <td data-label="Status"><span className="skel" style={{ width: 64, height: 18 }} /></td>
                      <td data-label="Availability" className="td-nowrap"><span className="skel" style={{ width: 96, height: 11 }} /></td>
                      <td data-label="Experience"><span className="skel" style={{ width: 40, height: 12 }} /></td>
                      <td data-label="Rating"><span className="skel" style={{ width: 44, height: 12 }} /></td>
                      <td data-label="Fee"><span className="skel" style={{ width: 56, height: 12 }} /></td>
                      <td className="col-actions">
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span className="skel" style={{ width: 24, height: 24 }} />
                          <span className="skel" style={{ width: 24, height: 24 }} />
                          <span className="skel" style={{ width: 24, height: 24 }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )
                  : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="empty-cell" style={{ padding: 0 }}><EmptyState icon="stethoscope" title="No doctors found" message="Try clearing your search or add a new doctor."
                    actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={14} /> Add doctor</button>} /></td></tr>
                ) : paged.map(d => (
                  <tr key={d.id}>
                    <td data-label="Doctor">
                      <div className="cell-with-avatar">
                        <DoctorAvatar doctor={d} size={28} />
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-primary cell-primary-truncate" style={{ maxWidth: 150 }} title={d.name}>{d.name}</div>
                          <div className="cell-secondary">{d.room}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Specialty">{d.specialty}</td>
                    <td data-label="Status"><DoctorStatusBadge status={d.status} /></td>
                    <td data-label="Availability" className="td-nowrap" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }} title={Array.isArray(d.avail) && d.avail.length ? d.avail.join(', ') : undefined}>
                      {formatDayRange(d.avail)}
                    </td>
                    <td data-label="Experience">{d.exp} yrs</td>
                    <td data-label="Rating"><DoctorRatingPill ratings={store.ratings} doctorId={d.id} compact /></td>
                    <td data-label="Fee">₱{d.fee.toLocaleString()}</td>
                    <td className="col-actions">
                      <button className="btn-icon" title="Print / save schedule as PDF" aria-label="Print or save today's schedule as PDF" onClick={() => printSchedule(d)}><Icon name="printer" size={16} /></button>
                      <button className="btn-icon" title="Edit" aria-label="Edit doctor" onClick={() => setEditingId(d.id)}><Icon name="pencil" size={16} /></button>
                      <button className="btn-icon" title="Delete" aria-label="Delete doctor" onClick={() => setConfirmDel(d)} style={{ color: 'var(--error)' }}><Icon name="trash-2" size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="doctors" />}
        </div>
      </div>

      <DoctorFormModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(newD, access) => {
          const id = 'd' + Date.now();
          const rec = {
            ...newD,
            id,
            // Ratings are patient-given only (completed visits); none are seeded
            exp: parseInt(newD.exp) || 0, fee: parseInt(newD.fee) || 0,
            // Default to a dummy portrait when no photo was uploaded
            photo: newD.photo || `https://randomuser.me/api/portraits/${newD.gender === 'F' ? 'women' : 'men'}/${Math.floor(Math.random() * 99) + 1}.jpg`,
          };
          // Keep the static DOCTORS registry (used by patient-side findDoctor) in sync
          window.DOCTORS.unshift(rec);
          store.setDoctors([...window.DOCTORS]);
          applyAccess(rec, access);
          setAddOpen(false);
          store.pushActivity(CURRENT_ADMIN.name, 'Added doctor', `${newD.name} · ${newD.specialty}`);
          store.pushToast({ title: 'Doctor added', msg: `${newD.name} has been added to your directory.` });
        }} />
      <DoctorFormModal open={!!editingId} onClose={() => setEditingId(null)}
        doctor={store.doctors.find(d => d.id === editingId)}
        account={editingId ? (store.users.find(u => u.role === 'doctor' && u.doctorId === editingId) || null) : null}
        onSave={(edited, access) => {
          // Sync the static DOCTORS registry so patient-side findDoctor() sees the update
          const i = window.DOCTORS.findIndex(x => x.id === editingId);
          if (i > -1) Object.assign(window.DOCTORS[i], edited, { exp: parseInt(edited.exp) || 0, fee: parseInt(edited.fee) || 0 });
          store.setDoctors(store.doctors.map(d => d.id === editingId ? { ...d, ...edited, exp: parseInt(edited.exp) || 0, fee: parseInt(edited.fee) || 0 } : d));
          // Keep the portal account's display name in sync with the edited profile
          store.setUsers(store.users.map(u => (u.role === 'doctor' && u.doctorId === editingId && u.name !== edited.name) ? { ...u, name: edited.name } : u));
          applyAccess({ id: editingId, name: edited.name }, access);
          setEditingId(null);
          store.pushToast({ title: 'Doctor updated', msg: `${edited.name}'s profile has been updated.` });
        }}
        onRevoke={(account) => {
          applyAccess({ id: account.doctorId, name: account.name }, { mode: 'revoke' });
          setEditingId(null);
        }} />
      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={delLoading}
        title="Delete this doctor?"
        message={confirmDel ? `${confirmDel.name}'s profile will be removed. Existing appointments will remain but the doctor will no longer be bookable.` : ''}
        confirmLabel="Delete doctor"
        kind="danger"
      />
    </AppShell>
  );
}

function DoctorFormModal({ open, onClose, doctor, account, onSave, onRevoke }) {
  const isEdit = !!doctor;
  const store = useStore();
  const [form, setForm] = useState({ name: '', specialty: 'Cardiology', status: 'available', room: '', exp: '', fee: '' });
  const [errors, setErrors] = useState({});
  const [avail, setAvail] = useState(['Mon','Tue','Wed','Thu','Fri']);
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);
  // Portal access — admin-issued credentials the doctor signs in with at the
  // Doctor portal. On Add (or Edit without an account) both fields together
  // grant access; on Edit with an account, a typed password resets it.
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPw, setAccessPw] = useState('');
  const [accessErrors, setAccessErrors] = useState({});
  useEffect(() => {
    if (open) {
      setForm(doctor ? { name: doctor.name, specialty: doctor.specialty, status: doctor.status, room: doctor.room, exp: doctor.exp, fee: doctor.fee } : { name: '', specialty: 'Cardiology', status: 'available', room: '', exp: '', fee: '' });
      setAvail(doctor && Array.isArray(doctor.avail) && doctor.avail.length ? [...doctor.avail] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setPhoto(doctor?.photo || '');
      setPhotoError('');
      setErrors({});
      setAccessEmail(account ? account.email : '');
      setAccessPw('');
      setAccessErrors({});
    }
  }, [open, doctor, account]);
  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file (JPG or PNG).');
      return;
    }
    if (file.size > 1024 * 1024) {
      setPhotoError('Image is too large. Please choose one under 1 MB.');
      return;
    }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };
  // Unambiguous charset (no I/l/1/O/0) so a generated password is easy to
  // re-type when the admin shares it with the doctor
  const generatePw = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const rand = window.crypto.getRandomValues(new Uint32Array(10));
    setAccessPw(Array.from(rand, n => chars[n % chars.length]).join(''));
    if (accessErrors.password) setAccessErrors(ae => ({ ...ae, password: null }));
  };

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Doctor name is required';
    if (!form.room.trim()) e.room = 'Room / clinic is required';
    if (!form.exp) e.exp = 'Years of experience required';
    if (!form.fee) e.fee = 'Consultation fee required';
    if (!avail.length) e.avail = 'Select at least one available day';
    // Portal access validation — optional: blank fields mean "no account yet"
    // (it can be granted later from Edit). On Edit with an account, a typed
    // password means "reset it"; blank keeps the current password.
    const ae = {};
    const granting = !isEdit || !account;
    if (granting) {
      const email = accessEmail.trim();
      if (email || accessPw) {
        if (!email) ae.email = 'Portal email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ae.email = 'Enter a valid email address';
        else if (store.users.some(u => u.email.toLowerCase() === email.toLowerCase())) ae.email = 'That email is already used by another account';
        if (!accessPw) ae.password = 'Password is required';
        else if (accessPw.length < 8) ae.password = 'Use at least 8 characters';
      }
    } else if (accessPw && accessPw.length < 8) {
      ae.password = 'Use at least 8 characters';
    }
    setAccessErrors(ae);
    setErrors(e);
    if (Object.keys(e).length || Object.keys(ae).length) return;
    // Access payload for the parent to apply to store.users (grant/reset)
    let access = null;
    if (granting && accessEmail.trim() && accessPw) {
      access = { mode: 'grant', email: accessEmail.trim().toLowerCase(), password: accessPw };
    } else if (!granting && account && accessPw) {
      access = { mode: 'reset', password: accessPw };
    }
    onSave({ ...form, avail, photo }, access);
  };
  const toggleDay = (day) => setAvail(av => av.includes(day) ? av.filter(d => d !== day) : [...av, day]);

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEdit ? 'Edit doctor' : 'Add new doctor'}
      subtitle={isEdit ? 'Update the doctor\'s profile, availability, and portal access.' : 'Create a new doctor profile, schedule, and portal access.'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>{isEdit ? 'Save changes' : 'Add doctor'}</button>
      </>}
    >
      <div className="stack md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {photo
            ? <img src={photo} alt="Doctor" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
            : <DoctorAvatar doctor={{ name: form.name }} size={64} />}
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoChange} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary sm" onClick={() => photoInputRef.current && photoInputRef.current.click()}>
                <Icon name="upload" size={14} /> Upload photo
              </button>
              {photo && <button type="button" className="btn btn-ghost sm" onClick={() => setPhoto('')}>Remove</button>}
            </div>
            <div className="t-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              Optional. Defaults to a portrait photo. JPG/PNG up to 1 MB.
            </div>
            {photoError && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{photoError}</div>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Full name" required error={errors.name}>
            <TextInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Dr. Juan Dela Cruz" />
          </Field>
          <Field label="Specialty" required>
            <SelectInput value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
              {window.SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="available">Available</option>
              <option value="busy">Busy today</option>
              <option value="on-leave">On leave</option>
            </SelectInput>
          </Field>
          <Field label="Room / clinic" required error={errors.room}>
            <TextInput value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} error={errors.room} placeholder="e.g., Cardio Wing • Rm 402" />
          </Field>
          <Field label="Years of experience" required error={errors.exp}>
            <TextInput type="number" value={form.exp} onChange={e => setForm(f => ({ ...f, exp: e.target.value }))} error={errors.exp} placeholder="10" />
          </Field>
          <Field label="Consultation fee (₱)" required error={errors.fee}>
            <TextInput type="number" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} error={errors.fee} placeholder="1500" />
          </Field>
        </div>
        <Field label="Weekly availability" error={errors.avail} help={!errors.avail && 'Days the doctor is available for consultations'}>
          <div className="chip-group">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
              <button key={day} type="button" className={'chip' + (avail.includes(day) ? ' on' : '')} onClick={() => toggleDay(day)}>
                {day}
              </button>
            ))}
          </div>
        </Field>

        {/* Portal access — admin-issued credentials for the Doctor portal.
            The portal itself is login-only: doctors never self-register. */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Icon name="key-round" size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Doctor portal access</span>
          </div>
          <p className="t-muted" style={{ fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
            {isEdit && account
              ? 'Active. The doctor signs in at the Doctor portal with the email below. Reset the password here if needed.'
              : 'Create the login the doctor will use at the Doctor portal. Leave both fields blank to add the profile without portal access. It can be granted later from Edit.'}
          </p>
          {isEdit && account ? (
            <div className="stack md">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Portal email" help="Issued with the account and cannot be changed here.">
                  <TextInput value={account.email} disabled />
                </Field>
                <Field label="New password" error={accessErrors.password} help={!accessErrors.password && 'Leave blank to keep the current password.'}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <TextInput type="text" style={{ flex: 1 }} value={accessPw} error={accessErrors.password}
                      onChange={e => { setAccessPw(e.target.value); if (accessErrors.password) setAccessErrors(ae => ({ ...ae, password: null })); }}
                      placeholder="Min 8 characters" />
                    <button type="button" className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={generatePw}>Generate</button>
                  </div>
                </Field>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-danger-outline sm" onClick={() => onRevoke(account)}>
                  <Icon name="shield-off" size={13} /> Revoke portal access
                </button>
                <span className="t-muted" style={{ fontSize: 11.5 }}>Removes the doctor's login. It can be granted again later.</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Portal email" error={accessErrors.email} help={!accessErrors.email && 'Used to sign in at the Doctor portal.'}>
                <TextInput type="email" icon="mail" placeholder="doctor@medicacare.ph" value={accessEmail} error={accessErrors.email}
                  onChange={e => { setAccessEmail(e.target.value); if (accessErrors.email) setAccessErrors(ae => ({ ...ae, email: null })); }} />
              </Field>
              <Field label="Password" error={accessErrors.password} help={!accessErrors.password && 'Minimum 8 characters. Share it with the doctor securely.'}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TextInput type="text" style={{ flex: 1 }} value={accessPw} error={accessErrors.password}
                    onChange={e => { setAccessPw(e.target.value); if (accessErrors.password) setAccessErrors(ae => ({ ...ae, password: null })); }}
                    placeholder="Min 8 characters" />
                  <button type="button" className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={generatePw}>Generate</button>
                </div>
              </Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------- Appointments Management ----------
function AppointmentsMgmt() {
  const store = useStore();
  const route = useHashRoute();
  // Deep link: /admin/appointments?status=pending (dashboard "See all")
  const [, apptQuery] = route.split('?');
  const linkStatus = new URLSearchParams(apptQuery || '').get('status');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(
    ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'].includes(linkStatus) ? linkStatus : 'all'
  );
  const [page, setPage] = useState(1);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewAppt, setViewAppt] = useState(null);
  const [editAppt, setEditAppt] = useState(null);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const PAGE = 4;
  // Simulated fetch — skeleton rows while "loading", same as Patients page
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = store.appointments.filter(a => {
    if (status !== 'all' && a.status !== status) return false;
    if (query) {
      const d = window.findDoctor(a.doctorId);
      const p = window.findPatient(a.patientId);
      const hay = ((d?.name || '') + ' ' + (p?.name || '') + ' ' + a.reason).toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  // Column sorting (guideline 18); default stays newest-first like before
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  };
  const sortVal = (a) => {
    switch (sortKey) {
      case 'ref': return a.id;
      case 'patient': return (window.findPatient(a.patientId)?.name || '').toLowerCase();
      case 'doctor': return (window.findDoctor(a.doctorId)?.name || '').toLowerCase();
      case 'status': return a.status;
      default: return a.date;
    }
  };
  const dir = sortDir === 'asc' ? 1 : -1;
  const sorted = filtered.slice().sort((a, b) => {
    const va = sortVal(a), vb = sortVal(b);
    if (va !== vb) return (va < vb ? -1 : 1) * dir;
    // Same-day rows keep chronological order by time slot (timeValue keeps
    // 12-hour strings like "10:30 AM" / "8:30 AM" in true clock order)
    return sortKey === 'date' ? (timeValue(a.time) - timeValue(b.time)) * dir : 0;
  });
  const paged = sorted.slice((page - 1) * PAGE, page * PAGE);
  // A sort change can move the current page out of range
  useEffect(() => { setPage(1); }, [sortKey, sortDir]);

  // Completing a visit captures the doctor's notes first — the note becomes
  // the medical record the patient sees in their portal (no notes, no record)
  const [completeAppt, setCompleteAppt] = useState(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [notesError, setNotesError] = useState('');

  const updateStatus = (id, newStatus) => {
    const appt = store.appointments.find(a => a.id === id);
    if (newStatus === 'completed' && appt && !appt.notes) {
      setCompleteAppt(appt);
      setVisitNotes('');
      setNotesError('');
      return;
    }
    store.setAppointments(store.appointments.map(a => a.id === id ? { ...a, status: newStatus } : a));
    const meta = window.statusMeta(newStatus);
    store.pushActivity(CURRENT_ADMIN.name, 'Status update', `Ref ${id.toUpperCase()} → ${meta.label}`);
    store.pushToast({ title: 'Status updated', msg: `Appointment marked as ${meta.label}.` });
  };

  const saveComplete = () => {
    const notes = visitNotes.trim();
    if (notes.length < 10) {
      setNotesError('Please write the visit summary (10+ characters).');
      return;
    }
    store.setAppointments(store.appointments.map(a => a.id === completeAppt.id ? { ...a, status: 'completed', notes } : a));
    store.pushActivity(CURRENT_ADMIN.name, 'Completed visit (notes encoded)',
      `${(window.findPatient(completeAppt.patientId) || {}).name || 'Patient'} · ${window.formatDate(completeAppt.date)}`);
    setCompleteAppt(null);
    store.pushToast({ title: 'Visit completed', msg: "Doctor's notes saved and added to the patient's medical records." });
  };

  const doDelete = () => {
    setDelLoading(true);
    setTimeout(() => {
      store.setAppointments(store.appointments.filter(x => x.id !== confirmDel.id));
      setDelLoading(false);
      setConfirmDel(null);
      store.pushActivity(CURRENT_ADMIN.name, 'Deleted appointment', `Ref ${confirmDel.id.toUpperCase()}`);
      store.pushToast({ title: 'Appointment deleted', msg: 'The appointment has been removed.' });
    }, 500);
  };

  const handleCreate = (form) => {
    const newAppt = {
      id: 'ap' + Date.now(),
      patientId: form.patientId,
      doctorId: form.doctorId,
      date: form.date,
      time: form.time,
      reason: form.reason.trim(),
      status: 'pending',
      createdAt: localToday(),
    };
    store.setAppointments([newAppt, ...store.appointments]);
    store.pushActivity(CURRENT_ADMIN.name, 'Created appointment',
      `${(window.findPatient(form.patientId) || {}).name || 'Patient'} with ${(window.findDoctor(form.doctorId) || {}).name || 'doctor'} · ${window.formatDate(form.date)} at ${form.time}`);
    setAddOpen(false);
    setPage(1);
    store.pushToast({ title: 'Appointment created', msg: `Ref ${newAppt.id.toUpperCase()} has been added to the queue.` });
  };

  return (
    <AppShell current="appointments">
      <div className="page">
        <PageHeader
          title="Appointments"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 200, maxWidth: '100%', height: 14 }} />
            : `${store.appointments.length} total · ${store.appointments.filter(a => a.status === 'pending').length} pending review`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Appointments' }]}
          actions={<>
            <button className="btn btn-secondary" onClick={() => {
              downloadCSV('medicacare-appointments.csv', [
                ['Ref', 'Patient', 'Phone', 'Doctor', 'Specialty', 'Date', 'Time', 'Reason', 'Status'],
                ...sorted.map(a => {
                  const d = window.findDoctor(a.doctorId);
                  const p = window.findPatient(a.patientId);
                  return [a.id.toUpperCase(), p?.name || 'Unknown', p?.phone || '', d?.name || 'Unknown', d?.specialty || '', a.date, a.time, a.reason, window.statusMeta(a.status).label];
                }),
              ]);
              store.pushToast({ title: 'Export ready', msg: `${filtered.length} appointment(s) exported to CSV.` });
            }}><Icon name="download" size={14} /> Export</button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={14} /> New appointment</button>
          </>}
        />

        <div className="card">
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search patient, doctor, or reason..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <SelectInput
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              aria-label="Filter appointments by status"
              style={{ maxWidth: 190 }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-show</option>
            </SelectInput>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> results
            </div>
          </div>

          <div className="table-wrap">
            <table className="table table-responsive-stack">
              <thead>
                <tr>
                  <SortableTh label="Ref" k="ref" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Patient" k="patient" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Doctor" k="doctor" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Date & time" k="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th>Reason</th>
                  <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows mirroring the real ones: the Patient cell has
                  // an avatar + phone line, the Doctor and Date & time cells
                  // have two stacked lines (name over specialty, date over
                  // time), Status is a select-sized pill, and every cell
                  // carries data-label for the mobile stacked-card view
                  Array.from({ length: 5 }).map((_, r) => (
                    <tr key={r}>
                      <td data-label="Ref" className="t-mono td-nowrap"><span className="skel" style={{ width: 64, height: 11 }} /></td>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <span className="skel" style={{ width: 110, maxWidth: '100%', height: 12, display: 'block' }} />
                            <span className="skel" style={{ width: 84, height: 10, display: 'block', marginTop: 4 }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Doctor" className="td-nowrap">
                        <div style={{ minWidth: 0 }}>
                          <span className="skel" style={{ width: 96, maxWidth: '100%', height: 12, display: 'block' }} />
                          <span className="skel" style={{ width: 72, height: 10, display: 'block', marginTop: 4 }} />
                        </div>
                      </td>
                      <td data-label="Date & time" className="td-nowrap">
                        <div>
                          <span className="skel" style={{ width: 78, height: 12, display: 'block' }} />
                          <span className="skel" style={{ width: 56, height: 10, display: 'block', marginTop: 4 }} />
                        </div>
                      </td>
                      <td data-label="Reason" className="cell-primary-truncate"><span className="skel" style={{ width: '75%', height: 12 }} /></td>
                      <td data-label="Status"><span className="skel" style={{ width: 96, height: 30 }} /></td>
                      <td className="col-actions">
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span className="skel" style={{ width: 24, height: 24 }} />
                          <span className="skel" style={{ width: 24, height: 24 }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )
                  : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="empty-cell" style={{ padding: 0 }}><EmptyState icon="calendar-x" title="No appointments match" message="Try adjusting your filters." actions={<button className="btn btn-secondary" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</button>} /></td></tr>
                ) : paged.map(a => {
                  const d = window.findDoctor(a.doctorId);
                  const p = window.findPatient(a.patientId);
                  return (
                    <tr key={a.id}>
                      <td data-label="Ref" className="t-mono td-nowrap" style={{ fontSize: 12 }}>{a.id.toUpperCase()}</td>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <PatientAvatar person={p} size={28} />                          <div>
                            <div className="cell-primary cell-primary-truncate" style={{ maxWidth: 150 }}>{p?.name || 'Unknown'}</div>
                            <div className="cell-secondary">{p?.phone || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Doctor" className="td-nowrap">
                        <div className="cell-primary cell-primary-truncate" style={{ maxWidth: 150 }}>{d?.name || 'Unknown'}</div>
                        <div className="cell-secondary">{d?.specialty}</div>
                      </td>
                      <td data-label="Date & time" className="td-nowrap">
                        <div className="cell-primary">{window.formatDate(a.date)}</div>
                        <div className="cell-secondary">{a.time}</div>
                      </td>
                      <td data-label="Reason" className="cell-primary-truncate" style={{ maxWidth: 150 }}>{a.reason}</td>
                      <td data-label="Status">
                        <SelectInput value={a.status} onChange={e => updateStatus(a.id, e.target.value)} className="status-select">
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no-show">No-show</option>
                        </SelectInput>
                      </td>
                      <td className="col-actions">
                        <button className="btn-icon" title="View" aria-label="View appointment" onClick={() => setViewAppt(a)}><Icon name="eye" size={16} /></button>
                        <button className="btn-icon" title="Edit appointment" aria-label="Edit appointment" onClick={() => setEditAppt(a)}><Icon name="pencil" size={16} /></button>
                        <button className="btn-icon" title="Delete" aria-label="Delete appointment" onClick={() => setConfirmDel(a)} style={{ color: 'var(--error)' }}><Icon name="trash-2" size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="appointments" />}
        </div>
      </div>

      <AppointmentFormModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleCreate} />
      <AppointmentDetailsModal appointment={viewAppt} onClose={() => setViewAppt(null)} />
      <AppointmentEditModal appointment={editAppt} onClose={() => setEditAppt(null)} />

      {/* Doctor's notes captured when a visit is marked completed — these
          become the medical record shown on the patient's portal */}
      <Modal
        open={!!completeAppt}
        onClose={() => setCompleteAppt(null)}
        title="Complete visit"
        subtitle={completeAppt
          ? `${window.findPatient(completeAppt.patientId)?.name || 'Patient'} · ${window.formatDate(completeAppt.date)} at ${completeAppt.time}`
          : ''}
        icon="stethoscope"
        iconKind="info"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setCompleteAppt(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveComplete}>Save &amp; complete visit</button>
        </>}
      >
        <Field
          label="Doctor's notes / visit summary"
          required
          error={notesError}
          help="Encoded from the doctor's written notes after the visit; saved to the patient's medical records in their portal."
        >
          <TextArea
            rows={4}
            placeholder="e.g., Blood pressure well controlled on current medication. Continue lifestyle changes; repeat ECG in 6 months."
            value={visitNotes}
            onChange={e => { setVisitNotes(e.target.value); if (notesError) setNotesError(''); }}
            error={notesError}
            maxLength={500}
          />
        </Field>
      </Modal>


      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={delLoading}
        title="Delete this appointment?"
        message={confirmDel ? `Ref ${confirmDel.id.toUpperCase()} will be permanently removed from the system.` : ''}
        confirmLabel="Delete appointment"
        kind="danger"
      />
    </AppShell>
  );
}

// ---------- Patient stories (public testimonial moderation) ----------
// Portal submissions land here as pending; approved ones are shown on the
// public "What patients say" carousel under the display name only. Staff see
// the author's account identity for verification; the public site does not.
function StoryRow({ t, actions }) {
  const author = window.findPatient(t.patientId);
  return (
    <div className="list-item" style={{ alignItems: 'flex-start' }}>
      <PatientAvatar person={author} size={28} />
      <div className="list-item-body">
        <div className="list-item-title">"{t.quote}"</div>
        <div className="list-item-sub">
          Shows as "{t.displayName}" · submitted {window.formatDate(t.createdAt)}
          {t.reviewedAt ? ` · reviewed ${window.formatDate(t.reviewedAt)}` : ''}
          {author ? ` · ${author.name}${author.email ? `, ${author.email}` : ''}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{actions}</div>
    </div>
  );
}

function StoriesMgmt() {
  const store = useStore();
  // Simulated fetch — skeleton header + rows while "loading", same 600ms
  // pattern as the other admin list pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // Search spans the quote, display name, and the patient's account identity
  const matches = (t) => {
    if (!q) return true;
    const author = window.findPatient(t.patientId);
    return `${t.quote} ${t.displayName} ${author ? author.name : ''}`.toLowerCase().includes(q);
  };
  const pending = store.testimonials.filter(t => t.status === 'pending').filter(matches);
  const approved = store.testimonials.filter(t => t.status === 'approved').filter(matches);
  const rejected = store.testimonials.filter(t => t.status === 'rejected').filter(matches);

  // Skeleton rows mirroring the StoryRow layout (avatar + quote + meta line)
  const storySkeletons = (count) => Array.from({ length: count }).map((_, i) => (
    <div key={i} className="list-item" aria-hidden="true">
      <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
      <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="skel" style={{ height: 11, width: '70%' }} />
        <span className="skel" style={{ height: 10, width: '85%' }} />
      </div>
      <span className="skel" style={{ width: 74, height: 22, borderRadius: 'var(--r-pill)', flexShrink: 0 }} />
    </div>
  ));

  const setStatus = (id, status) => {
    store.setTestimonials(store.testimonials.map(t => t.id === id ? { ...t, status, reviewedAt: localToday() } : t));
    const story = store.testimonials.find(x => x.id === id);
    store.pushActivity(CURRENT_ADMIN.name,
      status === 'approved' ? 'Story approved' : status === 'pending' ? 'Story unpublished' : 'Story rejected',
      story ? `"${story.displayName}"` : '');
    store.pushToast({
      title: status === 'approved' ? 'Story approved' : status === 'pending' ? 'Story unpublished' : 'Story rejected',
      msg: status === 'approved' ? 'It is now shown on the public website.' : status === 'pending' ? 'It is back in the review queue.' : 'It will not appear on the public website.',
    });
  };

  return (
    <AppShell current="stories">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title="Patient stories"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 340, maxWidth: '100%', height: 14 }} />
            : `${pending.length} waiting for review · ${approved.length} shown on the public website`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Patient stories' }]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by quote, display name, or patient..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{pending.length + approved.length + rejected.length}</strong> matching
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2 className="h-section">Waiting for review</h2>
          </div>
          <div>
            {loading ? (
              storySkeletons(2)
            ) : pending.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState
                  icon="message-square"
                  title="No stories waiting for review"
                  message="Stories submitted from the patient portal (Help & support) appear here for approval before they are shown on the public website."
                />
              </div>
            ) : pending.map(t => (
              <StoryRow key={t.id} t={t} actions={<>
                <button className="btn btn-primary sm" onClick={() => setStatus(t.id, 'approved')}>Approve</button>
                <button className="btn btn-danger-outline sm" onClick={() => setStatus(t.id, 'rejected')}>Reject</button>
              </>} />
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2 className="h-section">Approved & shown publicly</h2>
          </div>
          <div>
            {loading ? (
              storySkeletons(1)
            ) : approved.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState
                  icon="globe"
                  title="Nothing published yet"
                  message="Approved stories appear on the public website's What patients say carousel."
                />
              </div>
            ) : approved.map(t => (
              <StoryRow key={t.id} t={t} actions={
                <button className="btn btn-secondary sm" onClick={() => setStatus(t.id, 'pending')}>Unpublish</button>
              } />
            ))}
          </div>
        </div>

        {rejected.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="h-section">Not published</h2>
            </div>
            <div>
              {rejected.map(t => (
                <StoryRow key={t.id} t={t} actions={
                  <button className="btn btn-secondary sm" onClick={() => setStatus(t.id, 'pending')}>Restore to review</button>
                } />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ---------- Activity log (full page) ----------
// Audit trail of staff / doctor / patient-portal actions from the shared
// store — seeded with fictional demo entries (see data.js) until real
// actions land, persisted in this browser like the rest of the demo data.
function AdminActivity() {
  const store = useStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const todayISO = localToday();

  // Filters: text search (action/detail/actor) + "who did it" chips. The actor
  // is classified against the live registries — the staff console's admin name,
  // the doctors directory, and the patient registry (registered accounts are
  // synced there on sign-up). Anything unrecognized falls back to staff, since
  // the only writer outside doctors and patients is the console.
  const [query, setQuery] = useState('');
  const [who, setWho] = useState('all');
  const roleOf = (name) => {
    if (!name || name === CURRENT_ADMIN.name) return 'staff';
    if (store.doctors.some(d => d.name === name)) return 'doctor';
    if (store.patients.some(p => p.name === name)) return 'patient';
    return 'staff';
  };
  const filtered = store.activity.filter(e => {
    if (who !== 'all' && roleOf(e.actor) !== who) return false;
    if (!query) return true;
    const hay = `${e.action} ${e.detail || ''} ${e.actor}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const filtersActive = who !== 'all' || query.trim() !== '';
  const whoFilters = [
    ['all', 'All'],
    ['staff', 'Staff'],
    ['doctor', 'Doctors'],
    ['patient', 'Patients'],
  ];

  // Pagination — same pattern as the other admin list pages. 6 rows per page
  // keeps the centered 860px column comfortable; the store caps the log at
  // 20 entries (see pushActivity in components.jsx), so this tops out at
  // 4 pages for the demo.
  const PAGE = 6;
  const [page, setPage] = useState(1);
  // A search/filter change can move the current page out of range
  useEffect(() => { setPage(1); }, [query, who]);
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <AppShell current="a-activity">
      <div className="page" style={{ maxWidth: 860, margin: '0 auto' }}>
        <PageHeader
          title="Activity log"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 220, maxWidth: '100%', height: 14 }} />
            : (filtersActive
              ? `${filtered.length} of ${store.activity.length} actions shown · newest first`
              : `${store.activity.length} action${store.activity.length === 1 ? '' : 's'} · newest first`)}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Activity log' }]}
        />

        {/* Search + who-did-it filter chips (same toolbar pattern as the
            doctor portal's My patients page) */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search action, name, or detail..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {whoFilters.map(([key, label]) => (
                <button key={key} className={'chip filter' + (who === key ? ' on' : '')} onClick={() => setWho(key)}>{label}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {store.activity.length} matching
            </div>
          </div>
        </div>

        <div className="card">
          <div>
            {loading ? (
              [0, 1, 2, 3, 4].map(i => (
                <div key={i} className="list-item" aria-hidden="true">
                  <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="skel" style={{ height: 10, width: '35%' }} />
                    <span className="skel" style={{ height: 10, width: '65%' }} />
                  </div>
                  <span className="skel" style={{ width: 64, height: 11, flexShrink: 0 }} />
                </div>
              ))
            ) : store.activity.length === 0 ? (
              <EmptyState icon="activity" title="No activity yet" message="Actions from the console, doctor portal, and patient bookings will appear here." />
            ) : filtered.length === 0 ? (
              <EmptyState icon="filter" title="No actions match your filters"
                message="Try a different search term or filter."
                actions={<button className="btn btn-secondary" onClick={() => { setQuery(''); setWho('all'); }}>Clear filters</button>} />
            ) : paged.map(e => {
              const d = new Date(e.at);
              const pad = (x) => String(x).padStart(2, '0');
              const dayISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              // Today's entries show just the time; older ones get the date too
              const label = dayISO === todayISO ? time : `${window.formatDate(dayISO)} · ${time}`;
              return (
                <div key={e.id} className="list-item">
                  <div className="avatar">{window.initials(e.actor)}</div>
                  <div className="list-item-body">
                    <div className="list-item-title">{e.action}</div>
                    <div className="list-item-sub">{e.detail ? `${e.detail} · ` : ''}{e.actor}</div>
                  </div>
                  <span className="t-mono" style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!loading && filtered.length > 0 && (
          <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="actions" />
        )}

        <p className="t-muted" style={{ fontSize: 12, marginTop: 12 }}>
          Entries persist in this browser. Seed entries are fictional demo data; real actions from the console, doctor portal, and patient bookings are added on top.
        </p>
      </div>
    </AppShell>
  );
}

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


// ---------- Settings ----------
function AdminSettings() {
  const store = useStore();
  // Simulated fetch — centered circle spinner while "loading", same 600ms
  // pattern as the patient Book/Profile pages
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setPageLoading(false), 600); return () => clearTimeout(t); }, []);
  // Live from the store — clinic info is synced to the public website and
  // preferences drive the patient booking flow (see StoreProvider)
  const [clinic, setClinic] = useState({ ...store.clinic });
  const [prefs, setPrefs] = useState({ ...store.prefs });
  const [savingClinic, setSavingClinic] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const updateClinic = (k, v) => setClinic(f => ({ ...f, [k]: v }));
  const updatePref = (k, v) => setPrefs(f => ({ ...f, [k]: v }));

  const saveClinic = (e) => {
    e.preventDefault();
    if (!clinic.name.trim()) {
      store.pushToast({ kind: 'error', title: 'Clinic name required', msg: 'Please enter a clinic name before saving.' });
      return;
    }
    setSavingClinic(true);
    setTimeout(() => {
      // Syncs window.HOSPITAL live — the public website reflects this on the
      // very next page view (nav brand, footer, contact page, receipts)
      store.setClinic({ ...clinic });
      setSavingClinic(false);
      store.pushToast({ title: 'Clinic info saved', msg: 'The public website now shows the updated details.' });
    }, 500);
  };

  const savePrefs = (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setTimeout(() => {
      store.setPrefs({ ...prefs });
      setSavingPrefs(false);
      store.pushToast({
        title: 'Preferences saved',
        msg: prefs.autoConfirm
          ? 'New patient bookings will be confirmed instantly.'
          : 'New patient bookings will wait for staff review.',
      });
    }, 500);
  };

  if (pageLoading) {
    return (
      <AppShell current="settings">
        <div className="page"><PageSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell current="settings">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title="Settings"
          subtitle="Clinic information and appointment preferences."
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Settings' }]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Clinic information</h2></div>
          <form onSubmit={saveClinic}>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Clinic name" required>
                  <TextInput value={clinic.name} onChange={e => updateClinic('name', e.target.value)} />
                </Field>
                <Field label="Contact number" required>
                  <TextInput type="tel" value={clinic.phone} onChange={e => updateClinic('phone', e.target.value)} icon="phone" />
                </Field>
                <Field label="Email" required>
                  <TextInput type="email" value={clinic.email} onChange={e => updateClinic('email', e.target.value)} icon="mail" />
                </Field>
                <Field label="Address">
                  <TextInput value={clinic.address} onChange={e => updateClinic('address', e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className={`btn btn-primary ${savingClinic ? 'btn-loading' : ''}`}>Save changes</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Appointment preferences</h2></div>
          <form onSubmit={savePrefs}>
            <div className="card-body stack lg">
              <label className="checkbox">
                <input type="checkbox" checked={prefs.emailNewAppointments} onChange={e => updatePref('emailNewAppointments', e.target.checked)} />
                <span>Email admins when a new appointment is booked</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={prefs.remindPatients} onChange={e => updatePref('remindPatients', e.target.checked)} />
                <span>Send patients a reminder email the day before their visit</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={prefs.autoConfirm} onChange={e => updatePref('autoConfirm', e.target.checked)} />
                <span>Auto-confirm pending appointments (skip manual review)</span>
              </label>
              <Field label="Appointment slot interval" help="Time slots offered on the patient booking form. Hourly shows :00 slots only. The booking grid runs on 30-minute granularity.">
                <SelectInput value={prefs.slotInterval} onChange={e => updatePref('slotInterval', e.target.value)}>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every 1 hour</option>
                </SelectInput>
              </Field>
            </div>
            <div className="card-footer">
              <button type="submit" className={`btn btn-primary ${savingPrefs ? 'btn-loading' : ''}`}>Save preferences</button>
            </div>
          </form>
        </div>

        <p className="t-muted" style={{ fontSize: 12, marginTop: 12 }}>
          Settings are saved in this browser and applied instantly — clinic info updates the public website, and preferences drive the patient booking flow.
        </p>
      </div>
    </AppShell>
  );
}


// ---------- Patient messages (support tickets) ----------
// Patients send questions from the portal's Help & support page ("Message the
// clinic"); they land here as open tickets. Staff reply once — the reply shows
// in the patient's portal and the ticket is marked resolved (same loop as the
// patient stories moderation flow).
function TicketsMgmt() {
  const store = useStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [sending, setSending] = useState(false);

  const open = store.tickets.filter(t => t.status === 'open');
  const resolved = store.tickets.filter(t => t.status === 'resolved');

  const startReply = (t) => { setReplyFor(t); setReplyText(''); setReplyError(''); };

  const sendReply = () => {
    const text = replyText.trim();
    if (text.length < 10) { setReplyError('Please write a reply (10+ characters).'); return; }
    setSending(true);
    setTimeout(() => {
      store.setTickets(store.tickets.map(t => t.id === replyFor.id
        ? {
            ...t,
            status: 'resolved',
            reply: text,
            repliedAt: localToday(),
            // Conversation history after the first message — the patient's
            // follow-ups stay visible above the new reply in their portal
            thread: [...(t.thread || []), { id: t.id + '-s' + Date.now(), from: 'staff', text, date: localToday() }],
          }
        : t));
      store.pushActivity(CURRENT_ADMIN.name, 'Replied to patient message', `"${replyFor.subject}"`);
      store.pushToast({ title: 'Reply sent', msg: `${replyFor.name || 'The patient'} will see your response in their portal.` });
      setSending(false);
      setReplyFor(null);
    }, 600);
  };

  const rowSkeletons = (count) => Array.from({ length: count }).map((_, i) => (
    <div key={i} className="list-item" aria-hidden="true">
      <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
      <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="skel" style={{ height: 11, width: '55%' }} />
        <span className="skel" style={{ height: 10, width: '80%' }} />
      </div>
      <span className="skel" style={{ width: 74, height: 22, borderRadius: 'var(--r-pill)', flexShrink: 0 }} />
    </div>
  ));

  const TicketRow = ({ t, actions, children }) => {
    const author = window.findPatient(t.patientId);
    return (
      <div className="list-item" style={{ alignItems: 'flex-start' }}>
        <PatientAvatar person={author} size={28} />
        <div className="list-item-body">
          <div className="list-item-title">{t.subject}</div>
          {/* Override the one-line ellipsis: the message body is the content here */}
          <div className="list-item-sub" style={{ whiteSpace: 'normal', overflow: 'visible', lineHeight: 1.5 }}>
            {t.message}
          </div>
          {(t.thread || []).some(m => m.from === 'patient') && (
            <div className="list-item-sub" style={{ marginTop: 4 }}>
              {t.thread.filter(m => m.from === 'patient').length} patient follow-up{t.thread.filter(m => m.from === 'patient').length === 1 ? '' : 's'}. See reply history
            </div>
          )}
          <div className="list-item-sub" style={{ marginTop: 4 }}>
            {t.name || (author ? author.name : 'Patient')} · sent {window.formatDate(t.createdAt)}
            {t.repliedAt ? ` · replied ${window.formatDate(t.repliedAt)}` : ''}
          </div>
          {children}
        </div>
        <div style={{ flexShrink: 0 }}>{actions}</div>
      </div>
    );
  };

  return (
    <AppShell current="tickets">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title="Patient messages"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 280, maxWidth: '100%', height: 14 }} />
            : `${open.length} awaiting a reply · ${resolved.length} resolved`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Patient messages' }]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Open</h2></div>
          <div>
            {loading ? rowSkeletons(2) : open.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState icon="inbox" title="No open messages"
                  message="Messages sent from the patient portal's Help & support page appear here." />
              </div>
            ) : open.map(t => (
              <TicketRow key={t.id} t={t}
                actions={<button className="btn btn-primary sm" onClick={() => startReply(t)}><Icon name="reply" size={13} /> Reply</button>} />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Resolved</h2></div>
          <div>
            {loading ? rowSkeletons(1) : resolved.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState icon="check-circle-2" title="Nothing resolved yet" message="Replied messages move here." />
              </div>
            ) : resolved.map(t => (
              <TicketRow key={t.id} t={t}
                actions={<Badge kind="success" dot={false}>Replied</Badge>}>
                {t.reply && (
                  <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, background: 'var(--success-soft)', border: '1px solid #6EE7B7', borderRadius: 6, padding: '8px 10px', color: 'var(--success-text)' }}>
                    <strong>Our reply:</strong> {t.reply}
                  </div>
                )}
              </TicketRow>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={!!replyFor}
        onClose={() => setReplyFor(null)}
        title="Reply to patient"
        subtitle={replyFor ? `${replyFor.name || 'Patient'} · "${replyFor.subject}"` : ''}
        icon="reply" iconKind="info"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setReplyFor(null)} disabled={sending}>Cancel</button>
          <button className={`btn btn-primary ${sending ? 'btn-loading' : ''}`} onClick={sendReply}>Send reply &amp; resolve</button>
        </>}
      >
        {replyFor && (
          <div className="stack md">
            <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, lineHeight: 1.55 }}>
              {replyFor.message}
            </div>
            {(replyFor.thread || []).map(m => (
              <div key={m.id} style={{
                borderRadius: 6, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.55,
                border: '1px solid ' + (m.from === 'staff' ? '#6EE7B7' : 'var(--border)'),
                background: m.from === 'staff' ? 'var(--success-soft)' : 'var(--surface-muted)',
                color: m.from === 'staff' ? 'var(--success-text)' : 'var(--text-secondary)',
              }}>
                <strong>{m.from === 'staff' ? 'Previous staff reply' : 'Patient follow-up'}:</strong> {m.text}
                {m.date && <div className="t-help" style={{ marginTop: 2 }}>{window.formatDate(m.date)}</div>}
              </div>
            ))}
            <Field label="Your reply" required error={replyError}
              help="The patient sees this in their portal; sending also marks the message resolved.">
              <TextArea rows={4} value={replyText}
                onChange={e => { setReplyText(e.target.value); if (replyError) setReplyError(''); }}
                error={replyError} maxLength={500}
                placeholder="e.g., Your HMO covers the annual physical exam. Just present your card at the counter." />
            </Field>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

// ---------- Edit / reschedule appointment (staff) ----------
// Patients can reschedule from their portal; staff get the same here instead
// of the old delete-and-recreate (which lost the doctor's notes). Slots use
// the same live availability — booked slots are disabled and the appointment's
// own slot stays selectable.
function AppointmentEditModal({ appointment, onClose }) {
  const store = useStore();
  const [form, setForm] = useState({ doctorId: '', date: '', time: '', reason: '' });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (appointment) {
      setForm({ doctorId: appointment.doctorId, date: appointment.date, time: appointment.time, reason: appointment.reason });
      setErrors({});
    }
  }, [appointment]);
  if (!appointment) return null;

  const dates = Object.keys(AVAILABILITY_TEMPLATE);
  // An appointment may sit on a date outside the rolling template — keep it
  // selectable so staff can keep or move it
  if (appointment.date && !dates.includes(appointment.date)) dates.unshift(appointment.date);
  const interval = (store.prefs || {}).slotInterval || '30';
  const slotTimes = getSlotsFor(form.doctorId, form.date, store.appointments, appointment.id)
    .filter(([t, ok]) => ok && slotFitsInterval(t, interval))
    .map(([t]) => t);
  if (form.time && !slotTimes.includes(form.time)) slotTimes.unshift(form.time);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const submit = () => {
    const e = {};
    if (!form.doctorId) e.doctorId = 'Please select a doctor';
    if (!form.date) e.date = 'Please pick a date';
    if (!form.time) e.time = 'Please pick a time slot';
    if (!form.reason.trim()) e.reason = 'Reason for visit is required';
    if (!e.doctorId && !e.date && !e.time && isSlotTaken(form.doctorId, form.date, form.time, store.appointments, appointment.id)) {
      e.time = 'That slot is already booked for this doctor.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    store.setAppointments(store.appointments.map(a => a.id === appointment.id ? { ...a, ...form, reason: form.reason.trim() } : a));
    store.pushActivity(CURRENT_ADMIN.name, 'Updated appointment',
      `Ref ${appointment.id.toUpperCase()} → ${window.formatDate(form.date)} at ${form.time}`);
    store.pushToast({ title: 'Appointment updated', msg: `Ref ${appointment.id.toUpperCase()} moved to ${window.formatDate(form.date)} at ${form.time}.` });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit appointment"
      subtitle={`Ref ${appointment.id.toUpperCase()} · ${window.findPatient(appointment.patientId)?.name || 'Patient'}`}
      icon="pencil"
      size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Save changes</button>
      </>}
    >
      <div className="stack md">
        <Field label="Doctor" required error={errors.doctorId}>
          <SelectInput value={form.doctorId} onChange={e => {
            const prev = form.doctorId;
            set('doctorId', e.target.value);
            // Switching doctors invalidates the previously chosen slot
            if (e.target.value !== prev) setForm(f => ({ ...f, date: '', time: '' }));
          }} error={errors.doctorId}>
            <option value="">Select a doctor...</option>
            {store.doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
          </SelectInput>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date" required error={errors.date}>
            <SelectInput value={form.date} onChange={e => { set('date', e.target.value); setForm(f => ({ ...f, time: '' })); }} error={errors.date}>
              {dates.map(d => (
                <option key={d} value={d}>
                  {window.formatDate(d)}{AVAILABILITY_TEMPLATE[d] ? ` (${AVAILABILITY_TEMPLATE[d].day})` : ''}{form.doctorId && !isClinicDay(form.doctorId, d) ? ' — not a clinic day' : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Time slot" required error={errors.time} help={!errors.time && 'Already-booked slots are disabled.'}>
            <SelectInput value={form.time} onChange={e => set('time', e.target.value)} error={errors.time} disabled={!form.date}>
              <option value="">{form.date ? 'Select a time...' : 'Pick a date first'}</option>
              {slotTimes.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </Field>
        </div>
        <Field label="Reason for visit" required error={errors.reason}>
          <TextArea value={form.reason} onChange={e => set('reason', e.target.value)} error={errors.reason} maxLength={500} />
        </Field>
      </div>
    </Modal>
  );
}

function AppointmentFormModal({ open, onClose, onSave }) {
  const store = useStore();
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: '', time: '', reason: '' });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (open) {
      setForm({ patientId: '', doctorId: '', date: '', time: '', reason: '' });
      setErrors({});
    }
  }, [open]);

  const dates = Object.keys(AVAILABILITY_TEMPLATE);
  // Live availability — reflects slots already booked by patients or staff
  const interval = (store.prefs || {}).slotInterval || '30';
  const slots = getSlotsFor(form.doctorId, form.date, store.appointments)
    .filter(s => s[1]).map(([t]) => t).filter(t => slotFitsInterval(t, interval));
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const submit = () => {
    const e = {};
    if (!form.patientId) e.patientId = 'Please select a patient';
    if (!form.doctorId) e.doctorId = 'Please select a doctor';
    if (!form.date) e.date = 'Please pick a date';
    if (!form.time) e.time = 'Please pick a time slot';
    if (!form.reason.trim()) e.reason = 'Reason for visit is required';
    else if (form.reason.trim().length < 10) e.reason = 'Please provide a bit more detail (10+ characters)';
    // Duplicate-booking guard: one active appointment per doctor+date+time
    if (!e.patientId && !e.doctorId && !e.date && !e.time && isSlotTaken(form.doctorId, form.date, form.time, store.appointments)) {
      e.time = 'That slot is already booked for this doctor.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New appointment"
      subtitle="Book a consultation on behalf of a patient."
      size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Create appointment</button>
      </>}
    >
      <div className="stack md">
        <Field label="Patient" required error={errors.patientId}>
          <SelectInput value={form.patientId} onChange={e => set('patientId', e.target.value)} error={errors.patientId}>
            <option value="">Select a patient...</option>
            {store.patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
          </SelectInput>
        </Field>
        <Field label="Doctor" required error={errors.doctorId}>
          <SelectInput value={form.doctorId} onChange={e => {
            const prev = form.doctorId;
            set('doctorId', e.target.value);
            // Switching doctors invalidates the previously chosen slot
            if (e.target.value !== prev) setForm(f => ({ ...f, date: '', time: '' }));
          }} error={errors.doctorId}>
            <option value="">Select a doctor...</option>
            {store.doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
          </SelectInput>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date" required error={errors.date}>
            <SelectInput value={form.date} onChange={e => { set('date', e.target.value); set('time', ''); }} error={errors.date}>
              <option value="">Select a date...</option>
              {dates.map(d => (
                <option key={d} value={d}>
                  {window.formatDate(d)} ({AVAILABILITY_TEMPLATE[d].day}){form.doctorId && !isClinicDay(form.doctorId, d) ? ' — not a clinic day' : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Time slot" required error={errors.time} help={!errors.time && 'Only available slots are listed.'}>
            <SelectInput value={form.time} onChange={e => set('time', e.target.value)} error={errors.time} disabled={!form.date}>
              <option value="">{form.date ? 'Select a time...' : 'Pick a date first'}</option>
              {slots.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </Field>
        </div>
        <Field label="Reason for visit" required error={errors.reason}>
          <TextArea
            placeholder="e.g., Follow-up on blood pressure medication"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            error={errors.reason}
            maxLength={500}
          />
        </Field>
      </div>
    </Modal>
  );
}

function AppointmentDetailsModal({ appointment, onClose }) {
  const appt = appointment;
  const doctor = appt ? window.findDoctor(appt.doctorId) : null;
  const patient = appt ? window.findPatient(appt.patientId) : null;
  return (
    <Modal
      open={!!appt}
      onClose={onClose}
      title={appt ? `Appointment ${appt.id.toUpperCase()}` : 'Appointment'}
      subtitle="Full appointment details."
      icon="calendar-days"
      size="md"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      {appt && (
        <div className="stack md">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={appt.status} />
            <span className="t-muted" style={{ fontSize: 12 }}>Created {window.formatDate(appt.createdAt)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="t-help">Patient</div>
              <div style={{ fontWeight: 600 }}>{patient ? patient.name : 'Unknown'}</div>
              <div className="t-muted" style={{ fontSize: 12.5 }}>{patient ? patient.phone : '—'}</div>
            </div>
            <div>
              <div className="t-help">Doctor</div>
              <div style={{ fontWeight: 600 }}>{doctor ? doctor.name : 'Unknown'}</div>
              <div className="t-muted" style={{ fontSize: 12.5 }}>{doctor ? `${doctor.specialty} · ${doctor.room}` : '—'}</div>
            </div>
            <div>
              <div className="t-help">Date & time</div>
              <div style={{ fontWeight: 600 }}>{window.formatDate(appt.date)} · {appt.time}</div>
            </div>
            <div>
              <div className="t-help">Status</div>
              <div style={{ fontWeight: 600 }}>{window.statusMeta(appt.status).label}</div>
            </div>
          </div>
          <div>
            <div className="t-help">Reason for visit</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{appt.reason}</div>
          </div>
          {appt.notes && (
            <div>
              <div className="t-help">Doctor's notes</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{appt.notes}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { AdminDashboard, PatientsMgmt, DoctorsMgmt, AppointmentsMgmt, StoriesMgmt, TicketsMgmt, AdminReports, AdminSettings, AdminActivity });

export { AdminDashboard, PatientsMgmt, PatientFormModal, DoctorsMgmt, DoctorFormModal, AppointmentsMgmt, StoriesMgmt, TicketsMgmt, AdminReports, AdminSettings, AdminActivity };

