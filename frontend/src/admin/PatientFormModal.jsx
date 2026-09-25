// PatientFormModal — admin (split from screens-admin.jsx)
import { useEffect, useRef, useState } from 'react';
import { Field, Icon, Modal, PatientAvatar, SelectInput, TextInput } from '../shared/components.jsx';

function PatientFormModal({ open, onClose, patient, onSave }) {
  const isEdit = !!patient;
  const [form, setForm] = useState({ name: '', email: '', phone: '', gender: 'M', age: '' });
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setForm(patient ? { name: patient.name, email: patient.email || '', phone: patient.phone, gender: patient.gender, age: patient.age } : { name: '', email: '', phone: '', gender: 'M', age: '' });
      setPhoto(patient?.photo || '');
      setPhotoError('');
      setErrors({});
    }
  }, [open, patient]);
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

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.age) e.age = 'Age is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ ...form, photo });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit patient' : 'Add new patient'}
      subtitle={isEdit ? 'Update the patient\'s information below.' : 'Enter the new patient\'s details to create a record.'}
      size="md"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>{isEdit ? 'Save changes' : 'Add patient'}</button>
      </>}
    >
      <div className="stack md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {photo
            ? <img src={photo} alt="Patient" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
            : <PatientAvatar person={{ name: form.name }} size={64} />}
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
        <Field label="Full name" required error={errors.name}>
          <TextInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="e.g., Juan dela Cruz" />
        </Field>
        <Field label="Email" error={errors.email} help="Optional but recommended for reminders">
          <TextInput type="email" icon="mail" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} error={errors.email} placeholder="patient@example.com" />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <TextInput type="tel" icon="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} error={errors.phone} placeholder="+63 917 000 0000" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Gender">
            <SelectInput value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
            </SelectInput>
          </Field>
          <Field label="Age" required error={errors.age}>
            <TextInput type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} error={errors.age} placeholder="0" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export { PatientFormModal };
