// LegalPage — public (split from screens-public.jsx)
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
import { PrivacyPage } from './PrivacyPage.jsx';
import { TermsPage } from './TermsPage.jsx';
import { Register } from './Register.jsx';
import { Login } from './Login.jsx';
import { ADMIN_CREDENTIALS, AdminLogin } from './AdminLogin.jsx';
import { DoctorLogin } from './DoctorLogin.jsx';
import { ForgotPassword } from './ForgotPassword.jsx';

// ---------- Privacy / Terms pages ----------
function LegalPage({ title, sub, updated, sections }) {
  return (
    <div>
      <PublicNav activeLink="" />
      <section className="public-hero page-hero">
        <HeroAurora />
        <div className="public-hero-inner">
          <HeroTitle>{title}</HeroTitle>
          <p className="public-hero-sub">{sub}</p>
        </div>
      </section>
      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner" style={{ maxWidth: 760 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>Last updated: {updated}</p>
          {sections.map(s => (
            <div key={s.h} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>{s.h}</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{s.p}</p>
            </div>
          ))}
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Questions about this page? <a href="#/contact" style={{ color: 'var(--primary)', fontWeight: 500 }}>Contact us</a>.
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

export { LegalPage };
