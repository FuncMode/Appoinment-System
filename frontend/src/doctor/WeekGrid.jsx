// WeekGrid — doctor portal (split from screens-doctor.jsx)
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
import { PatientHistoryModal } from './PatientHistoryModal.jsx';
import { VisitNotesModal } from './VisitNotesModal.jsx';
import { DoctorDashboard } from './DoctorDashboard.jsx';
import { DoctorPatients } from './DoctorPatients.jsx';
import { DoctorWeekView } from './DoctorWeekView.jsx';
import { DoctorFeedback } from './DoctorFeedback.jsx';

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
                  title={`${a.time} · ${p ? p.name : 'Patient'} · ${window.statusMeta(a.status).label}`}>
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

export { WeekGrid };
