// Shared helpers/constants — public (split from screens-public.jsx).
// Pure data module: no React/component imports so any chunk can pull this
// content without dragging the shared UI library (or gsap/ogl) with it.

// "Find the right care" symptom guide (Cleveland-Clinic-style care finder).
// Maps common complaints to the specialty that treats them — pulls live
// doctor counts from the seed data so results stay accurate.
// Shared with the patient portal's Find a doctor page, where the same pills
// act as specialty filters (screens-patient.jsx DoctorListing).
const CARE_GUIDE = [
  { symptom: 'Chest pain or palpitations', specialty: 'Cardiology' },
  { symptom: "Child's fever or check-up", specialty: 'Pediatrics' },
  { symptom: 'Skin, acne, or allergy issues', specialty: 'Dermatology' },
  { symptom: 'Migraines or numbness', specialty: 'Neurology' },
  { symptom: 'Pregnancy or women’s health', specialty: 'OB-GYN' },
  { symptom: 'Bone or joint pain', specialty: 'Orthopedics' },
  { symptom: 'Ear, nose, or throat problems', specialty: 'ENT' },
  { symptom: 'Anxiety or mental health', specialty: 'Psychiatry' },
  { symptom: 'Diabetes or hypertension', specialty: 'Internal Medicine' },
  { symptom: 'General annual check-up', specialty: 'Family Medicine' },
];

// Homepage FAQ — expandable accordion (Cleveland-Clinic-style FAQ section)
const LANDING_FAQS = [
  { q: 'Do I need an account to book an appointment?', a: 'Yes. Create a free patient account first so your bookings, records, and reminders live in one secure place. Registration takes under a minute.' },
  { q: 'How much is a consultation?', a: 'Consultation fees start at ₱1,000 for Family Medicine and vary by specialty (e.g., ₱1,800 for Cardiology). The exact fee is shown on every doctor’s profile.' },
  { q: 'Do you accept HMO?', a: 'Yes, we work with major HMO providers. Coverage depends on your provider’s terms and is verified at the time of your visit.' },
  { q: 'Can I reschedule or cancel my appointment?', a: 'Absolutely. Reschedule or cancel from your patient portal at least 24 hours in advance so the slot can be offered to other patients.' },
  { q: 'What should I bring on my first visit?', a: 'A valid ID, your HMO card (if any), and a list of medications you currently take. Your registration details are already in our system when you book online.' },
];

// Services-page FAQ — expandable accordion
const SERVICES_FAQS = [
  { q: 'Do I need an appointment for laboratory tests?', a: 'Walk-ins are accepted for routine labs (CBC, urinalysis, fasting blood sugar) before 10:00 AM. Booking online guarantees a slot and shorter wait.' },
  { q: 'How long do lab and imaging results take?', a: 'Most routine lab results are released the same day. Imaging reads (X-ray, ultrasound, ECG) are typically ready within 24–48 hours.' },
  { q: 'Do you accept walk-in consultations?', a: 'Yes, subject to the doctor’s schedule for the day. Booked patients are prioritized, so we recommend reserving a slot through the portal.' },
  { q: 'Is there a package for annual physical exams?', a: 'Yes. Executive check-up bundles are tailored to your age and risk profile. Call our hotline or send a message for current package rates.' },
  { q: 'How does HMO assistance work?', a: 'Present your HMO card at the billing counter. Our staff verifies eligibility and processes the claim directly with your provider so you focus on recovery.' },
];

export { CARE_GUIDE, LANDING_FAQS, SERVICES_FAQS };
