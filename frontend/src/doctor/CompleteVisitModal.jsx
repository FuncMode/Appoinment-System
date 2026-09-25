// CompleteVisitModal — doctor portal (split from screens-doctor.jsx)
import { useEffect, useState } from 'react';
import { Field, Modal, TextArea, useStore } from '../shared/components.jsx';
import { formatDate } from '../shared/data.js';

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
      title="Complete visit"
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
        help="You write these yourself. They are attributed to you and saved to the patient's medical records in their portal."
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

export { CompleteVisitModal };
