// Landing — public (split from screens-public.jsx)
import { useEffect, useRef, useState } from 'react';
import { ClinicStatus, DoctorAvatar, FaqAccordion, Icon, navigate, NoticeBar, PublicFooter, PublicNav, StatusBadge, TestimonialCarousel, useStore } from '../shared/components.jsx';
import { APPOINTMENTS, CURRENT_PATIENT, DOCTORS, findDoctor, HOSPITAL, SPECIALTIES } from '../shared/data.js';
import CountUp from '../shared/reactbits/CountUp.jsx';
import Magnet from '../shared/reactbits/Magnet.jsx';
import ScrollVelocity from '../shared/reactbits/ScrollVelocity.jsx';
import StarBorder from '../shared/reactbits/StarBorder.jsx';
import GlareHover from '../shared/reactbits/GlareHover.jsx';  // hero preview card only — the one deliberate hover flourish
import Ribbons from '../shared/reactbits/Ribbons.jsx';
import { CARE_GUIDE, LANDING_FAQS, PROTOTYPE_STORIES } from './content.js';
import { HeroAurora, HeroTitle } from './hero.jsx';

// ============================================================
// Public screens — Landing / Register / Login
// ============================================================

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
    <main>
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
    </main>
  );
}

export { HeroAurora, HeroTitle, Landing };