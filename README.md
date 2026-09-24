# 🏥 MedicaCare — Hospital Appointment System

IPT2 Final Project — Healthcare Management Website (Option 2: Hospital Appointment System).

A healthcare management web application for a fictional hospital where **patients** can register, log in, browse doctors, check availability, book appointments, and track their appointment status/history — and **admins** can manage patients, doctors, and the appointment queue (full CRUD).

> ⚠️ Lahat ng patients, doctors, accounts, at appointments dito ay **fictional/dummy data** — walang totoong patient information.

## Technologies Used

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite 5 (JavaScript, JSX) |
| Styling | Plain CSS (design tokens, `IBM Plex Sans` / `IBM Plex Mono` via Google Fonts, Lucide icons) |
| Routing | Hash-based router (`#/patient/dashboard`, `#/admin/...`) |
| State | React Context store — appointments & role persist sa `localStorage` |

> Design reference: ang `design_handoff_hospital_appointment_system/` folder ay naglalaman ng handoff README at ng orihinal na prototype files. Ang `frontend/` ang running application na port ng mga design na iyon into a real Vite + React project.

## Installation / Setup Instructions

Requirements: **Node.js 18+** (tested on Node 24).

```bash
cd frontend
npm install
npm run dev        # dev server → http://localhost:5173
```

Production build:

```bash
npm run build      # outputs to frontend/dist
npm run preview    # serves the production build → http://localhost:4173
```

Optional smoke test (renders every route to catch runtime errors):

```bash
npm i --no-save jsdom
node scripts/smoke.mjs
```

Optional browser click-through (drives the built app in a headless Chrome/Edge
via the DevTools Protocol — zero npm dependencies, needs a local Chrome or Edge
and `BROWSER_PATH` env var if Chrome is not at the default path). Runs the
patient portal end-to-end at desktop + mobile widths: real login, every
screen's controls (filters, modals, forms, reschedule/cancel, downloads,
logout), console-error and horizontal-overflow checks:

```bash
npm run build
npx vite preview --port 4179 --strictPort   # terminal 1
node scripts/clickthrough.mjs               # terminal 2
```

## Demo Accounts

| Role | Login page | Email | Password |
| --- | --- | --- | --- |
| Patient | `#/login` (public) | `patient@medicacare.ph` | `patient123` |
| Admin / Staff | `#/admin/login` (staff console, **walang link sa public site**) | `admin@medicacare.ph` | `admin123` |

Kahit anong hindi naka-register na credentials ay magti-trigger ng error state ("No account found" o maling password). Ang mga bagong account mula sa Register page ay naka-save sa `localStorage` (`nmc.users`) at pwede nang i-log in.

## Screens / User Flow

**Public:** Landing → Register (inline validation + loading, duplicate-email check, naka-save ang account sa `localStorage`) → Login (patient-only, validates laban sa registered accounts + patient demo account, wrong-credential error state). Walang admin entry sa public login — ang staff console ay may hiwalay, hindi naka-link na login page.

**Admin / Staff console:** `#/admin/login` — hiwalay na login page ("Staff sign in — restricted access") na walang link mula sa public site (traditional staff-console pattern: ang URL ay ipinapasa nang internal lang). May sariling demo account shortcut para madaling i-demo. Sa totoong deployment, dito dapat idadagdag ang server-side verification, 2FA, at audit logging.

**Route guards (client-side):** ang `#/patient/*` ay nangangailangan ng patient session (`nmc.patientSession` sa `localStorage`) at ang `#/admin/*` ay nangangailangan ng admin session (`nmc.adminSession`) — kapag wala, automatic na reroute sa kaukulang login page. Ang logout (sidebar) ay nagse-clear ng session at bumabalik sa tamang login page.

**Patient portal:** Dashboard (next appointment banner, quick actions, stats) → Doctor Listing (search + filters + status badges) → Doctor Availability (date chips + time-slot chips, live availability — booked slots disabled, nag-a-update agad pagkatapos mag-book o mag-cancel) → Book Appointment (validation, loading, live summary, duplicate-booking guard) → Booking Confirmation ("Appointment successfully booked" + reference number) → Appointment Status (progress timeline) → Appointment History (searchable table, filter chips, pagination) → Appointment Details (receipt download + .ics calendar download + Reschedule Modal na may bagong date + available slots) → Cancel Confirmation Modal → Profile (edit info + change password + change photo, naka-persist).

**Admin console:** Dashboard (today's appointments, pending, totals, weekly chart, today's schedule, CSV export) → Patients Management (searchable table, add/edit modal with validation, delete confirmation, CSV export) → Doctors Management (CRUD + weekly availability editor, CSV export) → Appointments Management (status dropdown filter, inline status select Pending → Confirmed → Completed/Cancelled, delete confirmation, CSV export) → Reports (computed stats + specialty breakdown, CSV export).

**Mobile:** `#/mobile` — mobile reference screens (Dashboard, Doctor Listing, Booking, Appointment History) sa loob ng phone frame.

Logout → balik sa Landing; ang flow ay loopable (Login → Dashboard → Book → … → Logout → Login).

## Project Structure

```
Healthcare Management Website/
├── design_handoff_hospital_appointment_system/   # design handoff (reference lang, huwag i-deploy)
│   ├── README.md
│   └── prototype/                                # orihinal na prototype files
├── frontend/                                     # ← running application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── scripts/smoke.mjs                         # route smoke test (dev-only)
│   ├── scripts/clickthrough.mjs                  # headless-browser click-through (dev-only)
│   └── src/
│       ├── main.jsx                              # entry point
│       ├── App.jsx                               # router
│       ├── styles.css                            # design tokens + component styles
│       ├── assets/                               # images (hero slides, auth backgrounds, logo)
│       ├── shared/                               # shared code ng lahat ng modules
│       │   ├── data.js                           # fictional data + formatters
│       │   ├── components.jsx                    # shared UI (AppShell, Modal, fields, badges, toasts…)
│       │   ├── ios_frame.jsx                     # phone frame para sa /mobile showcase
│       │   └── reactbits/                        # animation components (Aurora, SplitText, …)
│       ├── public/                               # public marketing pages
│       │   ├── Landing.jsx, Login.jsx, Register.jsx, ServicesPage.jsx, …  # isang page kada file
│       │   ├── content.js                        # static content (CARE_GUIDE, FAQs, stories)
│       │   ├── screens-public.jsx                # barrel — binubuo ang lahat ng public pages
│       │   └── screens-mobile.jsx                # mobile reference screens
│       ├── patient/                              # patient portal
│       │   ├── PatientDashboard.jsx, DoctorListing.jsx, BookAppointment.jsx, …  # isang screen kada file
│       │   ├── helpers.js                        # ICS/receipt/records builders, atbp.
│       │   └── screens-patient.jsx               # barrel
│       ├── admin/                                # admin console
│       │   ├── AdminDashboard.jsx, PatientsMgmt.jsx, DoctorsMgmt.jsx, …  # isang screen kada file
│       │   ├── AppointmentModals.jsx, helpers.js
│       │   └── screens-admin.jsx                 # barrel
│       └── doctor/                               # doctor portal
│           ├── DoctorDashboard.jsx, DoctorPatients.jsx, DoctorWeekView.jsx, …  # isang screen kada file
│           ├── WeekGrid.jsx, helpers.js
│           └── screens-doctor.jsx                # barrel
├── PROJECT_INSTRUCTIONS.md
├── DEVELOPMENT_PLAN.md
└── agents.md
```

## Limitations / Next Steps

- Ang frontend ay kasalukuyang gumagamit ng `localStorage` para sa appointments, role, registered accounts (`nmc.users`), logged-in patient identity (`nmc.currentPatient`), at auth sessions (`nmc.patientSession` / `nmc.adminSession`). Kasunod na hakbang (base sa `DEVELOPMENT_PLAN.md`): i-connect sa backend REST API (`/api/auth/*`, `/api/patients`, `/api/doctors`, `/api/appointments`) at sa database, at palitan ang hash routing ng server-side routing kung kinakailangan. Ang mga password ay plain-text sa prototype lang — sa totoong backend, i-hash ang mga ito.
- Ang route guards (patient/admin sessions) ay **client-side lang** — para sa prototype at demo purposes. Ang tunay na seguridad (server-side role checks, hashed passwords, session tokens, rate limiting, 2FA sa staff console) ay dapat i-implement sa backend. Ang paghihiwalay ng admin login sa `#/admin/login` ay UX/attack-surface hygiene lang, hindi ito security feature.
- Wala pang `.env` / environment variables dahil wala pang backend/database na nakakonekta.
- Ang mga fonts at icons ay galing sa Google Fonts / unpkg CDN — para sa fully offline deployment, i-vendor ang mga ito.
