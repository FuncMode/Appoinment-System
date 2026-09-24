// AppointmentHistory — patient (split from screens-patient.jsx)
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, navigate, useHashRoute, useStore, StoreProvider,
  Sidebar, Topbar, AppShell, PublicNav, PageHeader,
  Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar,
  Modal, ToastLayer, Field, TextInput, TextArea, SelectInput,
  Pagination, SkeletonRows, SortableTh, PageSpinner, EmptyState, ErrorState, ConfirmModal, MiniBarChart, DoctorRatingPill, PwField,
} from '../shared/components.jsx';
import {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, isClinicDay, timeValue,
} from '../shared/data.js';
import { CARE_GUIDE } from '../public/screens-public.jsx';
import { activateOnKey, toICSStamp, buildICS, buildReceipt, localToday, buildRecordsHTML } from './helpers.js';
import { PatientDashboard } from './PatientDashboard.jsx';
import { MOBILE_DOCTOR_QUERY, MOBILE_DOCTOR_PAGE_SIZE, DoctorListing } from './DoctorListing.jsx';
import { DoctorAvailability } from './DoctorAvailability.jsx';
import { BookAppointment } from './BookAppointment.jsx';
import { BookingConfirmation } from './BookingConfirmation.jsx';
import { AppointmentStatus } from './AppointmentStatus.jsx';
import { AppointmentDetails, RateVisitModal } from './AppointmentDetails.jsx';
import { Profile } from './Profile.jsx';
import { MedicalRecords } from './MedicalRecords.jsx';
import { PatientMessages } from './PatientMessages.jsx';
import { HelpSupport } from './HelpSupport.jsx';

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
  // Rate-your-visit modal (Option B): completed appointments only, one rating
  // per appointment (the action is hidden once a rating exists)
  const [rateAppt, setRateAppt] = useState(null);
  const hasRated = (apptId) => store.ratings.some(r => r.appointmentId === apptId);
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
    // Tie-breaker: equal values keep newest-first date order, then true time order
    return b.date.localeCompare(a.date) || timeValue(a.time) - timeValue(b.time);
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
              <option value="no-show">No-show</option>
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
                              {a.status === 'completed' && !hasRated(a.id) && (
                                <button className="btn btn-primary sm" onClick={() => setRateAppt(a)}><Icon name="star" size={13} /> Rate visit</button>
                              )}
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

      <RateVisitModal open={!!rateAppt} appointment={rateAppt} onClose={() => setRateAppt(null)} />

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

export { AppointmentHistory };
