// VisitNotesModal — doctor portal (split from screens-doctor.jsx)
import { useState, useEffect } from 'react';
import {
  Icon, navigate, useStore, AppShell, PageHeader,
  StatusBadge, DoctorStatusBadge, PatientAvatar, Modal, Field, TextArea, EmptyState, DoctorRatingPill,
} from '../shared/components.jsx';
import {
  findDoctor, formatDate, formatDateLong, formatDayRange, timeValue,
} from '../shared/data.js';
import { localToday, useDoctor, markNoShow, shortName, getWeekDays } from './helpers.js';
import { CompleteVisitModal } from './CompleteVisitModal.jsx';
import { WeekGrid } from './WeekGrid.jsx';
import { PatientHistoryModal } from './PatientHistoryModal.jsx';
import { DoctorDashboard } from './DoctorDashboard.jsx';
import { DoctorPatients } from './DoctorPatients.jsx';
import { DoctorWeekView } from './DoctorWeekView.jsx';
import { DoctorFeedback } from './DoctorFeedback.jsx';

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

export { VisitNotesModal };
