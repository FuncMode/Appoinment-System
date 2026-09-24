// store.jsx — split from components.jsx (layered shared UI)
import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } from 'react';
import brandLogo from '../assets/brand_logo.png';
import './data.js';
import AnimatedContent from './reactbits/AnimatedContent.jsx';


// ---------- App-wide store (kept simple, in-memory + localStorage for appointments/role) ----------
const StoreCtx = createContext(null);

function useStore() { return useContext(StoreCtx); }

// Rename migration: accounts/identities saved before the MedicaCare rename
// still carry the old @northgate-medical.ph domain — remap them on load so
// demo logins and registered accounts keep working without clearing storage.
function migratedEmail(user) {
  return (user && typeof user.email === 'string' && user.email.endsWith('@northgate-medical.ph'))
    ? { ...user, email: user.email.replace('@northgate-medical.ph', '@medicacare.ph') }
    : user;
}

function StoreProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('nmc.role') || 'patient');
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem('nmc.appointments');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length) {
          // The apT* rows are date-bound to "today" (see data.js), so they are
          // regenerated on every load with the current date — the same way a
          // real clinic's daily schedule is rebuilt each day. Everything else
          // in storage (user bookings, older seed rows) is kept as-is.
          const seedById = new Map(window.APPOINTMENTS.map(a => [a.id, a]));
          const kept = list
            .filter(a => !String(a.id).startsWith('apT'))
            // Upgrade: seed appointments now carry doctor's notes (medical
            // records derive from them) — copy them into stored lists that
            // predate the notes field
            .map(a => {
              const seed = seedById.get(a.id);
              return (seed && seed.notes && !a.notes) ? { ...a, notes: seed.notes } : a;
            });
          const freshToday = window.APPOINTMENTS.filter(a => String(a.id).startsWith('apT'));
          return [...freshToday, ...kept];
        }
      }
      return window.APPOINTMENTS;
    } catch { return window.APPOINTMENTS; }
  });
  const [doctors, setDoctors] = useState(window.DOCTORS);
  const [patients, setPatients] = useState(window.PATIENTS);
  const [pendingBooking, setPendingBooking] = useState(null); // {doctorId, date, time}
  const [lastBookingId, setLastBookingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  // Registered accounts (prototype auth) — persisted so credentials survive reloads
  const [users, setUsers] = useState(() => {
    // Demo doctor portal account. Portal access is admin-issued (created from
    // the Admin console's Doctors page) and stored as user rows with
    // role 'doctor' + a doctorId link — DoctorLogin validates against this
    // list. This seeded row keeps the demo doctor login working out of the box.
    const demoDoctorUser = {
      id: 'udoctor',
      name: (window.findDoctor(window.DOCTOR_CREDENTIALS.doctorId) || {}).name || 'Doctor',
      email: window.DOCTOR_CREDENTIALS.email,
      password: window.DOCTOR_CREDENTIALS.password,
      role: 'doctor',
      doctorId: window.DOCTOR_CREDENTIALS.doctorId,
      createdAt: '2024-08-14',
    };
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.users'));
      if (Array.isArray(saved) && saved.length) {
        const list = saved.map(migratedEmail);
        // Migration: stored lists predate admin-issued doctor accounts —
        // inject the demo doctor account when missing so the demo login keeps
        // working. Skipped when the demo doctor was removed from the
        // directory, so a deleted doctor stays unloginnable.
        const hasDemoDoctor = list.some(u => u.role === 'doctor' && u.doctorId === window.DOCTOR_CREDENTIALS.doctorId);
        if (!hasDemoDoctor && window.findDoctor(window.DOCTOR_CREDENTIALS.doctorId)) {
          list.unshift(demoDoctorUser);
        }
        return list;
      }
    } catch { /* fall through to seed */ }
    // Seed: demo patient account (Login screen) + demo doctor account (Doctor portal)
    return [{
      id: window.CURRENT_PATIENT.id, name: window.CURRENT_PATIENT.name,
      email: 'patient@medicacare.ph', phone: window.CURRENT_PATIENT.phone,
      password: 'patient123', role: 'patient',
    }, demoDoctorUser];
  });
  // Identity of the logged-in patient (demo patient by default)
  const [currentPatient, setCurrentPatient] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.currentPatient'));
      if (saved && saved.id) {
        const m = migratedEmail(saved);
        // Photo backfill: profiles saved before the portrait pass carried no
        // photo — merge the seed portrait so the avatar matches the patient
        // registry instead of falling back to the initials circle
        if (!m.photo) {
          const seed = window.PATIENTS.find(p => p.id === m.id);
          if (seed && seed.photo) return { ...m, photo: seed.photo };
        }
        return m;
      }
    } catch { /* fall through */ }
    return window.CURRENT_PATIENT;
  });
  // Prototype auth sessions — separate flags for the patient portal and the
  // admin console so neither area can be reached without logging in first.
  // Client-side only in the prototype; a real backend must re-check every request.
  const [patientSession, setPatientSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nmc.patientSession')) || null; } catch { return null; }
  });
  const [adminSession, setAdminSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nmc.adminSession')) || null; } catch { return null; }
  });
  // Doctor portal session — doctors log in to see their own schedule and
  // write their own visit notes (attributed to them, not encoded by staff)
  const [doctorSession, setDoctorSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nmc.doctorSession')) || null; } catch { return null; }
  });
  // Visit ratings — one per completed appointment (submitted from the patient
  // portal), seeded with fictional demo feedback so the demo shows realistic
  // averages from day one. Persisted like appointments; once the logged-in
  // patient submits a real rating, the real list takes over permanently.
  const [ratings, setRatings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.ratings'));
      // An empty saved list means nothing real has been submitted yet — fall
      // back to the demo seed
      if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* fall through to seed */ }
    return window.SEED_RATINGS || [];
  });
  // Public testimonials — patient-submitted (portal), staff-moderated before
  // they appear on the public website. Seeded with two pending demo stories so
  // the admin moderation page has data; no seeded approved stories (the public
  // carousel keeps its labeled fictional fallback until real ones are approved).
  const [testimonials, setTestimonials] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.testimonials'));
      if (Array.isArray(saved) && saved.length) {
        // Migration: the approved demo story (tDemo3) was added to the seed
        // after earlier saves existed — inject it into already-stored lists
        // so the admin "Approved & shown publicly" section has demo data too
        if (!saved.some(t => t.id === 'tDemo3')) {
          const demoApproved = (window.SEED_TESTIMONIALS || []).filter(t => t.id === 'tDemo3');
          return [...demoApproved, ...saved];
        }
        return saved;
      }
    } catch { /* fall through to seed */ }
    return window.SEED_TESTIMONIALS || [];
  });

  // Clinic info + appointment preferences — persisted, and clinic info is
  // synced live to window.HOSPITAL so the public website reflects admin edits
  const [clinic, setClinic] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.clinic'));
      if (saved && saved.name) { Object.assign(window.HOSPITAL, saved); return saved; }
    } catch { /* fall through to seed */ }
    return { name: window.HOSPITAL.name, phone: window.HOSPITAL.phone, email: window.HOSPITAL.email, address: window.HOSPITAL.address };
  });
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.prefs'));
      if (saved) return saved;
    } catch { /* fall through to seed */ }
    return { emailNewAppointments: true, remindPatients: true, autoConfirm: false, slotInterval: '30' };
  });
  // Family members (proxy booking) — the patient can book appointments on
  // their behalf from the booking form; managed on the Profile page. Persisted.
  const [familyMembers, setFamilyMembers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.family'));
      if (Array.isArray(saved)) return saved;
    } catch { /* fall through to seed */ }
    return window.SEED_FAMILY || [];
  });
  // Support tickets — portal "Message the clinic" → admin "Patient messages"
  // page. Seeded with fictional demo tickets; persisted like appointments.
  // Support tickets — portal "Message the clinic" submissions that land on
  // the admin console's Patient messages page; persisted like appointments.
  // `thread` carries the conversation AFTER the first message (staff replies
  // + patient follow-ups, so the loop is two-way). Older saved tickets only
  // carry the legacy reply field — synthesized into a thread on load.
  const [tickets, setTickets] = useState(() => {
    const withThread = (t) => {
      if (t.thread || !t.reply) return t;
      return { ...t, thread: [{ id: t.id + '-s1', from: 'staff', text: t.reply, date: t.repliedAt || t.createdAt }] };
    };
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.tickets'));
      if (Array.isArray(saved) && saved.length) {
        // Migration: the demo tickets for the demo patient (tkt3/tkt4) were
        // added later so the portal side of the reply loop is demo-able.
        // Browsers with an older saved list would never see them, so merge
        // the p1 seeds in when the saved list has none for that patient.
        if (!saved.some(t => t.patientId === window.CURRENT_PATIENT.id)) {
          const p1Demos = (window.SEED_TICKETS || []).filter(t => t.patientId === window.CURRENT_PATIENT.id);
          if (p1Demos.length) return [...p1Demos, ...saved].map(withThread);
        }
        return saved.map(withThread);
      }
    } catch { /* fall through to seed */ }
    return (window.SEED_TICKETS || []).map(withThread);
  });
  // Lab results + medications — staff-encoded (Admin console → Patients →
  // Labs & medications) and shown on the patient's Medical Records page.
  // Seeded with fictional demo rows for the demo patient; persisted.
  const [labs, setLabs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.labs'));
      if (Array.isArray(saved)) return saved;
    } catch { /* fall through to seed */ }
    return window.SEED_LABS || [];
  });
  const [meds, setMeds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.meds'));
      if (Array.isArray(saved)) return saved;
    } catch { /* fall through to seed */ }
    return window.SEED_MEDICATIONS || [];
  });
  // Patient-side reminder preferences (Profile page → Notifications & reminders)
  const [patientPrefs, setPatientPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.patientPrefs'));
      if (saved) return saved;
    } catch { /* fall through to defaults */ }
    return { emailReminders: true, portalNotifs: true };
  });
  // Activity log — staff/doctor/portal actions surfaced on the admin Activity
  // page. Persisted; seeded with fictional demo entries until real actions
  // land (same pattern as ratings: an empty saved list falls back to seed)
  const [activity, setActivity] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.activity'));
      if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* fall through to seed */ }
    return (window.SEED_ACTIVITY || []).slice();
  });
  const pushActivity = useCallback((actor, action, detail) => {
    setActivity(prev => [
      { id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), actor, action, detail: detail || '', at: Date.now() },
      ...prev,
    ].slice(0, 20));
  }, []);

  useEffect(() => { localStorage.setItem('nmc.role', role); }, [role]);
  useEffect(() => { localStorage.setItem('nmc.appointments', JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem('nmc.users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('nmc.currentPatient', JSON.stringify(currentPatient)); }, [currentPatient]);
  useEffect(() => { localStorage.setItem('nmc.patientSession', JSON.stringify(patientSession)); }, [patientSession]);
  useEffect(() => { localStorage.setItem('nmc.adminSession', JSON.stringify(adminSession)); }, [adminSession]);
  useEffect(() => { localStorage.setItem('nmc.doctorSession', JSON.stringify(doctorSession)); }, [doctorSession]);
  useEffect(() => {
    Object.assign(window.HOSPITAL, clinic);
    try { localStorage.setItem('nmc.clinic', JSON.stringify(clinic)); } catch { /* private mode */ }
  }, [clinic]);
  useEffect(() => {
    try { localStorage.setItem('nmc.prefs', JSON.stringify(prefs)); } catch { /* private mode */ }
  }, [prefs]);
  useEffect(() => { localStorage.setItem('nmc.family', JSON.stringify(familyMembers)); }, [familyMembers]);
  useEffect(() => { localStorage.setItem('nmc.tickets', JSON.stringify(tickets)); }, [tickets]);
  useEffect(() => { localStorage.setItem('nmc.labs', JSON.stringify(labs)); }, [labs]);
  useEffect(() => { localStorage.setItem('nmc.meds', JSON.stringify(meds)); }, [meds]);
  useEffect(() => {
    try { localStorage.setItem('nmc.patientPrefs', JSON.stringify(patientPrefs)); } catch { /* private mode */ }
  }, [patientPrefs]);
  useEffect(() => {
    try { localStorage.setItem('nmc.activity', JSON.stringify(activity)); } catch { /* private mode */ }
  }, [activity]);
  useEffect(() => { localStorage.setItem('nmc.ratings', JSON.stringify(ratings)); }, [ratings]);
  useEffect(() => { localStorage.setItem('nmc.testimonials', JSON.stringify(testimonials)); }, [testimonials]);

  const pushToast = useCallback((t) => {
    const id = 'tst_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, kind: 'success', ...t }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), t.duration || 3800);
  }, []);
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(x => x.id !== id)), []);

  const loginPatient = useCallback((account) => {
    setPatientSession({ id: account.id, email: account.email, at: Date.now() });
  }, []);
  const logoutPatient = useCallback(() => {
    setPatientSession(null);
    // Reset to the seeded demo identity so the portal still renders after logout
    setCurrentPatient(window.CURRENT_PATIENT);
  }, []);
  const loginAdmin = useCallback((account) => {
    setAdminSession({ email: account.email, name: account.name, role: account.role, at: Date.now() });
  }, []);
  const logoutAdmin = useCallback(() => setAdminSession(null), []);
  const loginDoctor = useCallback((session) => setDoctorSession({ ...session, at: Date.now() }), []);
  const logoutDoctor = useCallback(() => setDoctorSession(null), []);

  const store = {
    role, setRole,
    appointments, setAppointments,
    ratings, setRatings,
    testimonials, setTestimonials,
    doctors, setDoctors,
    patients, setPatients,
    pendingBooking, setPendingBooking,
    lastBookingId, setLastBookingId,
    users, setUsers,
    currentPatient, setCurrentPatient,
    patientSession, loginPatient, logoutPatient,
    adminSession, loginAdmin, logoutAdmin,
    doctorSession, loginDoctor, logoutDoctor,
    clinic, setClinic,
    prefs, setPrefs,
    familyMembers, setFamilyMembers,
    tickets, setTickets,
    labs, setLabs, meds, setMeds,
    patientPrefs, setPatientPrefs,
    activity, pushActivity,
    pushToast, toasts, dismissToast,
  };
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}

export { StoreCtx, useStore, migratedEmail, StoreProvider };
