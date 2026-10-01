// ============================================================
// MedicaCare — Runtime helpers + data placeholders
// ============================================================
// DATA SOURCE NOTE: the frontend no longer ships fictional demo data.
// Every list below starts EMPTY — the real records live in the database
// (database/schema.sql) and reach the app through the backend API
// (docs/BACKEND_ARCHITECTURE.md). The constants keep their export shapes so
// every screen renders its empty state instead of crashing while the
// frontend ↔ backend ↔ database wiring lands.

const HOSPITAL = {
  name: '',
  short: '',
  tagline: '',
  phone: '',
  address: '',
  email: '',
};
// Clinic identity — source of truth: clinic_info (DB), via the backend
// settings API. store.clinic hydrates these fields at runtime.

const SPECIALTIES = [];

const DOCTORS = [];

// Visit ratings — one per completed appointment, submitted from the patient
// portal. Starts empty: the history lives in the database (visit_ratings)
// and arrives through the backend. Displayed averages are computed at
// runtime and always paired with their review count.

const PATIENTS = [];

// Identity of the signed-in patient — placeholder only. Real values come
// from the backend session after login (no fictional demo identity).
const CURRENT_PATIENT = {
  id: null,
  name: '',
  email: '',
  phone: '',
  dob: '',
  gender: '',
  address: '',
  emergencyContact: '',
  bloodType: '—',
  allergies: 'None',
  photo: '',
};

// Identity of the signed-in staff/admin — placeholder only (backend session).
const CURRENT_ADMIN = {
  id: null,
  name: '',
  email: '',
  role: '',
  photo: '',
};


// Appointments — starts empty. Real bookings live in the database
// (appointments) and are loaded through the backend API; bookings made in
// this session stay in the store (localStorage) exactly as before.
const APPOINTMENTS = [];

// Booking availability — starts empty. The database
// (doctor_weekly_availability + fn_available_slots) is the real slot
// source via the backend.
const AVAILABILITY_TEMPLATE = {};

// helpers
function findDoctor(id) { return DOCTORS.find(d => d.id === id); }
function findPatient(id) {
  if (id === CURRENT_PATIENT.id) return { ...CURRENT_PATIENT };
  const seeded = PATIENTS.find(p => p.id === id);
  if (seeded) return seeded;
  // Registered accounts (persisted by the prototype auth flow in localStorage)
  try {
    const users = JSON.parse(localStorage.getItem('nmc.users')) || [];
    const u = users.find(x => x.id === id);
    if (u) {
      return { id: u.id, name: u.name, email: u.email, phone: u.phone, gender: '', age: null, joined: u.createdAt || null, lastVisit: null };
    }
  } catch { /* corrupted storage — fall through */ }
  return undefined;
}

// Numeric minutes for 'h:mm AM/PM' slot strings — plain string comparison
// sorts "10:30 AM" before "8:30 AM", which scrambles chronological order
function timeValue(t) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(t || ''));
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

// Whether the date falls on the doctor's admin-managed weekly clinic days.
// Doctors with no availability set keep the generic template (every clinic
// day bookable) so newly added doctors stay bookable out of the box.
function isClinicDay(doctorId, date) {
  const doc = findDoctor(doctorId);
  if (!doc || !Array.isArray(doc.avail) || !doc.avail.length) return true;
  const weekday = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  return doc.avail.includes(weekday);
}

// Slot availability = static template minus slots already occupied by an
// active (pending/confirmed) appointment for this doctor+date. Cancelled and
// completed visits free the slot again. excludeApptId keeps an appointment's
// own current slot selectable (used by reschedule).
function isSlotTaken(doctorId, date, time, appointments = [], excludeApptId = null) {
  return appointments.some(a =>
    a.id !== excludeApptId &&
    a.doctorId === doctorId && a.date === date && a.time === time &&
    (a.status === 'pending' || a.status === 'confirmed'));
}
function getSlotsFor(doctorId, date, appointments = [], excludeApptId = null) {
  // Dates outside the doctor's clinic days offer no bookable slots — the
  // weekly availability chips on the admin Doctors page are enforced here
  if (!isClinicDay(doctorId, date)) return [];
  const base = (AVAILABILITY_TEMPLATE[date] && AVAILABILITY_TEMPLATE[date].slots) || [];
  return base.map(([t, ok]) => [t, ok && !isSlotTaken(doctorId, date, t, appointments, excludeApptId)]);
}

// Slot-interval preference (admin Settings): '60' trims the 30-minute grid
// down to :00 slots; '15' and '30' show the full grid (base granularity is 30)
function slotFitsInterval(time, interval) {
  if (String(interval) !== '60') return true;
  return /:00 (AM|PM)$/.test(String(time));
}

// Trigger a client-side file download without any dependency (shared helper)
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// Escape a value for HTML — the single helper behind every printed/exported
// document builder (receipt, medical records, doctor schedule). Those
// documents interpolate user-controlled data (names, reasons, notes) into an
// iframe.srcdoc / .html-download sink, so quotes are escaped as well as
// <>&: the output stays safe in attribute contexts too, not just element text.
function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Uniform integer in [0, n) from the platform CSPRNG. Rejection sampling
// drops the tail of the 32-bit range a plain `x % n` would over-count
// (2^32 is not a multiple of an arbitrary n), so no value is favoured.
function randomInt(n) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  for (;;) {
    window.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateLong(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function initials(name) {
  if (!name) return '?';
  const parts = name.replace(/^Dr\.\s*/, '').split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0];
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Compact weekly-availability display for narrow table columns: consecutive
// days collapse into ranges — ['Mon','Tue','Wed','Thu','Fri'] → "Mon–Fri",
// ['Mon','Tue','Wed','Fri'] → "Mon–Wed, Fri". Keeps the Doctors table's
// Availability column on one line instead of a long comma list.
function formatDayRange(days) {
  if (!Array.isArray(days) || !days.length) return '—';
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const parts = [];
  let start = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const consecutive = i < sorted.length && order.indexOf(sorted[i]) === order.indexOf(sorted[i - 1]) + 1;
    if (!consecutive) {
      parts.push(start === i - 1 ? sorted[start] : `${sorted[start]}–${sorted[i - 1]}`);
      start = i;
    }
  }
  return parts.join(', ');
}
function statusMeta(s) {
  return ({
    pending:   { label: 'Pending',   cls: 'badge-warning' },
    confirmed: { label: 'Confirmed', cls: 'badge-info' },
    completed: { label: 'Completed', cls: 'badge-success' },
    cancelled: { label: 'Cancelled', cls: 'badge-neutral' },
    // Doctor-side action: the patient did not arrive (frees the slot like a
    // cancellation — see isSlotTaken — but is reported, not just dropped)
    'no-show': { label: 'No-show', cls: 'badge-error' },
  })[s] || { label: s, cls: 'badge-neutral' };
}
function doctorStatusMeta(s) {
  return ({
    available: { label: 'Available',    cls: 'badge-success' },
    busy:      { label: 'Busy today',   cls: 'badge-warning' },
    'on-leave':{ label: 'On leave',     cls: 'badge-neutral' },
  })[s] || { label: s, cls: 'badge-neutral' };
}

Object.assign(window, {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, formatDayRange, isClinicDay, timeValue,
});

export {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, formatDayRange, isClinicDay, timeValue,
  escapeHTML, randomInt,
};

