import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PageHeader, SortableTh, PageSpinner,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart, Sparkline,
} from './components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, downloadFile,
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

// Local (not UTC) YYYY-MM-DD so "today" matches the user's timezone (guideline 15)
function localToday() {
  const n = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// SortableTh now lives in components.jsx (shared with the patient History table)


// ============================================================
// Admin screens
// ============================================================

// ---------- Admin Dashboard ----------
function AdminDashboard() {
  const store = useStore();
  const now = new Date();
  const today = localToday();
  const todayAppts = store.appointments.filter(a => a.date === today);
  const pending = store.appointments.filter(a => a.status === 'pending');

  // Simulated fetch (same 600ms pattern as the other admin lists) so the
  // dashboard shows skeletons before the data appears
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  // Trend lines are prototype data (same approach as the chart ranges below) —
  // each series ends at the card's current value so line and number agree.
  const stats = [
    { label: 'Today\'s appointments', value: todayAppts.length, delta: '+3 from yesterday', icon: 'calendar', kind: 'up', trend: [1, 3, 2, 4, 3, 1, 2] },
    { label: 'Pending confirmation',   value: pending.length,   delta: '4 need review',      icon: 'clock',     kind: 'warn', trend: [5, 6, 4, 7, 8, 6, 9] },
    { label: 'Total patients',         value: store.patients.length, delta: '+2 this week',  icon: 'users-round', kind: 'up', trend: [18, 19, 20, 20, 22, 23, 24] },
    { label: 'Active doctors',         value: store.doctors.filter(d => d.status !== 'on-leave').length, delta: `${store.doctors.filter(d => d.status === 'on-leave').length} on leave`, icon: 'stethoscope', kind: 'neutral', trend: [16, 15, 16, 14, 15, 16, 16] },
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
      label: 'Appointments — last 30 days',
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
          subtitle={`${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · ${todayAppts.length} appointments scheduled today`}
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

        <div className="stat-grid" style={{ marginBottom: 12 }}>
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
                  <div className={'stat-delta ' + (s.kind === 'up' ? 'up' : '')}>
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
              <button className="btn btn-ghost sm" onClick={() => navigate('/admin/appointments')}>See all <Icon name="arrow-right" size={13} /></button>
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
                  Array.from({ length: 4 }).map((_, r) => (
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
                ) : todayAppts.map(a => {
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
      store.pushToast({ title: 'Patient removed', msg: `${confirmDel.name}'s record has been deleted.` });
    }, 600);
  };

  return (
    <AppShell current="patients">
      <div className="page">
        <PageHeader
          title="Patients"
          subtitle={`${store.patients.length} registered patients`}
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
                      <td data-label="Gender / Age">{p.gender === 'M' ? 'Male' : 'Female'}, {p.age}</td>
                      <td data-label="Joined">{window.formatDate(p.joined)}</td>
                      <td data-label="Last visit">{p.lastVisit ? window.formatDate(p.lastVisit) : <span className="t-muted">Never</span>}</td>
                      <td className="col-actions">
                        {/* No edit action: personal info is owned by the patient —
                            they manage it on their Profile page, and those changes
                            reflect here automatically */}
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
      setPhotoError('Image is too large — please choose one under 1 MB.');
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
              Optional — defaults to a portrait photo. JPG/PNG up to 1 MB.
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
      setDelLoading(false);
      setConfirmDel(null);
      store.pushToast({ title: 'Doctor removed', msg: `${confirmDel.name}'s profile has been deleted.` });
    }, 600);
  };

  return (
    <AppShell current="doctors">
      <div className="page">
        <PageHeader
          title="Doctors"
          subtitle={`${store.doctors.length} doctors across ${window.SPECIALTIES.length} specialties`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Doctors' }]}
          actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={14} /> Add doctor</button>}
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
            <table className="table table-responsive-stack">
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
                        <div>
                          <div className="cell-primary cell-primary-truncate">{d.name}</div>
                          <div className="cell-secondary">{d.room}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Specialty">{d.specialty}</td>
                    <td data-label="Status"><DoctorStatusBadge status={d.status} /></td>
                    <td data-label="Availability" className="td-nowrap" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {Array.isArray(d.avail) && d.avail.length ? d.avail.join(', ') : '—'}
                    </td>
                    <td data-label="Experience">{d.exp} yrs</td>
                    <td data-label="Rating"><span className="rating-cell"><Icon name="star" size={13} style={{ color: '#F59E0B' }} /> {d.rating}</span></td>
                    <td data-label="Fee">₱{d.fee.toLocaleString()}</td>
                    <td className="col-actions">
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
        onSave={(newD) => {
          const id = 'd' + Date.now();
          const rec = {
            ...newD,
            id,
            rating: 4.5, exp: parseInt(newD.exp) || 0, fee: parseInt(newD.fee) || 0,
            // Default to a dummy portrait when no photo was uploaded
            photo: newD.photo || `https://randomuser.me/api/portraits/${newD.gender === 'F' ? 'women' : 'men'}/${Math.floor(Math.random() * 99) + 1}.jpg`,
          };
          // Keep the static DOCTORS registry (used by patient-side findDoctor) in sync
          window.DOCTORS.unshift(rec);
          store.setDoctors([...window.DOCTORS]);
          setAddOpen(false);
          store.pushToast({ title: 'Doctor added', msg: `${newD.name} has been added to your directory.` });
        }} />
      <DoctorFormModal open={!!editingId} onClose={() => setEditingId(null)}
        doctor={store.doctors.find(d => d.id === editingId)}
        onSave={(edited) => {
          // Sync the static DOCTORS registry so patient-side findDoctor() sees the update
          const i = window.DOCTORS.findIndex(x => x.id === editingId);
          if (i > -1) Object.assign(window.DOCTORS[i], edited, { exp: parseInt(edited.exp) || 0, fee: parseInt(edited.fee) || 0 });
          store.setDoctors(store.doctors.map(d => d.id === editingId ? { ...d, ...edited, exp: parseInt(edited.exp) || 0, fee: parseInt(edited.fee) || 0 } : d));
          setEditingId(null);
          store.pushToast({ title: 'Doctor updated', msg: `${edited.name}'s profile has been updated.` });
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

function DoctorFormModal({ open, onClose, doctor, onSave }) {
  const isEdit = !!doctor;
  const [form, setForm] = useState({ name: '', specialty: 'Cardiology', status: 'available', room: '', exp: '', fee: '' });
  const [errors, setErrors] = useState({});
  const [avail, setAvail] = useState(['Mon','Tue','Wed','Thu','Fri']);
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setForm(doctor ? { name: doctor.name, specialty: doctor.specialty, status: doctor.status, room: doctor.room, exp: doctor.exp, fee: doctor.fee } : { name: '', specialty: 'Cardiology', status: 'available', room: '', exp: '', fee: '' });
      setAvail(doctor && Array.isArray(doctor.avail) && doctor.avail.length ? [...doctor.avail] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setPhoto(doctor?.photo || '');
      setPhotoError('');
      setErrors({});
    }
  }, [open, doctor]);
  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file (JPG or PNG).');
      return;
    }
    if (file.size > 1024 * 1024) {
      setPhotoError('Image is too large — please choose one under 1 MB.');
      return;
    }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };
  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Doctor name is required';
    if (!form.room.trim()) e.room = 'Room / clinic is required';
    if (!form.exp) e.exp = 'Years of experience required';
    if (!form.fee) e.fee = 'Consultation fee required';
    if (!avail.length) e.avail = 'Select at least one available day';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ ...form, avail, photo });
  };
  const toggleDay = (day) => setAvail(av => av.includes(day) ? av.filter(d => d !== day) : [...av, day]);

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEdit ? 'Edit doctor' : 'Add new doctor'}
      subtitle={isEdit ? 'Update the doctor\'s profile and availability.' : 'Create a new doctor profile with schedule.'}
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
              Optional — defaults to a portrait photo. JPG/PNG up to 1 MB.
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
      </div>
    </Modal>
  );
}

// ---------- Appointments Management ----------
function AppointmentsMgmt() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewAppt, setViewAppt] = useState(null);
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
    // Same-day rows keep chronological order by time slot
    return sortKey === 'date' ? a.time.localeCompare(b.time) * dir : 0;
  });
  const paged = sorted.slice((page - 1) * PAGE, page * PAGE);
  // A sort change can move the current page out of range
  useEffect(() => { setPage(1); }, [sortKey, sortDir]);

  const updateStatus = (id, newStatus) => {
    store.setAppointments(store.appointments.map(a => a.id === id ? { ...a, status: newStatus } : a));
    const meta = window.statusMeta(newStatus);
    store.pushToast({ title: 'Status updated', msg: `Appointment marked as ${meta.label}.` });
  };

  const doDelete = () => {
    setDelLoading(true);
    setTimeout(() => {
      store.setAppointments(store.appointments.filter(x => x.id !== confirmDel.id));
      setDelLoading(false);
      setConfirmDel(null);
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
    setAddOpen(false);
    setPage(1);
    store.pushToast({ title: 'Appointment created', msg: `Ref ${newAppt.id.toUpperCase()} has been added to the queue.` });
  };

  return (
    <AppShell current="appointments">
      <div className="page">
        <PageHeader
          title="Appointments"
          subtitle={`${store.appointments.length} total · ${store.appointments.filter(a => a.status === 'pending').length} pending review`}
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
                        </SelectInput>
                      </td>
                      <td className="col-actions">
                        <button className="btn-icon" title="View" aria-label="View appointment" onClick={() => setViewAppt(a)}><Icon name="eye" size={16} /></button>
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
  const [clinic, setClinic] = useState({
    name: HOSPITAL.name, phone: HOSPITAL.phone, email: HOSPITAL.email, address: HOSPITAL.address,
  });
  const [prefs, setPrefs] = useState({
    emailNewAppointments: true,
    remindPatients: true,
    autoConfirm: false,
    slotInterval: '30',
  });
  const [savingClinic, setSavingClinic] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const updateClinic = (k, v) => setClinic(f => ({ ...f, [k]: v }));
  const updatePref = (k, v) => setPrefs(f => ({ ...f, [k]: v }));

  const saveClinic = (e) => {
    e.preventDefault();
    setSavingClinic(true);
    setTimeout(() => {
      setSavingClinic(false);
      store.pushToast({ title: 'Clinic info saved', msg: 'Changes will apply across the portal.' });
    }, 700);
  };

  const savePrefs = (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setTimeout(() => {
      setSavingPrefs(false);
      store.pushToast({ title: 'Preferences saved', msg: 'Your settings are now active.' });
    }, 700);
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
      <div className="page" style={{ maxWidth: 960 }}>
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
              <Field label="Appointment slot interval" help="Time slots offered on the patient booking form.">
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
          Note: settings are stored in memory for this prototype and reset on refresh.
        </p>
      </div>
    </AppShell>
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
  const slots = getSlotsFor(form.doctorId, form.date, store.appointments).filter(s => s[1]).map(([t]) => t);
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
            {store.patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
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
            {store.doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
          </SelectInput>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date" required error={errors.date}>
            <SelectInput value={form.date} onChange={e => { set('date', e.target.value); set('time', ''); }} error={errors.date}>
              <option value="">Select a date...</option>
              {dates.map(d => <option key={d} value={d}>{window.formatDate(d)} ({AVAILABILITY_TEMPLATE[d].day})</option>)}
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
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { AdminDashboard, PatientsMgmt, DoctorsMgmt, AppointmentsMgmt, AdminReports, AdminSettings });

export { AdminDashboard, PatientsMgmt, PatientFormModal, DoctorsMgmt, DoctorFormModal, AppointmentsMgmt, AdminReports, AdminSettings };

