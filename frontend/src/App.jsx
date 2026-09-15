// ============================================================
// Router / app root — MedicaCare
// ============================================================
import { useEffect } from 'react';
import { useHashRoute, useStore } from './components.jsx';
import { Landing, Register, Login, AdminLogin, ForgotPassword, ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage } from './screens-public.jsx';
import {
  PatientDashboard, DoctorListing, DoctorAvailability, BookAppointment,
  BookingConfirmation, AppointmentStatus, AppointmentHistory, AppointmentDetails, Profile,
  MedicalRecords, HelpSupport,
} from './screens-patient.jsx';
import { AdminDashboard, PatientsMgmt, DoctorsMgmt, AppointmentsMgmt, AdminReports, AdminSettings } from './screens-admin.jsx';
import { MobileShowcase } from './screens-mobile.jsx';

function App() {
  const route = useHashRoute();
  const store = useStore();

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
      else if (sub === 'help') screen = <HelpSupport />;
      else screen = <PatientDashboard />;
    }
  } else if (path === 'admin') {
    const sub = rest[0];
    // Route guard — the staff console requires an admin session; the staff
    // login itself is unlinked from the public site (URL is shared internally).
    if (sub === 'login' || !store.adminSession) {
      screen = <AdminLogin />;
    } else if (sub === 'dashboard') screen = <AdminDashboard />;
    else if (sub === 'patients') screen = <PatientsMgmt />;
    else if (sub === 'doctors') screen = <DoctorsMgmt />;
    else if (sub === 'appointments') screen = <AppointmentsMgmt />;
    else if (sub === 'reports') screen = <AdminReports />;
    else if (sub === 'settings') screen = <AdminSettings />;
    else screen = <AdminDashboard />;
  } else {
    screen = <Landing />;
  }

  // set a screen label per top-level route for comments
  const label = route.replace(/^\//, '') || 'landing';
  return <div data-screen-label={label}>{screen}</div>;
}

export default App;
