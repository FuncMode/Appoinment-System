// PrivacyPage — public (split from screens-public.jsx)

import { LegalPage } from './LegalPage.jsx';

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sub="How MedicaCare collects, uses, and protects your information."
      updated="September 2026"
      sections={[
        { h: 'Information we collect', p: 'When you register, we collect your name, email address, phone number, and appointment history. During consultations, doctors may record diagnoses, prescriptions, and clinical notes relevant to your care.' },
        { h: 'How we use your information', p: 'Your information is used solely to schedule and manage your appointments, provide medical care, send appointment reminders, and comply with legal and regulatory obligations. We do not sell your personal data to third parties.' },
        { h: 'Medical data confidentiality', p: 'All patient records are treated as strictly confidential. In the production system this prototype models, only your attending physicians and authorized hospital staff may access your medical information, and every access is logged and audited.' },
        { h: 'Data security', p: 'As a school prototype, your account and appointment data live only in this browser (localStorage) and never leave your device, and passwords are stored as plain text for demo purposes. The production system this prototype models would keep records in access-controlled systems with encryption in transit and at rest, hashed passwords, and least-privilege staff access.' },
        { h: 'Your rights', p: 'You may request a copy of your records, ask for corrections, or withdraw consent for non-essential data processing by contacting our Data Protection Officer through the contact page.' },
        { h: 'Data retention', p: 'Medical records are retained for the period required by Philippine health regulations, after which they are securely and permanently destroyed.' },
      ]}
    />
  );
}

export { PrivacyPage };
