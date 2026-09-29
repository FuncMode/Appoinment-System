import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart, DoctorRatingPill,
} from '../shared/components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
} from '../shared/data.js';
import { IOSDevice, IOSStatusBar, IOSGlassPill, IOSNavBar, IOSList, IOSListRow, IOSKeyboard } from '../shared/ios_frame.jsx';


// ============================================================
// Mobile screens (rendered inside IOSDevice frames)
// ============================================================

function MobileShowcase() {
  const [tab, setTab] = useState('dashboard');
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'doctors', label: 'Doctors' },
    { id: 'booking', label: 'Book' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F1F3F6' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 20 }}>
        <a href="#/patient/dashboard" className="btn btn-ghost" style={{ padding: 6 }}>
          <Icon name="arrow-left" size={16} /> Back to app
        </a>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Mobile screens</div>
          <div className="t-muted" style={{ fontSize: 12 }}>iPhone frame · 402 × 874 · The four key patient flows on small screens</div>
        </div>
        <div className="role-switch">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '40px 24px 80px', display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <IOSDevice>
            {tab === 'dashboard' && <PhoneDashboard />}
            {tab === 'doctors' && <PhoneDoctorList />}
            {tab === 'booking' && <PhoneBooking />}
            {tab === 'history' && <PhoneHistory />}
          </IOSDevice>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{tabs.find(t => t.id === tab).label}</div>
        </div>

        <div style={{ maxWidth: 320, paddingTop: 8 }}>
          <h2 className="h-section" style={{ marginBottom: 8 }}>Mobile design notes</h2>
          <p className="t-muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            Mobile is not a shrunken desktop. Tables are converted into cards, secondary actions
            move to overflow menus, and primary navigation lives in a bottom bar with 5 items.
          </p>
          <div className="stack md" style={{ fontSize: 13 }}>
            <MobileNote icon="hand-metal" title="Touch targets" body="All interactive elements are at least 44×44px." />
            <MobileNote icon="layout-list" title="Card-based tables" body="Appointment History transforms into stacked cards showing only what matters." />
            <MobileNote icon="compass" title="Bottom navigation" body="Home, Book, Appointments, Records, Profile. Fixed, always reachable." />
            <MobileNote icon="menu" title="Bottom sheets" body="Filters and 'more actions' menus slide up from the bottom instead of taking the whole screen." />
            <MobileNote icon="scan-line" title="Progressive disclosure" body="Tap into cards for full details rather than trying to show everything at once." />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNote({ icon, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={16} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div className="t-muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

// ---------- Common phone bottom nav ----------
function PhoneBottomNav({ current }) {
  const items = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'book', label: 'Book', icon: 'calendar-plus' },
    { id: 'appts', label: 'Appointments', icon: 'calendar-check' },
    { id: 'records', label: 'Records', icon: 'file-text' },
    { id: 'profile', label: 'Profile', icon: 'user-round' },
  ];
  return (
    <div className="bottom-nav">
      {items.map(i => (
        <button key={i.id} className={'bottom-nav-item' + (current === i.id ? ' on' : '')}>
          <Icon name={i.icon} size={20} /> {i.label}
        </button>
      ))}
    </div>
  );
}

function PhoneHeader({ title, right }) {
  return (
    <div style={{ padding: '52px 20px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ---------- Phone: Dashboard ----------
function PhoneDashboard() {
  const doctor = window.findDoctor('d1');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F5F7FA', fontFamily: 'IBM Plex Sans, -apple-system, sans-serif' }}>
      <div style={{ padding: '52px 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar">JB</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Good morning,</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Juan Miguel B.</div>
          </div>
          <button style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-muted)', border: 0, display: 'grid', placeItems: 'center', position: 'relative' }}>
            <Icon name="bell" size={18} />
            <span style={{ position: 'absolute', top: 8, right: 10, width: 7, height: 7, borderRadius: '50%', background: 'var(--error)', border: '2px solid #fff' }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {/* Next appointment */}
        <div style={{ margin: '16px 16px 20px', borderRadius: 12, padding: 16, background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            <Icon name="calendar" size={12} /> Next appointment · Confirmed
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{doctor.name.replace('Dr. ', 'Dr. ')}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{doctor.specialty} · {doctor.room}</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '14px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13 }}>
              <div style={{ opacity: 0.8, fontSize: 11 }}>DATE & TIME</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>Fri, Sep 11 · 10:30 AM</div>
            </div>
            <button style={{ background: '#fff', color: 'var(--primary)', border: 0, padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>Details</button>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Quick actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MobileQuickAction icon="calendar-plus" label="Book" sub="Find a doctor" />
            <MobileQuickAction icon="stethoscope" label="Doctors" sub="Browse specialists" />
            <MobileQuickAction icon="calendar-check" label="History" sub="Past visits" />
            <MobileQuickAction icon="user-round" label="Profile" sub="Personal info" />
          </div>
        </div>

        {/* Recent */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent activity</div>
            <button style={{ background: 'none', border: 0, fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>See all</button>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
            {[
              { d: 'Dr. Corazon Bautista-Uy', s: 'Internal Medicine', date: 'Jul 18, 2026', st: 'completed' },
              { d: 'Dr. Ana Beatriz Concepcion', s: 'Dermatology', date: 'May 22, 2026', st: 'completed' },
              { d: 'Dr. Emmanuel de la Cruz', s: 'Psychiatry', date: 'Sep 24, 2026', st: 'pending' },
            ].map((r, i, arr) => (
              <div key={i} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 0 }}>
                <div className="avatar sm" style={{ width: 34, height: 34, fontSize: 12 }}>{window.initials(r.d)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.d}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.s} · {r.date}</div>
                </div>
                <StatusBadge status={r.st} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <PhoneBottomNav current="home" />
    </div>
  );
}
function MobileQuickAction({ icon, label, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', marginBottom: 8 }}>
        <Icon name={icon} size={17} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

// ---------- Phone: Doctor list ----------
function PhoneDoctorList() {
  const store = useStore();
  const doctors = window.DOCTORS.slice(0, 6);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F5F7FA', fontFamily: 'IBM Plex Sans, -apple-system, sans-serif' }}>
      <PhoneHeader title="Find a doctor" right={<button style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-muted)', border: 0, display: 'grid', placeItems: 'center' }}><Icon name="sliders-horizontal" size={16} /></button>} />

      <div style={{ padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="input-group" style={{ marginBottom: 10 }}>
          <Icon name="search" size={16} className="input-icon" />
          <input className="input" style={{ paddingLeft: 38, height: 40 }} placeholder="Search by name or specialty..." />
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {['All', 'Cardiology', 'Pediatrics', 'OB-GYN', 'Neurology', 'Dermatology'].map((s, i) => (
            <button key={s} className={'chip filter' + (i === 0 ? ' on' : '')} style={{ whiteSpace: 'nowrap' }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{doctors.length} doctors available</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {doctors.map(d => (
            <div key={d.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <DoctorAvatar doctor={d} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{d.specialty}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                  <DoctorRatingPill ratings={store.ratings} doctorId={d.id} />
                  <span>·</span>
                  <DoctorStatusBadge status={d.status} />
                </div>
                <button className="btn btn-primary sm" disabled={d.status === 'on-leave'}>Book</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PhoneBottomNav current="book" />
    </div>
  );
}

// ---------- Phone: Booking form ----------
function PhoneBooking() {
  const doctor = window.findDoctor('d5');
  const slots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];
  const [slot, setSlot] = useState('10:30 AM');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F5F7FA', fontFamily: 'IBM Plex Sans, -apple-system, sans-serif' }}>
      <div style={{ padding: '52px 16px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ width: 36, height: 36, borderRadius: 8, background: 'transparent', border: 0, display: 'grid', placeItems: 'center' }}><Icon name="chevron-left" size={20} /></button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 600, textAlign: 'center' }}>Book appointment</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
        {/* Doctor card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <DoctorAvatar doctor={doctor} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doctor.specialty} · ₱{doctor.fee.toLocaleString()}</div>
          </div>
          <button style={{ background: 'transparent', border: 0, color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>Change</button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Select date</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {[
            { day: 'Wed', num: 9, month: 'Sep', on: false },
            { day: 'Thu', num: 10, month: 'Sep', on: false },
            { day: 'Fri', num: 11, month: 'Sep', on: true },
            { day: 'Sat', num: 12, month: 'Sep', on: false },
            { day: 'Mon', num: 14, month: 'Sep', on: false },
          ].map((d, i) => (
            <button key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '10px 12px', borderRadius: 10, minWidth: 62,
              background: d.on ? 'var(--primary)' : '#fff', color: d.on ? '#fff' : 'var(--text-secondary)',
              border: '1px solid ' + (d.on ? 'var(--primary)' : 'var(--border-strong)'),
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.day}</span>
              <span style={{ fontSize: 17, fontWeight: 600 }}>{d.num}</span>
              <span style={{ fontSize: 9, opacity: 0.85 }}>{d.month}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Available time slots</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {slots.map(t => (
            <button key={t} onClick={() => setSlot(t)} style={{
              padding: '10px 6px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
              background: t === slot ? 'var(--primary)' : '#fff', color: t === slot ? '#fff' : 'var(--text)',
              border: '1px solid ' + (t === slot ? 'var(--primary)' : 'var(--border-strong)'),
            }}>{t}</button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Reason for visit</div>
        <textarea className="textarea" placeholder="Briefly describe your symptoms or reason..." style={{ minHeight: 76, fontSize: 13 }} defaultValue="Prenatal check-up follow-up" />
      </div>

      <div style={{ padding: '12px 16px 24px', background: 'var(--surface)', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0 }}>
        <button className="btn btn-primary lg block">Confirm booking · ₱{doctor.fee.toLocaleString()}</button>
      </div>
    </div>
  );
}

// ---------- Phone: Appointment History ----------
function PhoneHistory() {
  const me = window.CURRENT_PATIENT;
  const all = window.APPOINTMENTS.filter(a => a.patientId === me.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F5F7FA', fontFamily: 'IBM Plex Sans, -apple-system, sans-serif' }}>
      <PhoneHeader title="My appointments" right={<button style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-muted)', border: 0, display: 'grid', placeItems: 'center' }}><Icon name="search" size={16} /></button>} />

      <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {['All', 'Upcoming', 'Completed', 'Cancelled'].map((s, i) => (
          <button key={s} className={'chip filter' + (i === 0 ? ' on' : '')} style={{ whiteSpace: 'nowrap' }}>{s}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {all.map(a => {
          const d = window.findDoctor(a.doctorId);
          return (
            <div key={a.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <DoctorAvatar doctor={d} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{d.name}</div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{d.specialty}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="calendar" size={12} /> {window.formatDate(a.date)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={12} /> {a.time}</span>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, height: 34, background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5, fontWeight: 500 }}>View details</button>
                {(a.status === 'pending' || a.status === 'confirmed') && (
                  <button style={{ flex: 1, height: 34, background: '#fff', border: '1px solid var(--error-border)', color: 'var(--error)', borderRadius: 8, fontSize: 12.5, fontWeight: 500 }}>Cancel</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PhoneBottomNav current="appts" />
    </div>
  );
}

Object.assign(window, { MobileShowcase });

export { MobileShowcase, PhoneDashboard, PhoneDoctorList, PhoneBooking, PhoneHistory };

