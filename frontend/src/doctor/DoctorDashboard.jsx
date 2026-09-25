// DoctorDashboard — doctor portal (split from screens-doctor.jsx)
import { useEffect, useState } from 'react';
import { AppShell, DoctorStatusBadge, EmptyState, Icon, navigate, PageHeader, PatientAvatar, StatusBadge, useStore } from '../shared/components.jsx';
import { formatDate, formatDateLong, formatDayRange, timeValue } from '../shared/data.js';
import { localToday, markNoShow, useDoctor } from './helpers.js';
import { CompleteVisitModal } from './CompleteVisitModal.jsx';

import { PatientHistoryModal } from './PatientHistoryModal.jsx';
import { VisitNotesModal } from './VisitNotesModal.jsx';

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
                <EmptyState icon="calendar-check" title="No appointments today" message="Your schedule is clear. Enjoy the breather." />
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

export { DoctorDashboard };
