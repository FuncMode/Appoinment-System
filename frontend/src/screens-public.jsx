import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, BrandMark, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart,
  NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel,
} from './components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
} from './data.js';


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

// Patient testimonials — featured in the auto-rotating carousel on Landing
const TESTIMONIALS = [
  { quote: 'Booking my cardiology follow-up used to take a whole afternoon of phone calls. Now I do it in two taps before work.', who: 'Sofia R., patient since 2024' },
  { quote: "I booked my son's pediatric check-up after my night shift and had a confirmation before I even got home.", who: 'Marco T., parent of two' },
  { quote: "Rescheduling used to mean three phone calls and crossing my fingers. Now it's two taps and done.", who: 'Andrea L., patient since 2023' },
];

// Homepage FAQ — expandable accordion (Cleveland-Clinic-style FAQ section)
const LANDING_FAQS = [
  { q: 'Do I need an account to book an appointment?', a: 'Yes — create a free patient account first so your bookings, records, and reminders live in one secure place. Registration takes under a minute.' },
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
  { q: 'Is there a package for annual physical exams?', a: 'Yes — executive check-up bundles are tailored to your age and risk profile. Call our hotline or send a message for current package rates.' },
  { q: 'How does HMO assistance work?', a: 'Present your HMO card at the billing counter. Our staff verifies eligibility and processes the claim directly with your provider so you focus on recovery.' },
];

function Landing() {
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

  return (
    <div>
      <NoticeBar phone={HOSPITAL.phone} />
      <PublicNav activeLink="home" />

      <section className="public-hero">
        <div className="public-hero-inner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <div className="badge badge-primary">
                <span className="badge-dot" /> Now accepting new patients
              </div>
              <ClinicStatus />
            </div>
            <h1>Book a MedicaCare specialist online — no phone calls needed.</h1>
            <p>Pick from {DOCTORS.length} board-certified doctors across {SPECIALTIES.length} departments,
               view real-time availability, and get a confirmation in minutes. Reschedule anytime from your portal.</p>
            <div className="public-hero-actions">
              <a className="btn btn-primary lg" href="#/register">
                Create patient account <Icon name="arrow-right" size={16} />
              </a>
              <a className="btn btn-secondary lg" href="#/login">Log in</a>
            </div>
            <div className="public-hero-badges">
              <div className="public-hero-badge">DOH accredited</div>
              <div className="public-hero-badge">HMO-friendly</div>
              <div className="public-hero-badge">24/7 patient support</div>
            </div>
          </div>

          <div className="public-hero-visual">
            {/* Portal preview — built from the demo patient's real next appointment */}
            {previewAppt && previewDoc && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'right' }}>
                  A peek at your patient portal
                </div>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
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
                </div>
              </>
            )}

            {/* mini stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              {[
                { label: 'Specialists', value: String(DOCTORS.length) },
                { label: 'Avg. wait time', value: '< 12 min' },
                { label: 'Departments', value: String(SPECIALTIES.length) },
                { label: 'Patient rating', value: '4.8 / 5' },
              ].map(s => (
                <div className="hero-stat" key={s.label}>
                  <div className="hero-stat-label">{s.label}</div>
                  <div className="hero-stat-value">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-section" style={{ background: 'var(--bg)' }}>
        <div className="public-section-inner">
          <div>
            <h2>Not sure where to go for care?</h2>
            <p className="public-section-sub">Pick the symptom closest to what you're feeling and we'll point you to the right specialist.</p>
            <div className="chip-group">
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
              <div className="care-finder-panel">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    We recommend our <span style={{ color: 'var(--primary)' }}>{pickedGuide.specialty}</span> department
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {pickedDoctors > 0
                      ? `${pickedDoctors} available specialist${pickedDoctors === 1 ? '' : 's'} right now — bookings open as early as this week.`
                      : 'Specialists are currently busy or on leave — you can still browse their profiles and check schedules.'}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a className="btn btn-primary" href={`#/doctors?spec=${encodeURIComponent(pickedGuide.specialty)}`}>
                      See {pickedGuide.specialty} doctors <Icon name="arrow-right" size={14} />
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
          <h2>How it works</h2>
          <p className="public-section-sub">Three straightforward steps to see a doctor at MedicaCare.</p>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>1. Create your account</h3>
              <p>Register in under a minute with your name, email, and phone number. No paperwork.</p>
            </div>
            <div className="feature-card">
              <h3>2. Find your doctor</h3>
              <p>Browse specialists by department, check real-time availability, and pick a time that works.</p>
            </div>
            <div className="feature-card">
              <h3>3. Get confirmed</h3>
              <p>Our staff confirms your booking within minutes, with reminders and easy rescheduling — all in your portal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 32 }}>
        <div className="public-section-inner">
          <h2>Departments</h2>
          <p className="public-section-sub">Tap a department to see its specialists.</p>
          <div className="grid-4">
            {SPECIALTIES.map(s => (
              <button key={s} className="dept-chip" onClick={() => navigate(`/doctors?spec=${encodeURIComponent(s)}`)}>
                <span className="dot" />
                {s}
                <Icon name="arrow-right" size={14} className="dept-arrow" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section" style={{ background: 'var(--bg)', paddingTop: 32 }}>
        <div className="public-section-inner">
          <h2>What patients say</h2>
          <p className="public-section-sub">Convenience that people who book with us every week can vouch for.</p>
          <TestimonialCarousel items={TESTIMONIALS} />
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner">
          <h2>Common questions</h2>
          <p className="public-section-sub">Quick answers before you create your account.</p>
          <FaqAccordion items={LANDING_FAQS} />
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 32 }}>
        <div className="public-section-inner" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Ready to book your first visit?</h2>
          <p className="public-section-sub" style={{ maxWidth: 520, margin: '0 auto 24px' }}>
            Create a free account, pick a specialist, and choose a slot that fits your schedule.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="btn btn-primary lg" href="#/register">Create patient account <Icon name="arrow-right" size={16} /></a>
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
    { icon: 'calendar-check', title: 'Online appointment booking', desc: 'Pick a doctor, choose an open time slot, and get instant confirmation — no phone calls needed.' },
    { icon: 'activity', title: 'Laboratory & diagnostics', desc: 'Complete blood work, urinalysis, and other routine labs with same-day results for most tests.' },
    { icon: 'search', title: 'Imaging services', desc: 'X-ray, ultrasound, and ECG performed by licensed technologists and read by our radiologists.' },
    { icon: 'check-circle-2', title: 'Executive check-up packages', desc: 'Comprehensive annual physical exam bundles tailored to your age and risk profile.' },
    { icon: 'shield-check', title: 'HMO & insurance assistance', desc: 'We process claims with major HMO providers so you can focus on getting better.' },
  ];
  return (
    <div>
      <PublicNav activeLink="services" />
      <section className="public-hero page-hero">
        <div className="public-hero-inner">
          <h1>Our services</h1>
          <p className="public-hero-sub">Everything you need for outpatient care, all in one medical center.</p>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner">
          <div className="feature-grid">
            {services.map(s => (
              <div className="feature-card" key={s.title}>
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
          <h2>Departments & specialties</h2>
          <p className="public-section-sub">Tap a department to see its specialists.</p>
          <div className="grid-4">
            {SPECIALTIES.map(s => (
              <button key={s} className="dept-chip" onClick={() => navigate(`/doctors?spec=${encodeURIComponent(s)}`)}>
                <span className="dot" />
                {s}
                <Icon name="arrow-right" size={14} className="dept-arrow" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner">
          <h2>Service FAQs</h2>
          <p className="public-section-sub">Answers to what patients ask us most about our services.</p>
          <FaqAccordion items={SERVICES_FAQS} />
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 32 }}>
        <div className="public-section-inner">
          <h2>Ready to book a visit?</h2>
          <p className="public-section-sub">Create a free patient account and see a specialist as early as tomorrow.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a className="btn btn-primary" href="#/register">Create patient account</a>
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
        <div className="public-hero-inner">
          <h1>Find a doctor</h1>
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

          {filtered.length === 0 ? (
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
              {visibleDoctors.map(d => (
                <div
                  className="doctor-card"
                  key={d.id}
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="star" size={14} style={{ color: '#F59E0B' }} />
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{d.rating}</span>
                    </span>
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
                      View profile <Icon name="arrow-right" size={13} />
                    </span>
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

          <div style={{ marginTop: 32, padding: 24, background: 'var(--primary-soft)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: '1 1 240px' }}>
              <div style={{ fontWeight: 600 }}>Ready to book an appointment?</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Log in or create an account to view real-time availability and reserve a slot.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <a className="btn btn-primary" href="#/register">Register</a>
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
              Book with this doctor <Icon name="arrow-right" size={14} />
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <Icon name="star" size={14} style={{ color: '#F59E0B' }} />
                    {selectedDoctor.rating} patient rating
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
              Create a free account to see real-time availability and reserve a slot.
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
  const stats = [
    { value: '120+', label: 'Board-certified specialists' },
    { value: '18', label: 'Departments & centers' },
    { value: '35 yrs', label: 'Serving Quezon City' },
    { value: '4.8 / 5', label: 'Average patient rating' },
  ];
  const values = [
    { title: 'Patient safety first', desc: 'Evidence-based protocols, accredited facilities, and strict data privacy for every record.' },
    { title: 'Clinical excellence', desc: 'Board-certified doctors and continuous training across all 18 departments.' },
    { title: 'Compassionate care', desc: 'We treat people, not just charts — clear explanations and respect at every visit.' },
  ];
  return (
    <div>
      <PublicNav activeLink="about" />
      <section className="public-hero page-hero">
        <div className="public-hero-inner">
          <h1>About MedicaCare</h1>
          <p className="public-hero-sub">{HOSPITAL.tagline}</p>
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner">
          <h2>Who we are</h2>
          <p className="public-section-sub">
            MedicaCare is a DOH-accredited private hospital along Rizal Avenue, Quezon City.
            Since 1991, we've combined modern facilities with a personal approach to care — from routine
            check-ups to specialty consultations — for families across Metro Manila.
          </p>
          <div className="grid-4">
            {stats.map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
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
            <a className="btn btn-primary" href="#/contact">Contact us</a>
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
        <div className="public-hero-inner">
          <h1>Contact us</h1>
          <p className="public-hero-sub">Questions about appointments, billing, or services? We're happy to help.</p>
          <ClinicStatus />
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner contact-cols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: 'map-pin', title: 'Address', body: HOSPITAL.address },
              { icon: 'phone', title: 'Phone', body: HOSPITAL.phone },
              { icon: 'mail', title: 'Email', body: HOSPITAL.email },
              { icon: 'clock', title: 'Hours', body: <>Mon–Sat: 7:00 AM – 8:00 PM · Sun: 8:00 AM – 5:00 PM<br />Emergency: 24/7</> },
            ].map(c => (
              <div key={c.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, display: 'flex', gap: 12 }}>
                <div className="feature-card-icon"><Icon name={c.icon} size={18} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{c.body}</div>
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
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', lineHeight: 0 }}>
            <iframe
              title="Map — MedicaCare location"
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
              Open larger map <Icon name="arrow-right" size={13} />
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
        <div className="public-hero-inner">
          <h1>{title}</h1>
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
        { h: 'Medical data confidentiality', p: 'All patient records are treated as strictly confidential. Only your attending physicians and authorized hospital staff may access your medical information, and every access is logged and audited.' },
        { h: 'Data security', p: 'Records are stored in access-controlled systems with encryption in transit and at rest. Passwords are stored only as secure hashes, and staff accounts follow the principle of least privilege.' },
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
      // Make the new patient visible in the admin Patients list for this session
      store.setPatients([
        ...store.patients,
        { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, gender: '', age: null, joined: newUser.createdAt, lastVisit: null, photo: newUser.photo },
      ]);
      store.pushToast({ title: 'Account created', msg: 'You can now log in with your new credentials.' });
      navigate('/login');
    }, 900);
  };

  return (
    <div className="auth-shell">
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
          <h1>Create your account</h1>
          <p className="sub">It only takes a minute. All fields are required.</p>

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
          </form>
        </div>
      </div>

      <div className="auth-visual-col auth-visual-col--register">
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Booking my cardiology follow-up used to take a whole afternoon of phone calls. Now I do it in two taps before work."</div>
          <div className="attrib">— Sofia R., patient since 2024</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          MedicaCare · Quezon City, PH
        </div>
      </div>
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
      if (em === 'admin@medicacare.ph' && form.password === 'admin123') {
        store.setRole('admin');
        navigate('/admin/dashboard');
      } else if (account && account.password === form.password) {
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
        store.setRole('patient');
        navigate('/patient/dashboard');
      } else {
        setAuthError(account
          ? 'The password you entered is incorrect. Please try again.'
          : 'No account found with this email. Please register first.');
      }
    }, 700);
  };

  // Demo accounts accordion — collapsed by default to keep the form clean
  const [demoOpen, setDemoOpen] = useState(false);

  const useDemo = (role) => {
    if (role === 'admin') {
      setForm({ email: 'admin@medicacare.ph', password: 'admin123', remember: true });
    } else {
      setForm({ email: 'patient@medicacare.ph', password: 'patient123', remember: true });
    }
    setErrors({}); setAuthError(null);
  };

  return (
    <div className="auth-shell">
      <div className="auth-visual-col auth-visual-col--login" style={{ order: 0 }}>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Care that fits your schedule. See a specialist without the runaround."</div>
          <div className="attrib">MedicaCare</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          © 2026 MedicaCare
        </div>
      </div>
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
          <h1>Welcome back</h1>
          <p className="sub">Log in to book appointments and view your records.</p>

          {authError && (
            <div style={{ background: 'var(--error-soft)', border: '1px solid #FCA5A5', color: 'var(--error-text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="alert-circle" size={16} style={{ marginTop: 1 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={submit} className="form-stack" noValidate>
            <Field label="Email address" required error={errors.email}>
              <TextInput type="email" placeholder="you@example.com" value={form.email}
                onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
            </Field>
            <Field label="Password" required error={errors.password}>
              <TextInput type="password" placeholder="Enter your password" value={form.password}
                onChange={e => update('password', e.target.value)} error={errors.password} />
            </Field>
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
              <span className="demo-accounts-title">Demo accounts — click to use</span>
              <Icon name="chevron-down" size={14} />
            </button>
            {demoOpen && (
              <>
                <div className="demo-account" onClick={() => useDemo('patient')}>
                  <div className="avatar sm">JB</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>patient@medicacare.ph</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>Password: patient123</div>
                  </div>
                  <div className="demo-account-role">Patient</div>
                </div>
                <div className="demo-account" onClick={() => useDemo('admin')}>
                  <div className="avatar sm neutral">HC</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>admin@medicacare.ph</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>Password: admin123</div>
                  </div>
                  <div className="demo-account-role">Admin</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
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
          <h1>Forgot password</h1>
          <p className="sub">Enter the email linked to your account and we'll send you a reset link.</p>

          {sent ? (
            <div>
              <div style={{ background: 'var(--success-soft, #ECFDF5)', border: '1px solid #6EE7B7', color: '#047857', padding: '12px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
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

      <div className="auth-visual-col auth-visual-col--forgot">
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Your health records, appointments, and prescriptions — all in one secure place."</div>
          <div className="attrib">MedicaCare</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          © 2026 MedicaCare
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Landing, Register, Login, ForgotPassword,
  ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage,
});

export {
  Landing, Register, Login, ForgotPassword,
  ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage,
};

