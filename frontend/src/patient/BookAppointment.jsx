// BookAppointment — patient (split from screens-patient.jsx)
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
import { BookingConfirmation } from './BookingConfirmation.jsx';
import { AppointmentStatus } from './AppointmentStatus.jsx';
import { AppointmentHistory } from './AppointmentHistory.jsx';
import { AppointmentDetails, RateVisitModal } from './AppointmentDetails.jsx';
import { Profile } from './Profile.jsx';
import { MedicalRecords } from './MedicalRecords.jsx';
import { PatientMessages } from './PatientMessages.jsx';
import { HelpSupport } from './HelpSupport.jsx';

// ---------- Book Appointment (form) ----------
function BookAppointment() {
  const store = useStore();
  const pending = store.pendingBooking;
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — centered circle spinner while "loading", same 600ms
  // pattern as the other patient pages
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setPageLoading(false), 600); return () => clearTimeout(t); }, []);
  const [form, setForm] = useState({
    doctorId: pending?.doctorId || '',
    date: pending?.date || '',
    time: pending?.time || '',
    reason: '',
    notes: '',
    contact: me.phone,
    isFirstVisit: 'yes',
    forWhom: 'self',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const doctor = form.doctorId ? window.findDoctor(form.doctorId) : null;
  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.doctorId) e.doctorId = 'Please select a doctor';
    if (!form.date) e.date = 'Please pick a date';
    if (!form.time) e.time = 'Please pick a time slot';
    if (!form.reason.trim()) e.reason = 'Please tell us the reason for your visit';
    else if (form.reason.trim().length < 10) e.reason = 'Please provide a bit more detail (10+ characters)';
    if (!form.contact.trim()) e.contact = 'Contact number is required';
    // Duplicate-booking guard: one active appointment per doctor+date+time
    if (!e.doctorId && !e.date && !e.time && isSlotTaken(form.doctorId, form.date, form.time, store.appointments)) {
      e.time = 'That slot has already been booked. Please pick a different date or time.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const id = 'ap' + Date.now();
      // Admin "Auto-confirm" preference drives the initial status — when on,
      // bookings skip the pending review queue entirely
      const status = (store.prefs && store.prefs.autoConfirm) ? 'confirmed' : 'pending';
      const newAppt = {
        id,
        patientId: me.id,
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason.trim(),
        status,
        createdAt: new Date().toISOString().slice(0, 10),
        // Proxy booking: who the visit is actually for (account owner or a
        // family member saved on the Profile page)
        bookedFor: form.forWhom === 'self' ? me.name : form.forWhom,
      };
      store.setAppointments([newAppt, ...store.appointments]);
      store.pushActivity(me.name, 'Booked appointment',
        `${doctor ? doctor.name : 'A doctor'} · ${window.formatDate(form.date)} at ${form.time}`);
      store.setLastBookingId(id);
      store.setPendingBooking(null);
      navigate('/patient/confirmation');
    }, 1200);
  };

  if (pageLoading) {
    return (
      <AppShell current="book">
        <div className="page"><PageSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell current="book">
      <div className="page">
        <PageHeader
          title="Book an appointment"
          subtitle="Review the details below and confirm your appointment."
          breadcrumbs={[
            { label: 'Home', to: '/patient/dashboard' },
            { label: 'Find a doctor', to: '/patient/doctors' },
            { label: 'Book appointment' },
          ]}
        />

        <div className="two-col">
          <form onSubmit={submit} noValidate>
            <div className="card">
              <div className="card-header"><h2 className="h-section">Appointment details</h2></div>
              <div className="card-body">
                <div className="stack lg">
                  <Field label="Doctor" required error={errors.doctorId}>
                    <SelectInput value={form.doctorId} onChange={e => {
                      const prev = form.doctorId;
                      update('doctorId', e.target.value);
                      // Switching doctors invalidates the previously chosen slot
                      if (e.target.value !== prev) setForm(f => ({ ...f, date: '', time: '' }));
                    }} error={errors.doctorId}>
                      <option value="">Select a doctor...</option>
                      {/* On-leave doctors are hidden here too so the dropdown
                          can't bypass the availability page's on-leave guard */}
                      {store.doctors.filter(d => d.status !== 'on-leave').map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Who is this visit for?" help="Book for yourself or a family member saved on your Profile page.">
                    <SelectInput value={form.forWhom} onChange={e => update('forWhom', e.target.value)}>
                      <option value="self">Myself ({me.name})</option>
                      {(store.familyMembers || []).map(f => (
                        <option key={f.id} value={f.name}>{f.name} ({f.relation})</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Date" required error={errors.date}>
                      <SelectInput value={form.date} onChange={e => {
                        const prev = form.date;
                        update('date', e.target.value);
                        // Changing dates invalidates the previously chosen time slot
                        if (e.target.value !== prev) setForm(f => ({ ...f, time: '' }));
                      }} error={errors.date}>
                        <option value="">Choose a date...</option>
                        {Object.keys(window.AVAILABILITY_TEMPLATE).map(d => {
                          const clinicDay = !form.doctorId || isClinicDay(form.doctorId, d);
                          return (
                            <option key={d} value={d}>
                              {window.formatDateLong(d)}{clinicDay ? '' : ' (not a clinic day)'}
                            </option>
                          );
                        })}
                      </SelectInput>
                    </Field>
                    <Field label="Time slot" required error={errors.time}>
                      <SelectInput value={form.time} onChange={e => update('time', e.target.value)} error={errors.time}>
                        <option value="">Choose a time...</option>
                        {getSlotsFor(form.doctorId, form.date, store.appointments)
                          .filter(s => s[1] && slotFitsInterval(s[0], (store.prefs || {}).slotInterval || '30'))
                          .map(([t]) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                      </SelectInput>
                    </Field>
                  </div>

                  <Field label="Reason for visit" required error={errors.reason}
                    help={!errors.reason && "Briefly describe your symptoms or reason. This helps the doctor prepare."}>
                    <TextArea
                      placeholder="e.g., Follow-up on blood pressure medication and ECG review"
                      value={form.reason}
                      onChange={e => update('reason', e.target.value)}
                      error={errors.reason}
                      maxLength={500}
                    />
                    <div className="t-help" style={{ textAlign: 'right', marginTop: -4 }}>{form.reason.length}/500</div>
                  </Field>

                  <Field label="Additional notes" help="Optional. Anything else the doctor should know.">
                    <TextArea placeholder="Any allergies, current medications, recent test results..."
                      value={form.notes} onChange={e => update('notes', e.target.value)} />
                  </Field>

                  <Field label="Contact number" required error={errors.contact}>
                    <TextInput icon="phone" type="tel" value={form.contact}
                      onChange={e => update('contact', e.target.value)} error={errors.contact} />
                  </Field>

                  <Field label="Is this your first visit with this doctor?">
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label className="radio"><input type="radio" name="fv" checked={form.isFirstVisit === 'yes'} onChange={() => update('isFirstVisit', 'yes')} /> Yes, first visit</label>
                      <label className="radio"><input type="radio" name="fv" checked={form.isFirstVisit === 'no'} onChange={() => update('isFirstVisit', 'no')} /> Follow-up</label>
                    </div>
                  </Field>
                </div>
              </div>
              <div className="card-footer">
                <button type="button" className="btn btn-ghost" onClick={() => navigate('/patient/doctors')}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}>
                  Confirm booking
                </button>
              </div>
            </div>
          </form>

          <div className="stack lg">
            <div className="card">
              <div className="card-header"><h2 className="h-section">Summary</h2></div>
              <div className="card-body">
                {doctor ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <DoctorAvatar doctor={doctor} size={44} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{doctor.name}</div>
                        <div className="t-muted" style={{ fontSize: 13 }}>{doctor.specialty}</div>
                      </div>
                    </div>
                    <div className="detail-list">
                      {/* Compact stacked rows: this card sits in the narrow 1fr
                          side column — the side-by-side label/value grid leaves
                          too little room for values like long dates (same
                          pattern as the other narrow side cards) */}
                      <div className="detail-row compact"><div className="label">Date</div><div className="value">{form.date ? window.formatDateLong(form.date) : '—'}</div></div>
                      <div className="detail-row compact"><div className="label">Time</div><div className="value">{form.time || '—'}</div></div>
                      <div className="detail-row compact"><div className="label">Location</div><div className="value">{doctor.room}</div></div>
                      <div className="detail-row compact"><div className="label">Consultation fee</div><div className="value">₱{doctor.fee.toLocaleString()}</div></div>
                    </div>
                  </>
                ) : (
                  <div className="t-muted" style={{ padding: '12px 0' }}>Select a doctor to see summary.</div>
                )}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--info-soft)', borderColor: 'var(--info-border)' }}>
              <div style={{ padding: 16, display: 'flex', gap: 12 }}>
                <Icon name="info" size={18} style={{ color: 'var(--info)', marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--info-text)', lineHeight: 1.6 }}>
                  {(store.prefs || {}).autoConfirm
                    ? 'Your appointment is confirmed instantly — no waiting for staff review. You can cancel free of charge any time before your visit.'
                    : 'Your appointment will be reviewed by our staff. Its status will update here in the portal. You can cancel free of charge any time before your visit.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export { BookAppointment };
