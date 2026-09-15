import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, SortableTh, PageSpinner, EmptyState, ErrorState, ConfirmModal, MiniBarChart,
} from './components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, downloadFile,
} from './data.js';


// ============================================================
// Shared small helpers (prototype utilities)
// ============================================================

// Keyboard support for clickable card containers (guidelines 20 & 36):
// elements exposing role="button" must activate on Enter/Space. The
// e.target check keeps nested buttons (e.g. "Book" inside a doctor card)
// from also triggering the card-level action.
function activateOnKey(action) {
  return (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault();
      action();
    }
  };
}

// Time-aware greeting (guideline 15 — realistic data: a fixed
// "Good morning" is wrong in the afternoon or evening)
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// "2026-09-11" + "10:30 AM" → ICS timestamp "20260911T103000" (floating local time)
function toICSStamp(dateStr, timeStr, addMinutes = 0) {
  const m = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let h = 9, min = 0;
  if (m) {
    h = (parseInt(m[1], 10) % 12) + (/pm/i.test(m[3]) ? 12 : 0);
    min = parseInt(m[2], 10);
  }
  const dt = new Date(dateStr + 'T00:00:00');
  dt.setHours(h, min + addMinutes, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

// .ics (iCalendar) content so the appointment can be imported into any calendar app
function buildICS(appt, doctor) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedicaCare//Patient Portal//EN',
    'BEGIN:VEVENT',
    `UID:${appt.id}@medicacare.ph`,
    `DTSTAMP:${toICSStamp(appt.date, appt.time)}`,
    `DTSTART:${toICSStamp(appt.date, appt.time)}`,
    `DTEND:${toICSStamp(appt.date, appt.time, 30)}`, // 30-minute consultation
    `SUMMARY:${doctor.name} (${doctor.specialty})`,
    `LOCATION:${doctor.room}, MedicaCare`,
    `DESCRIPTION:Appointment ${appt.id.toUpperCase()}: ${String(appt.reason).replace(/\r?\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Simple printable HTML receipt
function buildReceipt(appt, doctor, patient) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Receipt ${esc(appt.id.toUpperCase())} at MedicaCare</title></head>
<body style="font-family: Arial, sans-serif; max-width: 560px; margin: 40px auto; color: #1e293b;">
  <h2 style="margin: 0;">MedicaCare</h2>
  <p style="margin: 4px 0 20px; color: #64748b;">221 Rizal Avenue, Quezon City · +63 (2) 8567 4400</p>
  <h3 style="border-top: 1px solid #e2e8f0; padding-top: 16px;">Appointment receipt</h3>
  <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
    <tr><td style="padding: 6px 0; color: #64748b;">Reference number</td><td style="text-align: right;"><strong>${esc(appt.id.toUpperCase())}</strong></td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Patient</td><td style="text-align: right;">${esc(patient.name)}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Doctor</td><td style="text-align: right;">${esc(doctor.name)} (${esc(doctor.specialty)})</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Date &amp; time</td><td style="text-align: right;">${esc(window.formatDateLong(appt.date))}, ${esc(appt.time)}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Location</td><td style="text-align: right;">${esc(doctor.room)}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Reason for visit</td><td style="text-align: right;">${esc(appt.reason)}</td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Status</td><td style="text-align: right;">${esc((window.statusMeta(appt.status) || {}).label || appt.status)}</td></tr>
    <tr><td style="padding: 12px 0; border-top: 1px solid #e2e8f0;"><strong>Consultation fee</strong></td><td style="text-align: right; border-top: 1px solid #e2e8f0;"><strong>&#8369;${Number(doctor.fee).toLocaleString()}</strong></td></tr>
  </table>
  <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Prototype receipt: fictional data for demo purposes only.</p>
</body>
</html>`;
}


// ============================================================
// Patient screens
// ============================================================

// ---------- Patient Dashboard ----------
// Patient-specific, state-aware: the greeting subtitle, stats, and banner all
// reflect this patient's actual schedule (no generic template copy).
function PatientDashboard() {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — skeleton placeholders while "loading", same 600ms pattern
  // as the admin dashboard and list pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const myAppts = store.appointments.filter(a => a.patientId === me.id);
  const upcoming = myAppts
    .filter(a => a.status === 'confirmed' || a.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];
  // Fallback keeps the banner rendering if this doctor was removed in the admin console
  const nextDoctor = next ? (window.findDoctor(next.doctorId) || { name: 'Unknown doctor', specialty: '—', room: '—' }) : null;
  const nextDate = next ? new Date(next.date + 'T00:00:00') : null;

  // Completed visits in the last 12 months — computed to match the label honestly
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoISO = `${yearAgo.getFullYear()}-${String(yearAgo.getMonth() + 1).padStart(2, '0')}-${String(yearAgo.getDate()).padStart(2, '0')}`;
  const completed12mo = myAppts.filter(a => a.status === 'completed' && a.date >= yearAgoISO);
  // Most recent completed visit — more useful to a patient than a lifetime cancelled count
  const lastVisit = myAppts.filter(a => a.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  const lastVisitDoctor = lastVisit ? (window.findDoctor(lastVisit.doctorId) || { name: 'Unknown doctor' }) : null;
  const lastVisitShort = lastVisit
    ? new Date(lastVisit.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  const stats = [
    { label: 'Upcoming', value: upcoming.length, context: next ? `Next on ${window.formatDate(next.date)}` : 'No appointments booked', icon: 'calendar-days' },
    { label: 'Completed visits', value: completed12mo.length, context: 'In the last 12 months', icon: 'check-circle-2' },
    { label: 'Last visit', value: lastVisitShort, context: lastVisitDoctor ? `With ${lastVisitDoctor.name}` : 'No past visits yet', icon: 'clock' },
  ];

  // Personal, state-aware subtitle instead of a static tagline
  const subtitle = next
    ? `You have ${upcoming.length} upcoming appointment${upcoming.length === 1 ? '' : 's'}. Your next visit is on ${window.formatDate(next.date)} at ${next.time}.`
    : 'No upcoming appointments. Your schedule is clear.';

  return (
    <AppShell current="dashboard">
      <div className="page">
        <PageHeader
          title={`${greeting()}, ${me.name.split(' ')[0]}`}
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 360, maxWidth: '100%', height: 14 }} />
            : subtitle}
          actions={
            <button className="btn btn-primary" onClick={() => navigate('/patient/book')}>
              <Icon name="calendar-plus" size={14} /> Book appointment
            </button>
          }
        />

        {/* Next appointment banner (skeleton while loading) */}
        {loading ? (
          <div className="next-appt-card" style={{ marginBottom: 20 }} aria-hidden="true">
            <div className="next-appt-date" style={{ display: 'grid', placeItems: 'center', padding: '14px 8px' }}>
              <span className="skel" style={{ width: 30, height: 12 }} />
              <span className="skel" style={{ width: 24, height: 24, marginTop: 5 }} />
            </div>
            <div className="next-appt-info">
              <span className="skel" style={{ width: 150, height: 11, display: 'block' }} />
              <span className="skel" style={{ width: 260, maxWidth: '100%', height: 20, display: 'block', marginTop: 10 }} />
              <span className="skel" style={{ width: 330, maxWidth: '100%', height: 12, display: 'block', marginTop: 12 }} />
            </div>
            <div className="next-appt-actions">
              <span className="skel" style={{ width: 100, height: 34 }} />
              <span className="skel" style={{ width: 114, height: 34 }} />
            </div>
          </div>
        ) : next ? (
          <div className="next-appt-card" style={{ marginBottom: 20 }}>
            <div className="next-appt-date">
              <div className="month">{nextDate.toLocaleDateString('en-US', { month: 'short' })}</div>
              <div className="day">{nextDate.getDate()}</div>
            </div>
            <div className="next-appt-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span className="t-help" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>Next appointment</span>
                <StatusBadge status={next.status} />
              </div>
              <div className="doctor">{nextDoctor.name}</div>
              <div className="meta">
                <span><Icon name="stethoscope" size={13} /> {nextDoctor.specialty}</span>
                <span><Icon name="clock" size={13} /> {next.time}</span>
                <span><Icon name="map-pin" size={13} /> {nextDoctor.room}</span>
              </div>
            </div>
            <div className="next-appt-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/patient/appointment/' + next.id)}>View details</button>
              <button className="btn btn-primary" onClick={() => navigate('/patient/status')}>Check status</button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 20 }}>
            <EmptyState
              icon="calendar-x"
              title="No upcoming appointments"
              message="Book an appointment with one of our specialists to get started."
              actions={<button className="btn btn-primary" onClick={() => navigate('/patient/book')}><Icon name="calendar-plus" size={14} /> Book appointment</button>}
            />
          </div>
        )}

        {/* Stats + Quick actions */}
        <div className="two-col" style={{ marginBottom: 20, alignItems: 'stretch' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="h-section">Quick actions</h2>
            </div>
            <div className="quick-actions-grid">
              <button type="button" className="quick-action" onClick={() => navigate('/patient/book')}>
                <div className="quick-action-icon"><Icon name="calendar-plus" size={18} /></div>
                <div className="quick-action-body">
                  <div className="quick-action-title">Book appointment</div>
                  <div className="quick-action-sub">Find a doctor and time slot</div>
                </div>
                <Icon name="chevron-right" size={16} className="quick-action-arrow" />
              </button>
              <button type="button" className="quick-action" onClick={() => navigate('/patient/doctors')}>
                <div className="quick-action-icon"><Icon name="stethoscope" size={18} /></div>
                <div className="quick-action-body">
                  <div className="quick-action-title">View doctors</div>
                  <div className="quick-action-sub">Browse specialists by department</div>
                </div>
                <Icon name="chevron-right" size={16} className="quick-action-arrow" />
              </button>
              <button type="button" className="quick-action" onClick={() => navigate('/patient/history')}>
                <div className="quick-action-icon"><Icon name="calendar-check" size={18} /></div>
                <div className="quick-action-body">
                  <div className="quick-action-title">Appointment history</div>
                  <div className="quick-action-sub">Past and upcoming visits</div>
                </div>
                <Icon name="chevron-right" size={16} className="quick-action-arrow" />
              </button>
              <button type="button" className="quick-action" onClick={() => navigate('/patient/profile')}>
                <div className="quick-action-icon"><Icon name="user-round" size={18} /></div>
                <div className="quick-action-body">
                  <div className="quick-action-title">My profile</div>
                  <div className="quick-action-sub">Contact info & security</div>
                </div>
                <Icon name="chevron-right" size={16} className="quick-action-arrow" />
              </button>
            </div>
          </div>

          <div className="dashboard-stats">
            {stats.map((s, i) => (
              // The third card spans the full 2×2 grid width on desktop
              // (dashboard-stats layout). Desktop keeps the compact column with
              // the icon inside the label row; on mobile the CSS restacks the
              // cards into full-width rows — chip + label left, value right
              // (guide §11/§28: readable compact summaries, no wrapped labels).
              <div key={i} className={'card stat-card' + (i === 2 ? ' stat-card-span' : '')}>
                <div className="quick-action-icon" style={{ flexShrink: 0 }}>
                  <Icon name={s.icon} size={16} />
                </div>
                {loading ? (
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="skel" style={{ height: 12, width: '65%' }} />
                    <span className="skel" style={{ height: 26, width: '34%' }} />
                    <span className="skel" style={{ height: 11, width: '80%' }} />
                  </div>
                ) : (
                  <>
                    <div className="stat-label"><Icon name={s.icon} size={14} /> {s.label}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-delta">{s.context}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="h-section">Recent activity</h2>
            <button className="btn btn-ghost sm" onClick={() => navigate('/patient/history')}>View all <Icon name="arrow-right" size={13} /></button>
          </div>
          <div>
            {loading ? (
              // Skeleton rows mirroring the real list-item layout (avatar + 2
              // text lines + status badge), same 600ms window as the stats
              [0, 1, 2].map(i => (
                <div key={i} className="list-item" aria-hidden="true">
                  <span className="skel" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="list-item-body">
                    <span className="skel" style={{ width: '55%', height: 12, display: 'block' }} />
                    <span className="skel" style={{ width: '35%', height: 10, display: 'block', marginTop: 6 }} />
                  </div>
                  <span className="skel" style={{ width: 70, height: 18 }} />
                </div>
              ))
            ) : myAppts.slice(0, 4).map(a => {
              const d = window.findDoctor(a.doctorId);
              return (
                // role="button" makes this clickable row keyboard-operable
                // (guidelines 20 & 36); Enter/Space handled by activateOnKey
                <div
                  key={a.id}
                  className="list-item"
                  role="button"
                  tabIndex={0}
                  aria-label={`View appointment with ${d.name}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/patient/appointment/' + a.id)}
                  onKeyDown={activateOnKey(() => navigate('/patient/appointment/' + a.id))}
                >
                  <DoctorAvatar doctor={d} size={32} />
                  <div className="list-item-body">
                    <div className="list-item-title">{d.name} · <span className="t-muted" style={{ fontWeight: 400 }}>{d.specialty}</span></div>
                    <div className="list-item-sub">{window.formatDate(a.date)} · {a.time}</div>
                  </div>
                  <StatusBadge status={a.status} />
                  <Icon name="chevron-right" size={16} style={{ color: 'var(--text-subtle)' }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---------- Doctor Listing ----------
const MOBILE_DOCTOR_QUERY = '(max-width: 720px)';
const MOBILE_DOCTOR_PAGE_SIZE = 6;

function DoctorListing() {
  const store = useStore();
  // Simulated fetch — skeleton cards while "loading", same 600ms pattern as
  // the other patient pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [avail, setAvail] = useState('all');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_DOCTOR_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_DOCTOR_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Back to page 1 whenever the filters or the layout mode change so the
  // selected page is never out of range for the current page size
  useEffect(() => { setPage(1); }, [query, specialty, avail, isMobile]);

  const filtered = store.doctors.filter(d => {
    if (query && !(d.name.toLowerCase().includes(query.toLowerCase()) || d.specialty.toLowerCase().includes(query.toLowerCase()))) return false;
    if (specialty !== 'all' && d.specialty !== specialty) return false;
    if (avail !== 'all' && d.status !== avail) return false;
    return true;
  });

  const visibleDoctors = isMobile
    ? filtered.slice((page - 1) * MOBILE_DOCTOR_PAGE_SIZE, page * MOBILE_DOCTOR_PAGE_SIZE)
    : filtered;

  const [profileDoc, setProfileDoc] = useState(null);

  return (
    <AppShell current="doctors">
      <div className="page">
        <PageHeader
          title="Find a doctor"
          subtitle="Browse specialists by department and check real-time availability."
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Find a doctor' }]}
        />

        {/* Filter bar */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="doctor-filters">
            <div className="input-group doctor-filter-search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by name or specialty..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div className="doctor-filter-field">
              <SelectInput value={specialty} onChange={e => setSpecialty(e.target.value)}>
                <option value="all">All specialties</option>
                {window.SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
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
              <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {store.doctors.length} doctors
            </div>
          </div>
        </div>

        {loading ? (
          // Skeleton doctor cards mirroring the real card layout (avatar +
          // name + specialty + rating/badge + room) so there is no layout shift
          <div className="doctor-grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="doctor-card">
                <div className="doctor-card-head">
                  <span className="skel" style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="skel" style={{ width: '80%', height: 14, display: 'block' }} />
                    <span className="skel" style={{ width: '50%', height: 11, display: 'block', marginTop: 7 }} />
                  </div>
                </div>
                <div className="doctor-card-meta">
                  <span className="skel" style={{ width: 90, height: 12 }} />
                  <span className="skel" style={{ width: 70, height: 18 }} />
                </div>
                <div className="doctor-card-meta">
                  <span className="skel" style={{ width: '75%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="search-x"
              title={`No doctors match "${query || specialty}"`}
              message="Try broadening your search or clearing filters to see more results."
              actions={<button className="btn btn-secondary" onClick={() => { setQuery(''); setSpecialty('all'); setAvail('all'); }}>Clear filters</button>}
            />
          </div>
        ) : (
          <>
            <div className="doctor-grid">
              {visibleDoctors.map(d => (
              // role="button" instead of a real <button> because the card contains
              // its own nested buttons (View profile / Book); keyboard users get
              // Enter/Space activation via activateOnKey (guidelines 20 & 36)
              <div
                key={d.id}
                className="doctor-card"
                role="button"
                tabIndex={0}
                aria-label={`View availability and book with ${d.name}`}
                onClick={() => navigate('/patient/availability/' + d.id)}
                onKeyDown={activateOnKey(() => navigate('/patient/availability/' + d.id))}
              >
                <div className="doctor-card-head">
                  <DoctorAvatar doctor={d} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="doctor-card-name">{d.name}</div>
                    <div className="doctor-card-spec">{d.specialty}</div>
                  </div>
                </div>
                <div className="doctor-card-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="star" size={14} style={{ color: '#F59E0B' }} />
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{d.rating}</span>
                    <span>· {d.exp} yrs</span>
                  </div>
                  <DoctorStatusBadge status={d.status} />
                </div>
                <div className="doctor-card-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="map-pin" size={13} /> {d.room}
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--text)' }}>₱{d.fee.toLocaleString()}</div>
                </div>
                <div className="doctor-card-footer">
                  <button className="btn btn-ghost sm" onClick={(e) => { e.stopPropagation(); setProfileDoc(d); }}>View profile</button>
                  <button className="btn btn-primary sm"
                    disabled={d.status === 'on-leave'}
                    onClick={(e) => { e.stopPropagation(); navigate('/patient/availability/' + d.id); }}>
                    Book
                  </button>
                </div>
              </div>
            ))}
            </div>

            {/* Honesty labels (audit-002 #10/#11): ratings and portraits are
                seed/demo data, presented as such instead of as real facts */}
            <p className="t-muted" style={{ fontSize: 12.5, marginTop: 14 }}>
              Doctor ratings and photos are sample prototype data (randomuser.me placeholder portraits), not real staff profiles or collected patient reviews.
            </p>

            {isMobile && (
              <div className="doctors-pager" style={{ marginTop: 16 }}>
                <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={MOBILE_DOCTOR_PAGE_SIZE} label="doctors" />
              </div>
            )}
          </>
        )}

        {profileDoc && (
          <Modal
            open
            onClose={() => setProfileDoc(null)}
            title="Doctor profile"
            icon="stethoscope"
            iconKind="info"
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setProfileDoc(null)}>Close</button>
                <button
                  className="btn btn-primary"
                  disabled={profileDoc.status === 'on-leave'}
                  onClick={() => navigate('/patient/availability/' + profileDoc.id)}
                >
                  Book appointment
                </button>
              </>
            }
          >
            <div className="appt-head">
              <DoctorAvatar doctor={profileDoc} size={56} />
              <div className="appt-head-info">
                <div style={{ fontWeight: 600, fontSize: 16 }}>{profileDoc.name}</div>
                <div className="t-muted">{profileDoc.specialty}</div>
              </div>
              <div className="appt-head-status">
                <DoctorStatusBadge status={profileDoc.status} />
              </div>
            </div>
            <div className="divider" />
            <div className="detail-list">
              <div className="detail-row"><div className="label">Consultation fee</div><div className="value">₱{profileDoc.fee.toLocaleString()}</div></div>
              <div className="detail-row"><div className="label">Experience</div><div className="value">{profileDoc.exp} years</div></div>
              <div className="detail-row"><div className="label">Rating</div><div className="value">{profileDoc.rating} / 5.0</div></div>
              <div className="detail-row"><div className="label">Room</div><div className="value">{profileDoc.room}</div></div>
              <div className="detail-row"><div className="label">Consultation length</div><div className="value">30 minutes</div></div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}

// ---------- Doctor Availability ----------
function DoctorAvailability({ doctorId }) {
  const store = useStore();
  const doctor = window.findDoctor(doctorId);
  const dates = Object.keys(window.AVAILABILITY_TEMPLATE);
  const [date, setDate] = useState(dates[0]);
  const [slot, setSlot] = useState(null);

  if (!doctor) {
    return (
      <AppShell current="doctors">
        <div className="page"><ErrorState title="Doctor not found" message="This doctor may have moved or been removed." onRetry={() => navigate('/patient/doctors')} /></div>
      </AppShell>
    );
  }

  const slots = getSlotsFor(doctor.id, date, store.appointments);

  const cont = () => {
    if (!slot) return;
    store.setPendingBooking({ doctorId: doctor.id, date, time: slot });
    navigate('/patient/book');
  };

  return (
    <AppShell current="doctors">
      <div className="page">
        <PageHeader
          title={doctor.name}
          subtitle={`${doctor.specialty} · ${doctor.room}`}
          breadcrumbs={[
            { label: 'Home', to: '/patient/dashboard' },
            { label: 'Find a doctor', to: '/patient/doctors' },
            { label: 'Availability' },
          ]}
          actions={<button className="btn btn-ghost" onClick={() => navigate('/patient/doctors')}><Icon name="arrow-left" size={14} /> Back</button>}
        />

        <div className="two-col">
          <div className="stack lg">
            <div className="card">
              <div className="card-header">
                <h2 className="h-section">Select a date</h2>
                <span className="t-muted" style={{ fontSize: 12 }}>Available in the coming days</span>
              </div>
              <div className="date-chip-row">
                {dates.map(d => {
                  const dt = new Date(d + 'T00:00:00');
                  const on = d === date;
                  return (
                    <button key={d} onClick={() => { setDate(d); setSlot(null); }}
                      className="chip date-chip"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '10px 14px', borderRadius: 8,
                        background: on ? 'var(--primary)' : 'var(--surface)',
                        color: on ? '#fff' : 'var(--text-secondary)',
                        borderColor: on ? 'var(--primary)' : 'var(--border-strong)',
                      }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                        {dt.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{dt.getDate()}</span>
                      <span style={{ fontSize: 10, fontWeight: 500 }}>{dt.toLocaleDateString('en-US', { month: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="h-section">Available time slots</h2>
                <span className="t-muted" style={{ fontSize: 12 }}>{window.formatDateLong(date)}</span>
              </div>
              <div style={{ padding: 20 }}>
                <div className="chip-group">
                  {slots.map(([t, ok]) => (
                    <button key={t} className={'chip' + (slot === t ? ' on' : '')}
                      disabled={!ok}
                      onClick={() => setSlot(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border-strong)' }} /> Available</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--surface-muted)' }} /> Booked</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--primary)' }} /> Selected</div>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate('/patient/doctors')}>Cancel</button>
                <button className="btn btn-primary" disabled={!slot} onClick={cont}>
                  Continue
                </button>
              </div>
            </div>
          </div>

          <div className="stack lg">
            <div className="card">
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <DoctorAvatar doctor={doctor} size={56} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{doctor.name}</div>
                    <div className="t-muted">{doctor.specialty}</div>
                  </div>
                </div>
                <DoctorStatusBadge status={doctor.status} />
                <div className="divider" />
                <div className="detail-list">
                  <div className="detail-row"><div className="label">Consultation fee</div><div className="value">₱{doctor.fee.toLocaleString()}</div></div>
                  <div className="detail-row"><div className="label">Experience</div><div className="value">{doctor.exp} years</div></div>
                  <div className="detail-row"><div className="label">Rating</div><div className="value">{doctor.rating} / 5.0</div></div>
                  <div className="detail-row"><div className="label">Room</div><div className="value">{doctor.room}</div></div>
                  <div className="detail-row"><div className="label">Consultation length</div><div className="value">30 minutes</div></div>
                </div>
              </div>
            </div>

            {slot && (
              <div className="card" style={{ background: 'var(--primary-soft)', borderColor: '#BFDBFE' }}>
                <div style={{ padding: 16 }}>
                  <div className="t-help" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>Your selection</div>
                  <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><Icon name="calendar" size={14} /> {window.formatDateLong(date)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><Icon name="clock" size={14} /> {slot}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---------- Book Appointment (form) ----------
function BookAppointment() {
  const store = useStore();
  const pending = store.pendingBooking;
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — centered circle spinner while "loading", same 600ms
  // pattern as the other patient pages
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setPageLoading(false), 600); return () => clearTimeout(t); }, []);
  const [form, setForm] = useState({
    doctorId: pending?.doctorId || '',
    date: pending?.date || '',
    time: pending?.time || '',
    reason: '',
    notes: '',
    contact: me.phone,
    isFirstVisit: 'yes',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const doctor = form.doctorId ? window.findDoctor(form.doctorId) : null;
  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.doctorId) e.doctorId = 'Please select a doctor';
    if (!form.date) e.date = 'Please pick a date';
    if (!form.time) e.time = 'Please pick a time slot';
    if (!form.reason.trim()) e.reason = 'Please tell us the reason for your visit';
    else if (form.reason.trim().length < 10) e.reason = 'Please provide a bit more detail (10+ characters)';
    if (!form.contact.trim()) e.contact = 'Contact number is required';
    // Duplicate-booking guard: one active appointment per doctor+date+time
    if (!e.doctorId && !e.date && !e.time && isSlotTaken(form.doctorId, form.date, form.time, store.appointments)) {
      e.time = 'That slot has already been booked. Please pick a different date or time.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const id = 'ap' + Date.now();
      const newAppt = {
        id,
        patientId: me.id,
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      store.setAppointments([newAppt, ...store.appointments]);
      store.setLastBookingId(id);
      store.setPendingBooking(null);
      navigate('/patient/confirmation');
    }, 1200);
  };

  if (pageLoading) {
    return (
      <AppShell current="book">
        <div className="page"><PageSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell current="book">
      <div className="page">
        <PageHeader
          title="Book an appointment"
          subtitle="Review the details below and confirm your appointment."
          breadcrumbs={[
            { label: 'Home', to: '/patient/dashboard' },
            { label: 'Find a doctor', to: '/patient/doctors' },
            { label: 'Book appointment' },
          ]}
        />

        <div className="two-col">
          <form onSubmit={submit} noValidate>
            <div className="card">
              <div className="card-header"><h2 className="h-section">Appointment details</h2></div>
              <div className="card-body">
                <div className="stack lg">
                  <Field label="Doctor" required error={errors.doctorId}>
                    <SelectInput value={form.doctorId} onChange={e => {
                      const prev = form.doctorId;
                      update('doctorId', e.target.value);
                      // Switching doctors invalidates the previously chosen slot
                      if (e.target.value !== prev) setForm(f => ({ ...f, date: '', time: '' }));
                    }} error={errors.doctorId}>
                      <option value="">Select a doctor...</option>
                      {store.doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Date" required error={errors.date}>
                      <SelectInput value={form.date} onChange={e => {
                        const prev = form.date;
                        update('date', e.target.value);
                        // Changing dates invalidates the previously chosen time slot
                        if (e.target.value !== prev) setForm(f => ({ ...f, time: '' }));
                      }} error={errors.date}>
                        <option value="">Choose a date...</option>
                        {Object.keys(window.AVAILABILITY_TEMPLATE).map(d => (
                          <option key={d} value={d}>{window.formatDateLong(d)}</option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Time slot" required error={errors.time}>
                      <SelectInput value={form.time} onChange={e => update('time', e.target.value)} error={errors.time}>
                        <option value="">Choose a time...</option>
                        {getSlotsFor(form.doctorId, form.date, store.appointments).filter(s => s[1]).map(([t]) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>

                  <Field label="Reason for visit" required error={errors.reason}
                    help={!errors.reason && "Briefly describe your symptoms or reason. This helps the doctor prepare."}>
                    <TextArea
                      placeholder="e.g., Follow-up on blood pressure medication and ECG review"
                      value={form.reason}
                      onChange={e => update('reason', e.target.value)}
                      error={errors.reason}
                      maxLength={500}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: -4 }}>{form.reason.length}/500</div>
                  </Field>

                  <Field label="Additional notes" help="Optional. Anything else the doctor should know.">
                    <TextArea placeholder="Any allergies, current medications, recent test results..."
                      value={form.notes} onChange={e => update('notes', e.target.value)} />
                  </Field>

                  <Field label="Contact number" required error={errors.contact}>
                    <TextInput icon="phone" type="tel" value={form.contact}
                      onChange={e => update('contact', e.target.value)} error={errors.contact} />
                  </Field>

                  <Field label="Is this your first visit with this doctor?">
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label className="radio"><input type="radio" name="fv" checked={form.isFirstVisit === 'yes'} onChange={() => update('isFirstVisit', 'yes')} /> Yes, first visit</label>
                      <label className="radio"><input type="radio" name="fv" checked={form.isFirstVisit === 'no'} onChange={() => update('isFirstVisit', 'no')} /> Follow-up</label>
                    </div>
                  </Field>
                </div>
              </div>
              <div className="card-footer">
                <button type="button" className="btn btn-ghost" onClick={() => navigate('/patient/doctors')}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}>
                  Confirm booking
                </button>
              </div>
            </div>
          </form>

          <div className="stack lg">
            <div className="card">
              <div className="card-header"><h2 className="h-section">Summary</h2></div>
              <div className="card-body">
                {doctor ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <DoctorAvatar doctor={doctor} size={44} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{doctor.name}</div>
                        <div className="t-muted" style={{ fontSize: 13 }}>{doctor.specialty}</div>
                      </div>
                    </div>
                    <div className="detail-list">
                      <div className="detail-row"><div className="label">Date</div><div className="value">{form.date ? window.formatDateLong(form.date) : '—'}</div></div>
                      <div className="detail-row"><div className="label">Time</div><div className="value">{form.time || '—'}</div></div>
                      <div className="detail-row"><div className="label">Location</div><div className="value">{doctor.room}</div></div>
                      <div className="detail-row"><div className="label">Consultation fee</div><div className="value">₱{doctor.fee.toLocaleString()}</div></div>
                    </div>
                  </>
                ) : (
                  <div className="t-muted" style={{ padding: '12px 0' }}>Select a doctor to see summary.</div>
                )}
              </div>
            </div>

            <div className="card" style={{ background: '#F0F9FF', borderColor: '#BAE6FD' }}>
              <div style={{ padding: 16, display: 'flex', gap: 12 }}>
                <Icon name="info" size={18} style={{ color: 'var(--info)', marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--info-text)', lineHeight: 1.6 }}>
                  Your appointment will be reviewed by our staff. Its status will update here in the portal.
                  You can cancel free of charge any time before your visit.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---------- Booking Confirmation ----------
function BookingConfirmation() {
  const store = useStore();
  const id = store.lastBookingId;
  const appt = store.appointments.find(a => a.id === id);
  const doctor = appt ? window.findDoctor(appt.doctorId) : null;

  return (
    <AppShell current="doctors">
      <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Icon name="check-circle-2" size={36} />
          </div>
          <h1 className="h-page" style={{ marginBottom: 8 }}>Appointment successfully booked</h1>
          <p className="t-muted" style={{ fontSize: 14, maxWidth: 400, margin: '0 auto 24px' }}>
            Your appointment request has been received. You can track your appointment status any time from your dashboard.
          </p>

          {appt && doctor && (
            <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <DoctorAvatar doctor={doctor} size={44} />
                <div>
                  <div style={{ fontWeight: 600 }}>{doctor.name}</div>
                  <div className="t-muted" style={{ fontSize: 13 }}>{doctor.specialty}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}><StatusBadge status="pending" /></div>
              </div>
              <div className="divider" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div className="t-help">Date</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{window.formatDate(appt.date)}</div>
                </div>
                <div>
                  <div className="t-help">Time</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{appt.time}</div>
                </div>
                <div>
                  <div className="t-help">Location</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{doctor.room}</div>
                </div>
                <div>
                  <div className="t-help">Reference #</div>
                  <div className="t-mono" style={{ fontSize: 14, fontWeight: 500 }}>{appt.id.toUpperCase()}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/patient/dashboard')}>Back to dashboard</button>
            <button className="btn btn-primary" onClick={() => navigate('/patient/status')}>View appointment status</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---------- Appointment Status ----------
function AppointmentStatus() {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — skeleton page while "loading", same 600ms pattern as the
  // other patient pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const active = store.appointments
    .filter(a => a.patientId === me.id && (a.status === 'pending' || a.status === 'confirmed'))
    .sort((a, b) => a.date.localeCompare(b.date));

  const appt = active[0] || store.appointments.find(a => a.patientId === me.id);

  // Skeleton mirrors the real layout (header card + facts + timeline) so there
  // is no layout shift when the data lands; placed before the !appt early
  // return so the empty state never flashes during the loading window
  if (loading) {
    return (
      <AppShell current="dashboard">
        <div className="page" style={{ maxWidth: 900 }}>
          <PageHeader
            title="Appointment status"
            subtitle="Track your current appointment's progress."
            breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Status' }]}
            actions={<button className="btn btn-secondary" onClick={() => navigate('/patient/history')}>View history</button>}
          />

          <div className="card" style={{ marginBottom: 16 }} aria-hidden="true">
            <div className="card-body">
              <div className="appt-head">
                <span className="skel" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
                <div className="appt-head-info">
                  <span className="skel" style={{ width: 220, maxWidth: '100%', height: 16, display: 'block' }} />
                  <span className="skel" style={{ width: 260, maxWidth: '100%', height: 12, display: 'block', marginTop: 8 }} />
                </div>
                <div className="appt-head-status">
                  <span className="skel" style={{ width: 80, height: 20, display: 'block' }} />
                  <span className="skel" style={{ width: 110, height: 12, display: 'block', marginTop: 8 }} />
                </div>
              </div>
              <div className="divider" />
              <div className="appt-facts">
                {[0, 1, 2].map(i => (
                  <div key={i} className="appt-fact">
                    <span className="skel" style={{ width: 46, height: 11, display: 'block' }} />
                    <span className="skel" style={{ width: '70%', height: 15, display: 'block', marginTop: 7 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <div className="card-header"><h2 className="h-section">Progress timeline</h2></div>
              <div className="card-body" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                    <span className="skel" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span className="skel" style={{ width: '40%', height: 12, display: 'block' }} />
                      <span className="skel" style={{ width: '65%', height: 10, display: 'block', marginTop: 6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2 className="h-section">What to bring</h2></div>
              <div className="card-body" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="skel" style={{ width: `${60 + i * 8}%`, height: 12, display: 'block', marginBottom: 12 }} />
                ))}
                <span className="skel" style={{ width: '100%', height: 36, display: 'block', marginTop: 8 }} />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!appt) {
    return (
      <AppShell current="dashboard">
        <div className="page">
          <PageHeader title="Appointment status" breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Status' }]} />
          <div className="card"><EmptyState icon="calendar-x" title="No appointments yet" message="Book your first appointment to see status updates here."
            actions={<button className="btn btn-primary" onClick={() => navigate('/patient/book')}>Book appointment</button>} /></div>
        </div>
      </AppShell>
    );
  }

  // Fallback keeps the page rendering if this doctor was removed in the admin console
  const doctor = window.findDoctor(appt.doctorId) || { name: 'Unknown doctor', specialty: '—', room: '—' };
  const steps = [
    { label: 'Booked',    sub: `Request submitted · ${window.formatDate(appt.createdAt || appt.date)}`, done: true, active: false },
    { label: 'Reviewed by staff', sub: appt.status === 'pending' ? 'Awaiting confirmation' : 'Confirmed', done: appt.status !== 'pending', active: appt.status === 'pending' },
    { label: 'Confirmed', sub: appt.status === 'confirmed' || appt.status === 'completed' ? 'Ready to visit' : 'Waiting', done: appt.status === 'confirmed' || appt.status === 'completed', active: appt.status === 'confirmed' },
    { label: 'Visit completed', sub: appt.status === 'completed' ? 'Doctor notes available in records' : 'After your visit', done: appt.status === 'completed', active: false },
  ];

  return (
    <AppShell current="dashboard">
      <div className="page" style={{ maxWidth: 900 }}>
        <PageHeader
          title="Appointment status"
          subtitle="Track your current appointment's progress."
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Status' }]}
          actions={<button className="btn btn-secondary" onClick={() => navigate('/patient/history')}>View history</button>}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div className="appt-head">
              <DoctorAvatar doctor={doctor} size={56} />
              <div className="appt-head-info">
                <div style={{ fontWeight: 600, fontSize: 16 }}>{doctor.name}</div>
                <div className="t-muted">{doctor.specialty} · {doctor.room}</div>
              </div>
              <div className="appt-head-status">
                <StatusBadge status={appt.status} />
                <div className="t-muted" style={{ fontSize: 13, marginTop: 6 }}>Ref # <span className="t-mono">{appt.id.toUpperCase()}</span></div>
              </div>
            </div>
            <div className="divider" />
            <div className="appt-facts">
              <div className="appt-fact">
                <div className="t-help">Date</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{window.formatDateLong(appt.date)}</div>
              </div>
              <div className="appt-fact">
                <div className="t-help">Time</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{appt.time}</div>
              </div>
              <div className="appt-fact">
                <div className="t-help">Fee</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>₱{doctor.fee.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header"><h2 className="h-section">Progress timeline</h2></div>
            <div className="card-body">
              <div className="timeline">
                {steps.map((s, i) => (
                  <div key={i} className="timeline-item">
                    <div className={'timeline-dot ' + (s.done ? 'done' : s.active ? 'active' : '')}>
                      {s.done ? <Icon name="check" size={12} /> : s.active ? <Icon name="clock" size={12} /> : null}
                    </div>
                    <div className="timeline-body">
                      <div className="timeline-title">{s.label}</div>
                      <div className="timeline-sub">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="h-section">What to bring</h2></div>
            <div className="card-body">
              <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
                <li>Valid ID with photo</li>
                <li>HMO card (if applicable)</li>
                <li>List of current medications</li>
                <li>Any prior lab or imaging results</li>
              </ul>
              <div className="divider" />
              <button className="btn btn-secondary block" onClick={() => navigate('/patient/appointment/' + appt.id)}>
                View full appointment details
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---------- Appointment History ----------
function AppointmentHistory() {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — skeleton table while "loading", same 600ms pattern as
  // the admin list pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  // Column sorting (guideline 18) — default stays newest-first by date
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const PAGE = 4;

  const all = store.appointments.filter(a => a.patientId === me.id);
  const filtered = all.filter(a => {
    if (status !== 'all' && a.status !== status) return false;
    if (query) {
      const d = window.findDoctor(a.doctorId) || { name: '', specialty: '' };
      const hay = (d.name + ' ' + d.specialty + ' ' + a.reason).toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  };
  const sortVal = (a) => {
    switch (sortKey) {
      case 'doctor': return ((window.findDoctor(a.doctorId) || {}).name || '').toLowerCase();
      case 'specialty': return ((window.findDoctor(a.doctorId) || {}).specialty || '').toLowerCase();
      case 'time': return a.time;
      case 'status': return a.status;
      default: return a.date;
    }
  };
  const dir = sortDir === 'asc' ? 1 : -1;
  const sorted = filtered.slice().sort((a, b) => {
    const va = sortVal(a), vb = sortVal(b);
    if (va !== vb) return (va < vb ? -1 : 1) * dir;
    // Tie-breaker: equal values keep the newest-first date order
    return b.date.localeCompare(a.date);
  });

  const paged = sorted.slice((page - 1) * PAGE, page * PAGE);
  // A sort change can move the current page out of range
  useEffect(() => { setPage(1); }, [sortKey, sortDir]);

  const doCancel = () => {
    setCancelLoading(true);
    setTimeout(() => {
      store.setAppointments(store.appointments.map(a => a.id === confirmCancel.id ? { ...a, status: 'cancelled' } : a));
      setCancelLoading(false);
      setConfirmCancel(null);
      store.pushToast({ title: 'Appointment cancelled', msg: 'Your appointment has been cancelled successfully.' });
    }, 700);
  };

  return (
    <AppShell current="history">
      <div className="page">
        <PageHeader
          title="My appointments"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 200, maxWidth: '100%', height: 14 }} />
            : `${all.length} appointments in total`}
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Appointments' }]}
          actions={<button className="btn btn-primary" onClick={() => navigate('/patient/book')}><Icon name="calendar-plus" size={14} /> Book appointment</button>}
        />

        <div className="card">
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search doctor, specialty, or reason..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <SelectInput
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              aria-label="Filter appointments by status"
              style={{ maxWidth: 190 }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </SelectInput>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="calendar-search" title="No appointments match your filters"
              message="Try changing your filters or search terms."
              actions={<button className="btn btn-secondary" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</button>} />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-responsive-stack">
                  <thead>
                    <tr>
                      <SortableTh label="Doctor" k="doctor" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableTh label="Specialty" k="specialty" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableTh label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableTh label="Time" k="time" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      // Skeleton rows mirroring the real ones: the Doctor cell has
                      // an avatar + Ref line like the loaded rows, and every cell
                      // carries data-label so the mobile stacked-card view renders
                      // with labels (plain <SkeletonRows/> bars ignore that layout)
                      Array.from({ length: 4 }).map((_, r) => (
                        <tr key={r}>
                          <td data-label="Doctor">
                            <div className="cell-with-avatar">
                              <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <span className="skel" style={{ width: 120, maxWidth: '100%', height: 12, display: 'block' }} />
                                <span className="skel" style={{ width: 70, height: 10, display: 'block', marginTop: 5 }} />
                              </div>
                            </div>
                          </td>
                          <td data-label="Specialty"><span className="skel" style={{ width: '70%', height: 12 }} /></td>
                          <td data-label="Date"><span className="skel" style={{ width: '70%', height: 12 }} /></td>
                          <td data-label="Time"><span className="skel" style={{ width: '60%', height: 12 }} /></td>
                          <td data-label="Status"><span className="skel" style={{ width: 64, height: 18 }} /></td>
                          <td className="col-actions" data-label="Actions">
                            <div className="appt-actions">
                              <span className="skel" style={{ flex: 1, maxWidth: 88, height: 30 }} />
                              <span className="skel" style={{ flex: 1, maxWidth: 64, height: 30 }} />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : paged.map(a => {
                      const d = window.findDoctor(a.doctorId) || { name: 'Unknown doctor', specialty: '—' };
                      const cancellable = a.status === 'pending' || a.status === 'confirmed';
                      return (
                        <tr key={a.id}>
                          <td>
                            <div className="cell-with-avatar">
                              <DoctorAvatar doctor={d} size={28} />
                              <div>
                                <div className="cell-primary cell-primary-truncate">{d.name}</div>
                                <div className="cell-secondary">Ref {a.id.toUpperCase()}</div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Specialty">{d.specialty}</td>
                          <td data-label="Date">{window.formatDate(a.date)}</td>
                          <td data-label="Time">{a.time}</td>
                          <td data-label="Status"><StatusBadge status={a.status} /></td>
                          <td className="col-actions" data-label="Actions">
                            <div className="appt-actions">
                              <button className="btn btn-ghost sm" onClick={() => navigate('/patient/appointment/' + a.id)}>View details</button>
                              {cancellable && (
                                <button className="btn btn-danger-outline sm" onClick={() => setConfirmCancel(a)}>Cancel</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!loading && filtered.length > 0 && (
                <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="appointments" />
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={doCancel}
        loading={cancelLoading}
        title="Cancel this appointment?"
        message={confirmCancel ? `${window.findDoctor(confirmCancel.doctorId).name} on ${window.formatDate(confirmCancel.date)} at ${confirmCancel.time}. This action cannot be undone.` : ''}
        confirmLabel="Yes, cancel it"
        kind="danger"
      />
    </AppShell>
  );
}

// ---------- Appointment Details ----------
function AppointmentDetails({ apptId }) {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  const appt = store.appointments.find(a => a.id === apptId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  // Reschedule state — hooks stay above the not-found early return.
  // Default the date picker to the appointment's date when it's in the template,
  // otherwise fall back to the first available date.
  const [reschedOpen, setReschedOpen] = useState(false);
  const [resDate, setResDate] = useState(
    appt
      ? (window.AVAILABILITY_TEMPLATE[appt.date] ? appt.date : (Object.keys(window.AVAILABILITY_TEMPLATE)[0] || ''))
      : ''
  );
  const [resSlot, setResSlot] = useState(appt ? appt.time : null);
  const [resLoading, setResLoading] = useState(false);

  if (!appt) {
    return (
      <AppShell current="history">
        <div className="page"><ErrorState title="Appointment not found" message="This appointment may have been removed." onRetry={() => navigate('/patient/history')} /></div>
      </AppShell>
    );
  }
  // Fallback keeps the page rendering if this doctor was removed in the admin console
  const doctor = window.findDoctor(appt.doctorId) || { name: 'Unknown doctor', specialty: '—', room: '—', fee: 0 };
  const cancellable = appt.status === 'pending' || appt.status === 'confirmed';
  // Own current slot stays selectable while rescheduling
  const resSlots = getSlotsFor(appt.doctorId, resDate, store.appointments, appt.id);

  const doReschedule = () => {
    setResLoading(true);
    setTimeout(() => {
      store.setAppointments(store.appointments.map(a => a.id === appt.id ? { ...a, date: resDate, time: resSlot } : a));
      setResLoading(false);
      setReschedOpen(false);
      store.pushToast({ title: 'Appointment rescheduled', msg: `Moved to ${window.formatDate(resDate)} at ${resSlot}.` });
    }, 700);
  };

  const doCancel = () => {
    setCancelLoading(true);
    setTimeout(() => {
      store.setAppointments(store.appointments.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
      setCancelLoading(false);
      setConfirmCancel(false);
      store.pushToast({ title: 'Appointment cancelled', msg: 'Your appointment has been cancelled successfully.' });
      navigate('/patient/history');
    }, 700);
  };

  const addToCalendar = () => {
    downloadFile(`medicacare-appointment-${appt.id}.ics`, buildICS(appt, doctor), 'text/calendar;charset=utf-8');
    store.pushToast({ title: 'Calendar file downloaded', msg: 'Open the .ics file to add this appointment to your calendar.' });
  };

  const downloadReceipt = () => {
    downloadFile(`medicacare-receipt-${appt.id}.html`, buildReceipt(appt, doctor, me), 'text/html;charset=utf-8');
    store.pushToast({ title: 'Receipt downloaded', msg: 'Open the file to view or print your receipt.' });
  };

  return (
    <AppShell current="history">
      <div className="page" style={{ maxWidth: 960 }}>
        <PageHeader
          title="Appointment details"
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Appointments', to: '/patient/history' }, { label: 'Details' }]}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => navigate('/patient/history')}><Icon name="arrow-left" size={14} /> Back</button>
              {cancellable && <button className="btn btn-danger" onClick={() => setConfirmCancel(true)}><Icon name="x" size={14} /> Cancel appointment</button>}
            </>
          }
        />

        <div className="two-col">
          <div className="card">
            <div className="card-body">
              <div className="appt-head">
                <DoctorAvatar doctor={doctor} size={56} />
                <div className="appt-head-info">
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{doctor.name}</div>
                  <div className="t-muted">{doctor.specialty}</div>
                </div>
                <div className="appt-head-status">
                  <StatusBadge status={appt.status} />
                </div>
              </div>
              <div className="divider" />
              <div className="detail-list">
                <div className="detail-row"><div className="label">Reference number</div><div className="value t-mono">{appt.id.toUpperCase()}</div></div>
                <div className="detail-row"><div className="label">Date</div><div className="value">{window.formatDateLong(appt.date)}</div></div>
                <div className="detail-row"><div className="label">Time</div><div className="value">{appt.time}</div></div>
                <div className="detail-row"><div className="label">Location</div><div className="value">{doctor.room} · MedicaCare</div></div>
                <div className="detail-row"><div className="label">Consultation fee</div><div className="value">₱{doctor.fee.toLocaleString()}</div></div>
                <div className="detail-row"><div className="label">Booked on</div><div className="value">{window.formatDate(appt.createdAt || appt.date)}</div></div>
                <div className="detail-row"><div className="label">Reason for visit</div><div className="value">{appt.reason}</div></div>
              </div>
            </div>
          </div>

          <div className="stack lg">
            <div className="card">
              <div className="card-header"><h3 className="h-card">Patient</h3></div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <PatientAvatar person={me} size={44} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{me.name}</div>
                    <div className="t-muted" style={{ fontSize: 12 }}>{me.email}</div>
                  </div>
                </div>
                <div className="detail-list">
                  <div className="detail-row compact"><div className="label">Phone</div><div className="value">{me.phone}</div></div>
                  <div className="detail-row compact"><div className="label">Blood type</div><div className="value">{me.bloodType}</div></div>
                  <div className="detail-row compact"><div className="label">Allergies</div><div className="value">{me.allergies}</div></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="h-card">Actions</h3></div>
              <div className="card-body stack md">
                <button className="btn btn-secondary block" onClick={downloadReceipt}><Icon name="download" size={14} /> Download receipt</button>
                <button className="btn btn-secondary block" onClick={addToCalendar}><Icon name="calendar" size={14} /> Add to calendar</button>
                <button className="btn btn-secondary block" onClick={() => navigate('/patient/status')}><Icon name="activity" size={14} /> View status timeline</button>
                {cancellable && <button className="btn btn-secondary block" onClick={() => setReschedOpen(true)}><Icon name="calendar-clock" size={14} /> Reschedule appointment</button>}
                {cancellable && <button className="btn btn-danger-outline block" onClick={() => setConfirmCancel(true)}><Icon name="x" size={14} /> Cancel appointment</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={reschedOpen}
        onClose={() => setReschedOpen(false)}
        title="Reschedule appointment"
        subtitle={`${doctor.name} · currently ${window.formatDate(appt.date)} at ${appt.time}`}
        icon="calendar-clock"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setReschedOpen(false)} disabled={resLoading}>Close</button>
            <button
              className={`btn btn-primary ${resLoading ? 'btn-loading' : ''}`}
              disabled={!resSlot || (resDate === appt.date && resSlot === appt.time)}
              onClick={doReschedule}
            >
              Save new schedule
            </button>
          </>
        }
      >
        <Field label="New date" required>
          <SelectInput value={resDate} onChange={e => { setResDate(e.target.value); setResSlot(null); }}>
            {Object.keys(window.AVAILABILITY_TEMPLATE).map(d => (
              <option key={d} value={d}>{window.formatDateLong(d)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Available time slots" required help="Slots already booked are disabled.">
          <div className="chip-group">
            {resSlots.map(([t, ok]) => (
              <button key={t} type="button" className={'chip' + (resSlot === t ? ' on' : '')} disabled={!ok} onClick={() => setResSlot(t)}>
                {t}
              </button>
            ))}
          </div>
        </Field>
      </Modal>

      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        loading={cancelLoading}
        title="Cancel this appointment?"
        message={`${doctor.name} on ${window.formatDate(appt.date)} at ${appt.time}. This action cannot be undone.`}
        confirmLabel="Yes, cancel it"
        kind="danger"
      />
    </AppShell>
  );
}

// ---------- Profile ----------
function Profile() {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — centered circle spinner while "loading", same 600ms
  // pattern as the other patient pages
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setPageLoading(false), 600); return () => clearTimeout(t); }, []);
  const [form, setForm] = useState({ ...me });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const photoInputRef = useRef(null);
  // Uploaded photo (localStorage) wins; otherwise fall back to the patient's
  // dummy portrait from the seed data
  const [photo, setPhoto] = useState(() => {
    try {
      const saved = localStorage.getItem('nmc.patientPhoto');
      if (saved) return saved;
    } catch { /* storage unavailable — use the portrait */ }
    return me.photo || '';
  });
  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      store.pushToast({ kind: 'error', title: 'Invalid file', msg: 'Please choose an image file.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      store.pushToast({ kind: 'error', title: 'Image too large', msg: 'Please choose an image under 1 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
      try { localStorage.setItem('nmc.patientPhoto', reader.result); } catch { /* storage full — keep in-session preview only */ }
      store.pushToast({ title: 'Photo updated', msg: 'Your profile photo has been changed.' });
    };
    reader.readAsDataURL(file);
  };
  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };
  const updatePw = (k, v) => { setPw(p => ({ ...p, [k]: v })); if (pwErrors[k]) setPwErrors(e => ({ ...e, [k]: null })); };

  const saveProfile = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const updated = { ...me, ...form };
      store.setCurrentPatient(updated);
      // Sync the shared patient registries so the admin console (Patients page,
      // appointment owner lookups) reflects the patient's own edits
      const idx = window.PATIENTS.findIndex(x => x.id === updated.id);
      if (idx > -1) Object.assign(window.PATIENTS[idx], updated);
      store.setPatients(store.patients.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      store.pushToast({ title: 'Profile updated', msg: 'Your changes have been saved.' });
    }, 700);
  };

  const savePw = (evt) => {
    evt.preventDefault();
    const e = {};
    const account = store.users.find(u => u.id === me.id);
    if (!pw.current) e.current = 'Enter your current password';
    else if (account && account.password !== pw.current) e.current = 'Current password is incorrect';
    if (!pw.next) e.next = 'Enter a new password';
    else if (pw.next.length < 8) e.next = 'Use at least 8 characters';
    if (!pw.confirm) e.confirm = 'Please confirm your new password';
    else if (pw.confirm !== pw.next) e.confirm = 'Passwords do not match';
    setPwErrors(e);
    if (Object.keys(e).length) return;
    setSavingPw(true);
    setTimeout(() => {
      setSavingPw(false);
      if (account) {
        store.setUsers(store.users.map(u => u.id === me.id ? { ...u, password: pw.next } : u));
      }
      setPw({ current: '', next: '', confirm: '' });
      store.pushToast({ title: 'Password changed', msg: 'Your new password is now active.' });
    }, 800);
  };

  if (pageLoading) {
    return (
      <AppShell current="profile">
        <div className="page"><PageSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell current="profile">
      <div className="page" style={{ maxWidth: 960 }}>
        <PageHeader title="Profile" subtitle="Manage your personal information and password."
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Profile' }]} />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body appt-head">
            {photo
              ? <img src={photo} alt="Profile" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              : <PatientAvatar person={me} size={72} />}
            <div className="appt-head-info">
              <div style={{ fontSize: 18, fontWeight: 600 }}>{me.name}</div>
              <div className="t-muted">Patient · Member since Aug 2024</div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoChange} />
            <button className="btn btn-secondary profile-photo-btn" onClick={() => photoInputRef.current && photoInputRef.current.click()}>
              <Icon name="upload" size={14} /> Change photo
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Personal information</h2></div>
          <form onSubmit={saveProfile}>
            <div className="card-body">
              <div className="profile-grid">
                <Field label="Full name" required error={errors.name}>
                  <TextInput value={form.name} onChange={e => update('name', e.target.value)} error={errors.name} />
                </Field>
                <Field label="Email address" required error={errors.email}>
                  <TextInput type="email" value={form.email} onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
                </Field>
                <Field label="Phone number" required error={errors.phone}>
                  <TextInput type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} error={errors.phone} icon="phone" />
                </Field>
                <Field label="Date of birth">
                  <TextInput type="date" value={form.dob} onChange={e => update('dob', e.target.value)} />
                </Field>
                <Field label="Gender">
                  <SelectInput value={form.gender} onChange={e => update('gender', e.target.value)}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Prefer not to say</option>
                  </SelectInput>
                </Field>
                <Field label="Blood type">
                  <SelectInput value={form.bloodType} onChange={e => update('bloodType', e.target.value)}>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Home address">
                  <TextInput value={form.address} onChange={e => update('address', e.target.value)} />
                </Field>
                <Field label="Emergency contact">
                  <TextInput value={form.emergencyContact} onChange={e => update('emergencyContact', e.target.value)} />
                </Field>
                <Field label="Known allergies" help="Comma-separated. Write 'None' if not applicable.">
                  <TextInput value={form.allergies} onChange={e => update('allergies', e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="card-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...me })}>Reset</button>
              <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}>Save changes</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Change password</h2></div>
          <form onSubmit={savePw}>
            <div className="card-body">
              <div className="pw-grid">
                <Field label="Current password" required error={pwErrors.current}>
                  <TextInput type="password" value={pw.current} onChange={e => updatePw('current', e.target.value)} error={pwErrors.current} />
                </Field>
                <Field label="New password" required error={pwErrors.next} help={!pwErrors.next && 'At least 8 characters'}>
                  <TextInput type="password" value={pw.next} onChange={e => updatePw('next', e.target.value)} error={pwErrors.next} />
                </Field>
                <Field label="Confirm new password" required error={pwErrors.confirm}>
                  <TextInput type="password" value={pw.confirm} onChange={e => updatePw('confirm', e.target.value)} error={pwErrors.confirm} />
                </Field>
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className={`btn btn-primary ${savingPw ? 'btn-loading' : ''}`}>Update password</button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

// ---------- Medical Records ----------
// Prototype page — all records below are FICTIONAL dummy data (real patient data is not allowed).
function MedicalRecords() {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — skeleton while "loading", same 600ms pattern as the
  // other patient pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const records = [
    { id: 'mr1', date: '2026-08-14', type: 'Consultation',      doctorId: 'd1',  title: 'Hypertension follow-up',     summary: 'Blood pressure well controlled on current medication. Continue lifestyle changes; repeat ECG in 6 months.' },
    { id: 'mr2', date: '2026-07-02', type: 'Laboratory result', doctorId: 'd9',  title: 'Complete blood count (CBC)', summary: 'All values within normal range. No further action required.' },
    { id: 'mr3', date: '2026-05-22', type: 'Laboratory result', doctorId: 'd1',  title: 'Lipid profile',              summary: 'LDL slightly elevated. Advised diet adjustment and retest after 3 months.' },
    { id: 'mr4', date: '2026-03-10', type: 'Consultation',      doctorId: 'd10', title: 'General check-up',           summary: 'No acute findings. Vaccinations up to date. Annual physical exam recommended.' },
  ];

  return (
    <AppShell current="records">
      <div className="page" style={{ maxWidth: 960 }}>
        <PageHeader
          title="Medical records"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 280, maxWidth: '100%', height: 14 }} />
            : "Summary of your past visits and lab results."}
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Medical records' }]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Health summary</h2></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {loading ? (
                [0, 1, 2].map(i => (
                  <div key={i} aria-hidden="true">
                    <span className="skel" style={{ width: 90, height: 11, display: 'block', marginBottom: 9 }} />
                    <span className="skel" style={{ width: '60%', height: 14, display: 'block' }} />
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <div className="t-muted" style={{ fontSize: 12, marginBottom: 4 }}>Blood type</div>
                    <div style={{ fontWeight: 600 }}>{me.bloodType}</div>
                  </div>
                  <div>
                    <div className="t-muted" style={{ fontSize: 12, marginBottom: 4 }}>Known allergies</div>
                    <div style={{ fontWeight: 600 }}>{me.allergies || 'None'}</div>
                  </div>
                  <div>
                    <div className="t-muted" style={{ fontSize: 12, marginBottom: 4 }}>Emergency contact</div>
                    <div style={{ fontWeight: 600 }}>{me.emergencyContact}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Records</h2></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="table table-responsive-stack records-table">
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Doctor</th><th>Record</th></tr>
                </thead>
                <tbody>
                  {loading ? <SkeletonRows rows={4} cols={4} /> : records.map(r => {
                    const doc = window.findDoctor(r.doctorId);
                    return (
                      <tr key={r.id}>
                        <td data-label="Date">{window.formatDate(r.date)}</td>
                        <td data-label="Type">{r.type}</td>
                        <td data-label="Doctor">{doc ? doc.name : '—'}</td>
                        <td className="record-cell" data-label="Record">
                          <div style={{ fontWeight: 600 }}>{r.title}</div>
                          <div className="t-muted" style={{ fontSize: 12.5 }}>{r.summary}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="t-muted" style={{ fontSize: 12, marginTop: 12 }}>
          Note: these are fictional demo records shown for prototype purposes only.
        </p>
      </div>
    </AppShell>
  );
}


// ---------- Help & Support (patient portal only) ----------
function HelpSupport() {
  const [open, setOpen] = useState(0);

  const faqs = [
    { q: 'How do I book an appointment?', a: 'Go to "Find a doctor", pick a doctor, choose an available date and time slot, then fill out the booking form. You will receive a confirmation with a reference number once submitted.' },
    { q: 'Can I cancel or reschedule an appointment?', a: 'Yes. Open "My appointments", find the appointment, and use the cancel action. To reschedule, cancel the booking and create a new one with your preferred slot.' },
    { q: 'What do the appointment statuses mean?', a: 'Pending means your request was received and is awaiting confirmation. Confirmed means your slot is reserved. Completed means the visit has happened. Cancelled means the appointment was called off.' },
    { q: 'How do I update my personal information?', a: 'Go to your Profile page to edit your contact details, address, emergency contact, and change your password.' },
    { q: 'Are my records and data secure?', a: 'Yes, within the scope of this prototype. All data stays in your browser (localStorage) and only fictional demo data is used. A production system would add server-side access control and hashed passwords.' },
  ];

  return (
    <AppShell current="help">
      <div className="page" style={{ maxWidth: 960 }}>
        <PageHeader
          title="Help & support"
          subtitle="Find quick answers or get in touch with our team."
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Help & support' }]}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
            {/* bare glyph, no tinted square — matches the public Contact page
                info rows; the chip style is reserved for interactive buttons */}
            <div className="card"><div className="card-body">
              <div className="feature-card-icon" style={{ marginBottom: 10 }}><Icon name="phone" size={18} /></div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Call us</div>
            <div className="t-muted" style={{ fontSize: 13 }}>{window.HOSPITAL.phone}</div>
            <div className="t-muted" style={{ fontSize: 12 }}>Mon–Sat, 8:00 AM – 6:00 PM</div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="feature-card-icon" style={{ marginBottom: 10 }}><Icon name="mail" size={18} /></div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Email us</div>
            <div className="t-muted" style={{ fontSize: 13 }}>{window.HOSPITAL.email}</div>
            <div className="t-muted" style={{ fontSize: 12 }}>We reply within 1–2 business days</div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="feature-card-icon" style={{ marginBottom: 10 }}><Icon name="map-pin" size={18} /></div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Visit us</div>
            <div className="t-muted" style={{ fontSize: 13 }}>{window.HOSPITAL.address}</div>
            <div className="t-muted" style={{ fontSize: 12 }}>Information desk, ground floor</div>
          </div></div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Frequently asked questions</h2></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqs.map((f, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                <button
                  type="button"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? -1 : i)}
                  style={{ background: 'transparent', border: 0, padding: '10px 0', minHeight: 44, width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
                >
                  <Icon name={open === i ? 'chevron-down' : 'chevron-right'} size={16} />
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{f.q}</span>
                </button>
                {open === i && (
                  <p className="t-muted" style={{ fontSize: 13.5, margin: '8px 0 0 24px', lineHeight: 1.55 }}>{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div className="empty-state-icon" style={{ background: 'var(--error-soft)', color: 'var(--error)' }}>
              <Icon name="alert-triangle" size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 600 }}>Medical emergency?</div>
              <div className="t-muted" style={{ fontSize: 13 }}>Do not use this portal. Call 911 or go to the nearest emergency room immediately.</div>
            </div>
            <a className="btn btn-secondary" href="#/contact">Contact page</a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}


Object.assign(window, {
  PatientDashboard, DoctorListing, DoctorAvailability, BookAppointment,
  BookingConfirmation, AppointmentStatus, AppointmentHistory, AppointmentDetails, Profile,
  MedicalRecords, HelpSupport,
});

export {
  PatientDashboard, DoctorListing, DoctorAvailability, BookAppointment,
  BookingConfirmation, AppointmentStatus, AppointmentHistory, AppointmentDetails, Profile,
  MedicalRecords, HelpSupport,
};

