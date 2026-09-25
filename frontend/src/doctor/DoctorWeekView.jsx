// DoctorWeekView — doctor portal (split from screens-doctor.jsx)

import { AppShell, Icon, navigate, PageHeader, useStore } from '../shared/components.jsx';
import { formatDate } from '../shared/data.js';
import { getWeekDays, localToday, useDoctor } from './helpers.js';

import { WeekGrid } from './WeekGrid.jsx';

// ---------- Doctor: This week (own page) ----------
// The Mon–Sun week grid moved off the dashboard into its own page; the
// dashboard's "This week" summary card links here.
function DoctorWeekView() {
  const store = useStore();
  const me = useDoctor();
  const today = localToday();
  const mine = store.appointments.filter(a => a.doctorId === me.id);
  const weekDays = getWeekDays();
  const weekLabel = `${formatDate(weekDays[0])} – ${formatDate(weekDays[6])}`;
  const weekCount = mine.filter(a => weekDays.includes(a.date)).length;

  return (
    <AppShell current="d-week">
      <div className="page">
        <PageHeader
          title="This week"
          subtitle={weekLabel}
          breadcrumbs={[{ label: 'Doctor portal', to: '/doctor/dashboard' }, { label: 'This week' }]}
          actions={<button className="btn btn-secondary" onClick={() => navigate('/doctor/dashboard')}><Icon name="calendar-check" size={14} /> Today's schedule</button>}
        />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h2 className="h-section">Week view</h2>
            <span className="t-muted" style={{ fontSize: 12 }}>
              {weekCount} appointment{weekCount === 1 ? '' : 's'} · today's column is highlighted
            </span>
          </div>
          <div className="card-body compact">
            <WeekGrid mine={mine} weekDays={weekDays} today={today} />
          </div>
        </div>

        <p className="t-help" style={{ margin: 0 }}>
          Full detail (time · patient · status) shows on hover over each appointment chip.
        </p>
      </div>
    </AppShell>
  );
}

export { DoctorWeekView };
