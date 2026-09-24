// AdminLogin — public (split from screens-public.jsx)
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
import { DoctorLogin } from './DoctorLogin.jsx';
import { ForgotPassword } from './ForgotPassword.jsx';

// ---------- Admin login (staff console) ----------
// Separate, unlinked login for hospital staff/admin. Kept off the public
// patient login on purpose — patients never see staff entry points, and the
// admin console routes are guarded so this page is the only way in.
// NOTE: prototype-only. A real backend must verify staff credentials
// server-side and enforce role checks on every API request.
const ADMIN_CREDENTIALS = { email: 'admin@medicacare.ph', password: 'admin123' };

function AdminLogin() {
  const store = useStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Step 2 of staff login (prototype demo): the emailed 6-character code
  // gates the console — the session is only created from onVerified
  const [otpOpen, setOtpOpen] = useState(false);

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); setAuthError(null); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.email.trim()) e.email = 'Staff email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid staff email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setLoading(false);
      const em = form.email.toLowerCase().trim();
      if (em === ADMIN_CREDENTIALS.email && form.password === ADMIN_CREDENTIALS.password) {
        // Credentials verified — the emailed code is the next gate
        setOtpOpen(true);
      } else {
        // Generic message — does not reveal whether the staff account exists
        setAuthError('Invalid staff credentials. Please try again.');
      }
    }, 700);
  };

  const finishLogin = () => {
    store.loginAdmin({ email: ADMIN_CREDENTIALS.email, name: CURRENT_ADMIN.name, role: CURRENT_ADMIN.role });
    store.setRole('admin');
    setOtpOpen(false);
    navigate('/admin/dashboard');
  };

  // Demo account shortcut — kept here (not on the public login) so demos stay
  // easy while the public patient login stays clean.
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="auth-shell">
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" reverse duration={0.7}>
      <div className="auth-visual-col auth-visual-col--forgot" style={{ order: 0 }}>
        <div className="auth-aurora" aria-hidden="true"><Aurora colorStops={['#60A5FA', '#E0F2FE', '#3B82F6']} amplitude={1.1} speed={0.6} blend={0.7} /></div>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Behind every smooth appointment is a team that keeps the whole clinic in sync."</div>
          <div className="attrib">MedicaCare · Staff console</div>
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
              <div className="t-muted" style={{ fontSize: 12 }}>Staff console</div>
            </div>
          </div>
          <SplitText tag="h1" text="Staff sign in" splitType="chars" delay={30} duration={0.9} textAlign="left" rootMargin="0px" />
          <AnimatedContent distance={20} duration={0.5} delay={0.55}>
            <p className="sub">Restricted access for authorized hospital staff only.</p>
          </AnimatedContent>

          {authError && (
            <div role="alert" style={{ background: 'var(--error-soft)', border: '1px solid #FCA5A5', color: 'var(--error-text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="alert-circle" size={16} style={{ marginTop: 1 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={submit} className="form-stack" noValidate>
            <Field label="Staff email" required error={errors.email}>
              <TextInput type="email" placeholder="staff@medicacare.ph" value={form.email}
                onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
            </Field>
            <Field label="Password" required error={errors.password}>
              <TextInput type="password" placeholder="Enter your password" value={form.password}
                onChange={e => update('password', e.target.value)} error={errors.password} />
            </Field>

            <button type="submit" className={`btn btn-primary lg ${loading ? 'btn-loading' : ''}`}>
              Sign in to console
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
                setForm({ email: ADMIN_CREDENTIALS.email, password: ADMIN_CREDENTIALS.password });
                setErrors({}); setAuthError(null);
              }}>
                <span className="avatar sm neutral">HC</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{ADMIN_CREDENTIALS.email}</span>
                  <span className="t-muted" style={{ display: 'block', fontSize: 11 }}>Password: {ADMIN_CREDENTIALS.password}</span>
                </span>
                <span className="demo-account-role">Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
      </AnimatedContent>

      {/* Step 2 — the emailed 6-character code before the console opens */}
      <OtpVerifyModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerified={finishLogin}
        email={ADMIN_CREDENTIALS.email}
        title="Verify staff sign-in"
        subtitle={`Enter the code sent to ${ADMIN_CREDENTIALS.email} to open the admin console.`}
      />
    </div>
  );
}

export { ADMIN_CREDENTIALS, AdminLogin };
