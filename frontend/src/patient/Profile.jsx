// Profile — patient (split from screens-patient.jsx)
import { useEffect, useRef, useState } from 'react';
import { AppShell, ConfirmModal, EmptyState, Field, Icon, PageHeader, PageSpinner, PatientAvatar, PwField, SelectInput, TextInput, useStore } from '../shared/components.jsx';
import { CURRENT_PATIENT, PATIENTS } from '../shared/data.js';
import { focusFirstError } from './helpers.js';

// ---------- Profile ----------
function Profile() {
  const store = useStore();
  const me = store.currentPatient || window.CURRENT_PATIENT;
  // Simulated fetch — centered circle spinner while "loading", same 600ms
  // pattern as the other patient pages
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setPageLoading(false), 600); return () => clearTimeout(t); }, []);
  const [form, setForm] = useState({ ...me });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const photoInputRef = useRef(null);
  // Family members (proxy booking) and reminder-preference state
  const [famForm, setFamForm] = useState({ name: '', relation: 'Spouse' });
  const [famErrors, setFamErrors] = useState({});
  const [confirmRemoveFam, setConfirmRemoveFam] = useState(null);
  const [removingFam, setRemovingFam] = useState(false);
  // Uploaded photo (localStorage) wins; otherwise fall back to the patient's
  // dummy portrait from the seed data
  const [photo, setPhoto] = useState(() => {
    try {
      const saved = localStorage.getItem('nmc.patientPhoto');
      if (saved) return saved;
    } catch { /* storage unavailable — use the portrait */ }
    return me.photo || '';
  });
  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      store.pushToast({ kind: 'error', title: 'Invalid file', msg: 'Please choose an image file.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      store.pushToast({ kind: 'error', title: 'Image too large', msg: 'Please choose an image under 1 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
      try { localStorage.setItem('nmc.patientPhoto', reader.result); } catch { /* storage full — keep in-session preview only */ }
      store.pushToast({ title: 'Photo updated', msg: 'Your profile photo has been changed.' });
    };
    reader.readAsDataURL(file);
  };
  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };
  const updatePw = (k, v) => { setPw(p => ({ ...p, [k]: v })); if (pwErrors[k]) setPwErrors(e => ({ ...e, [k]: null })); };

  // "Member since" — derived from the patient's record; registered accounts
  // get it from their user record's createdAt (previously a hardcoded date)
  const joinedISO = me.joined
    || (store.patients.find(p => p.id === me.id) || {}).joined
    || (store.users.find(u => u.id === me.id) || {}).createdAt
    || '';
  const joinedLabel = joinedISO
    ? new Date(joinedISO + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  // Family members — saved in the store so the booking form can offer them
  const updateFam = (k, v) => { setFamForm(f => ({ ...f, [k]: v })); if (famErrors[k]) setFamErrors(e => ({ ...e, [k]: null })); };
  const addFam = (evt) => {
    evt.preventDefault();
    const errs = {};
    if (!famForm.name.trim()) errs.name = 'Name is required';
    setFamErrors(errs);
    if (Object.keys(errs).length) { focusFirstError(); return; }
    store.setFamilyMembers([
      ...(store.familyMembers || []),
      { id: 'fam' + Date.now(), name: famForm.name.trim(), relation: famForm.relation, age: null },
    ]);
    setFamForm({ name: '', relation: famForm.relation });
    store.pushToast({ title: 'Family member added', msg: 'You can now book appointments on their behalf.' });
  };
  const doRemoveFam = () => {
    setRemovingFam(true);
    setTimeout(() => {
      store.setFamilyMembers((store.familyMembers || []).filter(f => f.id !== confirmRemoveFam.id));
      setRemovingFam(false);
      setConfirmRemoveFam(null);
      store.pushToast({ title: 'Family member removed', msg: `${confirmRemoveFam.name} has been removed.` });
    }, 500);
  };

  const saveProfile = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const updated = { ...me, ...form };
      store.setCurrentPatient(updated);
      // Sync the shared patient registries so the admin console (Patients page,
      // appointment owner lookups) reflects the patient's own edits
      const idx = window.PATIENTS.findIndex(x => x.id === updated.id);
      if (idx > -1) Object.assign(window.PATIENTS[idx], updated);
      store.setPatients(store.patients.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      // Keep the login account in sync — Login matches the email/password
      // against store.users, so an unchanged users row would lock the patient
      // out with their new email
      store.setUsers(store.users.map(u => (u.id === updated.id && u.role === 'patient')
        ? { ...u, email: updated.email, name: updated.name, phone: updated.phone } : u));
      store.pushToast({ title: 'Profile updated', msg: 'Your changes have been saved.' });
    }, 700);
  };

  const savePw = (evt) => {
    evt.preventDefault();
    const e = {};
    const account = store.users.find(u => u.id === me.id);
    if (!pw.current) e.current = 'Enter your current password';
    else if (account && account.password !== pw.current) e.current = 'Current password is incorrect';
    if (!pw.next) e.next = 'Enter a new password';
    else if (pw.next.length < 8) e.next = 'Use at least 8 characters';
    if (!pw.confirm) e.confirm = 'Please confirm your new password';
    else if (pw.confirm !== pw.next) e.confirm = 'Passwords do not match';
    setPwErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    setSavingPw(true);
    setTimeout(() => {
      setSavingPw(false);
      if (account) {
        store.setUsers(store.users.map(u => u.id === me.id ? { ...u, password: pw.next } : u));
      }
      setPw({ current: '', next: '', confirm: '' });
      store.pushToast({ title: 'Password changed', msg: 'Your new password is now active.' });
    }, 800);
  };

  if (pageLoading) {
    return (
      <AppShell current="profile">
        <div className="page"><PageSpinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell current="profile">
      <div className="page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <PageHeader title="Profile" subtitle="Manage your personal information and password."
          breadcrumbs={[{ label: 'Home', to: '/patient/dashboard' }, { label: 'Profile' }]} />

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body appt-head">
            {photo
              ? <img src={photo} alt="Profile" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              : <PatientAvatar person={me} size={72} />}
            <div className="appt-head-info">
              <div style={{ fontSize: 18, fontWeight: 600 }}>{me.name}</div>
              <div className="t-muted">Patient{joinedLabel ? ` · Member since ${joinedLabel}` : ''}</div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoChange} />
            <button className="btn btn-secondary profile-photo-btn" onClick={() => photoInputRef.current && photoInputRef.current.click()}>
              <Icon name="upload" size={14} /> Change photo
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Personal information</h2></div>
          <form onSubmit={saveProfile}>
            <div className="card-body">
              <div className="profile-grid">
                <Field label="Full name" required error={errors.name}>
                  <TextInput value={form.name} onChange={e => update('name', e.target.value)} error={errors.name} />
                </Field>
                <Field label="Email address" required error={errors.email}>
                  <TextInput type="email" value={form.email} onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
                </Field>
                <Field label="Phone number" required error={errors.phone}>
                  <TextInput type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} error={errors.phone} icon="phone" />
                </Field>
                <Field label="Date of birth">
                  <TextInput type="date" value={form.dob} onChange={e => update('dob', e.target.value)} />
                </Field>
                <Field label="Gender">
                  <SelectInput value={form.gender} onChange={e => update('gender', e.target.value)}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Prefer not to say</option>
                  </SelectInput>
                </Field>
                <Field label="Blood type">
                  <SelectInput value={form.bloodType} onChange={e => update('bloodType', e.target.value)}>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Home address">
                  <TextInput value={form.address} onChange={e => update('address', e.target.value)} />
                </Field>
                <Field label="Emergency contact">
                  <TextInput value={form.emergencyContact} onChange={e => update('emergencyContact', e.target.value)} />
                </Field>
                <Field label="Known allergies" help="Comma-separated. Write 'None' if not applicable.">
                  <TextInput value={form.allergies} onChange={e => update('allergies', e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="card-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...me })}>Reset</button>
              <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}>Save changes</button>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Change password</h2></div>
          <form onSubmit={savePw}>
            <div className="card-body">
              <div className="pw-grid">
                  <PwField label="Current password" required error={pwErrors.current} autoComplete="current-password"
                    value={pw.current} onChange={e => updatePw('current', e.target.value)} />
                  <PwField label="New password" required error={pwErrors.next} help={!pwErrors.next && 'At least 8 characters'}
                    autoComplete="new-password" value={pw.next} onChange={e => updatePw('next', e.target.value)} />
                  <PwField label="Confirm new password" required error={pwErrors.confirm} autoComplete="new-password"
                    value={pw.confirm} onChange={e => updatePw('confirm', e.target.value)} />
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className={`btn btn-primary ${savingPw ? 'btn-loading' : ''}`}>Update password</button>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h2 className="h-section">Family members</h2></div>
          <form onSubmit={addFam}>
            <div className="card-body stack md">
              <p className="t-muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.55 }}>
                You can book appointments for the people below — they appear as options in the booking form's "Who is this visit for?" dropdown.
              </p>
              {(store.familyMembers || []).length === 0 ? (
                <EmptyState icon="users-round" title="No family members yet" message="Add one so you can book on their behalf." />
              ) : (store.familyMembers || []).map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.name}</div>
                    {/* Relation only — the form doesn't collect an age, and the
                        booking form uses name + relation only, so showing the
                        seed rows' ages read as inconsistent */}
                    <div className="t-muted" style={{ fontSize: 12 }}>{f.relation}</div>
                  </div>
                  <button type="button" className="btn-icon" title="Remove" aria-label={`Remove ${f.name}`} style={{ color: 'var(--error)' }} onClick={() => setConfirmRemoveFam(f)}>
                    <Icon name="trash-2" size={16} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10, alignItems: 'end' }}>
                <Field label="Name" error={famErrors.name}>
                  <TextInput value={famForm.name} onChange={e => updateFam('name', e.target.value)} error={famErrors.name} placeholder="e.g., Maria Bautista" />
                </Field>
                <Field label="Relation">
                  <SelectInput value={famForm.relation} onChange={e => updateFam('relation', e.target.value)}>
                    {['Spouse', 'Child', 'Parent', 'Sibling', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </SelectInput>
                </Field>
                <div style={{ paddingBottom: 1 }}>
                  <button type="submit" className="btn btn-primary"><Icon name="user-plus" size={14} /> Add</button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="h-section">Notifications &amp; reminders</h2></div>
          <div className="card-body stack lg">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={(store.patientPrefs || {}).emailReminders}
                onChange={e => {
                  store.setPatientPrefs({ ...(store.patientPrefs || {}), emailReminders: e.target.checked });
                  store.pushToast({ title: 'Preference saved', msg: `Email reminders ${e.target.checked ? 'on' : 'off'}.` });
                }}
              />
              <span>Email me a reminder the day before my appointment</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={(store.patientPrefs || {}).portalNotifs}
                onChange={e => {
                  store.setPatientPrefs({ ...(store.patientPrefs || {}), portalNotifs: e.target.checked });
                  store.pushToast({ title: 'Preference saved', msg: `Portal notifications ${e.target.checked ? 'on' : 'off'}.` });
                }}
              />
              <span>Show status-change notifications in the portal</span>
            </label>
            <p className="t-help" style={{ margin: 0 }}>
              Saved instantly in this browser. Clinic-wide reminder settings are managed by staff.
            </p>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmRemoveFam}
        onClose={() => setConfirmRemoveFam(null)}
        onConfirm={doRemoveFam}
        loading={removingFam}
        title="Remove family member?"
        message={confirmRemoveFam ? `${confirmRemoveFam.name} will be removed. You will no longer be able to book on their behalf.` : ''}
        confirmLabel="Remove"
        kind="danger"
      />
    </AppShell>
  );
}

export { Profile };
