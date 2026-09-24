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

// Demo weekly availability — the admin Doctors table's Availability column
// (and the weekly-availability chips in the doctor edit modal) need seed data,
// otherwise every row reads "—". Deterministic per-doctor rotation so the
// demo looks stable across reloads; staff can still change it via Edit doctor.
const AVAIL_PATTERNS = [
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  ['Mon', 'Tue', 'Wed', 'Fri'],
  ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ['Mon', 'Wed', 'Thu', 'Sat'],
  ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
  ['Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
];
DOCTORS.forEach((d, i) => {
  d.avail = AVAIL_PATTERNS[i % AVAIL_PATTERNS.length];
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

// Portrait: same dummy source as the patient registry — p1's photo, so the
// logged-in patient's avatar matches their record everywhere in the portal
// (sidebar, Profile header) instead of falling back to the initials circle.
CURRENT_PATIENT.photo = (PATIENTS.find(p => p.id === CURRENT_PATIENT.id) || {}).photo;

const CURRENT_ADMIN = {
  id: 'a1',
  name: 'Dr. Helena Cruz-Ilagan',
  email: 'helena.cruz@medicacare.ph',
  role: 'Administrator',
};

// Portrait: same dummy source as doctors/patients — the admin user card
// (sidebar footer) shows a photo like the patient portal, falling back to the
// initials circle when offline. Index 44 isn't used by any doctor/patient seed.
CURRENT_ADMIN.photo = 'https://randomuser.me/api/portraits/women/44.jpg';
// Demo doctor account — doctors have their own portal login (third prototype
// role). d1 = Dr. Maria Elena Villanueva-Santos: she sees only her own
// schedule and writes her own visit notes, which are attributed to her.
// Portal access is admin-issued: the StoreProvider seeds this account into
// store.users (role 'doctor'), DoctorLogin validates against that list, and
// staff grant/reset/revoke access per doctor from the Admin console's
// Doctors page — so doctors added later get their own credentials too.
const DOCTOR_CREDENTIALS = { email: 'doctor@medicacare.ph', password: 'doctor123', doctorId: 'd1' };

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
  { id: 'ap2',  patientId: 'p1',  doctorId: 'd9',  date: '2026-07-18', time: '2:00 PM',  reason: 'Follow-up on blood pressure medication',        status: 'completed', notes: 'Blood pressure 118/76 on current medication. Continue lifestyle changes; repeat CBC in 6 months.', createdAt: '2026-07-02' },
  { id: 'ap3',  patientId: 'p1',  doctorId: 'd3',  date: '2026-05-22', time: '11:15 AM', reason: 'Skin allergy consultation',                     status: 'completed', notes: 'Allergic contact dermatitis. Prescribed topical steroid; avoid suspected irritant. Follow up if the rash persists after 2 weeks.', createdAt: '2026-05-15' },
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
  { id: 'ap15', patientId: 'p12', doctorId: 'd14', date: '2026-09-08', time: '11:30 AM', reason: 'Post-stroke neuro assessment',                  status: 'completed', notes: 'Stable neuro exam. Continue current medication and physical therapy; repeat imaging in 3 months.', createdAt: '2026-09-01' },
  { id: 'ap16', patientId: 'p13', doctorId: 'd8',  date: '2026-09-08', time: '2:00 PM',  reason: 'Therapy session',                               status: 'completed', notes: 'Therapy session completed. Patient responding well to the current plan; next session to be scheduled.', createdAt: '2026-09-01' },
  { id: 'ap17', patientId: 'p14', doctorId: 'd2',  date: '2026-09-07', time: '10:00 AM', reason: 'Pediatric wellness check',                      status: 'completed', notes: 'Growth on track, vaccinations up to date. Advised routine follow-up next year.', createdAt: '2026-08-30' },
  { id: 'ap18', patientId: 'p15', doctorId: 'd16', date: '2026-09-07', time: '3:00 PM',  reason: 'Fractured wrist follow-up',                     status: 'completed', notes: 'Fracture healed well. Cast removed; referred to physical therapy for grip strengthening.', createdAt: '2026-08-29' },
  { id: 'ap19', patientId: 'p17', doctorId: 'd11', date: '2026-09-06', time: '9:30 AM',  reason: 'Palpitations and shortness of breath',          status: 'cancelled', createdAt: '2026-08-28' },
  { id: 'ap20', patientId: 'p18', doctorId: 'd17', date: '2026-09-12', time: '10:00 AM', reason: 'Tinnitus consultation',                         status: 'pending',   createdAt: '2026-09-07' },
  { id: 'ap21', patientId: 'p19', doctorId: 'd3',  date: '2026-09-12', time: '2:00 PM',  reason: 'Adult acne consultation',                       status: 'confirmed', createdAt: '2026-09-05' },
  { id: 'ap22', patientId: 'p20', doctorId: 'd5',  date: '2026-09-13', time: '11:00 AM', reason: 'Annual OB-GYN check-up',                        status: 'pending',   createdAt: '2026-09-08' },
  { id: 'ap23', patientId: 'p22', doctorId: 'd14', date: '2026-09-13', time: '3:30 PM',  reason: 'Peripheral neuropathy screening',               status: 'confirmed', createdAt: '2026-09-04' },
  { id: 'ap24', patientId: 'p23', doctorId: 'd1',  date: '2026-09-14', time: '9:00 AM',  reason: 'Cardiology second opinion',                     status: 'pending',   createdAt: '2026-09-08' },
  { id: 'ap25', patientId: 'p24', doctorId: 'd18', date: '2026-09-14', time: '2:30 PM',  reason: 'Medication adjustment consultation',            status: 'pending',   createdAt: '2026-09-08' },

  // Today's schedule (admin dashboard + appointments queue)
  { id: 'apT1', patientId: 'p2',  doctorId: 'd13', date: dayOffsetISO(0), time: '9:00 AM',  reason: 'Recurring rash follow-up',                      status: 'completed', notes: 'Rash improving on current treatment. Continue antihistamine; return if it recurs.', createdAt: dayOffsetISO(0) },
  { id: 'apT2', patientId: 'p3',  doctorId: 'd1',  date: dayOffsetISO(0), time: '10:30 AM', reason: 'Blood pressure medication review',              status: 'confirmed', createdAt: dayOffsetISO(-2) },
  { id: 'apT3', patientId: 'p5',  doctorId: 'd2',  date: dayOffsetISO(0), time: '1:30 PM',  reason: 'Pediatric wellness check',                      status: 'completed', notes: 'Well-child visit. No acute findings; immunizations current.', createdAt: dayOffsetISO(0) },
  { id: 'apT4', patientId: 'p6',  doctorId: 'd7',  date: dayOffsetISO(0), time: '3:00 PM',  reason: 'Chronic sinusitis re-evaluation',               status: 'confirmed', createdAt: dayOffsetISO(-1) },
  { id: 'apT5', patientId: 'p7',  doctorId: 'd9',  date: dayOffsetISO(0), time: '4:30 PM',  reason: 'Fasting blood sugar results consultation',      status: 'pending',   createdAt: dayOffsetISO(0) },
  // Every doctor gets demo patients today so the printable daily schedule
  // (Doctors page → printer icon) shows a full clinic day for anyone, not just
  // the five doctors above. Regenerated daily by the apT* migration on load.
  { id: 'apT6',  patientId: 'p1',  doctorId: 'd1',  date: dayOffsetISO(0), time: '8:30 AM',  reason: 'Post-ECG consultation and results review',      status: 'completed', notes: 'ECG within normal limits. Maintain current medication and low-sodium diet.', createdAt: dayOffsetISO(0) },
  { id: 'apT7',  patientId: 'p8',  doctorId: 'd2',  date: dayOffsetISO(0), time: '9:30 AM',  reason: 'Cough and fever follow-up',                     status: 'confirmed', createdAt: dayOffsetISO(-1) },
  { id: 'apT8',  patientId: 'p9',  doctorId: 'd3',  date: dayOffsetISO(0), time: '10:00 AM', reason: 'Eczema flare-up management',                    status: 'confirmed', createdAt: dayOffsetISO(-2) },
  { id: 'apT9',  patientId: 'p10', doctorId: 'd4',  date: dayOffsetISO(0), time: '11:00 AM', reason: 'Migraine management follow-up',                 status: 'confirmed', createdAt: dayOffsetISO(-3) },
  { id: 'apT10', patientId: 'p11', doctorId: 'd4',  date: dayOffsetISO(0), time: '2:00 PM',  reason: 'Numbness and tingling in both hands',           status: 'confirmed', createdAt: dayOffsetISO(-1) },
  { id: 'apT11', patientId: 'p12', doctorId: 'd5',  date: dayOffsetISO(0), time: '9:00 AM',  reason: 'Prenatal check-up (2nd trimester)',             status: 'completed', notes: 'Vitals stable, fetal heart tone normal at 144 bpm. Continue prenatal vitamins.', createdAt: dayOffsetISO(0) },
  { id: 'apT12', patientId: 'p13', doctorId: 'd6',  date: dayOffsetISO(0), time: '11:30 AM', reason: 'Knee pain evaluation',                          status: 'confirmed', createdAt: dayOffsetISO(-2) },
  { id: 'apT13', patientId: 'p14', doctorId: 'd7',  date: dayOffsetISO(0), time: '10:30 AM', reason: 'Recurrent ear infection consultation',          status: 'confirmed', createdAt: dayOffsetISO(-1) },
  { id: 'apT14', patientId: 'p15', doctorId: 'd8',  date: dayOffsetISO(0), time: '3:30 PM',  reason: 'Scheduled therapy session',                     status: 'confirmed', createdAt: dayOffsetISO(0) },
  { id: 'apT15', patientId: 'p16', doctorId: 'd9',  date: dayOffsetISO(0), time: '9:30 AM',  reason: 'Diabetes management follow-up',                 status: 'completed', notes: 'HbA1c improved to 6.8%. Continue metformin; diet counseling reiterated.', createdAt: dayOffsetISO(0) },
  { id: 'apT16', patientId: 'p17', doctorId: 'd10', date: dayOffsetISO(0), time: '8:30 AM',  reason: 'General health consultation',                   status: 'pending',   createdAt: dayOffsetISO(0) },
  { id: 'apT17', patientId: 'p18', doctorId: 'd11', date: dayOffsetISO(0), time: '1:00 PM',  reason: 'Chest pain clearance for surgery',              status: 'confirmed', createdAt: dayOffsetISO(-2) },
  { id: 'apT18', patientId: 'p19', doctorId: 'd12', date: dayOffsetISO(0), time: '2:30 PM',  reason: 'Child immunization (MMR booster)',              status: 'pending',   createdAt: dayOffsetISO(0) },
  { id: 'apT19', patientId: 'p20', doctorId: 'd13', date: dayOffsetISO(0), time: '1:00 PM',  reason: 'Acne treatment progress check',                 status: 'pending',   createdAt: dayOffsetISO(0) },
  { id: 'apT20', patientId: 'p21', doctorId: 'd14', date: dayOffsetISO(0), time: '9:30 AM',  reason: 'Seizure medication review',                     status: 'confirmed', createdAt: dayOffsetISO(-1) },
  { id: 'apT21', patientId: 'p22', doctorId: 'd15', date: dayOffsetISO(0), time: '10:30 AM', reason: 'Contraception counseling',                      status: 'confirmed', createdAt: dayOffsetISO(-1) },
  { id: 'apT22', patientId: 'p23', doctorId: 'd16', date: dayOffsetISO(0), time: '4:00 PM',  reason: 'Lower back pain follow-up',                     status: 'confirmed', createdAt: dayOffsetISO(-3) },
  { id: 'apT23', patientId: 'p24', doctorId: 'd17', date: dayOffsetISO(0), time: '9:00 AM',  reason: 'Dizziness and ear pressure evaluation',         status: 'pending',   createdAt: dayOffsetISO(0) },
  { id: 'apT24', patientId: 'p4',  doctorId: 'd18', date: dayOffsetISO(0), time: '10:00 AM', reason: 'Anxiety medication adjustment',                 status: 'confirmed', createdAt: dayOffsetISO(-2) },
];

// Availability — ROLLING template computed from "today" so the booking flow
// never goes stale (the old fixed Sep 2026 dates would eventually leave
// patients with no bookable date at all). Generates the next 8 clinic days
// (Sundays skipped — the clinic is closed), weekday/Saturday slot grids, and
// a deterministic booked-slot mix for variety. Real appointments still block
// slots at runtime via isSlotTaken.
const AVAILABILITY_TEMPLATE = (() => {
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const base = [
    ['8:30 AM'], ['9:00 AM'], ['9:30 AM'], ['10:00 AM'], ['10:30 AM'],
    ['11:00 AM'], ['11:30 AM'], ['2:00 PM'], ['2:30 PM'], ['3:00 PM'], ['4:00 PM'],
  ];
  const sat = base.slice(0, 6);
  const tpl = {};
  const d = new Date();
  let added = 0;
  while (added < 8) {
    const day = d.getDay();
    if (day !== 0) {
      const iso = toISO(d);
      const slots = (day === 6 ? sat : base).map(([t], i) => [t, (d.getDate() + i) % 4 !== 0]);
      tpl[iso] = { day: d.toLocaleDateString('en-US', { weekday: 'short' }), slots };
      added++;
    }
    d.setDate(d.getDate() + 1);
  }
  return tpl;
})();

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
  // Approved demo story — gives the admin "Approved & shown publicly" section
  // demo data from day one; per the moderation rule, approved stories also
  // surface on the public website's What patients say carousel
  {
    id: 'tDemo3', patientId: 'p5', displayName: 'Carlo R.',
    quote: 'Booked my annual check-up while commuting and the confirmation was already waiting when I got to the office.',
    status: 'approved', createdAt: '2026-09-10', reviewedAt: '2026-09-11',
  },
];

// Demo activity log — fictional staff/doctor/portal actions so the admin
// Activity page opens with a lived-in audit trail (timestamps are minutes
// before "now" so the demo always reads fresh). Real actions prepend to
// this list at runtime via store.pushActivity.
function minutesAgo(m) { return Date.now() - m * 60 * 1000; }
export const SEED_ACTIVITY = [
  { id: 'actDemo1', actor: 'Dr. Maria Elena Villanueva-Santos', action: 'Completed visit', detail: 'Juan Miguel Bautista', at: minutesAgo(9) },
  { id: 'actDemo2', actor: 'Dr. Helena Cruz-Ilagan', action: 'Status update', detail: 'Ref AP8 → Confirmed', at: minutesAgo(26) },
  { id: 'actDemo3', actor: 'Kristine Joy Balagtas', action: 'Booked appointment', detail: 'Dr. Camila Reyes-Tan · today at 9:00 AM', at: minutesAgo(47) },
  { id: 'actDemo4', actor: 'Dr. Emmanuel de la Cruz', action: 'Marked no-show', detail: 'Angelica Nicole de la Peña', at: minutesAgo(63) },
  { id: 'actDemo5', actor: 'Dr. Helena Cruz-Ilagan', action: 'Story approved', detail: '"Kristina F."', at: minutesAgo(88) },
  { id: 'actDemo6', actor: 'Dr. Katrina Salvador-Ramos', action: 'Amended visit notes', detail: 'Sofia Andrea Ramos', at: minutesAgo(121) },
  { id: 'actDemo7', actor: 'Dr. Helena Cruz-Ilagan', action: 'Created appointment', detail: 'Marcos Julian Lozano with Dr. Maria Elena Villanueva-Santos', at: minutesAgo(154) },
  { id: 'actDemo8', actor: 'Dr. Helena Cruz-Ilagan', action: 'Updated appointment', detail: 'Ref AP23 → rescheduled to a later slot', at: minutesAgo(206) },
];

// Demo lab results — fictional outpatient lab work for the demo patient (p1)
// so the Medical Records page's "Lab results" section has realistic data from
// day one. Registered accounts start with an empty history. Values are clearly
// fictional and flagged in the UI as demo data.
export const SEED_LABS = [
  {
    id: 'lab1', patientId: 'p1', date: '2026-07-16',
    name: 'Complete Blood Count (CBC)', category: 'Hematology', status: 'Final',
    results: [
      { item: 'Hemoglobin', value: '14.2', unit: 'g/dL', range: '13.0–17.0', flag: '' },
      { item: 'White blood cells', value: '7.1', unit: '10⁹/L', range: '4.5–11.0', flag: '' },
      { item: 'Platelets', value: '245', unit: '10⁹/L', range: '150–400', flag: '' },
    ],
  },
  {
    id: 'lab2', patientId: 'p1', date: '2026-07-16',
    name: 'Fasting Blood Sugar', category: 'Clinical Chemistry', status: 'Final',
    results: [
      { item: 'Glucose, fasting', value: '96', unit: 'mg/dL', range: '70–99', flag: '' },
    ],
  },
  {
    id: 'lab3', patientId: 'p1', date: '2026-05-20',
    name: 'Lipid Panel', category: 'Clinical Chemistry', status: 'Final',
    results: [
      { item: 'Total cholesterol', value: '198', unit: 'mg/dL', range: '<200', flag: '' },
      { item: 'LDL cholesterol', value: '141', unit: 'mg/dL', range: '<100', flag: 'high' },
      { item: 'HDL cholesterol', value: '48', unit: 'mg/dL', range: '>40', flag: '' },
      { item: 'Triglycerides', value: '132', unit: 'mg/dL', range: '<150', flag: '' },
    ],
  },
];

// Demo medications — fictional prescriptions tied to the demo patient's
// completed visits (the visit notes even reference them). Surfaced on the
// Medical Records page's Medications section.
export const SEED_MEDICATIONS = [
  {
    id: 'med1', patientId: 'p1', name: 'Amlodipine', dose: '5 mg', form: 'Tablet',
    frequency: 'Once daily, morning', prescriberId: 'd9', startDate: '2026-07-18',
    status: 'Active', instructions: 'Take with or without food. Monitor blood pressure weekly.',
  },
  {
    id: 'med2', patientId: 'p1', name: 'Hydrocortisone cream 1%', dose: 'Apply thinly', form: 'Topical cream',
    frequency: 'Twice daily', prescriberId: 'd3', startDate: '2026-05-22',
    status: 'Completed', instructions: 'Apply to the affected area for up to 2 weeks.',
  },
  {
    id: 'med3', patientId: 'p1', name: 'Aspirin (low-dose)', dose: '81 mg', form: 'Tablet',
    frequency: 'Once daily', prescriberId: 'd1', startDate: '2026-09-11',
    status: 'Active', instructions: 'Take after meals.',
  },
];

// Demo family members — proxy booking: the patient can book appointments on
// behalf of these people (booking form → "Who is this visit for?"). Managed
// on the Profile page; persisted like the rest of the demo data.
export const SEED_FAMILY = [
  { id: 'fam1', name: 'Maria Bautista', relation: 'Spouse', age: 33 },
  { id: 'fam2', name: 'Sofia Bautista', relation: 'Daughter', age: 6 },
];

// Demo support tickets — patient portal "Message the clinic" submissions that
// land on the admin console's Patient messages page. tkt1/tkt2 belong to other
// patients so the admin list shows variety; tkt3/tkt4 belong to the demo
// patient (p1) so the PORTAL side of the reply loop is demo-able — logging in
// as the demo patient shows an awaiting-reply ticket and one already answered
// by staff (the green "Staff reply:" box on Help & support).
export const SEED_TICKETS = [
  {
    id: 'tkt1', patientId: 'p14', name: 'Regine Bianca Uy',
    subject: 'HMO coverage question',
    message: 'Hi! I just want to confirm if my HMO covers annual physical exams, or if I have to pay out of pocket first. Thank you!',
    status: 'open', createdAt: '2026-09-15', reply: '', repliedAt: null,
  },
  {
    id: 'tkt2', patientId: 'p2', name: 'Maria Kristina Del Rosario-Fernandez',
    subject: 'Rescheduling my prenatal check-up',
    message: 'Good morning, may I move my prenatal visit to a Saturday slot instead? Weekdays are difficult for me now.',
    status: 'resolved', createdAt: '2026-09-12',
    reply: 'Of course! Your prenatal check-up has been moved to the next available Saturday slot. See you then!',
    repliedAt: '2026-09-12',
  },
  {
    id: 'tkt3', patientId: 'p1', name: CURRENT_PATIENT.name,
    subject: 'Clinic hours this coming holiday',
    message: 'Hello! Will the outpatient department be open on the upcoming holiday? I want to book a follow-up visit that week.',
    status: 'open', createdAt: '2026-09-18', reply: '', repliedAt: null,
  },
  {
    id: 'tkt4', patientId: 'p1', name: CURRENT_PATIENT.name,
    subject: 'Copy of my ECG results',
    message: 'Hi, I had an ECG during my last visit. May I request a copy of the results for my HMO filing?',
    status: 'resolved', createdAt: '2026-09-10',
    reply: 'Hi Juan! Your ECG results are ready — you can view them under Medical records in your portal, or pick up a printed copy at the Records section, Ground Floor.',
    repliedAt: '2026-09-11',
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

// Numeric minutes for 'h:mm AM/PM' slot strings — plain string comparison
// sorts "10:30 AM" before "8:30 AM", which scrambles chronological order
function timeValue(t) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(t || ''));
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

// Whether the date falls on the doctor's admin-managed weekly clinic days.
// Doctors with no availability set keep the generic template (every clinic
// day bookable) so newly added doctors stay bookable out of the box.
function isClinicDay(doctorId, date) {
  const doc = findDoctor(doctorId);
  if (!doc || !Array.isArray(doc.avail) || !doc.avail.length) return true;
  const weekday = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  return doc.avail.includes(weekday);
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
  // Dates outside the doctor's clinic days offer no bookable slots — the
  // weekly availability chips on the admin Doctors page are enforced here
  if (!isClinicDay(doctorId, date)) return [];
  const base = (AVAILABILITY_TEMPLATE[date] && AVAILABILITY_TEMPLATE[date].slots) || [];
  return base.map(([t, ok]) => [t, ok && !isSlotTaken(doctorId, date, t, appointments, excludeApptId)]);
}

// Slot-interval preference (admin Settings): '60' trims the 30-minute grid
// down to :00 slots; '15' and '30' show the full grid (base granularity is 30)
function slotFitsInterval(time, interval) {
  if (String(interval) !== '60') return true;
  return /:00 (AM|PM)$/.test(String(time));
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

// Compact weekly-availability display for narrow table columns: consecutive
// days collapse into ranges — ['Mon','Tue','Wed','Thu','Fri'] → "Mon–Fri",
// ['Mon','Tue','Wed','Fri'] → "Mon–Wed, Fri". Keeps the Doctors table's
// Availability column on one line instead of a long comma list.
function formatDayRange(days) {
  if (!Array.isArray(days) || !days.length) return '—';
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const parts = [];
  let start = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const consecutive = i < sorted.length && order.indexOf(sorted[i]) === order.indexOf(sorted[i - 1]) + 1;
    if (!consecutive) {
      parts.push(start === i - 1 ? sorted[start] : `${sorted[start]}–${sorted[i - 1]}`);
      start = i;
    }
  }
  return parts.join(', ');
}
function statusMeta(s) {
  return ({
    pending:   { label: 'Pending',   cls: 'badge-warning' },
    confirmed: { label: 'Confirmed', cls: 'badge-info' },
    completed: { label: 'Completed', cls: 'badge-success' },
    cancelled: { label: 'Cancelled', cls: 'badge-neutral' },
    // Doctor-side action: the patient did not arrive (frees the slot like a
    // cancellation — see isSlotTaken — but is reported, not just dropped)
    'no-show': { label: 'No-show', cls: 'badge-error' },
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
  APPOINTMENTS, AVAILABILITY_TEMPLATE, SEED_RATINGS, SEED_TESTIMONIALS, SEED_ACTIVITY,
  SEED_LABS, SEED_MEDICATIONS, SEED_FAMILY, SEED_TICKETS, DOCTOR_CREDENTIALS,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, formatDayRange, isClinicDay, timeValue,
});

export {
  HOSPITAL, SPECIALTIES, DOCTORS, PATIENTS, CURRENT_PATIENT, CURRENT_ADMIN, DOCTOR_CREDENTIALS,
  APPOINTMENTS, AVAILABILITY_TEMPLATE,
  findDoctor, findPatient, formatDate, formatDateLong, initials, statusMeta, doctorStatusMeta,
  isSlotTaken, getSlotsFor, slotFitsInterval, downloadFile, formatDayRange, isClinicDay, timeValue,
};

