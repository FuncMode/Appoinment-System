// PrivacyPage — public (split from screens-public.jsx)

import Aurora from '../shared/reactbits/Aurora.jsx';
import ShinyText from '../shared/reactbits/ShinyText.jsx';
import CountUp from '../shared/reactbits/CountUp.jsx';
import SplitText from '../shared/reactbits/SplitText.jsx';
import AnimatedContent from '../shared/reactbits/AnimatedContent.jsx';
import Magnet from '../shared/reactbits/Magnet.jsx';
import ScrollVelocity from '../shared/reactbits/ScrollVelocity.jsx';
import StarBorder from '../shared/reactbits/StarBorder.jsx';
import GlareHover from '../shared/reactbits/GlareHover.jsx';  // hero preview card only — the one deliberate hover flourish
import Ribbons from '../shared/reactbits/Ribbons.jsx';

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
