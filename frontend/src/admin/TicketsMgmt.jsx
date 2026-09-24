// TicketsMgmt — admin (split from screens-admin.jsx)
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
import { StoryRow, StoriesMgmt } from './StoriesMgmt.jsx';
import { AdminActivity } from './AdminActivity.jsx';
import { AdminReports } from './AdminReports.jsx';
import { AdminSettings } from './AdminSettings.jsx';
import { AppointmentEditModal, AppointmentFormModal, AppointmentDetailsModal } from './AppointmentModals.jsx';

// ---------- Patient messages (support tickets) ----------
// Patients send questions from the portal's Help & support page ("Message the
// clinic"); they land here as open tickets. Staff reply once — the reply shows
// in the patient's portal and the ticket is marked resolved (same loop as the
// patient stories moderation flow).
function TicketsMgmt() {
  const store = useStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [sending, setSending] = useState(false);

  const open = store.tickets.filter(t => t.status === 'open');
  const resolved = store.tickets.filter(t => t.status === 'resolved');

  const startReply = (t) => { setReplyFor(t); setReplyText(''); setReplyError(''); };

  const sendReply = () => {
    const text = replyText.trim();
    if (text.length < 10) { setReplyError('Please write a reply (10+ characters).'); return; }
    setSending(true);
    setTimeout(() => {
      store.setTickets(store.tickets.map(t => t.id === replyFor.id
        ? {
            ...t,
            status: 'resolved',
            reply: text,
            repliedAt: localToday(),
            // Conversation history after the first message — the patient's
            // follow-ups stay visible above the new reply in their portal
            thread: [...(t.thread || []), { id: t.id + '-s' + Date.now(), from: 'staff', text, date: localToday() }],
          }
        : t));
      store.pushActivity(CURRENT_ADMIN.name, 'Replied to patient message', `"${replyFor.subject}"`);
      store.pushToast({ title: 'Reply sent', msg: `${replyFor.name || 'The patient'} will see your response in their portal.` });
      setSending(false);
      setReplyFor(null);
    }, 600);
  };

  const rowSkeletons = (count) => Array.from({ length: count }).map((_, i) => (
    <div key={i} className="list-item" aria-hidden="true">
      <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
      <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="skel" style={{ height: 11, width: '55%' }} />
        <span className="skel" style={{ height: 10, width: '80%' }} />
      </div>
      <span className="skel" style={{ width: 74, height: 22, borderRadius: 'var(--r-pill)', flexShrink: 0 }} />
    </div>
  ));

  const TicketRow = ({ t, actions, children }) => {
    const author = window.findPatient(t.patientId);
    return (
      <div className="list-item" style={{ alignItems: 'flex-start' }}>
        <PatientAvatar person={author} size={28} />
        <div className="list-item-body">
          <div className="list-item-title">{t.subject}</div>
          {/* Override the one-line ellipsis: the message body is the content here */}
          <div className="list-item-sub" style={{ whiteSpace: 'normal', overflow: 'visible', lineHeight: 1.5 }}>
            {t.message}
          </div>
          {(t.thread || []).some(m => m.from === 'patient') && (
            <div className="list-item-sub" style={{ marginTop: 4 }}>
              {t.thread.filter(m => m.from === 'patient').length} patient follow-up{t.thread.filter(m => m.from === 'patient').length === 1 ? '' : 's'}. See reply history
            </div>
          )}
          <div className="list-item-sub" style={{ marginTop: 4 }}>
            {t.name || (author ? author.name : 'Patient')} · sent {window.formatDate(t.createdAt)}
            {t.repliedAt ? ` · replied ${window.formatDate(t.repliedAt)}` : ''}
          </div>
          {children}
        </div>
        <div style={{ flexShrink: 0 }}>{actions}</div>
      </div>
    );
  };

  return (
    <AppShell current="tickets">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title="Patient messages"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 280, maxWidth: '100%', height: 14 }} />
            : `${open.length} awaiting a reply · ${resolved.length} resolved`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Patient messages' }]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Open</h2></div>
          <div>
            {loading ? rowSkeletons(2) : open.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState icon="inbox" title="No open messages"
                  message="Messages sent from the patient portal's Help & support page appear here." />
              </div>
            ) : open.map(t => (
              <TicketRow key={t.id} t={t}
                actions={<button className="btn btn-primary sm" onClick={() => startReply(t)}><Icon name="reply" size={13} /> Reply</button>} />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Resolved</h2></div>
          <div>
            {loading ? rowSkeletons(1) : resolved.length === 0 ? (
              <div style={{ padding: '8px 20px 16px' }}>
                <EmptyState icon="check-circle-2" title="Nothing resolved yet" message="Replied messages move here." />
              </div>
            ) : resolved.map(t => (
              <TicketRow key={t.id} t={t}
                actions={<Badge kind="success" dot={false}>Replied</Badge>}>
                {t.reply && (
                  <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, background: 'var(--success-soft)', border: '1px solid #6EE7B7', borderRadius: 6, padding: '8px 10px', color: 'var(--success-text)' }}>
                    <strong>Our reply:</strong> {t.reply}
                  </div>
                )}
              </TicketRow>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={!!replyFor}
        onClose={() => setReplyFor(null)}
        title="Reply to patient"
        subtitle={replyFor ? `${replyFor.name || 'Patient'} · "${replyFor.subject}"` : ''}
        icon="reply" iconKind="info"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setReplyFor(null)} disabled={sending}>Cancel</button>
          <button className={`btn btn-primary ${sending ? 'btn-loading' : ''}`} onClick={sendReply}>Send reply &amp; resolve</button>
        </>}
      >
        {replyFor && (
          <div className="stack md">
            <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, lineHeight: 1.55 }}>
              {replyFor.message}
            </div>
            {(replyFor.thread || []).map(m => (
              <div key={m.id} style={{
                borderRadius: 6, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.55,
                border: '1px solid ' + (m.from === 'staff' ? '#6EE7B7' : 'var(--border)'),
                background: m.from === 'staff' ? 'var(--success-soft)' : 'var(--surface-muted)',
                color: m.from === 'staff' ? 'var(--success-text)' : 'var(--text-secondary)',
              }}>
                <strong>{m.from === 'staff' ? 'Previous staff reply' : 'Patient follow-up'}:</strong> {m.text}
                {m.date && <div className="t-help" style={{ marginTop: 2 }}>{window.formatDate(m.date)}</div>}
              </div>
            ))}
            <Field label="Your reply" required error={replyError}
              help="The patient sees this in their portal; sending also marks the message resolved.">
              <TextArea rows={4} value={replyText}
                onChange={e => { setReplyText(e.target.value); if (replyError) setReplyError(''); }}
                error={replyError} maxLength={500}
                placeholder="e.g., Your HMO covers the annual physical exam. Just present your card at the counter." />
            </Field>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

export { TicketsMgmt };
