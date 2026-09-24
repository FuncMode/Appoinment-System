// TermsPage — public (split from screens-public.jsx)
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
import { Register } from './Register.jsx';
import { Login } from './Login.jsx';
import { ADMIN_CREDENTIALS, AdminLogin } from './AdminLogin.jsx';
import { DoctorLogin } from './DoctorLogin.jsx';
import { ForgotPassword } from './ForgotPassword.jsx';

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sub="The ground rules for using the MedicaCare patient portal and booking system."
      updated="September 2026"
      sections={[
        { h: 'Using the portal', p: 'The patient portal is provided for scheduling appointments, viewing your own records, and communicating with hospital staff. You agree to provide accurate registration details and to keep your login credentials confidential.' },
        { h: 'Appointments & cancellations', p: 'Appointment slots are confirmed on a first-come, first-served basis. Please cancel or reschedule at least 24 hours in advance so the slot can be offered to other patients.' },
        { h: 'Medical disclaimer', p: 'Content on this website is for general information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your physician regarding your condition. In an emergency, go directly to the Emergency Room or call our hotline.' },
        { h: 'Acceptable use', p: 'You may not use the portal to transmit unlawful, abusive, or fraudulent content, attempt to access other patients\' records, or interfere with the operation of the system.' },
        { h: 'Fees & billing', p: 'Consultation fees shown on this site are indicative and may change without prior notice. HMO coverage depends on your provider\'s terms and is verified at the time of the visit.' },
        { h: 'Changes to these terms', p: 'MedicaCare may update these terms from time to time. Continued use of the portal after an update constitutes acceptance of the revised terms.' },
      ]}
    />
  );
}

export { TermsPage };
