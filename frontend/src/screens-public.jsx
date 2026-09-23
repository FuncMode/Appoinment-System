import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, BrandMark, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart, DoctorRatingPill, PwField,
  NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel,
  OtpVerifyModal,
} from './components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN, DOCTOR_CREDENTIALS,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
} from './data.js';
import Aurora from './reactbits/Aurora.jsx';
import ShinyText from './reactbits/ShinyText.jsx';
import CountUp from './reactbits/CountUp.jsx';
import SplitText from './reactbits/SplitText.jsx';
import AnimatedContent from './reactbits/AnimatedContent.jsx';
import Magnet from './reactbits/Magnet.jsx';
import ScrollVelocity from './reactbits/ScrollVelocity.jsx';
import StarBorder from './reactbits/StarBorder.jsx';
import GlareHover from './reactbits/GlareHover.jsx';  // hero preview card only — the one deliberate hover flourish
import Ribbons from './reactbits/Ribbons.jsx';


// ============================================================
// React Bits — shared public-page flourishes
// ============================================================

// Aurora WebGL wash behind every public hero (Landing + subpages share the
// .public-hero pattern). Brand-blue color stops keep it on-palette; the
// wrapper's positioning/opacity lives in styles.css (.public-hero-aurora).
// aria-hidden + pointer-events:none keep it purely decorative.
function HeroAurora() {
  return (
    <div className="public-hero-aurora" aria-hidden="true">
      <Aurora colorStops={['#2563EB', '#7CC0FF', '#2563EB']} amplitude={0.9} blend={0.6} speed={0.7} />
    </div>
  );
}

// Shiny sweep for hero titles — one treatment across every public page so
// the headings read as a family (dark ink with a brand-blue glint). The
// `light` variant swaps to white ink for the Landing's photo hero, where
// dark text would be unreadable over the blue overlay. The shine uses a
// near-white blue (not #7CC0FF): mid-sweep, pale blue letters on the blue
// veil dropped to ~2.5:1 contrast — the paler shine keeps the shimmer
// readable at every point of the animation.
function HeroTitle({ children, light = false }) {
  return (
    <h1>
      <ShinyText
        text={children}
        speed={4}
        color={light ? '#FFFFFF' : '#111827'}
        shineColor={light ? '#CFE3FF' : '#2563EB'}
        spread={120}
      />
    </h1>
  );
}

// ============================================================
// Public screens — Landing / Register / Login
// ============================================================

// "Find the right care" symptom guide (Cleveland-Clinic-style care finder).
// Maps common complaints to the specialty that treats them — pulls live
// doctor counts from the seed data so results stay accurate.
const CARE_GUIDE = [
  { symptom: 'Chest pain or palpitations', specialty: 'Cardiology' },
  { symptom: "Child's fever or check-up", specialty: 'Pediatrics' },
  { symptom: 'Skin, acne, or allergy issues', specialty: 'Dermatology' },
  { symptom: 'Migraines or numbness', specialty: 'Neurology' },
  { symptom: 'Pregnancy or women’s health', specialty: 'OB-GYN' },
  { symptom: 'Bone or joint pain', specialty: 'Orthopedics' },
  { symptom: 'Ear, nose, or throat problems', specialty: 'ENT' },
  { symptom: 'Anxiety or mental health', specialty: 'Psychiatry' },
  { symptom: 'Diabetes or hypertension', specialty: 'Internal Medicine' },
  { symptom: 'General annual check-up', specialty: 'Family Medicine' },
];

// Prototype testimonial stories — shown on the Landing "What patients say"
// carousel as clearly labeled fiction while no real patient stories have been
// approved yet (labeled on the card AND in the section copy, per R-18: never
// present invented reviews as real social proof). Once real stories are
// approved via the portal → admin moderation flow, they replace these
// entirely — the two are never mixed in one carousel (DESIGN.md).
const PROTOTYPE_STORIES = [
  { quote: 'Booking my cardiology follow-up used to take a whole afternoon of phone calls. Now I do it in two taps before work.', who: 'Sofia R. · fictional patient story' },
  { quote: "I booked my son's pediatric check-up after my night shift and had a confirmation before I even got home.", who: 'Marco T. · fictional parent story' },
  { quote: "Rescheduling used to mean three phone calls and crossing my fingers. Now it's two taps and done.", who: 'Andrea L. · fictional patient story' },
];

// Homepage FAQ — expandable accordion (Cleveland-Clinic-style FAQ section)
const LANDING_FAQS = [
  { q: 'Do I need an account to book an appointment?', a: 'Yes. Create a free patient account first so your bookings, records, and reminders live in one secure place. Registration takes under a minute.' },
  { q: 'How much is a consultation?', a: 'Consultation fees start at ₱1,000 for Family Medicine and vary by specialty (e.g., ₱1,800 for Cardiology). The exact fee is shown on every doctor’s profile.' },
  { q: 'Do you accept HMO?', a: 'Yes, we work with major HMO providers. Coverage depends on your provider’s terms and is verified at the time of your visit.' },
  { q: 'Can I reschedule or cancel my appointment?', a: 'Absolutely. Reschedule or cancel from your patient portal at least 24 hours in advance so the slot can be offered to other patients.' },
  { q: 'What should I bring on my first visit?', a: 'A valid ID, your HMO card (if any), and a list of medications you currently take. Your registration details are already in our system when you book online.' },
];

// Services-page FAQ — expandable accordion
const SERVICES_FAQS = [
  { q: 'Do I need an appointment for laboratory tests?', a: 'Walk-ins are accepted for routine labs (CBC, urinalysis, fasting blood sugar) before 10:00 AM. Booking online guarantees a slot and shorter wait.' },
  { q: 'How long do lab and imaging results take?', a: 'Most routine lab results are released the same day. Imaging reads (X-ray, ultrasound, ECG) are typically ready within 24–48 hours.' },
  { q: 'Do you accept walk-in consultations?', a: 'Yes, subject to the doctor’s schedule for the day. Booked patients are prioritized, so we recommend reserving a slot through the portal.' },
  { q: 'Is there a package for annual physical exams?', a: 'Yes. Executive check-up bundles are tailored to your age and risk profile. Call our hotline or send a message for current package rates.' },
  { q: 'How does HMO assistance work?', a: 'Present your HMO card at the billing counter. Our staff verifies eligibility and processes the claim directly with your provider so you focus on recovery.' },
];

function Landing() {
  const store = useStore();
  // Real approved patient stories replace the prototype stories once they
  // exist; the two are never shown together in one carousel
  const approvedStories = store.testimonials.filter(t => t.status === 'approved');
  // Hero "portal preview" card mirrors the demo patient's next confirmed
  // appointment from the seed data, so the marketing visual always stays
  // in sync with what the portal actually shows after login.
  const previewAppt = APPOINTMENTS
    .filter(a => a.patientId === CURRENT_PATIENT.id && a.status === 'confirmed')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const previewDoc = previewAppt ? window.findDoctor(previewAppt.doctorId) : null;
  const previewDate = previewAppt ? new Date(previewAppt.date + 'T00:00:00') : null;

  // "Find the right care" widget — selected symptom chip (Cleveland-Clinic-style)
  const [pickedSymptom, setPickedSymptom] = useState(null);
  const pickedGuide = CARE_GUIDE.find(g => g.symptom === pickedSymptom) || null;
  const pickedDoctors = pickedGuide
    ? DOCTORS.filter(d => d.specialty === pickedGuide.specialty && d.status === 'available').length
    : 0;

  // Mobile: the stacked full-width chips push the result panel below the
  // fold, so picking a lower chip left the recommendation unseen — bring the
  // panel into view whenever it renders outside the viewport. The in-view
  // check keeps desktop quiet (the panel already sits beside the chips).
  const carePanelRef = useRef(null);
  useEffect(() => {
    if (!pickedGuide || !carePanelRef.current) return;
    const rect = carePanelRef.current.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      carePanelRef.current.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
  }, [pickedSymptom]);

  return (
    <div>
      <NoticeBar phone={HOSPITAL.phone} />
      <PublicNav activeLink="home" />

      {/* Landing-only photo hero (public-hero--photo): auto-crossfading
          photo slides behind a blue veil — replaces the Aurora wash used on
          the subpages. Decorative only: aria-hidden, no indicators. */}
      <section className="public-hero public-hero--photo">
        <div className="public-hero-slides" aria-hidden="true">
          <div className="hero-slide s1" />
          <div className="hero-slide s2" />
          <div className="hero-slide s3" />
        </div>
        <div className="public-hero-veil" aria-hidden="true" />
        <div className="public-hero-inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <div className="badge badge-primary">
                <span className="badge-dot" /> Now accepting new patients
              </div>
              <ClinicStatus />
            </div>
            <HeroTitle light>Book a MedicaCare specialist online, no phone calls needed.</HeroTitle>
            <p>Pick from {DOCTORS.length} board-certified doctors across {SPECIALTIES.length} departments,
               view real-time availability, and get a confirmation in minutes. Reschedule anytime from your portal.</p>
            <div className="public-hero-actions">
              {/* White CTA — the blue-on-blue primary would vanish against the
                  photo's blue overlay */}
              <StarBorder
                as="a"
                href="#/register"
                color="#2563EB"
                backgroundColor="#FFFFFF"
                textColor="var(--primary)"
                borderColor="#93C5FD"
                speed="5s"
                thickness={1}
                className="star-border-cta"
              >
                Create patient account
              </StarBorder>
              <a className="btn btn-secondary lg" href="#/login">Log in</a>
            </div>
          </div>

          <div className="public-hero-visual">
            {/* Portal preview — built from the demo patient's real next appointment */}
            {previewAppt && previewDoc && (
              <>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.78)', marginBottom: 8, textAlign: 'right' }}>
                  A peek at your patient portal
                </div>
                <GlareHover
                  width="100%"
                  height="auto"
                  background="#fff"
                  borderColor="var(--border)"
                  borderRadius="10px"
                  glareColor="#93C5FD"
                  glareOpacity={0.3}
                  glareSize={200}
                  className="glare-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Next appointment</div>
                    <StatusBadge status={previewAppt.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <DoctorAvatar doctor={previewDoc} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{previewDoc.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{previewDoc.specialty} · {previewDoc.room}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="calendar" size={13} />
                      {previewDate.toLocaleDateString('en-US', { weekday: 'short' })}, {previewDate.toLocaleDateString('en-US', { month: 'short' })} {previewDate.getDate()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="clock" size={13} /> {previewAppt.time}</div>
                  </div>
                </GlareHover>
              </>
            )}
            {/* Quiet reassurance microcopy — cost / payment / wait answered up
                front; centered under the preview card to balance the column */}
            <div className="public-hero-microcopy">
              <span><Icon name="check" size={13} /> Free to create</span>
              <span><Icon name="check" size={13} /> No credit card needed</span>
              <span><Icon name="check" size={13} /> Confirmed in minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust ticker — React Bits ScrollVelocity. aria-hidden: decorative repeat. */}
      <div className="trust-ticker" aria-hidden="true">
        <ScrollVelocity
          texts={['HMO-friendly · 24/7 emergency care · Online booking, no phone calls · Real-time doctor availability']}
          velocity={40}
          numCopies={6}
          className="trust-ticker-text"
        />
      </div>

      <section className="public-section" style={{ background: 'var(--bg)' }}>
        <div className="public-section-inner">
          <div>
            <span className="section-kicker">Find your care</span>
            <h2>Not sure where to go for care?</h2>
            <p className="public-section-sub">Pick the symptom closest to what you're feeling and we'll point you to the right specialist.</p>
            <div className="chip-group care-chips">
              {CARE_GUIDE.map(g => (
                <button
                  key={g.symptom}
                  className={`chip ${pickedSymptom === g.symptom ? 'on' : ''}`}
                  onClick={() => setPickedSymptom(pickedSymptom === g.symptom ? null : g.symptom)}
                >
                  {g.symptom}
                </button>
              ))}
            </div>
            {pickedGuide && (
              <div className="care-finder-panel" ref={carePanelRef}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    We recommend our <span style={{ color: 'var(--primary)' }}>{pickedGuide.specialty}</span> department
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {pickedDoctors > 0
                      ? `${pickedDoctors} available specialist${pickedDoctors === 1 ? '' : 's'} right now. Bookings open as early as this week.`
                      : 'Specialists are currently busy or on leave. You can still browse their profiles and check schedules.'}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a className="btn btn-primary" href={`#/doctors?spec=${encodeURIComponent(pickedGuide.specialty)}`}>
                      See {pickedGuide.specialty} doctors
                    </a>
                    <a className="btn btn-secondary" href="#/contact">Ask our staff instead</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner">
          <span className="section-kicker">Getting started</span>
          <h2>How it works</h2>
          <p className="public-section-sub">Three straightforward steps to see a doctor at MedicaCare.</p>
          {/* Numbered rail instead of the default 3-card grid (R-05): the steps
              are a sequence, so the composition shows order and progression. */}
          <ol className="how-steps">
            <li>
              <span className="how-step-num">1</span>
              <div>
                <h3>Create your account</h3>
                <p>Register in under a minute with your name, email, and phone number. No paperwork.</p>
              </div>
            </li>
            <li>
              <span className="how-step-num">2</span>
              <div>
                <h3>Find your doctor</h3>
                <p>Browse specialists by department, check real-time availability, and pick a time that works.</p>
              </div>
            </li>
            <li>
              <span className="how-step-num">3</span>
              <div>
                <h3>Get confirmed</h3>
                <p>Our staff confirms your booking within minutes, with reminders and easy rescheduling, all in your portal.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 32 }}>
        <div className="public-section-inner">
          <span className="section-kicker">Our departments</span>
          <h2>Departments</h2>
          <p className="public-section-sub">Tap a department to see its specialists.</p>
          <div className="grid-4">
            {/* Arrow kept deliberately: it signals "this chip navigates to the
                filtered doctors list", which is exactly where it goes (R-08) */}
            {SPECIALTIES.map(s => (
              <button key={s} className="dept-chip" onClick={() => navigate(`/doctors?spec=${encodeURIComponent(s)}`)}>
                {s}
                <Icon name="arrow-right" size={14} className="dept-arrow" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section" style={{ background: 'var(--bg)', paddingTop: 32 }}>
        <div className="public-section-inner">
          <span className="section-kicker">Patient stories</span>
          <h2>What patients say</h2>
          <p className="public-section-sub">
            {approvedStories.length > 0
              ? 'Stories shared by patients from the MedicaCare portal, reviewed by our staff before publishing.'
              : 'Fictional stories written for this prototype to show what booking with MedicaCare feels like.'}
          </p>
          <TestimonialCarousel
            items={approvedStories.length > 0
              ? approvedStories.map(t => ({ quote: t.quote, who: `${t.displayName} · patient` }))
              : PROTOTYPE_STORIES}
          />
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner public-section--centered">
          <span className="section-kicker">Before you book</span>
          <h2>Common questions</h2>
          <p className="public-section-sub">Quick answers before you create your account.</p>
          <FaqAccordion items={LANDING_FAQS} />
        </div>
      </section>

      <section className="public-section public-section--cta" style={{ paddingTop: 32 }}>
        {/* Ribbons layer — React Bits WebGL ribbons follow the cursor across the
            empty CTA backdrop; brand-blue palette at low opacity. The layer
            sits under the content (see .public-section--cta in styles.css). */}
        <div className="cta-ribbons" aria-hidden="true">
          <Ribbons colors={['#93C5FD', '#2563EB', '#7CC0FF']} baseThickness={20} speedMultiplier={0.5} />
        </div>
        <div className="public-section-inner" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Ready to book your first visit?</h2>
          <p className="public-section-sub" style={{ maxWidth: 520, margin: '0 auto 24px' }}>
            Create a free account, pick a specialist, and choose a slot that fits your schedule.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Magnet padding={40} magnetStrength={3}>
              <a className="btn btn-primary lg" href="#/register">Create patient account</a>
            </Magnet>
            <a className="btn btn-secondary lg" href="#/doctors">Browse doctors</a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

// ---------- Services page ----------
function ServicesPage() {
  const services = [
    { icon: 'stethoscope', title: 'General & specialty consultations', desc: 'Board-certified physicians across 10 specialties, from family medicine to neurology.' },
    { icon: 'calendar-check', title: 'Online appointment booking', desc: 'Pick a doctor, choose an open time slot, and get instant confirmation, no phone calls needed.' },
    { icon: 'activity', title: 'Laboratory & diagnostics', desc: 'Complete blood work, urinalysis, and other routine labs with same-day results for most tests.' },
    { icon: 'search', title: 'Imaging services', desc: 'X-ray, ultrasound, and ECG performed by licensed technologists and read by our radiologists.' },
    { icon: 'check-circle-2', title: 'Executive check-up packages', desc: 'Comprehensive annual physical exam bundles tailored to your age and risk profile.' },
    { icon: 'shield-check', title: 'HMO & insurance assistance', desc: 'We process claims with major HMO providers so you can focus on getting better.' },
  ];
  return (
    <div>
      <PublicNav activeLink="services" />
      <section className="public-hero page-hero">
        <HeroAurora />
        <div className="public-hero-inner">
          <HeroTitle>Our services</HeroTitle>
          <p className="public-hero-sub">Everything you need for outpatient care, all in one medical center.</p>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner">
          {/* First card spans two columns: consultations are the primary
              offering; the rest are supporting services (R-14 hierarchy
              reason, written down). Plain card — no cursor-glow spotlight:
              the hover border/lift is the whole interaction (DESIGN.md
              MOTION 1, ui-guidelines §3). */}
          <div className="feature-grid">
            {services.map((s, i) => (
              <div
                className={`feature-card${i === 0 ? ' feature-card--featured' : ''}`}
                key={s.title}
              >
                <div className="feature-card-icon"><Icon name={s.icon} size={18} /></div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section" style={{ background: 'var(--bg)', paddingTop: 32 }}>
        <div className="public-section-inner">
          <span className="section-kicker">Find your department</span>
          <h2>Departments & specialties</h2>
          <p className="public-section-sub">Tap a department to see its specialists.</p>
          <div className="grid-4">
            {SPECIALTIES.map(s => (
              <button key={s} className="dept-chip" onClick={() => navigate(`/doctors?spec=${encodeURIComponent(s)}`)}>
                {s}
                <Icon name="arrow-right" size={14} className="dept-arrow" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner public-section--centered">
          <span className="section-kicker">Good to know</span>
          <h2>Service FAQs</h2>
          <p className="public-section-sub">Answers to what patients ask us most about our services.</p>
          <FaqAccordion items={SERVICES_FAQS} />
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 32 }}>
        <div className="public-section-inner">
          <h2>Skip the phone queue: book online</h2>
          <p className="public-section-sub">Create a free patient account and see a specialist as early as tomorrow.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Magnet padding={40} magnetStrength={3}>
              <a className="btn btn-primary" href="#/register">Create patient account</a>
            </Magnet>
            <a className="btn btn-secondary" href="#/doctors">Browse doctors</a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

// ---------- Doctors page ----------
const MOBILE_DOCTORS_QUERY = '(max-width: 720px)';
const MOBILE_DOCTORS_PAGE_SIZE = 6;

function DoctorsPage({ initialSpecialty = '' }) {
  const store = useStore();
  // Simulated fetch — skeleton cards while "loading", same 600ms pattern as
  // the patient Doctor Listing
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  // Pre-filtered when navigated here with a specialty (e.g. #/doctors?spec=Cardiology
  // from the Landing care finder or department chips); defaults to "all".
  const [specialty, setSpecialty] = useState(
    SPECIALTIES.includes(initialSpecialty) ? initialSpecialty : 'all'
  );
  const [avail, setAvail] = useState('all');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_DOCTORS_QUERY).matches);
  // Selected doctor for the profile preview modal (ZocDoc-style quick view)
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_DOCTORS_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Reset to the first page whenever the layout mode or filters change so the
  // selected page is never out of range for the current result set.
  useEffect(() => { setPage(1); }, [isMobile, query, specialty, avail]);

  // Follow the specialty deep link when it changes while the page is already
  // mounted (e.g. /doctors?spec=Cardiology → plain /doctors clears the filter).
  // Manual dropdown changes don't re-trigger this because the prop stays put.
  useEffect(() => {
    setSpecialty(SPECIALTIES.includes(initialSpecialty) ? initialSpecialty : 'all');
  }, [initialSpecialty]);

  const filtered = useMemo(() => (
    DOCTORS.filter(d => {
      if (query) {
        const hay = (d.name + ' ' + d.specialty).toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      if (specialty !== 'all' && d.specialty !== specialty) return false;
      if (avail !== 'all' && d.status !== avail) return false;
      return true;
    })
  ), [query, specialty, avail]);

  const visibleDoctors = isMobile
    ? filtered.slice((page - 1) * MOBILE_DOCTORS_PAGE_SIZE, page * MOBILE_DOCTORS_PAGE_SIZE)
    : filtered;

  const clearFilters = () => { setQuery(''); setSpecialty('all'); setAvail('all'); };

  return (
    <div>
      <PublicNav activeLink="doctors" />
      <section className="public-hero page-hero">
        <HeroAurora />
        <div className="public-hero-inner">
          <HeroTitle>Find a doctor</HeroTitle>
          <p className="public-hero-sub">
            {DOCTORS.length} specialists on staff. Availability is updated in real time once you're logged in.
          </p>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner">
          {/* Filter bar — mirrors the patient-side doctor listing filters */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="doctor-filters">
              <div className="input-group doctor-filter-search">
                <Icon name="search" size={16} className="input-icon" />
                <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by name or specialty..." value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <div className="doctor-filter-field">
                <SelectInput value={specialty} onChange={e => setSpecialty(e.target.value)}>
                  <option value="all">All specialties</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </SelectInput>
              </div>
              <div className="doctor-filter-field sm">
                <SelectInput value={avail} onChange={e => setAvail(e.target.value)}>
                  <option value="all">Any availability</option>
                  <option value="available">Available today</option>
                  <option value="busy">Busy today</option>
                  <option value="on-leave">On leave</option>
                </SelectInput>
              </div>
              <div className="doctor-filter-count">
                <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {DOCTORS.length} doctors
              </div>
            </div>
          </div>

          {loading ? (
            // Skeleton doctor cards mirroring the public card layout (32px
            // avatar + name/specialty, rating + status badge, room, then the
            // fee + "View profile" footer) so there is no layout shift when
            // the data lands
            <div className="doctor-grid" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="doctor-card">
                  <div className="doctor-card-head">
                    <span className="skel" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="skel" style={{ width: '75%', height: 13, display: 'block' }} />
                      <span className="skel" style={{ width: '55%', height: 11, display: 'block', marginTop: 6 }} />
                    </div>
                  </div>
                  <div className="doctor-card-meta">
                    <span className="skel" style={{ width: 52, height: 12 }} />
                    <span className="skel" style={{ width: 70, height: 18 }} />
                  </div>
                  <div className="doctor-card-meta">
                    <span className="skel" style={{ width: '70%', height: 12 }} />
                  </div>
                  <div className="doctor-card-footer">
                    <span className="skel" style={{ width: 78, height: 12 }} />
                    <span className="skel" style={{ width: 78, height: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="search-x"
                title={query ? `No doctors match "${query}"` : 'No doctors match your filters'}
                message="Try broadening your search or clearing filters to see more results."
                actions={<button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>}
              />
            </div>
          ) : (
            <div className="doctor-grid">
              {/* Plain wrapper — no entrance animation, same call as the patient
                  portal's doctor grid (DESIGN.md MOTION 1: no scroll-reveal;
                  the frontend-design skill audit removed the staggered card
                  entrances). SpotlightCard is not used here either: its dark
                  demo skin (.card-spotlight) loads after styles.css, so its
                  equal-specificity #111 background wins the cascade and paints
                  the wrapper black. .card-anim stays for the grid's
                  height:100% stretch. */}
              {visibleDoctors.map(d => (
                <div className="card-anim" key={d.id}>
                <div className="doctor-card-wrap">
                  <div
                    className="doctor-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`View profile of ${d.name}`}
                    onClick={() => setSelectedDoctor(d)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDoctor(d); } }}
                  >
                  <div className="doctor-card-head">
                    <DoctorAvatar doctor={d} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="doctor-card-name">{d.name}</div>
                      <div className="doctor-card-spec">{d.specialty} · {d.exp} yrs experience</div>
                    </div>
                  </div>
                  <div className="doctor-card-meta">
                    <DoctorRatingPill ratings={store.ratings} doctorId={d.id} />
                    <DoctorStatusBadge status={d.status} />
                  </div>
                  <div className="doctor-card-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="map-pin" size={13} /> {d.room}
                    </span>
                  </div>
                  <div className="doctor-card-footer">
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>₱{d.fee.toLocaleString()} / consult</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--primary)', fontWeight: 500 }}>
                      View profile
                    </span>
                  </div>
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}

          {isMobile && filtered.length > 0 && (
            <div className="doctors-pager" style={{ marginTop: 24 }}>
              <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={MOBILE_DOCTORS_PAGE_SIZE} label="doctors" />
            </div>
          )}

          {/* R-23 honesty label: portraits are stock placeholders, not real staff */}
          <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={13} /> Doctor photos are placeholder portraits (randomuser.me), not real staff. Ratings shown are prototype demo data; ratings you submit from completed visits are added to them.
          </div>

          <div style={{ marginTop: 32, padding: 24, background: 'var(--primary-soft)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: '1 1 240px' }}>
              <div style={{ fontWeight: 600 }}>Ready to book an appointment?</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Log in or create an account to view real-time availability and reserve a slot.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <Magnet padding={40} magnetStrength={3}>
                <a className="btn btn-primary" href="#/register">Register</a>
              </Magnet>
              <a className="btn btn-secondary" href="#/login">Log in</a>
            </div>
          </div>
        </div>
      </section>

      {/* Doctor profile quick-view (ZocDoc-style) — opens when a card is clicked */}
      <Modal
        open={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        title={selectedDoctor ? selectedDoctor.name : ''}
        subtitle={selectedDoctor ? `${selectedDoctor.specialty} · ${selectedDoctor.exp} years of experience` : ''}
        icon="stethoscope"
        iconKind="info"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setSelectedDoctor(null)}>Close</button>
            <a className="btn btn-primary" href="#/register" onClick={() => setSelectedDoctor(null)}>
              Book with this doctor
            </a>
          </>
        }
      >
        {selectedDoctor && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <DoctorAvatar doctor={selectedDoctor} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <DoctorStatusBadge status={selectedDoctor.status} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
                    <DoctorRatingPill ratings={store.ratings} doctorId={selectedDoctor.id} />
                  </span>
                </div>
              </div>
            </div>
            <div className="detail-row compact">
              <div className="label">Clinic room</div>
              <div className="value">{selectedDoctor.room}</div>
            </div>
            <div className="detail-row compact">
              <div className="label">Consultation fee</div>
              <div className="value" style={{ fontWeight: 600 }}>₱{selectedDoctor.fee.toLocaleString()} / consult</div>
            </div>
            <div className="detail-row compact">
              <div className="label">Department</div>
              <div className="value">{selectedDoctor.specialty}</div>
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
              <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              Portrait shown is a placeholder for this prototype. Create a free account to see real-time availability and reserve a slot.
            </div>
          </div>
        )}
      </Modal>

      <PublicFooter />
    </div>
  );
}

// ---------- About page ----------
function AboutPage() {
  // Every figure matches the app's own data or the fictional hospital's stated
  // lore (est. 1991); nothing invented beyond the disclosed fiction (R-17)
  const minFee = Math.min(...DOCTORS.map(d => d.fee));
  // Numeric stats animate in with React Bits CountUp; the non-numeric
  // '35 yrs' figure stays static. Same seed-data numbers as before (R-17).
  const stats = [
    { to: DOCTORS.length, label: 'Board-certified specialists' },
    { to: SPECIALTIES.length, label: 'Departments & centers' },
    { value: '35 yrs', label: 'Serving Quezon City (est. 1991)' },
    { to: minFee, prefix: '₱', label: 'Consultation fees start at' },
  ];
  // Equal-weight by design: these values are peers, and the uniform treatment
  // IS the hierarchy decision (documented in DESIGN.md, RHYTHM note)
  const values = [
    { title: 'Patient safety first', desc: 'Evidence-based protocols, accredited facilities, and strict data privacy for every record.' },
    { title: 'Clinical excellence', desc: 'Board-certified doctors and continuous training across every department.' },
    { title: 'Compassionate care', desc: 'We treat people, not just charts: clear explanations and respect at every visit.' },
  ];
  return (
    <div>
      <PublicNav activeLink="about" />
      <section className="public-hero page-hero">
        <HeroAurora />
        <div className="public-hero-inner">
          <HeroTitle>About MedicaCare</HeroTitle>
          <p className="public-hero-sub">{HOSPITAL.tagline}</p>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner">
          <h2>Who we are</h2>
          <p className="public-section-sub">
            MedicaCare is a fictional private hospital along Rizal Avenue, Quezon City.
            Since 1991 we have combined modern facilities with a personal approach to care, from routine
            check-ups to specialty consultations, for families across Metro Manila.
          </p>
          <div className="grid-4">
            {stats.map(s => (
              // Value and label only — no icon chips; the number is the content
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {s.value || <>{s.prefix || ''}<CountUp to={s.to} duration={1.6} /></>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section" style={{ background: 'var(--bg)', paddingTop: 32 }}>
        <div className="public-section-inner">
          <h2>What we stand for</h2>
          <p className="public-section-sub">The principles behind every consultation, lab result, and follow-up call.</p>
          <div className="feature-grid">
            {values.map(v => (
              <div className="feature-card" key={v.title}>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 32 }}>
        <div className="public-section-inner">
          <h2>Visit us</h2>
          <p className="public-section-sub">We're open daily, with 24/7 emergency care.</p>
          <div style={{ marginBottom: 16 }}>
            <ClinicStatus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <Icon name="map-pin" size={16} /> {HOSPITAL.address}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <Icon name="phone" size={16} /> {HOSPITAL.phone}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <Icon name="mail" size={16} /> {HOSPITAL.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Magnet padding={40} magnetStrength={3}>
              <a className="btn btn-primary" href="#/contact">Contact us</a>
            </Magnet>
            <a className="btn btn-secondary" href="#/doctors">Meet our doctors</a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

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

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sub="How MedicaCare collects, uses, and protects your information."
      updated="September 2026"
      sections={[
        { h: 'Information we collect', p: 'When you register, we collect your name, email address, phone number, and appointment history. During consultations, doctors may record diagnoses, prescriptions, and clinical notes relevant to your care.' },
        { h: 'How we use your information', p: 'Your information is used solely to schedule and manage your appointments, provide medical care, send appointment reminders, and comply with legal and regulatory obligations. We do not sell your personal data to third parties.' },
        { h: 'Medical data confidentiality', p: 'All patient records are treated as strictly confidential. In the production system this prototype models, only your attending physicians and authorized hospital staff may access your medical information, and every access is logged and audited.' },
        { h: 'Data security', p: 'As a school prototype, your account and appointment data live only in this browser (localStorage) and never leave your device, and passwords are stored as plain text for demo purposes. The production system this prototype models would keep records in access-controlled systems with encryption in transit and at rest, hashed passwords, and least-privilege staff access.' },
        { h: 'Your rights', p: 'You may request a copy of your records, ask for corrections, or withdraw consent for non-essential data processing by contacting our Data Protection Officer through the contact page.' },
        { h: 'Data retention', p: 'Medical records are retained for the period required by Philippine health regulations, after which they are securely and permanently destroyed.' },
      ]}
    />
  );
}

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

// ---------- Register ----------
function Register() {
  const store = useStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', agree: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    else if (form.name.trim().length < 3) e.name = 'Please enter your full name';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Use at least 8 characters';
    if (!form.confirm) e.confirm = 'Please confirm your password';
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    if (!form.agree) e.agree = 'You must accept the terms';
    return e;
  };

  const submit = (evt) => {
    evt.preventDefault();
    const e = validate();
    const em = form.email.toLowerCase().trim();
    const reservedEmails = ['patient@medicacare.ph', 'admin@medicacare.ph'];
    if (!e.email && (reservedEmails.includes(em) || store.users.some(u => u.email.toLowerCase() === em))) {
      e.email = 'An account with this email already exists. Try logging in instead.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newUser = {
        id: 'u' + Date.now().toString(36),
        name: form.name.trim(),
        email: em,
        phone: form.phone.trim(),
        password: form.password,
        role: 'patient',
        createdAt: new Date().toISOString().slice(0, 10),
        // Dummy portrait so new accounts show up with a photo across the portal
        photo: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 99) + 1}.jpg`,
      };
      store.setUsers([...store.users, newUser]);
      // Keep the static PATIENTS registry (used by window.findPatient in the
      // admin console tables and the printable schedule) in sync — same
      // pattern as the admin add-patient flow — so new accounts never render
      // as "Unknown patient" in staff views
      window.PATIENTS.unshift({ id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, gender: '', age: null, joined: newUser.createdAt, lastVisit: null, photo: newUser.photo });
      store.setPatients([...window.PATIENTS]);
      store.pushToast({ title: 'Account created', msg: 'You can now log in with your new credentials.' });
      navigate('/login');
    }, 900);
  };

  return (
    <div className="auth-shell">
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" reverse duration={0.7}>
      <div className="auth-form-col auth-compact">
        <div className="auth-form-inner">
          <div>
            <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginLeft: -10, marginBottom: 8 }}>
              <Icon name="arrow-left" size={16} /> Back to home
            </button>
          </div>
          <div className="brand">
            <BrandMark size={36} />
            <div>
              <div style={{ fontWeight: 600 }}>MedicaCare</div>
              <div className="t-muted" style={{ fontSize: 12 }}>Patient portal</div>
            </div>
          </div>
          <SplitText tag="h1" text="Create your account" splitType="chars" delay={30} duration={0.9} textAlign="left" rootMargin="0px" />
          <AnimatedContent distance={20} duration={0.5} delay={0.55}>
            <p className="sub">It only takes a minute. All fields are required.</p>
          </AnimatedContent>

          <form onSubmit={submit} className="form-stack" noValidate>
            <Field label="Full name" required error={errors.name}>
              <TextInput placeholder="Juan Miguel Bautista" value={form.name}
                onChange={e => update('name', e.target.value)} error={errors.name} />
            </Field>
            <Field label="Email address" required error={errors.email}>
              <TextInput type="email" placeholder="you@example.com" value={form.email}
                onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
            </Field>
            <Field label="Phone number" required error={errors.phone} help={!errors.phone && 'We use this for appointment reminders only.'}>
              <TextInput type="tel" placeholder="+63 917 000 0000" value={form.phone}
                onChange={e => update('phone', e.target.value)} error={errors.phone} icon="phone" />
            </Field>
            <div className="form-2col">
              <Field label="Password" required error={errors.password}>
                <TextInput type="password" placeholder="Min 8 characters" value={form.password}
                  onChange={e => update('password', e.target.value)} error={errors.password} />
              </Field>
              <Field label="Confirm password" required error={errors.confirm}>
                <TextInput type="password" placeholder="Re-enter password" value={form.confirm}
                  onChange={e => update('confirm', e.target.value)} error={errors.confirm} />
              </Field>
            </div>
            <label className="checkbox" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={form.agree} onChange={e => update('agree', e.target.checked)} />
              <span>I agree to MedicaCare's <a href="#/terms" style={{ color: 'var(--primary)' }}>Terms of Service</a> and <a href="#/privacy" style={{ color: 'var(--primary)' }}>Privacy Policy</a>.</span>
            </label>
            {errors.agree && <div className="field-error"><Icon name="alert-circle" size={12} /> {errors.agree}</div>}

            <button type="submit" className={`btn btn-primary lg ${loading ? 'btn-loading' : ''}`}>
              Create account
            </button>

            <div className="footer-link">
              Already have an account? <a href="#/login">Log in</a>
            </div>
            {/* KoruUX patient-portal practice: state who can see the patient's
                data at the moment they hand it over (matches the Privacy page). */}
            <div className="auth-trust-line">
              <Icon name="shield-check" size={13} />
              <span>Your records are visible only to you and authorized MedicaCare staff.</span>
            </div>
          </form>
        </div>
      </div>
      </AnimatedContent>

      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" duration={0.7}>
      <div className="auth-visual-col auth-visual-col--register">
        <div className="auth-aurora" aria-hidden="true"><Aurora colorStops={['#60A5FA', '#E0F2FE', '#3B82F6']} amplitude={1.1} speed={0.6} blend={0.7} /></div>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Booking my cardiology follow-up used to take a whole afternoon of phone calls. Now I do it in two taps before work."</div>
          <div className="attrib">Sofia R. · fictional patient story</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          MedicaCare · Quezon City, PH
        </div>
      </div>
      </AnimatedContent>
    </div>
  );
}

// ---------- Login ----------
function Login() {
  const store = useStore();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Step 2 of login (prototype demo): after the credentials check passes,
  // a 6-character code must be entered before the portal opens. `otpAccount`
  // holds the account awaiting verification; the account is only logged in
  // from the OTP modal's onVerified callback.
  const [otpAccount, setOtpAccount] = useState(null);

  const finishLogin = (account) => {
    // Registered account (including the seeded demo patient) — enter the
    // portal as that patient identity so bookings/history belong to them
    if (account.id === CURRENT_PATIENT.id) {
      store.setCurrentPatient(CURRENT_PATIENT);
    } else {
      store.setCurrentPatient({
        id: account.id, name: account.name, email: account.email, phone: account.phone,
        dob: '', gender: '', address: '', emergencyContact: '', bloodType: '—', allergies: 'None',
        photo: account.photo || '',
      });
    }
    store.loginPatient(account);
    store.setRole('patient');
    setOtpAccount(null);
    navigate('/patient/dashboard');
  };

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); setAuthError(null); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setLoading(false);
      const em = form.email.toLowerCase().trim();
      const account = store.users.find(u => u.email.toLowerCase() === em);
      if (account && account.password === form.password) {
        // Credentials verified — the emailed code is the next gate
        setOtpAccount(account);
      } else {
        setAuthError(account
          ? 'The password you entered is incorrect. Please try again.'
          : 'No account found with this email. Please register first.');
      }
    }, 700);
  };

  // Demo account accordion — collapsed by default to keep the form clean.
  // Patient credentials only; the staff login lives on the separate AdminLogin
  // screen so admin credentials are never exposed on the public login page.
  const [demoOpen, setDemoOpen] = useState(false);

  const useDemo = () => {
    setForm({ email: 'patient@medicacare.ph', password: 'patient123', remember: true });
    setErrors({}); setAuthError(null);
  };

  return (
    <div className="auth-shell">
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" reverse duration={0.7}>
      <div className="auth-visual-col auth-visual-col--login" style={{ order: 0 }}>
        <div className="auth-aurora" aria-hidden="true"><Aurora colorStops={['#60A5FA', '#E0F2FE', '#3B82F6']} amplitude={1.1} speed={0.6} blend={0.7} /></div>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Care that fits your schedule. See a specialist without the runaround."</div>
          <div className="attrib">MedicaCare</div>
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
              <div className="t-muted" style={{ fontSize: 12 }}>Patient portal</div>
            </div>
          </div>
          <SplitText tag="h1" text="Welcome back" splitType="chars" delay={30} duration={0.9} textAlign="left" rootMargin="0px" />
          <AnimatedContent distance={20} duration={0.5} delay={0.55}>
            <p className="sub">Log in to book appointments and view your records.</p>
          </AnimatedContent>

          {authError && (
            <div role="alert" style={{ background: 'var(--error-soft)', border: '1px solid #FCA5A5', color: 'var(--error-text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="alert-circle" size={16} style={{ marginTop: 1 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={submit} className="form-stack" noValidate>
            <Field label="Email address" required error={errors.email}>
              <TextInput type="email" placeholder="you@example.com" value={form.email}
                onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
            </Field>
            <PwField label="Password" required error={errors.password} autoComplete="current-password"
              value={form.password} onChange={e => update('password', e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="checkbox">
                <input type="checkbox" checked={form.remember} onChange={e => update('remember', e.target.checked)} />
                <span>Remember me</span>
              </label>
              <a href="#/forgot-password" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>Forgot password?</a>
            </div>

            <button type="submit" className={`btn btn-primary lg ${loading ? 'btn-loading' : ''}`}>
              Log in
            </button>

            <div className="footer-link">
              New here? <a href="#/register">Create an account</a>
            </div>
          </form>

          <div className={`demo-accounts ${demoOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="demo-accounts-toggle"
              aria-expanded={demoOpen}
              onClick={() => setDemoOpen(o => !o)}
            >
              <span className="demo-accounts-title">Demo accounts: click to use</span>
              <Icon name="chevron-down" size={14} />
            </button>
            {demoOpen && (
              <button type="button" className="demo-account" onClick={useDemo}>
                <span className="avatar sm">JB</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>patient@medicacare.ph</span>
                  <span className="t-muted" style={{ display: 'block', fontSize: 11 }}>Password: patient123</span>
                </span>
                <span className="demo-account-role">Patient</span>
              </button>
            )}
          </div>
        </div>
      </div>
      </AnimatedContent>

      {/* Step 2 — the emailed 6-character code gates the portal itself;
          the session is only created from onVerified */}
      <OtpVerifyModal
        open={!!otpAccount}
        onClose={() => setOtpAccount(null)}
        onVerified={() => finishLogin(otpAccount)}
        email={otpAccount ? otpAccount.email : ''}
        title="Verify your login"
        subtitle={`Enter the code sent to ${otpAccount ? otpAccount.email : 'your email'} to open your patient portal.`}
      />
    </div>
  );
}

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

Object.assign(window, {
  Landing, Register, Login, AdminLogin, DoctorLogin, ForgotPassword,
  ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage,
});

export {
  Landing, Register, Login, AdminLogin, DoctorLogin, ForgotPassword,
  ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage,
};

