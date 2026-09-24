// ============================================================
// Shared components — MedicaCare
// ============================================================
import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } from 'react';
import brandLogo from '../assets/brand_logo.png';
import './data.js';
import AnimatedContent from './reactbits/AnimatedContent.jsx';

// ---------- Icon (Lucide inline via <i data-lucide>) ----------
function Icon({ name, size = 16, style = {}, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { width: size, height: size, 'stroke-width': 2 }, nameAttr: 'data-lucide' });
    }
  }, [name, size]);
  return <span ref={ref} className={className} style={{ display: 'inline-flex', width: size, height: size, ...style }} />;
}

// ---------- Router (hash-based) ----------
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const onChange = () => {
      setRoute(window.location.hash.replace(/^#/, '') || '/');
      window.scrollTo(0, 0); // public pages are long — start from the top on navigation
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
function navigate(to) {
  window.location.hash = to;
  window.scrollTo(0, 0);
}

// ---------- Desktop-only gate (staff portals) ----------
// Live media-query hook — returns true when the viewport is wider than the
// app's 720px mobile breakpoint, updating on resize/rotation so the gate
// reacts live instead of only on load.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 721px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 721px)');
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

// Full-page fallback for the Admin console and Doctor portal on small
// screens: those consoles are dense tables/layouts built for desktop, so
// instead of a broken mobile squeeze the portals are gated entirely.
// App.jsx renders this in place of any /admin/* or /doctor/* route.
function DesktopOnlyNotice({ role = 'admin' }) {
  const label = role === 'doctor' ? 'The Doctor portal' : 'The Admin console';
  return (
    <div className="desktop-only" role="status">
      <BrandMark size={44} />
      <div className="desktop-only-icon">
        <Icon name="monitor" size={24} />
      </div>
      <h1>Desktop only</h1>
      <p>
        {label} is designed for desktop screens. Please open it on a computer,
        or widen your browser window to at least 720px.
      </p>
    </div>
  );
}

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

// ---------- Brand logo mark ----------
// Renders the MedicaCare logo inside the brand tile; falls back to the "M"
// letter when the image is missing or fails to load (e.g. offline demo).
function BrandMark({ className = 'sidebar-brand-mark', size, alt = 'MedicaCare logo' }) {
  const [failed, setFailed] = useState(false);
  // The blue tile is only shown behind the letter fallback — the logo image
  // itself renders as-is with no background behind it.
  const cls = failed ? `${className} brand-mark-fallback` : className;
  return (
    <div className={cls} style={size ? { width: size, height: size } : undefined}>
      {failed ? 'M' : <img src={brandLogo} alt={alt} onError={() => setFailed(true)} />}
    </div>
  );
}

// ---------- Sidebar & Topbar ----------
function Sidebar({ role, current }) {
  const store = useStore();
  const patientNav = [
    { id: 'dashboard',    label: 'Dashboard',     icon: 'layout-dashboard', route: '/patient/dashboard' },
    { id: 'doctors',      label: 'Find a doctor', icon: 'stethoscope',      route: '/patient/doctors' },
    { id: 'book',         label: 'Book appointment', icon: 'calendar-plus', route: '/patient/book' },
    { id: 'history',      label: 'My appointments', icon: 'calendar-check', route: '/patient/history' },
    { id: 'records',      label: 'Medical records', icon: 'file-text',     route: '/patient/records' },
  ];
  const patientNav2 = [
    { id: 'profile',      label: 'Profile',       icon: 'user-round',   route: '/patient/profile' },
    { id: 'messages',     label: 'My messages',   icon: 'inbox',        route: '/patient/messages' },
    { id: 'help',         label: 'Help & support',icon: 'life-buoy',    route: '/patient/help' },
  ];
  const adminNav = [
    { id: 'a-dashboard',  label: 'Dashboard',     icon: 'layout-dashboard', route: '/admin/dashboard' },
    // Live pending count from the store instead of a hardcoded number —
    // the badge always means something real (audit-002 #20)
    { id: 'appointments', label: 'Appointments',  icon: 'calendar-days',    route: '/admin/appointments',
      count: store.appointments.filter(a => a.status === 'pending').length },
    { id: 'patients',     label: 'Patients',      icon: 'users-round',      route: '/admin/patients' },
    { id: 'doctors',      label: 'Doctors',       icon: 'stethoscope',      route: '/admin/doctors' },
    // Live pending-story count — same "badge means real state" rule as the
    // appointments badge above
    { id: 'stories',      label: 'Patient stories', icon: 'message-square', route: '/admin/stories',
      count: store.testimonials.filter(t => t.status === 'pending').length },
    // Live open-message count — same "badge means real state" rule as the
    // other admin badges
    { id: 'tickets',      label: 'Patient messages', icon: 'inbox',      route: '/admin/tickets',
      count: (store.tickets || []).filter(t => t.status === 'open').length },
    { id: 'reports',      label: 'Reports',       icon: 'bar-chart-3',      route: '/admin/reports' },
    { id: 'a-activity',   label: 'Activity log',  icon: 'history',          route: '/admin/activity' },
  ];
  const adminNav2 = [
    { id: 'settings',     label: 'Settings',      icon: 'settings',    route: '/admin/settings' },
  ];
  // Doctor portal — doctors see only their own schedule and patients.
  // Live badge: today's appointment count — same "badge means real state"
  // rule as the admin console, so the sidebar isn't a dead two-item list.
  const dNow = new Date();
  const dToday = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}-${String(dNow.getDate()).padStart(2, '0')}`;
  const doctorNav = [
    { id: 'd-dashboard',  label: "Today's schedule", icon: 'calendar-check', route: '/doctor/dashboard',
      count: store.appointments.filter(a => a.doctorId === ((store.doctorSession || {}).doctorId) && a.date === dToday).length },
    { id: 'd-week',       label: 'This week',        icon: 'calendar-days',  route: '/doctor/week' },
    { id: 'd-patients',   label: 'My patients',      icon: 'users-round',    route: '/doctor/patients' },
    { id: 'd-feedback',   label: 'Patient feedback', icon: 'star',           route: '/doctor/feedback' },
  ];

  let primary, secondary;
  if (role === 'admin') { primary = adminNav; secondary = adminNav2; }
  else if (role === 'doctor') { primary = doctorNav; secondary = []; }
  else { primary = patientNav; secondary = patientNav2; }

  const doctorRec = role === 'doctor'
    ? window.findDoctor(store.doctorSession && store.doctorSession.doctorId)
    : null;
  const me = role === 'admin'
    ? window.CURRENT_ADMIN
    : role === 'doctor'
      ? (doctorRec || { name: 'Doctor', specialty: '—' })
      : (store.currentPatient || window.CURRENT_PATIENT);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandMark />
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">MedicaCare</div>
          <div className="sidebar-brand-sub">{role === 'admin' ? 'Admin console' : role === 'doctor' ? 'Doctor portal' : 'Patient portal'}</div>
        </div>
      </div>
      <div className="sidebar-nav">
        <div className="sidebar-nav-label">Main</div>
        {primary.map(item => (
          // Real <button> (audit-002 #1): puts the nav in the Tab order and
          // gives Enter/Space activation for free; the .sidebar-item CSS
          // reset keeps the visuals identical to the old clickable div
          <button key={item.id} type="button"
               className={'sidebar-item' + (current === item.id ? ' active' : '')}
               onClick={() => navigate(item.route)}>
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
            {item.count != null && <span className="badge-count">{item.count}</span>}
          </button>
        ))}
        {secondary.length > 0 && (
          <Fragment>
            <div className="sidebar-nav-label">Account</div>
            {secondary.map(item => (
              <button key={item.id} type="button"
                   className={'sidebar-item' + (current === item.id ? ' active' : '')}
                   onClick={() => navigate(item.route)}>
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </Fragment>
        )}
      </div>
      <div className="sidebar-footer">
        {/* Admin card matches the portal: photo avatar with initials fallback
            (same behavior as PatientAvatar/DoctorAvatar) instead of a bare
            initials circle */}
        <PatientAvatar person={me} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={me.name}>{me.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{role === 'admin' ? me.role : role === 'doctor' ? me.specialty : 'Patient'}</div>
        </div>
        <button className="btn-icon" title="Log out" aria-label="Log out" onClick={() => {
          // Clear the session for the active console, then bounce to its own login
          if (role === 'admin') { store.logoutAdmin(); navigate('/admin/login'); }
          else if (role === 'doctor') { store.logoutDoctor(); navigate('/doctor/login'); }
          else { store.logoutPatient(); navigate('/login'); }
        }}>
          <Icon name="log-out" size={16} />
        </button>
      </div>
    </aside>
  );
}

function Topbar({ onMenuClick }) {
  const store = useStore();
  const route = useHashRoute();
  const [notifOpen, setNotifOpen] = useState(false);
  // Read state persists per appointment id (localStorage), so "Mark all as
  // read" survives reloads — a NEW appointment id re-triggers the unread dot
  const [notifReadIds, setNotifReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nmc.notifReadIds')) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('nmc.notifReadIds', JSON.stringify(notifReadIds)); }, [notifReadIds]);
  const notifRef = useRef(null);

  const isAdmin = route.startsWith('/admin');
  // Doctor portal: notifications come from the doctor's own appointments;
  // the patient Help button is portal-only and hidden for staff roles
  const isDoctor = route.startsWith('/doctor');

  // Page context in the topbar — without it the strip is an empty 60px band
  // on every console page (a leftover that reads as unfinished template UI).
  // Label mirrors the sidebar's own wording so the two never disagree.
  const sub = route.split('?')[0].split('/').filter(Boolean)[1] || '';
  const pageTitle =
    isDoctor && sub === 'dashboard' ? "Today's schedule"
    : ({
      dashboard: 'Dashboard', appointments: 'Appointments', patients: 'Patients',
      doctors: 'Doctors', stories: 'Patient stories', tickets: 'Patient messages',
      reports: 'Reports', activity: 'Activity log', settings: 'Settings',
      book: 'Book appointment', availability: 'Availability', history: 'My appointments',
      status: 'Appointment status', appointment: 'Appointment details', records: 'Medical records',
      messages: 'My messages', profile: 'Profile', help: 'Help & support', week: 'This week', feedback: 'Patient feedback',
    })[sub] || '';

  // Close the notifications dropdown on outside click or Escape
  useEffect(() => {
    if (!notifOpen) return;
    const onDocClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

  // Simulated fetch — skeleton rows for 600ms every time the dropdown opens,
  // same loading pattern as the admin list pages
  const [notifLoading, setNotifLoading] = useState(false);
  useEffect(() => {
    if (!notifOpen) return;
    setNotifLoading(true);
    const t = setTimeout(() => setNotifLoading(false), 600);
    return () => clearTimeout(t);
  }, [notifOpen]);

  // Prototype notifications derived from recent appointments
  const meId = (store.currentPatient || window.CURRENT_PATIENT).id;
  const appts = isAdmin
    ? store.appointments
    : isDoctor
      ? store.appointments.filter(a => a.doctorId === (store.doctorSession || {}).doctorId)
      : store.appointments.filter(a => a.patientId === meId);
  const notifIcon = { pending: 'clock', confirmed: 'calendar-check', completed: 'check-circle-2', cancelled: 'calendar-x', 'no-show': 'user-x' };
  const notifications = appts.slice(0, 4).map(a => {
    const doc = window.findDoctor(a.doctorId);
    return {
      id: a.id,
      icon: notifIcon[a.status] || 'calendar-days',
      title: a.status === 'pending' ? 'Appointment request received'
        : a.status === 'confirmed' ? 'Appointment confirmed'
        : a.status === 'completed' ? 'Visit completed'
        : a.status === 'no-show' ? 'Appointment marked as no-show'
        : 'Appointment cancelled',
      msg: `${doc ? doc.name : 'Your doctor'} • ${window.formatDate(a.date)} at ${a.time}`,
    };
  });
  const hasUnread = notifications.some(n => !notifReadIds.includes(n.id));

  // Clicking a notification opens the related appointment (and marks it read).
  // Staff consoles route to their own queues instead of a patient detail page.
  const openNotification = (n) => {
    setNotifReadIds(ids => (ids.includes(n.id) ? ids : [...ids, n.id]));
    setNotifOpen(false);
    if (isAdmin) navigate('/admin/appointments');
    else if (isDoctor) navigate('/doctor/dashboard');
    else navigate('/patient/appointment/' + n.id);
  };

  return (
    <div className="topbar">
      {onMenuClick && (
        <button className="btn-icon mobile-menu-btn" title="Open menu" aria-label="Open menu" onClick={onMenuClick}>
          <Icon name="menu" size={20} />
        </button>
      )}
      {pageTitle && <div className="topbar-title">{pageTitle}</div>}
      <div className="topbar-right">
        <div className="notif-wrap" ref={notifRef}>
          <button className="btn-icon" title="Notifications" aria-label="Notifications" aria-haspopup="true" aria-expanded={notifOpen} onClick={() => setNotifOpen(o => !o)}>
            <Icon name="bell" size={18} />
            {hasUnread && notifications.length > 0 && <span className="dot" />}
          </button>
          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-head">
                <span>Notifications</span>
                <button className="btn btn-link" disabled={notifLoading || !hasUnread} onClick={() => setNotifReadIds(ids => [...ids, ...notifications.map(n => n.id)].slice(-200))}>Mark all as read</button>
              </div>
              {notifLoading ? (
                /* Skeleton rows mirroring the notif-item layout (icon + 2 lines) */
                <div aria-hidden="true">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="notif-item notif-skel">
                      <span className="notif-icon skel" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="skel" style={{ width: '55%', height: 11, marginBottom: 6 }} />
                        <div className="skel" style={{ width: '82%', height: 10 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">You're all caught up: no notifications yet.</div>
              ) : notifications.map(n => (
                <button
                  type="button"
                  key={n.id}
                  className="notif-item notif-link"
                  onClick={() => openNotification(n)}
                  title="Open appointment"
                >
                  <span className="notif-icon"><Icon name={n.icon} size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.msg}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Help & support is patient-portal only — hidden in staff consoles */}
        {!isAdmin && !isDoctor && (
          <button className="btn-icon" title="Help" aria-label="Help" onClick={() => navigate('/patient/help')}>
            <Icon name="help-circle" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- AppShell (sidebar + topbar + content) ----------
function AppShell({ current, children }) {
  const store = useStore();
  const route = useHashRoute();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const path = route.split('/').filter(Boolean)[0];
  // derive role directly from URL to keep sidebar in sync during navigation
  const role = path === 'admin' ? 'admin' : path === 'patient' ? 'patient' : path === 'doctor' ? 'doctor' : store.role;

  // Close the mobile drawer on navigation and when Escape is pressed
  useEffect(() => { setMobileNavOpen(false); }, [route]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  return (
    <div className="app">
      <Sidebar role={role} current={current} />
      {mobileNavOpen && (
        <div className="mobile-nav-scrim" onClick={() => setMobileNavOpen(false)}>
          <aside className="mobile-nav" onClick={e => e.stopPropagation()}>
            {/* React Bits AnimatedContent — portal drawer slides in from the left
                on open (the aside itself has no CSS entrance animation). The
                wrapper carries .mobile-nav-slide so CSS can stretch it to the
                drawer's full height — without it the wrapper's auto height makes
                the sidebar's height:100% collapse and the user footer sits
                right under the nav instead of at the drawer bottom. */}
            <AnimatedContent className="mobile-nav-slide" distance={300} direction="horizontal" reverse duration={0.4}>
              <Sidebar role={role} current={current} />
            </AnimatedContent>
          </aside>
        </div>
      )}
      <div className="main">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        {children}
      </div>
      <ToastLayer />
    </div>
  );
}

// ---------- Public shell ----------
function PublicNav({ activeLink = 'home' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Shadow + solid background once the page scrolls (nav is sticky on public pages)
  const [scrolled, setScrolled] = useState(false);
  const links = [
    { to: '#/landing', key: 'home', label: 'Home' },
    { to: '#/services', key: 'services', label: 'Services' },
    { to: '#/doctors', key: 'doctors', label: 'Doctors' },
    { to: '#/about', key: 'about', label: 'About' },
    { to: '#/contact', key: 'contact', label: 'Contact' },
  ];

  // Brand block → home (standard logo behavior). When already on the home page
  // the anchor would be a no-op (same URL, no hashchange), so we smooth-scroll
  // back to the top ourselves; otherwise the href navigates and useHashRoute
  // jumps to the top of the new page.
  const goHome = (e) => {
    const hash = window.location.hash.replace(/^#/, '') || '/';
    const [path] = hash.split('?');
    if (path === '' || path === '/' || path === '/landing') {
      e.preventDefault();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock page scroll while the drawer is open; Escape closes it
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <Fragment>
      <div className={`public-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="#/landing" className="public-nav-brand" title="Back to home" aria-label="MedicaCare: back to home page" onClick={goHome}>
          <BrandMark size={34} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{window.HOSPITAL.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(window.HOSPITAL.address.split(',')[1] || '').trim()}, PH</div>
          </div>
        </a>
        <div className="public-nav-links">
          {links.map(l => (
            <a key={l.key} href={l.to} className={activeLink === l.key ? 'active' : ''}>{l.label}</a>
          ))}
        </div>
        <div className="public-nav-cta">
          <a className="btn btn-ghost" href="#/login">Log in</a>
          <a className="btn btn-primary" href="#/register">Register</a>
        </div>
        <button className="public-nav-burger" title="Open menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={20} />
        </button>
      </div>

      {menuOpen && (
        <Fragment>
          <div className="public-drawer-scrim" onClick={() => setMenuOpen(false)} />
          <div className="public-drawer">
            <div className="public-drawer-head">
              <a href="#/landing" className="public-nav-brand" title="Back to home" aria-label="MedicaCare: back to home page"
                onClick={(e) => { setMenuOpen(false); goHome(e); }}>
                <BrandMark size={34} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>{window.HOSPITAL.name}</div>
              </a>
              <button className="btn-icon" title="Close menu" aria-label="Close menu" onClick={() => setMenuOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <AnimatedContent className="public-drawer-slide" distance={24} duration={0.5} delay={0.12}>
            <nav className="public-drawer-links">
              {links.map(l => (
                <a key={l.key} href={l.to} className={activeLink === l.key ? 'active' : ''} onClick={() => setMenuOpen(false)}>
                  {l.label}
                  <Icon name="chevron-right" size={15} />
                </a>
              ))}
            </nav>
            </AnimatedContent>
            <div className="public-drawer-cta">
              <a className="btn btn-secondary" href="#/login" onClick={() => setMenuOpen(false)}>Log in</a>
              <a className="btn btn-primary" href="#/register" onClick={() => setMenuOpen(false)}>Register</a>
            </div>
          </div>
        </Fragment>
      )}
    </Fragment>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      {/* Always-on urgent-care line (NHS pattern: red is reserved for urgent
          guidance). Complements the dismissible NoticeBar at the top. */}
      <div className="footer-emergency">
        <Icon name="siren" size={13} />
        <span><strong>Emergencies:</strong> go directly to the ER or call 911. Online booking is for scheduled visits only.</span>
      </div>
      <div>
        <div>© 2026 {window.HOSPITAL.name} · {window.HOSPITAL.address} · {window.HOSPITAL.phone}</div>
        <div style={{ marginTop: 4 }}>Clinic hours: Mon–Fri 8:00 AM – 5:00 PM · Sat 9:00 AM – 1:00 PM · Closed on Sundays</div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <a href="#/privacy">Privacy</a>
        <a href="#/terms">Terms</a>
        <a href="#/contact">Contact</a>
      </div>
      {/* Subject-project disclaimer — hospital and all data are fictional/dummy */}
      <div className="footer-disclaimer">
        <Icon name="info" size={12} />
        <span>
          This website is for a school subject project (IPT2) only: MedicaCare is a fictional
          hospital and all doctors, patients, and appointments are dummy data.
        </span>
      </div>
    </footer>
  );
}

// ============================================================
// Public-page interactive widgets (patterns researched from
// Cleveland Clinic / Mayo Clinic public sites)
// ============================================================

// ---------- Dismissible 24/7 emergency hotline bar ----------
function NoticeBar({ phone }) {
  // Dismissed for the current browser session only — returns on the next visit
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('nmc.noticeDismissed') === '1'; } catch { return false; }
  });
  // Mirror the dismissed state onto <html> so the Landing hero can subtract
  // the notice bar from its viewport-height math (see html.notice-dismissed
  // rules in styles.css) — otherwise dismissing the bar leaves a dead gap
  // under the trust ticker on the fold
  useEffect(() => {
    document.documentElement.classList.toggle('notice-dismissed', dismissed);
    return () => document.documentElement.classList.remove('notice-dismissed');
  }, [dismissed]);
  if (dismissed) return null;
  const dismiss = () => {
    try { sessionStorage.setItem('nmc.noticeDismissed', '1'); } catch { /* private mode */ }
    setDismissed(true);
  };
  return (
    <div className="public-notice-bar" role="status">
      <div className="public-notice-inner">
        <Icon name="siren" size={14} />
        <span><strong>24/7 Emergency care:</strong> our ER never closes: walk in anytime or call us.</span>
        {phone && <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a>}
        <button className="public-notice-close" aria-label="Dismiss announcement" title="Dismiss" onClick={dismiss}>
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------- Live "Open now / Closed" pill (computed from clinic hours) ----------
// Hours follow the footer schedule: Mon–Fri 8AM–5PM, Sat 9AM–1PM, Sun closed.
function ClinicStatus() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const mins = now.getHours() * 60 + now.getMinutes();
  const isOpen = day !== 0 && day !== 6
    ? mins >= 8 * 60 && mins < 17 * 60
    : day === 6 && mins >= 9 * 60 && mins < 13 * 60;
  const nextOpen = (day === 6 && mins >= 13 * 60) || day === 0
    ? 'Mon 8:00 AM'
    : mins < 8 * 60 ? 'today 8:00 AM' : 'tomorrow 8:00 AM';
  return (
    <span className={`clinic-status ${isOpen ? 'open' : 'closed'}`}>
      <span className="clinic-status-dot" />
      {isOpen
        ? <>Open now · closes {day === 6 ? '1:00 PM' : '5:00 PM'}</>
        : <>Clinic closed · opens {nextOpen}</>}
    </span>
  );
}

// ---------- FAQ accordion (expand/collapse Q&A list) ----------
function FaqAccordion({ items }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="faq-accordion">
      {items.map((item, i) => {
        const open = openIdx === i;
        return (
          <div className={`faq-item ${open ? 'open' : ''}`} key={item.q}>
            <button className="faq-question" aria-expanded={open} onClick={() => setOpenIdx(open ? -1 : i)}>
              <span>{item.q}</span>
              <Icon name="chevron-down" size={16} />
            </button>
            {open && <div className="faq-answer">{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Auto-rotating testimonial carousel (pauses on hover/focus/toggle) ----------
function TestimonialCarousel({ items, interval = 6000 }) {
  const [idx, setIdx] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  // Explicit play/pause toggle — hover alone is not a pause mechanism for
  // keyboard or touch users (WCAG 2.2.2: moving content needs pause/stop)
  const [userPaused, setUserPaused] = useState(false);
  // Auto-advance is off entirely under prefers-reduced-motion: with the CSS
  // transition disabled, slides would jump instead of slide, which reads as
  // broken. Arrows and dots still work; there is nothing auto-moving to pause.
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const count = items.length;
  const paused = hoverPaused || userPaused || reduceMotion;
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduceMotion(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [paused, count, interval]);
  const go = (i) => setIdx(((i % count) + count) % count);
  return (
    <div
      className="testimonial-carousel"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      // React onFocus/onBlur bubble — pause auto-advance while any control
      // (arrows, dots, toggle) inside has keyboard focus
      onFocus={() => setHoverPaused(true)}
      onBlur={() => setHoverPaused(false)}
    >
      <div className="testimonial-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {items.map((t, i) => (
          // aria-hidden keeps screen readers on the visible slide instead of
          // reading all quotes as one stream
          <div
            className="testimonial-slide"
            key={t.who}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== idx}
          >
            <div className="feature-card testimonial-card">
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-who">{t.who}</div>
            </div>
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="testimonial-controls">
          {!reduceMotion && (
            <button
              className="testimonial-arrow"
              aria-label={userPaused ? 'Play rotating testimonials' : 'Pause rotating testimonials'}
              aria-pressed={userPaused}
              onClick={() => setUserPaused(p => !p)}
            >
              <Icon name={userPaused ? 'play' : 'pause'} size={16} />
            </button>
          )}
          <button className="testimonial-arrow" aria-label="Previous testimonial" onClick={() => go(idx - 1)}>
            <Icon name="chevron-left" size={16} />
          </button>
          <div className="testimonial-dots">
            {items.map((t, i) => (
              <button
                key={t.who}
                className={`testimonial-dot ${i === idx ? 'on' : ''}`}
                aria-label={`Go to testimonial ${i + 1}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button className="testimonial-arrow" aria-label="Next testimonial" onClick={() => go(idx + 1)}>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Page Header ----------
function PageHeader({ title, subtitle, breadcrumbs, actions }) {
  return (
    <div className="page-header">
      <div>
        {breadcrumbs && (
          <div className="breadcrumbs">
            {breadcrumbs.map((b, i) => (
              <Fragment key={i}>
                {i > 0 && <Icon name="chevron-right" size={12} />}
                {b.to
                  // Real href (audit-002 #2): keyboard-focusable and
                  // right/middle-clickable; navigate() keeps the
                  // scroll-to-top behavior consistent
                  ? <a href={'#' + b.to} onClick={e => { e.preventDefault(); navigate(b.to); }}>{b.label}</a>
                  : <span>{b.label}</span>}
              </Fragment>
            ))}
          </div>
        )}
        <h1 className="h-page">{title}</h1>
        {subtitle && <p className="t-muted" style={{ marginTop: 4, marginBottom: 0, fontSize: 14 }}>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

// ---------- Badge ----------
function Badge({ children, kind = 'neutral', dot = true }) {
  const cls = kind.startsWith('badge-') ? kind : `badge-${kind}`;
  return <span className={`badge ${cls}`}>{dot && <span className="badge-dot" />}{children}</span>;
}
function StatusBadge({ status }) {
  const m = window.statusMeta(status);
  return <span className={`badge ${m.cls}`}><span className="badge-dot" />{m.label}</span>;
}
function DoctorStatusBadge({ status }) {
  const m = window.doctorStatusMeta(status);
  return <span className={`badge ${m.cls}`}><span className="badge-dot" />{m.label}</span>;
}

// ---------- Doctor avatar (photo with initials fallback) ----------
// Doctors carry a dummy portrait URL (randomuser.me). If the photo is missing
// or fails to load (e.g. offline demo), fall back to the initials circle.
function DoctorAvatar({ doctor, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const photo = doctor?.photo;
  useEffect(() => { setFailed(false); }, [photo]);
  const name = doctor?.name || '?';
  if (!photo || failed) {
    return (
      <div className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36), flexShrink: 0 }}>
        {window.initials(name)}
      </div>
    );
  }
  return (
    <img
      src={photo}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
    />
  );
}

// ---------- Patient avatar (photo with initials fallback) ----------
// Same behavior as DoctorAvatar, for patient records (seed patients carry a
// randomuser.me portrait; uploaded photos override via data URLs).
function PatientAvatar({ person, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const photo = person?.photo;
  useEffect(() => { setFailed(false); }, [photo]);
  const name = person?.name || '?';
  if (!photo || failed) {
    return (
      <div className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36), flexShrink: 0 }}>
        {window.initials(name)}
      </div>
    );
  }
  return (
    <img
      src={photo}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
    />
  );
}

// ---------- Modal ----------
function Modal({ open, onClose, title, subtitle, icon, iconKind = 'info', size = '', children, footer }) {
  const modalRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    // Dialog focus pattern (audit-002 #13): move focus into the dialog when
    // it opens, trap Tab inside it, and restore focus to the trigger on close
    requestAnimationFrame(() => { if (modalRef.current) modalRef.current.focus(); });
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose && onClose(); return; }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === modalRef.current)) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div ref={modalRef} className={`modal ${size}`} role="dialog" aria-modal="true" tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
            {icon && (
              <div className={`modal-icon ${iconKind}`}>
                <Icon name={icon} size={22} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div className="modal-title">{title}</div>
              {subtitle && <div className="modal-sub">{subtitle}</div>}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close" aria-label="Close dialog"><Icon name="x" size={16} /></button>
        </div>
        {children && <div className="modal-body">{children}</div>}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Toast ----------
function ToastLayer() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <div className="toast-icon">
            <Icon name={
              t.kind === 'error' ? 'x-circle' :
              t.kind === 'warning' ? 'alert-triangle' :
              t.kind === 'info' ? 'info' : 'check-circle-2'
            } size={17} />
          </div>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.msg && <div className="toast-msg">{t.msg}</div>}
          </div>
          <button className="toast-close" onClick={() => dismissToast(t.id)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- Field wrappers ----------
function Field({ label, required, help, error, children }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}{required && <span className="req">*</span>}</label>}
      {children}
      {error
        ? <div className="field-error"><Icon name="alert-circle" size={12} /> {error}</div>
        : help ? <div className="field-help">{help}</div> : null}
    </div>
  );
}

function TextInput({ error, icon, ...props }) {
  if (icon) {
    return (
      <div className="input-group">
        <Icon name={icon} size={16} className="input-icon" />
        <input className={'input' + (error ? ' error' : '')} {...props} />
      </div>
    );
  }
  return <input className={'input' + (error ? ' error' : '')} {...props} />;
}
function TextArea({ error, ...props }) {
  return <textarea className={'textarea' + (error ? ' error' : '')} {...props} />;
}
function SelectInput({ error, children, className, ...props }) {
  // Merge an optional extra class (e.g. .status-select) with the base .select
  return <select className={'select' + (error ? ' error' : '') + (className ? ' ' + className : '')} {...props}>{children}</select>;
}

// ---------- Pagination ----------
function Pagination({ page, setPage, total, pageSize, label = 'rows' }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const list = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i);
    else if (list[list.length - 1] !== '…') list.push('…');
  }
  return (
    <div className="pagination">
      <div>Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> {label}</div>
      <div className="pagination-controls">
        <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <Icon name="chevron-left" size={14} />
        </button>
        {list.map((p, i) => p === '…'
          ? <span key={i} className="t-muted" style={{ padding: '0 4px' }}>…</span>
          : <button key={i} className={'page-btn' + (page === p ? ' on' : '')} onClick={() => setPage(p)}>{p}</button>
        )}
        <button className="page-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------- Skeleton rows for tables ----------
function SkeletonRows({ rows = 6, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}><span className="skel" style={{ height: 12, width: c === 0 ? '70%' : c === cols - 1 ? '40%' : '60%' }} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ---------- Sortable table header button (guideline 18 — table sorting) ----------
// Shared by the admin tables and the patient Appointment History table.
// Keyboard-accessible (<button>), exposes state via aria-sort, and keeps the
// chevron affordance visible in both sorted and unsorted columns.
function SortableTh({ label, k, sortKey, sortDir, onSort }) {
  const active = sortKey === k;
  return (
    <th aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => onSort(k)}>
        {label}
        <Icon name={active ? (sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down'} size={12} />
      </button>
    </th>
  );
}

// ---------- Page loading spinner ----------
// Full-page loading state for form-heavy pages (patient Book/Profile, admin
// Settings) where a single centered circle reads better than layout skeletons.
// The flex wrapper centers the circle on both axes within the visible content
// area — identical on desktop and mobile.
function PageSpinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div className="spinner" />
    </div>
  );
}

// ---------- Empty / Error state ----------
function EmptyState({ icon = 'inbox', title, message, actions }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon name={icon} size={22} /></div>
      <div className="empty-state-title">{title}</div>
      {message && <div className="empty-state-msg">{message}</div>}
      {actions && <div className="empty-state-actions">{actions}</div>}
    </div>
  );
}
function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ background: 'var(--error-soft)', color: 'var(--error)' }}>
        <Icon name="alert-triangle" size={22} />
      </div>
      <div className="empty-state-title">{title}</div>
      {message && <div className="empty-state-msg">{message}</div>}
      {onRetry && (
        <div className="empty-state-actions">
          <button className="btn btn-secondary" onClick={onRetry}><Icon name="refresh-cw" size={14} /> Retry</button>
        </div>
      )}
    </div>
  );
}

// ---------- Confirm modal (delete/cancel) ----------
function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', kind = 'danger', loading = false }) {
  const iconMap = { danger: 'alert-triangle', warning: 'alert-circle', info: 'info', success: 'check-circle-2' };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={message}
      icon={iconMap[kind]}
      iconKind={kind}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Keep it</button>
          <button className={`btn ${kind === 'danger' ? 'btn-danger' : 'btn-primary'} ${loading ? 'btn-loading' : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}

// ---------- OTP verification (prototype demo) ----------
// Second login step for every portal: a 6-character code "emailed" to the
// user — 3 digits + 3 letters, shuffled so the two mix. PROTOTYPE ONLY: no
// real email is sent; the code is displayed in the modal's demo notice so
// the demo flow stays completable. A real backend must generate, deliver,
// and expire these codes server-side (and rate-limit the attempts).
function generateOtp() {
  const digits = '0123456789';
  // Unambiguous letter charset (no I/L/O) so a code read from the demo box
  // is easy to re-type — same rule as the generated portal passwords
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const pick = (set) => {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return set[buf[0] % set.length];
  };
  const chars = [pick(digits), pick(digits), pick(digits), pick(letters), pick(letters), pick(letters)];
  // Fisher–Yates shuffle so digits and letters mix instead of clustering
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function OtpVerifyModal({ open, onClose, onVerified, email, title = 'Verify it\'s you', subtitle }) {
  const [sentCode, setSentCode] = useState('');
  const [entry, setEntry] = useState(() => Array(6).fill(''));
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [resend, setResend] = useState(0);
  const inputRefs = useRef([]);

  // (Re)send: a fresh code each time the modal opens or Resend is clicked.
  // The short "sending" window is the same simulated-fetch theater the other
  // flows use (skeletons/spinners for ~600–900ms).
  useEffect(() => {
    if (!open) return undefined;
    setSentCode(generateOtp());
    setEntry(Array(6).fill(''));
    setError('');
    setSending(true);
    const t = setTimeout(() => setSending(false), 900);
    requestAnimationFrame(() => { if (inputRefs.current[0]) inputRefs.current[0].focus(); });
    return () => clearTimeout(t);
  }, [open, resend]);

  const submit = (value) => {
    const code = (value || entry.join('')).toUpperCase();
    if (code.length < 6) { setError('Enter all 6 characters of the code.'); return; }
    if (code !== sentCode) {
      setError('That code doesn\'t match. Check it and try again, or resend a new code.');
      return;
    }
    onVerified();
  };

  const setChar = (i, raw) => {
    const c = String(raw || '').replace(/[^0-9a-zA-Z]/g, '').slice(-1).toUpperCase();
    const next = entry.slice();
    next[i] = c;
    setEntry(next);
    if (error) setError('');
    if (c && i < 5) inputRefs.current[i + 1].focus();
    // All 6 filled — verify automatically, no button press needed
    if (next.every(x => x)) submit(next.join(''));
  };

  const onInputKey = (i, e) => {
    if (e.key === 'Backspace' && !entry[i] && i > 0) inputRefs.current[i - 1].focus();
    // Arrow keys move between boxes like a normal code input
    if (e.key === 'ArrowLeft' && i > 0) inputRefs.current[i - 1].focus();
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1].focus();
  };

  const onPaste = (i, e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6 - i);
    if (!text) return;
    const next = entry.slice();
    text.split('').forEach((ch, k) => { next[i + k] = ch; });
    setEntry(next);
    const fill = next.findIndex(x => !x);
    inputRefs.current[fill === -1 ? 5 : fill].focus();
    if (next.every(x => x)) submit(next.join(''));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon="mail-check"
      iconKind="info"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => submit()}>Verify code</button>
        </>
      }
    >
      <div className="stack md">
        {/* Demo notice — this prototype sends no real email, so the "emailed"
            code is shown here. Labeled clearly so it never reads as a leak. */}
        <div className="otp-demo-box" role="note">
          <Icon name="info" size={14} />
          <div style={{ flex: 1 }}>
            <div><strong>Prototype demo:</strong> no real email is sent. Your code would arrive at <strong>{email || 'your inbox'}</strong> — it is shown here instead.</div>
            <div className="otp-demo-code" aria-label="Your verification code">
              {sending
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Sending code to your Gmail…</span>
                : sentCode}
            </div>
          </div>
        </div>

        <Field label="Enter the 6-character code" error={error}>
          <div className="otp-inputs">
            {entry.map((ch, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                className={'input otp-input' + (error ? ' error' : '')}
                value={ch}
                autoComplete="one-time-code"
                inputMode="text"
                aria-label={`Character ${i + 1} of 6`}
                onChange={e => setChar(i, e.target.value)}
                onKeyDown={e => onInputKey(i, e)}
                onPaste={e => onPaste(i, e)}
              />
            ))}
          </div>
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-link" disabled={sending} onClick={() => setResend(r => r + 1)}>
            Resend a new code
          </button>
          <span className="t-help">Tip: the code mixes 3 numbers and 3 letters — case doesn't matter.</span>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Simple placeholder chart (visits over week) ----------
// Optional `trend` draws a line connecting the bar tops.
function MiniBarChart({ data, height = 120, trend = false, delay = 0, stagger = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length || 1;
  // Tallest bar uses this % of the chart height; the rest is headroom for the value labels
  const BAR_MAX = 82;

  // The trend line renders at its true pixel size (viewBox matches the
  // container exactly, no stretching) instead of a distorted 100x100 viewBox.
  // This avoids the Chrome dash-rendering artifacts on non-scaling-stroke +
  // preserveAspectRatio="none", and lets the draw-in animation trace the
  // path correctly ("walking" along the bar tops from start to end).
  const chartRef = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!trend || !chartRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, [trend]);
  return (
    <div>
      <div ref={chartRef} style={{ position: 'relative', height }}>
        {trend && n > 1 && width > 0 && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
            className="mini-chart-trend"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1, animationDelay: `${delay + n * stagger}ms` }}>
            {/* pathLength=100 + dash-offset draw: at 1:1 pixel scale this
                traces the line along the bar tops from start to end */}
            <polyline
              points={data.map((d, i) => `${((i + 0.5) / n) * width},${((100 - (d.value / max) * BAR_MAX) / 100) * height}`).join(' ')}
              pathLength="100" className="chart-draw"
              fill="none" stroke="var(--primary)" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
          </svg>
        )}
        {trend && data.map((d, i) => (
          <div key={`pt-${i}`} className="chart-dot" style={{
            position: 'absolute', zIndex: 2,
            left: `${((i + 0.5) / n) * 100}%`,
            top: `${100 - (d.value / max) * BAR_MAX}%`,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--primary)', border: '2px solid #fff',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.2)',
            // each dot pops as the drawn line reaches it (line duration: 900ms)
            animationDelay: `${(delay + n * stagger) + (n > 1 ? (i / (n - 1)) * 900 : 0)}ms`,
          }} />
        ))}
        {data.map((d, i) => (
          <div key={i} className="mini-chart-col" style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(i / n) * 100}%`, width: `${100 / n}%`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{d.value}</div>
            <div className={'mini-chart-bar' + (d.highlight ? ' on' : '')} style={{
              width: '100%', maxWidth: 40,
              height: `${Math.max((d.value / max) * BAR_MAX, 1)}%`,
              // staggered wave: each bar starts after the previous one;
              // `delay` holds the whole sequence briefly after loading clears
              animationDelay: `${delay + i * stagger}ms`,
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ width: `${100 / n}%`, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}

// ---------- Sparkline (tiny trend line for stat cards) ----------
// No axes or labels — the number beside it is the data; the line only
// communicates direction. Fixed viewBox matching its pixel size so the
// end dot doesn't distort under non-uniform scaling. `delay` staggers
// multiple sparklines (e.g. one per stat card) after the skeletons clear.
function Sparkline({ data, width = 72, height = 28, tone = 'primary', delay = 0 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pad = 3;
  const pts = data.map((v, i) => [
    1 + (i / (data.length - 1)) * (width - 2),
    height - pad - ((v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(p => p.join(',')).join(' ');
  const last = pts[pts.length - 1];
  const color = tone === 'success' ? 'var(--success)' : tone === 'error' ? 'var(--error)' : 'var(--primary)';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="sparkline">
      {/* pathLength=100 normalizes the draw-in dash animation for any shape */}
      <polyline points={line} pathLength="100" className="chart-draw"
        style={{ animationDelay: `${delay}ms` }}
        fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} className="chart-dot"
        style={{ animationDelay: `${delay + 900}ms` }} />
    </svg>
  );
}

// ---------- Doctor visit ratings (computed from real patient feedback) ----------
// Ratings come only from patients with a completed appointment (one rating per
// appointment, enforced again at submit time). Doctors start with no rating at
// all — nothing is displayed that patients did not actually give, and an
// average is always shown together with its review count (small samples stay
// labeled). Ratings are never used to sort or rank doctors.
function computeDoctorRating(ratings, doctorId) {
  const list = (ratings || []).filter(r => r.doctorId === doctorId);
  if (!list.length) return { count: 0, avg: null };
  const avg = list.reduce((s, r) => s + (Number(r.stars) || 0), 0) / list.length;
  return { count: list.length, avg: Math.round(avg * 10) / 10 };
}

function DoctorRatingPill({ ratings, doctorId, compact = false }) {
  const { count, avg } = computeDoctorRating(ratings, doctorId);
  if (!count) return <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No ratings yet</span>;
  const label = `${count} ${compact ? 'rating' : 'patient rating'}${count === 1 ? '' : 's'}`;
  return (
    <span
      className="rating-cell"
      style={{ fontSize: 12.5 }}
      // Hover detail for mouse users; the visible text already spells it out
      title={`Average of ${count} patient rating${count === 1 ? '' : 's'} from completed visits`}
    >
      <Icon name="star" size={13} style={{ color: '#F59E0B' }} />
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{avg.toFixed(1)}</span>
      <span style={{ color: 'var(--text-muted)' }}>· {label}</span>
    </span>
  );
}

// ---------- Password input with show/hide toggle ----------
// Small shared wrapper so every password field (patient login, profile change
// password) gets the eye toggle without each screen re-implementing it.
function PwField({ label, required, error, help, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required={required} error={error} help={help}>
      <div className="input-group">
        <input
          className={'input' + (error ? ' error' : '')}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          className="pw-toggle"
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow(s => !s)}
        >
          <Icon name={show ? 'eye-off' : 'eye'} size={16} />
        </button>
      </div>
    </Field>
  );
}

// ---------- Export everything ----------
Object.assign(window, {
  Icon, useHashRoute, navigate, StoreProvider, useStore,
  useIsDesktop, DesktopOnlyNotice,
  Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ConfirmModal, ToastLayer,
  Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, SortableTh, PageSpinner, EmptyState, ErrorState, MiniBarChart, Sparkline,
  NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel,
  computeDoctorRating, DoctorRatingPill, PwField,
  OtpVerifyModal, generateOtp,
});

export {
  Icon, useHashRoute, navigate, useStore, StoreProvider,
  useIsDesktop, DesktopOnlyNotice,
  Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader, BrandMark,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, SortableTh, PageSpinner, EmptyState, ErrorState, ConfirmModal, MiniBarChart, Sparkline,
  NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel,
  computeDoctorRating, DoctorRatingPill,
  PwField,
  OtpVerifyModal, generateOtp,
};

