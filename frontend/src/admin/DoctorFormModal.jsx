// DoctorFormModal — admin (split from screens-admin.jsx)
import { useEffect, useRef, useState } from 'react';
import { DoctorAvatar, Field, Icon, Modal, SelectInput, TextInput, useStore } from '../shared/components.jsx';
import { SPECIALTIES } from '../shared/data.js';

function DoctorFormModal({ open, onClose, doctor, account, onSave, onRevoke }) {
  const isEdit = !!doctor;
  const store = useStore();
  const [form, setForm] = useState({ name: '', specialty: 'Cardiology', status: 'available', room: '', exp: '', fee: '' });
  const [errors, setErrors] = useState({});
  const [avail, setAvail] = useState(['Mon','Tue','Wed','Thu','Fri']);
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);
  // Portal access — admin-issued credentials the doctor signs in with at the
  // Doctor portal. On Add (or Edit without an account) both fields together
  // grant access; on Edit with an account, a typed password resets it.
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPw, setAccessPw] = useState('');
  const [accessErrors, setAccessErrors] = useState({});
  useEffect(() => {
    if (open) {
      setForm(doctor ? { name: doctor.name, specialty: doctor.specialty, status: doctor.status, room: doctor.room, exp: doctor.exp, fee: doctor.fee } : { name: '', specialty: 'Cardiology', status: 'available', room: '', exp: '', fee: '' });
      setAvail(doctor && Array.isArray(doctor.avail) && doctor.avail.length ? [...doctor.avail] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setPhoto(doctor?.photo || '');
      setPhotoError('');
      setErrors({});
      setAccessEmail(account ? account.email : '');
      setAccessPw('');
      setAccessErrors({});
    }
  }, [open, doctor, account]);
  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file (JPG or PNG).');
      return;
    }
    if (file.size > 1024 * 1024) {
      setPhotoError('Image is too large. Please choose one under 1 MB.');
      return;
    }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };
  // Unambiguous charset (no I/l/1/O/0) so a generated password is easy to
  // re-type when the admin shares it with the doctor
  const generatePw = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const rand = window.crypto.getRandomValues(new Uint32Array(10));
    setAccessPw(Array.from(rand, n => chars[n % chars.length]).join(''));
    if (accessErrors.password) setAccessErrors(ae => ({ ...ae, password: null }));
  };

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Doctor name is required';
    if (!form.room.trim()) e.room = 'Room / clinic is required';
    if (!form.exp) e.exp = 'Years of experience required';
    if (!form.fee) e.fee = 'Consultation fee required';
    if (!avail.length) e.avail = 'Select at least one available day';
    // Portal access validation — optional: blank fields mean "no account yet"
    // (it can be granted later from Edit). On Edit with an account, a typed
    // password means "reset it"; blank keeps the current password.
    const ae = {};
    const granting = !isEdit || !account;
    if (granting) {
      const email = accessEmail.trim();
      if (email || accessPw) {
        if (!email) ae.email = 'Portal email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ae.email = 'Enter a valid email address';
        else if (store.users.some(u => u.email.toLowerCase() === email.toLowerCase())) ae.email = 'That email is already used by another account';
        if (!accessPw) ae.password = 'Password is required';
        else if (accessPw.length < 8) ae.password = 'Use at least 8 characters';
      }
    } else if (accessPw && accessPw.length < 8) {
      ae.password = 'Use at least 8 characters';
    }
    setAccessErrors(ae);
    setErrors(e);
    if (Object.keys(e).length || Object.keys(ae).length) return;
    // Access payload for the parent to apply to store.users (grant/reset)
    let access = null;
    if (granting && accessEmail.trim() && accessPw) {
      access = { mode: 'grant', email: accessEmail.trim().toLowerCase(), password: accessPw };
    } else if (!granting && account && accessPw) {
      access = { mode: 'reset', password: accessPw };
    }
    onSave({ ...form, avail, photo }, access);
  };
  const toggleDay = (day) => setAvail(av => av.includes(day) ? av.filter(d => d !== day) : [...av, day]);

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEdit ? 'Edit doctor' : 'Add new doctor'}
      subtitle={isEdit ? 'Update the doctor\'s profile, availability, and portal access.' : 'Create a new doctor profile, schedule, and portal access.'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>{isEdit ? 'Save changes' : 'Add doctor'}</button>
      </>}
    >
      <div className="stack md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {photo
            ? <img src={photo} alt="Doctor" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
            : <DoctorAvatar doctor={{ name: form.name }} size={64} />}
          <div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoChange} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary sm" onClick={() => photoInputRef.current && photoInputRef.current.click()}>
                <Icon name="upload" size={14} /> Upload photo
              </button>
              {photo && <button type="button" className="btn btn-ghost sm" onClick={() => setPhoto('')}>Remove</button>}
            </div>
            <div className="t-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              Optional. Defaults to a portrait photo. JPG/PNG up to 1 MB.
            </div>
            {photoError && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>{photoError}</div>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Full name" required error={errors.name}>
            <TextInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Dr. Juan Dela Cruz" />
          </Field>
          <Field label="Specialty" required>
            <SelectInput value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
              {window.SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="available">Available</option>
              <option value="busy">Busy today</option>
              <option value="on-leave">On leave</option>
            </SelectInput>
          </Field>
          <Field label="Room / clinic" required error={errors.room}>
            <TextInput value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} error={errors.room} placeholder="e.g., Cardio Wing • Rm 402" />
          </Field>
          <Field label="Years of experience" required error={errors.exp}>
            <TextInput type="number" value={form.exp} onChange={e => setForm(f => ({ ...f, exp: e.target.value }))} error={errors.exp} placeholder="10" />
          </Field>
          <Field label="Consultation fee (₱)" required error={errors.fee}>
            <TextInput type="number" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} error={errors.fee} placeholder="1500" />
          </Field>
        </div>
        <Field label="Weekly availability" error={errors.avail} help={!errors.avail && 'Days the doctor is available for consultations'}>
          <div className="chip-group">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
              <button key={day} type="button" className={'chip' + (avail.includes(day) ? ' on' : '')} onClick={() => toggleDay(day)}>
                {day}
              </button>
            ))}
          </div>
        </Field>

        {/* Portal access — admin-issued credentials for the Doctor portal.
            The portal itself is login-only: doctors never self-register. */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Icon name="key-round" size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Doctor portal access</span>
          </div>
          <p className="t-muted" style={{ fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
            {isEdit && account
              ? 'Active. The doctor signs in at the Doctor portal with the email below. Reset the password here if needed.'
              : 'Create the login the doctor will use at the Doctor portal. Leave both fields blank to add the profile without portal access. It can be granted later from Edit.'}
          </p>
          {isEdit && account ? (
            <div className="stack md">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Portal email" help="Issued with the account and cannot be changed here.">
                  <TextInput value={account.email} disabled />
                </Field>
                <Field label="New password" error={accessErrors.password} help={!accessErrors.password && 'Leave blank to keep the current password.'}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <TextInput type="text" style={{ flex: 1 }} value={accessPw} error={accessErrors.password}
                      onChange={e => { setAccessPw(e.target.value); if (accessErrors.password) setAccessErrors(ae => ({ ...ae, password: null })); }}
                      placeholder="Min 8 characters" />
                    <button type="button" className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={generatePw}>Generate</button>
                  </div>
                </Field>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-danger-outline sm" onClick={() => onRevoke(account)}>
                  <Icon name="shield-off" size={13} /> Revoke portal access
                </button>
                <span className="t-muted" style={{ fontSize: 11.5 }}>Removes the doctor's login. It can be granted again later.</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Portal email" error={accessErrors.email} help={!accessErrors.email && 'Used to sign in at the Doctor portal.'}>
                <TextInput type="email" icon="mail" placeholder="doctor@medicacare.ph" value={accessEmail} error={accessErrors.email}
                  onChange={e => { setAccessEmail(e.target.value); if (accessErrors.email) setAccessErrors(ae => ({ ...ae, email: null })); }} />
              </Field>
              <Field label="Password" error={accessErrors.password} help={!accessErrors.password && 'Minimum 8 characters. Share it with the doctor securely.'}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TextInput type="text" style={{ flex: 1 }} value={accessPw} error={accessErrors.password}
                    onChange={e => { setAccessPw(e.target.value); if (accessErrors.password) setAccessErrors(ae => ({ ...ae, password: null })); }}
                    placeholder="Min 8 characters" />
                  <button type="button" className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={generatePw}>Generate</button>
                </div>
              </Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export { DoctorFormModal };
