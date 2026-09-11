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

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Patient | `patient@medicacare.ph` | `patient123` |
| Admin | `admin@medicacare.ph` | `admin123` |

Kahit anong hindi naka-register na credentials ay magti-trigger ng error state ("No account found" o maling password). Ang mga bagong account mula sa Register page ay naka-save sa `localStorage` (`nmc.users`) at pwede nang i-log in.

## Screens / User Flow

**Public:** Landing → Register (inline validation + loading, duplicate-email check, naka-save ang account sa `localStorage`) → Login (validates laban sa registered accounts + demo accounts, wrong-credential error state, role-based redirect).

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
│   └── src/
│       ├── main.jsx                              # entry point
│       ├── App.jsx                               # router
│       ├── styles.css                            # design tokens + component styles
│       ├── data.js                               # fictional data + formatters
│       ├── components.jsx                        # shared UI (AppShell, Modal, fields, badges, toasts…)
│       ├── screens-public.jsx                    # Landing, Register, Login
│       ├── screens-patient.jsx                   # patient portal screens
│       ├── screens-admin.jsx                     # admin console screens
│       ├── screens-mobile.jsx                    # mobile reference screens
│       └── ios_frame.jsx                         # phone frame para sa /mobile showcase
├── PROJECT_INSTRUCTIONS.md
├── DEVELOPMENT_PLAN.md
└── agents.md
```

## Limitations / Next Steps

- Ang frontend ay kasalukuyang gumagamit ng `localStorage` para sa appointments, role, registered accounts (`nmc.users`), at logged-in patient identity (`nmc.currentPatient`). Kasunod na hakbang (base sa `DEVELOPMENT_PLAN.md`): i-connect sa backend REST API (`/api/auth/*`, `/api/patients`, `/api/doctors`, `/api/appointments`) at sa database, at palitan ang hash routing ng server-side routing kung kinakailangan. Ang mga password ay plain-text sa prototype lang — sa totoong backend, i-hash ang mga ito.
- Wala pang `.env` / environment variables dahil wala pang backend/database na nakakonekta.
- Ang mga fonts at icons ay galing sa Google Fonts / unpkg CDN — para sa fully offline deployment, i-vendor ang mga ito.
