// AdminSettings — admin (split from screens-admin.jsx)
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
import { TicketsMgmt } from './TicketsMgmt.jsx';
import { AppointmentEditModal, AppointmentFormModal, AppointmentDetailsModal } from './AppointmentModals.jsx';

// ---------- Settings ----------
function AdminSettings() {
  const store = useStore();
  // Simulated fetch — centered circle spinner while "loading", same 600ms
  // pattern as the patient Book/Profile pages
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setPageLoading(false), 600); return () => clearTimeout(t); }, []);
  // Live from the store — clinic info is synced to the public website and
  // preferences drive the patient booking flow (see StoreProvider)
  const [clinic, setClinic] = useState({ ...store.clinic });
  const [prefs, setPrefs] = useState({ ...store.prefs });
  const [savingClinic, setSavingClinic] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const updateClinic = (k, v) => setClinic(f => ({ ...f, [k]: v }));
  const updatePref = (k, v) => setPrefs(f => ({ ...f, [k]: v }));

  const saveClinic = (e) => {
    e.preventDefault();
    if (!clinic.name.trim()) {
      store.pushToast({ kind: 'error', title: 'Clinic name required', msg: 'Please enter a clinic name before saving.' });
      return;
    }
    setSavingClinic(true);
    setTimeout(() => {
      // Syncs window.HOSPITAL live — the public website reflects this on the
      // very next page view (nav brand, footer, contact page, receipts)
      store.setClinic({ ...clinic });
      setSavingClinic(false);
      store.pushToast({ title: 'Clinic info saved', msg: 'The public website now shows the updated details.' });
    }, 500);
  };

  const savePrefs = (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setTimeout(() => {
      store.setPrefs({ ...prefs });
      setSavingPrefs(false);
      store.pushToast({
        title: 'Preferences saved',
        msg: prefs.autoConfirm
          ? 'New patient bookings will be confirmed instantly.'
          : 'New patient bookings will wait for staff review.',
      });
    }, 500);
  };

  if (pageLoading) {
    return (
      <AppShell current="settings">
        <div className="page"><PageSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell current="settings">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader
          title="Settings"
          subtitle="Clinic information and appointment preferences."
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Settings' }]}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Clinic information</h2></div>
          <form onSubmit={saveClinic}>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Clinic name" required>
                  <TextInput value={clinic.name} onChange={e => updateClinic('name', e.target.value)} />
                </Field>
                <Field label="Contact number" required>
                  <TextInput type="tel" value={clinic.phone} onChange={e => updateClinic('phone', e.target.value)} icon="phone" />
                </Field>
                <Field label="Email" required>
                  <TextInput type="email" value={clinic.email} onChange={e => updateClinic('email', e.target.value)} icon="mail" />
                </Field>
                <Field label="Address">
                  <TextInput value={clinic.address} onChange={e => updateClinic('address', e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className={`btn btn-primary ${savingClinic ? 'btn-loading' : ''}`}>Save changes</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Appointment preferences</h2></div>
          <form onSubmit={savePrefs}>
            <div className="card-body stack lg">
              <label className="checkbox">
                <input type="checkbox" checked={prefs.emailNewAppointments} onChange={e => updatePref('emailNewAppointments', e.target.checked)} />
                <span>Email admins when a new appointment is booked</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={prefs.remindPatients} onChange={e => updatePref('remindPatients', e.target.checked)} />
                <span>Send patients a reminder email the day before their visit</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={prefs.autoConfirm} onChange={e => updatePref('autoConfirm', e.target.checked)} />
                <span>Auto-confirm pending appointments (skip manual review)</span>
              </label>
              <Field label="Appointment slot interval" help="Time slots offered on the patient booking form. Hourly shows :00 slots only. The booking grid runs on 30-minute granularity.">
                <SelectInput value={prefs.slotInterval} onChange={e => updatePref('slotInterval', e.target.value)}>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every 1 hour</option>
                </SelectInput>
              </Field>
            </div>
            <div className="card-footer">
              <button type="submit" className={`btn btn-primary ${savingPrefs ? 'btn-loading' : ''}`}>Save preferences</button>
            </div>
          </form>
        </div>

        <p className="t-muted" style={{ fontSize: 12, marginTop: 12 }}>
          Settings are saved in this browser and applied instantly — clinic info updates the public website, and preferences drive the patient booking flow.
        </p>
      </div>
    </AppShell>
  );
}

export { AdminSettings };
