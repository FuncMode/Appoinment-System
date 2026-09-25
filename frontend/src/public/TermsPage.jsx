// TermsPage — public (split from screens-public.jsx)

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

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sub="The ground rules for using the MedicaCare patient portal and booking system."
      updated="September 2026"
      sections={[
        { h: 'Using the portal', p: 'The patient portal is provided for scheduling appointments, viewing your own records, and communicating with hospital staff. You agree to provide accurate registration details and to keep your login credentials confidential.' },
        { h: 'Appointments & cancellations', p: 'Appointment slots are confirmed on a first-come, first-served basis. Please cancel or reschedule at least 24 hours in advance so the slot can be offered to other patients.' },
        { h: 'Medical disclaimer', p: 'Content on this website is for general information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your physician regarding your condition. In an emergency, go directly to the Emergency Room or call our hotline.' },
        { h: 'Acceptable use', p: 'You may not use the portal to transmit unlawful, abusive, or fraudulent content, attempt to access other patients\' records, or interfere with the operation of the system.' },
        { h: 'Fees & billing', p: 'Consultation fees shown on this site are indicative and may change without prior notice. HMO coverage depends on your provider\'s terms and is verified at the time of the visit.' },
        { h: 'Changes to these terms', p: 'MedicaCare may update these terms from time to time. Continued use of the portal after an update constitutes acceptance of the revised terms.' },
      ]}
    />
  );
}

export { TermsPage };
