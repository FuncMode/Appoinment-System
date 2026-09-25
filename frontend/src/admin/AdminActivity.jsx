// AdminActivity — admin (split from screens-admin.jsx)
import { useEffect, useState } from 'react';
import { AppShell, EmptyState, Icon, PageHeader, Pagination, useStore } from '../shared/components.jsx';
import { CURRENT_ADMIN, formatDate, initials } from '../shared/data.js';
import { localToday } from './helpers.js';

// ---------- Activity log (full page) ----------
// Audit trail of staff / doctor / patient-portal actions from the shared
// store — seeded with fictional demo entries (see data.js) until real
// actions land, persisted in this browser like the rest of the demo data.
function AdminActivity() {
  const store = useStore();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const todayISO = localToday();

  // Filters: text search (action/detail/actor) + "who did it" chips. The actor
  // is classified against the live registries — the staff console's admin name,
  // the doctors directory, and the patient registry (registered accounts are
  // synced there on sign-up). Anything unrecognized falls back to staff, since
  // the only writer outside doctors and patients is the console.
  const [query, setQuery] = useState('');
  const [who, setWho] = useState('all');
  const roleOf = (name) => {
    if (!name || name === CURRENT_ADMIN.name) return 'staff';
    if (store.doctors.some(d => d.name === name)) return 'doctor';
    if (store.patients.some(p => p.name === name)) return 'patient';
    return 'staff';
  };
  const filtered = store.activity.filter(e => {
    if (who !== 'all' && roleOf(e.actor) !== who) return false;
    if (!query) return true;
    const hay = `${e.action} ${e.detail || ''} ${e.actor}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const filtersActive = who !== 'all' || query.trim() !== '';
  const whoFilters = [
    ['all', 'All'],
    ['staff', 'Staff'],
    ['doctor', 'Doctors'],
    ['patient', 'Patients'],
  ];

  // Pagination — same pattern as the other admin list pages. 6 rows per page
  // keeps the centered 860px column comfortable; the store caps the log at
  // 20 entries (see pushActivity in components.jsx), so this tops out at
  // 4 pages for the demo.
  const PAGE = 6;
  const [page, setPage] = useState(1);
  // A search/filter change can move the current page out of range
  useEffect(() => { setPage(1); }, [query, who]);
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <AppShell current="a-activity">
      <div className="page" style={{ maxWidth: 860, margin: '0 auto' }}>
        <PageHeader
          title="Activity log"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 220, maxWidth: '100%', height: 14 }} />
            : (filtersActive
              ? `${filtered.length} of ${store.activity.length} actions shown · newest first`
              : `${store.activity.length} action${store.activity.length === 1 ? '' : 's'} · newest first`)}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Activity log' }]}
        />

        {/* Search + who-did-it filter chips (same toolbar pattern as the
            doctor portal's My patients page) */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search action, name, or detail..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {whoFilters.map(([key, label]) => (
                <button key={key} className={'chip filter' + (who === key ? ' on' : '')} onClick={() => setWho(key)}>{label}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {store.activity.length} matching
            </div>
          </div>
        </div>

        <div className="card">
          <div>
            {loading ? (
              [0, 1, 2, 3, 4].map(i => (
                <div key={i} className="list-item" aria-hidden="true">
                  <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="list-item-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="skel" style={{ height: 10, width: '35%' }} />
                    <span className="skel" style={{ height: 10, width: '65%' }} />
                  </div>
                  <span className="skel" style={{ width: 64, height: 11, flexShrink: 0 }} />
                </div>
              ))
            ) : store.activity.length === 0 ? (
              <EmptyState icon="activity" title="No activity yet" message="Actions from the console, doctor portal, and patient bookings will appear here." />
            ) : filtered.length === 0 ? (
              <EmptyState icon="filter" title="No actions match your filters"
                message="Try a different search term or filter."
                actions={<button className="btn btn-secondary" onClick={() => { setQuery(''); setWho('all'); }}>Clear filters</button>} />
            ) : paged.map(e => {
              const d = new Date(e.at);
              const pad = (x) => String(x).padStart(2, '0');
              const dayISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              // Today's entries show just the time; older ones get the date too
              const label = dayISO === todayISO ? time : `${window.formatDate(dayISO)} · ${time}`;
              return (
                <div key={e.id} className="list-item">
                  <div className="avatar">{window.initials(e.actor)}</div>
                  <div className="list-item-body">
                    <div className="list-item-title">{e.action}</div>
                    <div className="list-item-sub">{e.detail ? `${e.detail} · ` : ''}{e.actor}</div>
                  </div>
                  <span className="t-mono" style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!loading && filtered.length > 0 && (
          <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="actions" />
        )}

        <p className="t-muted" style={{ fontSize: 12, marginTop: 12 }}>
          Entries persist in this browser. Seed entries are fictional demo data; real actions from the console, doctor portal, and patient bookings are added on top.
        </p>
      </div>
    </AppShell>
  );
}

export { AdminActivity };
