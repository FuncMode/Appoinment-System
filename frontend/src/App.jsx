// ============================================================
// Router / app root — MedicaCare
// ============================================================
import { useEffect, useState } from 'react';
import { BrandMark, useHashRoute, useStore, useIsDesktop, DesktopOnlyNotice } from './components.jsx';
import { Landing, Register, Login, AdminLogin, DoctorLogin, ForgotPassword, ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage } from './screens-public.jsx';
import {
  PatientDashboard, DoctorListing, DoctorAvailability, BookAppointment,
  BookingConfirmation, AppointmentStatus, AppointmentHistory, AppointmentDetails, Profile,
  MedicalRecords, PatientMessages, HelpSupport,
} from './screens-patient.jsx';
import { AdminDashboard, PatientsMgmt, DoctorsMgmt, AppointmentsMgmt, StoriesMgmt, TicketsMgmt, AdminReports, AdminSettings, AdminActivity } from './screens-admin.jsx';
import { DoctorDashboard, DoctorPatients, DoctorWeekView, DoctorFeedback } from './screens-doctor.jsx';
import { MobileShowcase } from './screens-mobile.jsx';

// ============================================================
// Initial-visit splash — brand mark + spinner circle, centered
// vertically AND horizontally. Shown on every full page load,
// held briefly, then faded out (CSS transition) and unmounted.
// ============================================================
function Splash({ fading }) {
  return (
    <div
      className={`app-splash${fading ? ' splash-fading' : ''}`}
      role="status"
      aria-label="Loading MedicaCare"
    >
      <div className="app-splash-inner">
        <BrandMark size={56} />
        <div className="app-splash-spinner" />
      </div>
    </div>
  );
}

function App() {
  const route = useHashRoute();
  const store = useStore();
  // Staff consoles are desktop-only: on small screens both portals are
  // replaced by a fallback notice (see DesktopOnlyNotice in components.jsx)
  const isDesktop = useIsDesktop();
  // Splash lifecycle: 'shown' -> 'fading' -> 'gone' (then unmounted).
  // First visit only: it runs on the landing page — a full page load that
  // deep-links straight into the patient portal or admin console (or any
  // other page) skips it entirely.
  const [splash, setSplash] = useState(() => {
    const r = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
    return (r === '/' || r === '' || r === '/landing') ? 'shown' : 'gone';
  });
  useEffect(() => {
    if (splash === 'gone') return;
    const t1 = setTimeout(() => setSplash('fading'), 900);
    const t2 = setTimeout(() => setSplash('gone'), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [splash === 'gone']);

  // Navigating away from the landing page while the splash is still up
  // (fast click within the 1.3s window) dismisses it immediately — it must
  // never linger over the portal or admin console
  useEffect(() => {
    if (splash === 'gone') return;
    const r = route.split('?')[0];
    if (!(r === '/' || r === '' || r === '/landing')) setSplash('gone');
  }, [route, splash]);

  // Split an optional query string off the hash route (e.g. #/doctors?spec=Cardiology)
  // so deep links from the Landing care finder / department chips can pre-filter pages.
  const [routePath, routeQuery] = route.split('?');
  const queryParams = new URLSearchParams(routeQuery || '');

  // Parse route
  const [path, ...rest] = routePath.split('/').filter(Boolean);
  const first = '/' + (path || '');

  // Sync role to URL for persistence (deferred to next tick to avoid setState-in-render)
  useEffect(() => {
    if (path === 'admin' && store.role !== 'admin') store.setRole('admin');
    else if (path === 'patient' && store.role !== 'patient') store.setRole('patient');
    else if (path === 'doctor' && store.role !== 'doctor') store.setRole('doctor');
  }, [path]);

  let screen;
  if (route === '/' || route === '' || first === '/landing') {
    screen = <Landing />;
  } else if (first === '/register') {
    screen = <Register />;
  } else if (first === '/login') {
    screen = <Login />;
  } else if (first === '/forgot-password') {
    screen = <ForgotPassword />;
  } else if (first === '/mobile') {
    screen = <MobileShowcase />;
  } else if (first === '/services') {
    screen = <ServicesPage />;
  } else if (first === '/doctors') {
    screen = <DoctorsPage initialSpecialty={queryParams.get('spec') || ''} />;
  } else if (first === '/about') {
    screen = <AboutPage />;
  } else if (first === '/contact') {
    screen = <ContactPage />;
  } else if (first === '/privacy') {
    screen = <PrivacyPage />;
  } else if (first === '/terms') {
    screen = <TermsPage />;
  } else if (path === 'patient') {
    // Route guard — the patient portal requires a patient session
    if (!store.patientSession) {
      screen = <Login />;
    } else {
      const sub = rest[0];
      const arg = rest[1];
      if (sub === 'dashboard') screen = <PatientDashboard />;
      else if (sub === 'doctors') screen = <DoctorListing />;
      else if (sub === 'availability') screen = <DoctorAvailability doctorId={arg} />;
      else if (sub === 'book') screen = <BookAppointment />;
      else if (sub === 'confirmation') screen = <BookingConfirmation />;
      else if (sub === 'status') screen = <AppointmentStatus />;
      else if (sub === 'history') screen = <AppointmentHistory />;
      else if (sub === 'appointment') screen = <AppointmentDetails apptId={arg} />;
      else if (sub === 'profile') screen = <Profile />;
      else if (sub === 'records') screen = <MedicalRecords />;
      else if (sub === 'messages') screen = <PatientMessages />;
      else if (sub === 'help') screen = <HelpSupport />;
      else screen = <PatientDashboard />;
    }
  } else if (path === 'admin') {
    const sub = rest[0];
    // Route guard — the staff console requires an admin session; the staff
    // login itself is unlinked from the public site (URL is shared internally).
    if (!isDesktop) {
      screen = <DesktopOnlyNotice role="admin" />;
    } else if (sub === 'login' || !store.adminSession) {
      screen = <AdminLogin />;
    } else if (sub === 'dashboard') screen = <AdminDashboard />;
    else if (sub === 'patients') screen = <PatientsMgmt />;
    else if (sub === 'doctors') screen = <DoctorsMgmt />;
    else if (sub === 'appointments') screen = <AppointmentsMgmt />;
    else if (sub === 'stories') screen = <StoriesMgmt />;
    else if (sub === 'tickets') screen = <TicketsMgmt />;
    else if (sub === 'reports') screen = <AdminReports />;
    else if (sub === 'activity') screen = <AdminActivity />;
    else if (sub === 'settings') screen = <AdminSettings />;
    else screen = <AdminDashboard />;
  } else if (path === 'doctor') {
    const sub = rest[0];
    // Route guard — the doctor portal requires a doctor session; the doctor
    // login itself is unlinked from the public site (shared internally).
    if (!isDesktop) {
      screen = <DesktopOnlyNotice role="doctor" />;
    } else if (sub === 'login' || !store.doctorSession) {
      screen = <DoctorLogin />;
    } else if (!window.findDoctor(store.doctorSession.doctorId)) {
      // The session points at a doctor the Admin console has removed from
      // the directory — show the login with an explanation (the login screen
      // clears the stale session in an effect) instead of bouncing silently
      screen = <DoctorLogin removed />;
    } else if (sub === 'patients') screen = <DoctorPatients />;
    else if (sub === 'week') screen = <DoctorWeekView />;
    else if (sub === 'feedback') screen = <DoctorFeedback />;
    else screen = <DoctorDashboard />;
  } else {
    screen = <Landing />;
  }

  // set a screen label per top-level route for comments
  const label = route.replace(/^\//, '') || 'landing';
  return (
    <div data-screen-label={label}>
      {splash !== 'gone' && <Splash fading={splash === 'fading'} />}
      {screen}
    </div>
  );
}

export default App;
