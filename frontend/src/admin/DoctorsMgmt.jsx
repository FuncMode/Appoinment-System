// DoctorsMgmt — admin (split from screens-admin.jsx)
import { useEffect, useState } from 'react';
import { AppShell, computeDoctorRating, ConfirmModal, DoctorAvatar, DoctorRatingPill, DoctorStatusBadge, EmptyState, Icon, PageHeader, Pagination, SelectInput, useStore } from '../shared/components.jsx';
import { CURRENT_ADMIN, DOCTORS, doctorStatusMeta, findDoctor, formatDayRange, SPECIALTIES, timeValue } from '../shared/data.js';
import { downloadCSV, localToday, printDoctorSchedule } from './helpers.js';

import { DoctorFormModal } from './DoctorFormModal.jsx';

// ---------- Doctors Management ----------
function DoctorsMgmt() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [specialty, setSpecialty] = useState('all');
  const PAGE = 4;
  // Simulated fetch — skeleton rows while "loading", same as Patients page
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const filtered = store.doctors.filter(d => {
    if (specialty !== 'all' && d.specialty !== specialty) return false;
    if (!query) return true;
    const hay = (d.name + ' ' + d.specialty).toLowerCase();
    return hay.includes(query.toLowerCase());
  });
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const doDelete = () => {
    setDelLoading(true);
    setTimeout(() => {
      // Sync the static DOCTORS registry so patient-side findDoctor() drops the doctor too
      const idx = window.DOCTORS.findIndex(x => x.id === confirmDel.id);
      if (idx > -1) window.DOCTORS.splice(idx, 1);
      store.setDoctors(store.doctors.filter(x => x.id !== confirmDel.id));
      // Portal access dies with the profile — remove the doctor's account too
      store.setUsers(store.users.filter(u => !(u.role === 'doctor' && u.doctorId === confirmDel.id)));
      // End the removed doctor's portal session, if they are logged in — the
      // doctor route guard then shows the login screen with an explanation
      if (store.doctorSession && store.doctorSession.doctorId === confirmDel.id) store.logoutDoctor();
      setDelLoading(false);
      setConfirmDel(null);
      store.pushActivity(CURRENT_ADMIN.name, 'Deleted doctor', confirmDel.name);
      store.pushToast({ title: 'Doctor removed', msg: `${confirmDel.name}'s profile has been deleted.` });
    }, 600);
  };

  // Apply the portal-access payload collected by DoctorFormModal against
  // store.users — grant (new account), reset (new password), or revoke.
  // Access is admin-issued: this is the only place doctor accounts are created.
  const applyAccess = (docRec, access) => {
    if (!access) return;
    const existing = store.users.find(u => u.role === 'doctor' && u.doctorId === docRec.id);
    if (access.mode === 'grant' && !existing) {
      const account = {
        id: 'u' + Date.now().toString(36),
        name: docRec.name,
        email: access.email,
        password: access.password,
        role: 'doctor',
        doctorId: docRec.id,
        createdAt: localToday(),
      };
      store.setUsers([...store.users, account]);
      store.pushActivity(CURRENT_ADMIN.name, 'Granted portal access', `${docRec.name} · ${account.email}`);
      store.pushToast({ title: 'Portal access granted', msg: `${docRec.name} can now sign in at the Doctor portal as ${account.email}.` });
    } else if (access.mode === 'reset' && existing) {
      store.setUsers(store.users.map(u => u.id === existing.id ? { ...u, password: access.password } : u));
      // End the doctor's session so the new password is required on next login
      if (store.doctorSession && store.doctorSession.doctorId === docRec.id) store.logoutDoctor();
      store.pushActivity(CURRENT_ADMIN.name, 'Reset portal password', `${docRec.name} · ${existing.email}`);
      store.pushToast({ title: 'Password reset', msg: `${docRec.name}'s portal password has been changed.` });
    } else if (access.mode === 'revoke' && existing) {
      store.setUsers(store.users.filter(u => u.id !== existing.id));
      if (store.doctorSession && store.doctorSession.doctorId === docRec.id) store.logoutDoctor();
      store.pushActivity(CURRENT_ADMIN.name, 'Revoked portal access', docRec.name);
      store.pushToast({ title: 'Portal access revoked', msg: `${docRec.name} can no longer sign in at the Doctor portal.` });
    }
  };

  // Staff print the day's patient list for a doctor (PDF via the browser's
  // native "Save as PDF"), then encode the doctor's written notes afterwards
  const printSchedule = (d) => {
    const today = localToday();
    const list = store.appointments
      .filter(a => a.doctorId === d.id && a.date === today)
      .sort((a, b) => timeValue(a.time) - timeValue(b.time));
    printDoctorSchedule(d, list, today);
    store.pushToast({
      title: 'Print dialog opened',
      msg: `Choose "Save as PDF" as the destination to download today's ${list.length} appointment(s) as a PDF.`,
    });
  };

  return (
    <AppShell current="doctors">
      <div className="page">
        <PageHeader
          title="Doctors"
          subtitle={loading
            ? <span className="skel" aria-hidden="true" style={{ width: 240, maxWidth: '100%', height: 14 }} />
            : `${store.doctors.length} doctors across ${window.SPECIALTIES.length} specialties`}
          breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Doctors' }]}
          actions={<>
            <button className="btn btn-secondary" onClick={() => {
              downloadCSV('medicacare-doctors.csv', [
                ['ID', 'Name', 'Specialty', 'Status', 'Clinic days', 'Experience (yrs)', 'Avg. rating', 'Ratings', 'Consultation fee (₱)', 'Room'],
                ...filtered.map(d => {
                  const { count, avg } = computeDoctorRating(store.ratings, d.id);
                  return [
                    d.id, d.name, d.specialty, window.doctorStatusMeta(d.status).label,
                    Array.isArray(d.avail) ? d.avail.join(', ') : '',
                    d.exp, count ? avg : '', count, d.fee, d.room,
                  ];
                }),
              ]);
              store.pushToast({ title: 'Export ready', msg: `${filtered.length} doctor(s) exported to CSV.` });
            }}><Icon name="download" size={14} /> Export CSV</button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={14} /> Add doctor</button>
          </>}
        />

        <div className="card">
          <div className="table-toolbar">
            <div className="input-group search">
              <Icon name="search" size={16} className="input-icon" />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by name or specialty..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <SelectInput style={{ maxWidth: 180 }} value={specialty} onChange={e => { setSpecialty(e.target.value); setPage(1); }}>
              <option value="all">All specialties</option>
              {window.SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </div>

          <div className="table-wrap">
            <table className="table table-responsive-stack table-compact">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Status</th>
                  <th>Availability</th>
                  <th>Experience</th>
                  <th>Rating</th>
                  <th>Fee</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows mirroring the real ones: the Doctor cell has
                  // an avatar + room line, Status is a badge pill, and every
                  // cell carries data-label for the mobile stacked-card view
                  Array.from({ length: 5 }).map((_, r) => (
                    <tr key={r}>
                      <td data-label="Doctor">
                        <div className="cell-with-avatar">
                          <span className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <span className="skel" style={{ width: 110, maxWidth: '100%', height: 12, display: 'block' }} />
                            <span className="skel" style={{ width: 90, height: 10, display: 'block', marginTop: 4 }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Specialty"><span className="skel" style={{ width: '65%', height: 12 }} /></td>
                      <td data-label="Status"><span className="skel" style={{ width: 64, height: 18 }} /></td>
                      <td data-label="Availability" className="td-nowrap"><span className="skel" style={{ width: 96, height: 11 }} /></td>
                      <td data-label="Experience"><span className="skel" style={{ width: 40, height: 12 }} /></td>
                      <td data-label="Rating"><span className="skel" style={{ width: 44, height: 12 }} /></td>
                      <td data-label="Fee"><span className="skel" style={{ width: 56, height: 12 }} /></td>
                      <td className="col-actions">
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span className="skel" style={{ width: 24, height: 24 }} />
                          <span className="skel" style={{ width: 24, height: 24 }} />
                          <span className="skel" style={{ width: 24, height: 24 }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )
                  : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="empty-cell" style={{ padding: 0 }}><EmptyState icon="stethoscope" title="No doctors found" message="Try clearing your search or add a new doctor."
                    actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={14} /> Add doctor</button>} /></td></tr>
                ) : paged.map(d => (
                  <tr key={d.id}>
                    <td data-label="Doctor">
                      <div className="cell-with-avatar">
                        <DoctorAvatar doctor={d} size={28} />
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-primary cell-primary-truncate" style={{ maxWidth: 150 }} title={d.name}>{d.name}</div>
                          <div className="cell-secondary">{d.room}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Specialty">{d.specialty}</td>
                    <td data-label="Status"><DoctorStatusBadge status={d.status} /></td>
                    <td data-label="Availability" className="td-nowrap" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }} title={Array.isArray(d.avail) && d.avail.length ? d.avail.join(', ') : undefined}>
                      {formatDayRange(d.avail)}
                    </td>
                    <td data-label="Experience">{d.exp} yrs</td>
                    <td data-label="Rating"><DoctorRatingPill ratings={store.ratings} doctorId={d.id} compact /></td>
                    <td data-label="Fee">₱{d.fee.toLocaleString()}</td>
                    <td className="col-actions">
                      <button className="btn-icon" title="Print / save schedule as PDF" aria-label="Print or save today's schedule as PDF" onClick={() => printSchedule(d)}><Icon name="printer" size={16} /></button>
                      <button className="btn-icon" title="Edit" aria-label="Edit doctor" onClick={() => setEditingId(d.id)}><Icon name="pencil" size={16} /></button>
                      <button className="btn-icon" title="Delete" aria-label="Delete doctor" onClick={() => setConfirmDel(d)} style={{ color: 'var(--error)' }}><Icon name="trash-2" size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={PAGE} label="doctors" />}
        </div>
      </div>

      <DoctorFormModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(newD, access) => {
          const id = 'd' + Date.now();
          const rec = {
            ...newD,
            id,
            // Ratings are patient-given only (completed visits); none are seeded
            exp: parseInt(newD.exp) || 0, fee: parseInt(newD.fee) || 0,
            // Default to a dummy portrait when no photo was uploaded
            photo: newD.photo || `https://randomuser.me/api/portraits/${newD.gender === 'F' ? 'women' : 'men'}/${Math.floor(Math.random() * 99) + 1}.jpg`,
          };
          // Keep the static DOCTORS registry (used by patient-side findDoctor) in sync
          window.DOCTORS.unshift(rec);
          store.setDoctors([...window.DOCTORS]);
          applyAccess(rec, access);
          setAddOpen(false);
          store.pushActivity(CURRENT_ADMIN.name, 'Added doctor', `${newD.name} · ${newD.specialty}`);
          store.pushToast({ title: 'Doctor added', msg: `${newD.name} has been added to your directory.` });
        }} />
      <DoctorFormModal open={!!editingId} onClose={() => setEditingId(null)}
        doctor={store.doctors.find(d => d.id === editingId)}
        account={editingId ? (store.users.find(u => u.role === 'doctor' && u.doctorId === editingId) || null) : null}
        onSave={(edited, access) => {
          // Sync the static DOCTORS registry so patient-side findDoctor() sees the update
          const i = window.DOCTORS.findIndex(x => x.id === editingId);
          if (i > -1) Object.assign(window.DOCTORS[i], edited, { exp: parseInt(edited.exp) || 0, fee: parseInt(edited.fee) || 0 });
          store.setDoctors(store.doctors.map(d => d.id === editingId ? { ...d, ...edited, exp: parseInt(edited.exp) || 0, fee: parseInt(edited.fee) || 0 } : d));
          // Keep the portal account's display name in sync with the edited profile
          store.setUsers(store.users.map(u => (u.role === 'doctor' && u.doctorId === editingId && u.name !== edited.name) ? { ...u, name: edited.name } : u));
          applyAccess({ id: editingId, name: edited.name }, access);
          setEditingId(null);
          store.pushToast({ title: 'Doctor updated', msg: `${edited.name}'s profile has been updated.` });
        }}
        onRevoke={(account) => {
          applyAccess({ id: account.doctorId, name: account.name }, { mode: 'revoke' });
          setEditingId(null);
        }} />
      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={delLoading}
        title="Delete this doctor?"
        message={confirmDel ? `${confirmDel.name}'s profile will be removed. Existing appointments will remain but the doctor will no longer be bookable.` : ''}
        confirmLabel="Delete doctor"
        kind="danger"
      />
    </AppShell>
  );
}

export { DoctorsMgmt };
