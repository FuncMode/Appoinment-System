// AppointmentModals — admin (split from screens-admin.jsx)
import { useEffect, useState } from 'react';
import { Field, Modal, SelectInput, StatusBadge, TextArea, useStore } from '../shared/components.jsx';
import { AVAILABILITY_TEMPLATE, CURRENT_ADMIN, findDoctor, findPatient, formatDate, getSlotsFor, isClinicDay, isSlotTaken, slotFitsInterval, statusMeta } from '../shared/data.js';

// ---------- Edit / reschedule appointment (staff) ----------
// Patients can reschedule from their portal; staff get the same here instead
// of the old delete-and-recreate (which lost the doctor's notes). Slots use
// the same live availability — booked slots are disabled and the appointment's
// own slot stays selectable.
function AppointmentEditModal({ appointment, onClose }) {
  const store = useStore();
  const [form, setForm] = useState({ doctorId: '', date: '', time: '', reason: '' });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (appointment) {
      setForm({ doctorId: appointment.doctorId, date: appointment.date, time: appointment.time, reason: appointment.reason });
      setErrors({});
    }
  }, [appointment]);
  if (!appointment) return null;

  const dates = Object.keys(AVAILABILITY_TEMPLATE);
  // An appointment may sit on a date outside the rolling template — keep it
  // selectable so staff can keep or move it
  if (appointment.date && !dates.includes(appointment.date)) dates.unshift(appointment.date);
  const interval = (store.prefs || {}).slotInterval || '30';
  const slotTimes = getSlotsFor(form.doctorId, form.date, store.appointments, appointment.id)
    .filter(([t, ok]) => ok && slotFitsInterval(t, interval))
    .map(([t]) => t);
  if (form.time && !slotTimes.includes(form.time)) slotTimes.unshift(form.time);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const submit = () => {
    const e = {};
    if (!form.doctorId) e.doctorId = 'Please select a doctor';
    if (!form.date) e.date = 'Please pick a date';
    if (!form.time) e.time = 'Please pick a time slot';
    if (!form.reason.trim()) e.reason = 'Reason for visit is required';
    if (!e.doctorId && !e.date && !e.time && isSlotTaken(form.doctorId, form.date, form.time, store.appointments, appointment.id)) {
      e.time = 'That slot is already booked for this doctor.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    store.setAppointments(store.appointments.map(a => a.id === appointment.id ? { ...a, ...form, reason: form.reason.trim() } : a));
    store.pushActivity(CURRENT_ADMIN.name, 'Updated appointment',
      `Ref ${appointment.id.toUpperCase()} → ${window.formatDate(form.date)} at ${form.time}`);
    store.pushToast({ title: 'Appointment updated', msg: `Ref ${appointment.id.toUpperCase()} moved to ${window.formatDate(form.date)} at ${form.time}.` });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit appointment"
      subtitle={`Ref ${appointment.id.toUpperCase()} · ${window.findPatient(appointment.patientId)?.name || 'Patient'}`}
      icon="pencil"
      size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Save changes</button>
      </>}
    >
      <div className="stack md">
        <Field label="Doctor" required error={errors.doctorId}>
          <SelectInput value={form.doctorId} onChange={e => {
            const prev = form.doctorId;
            set('doctorId', e.target.value);
            // Switching doctors invalidates the previously chosen slot
            if (e.target.value !== prev) setForm(f => ({ ...f, date: '', time: '' }));
          }} error={errors.doctorId}>
            <option value="">Select a doctor...</option>
            {store.doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
          </SelectInput>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date" required error={errors.date}>
            <SelectInput value={form.date} onChange={e => { set('date', e.target.value); setForm(f => ({ ...f, time: '' })); }} error={errors.date}>
              {dates.map(d => (
                <option key={d} value={d}>
                  {window.formatDate(d)}{AVAILABILITY_TEMPLATE[d] ? ` (${AVAILABILITY_TEMPLATE[d].day})` : ''}{form.doctorId && !isClinicDay(form.doctorId, d) ? ' — not a clinic day' : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Time slot" required error={errors.time} help={!errors.time && 'Already-booked slots are disabled.'}>
            <SelectInput value={form.time} onChange={e => set('time', e.target.value)} error={errors.time} disabled={!form.date}>
              <option value="">{form.date ? 'Select a time...' : 'Pick a date first'}</option>
              {slotTimes.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </Field>
        </div>
        <Field label="Reason for visit" required error={errors.reason}>
          <TextArea value={form.reason} onChange={e => set('reason', e.target.value)} error={errors.reason} maxLength={500} />
        </Field>
      </div>
    </Modal>
  );
}

function AppointmentFormModal({ open, onClose, onSave }) {
  const store = useStore();
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: '', time: '', reason: '' });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (open) {
      setForm({ patientId: '', doctorId: '', date: '', time: '', reason: '' });
      setErrors({});
    }
  }, [open]);

  const dates = Object.keys(AVAILABILITY_TEMPLATE);
  // Live availability — reflects slots already booked by patients or staff
  const interval = (store.prefs || {}).slotInterval || '30';
  const slots = getSlotsFor(form.doctorId, form.date, store.appointments)
    .filter(s => s[1]).map(([t]) => t).filter(t => slotFitsInterval(t, interval));
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const submit = () => {
    const e = {};
    if (!form.patientId) e.patientId = 'Please select a patient';
    if (!form.doctorId) e.doctorId = 'Please select a doctor';
    if (!form.date) e.date = 'Please pick a date';
    if (!form.time) e.time = 'Please pick a time slot';
    if (!form.reason.trim()) e.reason = 'Reason for visit is required';
    else if (form.reason.trim().length < 10) e.reason = 'Please provide a bit more detail (10+ characters)';
    // Duplicate-booking guard: one active appointment per doctor+date+time
    if (!e.patientId && !e.doctorId && !e.date && !e.time && isSlotTaken(form.doctorId, form.date, form.time, store.appointments)) {
      e.time = 'That slot is already booked for this doctor.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New appointment"
      subtitle="Book a consultation on behalf of a patient."
      size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>Create appointment</button>
      </>}
    >
      <div className="stack md">
        <Field label="Patient" required error={errors.patientId}>
          <SelectInput value={form.patientId} onChange={e => set('patientId', e.target.value)} error={errors.patientId}>
            <option value="">Select a patient...</option>
            {store.patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
          </SelectInput>
        </Field>
        <Field label="Doctor" required error={errors.doctorId}>
          <SelectInput value={form.doctorId} onChange={e => {
            const prev = form.doctorId;
            set('doctorId', e.target.value);
            // Switching doctors invalidates the previously chosen slot
            if (e.target.value !== prev) setForm(f => ({ ...f, date: '', time: '' }));
          }} error={errors.doctorId}>
            <option value="">Select a doctor...</option>
            {store.doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
          </SelectInput>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date" required error={errors.date}>
            <SelectInput value={form.date} onChange={e => { set('date', e.target.value); set('time', ''); }} error={errors.date}>
              <option value="">Select a date...</option>
              {dates.map(d => (
                <option key={d} value={d}>
                  {window.formatDate(d)} ({AVAILABILITY_TEMPLATE[d].day}){form.doctorId && !isClinicDay(form.doctorId, d) ? ' — not a clinic day' : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Time slot" required error={errors.time} help={!errors.time && 'Only available slots are listed.'}>
            <SelectInput value={form.time} onChange={e => set('time', e.target.value)} error={errors.time} disabled={!form.date}>
              <option value="">{form.date ? 'Select a time...' : 'Pick a date first'}</option>
              {slots.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </Field>
        </div>
        <Field label="Reason for visit" required error={errors.reason}>
          <TextArea
            placeholder="e.g., Follow-up on blood pressure medication"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            error={errors.reason}
            maxLength={500}
          />
        </Field>
      </div>
    </Modal>
  );
}

function AppointmentDetailsModal({ appointment, onClose }) {
  const appt = appointment;
  const doctor = appt ? window.findDoctor(appt.doctorId) : null;
  const patient = appt ? window.findPatient(appt.patientId) : null;
  return (
    <Modal
      open={!!appt}
      onClose={onClose}
      title={appt ? `Appointment ${appt.id.toUpperCase()}` : 'Appointment'}
      subtitle="Full appointment details."
      icon="calendar-days"
      size="md"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      {appt && (
        <div className="stack md">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={appt.status} />
            <span className="t-muted" style={{ fontSize: 12 }}>Created {window.formatDate(appt.createdAt)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="t-help">Patient</div>
              <div style={{ fontWeight: 600 }}>{patient ? patient.name : 'Unknown'}</div>
              <div className="t-muted" style={{ fontSize: 12.5 }}>{patient ? patient.phone : '—'}</div>
            </div>
            <div>
              <div className="t-help">Doctor</div>
              <div style={{ fontWeight: 600 }}>{doctor ? doctor.name : 'Unknown'}</div>
              <div className="t-muted" style={{ fontSize: 12.5 }}>{doctor ? `${doctor.specialty} · ${doctor.room}` : '—'}</div>
            </div>
            <div>
              <div className="t-help">Date & time</div>
              <div style={{ fontWeight: 600 }}>{window.formatDate(appt.date)} · {appt.time}</div>
            </div>
            <div>
              <div className="t-help">Status</div>
              <div style={{ fontWeight: 600 }}>{window.statusMeta(appt.status).label}</div>
            </div>
          </div>
          <div>
            <div className="t-help">Reason for visit</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{appt.reason}</div>
          </div>
          {appt.notes && (
            <div>
              <div className="t-help">Doctor's notes</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{appt.notes}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export { AppointmentEditModal, AppointmentFormModal, AppointmentDetailsModal };
