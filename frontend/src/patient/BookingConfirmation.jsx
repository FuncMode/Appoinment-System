// BookingConfirmation — patient (split from screens-patient.jsx)

import { AppShell, DoctorAvatar, EmptyState, Icon, navigate, StatusBadge, useStore } from '../shared/components.jsx';
import { findDoctor, formatDate } from '../shared/data.js';

// ---------- Booking Confirmation ----------
function BookingConfirmation() {
  const store = useStore();
  const id = store.lastBookingId;
  const appt = store.appointments.find(a => a.id === id);
  const doctor = appt ? window.findDoctor(appt.doctorId) : null;

  return (
    <AppShell current="doctors">
      <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* §15/§32: deep-linking here without a recent booking (e.g. after the
            store was cleared) must not read as a false success */}
        {!appt ? (
          <div className="card">
            <EmptyState
              icon="calendar-x"
              title="No recent booking to show"
              message="This page shows the confirmation of your latest booking. Book an appointment first, or open it later from your appointment history."
              actions={<button className="btn btn-primary" onClick={() => navigate('/patient/book')}>Book an appointment</button>}
            />
          </div>
        ) : (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Icon name="check-circle-2" size={36} />
          </div>
          <h1 className="h-page" style={{ marginBottom: 8 }}>Appointment successfully booked</h1>
          <p className="t-muted" style={{ fontSize: 14, maxWidth: 400, margin: '0 auto 24px' }}>
            {appt && appt.status === 'confirmed'
              ? 'Your appointment is confirmed — no waiting for staff review. You can track it any time from your dashboard.'
              : 'Your appointment request has been received. You can track your appointment status any time from your dashboard.'}
          </p>

          {appt && doctor && (
            <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <DoctorAvatar doctor={doctor} size={44} />
                <div>
                  <div style={{ fontWeight: 600 }}>{doctor.name}</div>
                  <div className="t-muted" style={{ fontSize: 13 }}>{doctor.specialty}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}><StatusBadge status={appt.status} /></div>
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
        )}
      </div>
    </AppShell>
  );
}

export { BookingConfirmation };
