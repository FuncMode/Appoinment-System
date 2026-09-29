// PatientRecordsModal — admin (split from screens-admin.jsx)
import { useState } from 'react';
import { Badge, EmptyState, Field, Icon, Modal, SelectInput, TextInput, useStore } from '../shared/components.jsx';
import { CURRENT_ADMIN, findDoctor, formatDate } from '../shared/data.js';
import { localToday, focusFirstError } from './helpers.js';

// ---------- Patient records (labs & medications, staff-encoded) ----------
// Staff-side creation path for the Medical Records sections in the patient
// portal: lab results and prescriptions are encoded here (Admin console →
// Patients → Labs & medications) and read live from the shared store.
function PatientRecordsModal({ patient, onClose }) {
  const store = useStore();
  const [tab, setTab] = useState('labs');
  const [adding, setAdding] = useState(false);
  const [labForm, setLabForm] = useState({ date: '', name: '', category: 'Hematology', status: 'Final', findings: [] });
  const [labErrors, setLabErrors] = useState({});
  const [medForm, setMedForm] = useState({ name: '', dose: '', form: 'Tablet', frequency: '', prescriberId: '', startDate: '', status: 'Active', instructions: '' });
  const [medErrors, setMedErrors] = useState({});

  if (!patient) return null;

  const labs = (store.labs || []).filter(l => l.patientId === patient.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const meds = (store.meds || []).filter(m => m.patientId === patient.id)
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));

  const openAdd = () => {
    setLabForm({ date: localToday(), name: '', category: 'Hematology', status: 'Final', findings: [{ item: '', value: '', unit: '', range: '', flag: '' }] });
    setMedForm({ name: '', dose: '', form: 'Tablet', frequency: '', prescriberId: '', startDate: localToday(), status: 'Active', instructions: '' });
    setLabErrors({});
    setMedErrors({});
    setAdding(true);
  };
  const setLab = (k, v) => { setLabForm(f => ({ ...f, [k]: v })); if (labErrors[k]) setLabErrors(x => ({ ...x, [k]: null })); };
  const setMed = (k, v) => { setMedForm(f => ({ ...f, [k]: v })); if (medErrors[k]) setMedErrors(x => ({ ...x, [k]: null })); };
  const setFinding = (i, k, v) => setLabForm(f => ({ ...f, findings: f.findings.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const addFinding = () => setLabForm(f => ({ ...f, findings: [...f.findings, { item: '', value: '', unit: '', range: '', flag: '' }] }));
  const removeFinding = (i) => setLabForm(f => ({ ...f, findings: f.findings.filter((_, j) => j !== i) }));

  const saveLab = () => {
    const e = {};
    if (!labForm.name.trim()) e.name = 'Test name is required';
    if (!labForm.date) e.date = 'Date is required';
    const findings = labForm.findings.filter(f => f.item.trim() || f.value.trim());
    if (!findings.length) e.findings = 'Add at least one finding (item and value)';
    else if (findings.some(f => !f.item.trim() || !f.value.trim())) e.findings = 'Each finding needs an item and a value';
    setLabErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    const rec = {
      id: 'lab' + Date.now(),
      patientId: patient.id,
      date: labForm.date,
      name: labForm.name.trim(),
      category: labForm.category,
      status: labForm.status,
      results: findings.map(f => ({ item: f.item.trim(), value: f.value.trim(), unit: f.unit.trim(), range: f.range.trim(), flag: f.flag })),
    };
    store.setLabs([...(store.labs || []), rec]);
    store.pushActivity(CURRENT_ADMIN.name, 'Added lab result', `${patient.name} · ${rec.name}`);
    store.pushToast({ title: 'Lab result saved', msg: `${rec.name} was added to ${patient.name}'s medical records.` });
    setAdding(false);
  };
  const deleteLab = (l) => {
    store.setLabs((store.labs || []).filter(x => x.id !== l.id));
    store.pushActivity(CURRENT_ADMIN.name, 'Deleted lab result', `${patient.name} · ${l.name}`);
    store.pushToast({ title: 'Lab result removed', msg: `${l.name} was deleted from ${patient.name}'s records.` });
  };
  const saveMed = () => {
    const e = {};
    if (!medForm.name.trim()) e.name = 'Medicine name is required';
    if (!medForm.frequency.trim()) e.frequency = 'Frequency is required';
    if (!medForm.prescriberId) e.prescriberId = 'Select the prescriber';
    setMedErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    const rec = {
      id: 'med' + Date.now(),
      patientId: patient.id,
      name: medForm.name.trim(),
      dose: medForm.dose.trim(),
      form: medForm.form,
      frequency: medForm.frequency.trim(),
      prescriberId: medForm.prescriberId,
      startDate: medForm.startDate || localToday(),
      status: medForm.status,
      instructions: medForm.instructions.trim(),
    };
    store.setMeds([...(store.meds || []), rec]);
    store.pushActivity(CURRENT_ADMIN.name, 'Added medication', `${patient.name} · ${rec.name}`);
    store.pushToast({ title: 'Medication saved', msg: `${rec.name} was added to ${patient.name}'s medical records.` });
    setAdding(false);
  };
  const deleteMed = (m) => {
    store.setMeds((store.meds || []).filter(x => x.id !== m.id));
    store.pushActivity(CURRENT_ADMIN.name, 'Deleted medication', `${patient.name} · ${m.name}`);
    store.pushToast({ title: 'Medication removed', msg: `${m.name} was deleted from ${patient.name}'s records.` });
  };

  return (
    <Modal
      open onClose={onClose} size="lg"
      title={`Labs & medications for ${patient.name}`}
      subtitle="Staff-encoded entries shown in the patient's Medical Records page."
      icon="flask-conical" iconKind="info"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button className={'chip filter' + (tab === 'labs' ? ' on' : '')} onClick={() => { setTab('labs'); setAdding(false); }}>Labs ({labs.length})</button>
        <button className={'chip filter' + (tab === 'meds' ? ' on' : '')} onClick={() => { setTab('meds'); setAdding(false); }}>Medications ({meds.length})</button>
      </div>

      {tab === 'labs' && !adding && (
        labs.length === 0 ? (
          <EmptyState icon="flask-conical" title="No lab results on file"
            message="Add a lab result and it appears in the patient's Medical Records page."
            actions={<button className="btn btn-primary" onClick={openAdd}><Icon name="plus" size={14} /> Add lab result</button>} />
        ) : (
          <div className="stack md">
            {labs.map(l => (
              <div key={l.id} className="list-item" style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div className="list-item-body" style={{ whiteSpace: 'normal', overflow: 'visible' }}>
                  <div className="list-item-title">{l.name}</div>
                  <div className="list-item-sub">{window.formatDate(l.date)} · {l.category} · {l.results.length} finding{l.results.length === 1 ? '' : 's'} · {l.status}</div>
                </div>
                <button className="btn-icon" title="Delete lab result" aria-label={`Delete ${l.name}`} style={{ color: 'var(--error)' }} onClick={() => deleteLab(l)}>
                  <Icon name="trash-2" size={15} />
                </button>
              </div>
            ))}
            <div><button className="btn btn-primary sm" onClick={openAdd}><Icon name="plus" size={13} /> Add lab result</button></div>
          </div>
        )
      )}

      {tab === 'labs' && adding && (
        <div className="stack md">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <Field label="Test name" required error={labErrors.name}>
              <TextInput value={labForm.name} onChange={e => setLab('name', e.target.value)} error={labErrors.name} placeholder="e.g., Complete Blood Count (CBC)" />
            </Field>
            <Field label="Category">
              <SelectInput value={labForm.category} onChange={e => setLab('category', e.target.value)}>
                {['Hematology', 'Clinical Chemistry', 'Microbiology', 'Immunology', 'Radiology'].map(c => <option key={c}>{c}</option>)}
              </SelectInput>
            </Field>
            <Field label="Date" required error={labErrors.date}>
              <TextInput type="date" value={labForm.date} onChange={e => setLab('date', e.target.value)} error={labErrors.date} />
            </Field>
          </div>
          <Field label="Status">
            <SelectInput value={labForm.status} onChange={e => setLab('status', e.target.value)}>
              <option>Final</option>
              <option>Pending</option>
            </SelectInput>
          </Field>
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Findings <span className="req">*</span></div>
            {labForm.findings.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 96px auto', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                <TextInput placeholder="Item (e.g., Hemoglobin)" value={f.item} onChange={e => setFinding(i, 'item', e.target.value)} />
                <TextInput placeholder="Value" value={f.value} onChange={e => setFinding(i, 'value', e.target.value)} />
                <TextInput placeholder="Unit" value={f.unit} onChange={e => setFinding(i, 'unit', e.target.value)} />
                <TextInput placeholder="Ref. range" value={f.range} onChange={e => setFinding(i, 'range', e.target.value)} />
                <SelectInput value={f.flag} onChange={e => setFinding(i, 'flag', e.target.value)} aria-label="Flag">
                  <option value="">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </SelectInput>
                <button className="btn-icon" title="Remove finding" aria-label="Remove finding" onClick={() => removeFinding(i)}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
            {labErrors.findings && <div className="field-error"><Icon name="alert-circle" size={12} /> {labErrors.findings}</div>}
            <button type="button" className="btn btn-secondary sm" onClick={addFinding}><Icon name="plus" size={13} /> Add finding</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveLab}>Save lab result</button>
          </div>
        </div>
      )}
      {tab === 'meds' && !adding && (
        meds.length === 0 ? (
          <EmptyState icon="pill" title="No medications on file"
            message="Add a prescription and it appears in the patient's Medical Records page."
            actions={<button className="btn btn-primary" onClick={openAdd}><Icon name="plus" size={14} /> Add medication</button>} />
        ) : (
          <div className="stack md">
            {meds.map(m => {
              const doc = window.findDoctor(m.prescriberId);
              return (
                <div key={m.id} className="list-item" style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div className="list-item-body" style={{ whiteSpace: 'normal', overflow: 'visible' }}>
                    <div className="list-item-title">{m.name} <span className="t-muted" style={{ fontWeight: 400 }}>{m.dose ? `· ${m.dose} ${m.form}` : ''}</span></div>
                    <div className="list-item-sub">{m.frequency} · {doc ? doc.name : '—'} · started {window.formatDate(m.startDate)}</div>
                  </div>
                  <Badge kind={m.status === 'Active' ? 'success' : 'neutral'} dot={false}>{m.status}</Badge>
                  <button className="btn-icon" title="Delete medication" aria-label={`Delete ${m.name}`} style={{ color: 'var(--error)' }} onClick={() => deleteMed(m)}>
                    <Icon name="trash-2" size={15} />
                  </button>
                </div>
              );
            })}
            <div><button className="btn btn-primary sm" onClick={openAdd}><Icon name="plus" size={13} /> Add medication</button></div>
          </div>
        )
      )}

      {tab === 'meds' && adding && (
        <div className="stack md">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <Field label="Medicine name" required error={medErrors.name}>
              <TextInput value={medForm.name} onChange={e => setMed('name', e.target.value)} error={medErrors.name} placeholder="e.g., Amoxicillin" />
            </Field>
            <Field label="Dose">
              <TextInput value={medForm.dose} onChange={e => setMed('dose', e.target.value)} placeholder="e.g., 500 mg" />
            </Field>
            <Field label="Form">
              <SelectInput value={medForm.form} onChange={e => setMed('form', e.target.value)}>
                {['Tablet', 'Capsule', 'Syrup', 'Topical cream', 'Injection'].map(f => <option key={f}>{f}</option>)}
              </SelectInput>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Frequency" required error={medErrors.frequency}>
              <TextInput value={medForm.frequency} onChange={e => setMed('frequency', e.target.value)} error={medErrors.frequency} placeholder="e.g., Three times daily" />
            </Field>
            <Field label="Prescriber" required error={medErrors.prescriberId}>
              <SelectInput value={medForm.prescriberId} onChange={e => setMed('prescriberId', e.target.value)} error={medErrors.prescriberId}>
                <option value="">Select a doctor…</option>
                {store.doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Start date">
              <TextInput type="date" value={medForm.startDate} onChange={e => setMed('startDate', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Status">
              <SelectInput value={medForm.status} onChange={e => setMed('status', e.target.value)}>
                <option>Active</option>
                <option>Completed</option>
              </SelectInput>
            </Field>
            <Field label="Instructions" help="Shown under the medicine name in the patient's records.">
              <TextInput value={medForm.instructions} onChange={e => setMed('instructions', e.target.value)} placeholder="e.g., Take after meals" />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveMed}>Save medication</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export { PatientRecordsModal };
