// ============================================================
// MedicaCare — Fictional Data
// ============================================================

const HOSPITAL = {
  name: 'MedicaCare',
  short: 'MedicaCare',
  tagline: 'Compassionate care, backed by clinical excellence.',
  phone: '+63 (2) 8567 4400',
  address: '221 Rizal Avenue, Quezon City, Metro Manila',
  email: 'care@medicacare.ph',
};

const SPECIALTIES = [
  'Cardiology', 'Pediatrics', 'Dermatology', 'Neurology',
  'OB-GYN', 'Orthopedics', 'ENT', 'Psychiatry',
  'Internal Medicine', 'Family Medicine',
];

const DOCTORS = [
  { id: 'd1',  name: 'Dr. Maria Elena Villanueva-Santos', specialty: 'Cardiology',       status: 'available',   rating: 4.9, exp: 18, room: 'Cardio Wing • Rm 402',  fee: 1800, gender: 'F' },
  { id: 'd2',  name: 'Dr. Rafael Domingo',                specialty: 'Pediatrics',       status: 'available',   rating: 4.8, exp: 12, room: 'Peds Wing • Rm 210',    fee: 1200, gender: 'M' },
  { id: 'd3',  name: 'Dr. Ana Beatriz Concepcion',        specialty: 'Dermatology',      status: 'available',   rating: 4.7, exp: 9,  room: 'Outpatient • Rm 118',   fee: 1500, gender: 'F' },
  { id: 'd4',  name: 'Dr. Joaquin Mendoza',               specialty: 'Neurology',        status: 'on-leave',    rating: 4.9, exp: 21, room: 'Neuro Wing • Rm 505',   fee: 2200, gender: 'M' },
  { id: 'd5',  name: 'Dr. Katrina Salvador-Ramos',        specialty: 'OB-GYN',           status: 'available',   rating: 4.9, exp: 15, room: "Women's Health • Rm 302", fee: 1600, gender: 'F' },
  { id: 'd6',  name: 'Dr. Miguel Sebastian Torres',       specialty: 'Orthopedics',      status: 'busy',        rating: 4.6, exp: 11, room: 'Ortho Wing • Rm 401',   fee: 1700, gender: 'M' },
  { id: 'd7',  name: 'Dr. Isabelle Fajardo',              specialty: 'ENT',              status: 'available',   rating: 4.8, exp: 8,  room: 'Outpatient • Rm 122',   fee: 1400, gender: 'F' },
  { id: 'd8',  name: 'Dr. Emmanuel de la Cruz',           specialty: 'Psychiatry',       status: 'available',   rating: 4.7, exp: 14, room: 'Mental Health • Rm 601', fee: 2000, gender: 'M' },
  { id: 'd9',  name: 'Dr. Corazon Bautista-Uy',           specialty: 'Internal Medicine',status: 'available',   rating: 4.8, exp: 20, room: 'Outpatient • Rm 105',   fee: 1300, gender: 'F' },
  { id: 'd10', name: 'Dr. Andres Kalaw',                  specialty: 'Family Medicine',  status: 'available',   rating: 4.5, exp: 6,  room: 'Outpatient • Rm 108',   fee: 1000, gender: 'M' },
  { id: 'd11', name: 'Dr. Patricia Lourdes Aquino',       specialty: 'Cardiology',       status: 'available',   rating: 4.8, exp: 16, room: 'Cardio Wing • Rm 405',  fee: 1800, gender: 'F' },
  { id: 'd12', name: 'Dr. Benjamin Ocampo',               specialty: 'Pediatrics',       status: 'busy',        rating: 4.6, exp: 10, room: 'Peds Wing • Rm 212',    fee: 1200, gender: 'M' },
  { id: 'd13', name: 'Dr. Rosario Mercado-Lim',           specialty: 'Dermatology',      status: 'available',   rating: 4.7, exp: 13, room: 'Outpatient • Rm 120',   fee: 1500, gender: 'F' },
  { id: 'd14', name: 'Dr. Vicente Alvarez',               specialty: 'Neurology',        status: 'available',   rating: 4.9, exp: 22, room: 'Neuro Wing • Rm 508',   fee: 2200, gender: 'M' },
  { id: 'd15', name: 'Dr. Regina Pascual',                specialty: 'OB-GYN',           status: 'on-leave',    rating: 4.7, exp: 11, room: "Women's Health • Rm 305", fee: 1600, gender: 'F' },
  { id: 'd16', name: 'Dr. Enrique Balagtas',              specialty: 'Orthopedics',      status: 'available',   rating: 4.8, exp: 17, room: 'Ortho Wing • Rm 403',   fee: 1700, gender: 'M' },
  { id: 'd17', name: 'Dr. Camila Reyes-Tan',              specialty: 'ENT',              status: 'available',   rating: 4.6, exp: 7,  room: 'Outpatient • Rm 124',   fee: 1400, gender: 'F' },
  { id: 'd18', name: 'Dr. Fernando Zaragoza',             specialty: 'Psychiatry',       status: 'busy',        rating: 4.8, exp: 19, room: 'Mental Health • Rm 604', fee: 2000, gender: 'M' },
];

// Dummy portrait photos for the prototype (randomuser.me — free placeholder
// portrait photos, no API key needed; the app already uses CDNs for fonts and
// icons). DoctorAvatar falls back to the initials circle when offline.
DOCTORS.forEach((d, i) => {
  d.photo = `https://randomuser.me/api/portraits/${d.gender === 'F' ? 'women' : 'men'}/${((i + 1) * 5) % 99}.jpg`;
});

// Demo visit ratings — fictional feedback from the fictional seed patients so
// the rating system shows realistic computed averages from day one. Each row
// is one fictional completed visit; appointment ids use the 'demo-' prefix so
// they never collide with (or block) real appointments in the booking flow.
// The averages doctors display are computed from these rows plus any real
// ratings submitted from the portal, always with the review count shown.
const RATING_PATTERNS = {
  high: [5, 5, 5, 4, 5, 4, 5],  // for doctors seeded at ≈4.7+
  mid:  [5, 4, 5, 4, 5, 4, 5],  // for doctors seeded at ≈4.6
  good: [5, 4, 4, 5, 4, 5, 4],  // for doctors seeded at ≈4.4–4.5
};
export const SEED_RATINGS = DOCTORS.flatMap((d, i) => {
  const pattern = RATING_PATTERNS[d.rating >= 4.8 ? 'high' : d.rating >= 4.6 ? 'mid' : 'good'];
  const count = 4 + (i % 4); // deterministic 4–7 ratings per doctor
  return Array.from({ length: count }, (_, j) => ({
    id: `demo-${d.id}-${j}`,
    appointmentId: `demo-${d.id}-${j}`, // fictional completed visit
    doctorId: d.id,
    patientId: `p${(j % 5) + 1}`,
    stars: pattern[j % pattern.length],
    comment: '',
    createdAt: `2026-08-${String(((i * 3 + j * 5) % 27) + 1).padStart(2, '0')}`,
  }));
});

const PATIENTS = [
  { id: 'p1',  name: 'Juan Miguel Bautista',                   email: 'juanmi.bautista@gmail.com',     phone: '+63 917 234 5678',  gender: 'M', age: 34, joined: '2024-08-14', lastVisit: '2026-08-22' },
  { id: 'p2',  name: 'Maria Kristina Del Rosario-Fernandez',   email: 'mk.fernandez@outlook.com',      phone: '+63 918 445 1120',  gender: 'F', age: 29, joined: '2025-01-03', lastVisit: '2026-09-01' },
  { id: 'p3',  name: 'Jose Emmanuel Villanueva',               email: 'jose.villanueva@yahoo.com',     phone: '+63 917 998 2345',  gender: 'M', age: 52, joined: '2023-06-19', lastVisit: '2026-07-30' },
  { id: 'p4',  name: 'Sofia Andrea Ramos',                     email: 'sofia.ramos@gmail.com',         phone: '+63 916 210 8877',  gender: 'F', age: 41, joined: '2024-11-22', lastVisit: '2026-08-14' },
  { id: 'p5',  name: 'Carlo Antonio Reyes',                    email: 'carlo.reyes.a@gmail.com',       phone: '+63 917 883 4412',  gender: 'M', age: 24, joined: '2025-03-11', lastVisit: '2026-08-28' },
  { id: 'p6',  name: 'Angelica Nicole de la Peña',             email: 'angelica.delapena@gmail.com',   phone: '+63 928 445 6710',  gender: 'F', age: 38, joined: '2023-02-04', lastVisit: '2026-06-17' },
  { id: 'p7',  name: 'Luis Alfonso Aguilar',                   email: 'luis.aguilar@gmail.com',        phone: '+63 917 003 5678',  gender: 'M', age: 47, joined: '2024-04-30', lastVisit: '2026-09-04' },
  { id: 'p8',  name: 'Diana Beatrice Mangubat-Cruz',           email: 'diana.mc@gmail.com',            phone: '+63 918 662 1109',  gender: 'F', age: 33, joined: '2025-06-08', lastVisit: '2026-08-19' },
  { id: 'p9',  name: 'Rafael Sebastian Ocampo',                email: 'rafael.ocampo@gmail.com',       phone: '+63 917 554 8823',  gender: 'M', age: 61, joined: '2022-09-15', lastVisit: '2026-05-22' },
  { id: 'p10', name: 'Isabel Corazon Salvador',                email: '',                              phone: '+63 918 111 2345',  gender: 'F', age: 28, joined: '2026-02-14', lastVisit: null },
  { id: 'p11', name: 'Miguel Ignacio Torres-Sy',               email: 'miguel.torres@gmail.com',       phone: '+63 917 445 2298',  gender: 'M', age: 45, joined: '2024-07-01', lastVisit: '2026-08-30' },
  { id: 'p12', name: 'Katrina Marie Aquino',                   email: 'katrina.aquino@gmail.com',      phone: '+63 928 990 1123',  gender: 'F', age: 36, joined: '2025-08-19', lastVisit: '2026-09-03' },
  { id: 'p13', name: 'Emmanuel Joaquin Domingo III',           email: 'em.domingo@gmail.com',          phone: '+63 917 662 4488',  gender: 'M', age: 55, joined: '2023-11-27', lastVisit: '2026-07-11' },
  { id: 'p14', name: 'Regine Bianca Uy',                       email: 'regine.uy@gmail.com',           phone: '+63 918 335 7710',  gender: 'F', age: 22, joined: '2026-01-08', lastVisit: '2026-08-25' },
  { id: 'p15', name: 'Antonio Rafael Mercado',                 email: 'antonio.mercado@gmail.com',     phone: '+63 917 220 9987',  gender: 'M', age: 39, joined: '2024-10-15', lastVisit: '2026-08-08' },
  { id: 'p16', name: 'Camille Alexandra Pascual-Gomez',        email: 'camille.pg@gmail.com',          phone: '+63 918 774 0056',  gender: 'F', age: 31, joined: '2025-05-02', lastVisit: null },
  { id: 'p17', name: 'Vicente Andres Bonifacio',               email: 'vicente.bonifacio@gmail.com',   phone: '+63 917 883 4412',  gender: 'M', age: 66, joined: '2021-03-21', lastVisit: '2026-04-19' },
  { id: 'p18', name: 'Bianca Trinidad Lim',                    email: 'bianca.lim@gmail.com',          phone: '+63 918 001 4478',  gender: 'F', age: 27, joined: '2025-12-10', lastVisit: '2026-08-16' },
  { id: 'p19', name: 'Renato Enrique Kalaw',                   email: 'renato.kalaw@gmail.com',        phone: '+63 917 220 8834',  gender: 'M', age: 43, joined: '2024-02-28', lastVisit: '2026-09-05' },
  { id: 'p20', name: 'Alessandra Mikaela Villanueva-Zaragoza', email: 'alessandra.vz@gmail.com',       phone: '+63 928 445 6712',  gender: 'F', age: 30, joined: '2025-09-14', lastVisit: '2026-08-21' },
  { id: 'p21', name: 'Paolo Cesar Fajardo',                    email: 'paolo.fajardo@gmail.com',       phone: '+63 917 990 3345',  gender: 'M', age: 26, joined: '2026-03-04', lastVisit: null },
  { id: 'p22', name: 'Trinidad Amor Concepcion',               email: 'trinidad.c@gmail.com',          phone: '+63 918 662 8890',  gender: 'F', age: 58, joined: '2022-11-09', lastVisit: '2026-06-30' },
  { id: 'p23', name: 'Marcos Julian Lozano',                   email: 'marcos.lozano@gmail.com',       phone: '+63 917 445 9987',  gender: 'M', age: 37, joined: '2024-06-24', lastVisit: '2026-08-12' },
  { id: 'p24', name: 'Kristine Joy Balagtas',                  email: 'kristine.balagtas@gmail.com',   phone: '+63 928 335 7723',  gender: 'F', age: 34, joined: '2025-02-17', lastVisit: '2026-08-26' },
];

// Dummy portrait photos for the prototype (randomuser.me — same source as the
// doctor portraits). PatientAvatar falls back to the initials circle offline.
PATIENTS.forEach((p, i) => {
  p.photo = `https://randomuser.me/api/portraits/${p.gender === 'F' ? 'women' : 'men'}/${((i + 2) * 3) % 99}.jpg`;
});

// Current logged-in patient (used across patient screens)
const CURRENT_PATIENT = {
  id: 'p1',
  name: 'Juan Miguel Bautista',
  email: 'juanmi.bautista@gmail.com',
  phone: '+63 917 234 5678',
  dob: '1991-04-12',
  gender: 'M',
  address: '18 Sampaguita St., Barangay San Antonio, Quezon City',
  emergencyContact: 'Maria Bautista • +63 918 445 2201',
  bloodType: 'O+',
  allergies: 'Penicillin',
};

const CURRENT_ADMIN = {
  id: 'a1',
  name: 'Dr. Helena Cruz-Ilagan',
  email: 'helena.cruz@medicacare.ph',
  role: 'Administrator',
};

// "Today" appointments — dated relative to the current date (computed at load)
// so the admin dashboard's Today's schedule always has live-looking rows no
// matter when the demo is opened.
function dayOffsetISO(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Appointments — mix of statuses across patients and doctors
// Dates around Sep 2026, plus a handful dated "today" (see dayOffsetISO above)
const APPOINTMENTS = [
  // Patient p1 (current user)
  { id: 'ap1',  patientId: 'p1',  doctorId: 'd1',  date: '2026-09-11', time: '10:30 AM', reason: 'Annual cardiac check-up and ECG review',       status: 'confirmed', createdAt: '2026-09-04' },
  { id: 'ap2',  patientId: 'p1',  doctorId: 'd9',  date: '2026-07-18', time: '2:00 PM',  reason: 'Follow-up on blood pressure medication',        status: 'completed', createdAt: '2026-07-02' },
  { id: 'ap3',  patientId: 'p1',  doctorId: 'd3',  date: '2026-05-22', time: '11:15 AM', reason: 'Skin allergy consultation',                     status: 'completed', createdAt: '2026-05-15' },
  { id: 'ap4',  patientId: 'p1',  doctorId: 'd10', date: '2026-08-30', time: '9:00 AM',  reason: 'Routine wellness exam',                         status: 'cancelled', createdAt: '2026-08-15' },
  { id: 'ap5',  patientId: 'p1',  doctorId: 'd8',  date: '2026-09-24', time: '3:30 PM',  reason: 'Consultation for anxiety and sleep issues',     status: 'pending',   createdAt: '2026-09-06' },

  // Other patients (for Admin table)
  { id: 'ap6',  patientId: 'p2',  doctorId: 'd5',  date: '2026-09-09', time: '9:00 AM',  reason: 'Prenatal check-up, 22 weeks',                   status: 'confirmed', createdAt: '2026-09-01' },
  { id: 'ap7',  patientId: 'p3',  doctorId: 'd6',  date: '2026-09-09', time: '11:00 AM', reason: 'Left knee pain, post-surgery follow-up',        status: 'confirmed', createdAt: '2026-09-01' },
  { id: 'ap8',  patientId: 'p4',  doctorId: 'd13', date: '2026-09-09', time: '1:30 PM',  reason: 'Recurring rash on forearm',                     status: 'pending',   createdAt: '2026-09-05' },
  { id: 'ap9',  patientId: 'p5',  doctorId: 'd2',  date: '2026-09-09', time: '3:00 PM',  reason: 'Pediatric consultation for nephew',             status: 'pending',   createdAt: '2026-09-06' },
  { id: 'ap10', patientId: 'p6',  doctorId: 'd4',  date: '2026-09-10', time: '10:00 AM', reason: 'Chronic migraine assessment',                   status: 'confirmed', createdAt: '2026-09-02' },
  { id: 'ap11', patientId: 'p7',  doctorId: 'd1',  date: '2026-09-10', time: '2:30 PM',  reason: 'Cardiac stress test results discussion',        status: 'confirmed', createdAt: '2026-09-03' },
  { id: 'ap12', patientId: 'p8',  doctorId: 'd7',  date: '2026-09-10', time: '4:00 PM',  reason: 'Chronic sinusitis',                             status: 'pending',   createdAt: '2026-09-05' },
  { id: 'ap13', patientId: 'p9',  doctorId: 'd9',  date: '2026-09-11', time: '8:30 AM',  reason: 'Diabetes management review',                    status: 'confirmed', createdAt: '2026-09-04' },
  { id: 'ap14', patientId: 'p11', doctorId: 'd6',  date: '2026-09-11', time: '1:00 PM',  reason: 'Shoulder rehabilitation follow-up',             status: 'pending',   createdAt: '2026-09-07' },
  { id: 'ap15', patientId: 'p12', doctorId: 'd14', date: '2026-09-08', time: '11:30 AM', reason: 'Post-stroke neuro assessment',                  status: 'completed', createdAt: '2026-09-01' },
  { id: 'ap16', patientId: 'p13', doctorId: 'd8',  date: '2026-09-08', time: '2:00 PM',  reason: 'Therapy session',                               status: 'completed', createdAt: '2026-09-01' },
  { id: 'ap17', patientId: 'p14', doctorId: 'd2',  date: '2026-09-07', time: '10:00 AM', reason: 'Pediatric wellness check',                      status: 'completed', createdAt: '2026-08-30' },
  { id: 'ap18', patientId: 'p15', doctorId: 'd16', date: '2026-09-07', time: '3:00 PM',  reason: 'Fractured wrist follow-up',                     status: 'completed', createdAt: '2026-08-29' },
  { id: 'ap19', patientId: 'p17', doctorId: 'd11', date: '2026-09-06', time: '9:30 AM',  reason: 'Palpitations and shortness of breath',          status: 'cancelled', createdAt: '2026-08-28' },
  { id: 'ap20', patientId: 'p18', doctorId: 'd17', date: '2026-09-12', time: '10:00 AM', reason: 'Tinnitus consultation',                         status: 'pending',   createdAt: '2026-09-07' },
  { id: 'ap21', patientId: 'p19', doctorId: 'd3',  date: '2026-09-12', time: '2:00 PM',  reason: 'Adult acne consultation',                       status: 'confirmed', createdAt: '2026-09-05' },
  { id: 'ap22', patientId: 'p20', doctorId: 'd5',  date: '2026-09-13', time: '11:00 AM', reason: 'Annual OB-GYN check-up',                        status: 'pending',   createdAt: '2026-09-08' },
  { id: 'ap23', patientId: 'p22', doctorId: 'd14', date: '2026-09-13', time: '3:30 PM',  reason: 'Peripheral neuropathy screening',               status: 'confirmed', createdAt: '2026-09-04' },
  { id: 'ap24', patientId: 'p23', doctorId: 'd1',  date: '2026-09-14', time: '9:00 AM',  reason: 'Cardiology second opinion',                     status: 'pending',   createdAt: '2026-09-08' },
  { id: 'ap25', patientId: 'p24', doctorId: 'd18', date: '2026-09-14', time: '2:30 PM',  reason: 'Medication adjustment consultation',            status: 'pending',   createdAt: '2026-09-08' },

  // Today's schedule (admin dashboard + appointments queue)
  { id: 'apT1', patientId: 'p2',  doctorId: 'd13', date: dayOffsetISO(0), time: '9:00 AM',  reason: 'Recurring rash follow-up',                      status: 'completed', createdAt: dayOffsetISO(0) },
  { id: 'apT2', patientId: 'p3',  doctorId: 'd1',  date: dayOffsetISO(0), time: '10:30 AM', reason: 'Blood pressure medication review',              status: 'confirmed', createdAt: dayOffsetISO(-2) },
  { id: 'apT3', patientId: 'p5',  doctorId: 'd2',  date: dayOffsetISO(0), time: '1:30 PM',  reason: 'Pediatric wellness check',                      status: 'completed', createdAt: dayOffsetISO(0) },
  { id: 'apT4', patientId: 'p6',  doctorId: 'd7',  date: dayOffsetISO(0), time: '3:00 PM',  reason: 'Chronic sinusitis re-evaluation',               status: 'confirmed', createdAt: dayOffsetISO(-1) },
  { id: 'apT5', patientId: 'p7',  doctorId: 'd9',  date: dayOffsetISO(0), time: '4:30 PM',  reason: 'Fasting blood sugar results consultation',      status: 'pending',   createdAt: dayOffsetISO(0) },
];

// Availability sample — used on doctor availability screen (per-doctor)
const AVAILABILITY_TEMPLATE = {
  '2026-09-09': { day: 'Wed', slots: [ ['8:30 AM', false], ['9:00 AM', false], ['9:30 AM', true],  ['10:00 AM', true], ['10:30 AM', false], ['11:00 AM', true], ['11:30 AM', true], ['2:00 PM', true], ['2:30 PM', false], ['3:00 PM', true] ] },
  '2026-09-10': { day: 'Thu', slots: [ ['8:30 AM', true],  ['9:00 AM', true],  ['9:30 AM', true],  ['10:00 AM', false], ['10:30 AM', true],  ['11:00 AM', true], ['11:30 AM', true], ['2:00 PM', false], ['2:30 PM', true], ['3:00 PM', true] ] },
  '2026-09-11': { day: 'Fri', slots: [ ['8:30 AM', true],  ['9:00 AM', false], ['9:30 AM', true],  ['10:00 AM', true], ['10:30 AM', true],  ['11:00 AM', false], ['11:30 AM', true], ['2:00 PM', true], ['2:30 PM', true], ['3:00 PM', false] ] },
  '2026-09-12': { day: 'Sat', slots: [ ['9:00 AM', true],  ['9:30 AM', true],  ['10:00 AM', true], ['10:30 AM', true], ['11:00 AM', true],  ['11:30 AM', true] ] },
  '2026-09-14': { day: 'Mon', slots: [ ['8:30 AM', true],  ['9:00 AM', true],  ['9:30 AM', false], ['10:00 AM', true], ['10:30 AM', true],  ['11:00 AM', true], ['11:30 AM', false], ['2:00 PM', true], ['2:30 PM', true], ['3:00 PM', true], ['3:30 PM', true], ['4:00 PM', true] ] },
  '2026-09-15': { day: 'Tue', slots: [ ['9:00 AM', true],  ['10:00 AM', true], ['11:00 AM', true], ['2:00 PM', true],  ['3:00 PM', true],   ['4:00 PM', true] ] },
};

// Demo patient-story submissions — two pending stories so the admin
// "Patient stories" page demonstrates the moderation flow with data. They stay
// pending on purpose: approved stories display on the public website as
// patient stories, so that transition happens through the staff's own actions
// during the demo rather than through seeded data.
export const SEED_TESTIMONIALS = [
  {
    id: 'tDemo1', patientId: 'p2', displayName: 'Kristina F.',
    quote: 'Booking my prenatal check-up took less than a minute, and the confirmation was already in the portal when I looked.',
    status: 'pending', createdAt: '2026-09-13',
  },
  {
    id: 'tDemo2', patientId: 'p7', displayName: 'Luis A.',
    quote: 'I used to call three times just to ask for available schedules. Now I can see the open slots myself and pick one.',
    status: 'pending', createdAt: '2026-09-14',
  },
];

// helpers
function findDoctor(id) { return DOCTORS.find(d => d.id === id); }
function findPatient(id) {
  if (id === CURRENT_PATIENT.id) return { ...CURRENT_PATIENT };
  const seeded = PATIENTS.find(p => p.id === id);
  if (seeded) return seeded;
  // Registered accounts (persisted by the prototype auth flow in localStorage)
  try {
    const users = JSON.parse(localStorage.getItem('nmc.users')) || [];
    const u = users.find(x => x.id === id);
    if (u) {
      return { id: u.id, name: u.name, email: u.email, phone: u.phone, gender: '', age: null, joined: u.createdAt || null, lastVisit: null };
    }
  } catch { /* corrupted storage — fall through */ }
  return undefined;
}

// Slot availability = static template minus slots already occupied by an
// active (pending/confirmed) appointment for this doctor+date. Cancelled and
// completed visits free the slot again. excludeApptId keeps an appointment's
// own current slot selectable (used by reschedule).
function isSlotTaken(doctorId, date, time, appointments = [], excludeApptId = null) {
  return appointments.some(a =>
    a.id !== excludeApptId &&
    a.doctorId === doctorId && a.date === date && a.time === time &&
    (a.status === 'pending' || a.status === 'confirmed'));
}
function getSlotsFor(doctorId, date, appointments = [], excludeApptId = null) {
  const base = (AVAILABILITY_TEMPLATE[date] && AVAILABILITY_TEMPLATE[date].slots) || [];
  return base.map(([t, ok]) => [t, ok && !isSlotTaken(doctorId, date, t, appointments, excludeApptId)]);
}

// Trigger a client-side file download without any dependency (shared helper)
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateLong(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function initials(name) {
  if (!name) return '?';
  const parts = name.replace(/^Dr\.\s*/, '').split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0];
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function statusMeta(s) {
  return ({
    pending:   { label: 'Pending',   cls: 'badge-warning' },
    confirmed: { label: 'Confirmed', cls: 'badge-info' },
    completed: { label: 'Completed', cls: 'badge-success' },
    cancelled: { label: 'Cancelled', cls: 'badge-neutral' },
  })[s] || { label: s, cls: 'badge-neutral' };
}
function doctorStatusMeta(s) {
  return ({
    available: { label: 'Available',    cls: 'badge-success' },
    busy:      { label: 'Busy today',   cls: 'badge-warning' },
    'on-leave':{ label: 'On leave',     cls: 'badge-neutral' },
  })[s] || { label: s, cls: 'badge-neutral' };
}

Object.assign(window, {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE, SEED_RATINGS, SEED_TESTIMONIALS,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, downloadFile,
});

export {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, downloadFile,
};

