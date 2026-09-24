// StoriesMgmt — admin (split from screens-admin.jsx)
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PageHeader, SortableTh, PageSpinner,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, EmptyState, ErrorState, ConfirmModal, MiniBarChart, Sparkline, DoctorRatingPill, computeDoctorRating,
} from '../shared/components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, formatDayRange, isClinicDay, timeValue,
} from '../shared/data.js';
import { csvCell, downloadCSV, buildDoctorScheduleHTML, printDoctorSchedule, localToday } from './helpers.js';
import { AdminDashboard } from './AdminDashboard.jsx';
import { PatientsMgmt } from './PatientsMgmt.jsx';
import { PatientFormModal } from './PatientFormModal.jsx';
import { PatientRecordsModal } from './PatientRecordsModal.jsx';
import { DoctorsMgmt } from './DoctorsMgmt.jsx';
import { DoctorFormModal } from './DoctorFormModal.jsx';
import { AppointmentsMgmt } from './AppointmentsMgmt.jsx';
import { AdminActivity } from './AdminActivity.jsx';
import { AdminReports } from './AdminReports.jsx';
import { AdminSettings } from './AdminSettings.jsx';
import { TicketsMgmt } from './TicketsMgmt.jsx';
import { AppointmentEditModal, AppointmentFormModal, AppointmentDetailsModal } from './AppointmentModals.jsx';

// ---------- Patient stories (public testimonial moderation) ----------
// Portal submissions land here as pending; approved ones are shown on the
// public "What patients say" carousel under the display name only. Staff see
// the author's account identity for verification; the public site does not.
function StoryRow({ t, actions }) {
  const author = window.findPatient(t.patientId);
  return (
    <div className="list-item" style={{ alignItems: 'flex-start' }}>
      <PatientAvatar person={author} size={28} />
      <div className="list-item-body">
        <div className="list-item-title">"{t.quote}"</div>
        <div className="list-item-sub">
          Shows as "{t.displayName}" · submitted {window.formatDate(t.createdAt)}
          {t.reviewedAt ? ` · reviewed ${window.formatDate(t.reviewedAt)}` : ''}
          {author ? ` · ${author.name}${author.email ? `, ${author.email}` : ''}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{actions}</div>
    </div>
  );
}

function StoriesMgmt() {
  const store = useStore();
  // Simulated fetch — skeleton header + rows while "loading", same 600ms
  // pattern as the other admin list pages
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // Search spans the quote, display name, and the patient's account identity
  const matches = (t) => {
    if (!q) return true;
    const author = window.findPatient(t.patientId);
    return `${t.quote} ${t.displayName} ${author ? author.name : ''}`.toLowerCase().includes(q);
  };
  const pending = store.testimonials.filter(t => t.status === 'pending').filter(matches);
  const approved = store.testimonials.filter(t => t.status === 'approved').filter(matches);
  const rejected = store.testimonials.filter(t => t.status === 'rejected').filter(matches);

  // Skeleton rows mirroring the StoryRow layout (avatar + quote + meta line)
  const storySkeletons = (count) => Array.from({ length: count }).map((_, i) => (
    <div key={i} className="list-item" aria-hidden="true">
      <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
      <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="skel" style={{ height: 11, width: '70%' }} />
        <span className="skel" style={{ height: 10, width: '85%' }} />
      </div>
      <span className="skel" style={{ width: 74, height: 22, borderRadius: 'var(--r-pill)', flexShrink: 0 }} />
    </div>
  ));

  const setStatus = (id, status) => {
    store.setTestimonials(store.testimonials.map(t => t.id === id ? { ...t, status, reviewedAt: localToday() } : t));
    const story = store.testimonials.find(x => x.id === id);
    store.pushActivity(CURRENT_ADMIN.name,
      status === 'approved' ? 'Story approved' : status === 'pending' ? 'Story unpublished' : 'Story rejected',
      story ? `"${story.displayName}"` : '');
    store.pushToast({
      title: status === 'approved' ? 'Story approved' : status === 'pending' ? 'Story unpublished' : 'Story rejected',
      msg: status === 'approved' ? 'It is now shown on the public website.' : status === 'pending' ? 'It is back in the review queue.' : 'It will not appear on the public website.',
    });
  };

  return (
    <AppShell current="stories">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title="Patient stories"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 340, maxWidth: '100%', height: 14 }} />
            : `${pending.length} waiting for review · ${approved.length} shown on the public website`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Patient stories' }]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by quote, display name, or patient..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{pending.length + approved.length + rejected.length}</strong> matching
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2 className="h-section">Waiting for review</h2>
          </div>
          <div>
            {loading ? (
              storySkeletons(2)
            ) : pending.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState
                  icon="message-square"
                  title="No stories waiting for review"
                  message="Stories submitted from the patient portal (Help & support) appear here for approval before they are shown on the public website."
                />
              </div>
            ) : pending.map(t => (
              <StoryRow key={t.id} t={t} actions={<>
                <button className="btn btn-primary sm" onClick={() => setStatus(t.id, 'approved')}>Approve</button>
                <button className="btn btn-danger-outline sm" onClick={() => setStatus(t.id, 'rejected')}>Reject</button>
              </>} />
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2 className="h-section">Approved & shown publicly</h2>
          </div>
          <div>
            {loading ? (
              storySkeletons(1)
            ) : approved.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState
                  icon="globe"
                  title="Nothing published yet"
                  message="Approved stories appear on the public website's What patients say carousel."
                />
              </div>
            ) : approved.map(t => (
              <StoryRow key={t.id} t={t} actions={
                <button className="btn btn-secondary sm" onClick={() => setStatus(t.id, 'pending')}>Unpublish</button>
              } />
            ))}
          </div>
        </div>

        {rejected.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="h-section">Not published</h2>
            </div>
            <div>
              {rejected.map(t => (
                <StoryRow key={t.id} t={t} actions={
                  <button className="btn btn-secondary sm" onClick={() => setStatus(t.id, 'pending')}>Restore to review</button>
                } />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export { StoryRow, StoriesMgmt };
