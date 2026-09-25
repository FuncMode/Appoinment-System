// AppointmentsMgmt — admin (split from screens-admin.jsx)
import { useEffect, useState } from 'react';
import { AppShell, ConfirmModal, EmptyState, Field, Icon, Modal, PageHeader, Pagination, PatientAvatar, SelectInput, SortableTh, TextArea, useHashRoute, useStore } from '../shared/components.jsx';
import { CURRENT_ADMIN, findDoctor, findPatient, formatDate, statusMeta, timeValue } from '../shared/data.js';
import { downloadCSV, localToday } from './helpers.js';

import { AppointmentDetailsModal, AppointmentEditModal, AppointmentFormModal } from './AppointmentModals.jsx';

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

export { AppointmentsMgmt };
