// Shared non-JSX helpers — doctor portal (split from screens-doctor.jsx)
import { useState, useEffect } from 'react';
import {
  Icon, navigate, useStore, AppShell, PageHeader,
  StatusBadge, DoctorStatusBadge, PatientAvatar, Modal, Field, TextArea, EmptyState, DoctorRatingPill,
} from '../shared/components.jsx';
import {
  findDoctor, formatDate, formatDateLong, formatDayRange, timeValue,
} from '../shared/data.js';

// Local (not UTC) YYYY-MM-DD so "today" matches the user's timezone
function localToday() {
  const n = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// The logged-in doctor's record (fallback keeps pages rendering if the
// doctor was removed from the directory)
function useDoctor() {
  const store = useStore();
  return (store.doctorSession && findDoctor(store.doctorSession.doctorId))
    || { id: '', name: 'Unknown doctor', specialty: '—', room: '—' };
}

// ---------- Doctor actions over the shared store ----------
// No-show: the doctor is the first to know a patient didn't arrive. Frees
// the slot (isSlotTaken only counts pending/confirmed) and flows through the
// admin queue and patient portal via the same status field.
function markNoShow(store, appt) {
  const p = window.findPatient(appt.patientId);
  store.setAppointments(store.appointments.map(x => x.id === appt.id ? { ...x, status: 'no-show' } : x));
  store.pushActivity((store.doctorSession || {}).name || 'Doctor', 'Marked no-show', p ? p.name : 'Patient');
  store.pushToast({ title: 'Marked as no-show', msg: `${p ? p.name : 'Patient'} did not arrive. The slot is freed for rebooking.` });
}

// Short name for the compact week-view chips ("Juan Miguel B." style)
function shortName(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

// §46.7: after inline validation fails, move focus to the first invalid
// field so keyboard and screen-reader users land straight on what needs
// fixing. The shared TextInput/TextArea/SelectInput carry an .error class
// whenever their error prop is set.
function focusFirstError() {
  const el = document.querySelector('.input.error, .textarea.error, .select.error');
  if (el) el.focus();
}

// Mon–Sun ISO dates of the current week (shared by the dashboard's summary
// count and the This week page)
function getWeekDays() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

export { localToday, useDoctor, markNoShow, shortName, getWeekDays, focusFirstError };
