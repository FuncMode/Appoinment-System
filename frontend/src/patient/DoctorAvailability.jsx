// DoctorAvailability — patient (split from screens-patient.jsx)
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
import { BookAppointment } from './BookAppointment.jsx';
import { BookingConfirmation } from './BookingConfirmation.jsx';
import { AppointmentStatus } from './AppointmentStatus.jsx';
import { AppointmentHistory } from './AppointmentHistory.jsx';
import { AppointmentDetails, RateVisitModal } from './AppointmentDetails.jsx';
import { Profile } from './Profile.jsx';
import { MedicalRecords } from './MedicalRecords.jsx';
import { PatientMessages } from './PatientMessages.jsx';
import { HelpSupport } from './HelpSupport.jsx';

// ---------- Doctor Availability ----------
function DoctorAvailability({ doctorId }) {
  const store = useStore();
  const doctor = window.findDoctor(doctorId);
  const dates = Object.keys(window.AVAILABILITY_TEMPLATE);
  // Default to the first date that falls on the doctor's clinic days
  const [date, setDate] = useState(() => dates.find(d => isClinicDay(doctorId, d)) || dates[0]);
  const [slot, setSlot] = useState(null);

  if (!doctor) {
    return (
      <AppShell current="doctors">
        <div className="page"><ErrorState title="Doctor not found" message="This doctor may have moved or been removed." onRetry={() => navigate('/patient/doctors')} /></div>
      </AppShell>
    );
  }

  // On-leave doctors are not bookable — the list pages disable the Book
  // button; this guards the same flow against a typed deep link
  if (doctor.status === 'on-leave') {
    return (
      <AppShell current="doctors">
        <div className="page">
          <ErrorState
            title="This doctor is on leave"
            message={`${doctor.name} is not accepting bookings right now. Browse other specialists and check back when they return.`}
            onRetry={() => navigate('/patient/doctors')}
          />
        </div>
      </AppShell>
    );
  }

  const interval = (store.prefs || {}).slotInterval || '30';
  const slots = getSlotsFor(doctor.id, date, store.appointments).filter(([t]) => slotFitsInterval(t, interval));

  const cont = () => {
    if (!slot) return;
    store.setPendingBooking({ doctorId: doctor.id, date, time: slot });
    navigate('/patient/book');
  };

  return (
    <AppShell current="doctors">
      <div className="page">
        <PageHeader
          title={doctor.name}
          subtitle={`${doctor.specialty} · ${doctor.room}`}
          breadcrumbs={[
            { label: 'Home', to: '/patient/dashboard' },
            { label: 'Find a doctor', to: '/patient/doctors' },
            { label: 'Availability' },
          ]}
          actions={<button className="btn btn-ghost" onClick={() => navigate('/patient/doctors')}><Icon name="arrow-left" size={14} /> Back</button>}
        />

        <div className="two-col">
          <div className="stack lg">
            <div className="card">
              <div className="card-header">
                <h2 className="h-section">Select a date</h2>
                <span className="t-muted" style={{ fontSize: 12 }}>Available in the coming days</span>
              </div>
              <div className="date-chip-row">
                {dates.map(d => {
                  const dt = new Date(d + 'T00:00:00');
                  const on = d === date;
                  const clinicDay = isClinicDay(doctorId, d);
                  return (
                    <button key={d} disabled={!clinicDay} title={clinicDay ? undefined : 'Not a clinic day'}
                      onClick={() => { setDate(d); setSlot(null); }}
                      className="chip date-chip"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '10px 14px', borderRadius: 8,
                        background: on ? 'var(--primary)' : clinicDay ? 'var(--surface)' : 'var(--surface-muted)',
                        color: on ? '#fff' : clinicDay ? 'var(--text-secondary)' : 'var(--text-subtle)',
                        borderColor: on ? 'var(--primary)' : 'var(--border-strong)',
                      }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                        {dt.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{dt.getDate()}</span>
                      <span style={{ fontSize: 10, fontWeight: 500 }}>{dt.toLocaleDateString('en-US', { month: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="h-section">Available time slots</h2>
                <span className="t-muted" style={{ fontSize: 12 }}>{window.formatDateLong(date)}</span>
              </div>
              <div style={{ padding: 20 }}>
                {slots.length === 0 ? (
                  <p className="t-muted" style={{ margin: 0 }}>
                    No bookable slots on this date. It falls outside the doctor's clinic days, so please pick another date.
                  </p>
                ) : (
                  <>
                    <div className="chip-group">
                      {slots.map(([t, ok]) => (
                        <button key={t} className={'chip' + (slot === t ? ' on' : '')}
                          disabled={!ok}
                          onClick={() => setSlot(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border-strong)' }} /> Available</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--surface-muted)' }} /> Booked</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--primary)' }} /> Selected</div>
                    </div>
                  </>
                )}
              </div>
              <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate('/patient/doctors')}>Cancel</button>
                <button className="btn btn-primary" disabled={!slot} onClick={cont}>
                  Continue
                </button>
              </div>
            </div>
          </div>

          <div className="stack lg">
            <div className="card">
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <DoctorAvatar doctor={doctor} size={56} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{doctor.name}</div>
                    <div className="t-muted">{doctor.specialty}</div>
                  </div>
                </div>
                <DoctorStatusBadge status={doctor.status} />
                <div className="divider" />
                {/* Stacked label/value rows (detail-row compact): this card sits in
                    the narrow 1fr side column — the fixed 180px label column of the
                    default detail-row leaves too little room for values like
                    "Outpatient • Rm 120" or the rating pill, so they wrapped onto a
                    second line. Compact gives each value the full card width on one
                    line (same pattern as the Book Appointment summary card). */}
                <div className="detail-list">
                  <div className="detail-row compact"><div className="label">Consultation fee</div><div className="value">₱{doctor.fee.toLocaleString()}</div></div>
                  <div className="detail-row compact"><div className="label">Experience</div><div className="value">{doctor.exp} years</div></div>
                  <div className="detail-row compact"><div className="label">Rating</div><div className="value"><DoctorRatingPill ratings={store.ratings} doctorId={doctor.id} /></div></div>
                  <div className="detail-row compact"><div className="label">Room</div><div className="value">{doctor.room}</div></div>
                  <div className="detail-row compact"><div className="label">Consultation length</div><div className="value">30 minutes</div></div>
                </div>
              </div>
            </div>

            {/* Honesty label: portraits are placeholders; ratings are real
                completed-visit feedback (updated audit-002 #10/#11 policy) */}
            <p className="t-muted" style={{ fontSize: 12.5 }}>
              Photos are sample placeholder portraits, not real staff portraits. Ratings shown are prototype demo data.
            </p>

            {slot && (
              <div className="card" style={{ background: 'var(--primary-soft)', borderColor: '#DBEAFE' }}>
                <div style={{ padding: 16 }}>
                  <div className="t-help" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>Your selection</div>
                  <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><Icon name="calendar" size={14} /> {window.formatDateLong(date)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><Icon name="clock" size={14} /> {slot}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export { DoctorAvailability };
