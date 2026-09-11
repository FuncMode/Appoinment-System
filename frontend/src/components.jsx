// ============================================================
// Shared components — MedicaCare
// ============================================================
import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } from 'react';
import brandLogo from './assets/brand_logo.png';
import './data.js';

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
      return saved ? JSON.parse(saved) : window.APPOINTMENTS;
    } catch { return window.APPOINTMENTS; }
  });
  const [doctors, setDoctors] = useState(window.DOCTORS);
  const [patients, setPatients] = useState(window.PATIENTS);
  const [pendingBooking, setPendingBooking] = useState(null); // {doctorId, date, time}
  const [lastBookingId, setLastBookingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  // Registered accounts (prototype auth) — persisted so credentials survive reloads
  const [users, setUsers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.users'));
      if (Array.isArray(saved) && saved.length) return saved.map(migratedEmail);
    } catch { /* fall through to seed */ }
    // Seed: demo patient account used by the Login screen
    return [{
      id: window.CURRENT_PATIENT.id, name: window.CURRENT_PATIENT.name,
      email: 'patient@medicacare.ph', phone: window.CURRENT_PATIENT.phone,
      password: 'patient123', role: 'patient',
    }];
  });
  // Identity of the logged-in patient (demo patient by default)
  const [currentPatient, setCurrentPatient] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nmc.currentPatient'));
      if (saved && saved.id) return migratedEmail(saved);
    } catch { /* fall through */ }
    return window.CURRENT_PATIENT;
  });

  useEffect(() => { localStorage.setItem('nmc.role', role); }, [role]);
  useEffect(() => { localStorage.setItem('nmc.appointments', JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem('nmc.users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('nmc.currentPatient', JSON.stringify(currentPatient)); }, [currentPatient]);

  const pushToast = useCallback((t) => {
    const id = 'tst_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, kind: 'success', ...t }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), t.duration || 3800);
  }, []);
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(x => x.id !== id)), []);

  const store = {
    role, setRole,
    appointments, setAppointments,
    doctors, setDoctors,
    patients, setPatients,
    pendingBooking, setPendingBooking,
    lastBookingId, setLastBookingId,
    users, setUsers,
    currentPatient, setCurrentPatient,
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
    { id: 'help',         label: 'Help & support',icon: 'life-buoy',    route: '/patient/help' },
  ];
  const adminNav = [
    { id: 'a-dashboard',  label: 'Dashboard',     icon: 'layout-dashboard', route: '/admin/dashboard' },
    { id: 'appointments', label: 'Appointments',  icon: 'calendar-days',    route: '/admin/appointments', count: 8 },
    { id: 'patients',     label: 'Patients',      icon: 'users-round',      route: '/admin/patients' },
    { id: 'doctors',      label: 'Doctors',       icon: 'stethoscope',      route: '/admin/doctors' },
    { id: 'reports',      label: 'Reports',       icon: 'bar-chart-3',      route: '/admin/reports' },
  ];
  const adminNav2 = [
    { id: 'settings',     label: 'Settings',      icon: 'settings',    route: '/admin/settings' },
    { id: 'help',         label: 'Help center',   icon: 'life-buoy',   route: '/admin/help' },
  ];

  const primary = role === 'admin' ? adminNav : patientNav;
  const secondary = role === 'admin' ? adminNav2 : patientNav2;
  const me = role === 'admin' ? window.CURRENT_ADMIN : (store.currentPatient || window.CURRENT_PATIENT);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandMark />
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">MedicaCare</div>
          <div className="sidebar-brand-sub">{role === 'admin' ? 'Admin console' : 'Patient portal'}</div>
        </div>
      </div>
      <div className="sidebar-nav">
        <div className="sidebar-nav-label">Main</div>
        {primary.map(item => (
          <div key={item.id}
               className={'sidebar-item' + (current === item.id ? ' active' : '')}
               onClick={() => navigate(item.route)}>
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
            {item.count != null && <span className="badge-count">{item.count}</span>}
          </div>
        ))}
        <div className="sidebar-nav-label">Account</div>
        {secondary.map(item => (
          <div key={item.id}
               className={'sidebar-item' + (current === item.id ? ' active' : '')}
               onClick={() => navigate(item.route)}>
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        {role === 'admin'
          ? <div className="avatar">{window.initials(me.name)}</div>
          : <PatientAvatar person={me} size={32} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{role === 'admin' ? me.role : 'Patient'}</div>
        </div>
        <button className="btn-icon" title="Log out" aria-label="Log out" onClick={() => navigate('/landing')}>
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
  const [notifRead, setNotifRead] = useState(false);
  const notifRef = useRef(null);

  const isAdmin = route.startsWith('/admin');
  const helpRoute = isAdmin ? '/admin/help' : '/patient/help';

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

  // Prototype notifications derived from recent appointments
  const meId = (store.currentPatient || window.CURRENT_PATIENT).id;
  const appts = isAdmin
    ? store.appointments
    : store.appointments.filter(a => a.patientId === meId);
  const notifIcon = { pending: 'clock', confirmed: 'calendar-check', completed: 'check-circle-2', cancelled: 'calendar-x' };
  const notifications = appts.slice(0, 4).map(a => {
    const doc = window.findDoctor(a.doctorId);
    return {
      id: a.id,
      icon: notifIcon[a.status] || 'calendar-days',
      title: a.status === 'pending' ? 'Appointment request received'
        : a.status === 'confirmed' ? 'Appointment confirmed'
        : a.status === 'completed' ? 'Visit completed'
        : 'Appointment cancelled',
      msg: `${doc ? doc.name : 'Your doctor'} • ${window.formatDate(a.date)} at ${a.time}`,
    };
  });

  return (
    <div className="topbar">
      {onMenuClick && (
        <button className="btn-icon mobile-menu-btn" title="Open menu" aria-label="Open menu" onClick={onMenuClick}>
          <Icon name="menu" size={20} />
        </button>
      )}
      <div className="topbar-right">
        <div className="notif-wrap" ref={notifRef}>
          <button className="btn-icon" title="Notifications" aria-label="Notifications" onClick={() => setNotifOpen(o => !o)}>
            <Icon name="bell" size={18} />
            {!notifRead && notifications.length > 0 && <span className="dot" />}
          </button>
          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-head">
                <span>Notifications</span>
                <button className="btn btn-link" onClick={() => setNotifRead(true)}>Mark all as read</button>
              </div>
              {notifications.length === 0 ? (
                <div className="notif-empty">You're all caught up — no notifications yet.</div>
              ) : notifications.map(n => (
                <div key={n.id} className="notif-item">
                  <span className="notif-icon"><Icon name={n.icon} size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn-icon" title="Help" aria-label="Help" onClick={() => navigate(helpRoute)}>
          <Icon name="help-circle" size={18} />
        </button>
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
  const role = path === 'admin' ? 'admin' : path === 'patient' ? 'patient' : store.role;

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
            <Sidebar role={role} current={current} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark size={34} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{window.HOSPITAL.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(window.HOSPITAL.address.split(',')[1] || '').trim()}, PH</div>
          </div>
        </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BrandMark size={34} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>{window.HOSPITAL.name}</div>
              </div>
              <button className="btn-icon" title="Close menu" aria-label="Close menu" onClick={() => setMenuOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <nav className="public-drawer-links">
              {links.map(l => (
                <a key={l.key} href={l.to} className={activeLink === l.key ? 'active' : ''} onClick={() => setMenuOpen(false)}>
                  {l.label}
                  <Icon name="chevron-right" size={15} />
                </a>
              ))}
            </nav>
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
          This website is for a school subject project (IPT2) only — MedicaCare is a fictional
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
  if (dismissed) return null;
  const dismiss = () => {
    try { sessionStorage.setItem('nmc.noticeDismissed', '1'); } catch { /* private mode */ }
    setDismissed(true);
  };
  return (
    <div className="public-notice-bar" role="status">
      <div className="public-notice-inner">
        <Icon name="siren" size={14} />
        <span><strong>24/7 Emergency care:</strong> our ER never closes — walk in anytime or call us.</span>
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

// ---------- Auto-rotating testimonial carousel (pauses on hover) ----------
function TestimonialCarousel({ items, interval = 6000 }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [paused, count, interval]);
  const go = (i) => setIdx(((i % count) + count) % count);
  return (
    <div className="testimonial-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="testimonial-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {items.map(t => (
          <div className="testimonial-slide" key={t.who}>
            <div className="feature-card testimonial-card">
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-who">— {t.who}</div>
            </div>
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="testimonial-controls">
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
                  ? <a onClick={() => navigate(b.to)}>{b.label}</a>
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className={`modal ${size}`} onClick={e => e.stopPropagation()}>
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
          <Icon className="toast-icon" name={
            t.kind === 'error' ? 'x-circle' :
            t.kind === 'warning' ? 'alert-triangle' :
            t.kind === 'info' ? 'info' : 'check-circle-2'
          } size={18} />
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

// ---------- Simple placeholder chart (visits over week) ----------
// Optional `trend` draws a line connecting the bar tops.
function MiniBarChart({ data, height = 120, trend = false }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length || 1;
  // Tallest bar uses this % of the chart height; the rest is headroom for the value labels
  const BAR_MAX = 82;
  const points = data.map((d, i) => `${((i + 0.5) / n) * 100},${100 - (d.value / max) * BAR_MAX}`).join(' ');
  return (
    <div>
      <div style={{ position: 'relative', height }}>
        {trend && n > 1 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.85" />
          </svg>
        )}
        {trend && data.map((d, i) => (
          <div key={`pt-${i}`} style={{
            position: 'absolute', zIndex: 2,
            left: `${((i + 0.5) / n) * 100}%`,
            top: `${100 - (d.value / max) * BAR_MAX}%`,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--primary)', border: '2px solid #fff',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.2)',
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

// ---------- Export everything ----------
Object.assign(window, {
  Icon, useHashRoute, navigate, StoreProvider, useStore,
  Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ConfirmModal, ToastLayer,
  Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, MiniBarChart,
  NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel,
});

export {
  Icon, useHashRoute, navigate, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader, BrandMark,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart,
  NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel,
};

