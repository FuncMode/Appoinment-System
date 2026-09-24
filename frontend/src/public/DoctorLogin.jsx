// DoctorLogin — public (split from screens-public.jsx)
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, BrandMark, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart, DoctorRatingPill, PwField,
  NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel,
  OtpVerifyModal,
} from '../shared/components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN, DOCTOR_CREDENTIALS,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
} from '../shared/data.js';
import Aurora from '../shared/reactbits/Aurora.jsx';
import ShinyText from '../shared/reactbits/ShinyText.jsx';
import CountUp from '../shared/reactbits/CountUp.jsx';
import SplitText from '../shared/reactbits/SplitText.jsx';
import AnimatedContent from '../shared/reactbits/AnimatedContent.jsx';
import Magnet from '../shared/reactbits/Magnet.jsx';
import ScrollVelocity from '../shared/reactbits/ScrollVelocity.jsx';
import StarBorder from '../shared/reactbits/StarBorder.jsx';
import GlareHover from '../shared/reactbits/GlareHover.jsx';  // hero preview card only — the one deliberate hover flourish
import Ribbons from '../shared/reactbits/Ribbons.jsx';
import { CARE_GUIDE, PROTOTYPE_STORIES, LANDING_FAQS, SERVICES_FAQS } from './content.js';
import { HeroAurora, HeroTitle, Landing } from './Landing.jsx';
import { ServicesPage } from './ServicesPage.jsx';
import { MOBILE_DOCTORS_QUERY, MOBILE_DOCTORS_PAGE_SIZE, DoctorsPage } from './DoctorsPage.jsx';
import { AboutPage } from './AboutPage.jsx';
import { ContactPage } from './ContactPage.jsx';
import { LegalPage } from './LegalPage.jsx';
import { PrivacyPage } from './PrivacyPage.jsx';
import { TermsPage } from './TermsPage.jsx';
import { Register } from './Register.jsx';
import { Login } from './Login.jsx';
import { ADMIN_CREDENTIALS, AdminLogin } from './AdminLogin.jsx';
import { ForgotPassword } from './ForgotPassword.jsx';

// ---------- Doctor login (doctor portal) ----------
// Third prototype role: doctors log in to see their own schedule and write
// their own visit notes — the notes are attributed to the doctor who wrote
// them, not encoded by staff. Unlinked from the public site like the staff
// console; the URL is shared with doctors internally.
// Accounts are admin-issued: staff create them (email + password) from the
// Admin console's Doctors page, so this portal is login-only — doctors never
// self-register.
function DoctorLogin({ removed = false }) {
  const store = useStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  // Step 2 of doctor login (prototype demo): the emailed 6-character code
  // gates the portal — `pendingDoc` holds the session payload and the
  // session is only created from onVerified
  const [pendingDoc, setPendingDoc] = useState(null);
  // A stale session for a doctor the staff console has removed is cleared
  // here (in an effect, not during render) so the next login starts clean
  useEffect(() => {
    if (removed && store.doctorSession) store.logoutDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removed]);

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); setAuthError(null); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.email.trim()) e.email = 'Doctor email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid doctor email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setLoading(false);
      const em = form.email.toLowerCase().trim();
      // Portal access is admin-issued: doctor accounts live in store.users
      // with role 'doctor' (granted from the Admin console's Doctors page)
      const account = store.users.find(u => u.role === 'doctor' && u.email.toLowerCase() === em);
      if (!account || account.password !== form.password) {
        // Generic message — does not reveal whether the doctor account exists
        setAuthError('Invalid doctor credentials. Please try again.');
        return;
      }
      const doctor = window.findDoctor(account.doctorId);
      if (!doctor) {
        // The account exists but staff removed the doctor from the directory
        setAuthError('This doctor account is no longer active. Please contact the administrator.');
        return;
      }
      // Credentials verified — the emailed code is the next gate
      setPendingDoc({ doctorId: account.doctorId, email: em, name: doctor.name });
    }, 700);
  };

  const finishLogin = () => {
    store.loginDoctor(pendingDoc);
    store.setRole('doctor');
    setPendingDoc(null);
    navigate('/doctor/dashboard');
  };

  return (
    <div className="auth-shell">
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" reverse duration={0.7}>
      <div className="auth-visual-col auth-visual-col--forgot" style={{ order: 0 }}>
        <div className="auth-aurora" aria-hidden="true"><Aurora colorStops={['#60A5FA', '#E0F2FE', '#3B82F6']} amplitude={1.1} speed={0.6} blend={0.7} /></div>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"My day, my patients, my notes — all in one place, so clinic time goes to care."</div>
          <div className="attrib">MedicaCare · Doctor portal</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          © 2026 MedicaCare
        </div>
      </div>
      </AnimatedContent>
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" duration={0.7}>
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div>
            <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginLeft: -10, marginBottom: 16 }}>
              <Icon name="arrow-left" size={16} /> Back to home
            </button>
          </div>
          <div className="brand">
            <BrandMark size={36} />
            <div>
              <div style={{ fontWeight: 600 }}>MedicaCare</div>
              <div className="t-muted" style={{ fontSize: 12 }}>Doctor portal</div>
            </div>
          </div>
          <SplitText tag="h1" text="Doctor sign in" splitType="chars" delay={30} duration={0.9} textAlign="left" rootMargin="0px" />
          <AnimatedContent distance={20} duration={0.5} delay={0.55}>
            <p className="sub">See your schedule and complete visits with your own notes.</p>
          </AnimatedContent>

          {removed && (
            <div role="alert" style={{ background: 'var(--warning-soft)', border: '1px solid #F1D9A7', color: 'var(--warning-text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="alert-circle" size={16} style={{ marginTop: 1 }} />
              <div>Your doctor account is no longer active. It may have been removed by clinic staff — please contact the administrator if you believe this is a mistake.</div>
            </div>
          )}
          {authError && (
            <div role="alert" style={{ background: 'var(--error-soft)', border: '1px solid #FCA5A5', color: 'var(--error-text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="alert-circle" size={16} style={{ marginTop: 1 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={submit} className="form-stack" noValidate>
            <Field label="Doctor email" required error={errors.email}>
              <TextInput type="email" placeholder="doctor@medicacare.ph" value={form.email}
                onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
            </Field>
            <Field label="Password" required error={errors.password}>
              <TextInput type="password" placeholder="Enter your password" value={form.password}
                onChange={e => update('password', e.target.value)} error={errors.password} />
            </Field>

            <button type="submit" className={`btn btn-primary lg ${loading ? 'btn-loading' : ''}`}>
              Sign in to doctor portal
            </button>

            <div className="footer-link">
              Patient? <a href="#/login">Use the patient portal instead</a>
            </div>
          </form>

          <div className={`demo-accounts ${demoOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="demo-accounts-toggle"
              aria-expanded={demoOpen}
              onClick={() => setDemoOpen(o => !o)}
            >
              <span className="demo-accounts-title">Demo account: click to use</span>
              <Icon name="chevron-down" size={14} />
            </button>
            {demoOpen && (
              <button type="button" className="demo-account" onClick={() => {
                setForm({ email: DOCTOR_CREDENTIALS.email, password: DOCTOR_CREDENTIALS.password });
                setErrors({}); setAuthError(null);
              }}>
                <span className="avatar sm neutral">{window.initials((window.findDoctor(DOCTOR_CREDENTIALS.doctorId) || {}).name)}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{DOCTOR_CREDENTIALS.email}</span>
                  <span className="t-muted" style={{ display: 'block', fontSize: 11 }}>Password: {DOCTOR_CREDENTIALS.password}</span>
                </span>
                <span className="demo-account-role">Doctor</span>
              </button>
            )}
          </div>
        </div>
      </div>
      </AnimatedContent>

      {/* Step 2 — the emailed 6-character code before the portal opens;
          the session is only created from onVerified */}
      <OtpVerifyModal
        open={!!pendingDoc}
        onClose={() => setPendingDoc(null)}
        onVerified={finishLogin}
        email={pendingDoc ? pendingDoc.email : ''}
        title="Verify doctor sign-in"
        subtitle={`Enter the code sent to ${pendingDoc ? pendingDoc.email : 'your email'} to open the doctor portal.`}
      />
    </div>
  );
}

export { DoctorLogin };
