// AppointmentDetails — patient (split from screens-patient.jsx)
import { useEffect, useState } from 'react';
import { AppShell, ConfirmModal, DoctorAvatar, ErrorState, Field, Icon, Modal, navigate, PageHeader, PatientAvatar, SelectInput, StatusBadge, TextArea, useStore } from '../shared/components.jsx';
import { AVAILABILITY_TEMPLATE, CURRENT_PATIENT, downloadFile, findDoctor, formatDate, formatDateLong, getSlotsFor } from '../shared/data.js';

import { buildICS, buildReceipt } from './helpers.js';

// ---------- Appointment Details ----------
function AppointmentDetails({ apptId }) {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  const appt = store.appointments.find(a => a.id === apptId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  // Reschedule state — hooks stay above the not-found early return.
  // Default the date picker to the appointment's date when it's in the template,
  // otherwise fall back to the first available date.
  const [reschedOpen, setReschedOpen] = useState(false);
  const [resDate, setResDate] = useState(
    appt
      ? (window.AVAILABILITY_TEMPLATE[appt.date] ? appt.date : (Object.keys(window.AVAILABILITY_TEMPLATE)[0] || ''))
      : ''
  );
  const [resSlot, setResSlot] = useState(appt ? appt.time : null);
  const [resLoading, setResLoading] = useState(false);
  // Rate-your-visit modal state (completed appointments only)
  const [rateOpen, setRateOpen] = useState(false);

  if (!appt) {
    return (
      <AppShell current="history">
        <div className="page"><ErrorState title="Appointment not found" message="This appointment may have been removed." onRetry={() => navigate('/patient/history')} /></div>
      </AppShell>
    );
  }
  // Fallback keeps the page rendering if this doctor was removed in the admin console
  const doctor = window.findDoctor(appt.doctorId) || { name: 'Unknown doctor', specialty: '—', room: '—', fee: 0 };
  const cancellable = appt.status === 'pending' || appt.status === 'confirmed';
  // This patient's rating for this visit, if already submitted
  const myRating = store.ratings.find(r => r.appointmentId === appt.id);
  // Own current slot stays selectable while rescheduling
  const resSlots = getSlotsFor(appt.doctorId, resDate, store.appointments, appt.id);

  const doReschedule = () => {
    setResLoading(true);
    setTimeout(() => {
      store.setAppointments(store.appointments.map(a => a.id === appt.id ? { ...a, date: resDate, time: resSlot } : a));
      setResLoading(false);
      setReschedOpen(false);
      store.pushToast({ title: 'Appointment rescheduled', msg: `Moved to ${window.formatDate(resDate)} at ${resSlot}.` });
    }, 700);
  };

  const doCancel = () => {
    setCancelLoading(true);
    setTimeout(() => {
      store.setAppointments(store.appointments.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
      setCancelLoading(false);
      setConfirmCancel(false);
      store.pushToast({ title: 'Appointment cancelled', msg: 'Your appointment has been cancelled successfully.' });
      navigate('/patient/history');
    }, 700);
  };

  const addToCalendar = () => {
    downloadFile(`medicacare-appointment-${appt.id}.ics`, buildICS(appt, doctor), 'text/calendar;charset=utf-8');
    store.pushToast({ title: 'Calendar file downloaded', msg: 'Open the .ics file to add this appointment to your calendar.' });
  };

  const downloadReceipt = () => {
    downloadFile(`medicacare-receipt-${appt.id}.html`, buildReceipt(appt, doctor, me), 'text/html;charset=utf-8');
    store.pushToast({ title: 'Receipt downloaded', msg: 'Open the file to view or print your receipt.' });
  };

  return (
    <AppShell current="history">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title="Appointment details"
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Appointments', to: '/patient/history' }, { label: 'Details' }]}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => navigate('/patient/history')}><Icon name="arrow-left" size={14} /> Back</button>
              {cancellable && <button className="btn btn-danger" onClick={() => setConfirmCancel(true)}><Icon name="x" size={14} /> Cancel appointment</button>}
            </>
          }
        />

        <div className="two-col">
          <div className="card">
            <div className="card-body">
              <div className="appt-head">
                <DoctorAvatar doctor={doctor} size={56} />
                <div className="appt-head-info">
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{doctor.name}</div>
                  <div className="t-muted">{doctor.specialty}</div>
                </div>
                <div className="appt-head-status">
                  <StatusBadge status={appt.status} />
                </div>
              </div>
              <div className="divider" />
              <div className="detail-list">
                <div className="detail-row"><div className="label">Reference number</div><div className="value t-mono">{appt.id.toUpperCase()}</div></div>
                <div className="detail-row"><div className="label">Booked for</div><div className="value">{appt.bookedFor || me.name}</div></div>
                <div className="detail-row"><div className="label">Date</div><div className="value">{window.formatDateLong(appt.date)}</div></div>
                <div className="detail-row"><div className="label">Time</div><div className="value">{appt.time}</div></div>
                <div className="detail-row"><div className="label">Location</div><div className="value">{doctor.room} · MedicaCare</div></div>
                <div className="detail-row"><div className="label">Consultation fee</div><div className="value">₱{doctor.fee.toLocaleString()}</div></div>
                <div className="detail-row"><div className="label">Booked on</div><div className="value">{window.formatDate(appt.createdAt || appt.date)}</div></div>
                <div className="detail-row"><div className="label">Reason for visit</div><div className="value">{appt.reason}</div></div>
                {appt.contact && <div className="detail-row"><div className="label">Contact number</div><div className="value">{appt.contact}</div></div>}
                {appt.additionalNotes && <div className="detail-row"><div className="label">Additional notes</div><div className="value">{appt.additionalNotes}</div></div>}
              </div>
            </div>
          </div>

          <div className="stack lg">
            <div className="card">
              <div className="card-header"><h3 className="h-card">Patient</h3></div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <PatientAvatar person={me} size={44} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{me.name}</div>
                    <div className="t-muted" style={{ fontSize: 12 }}>{me.email}</div>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row compact"><div className="label">Phone</div><div className="value">{me.phone}</div></div>
                  <div className="detail-row compact"><div className="label">Blood type</div><div className="value">{me.bloodType}</div></div>
                  <div className="detail-row compact"><div className="label">Allergies</div><div className="value">{me.allergies}</div></div>
                </div>
              </div>
            </div>

            {appt.status === 'completed' && (
              <div className="card">
                <div className="card-header"><h3 className="h-card">Your feedback</h3></div>
                <div className="card-body stack md">
                  {myRating ? (
                    <>
                      <span className="rating-cell" style={{ fontSize: 14 }}>
                        <Icon name="star" size={16} style={{ color: 'var(--rating-star)' }} />
                        <strong>{myRating.stars}</strong> / 5
                      </span>
                      {myRating.comment && <p className="t-muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.55 }}>{myRating.comment}</p>}
                      <div className="t-help">Submitted {window.formatDate(myRating.createdAt)}</div>
                    </>
                  ) : (
                    <>
                      <p className="t-muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.55 }}>
                        How was your visit with {doctor.name}? Your rating is shown together with the total number of reviews and is never used to rank doctors.
                      </p>
                      <button className="btn btn-primary block" onClick={() => setRateOpen(true)}><Icon name="star" size={14} /> Rate your visit</button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><h3 className="h-card">Actions</h3></div>
              <div className="card-body stack md">
                <button className="btn btn-secondary block" onClick={downloadReceipt}><Icon name="download" size={14} /> Download receipt</button>
                <button className="btn btn-secondary block" onClick={addToCalendar}><Icon name="calendar" size={14} /> Add to calendar</button>
                <button className="btn btn-secondary block" onClick={() => navigate('/patient/status')}><Icon name="activity" size={14} /> View status timeline</button>
                {cancellable && <button className="btn btn-secondary block" onClick={() => setReschedOpen(true)}><Icon name="calendar-clock" size={14} /> Reschedule appointment</button>}
                {cancellable && <button className="btn btn-danger-outline block" onClick={() => setConfirmCancel(true)}><Icon name="x" size={14} /> Cancel appointment</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={reschedOpen}
        onClose={() => setReschedOpen(false)}
        title="Reschedule appointment"
        subtitle={`${doctor.name} · currently ${window.formatDate(appt.date)} at ${appt.time}`}
        icon="calendar-clock"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setReschedOpen(false)} disabled={resLoading}>Close</button>
            <button
              className={`btn btn-primary ${resLoading ? 'btn-loading' : ''}`}
              disabled={!resSlot || (resDate === appt.date && resSlot === appt.time)}
              onClick={doReschedule}
            >
              Save new schedule
            </button>
          </>
        }
      >
        <Field label="New date" required>
          <SelectInput value={resDate} onChange={e => { setResDate(e.target.value); setResSlot(null); }}>
            {Object.keys(window.AVAILABILITY_TEMPLATE).map(d => (
              <option key={d} value={d}>{window.formatDateLong(d)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Available time slots" required help="Slots already booked are disabled.">
          <div className="chip-group">
            {resSlots.map(([t, ok]) => (
              <button key={t} type="button" className={'chip' + (resSlot === t ? ' on' : '')} disabled={!ok} onClick={() => setResSlot(t)}>
                {t}
              </button>
            ))}
          </div>
        </Field>
      </Modal>

      <RateVisitModal open={rateOpen} appointment={appt} onClose={() => setRateOpen(false)} />

      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        loading={cancelLoading}
        title="Cancel this appointment?"
        message={`${doctor.name} on ${window.formatDate(appt.date)} at ${appt.time}. This action cannot be undone.`}
        confirmLabel="Yes, cancel it"
        kind="danger"
      />
    </AppShell>
  );
}

// ---------- Rate your visit (Option B) ----------
// Reachable only for completed appointments; one rating per appointment is
// enforced in the UI (the action is hidden once rated) and re-checked on
// submit. Stored in store.ratings and surfaced everywhere a doctor's rating is
// displayed, always together with the review count.
function RateVisitModal({ open, appointment, onClose }) {
  const store = useStore();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setStars(0); setComment(''); setError(''); } }, [open]);

  if (!appointment) return null;
  const doctor = window.findDoctor(appointment.doctorId);

  const submit = () => {
    if (!stars) { setError('Please choose a star rating.'); return; }
    // One rating per appointment — re-check even though the UI already hides
    // the action once rated
    if (store.ratings.some(r => r.appointmentId === appointment.id)) { onClose(); return; }
    store.setRatings([
      ...store.ratings,
      {
        id: 'r' + Date.now(),
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        stars,
        comment: comment.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    store.pushToast({ title: 'Thank you for your feedback', msg: `Your ${stars}-star rating for ${doctor ? doctor.name : 'this doctor'} has been recorded.` });
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title="Rate your visit"
      subtitle={doctor ? `${doctor.name} · ${window.formatDate(appointment.date)}` : ''}
      icon="star" iconKind="success"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Submit rating</button>
      </>}
    >
      <div className="stack md">
        <Field label="How was your visit?" required error={error}>
          <div className="rate-star-row">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n} type="button"
                className={'rate-star' + (n <= stars ? ' on' : '')}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={n <= stars}
                onClick={() => { setStars(n); setError(''); }}
              >
                <Icon name="star" size={26} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Comment" help="Optional. Share what went well or what could improve.">
          <TextArea
            rows={3}
            placeholder="Your feedback helps other patients and helps us improve."
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={300}
          />
        </Field>
        <p className="t-muted" style={{ fontSize: 12, margin: 0 }}>
          Ratings are displayed with the number of reviews. Only patients with a completed appointment can rate, once per visit.
        </p>
      </div>
    </Modal>
  );
}

export { AppointmentDetails, RateVisitModal };
