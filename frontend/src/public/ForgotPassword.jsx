// ForgotPassword — public (split from screens-public.jsx)
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
import { DoctorLogin } from './DoctorLogin.jsx';

// ---------- Forgot password ----------
function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (evt) => {
    evt.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address'); return; }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 800);
  };

  return (
    <div className="auth-shell">
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" reverse duration={0.7}>
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div>
            <button className="btn btn-ghost" onClick={() => navigate('/login')} style={{ marginLeft: -10, marginBottom: 16 }}>
              <Icon name="arrow-left" size={16} /> Back to log in
            </button>
          </div>
          <div className="brand">
            <BrandMark size={36} />
            <div>
              <div style={{ fontWeight: 600 }}>MedicaCare</div>
              <div className="t-muted" style={{ fontSize: 12 }}>Patient portal</div>
            </div>
          </div>
          <SplitText tag="h1" text="Forgot password" splitType="chars" delay={30} duration={0.9} textAlign="left" rootMargin="0px" />
          <AnimatedContent distance={20} duration={0.5} delay={0.55}>
            <p className="sub">Enter the email linked to your account and we'll send you a reset link.</p>
          </AnimatedContent>

          {sent ? (
            <div>
              <div role="status" style={{ background: 'var(--success-soft, #ECFDF5)', border: '1px solid #6EE7B7', color: '#047857', padding: '12px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
                <Icon name="check-circle-2" size={16} style={{ marginTop: 1 }} />
                <div>
                  If an account exists for <strong>{email}</strong>, a password reset link is on its way.
                  Please check your inbox (and spam folder).
                </div>
              </div>
              <div className="footer-link">
                Didn't get it? <a href="#/forgot-password">Resend</a> or <a href="#/login">Back to log in</a>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="form-stack" noValidate>
              <Field label="Email address" required error={error}>
                <TextInput type="email" placeholder="you@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError(null); }} error={error} icon="mail" />
              </Field>

              <button type="submit" className={`btn btn-primary lg ${loading ? 'btn-loading' : ''}`}>
                Send reset link
              </button>

              <div className="footer-link">
                Remembered it? <a href="#/login">Log in</a>
              </div>
            </form>
          )}
        </div>
      </div>
      </AnimatedContent>

      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" duration={0.7}>
      <div className="auth-visual-col auth-visual-col--forgot">
        <div className="auth-aurora" aria-hidden="true"><Aurora colorStops={['#60A5FA', '#E0F2FE', '#3B82F6']} amplitude={1.1} speed={0.6} blend={0.7} /></div>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Your health records, appointments, and prescriptions: all in one secure place."</div>
          <div className="attrib">MedicaCare</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          © 2026 MedicaCare
        </div>
      </div>
      </AnimatedContent>
    </div>
  );
}

export { ForgotPassword };
