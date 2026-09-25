// DoctorPatients — doctor portal (split from screens-doctor.jsx)
import { useEffect, useState } from 'react';
import { AppShell, EmptyState, Icon, navigate, PageHeader, PatientAvatar, StatusBadge, useStore } from '../shared/components.jsx';
import { formatDate, timeValue } from '../shared/data.js';
import { localToday, markNoShow, useDoctor } from './helpers.js';
import { CompleteVisitModal } from './CompleteVisitModal.jsx';

import { PatientHistoryModal } from './PatientHistoryModal.jsx';
import { VisitNotesModal } from './VisitNotesModal.jsx';

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

export { DoctorPatients };
