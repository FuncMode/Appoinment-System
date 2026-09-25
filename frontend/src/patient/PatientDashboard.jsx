// PatientDashboard — patient (split from screens-patient.jsx)
import { useEffect, useState } from 'react';
import { AppShell, DoctorAvatar, EmptyState, Icon, navigate, PageHeader, StatusBadge, useStore } from '../shared/components.jsx';
import { CURRENT_PATIENT, findDoctor, formatDate, timeValue } from '../shared/data.js';

import { activateOnKey } from './helpers.js';

// ---------- Patient Dashboard ----------
// Patient-specific, state-aware: the subtitle, stats, and banner all
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
    .sort((a, b) => a.date.localeCompare(b.date) || timeValue(a.time) - timeValue(b.time));
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
    { label: 'Completed visits', value: completed12mo.length, context: completed12mo.length ? `Across ${new Set(completed12mo.map(a => a.doctorId)).size} doctor${new Set(completed12mo.map(a => a.doctorId)).size === 1 ? '' : 's'}` : 'No visits in the last 12 months', icon: 'check-circle-2' },
    { label: 'Last visit', value: lastVisitShort, context: lastVisitDoctor ? `With ${lastVisitDoctor.name}` : 'No past visits yet', icon: 'clock' },
  ];

  // Personal, state-aware subtitle instead of a static tagline
  const subtitle = next
    ? `You have ${upcoming.length} upcoming appointment${upcoming.length === 1 ? '' : 's'}. Your next visit is on ${window.formatDate(next.date)} at ${next.time}.`
    : 'No upcoming appointments. Your schedule is clear.';

  return (
    <AppShell current="dashboard">
      <div className="page">
        {/* Subtitle skeletoned during the same 600ms loading window as the
            banner/stats below so every row of the page fades in together;
            the title is static ("Dashboard") so it stays */}
        <PageHeader
          title="Dashboard"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 430, maxWidth: '100%', height: 14 }} />
            : subtitle}
          actions={
            <button type="button" className="btn btn-primary" onClick={() => navigate('/patient/book')}>
              <Icon name="calendar-plus" size={14} /> Book appointment
            </button>
          }
        />

        {/* Next appointment banner (skeleton while loading) — mirrors the
            real banner's layout on both breakpoints: compact date chip,
            label + name + two meta lines in the info block, and two
            equal-width action buttons at the bottom */}
        {loading ? (
          <div className="next-appt-card" style={{ marginBottom: 20 }} aria-hidden="true">
            <div className="next-appt-date">
              <span className="skel" style={{ display: 'block', width: 26, height: 10, margin: '0 auto' }} />
              <span className="skel" style={{ display: 'block', width: 22, height: 18, margin: '5px auto 0' }} />
            </div>
            <div className="next-appt-info">
              <span className="skel" style={{ width: 140, height: 10, display: 'block' }} />
              <span className="skel" style={{ width: '72%', height: 15, display: 'block', marginTop: 9 }} />
              <span className="skel" style={{ width: '52%', height: 12, display: 'block', marginTop: 10 }} />
              <span className="skel" style={{ width: '44%', height: 12, display: 'block', marginTop: 8 }} />
            </div>
            <div className="next-appt-actions">
              <span className="skel" style={{ flex: 1, maxWidth: 130, height: 44 }} />
              <span className="skel" style={{ flex: 1, maxWidth: 114, height: 44 }} />
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
              {/* Ghost, not primary — the header's "Book appointment" is this
                  view's single primary CTA (one saturated button per screen) */}
              <button className="btn btn-ghost" onClick={() => navigate('/patient/status')}>Check status</button>
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
              {/* Context-aware first tile: with an upcoming visit the top action
                  is managing that visit; without one it's booking a new one */}
              {next ? (
                <button type="button" className="quick-action" onClick={() => navigate('/patient/appointment/' + next.id)}>
                  <div className="quick-action-icon"><Icon name="calendar-clock" size={18} /></div>
                  <div className="quick-action-body">
                    <div className="quick-action-title">Reschedule next visit</div>
                    <div className="quick-action-sub">Currently {window.formatDate(next.date)}, {next.time}</div>
                  </div>
                  <Icon name="chevron-right" size={16} className="quick-action-arrow" />
                </button>
              ) : (
                <button type="button" className="quick-action" onClick={() => navigate('/patient/book')}>
                  <div className="quick-action-icon"><Icon name="calendar-plus" size={18} /></div>
                  <div className="quick-action-body">
                    <div className="quick-action-title">Book appointment</div>
                    <div className="quick-action-sub">Find a doctor and time slot</div>
                  </div>
                  <Icon name="chevron-right" size={16} className="quick-action-arrow" />
                </button>
              )}
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

export { PatientDashboard };
