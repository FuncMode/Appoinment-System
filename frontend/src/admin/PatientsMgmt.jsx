// PatientsMgmt — admin (split from screens-admin.jsx)
import { useEffect, useState } from 'react';
import { AppShell, ConfirmModal, EmptyState, Icon, PageHeader, Pagination, PatientAvatar, useStore } from '../shared/components.jsx';
import { CURRENT_ADMIN, findPatient, formatDate, PATIENTS } from '../shared/data.js';
import { downloadCSV } from './helpers.js';

import { PatientFormModal } from './PatientFormModal.jsx';
import { PatientRecordsModal } from './PatientRecordsModal.jsx';

// ---------- Patients Management ----------
function PatientsMgmt() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  // Labs & medications — the staff-side creation path for the patient's
  // Medical Records sections (opened per patient from the table row)
  const [recordsFor, setRecordsFor] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gender, setGender] = useState('all');
  const PAGE = 4;

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = store.patients.filter(p => {
    if (gender !== 'all' && p.gender !== gender) return false;
    if (!query) return true;
    const hay = (p.name + ' ' + p.email + ' ' + p.phone).toLowerCase();
    return hay.includes(query.toLowerCase());
  });
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const doDelete = () => {
    setDelLoading(true);
    setTimeout(() => {
      // Sync the static PATIENTS registry so findPatient() drops the patient too
      const idx = window.PATIENTS.findIndex(x => x.id === confirmDel.id);
      if (idx > -1) window.PATIENTS.splice(idx, 1);
      store.setPatients(store.patients.filter(x => x.id !== confirmDel.id));
      setDelLoading(false);
      setConfirmDel(null);
      store.pushActivity(CURRENT_ADMIN.name, 'Deleted patient record', confirmDel.name);
      store.pushToast({ title: 'Patient removed', msg: `${confirmDel.name}'s record has been deleted.` });
    }, 600);
  };

  return (
    <AppShell current="patients">
      <div className="page">
        <PageHeader
          title="Patients"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 160, maxWidth: '100%', height: 14 }} />
            : `${store.patients.length} registered patients`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Patients' }]}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => {
                downloadCSV('medicacare-patients.csv', [
                  ['ID', 'Name', 'Email', 'Phone', 'Gender', 'Age', 'Joined', 'Last visit'],
                  ...filtered.map(p => [
                    p.id, p.name, p.email || '', p.phone,
                    p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : (p.gender || ''),
                    p.age, p.joined || '', p.lastVisit || '',
                  ]),
                ]);
                store.pushToast({ title: 'Export ready', msg: `${filtered.length} patient(s) exported to CSV.` });
              }}><Icon name="download" size={14} /> Export CSV</button>
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="user-plus" size={14} /> Add patient</button>
            </>
          }
        />

        <div className="card">
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by name, email, or phone…" aria-label="Search patients by name, email, or phone" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-secondary sm" onClick={() => setFilterOpen(o => !o)}>
              <Icon name="filter" size={14} /> Filter{gender !== 'all' ? (gender === 'M' ? ': Male' : ': Female') : ''}
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> matching
            </div>
          </div>

          {filterOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Filter by gender:</span>
              {[['all', 'All'], ['M', 'Male'], ['F', 'Female']].map(([k, l]) => (
                <button key={k} className={'chip filter' + (gender === k ? ' on' : '')} onClick={() => { setGender(k); setPage(1); }}>{l}</button>
              ))}
            </div>
          )}

          <div className="table-wrap">
            <table className="table table-responsive-stack">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Gender / Age</th>
                  <th>Joined</th>
                  <th>Last visit</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows mirroring the real ones: the Patient cell has
                  // an avatar + ID line, the Contact cell has two lines, and
                  // every cell carries data-label so the mobile stacked-card
                  // view keeps its labels
                  Array.from({ length: 6 }).map((_, r) => (
                    <tr key={r}>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <span className="skel" style={{ width: 110, maxWidth: '100%', height: 12, display: 'block' }} />
                            <span className="skel" style={{ width: 64, height: 10, display: 'block', marginTop: 4 }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Contact">
                        <div><span className="skel" style={{ width: 130, maxWidth: '100%', height: 11, display: 'inline-block' }} /></div>
                        <div style={{ marginTop: 3 }}><span className="skel" style={{ width: 92, height: 10, display: 'inline-block' }} /></div>
                      </td>
                      <td data-label="Gender / Age"><span className="skel" style={{ width: 60, height: 12 }} /></td>
                      <td data-label="Joined"><span className="skel" style={{ width: 72, height: 12 }} /></td>
                      <td data-label="Last visit"><span className="skel" style={{ width: 72, height: 12 }} /></td>
                      <td className="col-actions"><span className="skel" style={{ width: 24, height: 24 }} /></td>
                    </tr>
                  ))
                )
                  : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="empty-cell" style={{ padding: 0 }}>
                      <EmptyState icon="user-x" title={`No patients found for "${query}"`}
                        message="Try a different name, or add a new patient record."
                        actions={<>
                          <button className="btn btn-secondary" onClick={() => setQuery('')}>Clear search</button>
                          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="user-plus" size={14} /> Add patient</button>
                        </>} />
                    </td></tr>
                  ) : paged.map(p => (
                    <tr key={p.id}>
                      <td data-label="Patient">
                        <div className="cell-with-avatar">
                          <PatientAvatar person={p} size={28} />
                          <div>
                            <div className="cell-primary cell-primary-truncate">{p.name}</div>
                            <div className="cell-secondary t-mono">{p.id.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Contact">
                        <div>{p.email || <span className="t-muted">—</span>}</div>
                        <div className="cell-secondary">{p.phone}</div>
                      </td>
                      <td data-label="Gender / Age">{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '—'}{p.age ? `, ${p.age}` : ''}</td>
                      <td data-label="Joined">{window.formatDate(p.joined)}</td>
                      <td data-label="Last visit">{p.lastVisit ? window.formatDate(p.lastVisit) : <span className="t-muted">Never</span>}</td>
                      <td className="col-actions">
                        {/* No edit action: personal info is owned by the patient —
                            they manage it on their Profile page, and those changes
                            reflect here automatically */}
                        <button className="btn-icon" title="Labs & medications" aria-label="Manage labs and medications" onClick={() => setRecordsFor(p)}><Icon name="folder-open" size={16} /></button>
                        <button className="btn-icon" title="Delete" aria-label="Delete patient" onClick={() => setConfirmDel(p)} style={{ color: 'var(--error)' }}><Icon name="trash-2" size={16} /></button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="patients" />}
        </div>
      </div>

      <PatientFormModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(newP) => {
          const id = 'p' + Date.now();
          const rec = {
            ...newP,
            id,
            joined: new Date().toISOString().slice(0, 10), lastVisit: null,
            // Default to a dummy portrait when no photo was uploaded
            photo: newP.photo || `https://randomuser.me/api/portraits/${newP.gender === 'F' ? 'women' : 'men'}/${Math.floor(Math.random() * 99) + 1}.jpg`,
          };
          // Keep the static PATIENTS registry (used by findPatient) in sync
          window.PATIENTS.unshift(rec);
          store.setPatients([...window.PATIENTS]);
          setAddOpen(false);
          store.pushToast({ title: 'Patient added', msg: `${newP.name} has been added to your records.` });
        }} />
      <PatientRecordsModal patient={recordsFor} onClose={() => setRecordsFor(null)} />
      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={delLoading}
        title="Delete patient record?"
        message={confirmDel ? `${confirmDel.name}'s account and all associated data will be permanently deleted. This action cannot be undone.` : ''}
        confirmLabel="Delete permanently"
        kind="danger"
      />
    </AppShell>
  );
}

export { PatientsMgmt };
