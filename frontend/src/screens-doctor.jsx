// ============================================================
// Doctor portal — MedicaCare (third prototype role)
// Doctors log in to see their own schedule and complete their own visits.
// Visit notes are written by the doctor here (attributed to them), then
// surface on the patient's Medical Records page — the same store field the
// admin console can encode on the doctor's behalf when offline.
// ============================================================
import { useState, useEffect } from 'react';
import {
  Icon, navigate, useStore, AppShell, PageHeader,
  StatusBadge, DoctorStatusBadge, PatientAvatar, Modal, Field, TextArea, EmptyState, DoctorRatingPill,
} from './components.jsx';
import {
  findDoctor, formatDate, formatDateLong, formatDayRange, timeValue,
} from './data.js';

// Local (not UTC) YYYY-MM-DD so "today" matches the user's timezone
function localToday() {
  const n = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// The logged-in doctor's record (fallback keeps pages rendering if the
// doctor was removed from the directory)
function useDoctor() {
  const store = useStore();
  return (store.doctorSession && findDoctor(store.doctorSession.doctorId))
    || { id: '', name: 'Unknown doctor', specialty: '—', room: '—' };
}

// ---------- Complete visit — the doctor writes their own notes ----------
function CompleteVisitModal({ appointment, onClose }) {
  const store = useStore();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (appointment) { setNotes(''); setError(''); } }, [appointment]);
  if (!appointment) return null;
  const patient = window.findPatient(appointment.patientId);
  // Clinical context — completed visits this patient already had with THIS
  // doctor (first-time vs returning), from the shared store
  const priorVisits = store.appointments.filter(a =>
    a.patientId === appointment.patientId && a.doctorId === appointment.doctorId &&
    a.id !== appointment.id && a.status === 'completed').length;
  const allergies = patient && patient.allergies && patient.allergies !== 'None'
    ? patient.allergies : null;

  const save = () => {
    const n = notes.trim();
    if (n.length < 10) {
      setError('Please write the visit summary (10+ characters).');
      return;
    }
    store.setAppointments(store.appointments.map(a => a.id === appointment.id ? { ...a, status: 'completed', notes: n } : a));
    store.pushActivity((store.doctorSession || {}).name || 'Doctor', 'Completed visit', patient ? patient.name : 'Patient');
    store.pushToast({ title: 'Visit completed', msg: "Your notes were saved to the patient's medical records." });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Complete visit — your notes"
      subtitle={patient ? `${patient.name} · ${window.formatDate(appointment.date)} at ${appointment.time}` : ''}
      icon="stethoscope"
      iconKind="info"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Save &amp; complete visit</button>
      </>}
    >
      {/* Clinical context — read live from the patient's shared record
          (Profile page + visit history). Doctors write notes with the full
          picture: allergies are flagged red when present. */}
      {patient && (
        <div className="ctx-row">
          <span className="ctx-chip">
            {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : '—'}{patient.age ? ` · ${patient.age} yrs` : ''}
          </span>
          <span className="ctx-chip">Blood type {patient.bloodType || '—'}</span>
          <span className={'ctx-chip' + (allergies ? ' alert' : '')}>
            Allergies: {allergies || 'None'}
          </span>
          <span className="ctx-chip">
            {priorVisits === 0 ? 'First visit' : `Returning · ${priorVisits} prior visit${priorVisits === 1 ? '' : 's'}`}
          </span>
        </div>
      )}
      <Field
        label="Doctor's notes / visit summary"
        required
        error={error}
        help="You write these yourself — they are attributed to you and saved to the patient's medical records in their portal."
      >
        <TextArea
          rows={4}
          placeholder="e.g., Blood pressure well controlled on current medication. Continue lifestyle changes; repeat ECG in 6 months."
          value={notes}
          onChange={e => { setNotes(e.target.value); if (error) setError(''); }}
          error={error}
          maxLength={500}
        />
      </Field>
    </Modal>
  );
}

// ---------- Doctor actions over the shared store ----------
// No-show: the doctor is the first to know a patient didn't arrive. Frees
// the slot (isSlotTaken only counts pending/confirmed) and flows through the
// admin queue and patient portal via the same status field.
function markNoShow(store, appt) {
  const p = window.findPatient(appt.patientId);
  store.setAppointments(store.appointments.map(x => x.id === appt.id ? { ...x, status: 'no-show' } : x));
  store.pushActivity((store.doctorSession || {}).name || 'Doctor', 'Marked no-show', p ? p.name : 'Patient');
  store.pushToast({ title: 'Marked as no-show', msg: `${p ? p.name : 'Patient'} did not arrive — the slot is freed for rebooking.` });
}

// Short name for the compact week-view chips ("Juan Miguel B." style)
function shortName(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

// Mon–Sun ISO dates of the current week (shared by the dashboard's summary
// count and the This week page)
function getWeekDays() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

// Shared Mon–Sun week grid — used by the This week page (/doctor/week).
// Today's column is highlighted, past days read as history; compact chips
// use a left status color bar (calendar convention), full detail on hover.
function WeekGrid({ mine, weekDays, today }) {
  return (
    <div className="doctor-week-grid">
      {weekDays.map(iso => {
        const dt = new Date(iso + 'T00:00:00');
        const dayAppts = mine.filter(a => a.date === iso).sort((a, b) => timeValue(a.time) - timeValue(b.time));
        return (
          <div key={iso} className={'doctor-week-day' + (iso === today ? ' today' : iso < today ? ' past' : '')}>
            <div className="dw-day-head">
              <span className="dw-day-name">{dt.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
                {dayAppts.length > 0 && <span className="dw-count">{dayAppts.length}</span>}
                <span className="dw-day-num">{dt.getDate()}</span>
              </span>
            </div>
            {dayAppts.length === 0 ? null : dayAppts.map(a => {
              const p = window.findPatient(a.patientId);
              return (
                <div key={a.id} className={'dw-appt st-' + a.status}
                  title={`${a.time} · ${p ? p.name : 'Patient'} — ${window.statusMeta(a.status).label}`}>
                  <span className="dw-dot" aria-hidden="true" />
                  <span className="dw-body">
                    <span className="dw-time">{a.time}</span>
                    <span className="dw-pat">{shortName(p ? p.name : 'Unknown')}</span>
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Patient chart history (shared store — all doctors' notes) ----------
function PatientHistoryModal({ patient, onClose }) {
  const store = useStore();
  if (!patient) return null;
  const visits = store.appointments
    .filter(a => a.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date) || timeValue(a.time) - timeValue(b.time));
  const blood = patient.bloodType || '—';
  const allergies = (patient.allergies && patient.allergies !== 'None') ? patient.allergies : 'None';

  return (
    <Modal
      open
      onClose={onClose}
      title={patient.name || 'Patient'}
      subtitle={`${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : '—'}${patient.age ? ` · ${patient.age} yrs` : ''} · Blood type ${blood} · Allergies: ${allergies}`}
      icon="user-round"
      iconKind="info"
      size="md"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      {visits.length === 0 ? (
        <EmptyState icon="calendar-x" title="No appointment history" message="This patient has no past or upcoming visits yet." />
      ) : (
        <div className="stack md">
          {visits.map(a => {
            const doc = window.findDoctor(a.doctorId);
            return (
              <div key={a.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{formatDate(a.date)} · {a.time}</span>
                  <span className="t-muted" style={{ fontSize: 12.5 }}>{doc ? doc.name : '—'}</span>
                  <span style={{ marginLeft: 'auto' }}><StatusBadge status={a.status} /></span>
                </div>
                <div className="t-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{a.reason}</div>
                {a.status === 'completed' && a.notes && (
                  <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5, background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                    {a.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ---------- Visit notes — view and amend the doctor's own notes ----------
// Completed visits are read-only in the UI until the doctor chooses to edit;
// amendments flow straight to the patient's medical records (same field).
function VisitNotesModal({ appointment, onClose }) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (appointment) { setEditing(false); setNotes(appointment.notes || ''); setError(''); } }, [appointment]);
  if (!appointment) return null;
  const patient = window.findPatient(appointment.patientId);

  const save = () => {
    const n = notes.trim();
    if (n.length < 10) {
      setError('Please write the visit summary (10+ characters).');
      return;
    }
    store.setAppointments(store.appointments.map(a => a.id === appointment.id ? { ...a, notes: n } : a));
    store.pushActivity((store.doctorSession || {}).name || 'Doctor', 'Amended visit notes', patient ? patient.name : 'Patient');
    store.pushToast({ title: 'Notes updated', msg: "The amended notes were saved to the patient's medical records." });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Doctor's notes"
      subtitle={patient ? `${patient.name} · ${formatDate(appointment.date)}` : ''}
      icon="stethoscope"
      iconKind="info"
      footer={editing ? (
        <>
          <button className="btn btn-secondary" onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save changes</button>
        </>
      ) : (
        <>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit notes</button>
        </>
      )}
    >
      {editing ? (
        <Field
          label="Doctor's notes / visit summary"
          required
          error={error}
          help="Amendments are saved to the patient's medical records immediately."
        >
          <TextArea
            rows={4}
            value={notes}
            onChange={e => { setNotes(e.target.value); if (error) setError(''); }}
            error={error}
            maxLength={500}
          />
        </Field>
      ) : (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
          {appointment.notes || 'No consultation notes were recorded for this visit.'}
        </p>
      )}
    </Modal>
  );
}

// ---------- Doctor Dashboard — today's schedule ----------
function DoctorDashboard() {
  const store = useStore();
  const me = useDoctor();
  // Live record from store.doctors — the Admin console edits this same list
  // (profile, status, weekly availability), so staff changes show up here
  const liveDoc = store.doctors.find(d => d.id === me.id) || me;
  const clinicDays = Array.isArray(liveDoc.avail) && liveDoc.avail.length ? formatDayRange(liveDoc.avail) : null;
  // Simulated fetch — skeleton page while "loading", same 600ms pattern as
  // the other portals
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const today = localToday();
  const mine = store.appointments.filter(a => a.doctorId === me.id);
  const todayAppts = mine.filter(a => a.date === today).sort((a, b) => timeValue(a.time) - timeValue(b.time));
  const upcoming = mine
    .filter(a => a.date > today && (a.status === 'pending' || a.status === 'confirmed'))
    .sort((a, b) => a.date.localeCompare(b.date) || timeValue(a.time) - timeValue(b.time));
  const doneToday = todayAppts.filter(a => a.status === 'completed').length;
  const [completeAppt, setCompleteAppt] = useState(null);
  const [historyPatient, setHistoryPatient] = useState(null);
  const [notesAppt, setNotesAppt] = useState(null);

  const stats = [
    // Distinct icon per stat — three identical calendar icons read as template
    // filler, not as three different numbers
    { icon: 'calendar-days', label: "Today's appointments", value: todayAppts.length, context: formatDateLong(today) },
    { icon: 'check-circle-2', label: 'Completed today', value: doneToday, context: `${todayAppts.length - doneToday} still to see` },
    { icon: 'calendar-clock', label: 'Upcoming', value: upcoming.length, context: 'Pending & confirmed visits ahead' },
  ];

  return (
    <AppShell current="d-dashboard">
      <div className="page">
        <PageHeader
          title={loading
            ? /* Skeleton for the doctor's name — the live record loads from
                 the store alongside the rest of the page (same 600ms window) */
              <span className="skel" aria-hidden="true" style={{ display: 'inline-block', width: 280, maxWidth: '100%', height: 24, verticalAlign: 'middle' }} />
            : me.name}
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 260, maxWidth: '100%', height: 14 }} />
            : (
              // Status + clinic days come from the record the Admin console
              // maintains — read-only here, always in sync with staff edits
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{me.specialty} · {me.room}</span>
                {clinicDays && <span>Clinic days: {clinicDays}</span>}
                <DoctorStatusBadge status={liveDoc.status} />
              </span>
            )}
          breadcrumbs={[{ label: 'Doctor portal' }]}
          actions={<button className="btn btn-secondary" onClick={() => navigate('/doctor/patients')}>All my patients <Icon name="arrow-right" size={13} /></button>}
        />

        <div className="stat-grid three" style={{ marginBottom: 20 }}>
          {stats.map((s, i) => (
            <div key={i} className="card stat-card">
              {loading ? (
                <>
                  <span className="skel" style={{ height: 12, width: '70%' }} />
                  <span className="skel" style={{ height: 26, width: '30%' }} />
                  <span className="skel" style={{ height: 10, width: '55%' }} />
                </>
              ) : (
                <>
                  <div className="stat-label"><Icon name={s.icon} size={14} /> {s.label}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-delta">{s.context}</div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2 className="h-section">Today's schedule</h2>
            <span className="t-muted" style={{ fontSize: 12 }}>{formatDateLong(today)}</span>
          </div>
          <div>
            {loading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="list-item" aria-hidden="true">
                  <span className="skel" style={{ width: 64, height: 12, flexShrink: 0 }} />
                  <span className="skel" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="skel" style={{ height: 11, width: '45%' }} />
                    <span className="skel" style={{ height: 10, width: '70%' }} />
                  </div>
                  <span className="skel" style={{ width: 84, height: 28, flexShrink: 0 }} />
                </div>
              ))
            ) : todayAppts.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState icon="calendar-check" title="No appointments today" message="Your schedule is clear — enjoy the breather." />
              </div>
            ) : todayAppts.map(a => {
              const p = window.findPatient(a.patientId);
              const canComplete = a.status === 'pending' || a.status === 'confirmed';
              return (
                <div key={a.id} className="list-item">
                  <span className="t-mono" style={{ fontSize: 13, fontWeight: 600, width: 72, flexShrink: 0 }}>{a.time}</span>
                  <PatientAvatar person={p} size={32} />
                  <div className="list-item-body">
                    <div className="list-item-title">
                      {/* Patient name opens the shared-chart history (all past
                          visits + doctors' notes for this patient) */}
                      <button type="button" className="link-btn" onClick={() => setHistoryPatient(p || { id: a.patientId, name: 'Unknown patient' })}>
                        {p ? p.name : 'Unknown patient'}
                      </button>
                    </div>
                    <div className="list-item-sub">{a.reason}</div>
                  </div>
                  <StatusBadge status={a.status} />
                  {canComplete && (
                    <>
                      {/* Quiet ghost action — the old red icon read as delete;
                          no-show is a status report, not a destructive act */}
                      <button className="btn btn-ghost sm" title="Patient did not arrive" onClick={() => markNoShow(store, a)}>
                        <Icon name="user-x" size={13} /> No-show
                      </button>
                      <button className="btn btn-primary sm" onClick={() => setCompleteAppt(a)}>Complete visit</button>
                    </>
                  )}
                  {a.status === 'completed' && (
                    <button className="btn btn-ghost sm" onClick={() => setNotesAppt(a)}>Notes</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* This week (Mon–Sun grid) and Patient feedback now live on their
            own pages — /doctor/week and /doctor/feedback, both reachable
            from the sidebar */}

        <div className="card">
          <div className="card-header">
            <h2 className="h-section">Coming up</h2>
            <button className="btn btn-ghost sm" onClick={() => navigate('/doctor/patients')}>See all <Icon name="arrow-right" size={13} /></button>
          </div>
          <div>
            {loading ? (
              [0, 1].map(i => (
                <div key={i} className="list-item" aria-hidden="true">
                  <span className="skel" style={{ width: 130, height: 12, flexShrink: 0 }} />
                  <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="skel" style={{ height: 11, width: '40%' }} />
                    <span className="skel" style={{ height: 10, width: '60%' }} />
                  </div>
                </div>
              ))
            ) : upcoming.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState icon="calendar" title="Nothing scheduled ahead" message="New bookings from the portal will appear here." />
              </div>
            ) : upcoming.slice(0, 4).map(a => {
              const p = window.findPatient(a.patientId);
              return (
                <div key={a.id} className="list-item">
                  <span className="t-mono" style={{ fontSize: 12.5, color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>
                    {formatDate(a.date)} · {a.time}
                  </span>
                  <div className="list-item-body">
                    <div className="list-item-title">
                      <button type="button" className="link-btn" onClick={() => setHistoryPatient(p || { id: a.patientId, name: 'Unknown patient' })}>
                        {p ? p.name : 'Unknown patient'}
                      </button>
                    </div>
                    <div className="list-item-sub">{a.reason}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CompleteVisitModal appointment={completeAppt} onClose={() => setCompleteAppt(null)} />
      <PatientHistoryModal patient={historyPatient} onClose={() => setHistoryPatient(null)} />
      <VisitNotesModal appointment={notesAppt} onClose={() => setNotesAppt(null)} />
    </AppShell>
  );
}

// ---------- Doctor: My patients (all appointments) ----------
function DoctorPatients() {
  const store = useStore();
  const me = useDoctor();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [completeAppt, setCompleteAppt] = useState(null);
  const [viewNotes, setViewNotes] = useState(null);
  const [historyPatient, setHistoryPatient] = useState(null);

  const today = localToday();
  const q = query.trim().toLowerCase();
  const filtered = store.appointments
    .filter(a => a.doctorId === me.id)
    .filter(a => {
      if (q) {
        const p = window.findPatient(a.patientId);
        const hay = ((p ? p.name : '') + ' ' + a.reason).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === 'today') return a.date === today;
      if (filter === 'upcoming') return a.date > today && (a.status === 'pending' || a.status === 'confirmed');
      if (filter === 'completed') return a.status === 'completed';
      if (filter === 'no-show') return a.status === 'no-show';
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || timeValue(a.time) - timeValue(b.time));

  const filters = [
    ['all', 'All'],
    ['today', 'Today'],
    ['upcoming', 'Upcoming'],
    ['completed', 'Completed'],
    ['no-show', 'No-show'],
  ];

  return (
    <AppShell current="d-patients">
      <div className="page">
        <PageHeader
          title="My patients"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 220, maxWidth: '100%', height: 14 }} />
            : `${filtered.length} appointment${filtered.length === 1 ? '' : 's'}${filter === 'all' ? ' in total' : ''}`}
          breadcrumbs={[{ label: 'Doctor portal', to: '/doctor/dashboard' }, { label: 'My patients' }]}
          actions={<button className="btn btn-secondary" onClick={() => navigate('/doctor/dashboard')}><Icon name="calendar-check" size={14} /> Today's schedule</button>}
        />

        <div className="card">
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search patient name or reason..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filters.map(([key, label]) => (
                <button key={key} className={'chip filter' + (filter === key ? ' on' : '')} onClick={() => setFilter(key)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table table-responsive-stack">
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Patient</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, r) => (
                    <tr key={r}>
                      <td data-label="Date & time"><span className="skel" style={{ width: 110, height: 12 }} /></td>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                          <span className="skel" style={{ width: 110, maxWidth: '100%', height: 12 }} />
                        </div>
                      </td>
                      <td data-label="Reason" className="cell-primary-truncate"><span className="skel" style={{ width: '70%', height: 12 }} /></td>
                      <td data-label="Status"><span className="skel" style={{ width: 64, height: 18 }} /></td>
                      <td className="col-actions"><span className="skel" style={{ width: 100, height: 28 }} /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="empty-cell" style={{ padding: 0 }}>
                    <EmptyState icon="calendar-x" title="No appointments match" message="Try a different filter to see more of your schedule." />
                  </td></tr>
                ) : filtered.map(a => {
                  const p = window.findPatient(a.patientId);
                  const canComplete = a.status === 'pending' || a.status === 'confirmed';
                  return (
                    <tr key={a.id}>
                      <td data-label="Date & time" className="td-nowrap">
                        <div className="cell-primary">{formatDate(a.date)}</div>
                        <div className="cell-secondary">{a.time}</div>
                      </td>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <PatientAvatar person={p} size={28} />
                          <div className="cell-primary">
                            <button type="button" className="link-btn" onClick={() => setHistoryPatient(p || { id: a.patientId, name: 'Unknown patient' })}>
                              {p ? p.name : 'Unknown patient'}
                            </button>
                          </div>
                        </div>
                      </td>
                      {/* Full reason is on the title attr — the column truncates */}
                      <td data-label="Reason" className="cell-primary-truncate" style={{ maxWidth: 200 }} title={a.reason}>{a.reason}</td>
                      <td data-label="Status"><StatusBadge status={a.status} /></td>
                      <td className="col-actions">
                        {canComplete ? (
                          <>
                            <button className="btn btn-ghost sm" title="Patient did not arrive" onClick={() => markNoShow(store, a)}>
                              <Icon name="user-x" size={13} /> No-show
                            </button>
                            {/* Quieter secondary here: in a long table of equal
                                rows, solid blue per row is visual noise — the
                                solid primary is reserved for Today's schedule,
                                where completing the visit is the page's task */}
                            <button className="btn btn-secondary sm" onClick={() => setCompleteAppt(a)}>Complete visit</button>
                          </>
                        ) : a.status === 'completed' ? (
                          <button className="btn btn-ghost sm" onClick={() => setViewNotes(a)}>View notes</button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CompleteVisitModal appointment={completeAppt} onClose={() => setCompleteAppt(null)} />

      {/* Notes view + amend for completed visits; patient name opens the
          shared-chart history — both read the same store as every portal */}
      <VisitNotesModal appointment={viewNotes} onClose={() => setViewNotes(null)} />
      <PatientHistoryModal patient={historyPatient} onClose={() => setHistoryPatient(null)} />
    </AppShell>
  );
}

// ---------- Doctor: This week (own page) ----------
// The Mon–Sun week grid moved off the dashboard into its own page; the
// dashboard's "This week" summary card links here.
function DoctorWeekView() {
  const store = useStore();
  const me = useDoctor();
  const today = localToday();
  const mine = store.appointments.filter(a => a.doctorId === me.id);
  const weekDays = getWeekDays();
  const weekLabel = `${formatDate(weekDays[0])} – ${formatDate(weekDays[6])}`;
  const weekCount = mine.filter(a => weekDays.includes(a.date)).length;

  return (
    <AppShell current="d-week">
      <div className="page">
        <PageHeader
          title="This week"
          subtitle={weekLabel}
          breadcrumbs={[{ label: 'Doctor portal', to: '/doctor/dashboard' }, { label: 'This week' }]}
          actions={<button className="btn btn-secondary" onClick={() => navigate('/doctor/dashboard')}><Icon name="calendar-check" size={14} /> Today's schedule</button>}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2 className="h-section">Week view</h2>
            <span className="t-muted" style={{ fontSize: 12 }}>
              {weekCount} appointment{weekCount === 1 ? '' : 's'} · today's column is highlighted
            </span>
          </div>
          <div className="card-body compact">
            <WeekGrid mine={mine} weekDays={weekDays} today={today} />
          </div>
        </div>

        <p className="t-help" style={{ margin: 0 }}>
          Full detail (time · patient · status) shows on hover over each appointment chip.
        </p>
      </div>
    </AppShell>
  );
}

// ---------- Doctor: Patient feedback (own page) ----------
// The full ratings list moved off the dashboard into its own page; the
// dashboard keeps the two latest ratings and links here.
function DoctorFeedback() {
  const store = useStore();
  const me = useDoctor();
  // Simulated fetch — skeleton rows while "loading", same 600ms pattern as
  // the other portal pages (dashboard, My patients, admin list pages)
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const myRatings = store.ratings
    .filter(r => r.doctorId === me.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return (
    <AppShell current="d-feedback">
      {/* Centered container (per design direction) — header + feedback card
          share the same 860px column, like the patient portal's narrow pages */}
      <div className="page" style={{ maxWidth: 860, margin: '0 auto' }}>
        <PageHeader
          title="Patient feedback"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 240, maxWidth: '100%', height: 14 }} />
            : 'Ratings and comments from your completed visits.'}
          breadcrumbs={[{ label: 'Doctor portal', to: '/doctor/dashboard' }, { label: 'Patient feedback' }]}
          actions={loading
            ? /* Skeleton rating pill — mirrors the DoctorRatingPill footprint
                 so the header row doesn't jump when the data lands */
              <span className="skel" aria-hidden="true" style={{ display: 'inline-block', width: 128, height: 22, borderRadius: 'var(--r-pill)' }} />
            : <DoctorRatingPill ratings={store.ratings} doctorId={me.id} />}
        />

        <div className="card">
          <div>
            {loading ? (
              // Skeleton rows mirroring the real rating rows (stars + who/when
              // line + comment line) so there is no layout shift
              [0, 1, 2].map(i => (
                <div key={i} className="list-item" aria-hidden="true">
                  <span className="skel" style={{ width: 86, height: 14, flexShrink: 0 }} />
                  <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="skel" style={{ height: 11, width: '45%' }} />
                    <span className="skel" style={{ height: 10, width: '70%' }} />
                  </div>
                </div>
              ))
            ) : myRatings.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState icon="star" title="No ratings yet"
                  message="Patients can rate your visit once it is completed — their feedback will appear here." />
              </div>
            ) : myRatings.map(r => {
              const p = window.findPatient(r.patientId);
              // Review-page hierarchy: who rated leads, the comment follows.
              // "No comment left" as the row headline made empty states the
              // loudest thing on the page (repeated on every comment-less row)
              return (
                <div key={r.id} className="list-item">
                  <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0, marginTop: 2 }} aria-label={`${r.stars} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Icon key={n} name="star" size={14} className={n <= r.stars ? 'star-on' : 'star-off'} />
                    ))}
                  </span>
                  <div className="list-item-body">
                    <div className="list-item-title">
                      {p ? p.name : 'Patient'}
                      <span className="t-muted" style={{ fontWeight: 400 }}> · {formatDate(r.createdAt)}</span>
                    </div>
                    <div className="list-item-sub" style={r.comment ? { color: 'var(--text-secondary)', fontSize: 13 } : { fontStyle: 'italic' }}>
                      {r.comment || 'No comment left'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="t-help" style={{ padding: '10px 20px 16px', margin: 0 }}>
            Ratings come from patients with completed visits (one per visit). Seed entries are fictional demo data; your patients' ratings are added on top.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { DoctorDashboard, DoctorPatients, DoctorWeekView, DoctorFeedback });

export { DoctorDashboard, DoctorPatients, DoctorWeekView, DoctorFeedback };


