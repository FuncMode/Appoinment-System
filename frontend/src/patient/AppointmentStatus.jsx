// AppointmentStatus — patient (split from screens-patient.jsx)
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, SortableTh, PageSpinner, EmptyState, ErrorState, ConfirmModal, MiniBarChart, DoctorRatingPill, PwField,
} from '../shared/components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, isClinicDay, timeValue,
} from '../shared/data.js';
import { CARE_GUIDE } from '../public/screens-public.jsx';
import { activateOnKey, toICSStamp, buildICS, buildReceipt, localToday, buildRecordsHTML } from './helpers.js';
import { PatientDashboard } from './PatientDashboard.jsx';
import { MOBILE_DOCTOR_QUERY, MOBILE_DOCTOR_PAGE_SIZE, DoctorListing } from './DoctorListing.jsx';
import { DoctorAvailability } from './DoctorAvailability.jsx';
import { BookAppointment } from './BookAppointment.jsx';
import { BookingConfirmation } from './BookingConfirmation.jsx';
import { AppointmentHistory } from './AppointmentHistory.jsx';
import { AppointmentDetails, RateVisitModal } from './AppointmentDetails.jsx';
import { Profile } from './Profile.jsx';
import { MedicalRecords } from './MedicalRecords.jsx';
import { PatientMessages } from './PatientMessages.jsx';
import { HelpSupport } from './HelpSupport.jsx';

// ---------- Appointment Status ----------
function AppointmentStatus() {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — skeleton page while "loading", same 600ms pattern as the
  // other patient pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const active = store.appointments
    .filter(a => a.patientId === me.id && (a.status === 'pending' || a.status === 'confirmed'))
    .sort((a, b) => a.date.localeCompare(b.date) || timeValue(a.time) - timeValue(b.time));

  const appt = active[0] || store.appointments.find(a => a.patientId === me.id);

  // Skeleton mirrors the real layout (header card + facts + timeline) so there
  // is no layout shift when the data lands; placed before the !appt early
  // return so the empty state never flashes during the loading window
  if (loading) {
    return (
      <AppShell current="dashboard">
        <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
          <PageHeader
            title="Appointment status"
            subtitle="Track your current appointment's progress."
            breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Status' }]}
            actions={<button className="btn btn-secondary" onClick={() => navigate('/patient/history')}>View history</button>}
          />

          <div className="card" style={{ marginBottom: 16 }} aria-hidden="true">
            <div className="card-body">
              <div className="appt-head">
                <span className="skel" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
                <div className="appt-head-info">
                  <span className="skel" style={{ width: 220, maxWidth: '100%', height: 16, display: 'block' }} />
                  <span className="skel" style={{ width: 260, maxWidth: '100%', height: 12, display: 'block', marginTop: 8 }} />
                </div>
                <div className="appt-head-status">
                  <span className="skel" style={{ width: 80, height: 20, display: 'block' }} />
                  <span className="skel" style={{ width: 110, height: 12, display: 'block', marginTop: 8 }} />
                </div>
              </div>
              <div className="divider" />
              <div className="appt-facts">
                {[0, 1, 2].map(i => (
                  <div key={i} className="appt-fact">
                    <span className="skel" style={{ width: 46, height: 11, display: 'block' }} />
                    <span className="skel" style={{ width: '70%', height: 15, display: 'block', marginTop: 7 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2 className="h-section">Progress timeline</h2></div>
              <div className="card-body" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                    <span className="skel" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span className="skel" style={{ width: '40%', height: 12, display: 'block' }} />
                      <span className="skel" style={{ width: '65%', height: 10, display: 'block', marginTop: 6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2 className="h-section">What to bring</h2></div>
              <div className="card-body" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="skel" style={{ width: `${60 + i * 8}%`, height: 12, display: 'block', marginBottom: 12 }} />
                ))}
                <span className="skel" style={{ width: '100%', height: 36, display: 'block', marginTop: 8 }} />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!appt) {
    return (
      <AppShell current="dashboard">
        <div className="page">
          <PageHeader title="Appointment status" breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Status' }]} />
          <div className="card"><EmptyState icon="calendar-x" title="No appointments yet" message="Book your first appointment to see status updates here."
            actions={<button className="btn btn-primary" onClick={() => navigate('/patient/book')}>Book appointment</button>} /></div>
        </div>
      </AppShell>
    );
  }

  // Fallback keeps the page rendering if this doctor was removed in the admin console
  const doctor = window.findDoctor(appt.doctorId) || { name: 'Unknown doctor', specialty: '—', room: '—' };
  const steps = [
    { label: 'Booked',    sub: `Request submitted · ${window.formatDate(appt.createdAt || appt.date)}`, done: true, active: false },
    { label: 'Reviewed by staff', sub: appt.status === 'pending' ? 'Awaiting confirmation' : 'Confirmed', done: appt.status !== 'pending', active: appt.status === 'pending' },
    { label: 'Confirmed', sub: appt.status === 'confirmed' || appt.status === 'completed' ? 'Ready to visit' : 'Waiting', done: appt.status === 'confirmed' || appt.status === 'completed', active: appt.status === 'confirmed' },
    { label: 'Visit completed', sub: appt.status === 'completed' ? 'Doctor notes available in records' : 'After your visit', done: appt.status === 'completed', active: false },
  ];

  return (
    <AppShell current="dashboard">
      <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
        <PageHeader
          title="Appointment status"
          subtitle="Track your current appointment's progress."
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Status' }]}
          actions={<button className="btn btn-secondary" onClick={() => navigate('/patient/history')}>View history</button>}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div className="appt-head">
              <DoctorAvatar doctor={doctor} size={56} />
              <div className="appt-head-info">
                <div style={{ fontWeight: 600, fontSize: 16 }}>{doctor.name}</div>
                <div className="t-muted">{doctor.specialty} · {doctor.room}</div>
              </div>
              <div className="appt-head-status">
                <StatusBadge status={appt.status} />
                <div className="t-muted" style={{ fontSize: 13, marginTop: 6 }}>Ref # <span className="t-mono">{appt.id.toUpperCase()}</span></div>
              </div>
            </div>
            <div className="divider" />
            <div className="appt-facts">
              <div className="appt-fact">
                <div className="t-help">Date</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{window.formatDateLong(appt.date)}</div>
              </div>
              <div className="appt-fact">
                <div className="t-help">Time</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{appt.time}</div>
              </div>
              <div className="appt-fact">
                <div className="t-help">Fee</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>₱{doctor.fee.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header"><h2 className="h-section">Progress timeline</h2></div>
            <div className="card-body">
              <div className="timeline">
                {steps.map((s, i) => (
                  <div key={i} className="timeline-item">
                    <div className={'timeline-dot ' + (s.done ? 'done' : s.active ? 'active' : '')}>
                      {s.done ? <Icon name="check" size={12} /> : s.active ? <Icon name="clock" size={12} /> : null}
                    </div>
                    <div className="timeline-body">
                      <div className="timeline-title">{s.label}</div>
                      <div className="timeline-sub">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="h-section">What to bring</h2></div>
            <div className="card-body">
              <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
                <li>Valid ID with photo</li>
                <li>HMO card (if applicable)</li>
                <li>List of current medications</li>
                <li>Any prior lab or imaging results</li>
              </ul>
              <div className="divider" />
              <button className="btn btn-secondary block" onClick={() => navigate('/patient/appointment/' + appt.id)}>
                View full appointment details
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export { AppointmentStatus };
