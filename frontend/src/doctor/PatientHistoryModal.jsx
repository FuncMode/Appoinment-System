// PatientHistoryModal — doctor portal (split from screens-doctor.jsx)
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
import { VisitNotesModal } from './VisitNotesModal.jsx';
import { DoctorDashboard } from './DoctorDashboard.jsx';
import { DoctorPatients } from './DoctorPatients.jsx';
import { DoctorWeekView } from './DoctorWeekView.jsx';
import { DoctorFeedback } from './DoctorFeedback.jsx';

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

export { PatientHistoryModal };
