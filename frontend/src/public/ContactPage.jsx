// ContactPage — public (split from screens-public.jsx)
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
import { LegalPage } from './LegalPage.jsx';
import { PrivacyPage } from './PrivacyPage.jsx';
import { TermsPage } from './TermsPage.jsx';
import { Register } from './Register.jsx';
import { Login } from './Login.jsx';
import { ADMIN_CREDENTIALS, AdminLogin } from './AdminLogin.jsx';
import { DoctorLogin } from './DoctorLogin.jsx';
import { ForgotPassword } from './ForgotPassword.jsx';

// ---------- Contact page ----------
function ContactPage() {
  const store = useStore();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter your name';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.message.trim()) e.message = 'Please write your message';
    else if (form.message.trim().length < 10) e.message = 'Please provide a bit more detail (10+ characters)';
    setErrors(e);
    if (Object.keys(e).length) return;

    // Demo build — no backend; acknowledge via toast only
    store.pushToast({
      title: 'Message sent',
      msg: `Thanks, ${form.name.trim().split(' ')[0]}! Our team will get back to you within 1–2 business days.`,
    });
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div>
      <PublicNav activeLink="contact" />
      <section className="public-hero page-hero">
        <HeroAurora />
        <div className="public-hero-inner">
          <HeroTitle>Contact us</HeroTitle>
          {/* maxWidth 600 overrides the 480px hero-paragraph cap so the line
              stays on one line, and the bottom margin restores the gap the
              page-hero variant removes so the status pill doesn't touch the
              text (Contact is the only page-hero with a pill after the sub) */}
          <p className="public-hero-sub" style={{ maxWidth: 600, marginBottom: 14 }}>
            Questions about appointments, billing, or services? We're happy to help.
          </p>
          <ClinicStatus />
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner contact-cols">
          <div className="contact-info-list">
            {[
              { icon: 'map-pin', title: 'Address', body: HOSPITAL.address },
              { icon: 'phone', title: 'Phone', body: HOSPITAL.phone },
              { icon: 'mail', title: 'Email', body: HOSPITAL.email },
              { icon: 'clock', title: 'Hours', body: <>Mon–Sat: 7:00 AM – 8:00 PM · Sun: 8:00 AM – 5:00 PM<br />Emergency: 24/7</> },
            ].map(c => (
              <div key={c.title} className="contact-info-row">
                <div className="feature-card-icon" style={{ marginTop: 1 }}><Icon name={c.icon} size={18} /></div>
                <div>
                  <div className="contact-info-title">{c.title}</div>
                  <div className="contact-info-body">{c.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Send us a message</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Fill out the form and our staff will respond via email.
            </p>
            <form onSubmit={submit} className="form-stack" noValidate>
              <Field label="Full name" required error={errors.name}>
                <TextInput placeholder="Juan Dela Cruz" value={form.name}
                  onChange={e => update('name', e.target.value)} error={errors.name} />
              </Field>
              <Field label="Email address" required error={errors.email}>
                <TextInput type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
              </Field>
              <Field label="Message" required error={errors.message}>
                <TextArea rows={5} placeholder="How can we help you?" value={form.message}
                  onChange={e => update('message', e.target.value)} error={errors.message} />
              </Field>
              <button type="submit" className="btn btn-primary">Send message</button>
            </form>
          </div>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 0 }}>
        <div className="public-section-inner">
          <h2>Find us</h2>
          <p className="public-section-sub">
            We're along Rizal Avenue, a few minutes' walk from the LRT-2 Anonas station.
            Parking is available for patients and visitors.
          </p>
          {/* Plain framed map — the hover glare was decorative (ui-guidelines §3);
              the frame below carries the same surface/border/radius it had */}
          <div
            className="glare-map"
            style={{ width: '100%', height: 360, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
          >
            <iframe
              title="Map: MedicaCare location"
              src="https://www.openstreetmap.org/export/embed.html?bbox=121.02200%2C14.62500%2C121.04200%2C14.63500&layer=mapnik&marker=14.63000%2C121.03200"
              style={{ width: '100%', height: 360, border: 0 }}
              loading="lazy"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              <Icon name="map-pin" size={14} /> {HOSPITAL.address}
            </div>
            <a
              href="https://www.openstreetmap.org/?mlat=14.63000&mlon=121.03200#map=16/14.63000/121.03200"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}
            >
              Open larger map
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

export { ContactPage };
