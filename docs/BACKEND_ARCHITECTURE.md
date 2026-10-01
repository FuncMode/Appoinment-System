# Healthcare Management Website — Backend File Architecture (Node.js + Express)

> Status: **Blueprint only** — no code written yet.
> Goal: A **modular, scalable, industry-standard** backend that is **explicitly connected to the Frontend (React + Vite + Tailwind)** and the **Database (Supabase PostgreSQL)**.
> Stack agreed by user: **Node.js + Express** (JavaScript), **Supabase PostgreSQL** (existing DB), **Vercel** deployment.

> **Dependencies installed (2026-09-29):** runtime — `express` (v4, pinaka-wide
> middleware compatibility), `@supabase/supabase-js`, `dotenv`, `zod`,
> `jsonwebtoken`, **`bcryptjs`** (pure-JS bcrypt — walang native build issue sa
> Windows/Vercel; tugma sa ASVS V2.4 bcrypt ≥ cost 10), `express-rate-limit`,
> `helmet` (API8), `morgan`; dev — `nodemon`, `eslint` (flat config sa
> `eslint.config.js`). Scripts: `dev` / `start` / `lint` / `test`
> (`node --test` built-in runner — walang extra test framework).
> **Brevo: walang SDK** — tinatanggihan ang abandoned na `sib-api-v3-sdk`;
> gagamit ng Node 18 built-in `fetch` laban sa Brevo REST API sa `config/brevo.js`
> (mas maliit, walang vulnerable transitive deps). `npm audit --omit=dev` = 0
> vulnerabilities sa install time.
> **Storage: walang bagong dependency** — ang `@supabase/supabase-js` client sa
> `config/db.js` (storage-js bundled na) ang gagamitin sa avatar uploads;
> private `avatars` bucket + backend-signed URLs (TTL 5 min) — buong design:
> `docs/STORAGE_DESIGN.md` · schema playbook: `database/schema.sql` (STORAGE SETUP).

---

## 1. Architecture Pattern: Modular ("Feature-based" / Vertical Slices)

We use **feature modules**, not a single flat layers folder. Each domain feature owns its route → controller → service → repository chain, so files stay cohesive and the app scales without a giant `controllers/` dump.

```
Request → middleware (auth/validation) → routes → controller → service (business logic) → repository → Supabase
```

Layer rules (strict):
- **routes** — define URL paths, attach validation + auth middleware.
- **controller** — HTTP only: parse request, call service, format response. No business logic.
- **service** — business logic (e.g., appointment conflict checking, status transitions). No `req`/`res` here.
- **repository** — the ONLY layer that touches Supabase. Swappable if DB ever changes.
- **validation** — Zod schemas per module, applied via the shared `validate` middleware.


---

## 2. Complete Directory Tree

```
backend/
├── server.js                        # HTTP bootstrap: create app, listen (Vercel-compatible)
├── app.js                           # Express app factory: middleware pipeline, route mounting, error handler
├── package.json                     # Scripts: dev (nodemon), start, lint, test
├── .env.example                     # Placeholder env vars (NEVER commit real .env)
├── .gitignore                       # node_modules, .env, logs
│
├── config/                          # Configuration & external clients
│   ├── env.js                       # Central env loading/validation via dotenv (fail-fast at startup)
│   ├── db.js                        # Supabase client singleton (SUPABASE_URL + service-role key)
│   ├── cors.js                      # CORS allowlist tied to frontend origins (Vercel + localhost:5173)
│   ├── brevo.js                     # Brevo (Sendinblue) email client singleton — API key + verified sender, fail-fast at startup
│   └── logger.js                    # morgan/dev logger setup
│
├── modules/                         # ★ FEATURE MODULES — one folder per business domain
│   ├── auth/                        # ★ 3 login portals = 3 account sources sa schema (walang users table!)
│   │   │                            #   patients (self-register) · admins (staff) · doctor_accounts (admin-issued)
│   │   ├── auth.routes.js           # POST /api/auth/register, /login, /refresh, /logout, /forgot-password
│   │   ├── auth.controller.js       # HTTP layer only: parse req → call service → send response
│   │   ├── auth.service.js          # bcrypt verify/rotate + JWT issue/refresh; role derived from the
│   │   │                            #   account source na tumugma (patient | admin | doctor)
│   │   ├── auth.repository.js       # patients / admins / doctor_accounts / refresh_tokens via Supabase
│   │   ├── auth.validation.js       # Zod schemas: registerSchema, loginSchema, forgotPasswordSchema
│   │   └── auth.middleware.js       # requireAuth (verify JWT), requireRole('patient'|'admin'|'doctor')
│   │
│   ├── patients/                    # Profile + health summary + family members (proxy booking)
│   │   ├── patient.routes.js        # GET/PATCH /api/patients/me · photo_url update · avatar upload
│   │   │                            #   (POST /me/photo, base64 JSON — docs/STORAGE_DESIGN.md) ·
│   │   │                            #   POST /:id/photo (admin) · CRUD ng
│   │   │                            #   /api/patients/me/family-members · admin registry list/create
│   │   ├── patient.controller.js
│   │   ├── patient.service.js       # Health summary assembly (dob-derived age, blood type, allergies)
│   │   ├── patient.repository.js    # patients / patient_family_members
│   │   └── patient.validation.js
│   │
│   ├── doctors/                     # Directory + profiles + weekly availability + portal access
│   │   ├── doctor.routes.js         # GET /api/doctors (+ specialties lookup) · admin CRUD ·
│   │   │                            #   availability PUT · POST /:id/photo (admin avatar upload —
│   │   │                            #   docs/STORAGE_DESIGN.md) · portal access grant/reset/revoke (admin only)
│   │   ├── doctor.controller.js
│   │   ├── doctor.service.js        # Availability normalization; on-leave guards (hidden sa booking);
│   │   │                            #   admin-issued credentials (bcrypt hash bago i-save)
│   │   ├── doctor.repository.js     # doctors / specialties / doctor_weekly_availability / doctor_accounts
│   │   └── doctor.validation.js
│   │
│   ├── appointments/                # ★ CORE: booking lifecycle — patient + admin + doctor views
│   │   ├── appointment.routes.js    # POST /api/appointments (book) · GET /mine (history/details) ·
│   │   │                            #   GET /api/doctors/:id/slots · admin CRUD/status · doctor-scoped
│   │   │                            #   schedule + complete-visit + no-show · reschedule/cancel
│   │   ├── appointment.controller.js
│   │   ├── appointment.service.js   # Slots/conflicts via DB fn fn_available_slots() (p_exclude_appt_id
│   │   │                            #   para sa reschedule); status transitions + auto_confirm_appointments
│   │   │                            #   pref (app_settings); proxy booking (booked_for); medical_records row
│   │   │                            #   kapag complete visit; activity_log writes sa bawat action
│   │   ├── appointment.repository.js
│   │   └── appointment.validation.js
│   │
│   ├── notifications/               # In-app bell (notifications table) + Brevo email — pareho
│   │   │                            #   pinapagana ng app_settings flags (email_admins_on_new_appointment,
│   │   │                            #   remind_patients)
│   │   ├── notification.routes.js   # GET /api/notifications (unread) · PATCH mark-read/mark-all-read
│   │   ├── notification.controller.js
│   │   ├── notification.service.js  # Writes notifications rows on status change + sends email (best-effort)
│   │   └── notification.repository.js
│   │
│   ├── records/                     # Medical Records: consultations + lab results + medications
│   │   ├── record.routes.js         # GET /api/patients/:id/records (patient/admin) · admin encode/delete
│   │   │                            #   labs & meds (Labs & medications modal sa Admin > Patients)
│   │   ├── record.controller.js
│   │   ├── record.service.js        # Consultation record auto-created on "complete visit" (parity ng app)
│   │   ├── record.repository.js     # medical_records / lab_results / medications
│   │   └── record.validation.js
│   │
│   ├── ratings/                     # "Rate your visit" (patient) + Patient feedback page (doctor)
│   │   ├── rating.routes.js         # POST /api/appointments/:id/rating · GET /api/doctors/:id/ratings
│   │   ├── rating.controller.js
│   │   ├── rating.service.js        # One-rating-per-appointment (DB UNIQUE(appointment_id) guard);
│   │   │                            #   averages LAGING may review count (walang invented numbers)
│   │   ├── rating.repository.js     # visit_ratings (+ v_doctor_rating_averages view para sa cards)
│   │   └── rating.validation.js     # stars 1–5 · comment ≤ 300 chars
│   │
│   ├── stories/                     # Patient stories: portal submit → admin moderation → public carousel
│   │   ├── story.routes.js          # POST /api/stories (patient, lalabas as pending) · admin
│   │   │                            #   approve/reject/unpublish/restore · GET public (approved lang)
│   │   ├── story.controller.js
│   │   ├── story.service.js
│   │   ├── story.repository.js      # patient_stories (display_name lang ang publishable)
│   │   └── story.validation.js      # display name ≤ 40 · quote 30–280 (tugma sa DB CHECK)
│   │
│   ├── messages/                    # "Message the clinic" — two-way thread (patient ↔ staff)
│   │   ├── message.routes.js        # POST /api/tickets · POST /api/tickets/:id/follow-up (patient) ·
│   │   │                            #   POST /api/tickets/:id/reply (staff/admin) · GET /mine
│   │   ├── message.controller.js
│   │   ├── message.service.js       # open → resolved kapag nag-reply ang staff; follow-up ay nagbubukas
│   │   │                            #   ulit (balik 'open') — parity ng app loop
│   │   ├── message.repository.js    # support_tickets / support_ticket_messages (sender: patient|staff)
│   │   └── message.validation.js    # subject 1–80 · body 1–500 (tugma sa DB CHECK)
│   │
│   ├── contact/                     # Public Contact page ("Send us a message") — anonymous, walang FK
│   │   ├── contact.routes.js        # POST /api/contact (public) · admin list + mark-handled
│   │   ├── contact.controller.js
│   │   ├── contact.service.js       # Email reply channel; acknowledgment email (best-effort)
│   │   ├── contact.repository.js    # contact_messages
│   │   └── contact.validation.js    # name required · valid email · message 10+ chars (tugma sa app + DB CHECK)
│   │
│   ├── settings/                    # Admin Settings → clinic info + appointment preferences
│   │   ├── setting.routes.js        # GET (public read ng clinic info) / PATCH (admin) clinic +
│   │   │                            #   preferences · binabasa din ng public footer/Contact + booking flow
│   │   ├── setting.controller.js
│   │   ├── setting.service.js       # Clinic info (hours JSONB → Open now/Closed pill) · prefs drive
│   │   │                            #   booking (auto_confirm · slot_interval_minutes · email flags)
│   │   ├── setting.repository.js    # clinic_info / app_settings (singleton rows, id = 1)
│   │   └── setting.validation.js
│   │
│   ├── activity/                    # Admin Activity page (audit trail ng lahat ng roles)
│   │   ├── activity.routes.js       # GET /api/activity (admin only; paginated)
│   │   ├── activity.controller.js
│   │   ├── activity.service.js      # pushActivity(actor, action, detail) — tinatawag ng ibang modules
│   │   └── activity.repository.js   # activity_log (actor = display name, walang FK)
│   │
│   └── reports/                     # Admin Dashboard + Reports page (aggregated read-only stats)
│       ├── report.routes.js         # GET /api/reports/dashboard · /api/reports/summary (date range,
│       │                            #   per-specialty breakdown, busiest doctors — CSV sa frontend)
│       └── report.controller.js     # Computed queries lang — appointments/doctors/medical_records joins
│
├── middleware/                      # App-wide (cross-module) middleware
│   ├── errorHandler.js              # Central error → consistent JSON {success, message, details}
│   ├── notFound.js                  # 404 catch-all for unknown /api routes
│   ├── validate.js                  # Generic (schema) ⇒ req.body/query/params sanitizer
│   ├── rateLimiter.js               # express-rate-limit on /api/auth/* (brute-force protection)
│   └── requestLogger.js             # morgan request logging
│
├── routes/
│   └── index.js                     # API router: mounts every module under its /api/* prefix
│
├── shared/                          # Reusable, framework-agnostic pieces (no Express imports here)
│   ├── constants/
│   │   ├── httpStatus.js            # HTTP codes + standard messages
│   │   └── enums.js                 # LAHAT ng 7 DB enums bilang JS constants — single source of
│   │                                #   truth na tugma sa schema.sql: APPOINTMENT_STATUS ('no-show'
│   │                                #   kasama), DOCTOR_STATUS ('on-leave', hyphen), GENDER,
│   │                                #   TESTIMONIAL_STATUS, LAB_RESULT_STATUS, MEDICATION_STATUS,
│   │                                #   SUPPORT_TICKET_STATUS · + ROLES (patient | admin | doctor)
│   ├── utils/
│   │   ├── ApiError.js              # class ApiError extends Error { status, code }
│   │   ├── apiResponse.js           # ok(), created(), fail() response-shape helpers
│   │   ├── asyncHandler.js          # Wraps async controllers so errors reach errorHandler
│   │   └── pagination.js            # page/limit parsing + meta builder
│   ├── services/
│   │   └── email.service.js          # Thin wrapper over Brevo API — sendEmail({to, subject, html}); used by notifications & auth
│   ├── templates/
│   │   └── emails/
│   │       ├── appointmentConfirmation.js   # HTML email template: booking received/confirmed
│   │       ├── appointmentReminder.js       # HTML email template: upcoming appointment (remind_patients pref)
│   │       ├── appointmentStatusUpdate.js   # HTML email template: rescheduled / cancelled / completed / no-show
│   │       └── contactAcknowledgment.js     # HTML email template: Contact form acknowledgment (best-effort)
│   └── validators/
│       └── common.schema.js         # Shared Zod primitives (uuid, phone, email, date-time)
│
├── jobs/
│   └── appointmentReminder.job.js   # Scheduled job → upcoming appointments → trigger notifications
│
└── tests/                           # Mirrors modules/ structure
    ├── setup.js                     # Test env bootstrap (isolated Supabase config)
    ├── auth.test.js                 # 3 account sources (patient/admin/doctor) + JWT rotation
    ├── appointments.test.js         # Slots/conflicts/status transitions/auto-confirm/proxy booking
    ├── patients.test.js             # Profile + family members
    ├── doctors.test.js              # Availability + portal access grant/reset/revoke
    ├── records.test.js              # Records assembly + labs/meds encoding
    ├── ratings.test.js              # One-rating-per-appointment guard
    ├── stories.test.js              # Moderation flow (pending → approved → public)
    ├── messages.test.js             # Thread loop (open → resolved → reopen)
    ├── contact.test.js
    ├── settings.test.js             # Singleton rows + pref-driven booking behavior
    └── notifications.test.js        # Mocks Brevo — never sends real emails in tests
```

---

## 3. Environment Variables — BOTH Frontend and Backend need their own `.env`

Yes — may kanya-kuyang `.env` ang frontend at backend. Both have a committed `.env.example` (placeholders only); the real `.env` stays in `.gitignore`.

### Frontend — `frontend/.env.example`
```
# All frontend env vars MUST start with VITE_ to be exposed by Vite
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_ENV=development
```
- Consumed in code as `import.meta.env.VITE_API_BASE_URL`.
- In production (Vercel), set the same vars in the Vercel project settings pointing to the deployed backend URL.
- Never put secrets here — anything with `VITE_` is bundled into the client.

### Backend — `backend/.env.example`
```
# Server
PORT=3000
NODE_ENV=development

# Supabase PostgreSQL (server-side keys NEVER go to the frontend)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key

# Auth / JWT
JWT_ACCESS_SECRET=placeholder-access-secret
JWT_REFRESH_SECRET=placeholder-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS (comma-separated list of allowed frontend origins)
CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app

# Brevo email service
BREVO_API_KEY=placeholder-brevo-api-key
EMAIL_FROM_NAME=Healthcare Management Website
EMAIL_FROM_ADDRESS=no-reply@yourdomain.com
```
- `config/env.js` validates all of these at startup (fail-fast: the app refuses to boot with missing vars).
- `config/db.js` reads the Supabase vars; `config/brevo.js` reads the Brevo vars.

---

## 4. How the Files Connect (Frontend ⇄ Backend ⇄ Database ⇄ Brevo)

```
┌──────────────────────────── FRONTEND (React + Vite + Tailwind) ────────────────────────────┐
│  src/services/apiClient.js ──(fetch with VITE_API_BASE_URL + Bearer token)──┐              │
└─────────────────────────────────────────────────────────────────────────────┼──────────────┘
                                                                              ▼
┌──────────────────────────────── BACKEND (Node.js + Express) ───────────────────────────────┐
│ routes/index.js → modules/*/{routes → controller → service → repository}                   │
│                                                                                             │
│  auth.service / notification.service ──▶ shared/services/email.service.js                  │
│                                                   │                                         │
│                                                   ▼                                         │
│                                          config/brevo.js ───────────────▶ Brevo API / SMTP │
│                                                   (sends confirmation + reminder emails)   │
│                                                                                             │
│  repositories ──▶ config/db.js ──▶ Supabase PostgreSQL — LAHAT ng 21 clinic tables sa      │
│                                    database/schema.sql (patients · admins · doctor_accounts│
│                                    · doctors · specialties · doctor_weekly_availability ·  │
│                                    appointments (+status history) · medical_records ·      │
│                                    lab_results · medications · visit_ratings · patient_    │
│                                    family_members · support_tickets(+messages) ·           │
│                                    contact_messages · patient_stories · notifications ·    │
│                                    clinic_info · app_settings · activity_log) + refresh_   │
│                                    tokens (backend-owned, 003 migration)                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

Email flow (Brevo):
1. Patient books → `appointment.service` saves to Supabase, checks the
   `app_settings` flags (`email_admins_on_new_appointment` / `remind_patients`),
   then calls `notification.service`.
2. `notification.service` writes an in-app row sa `notifications` (topbar bell)
   AND renders the HTML from `shared/templates/emails/appointmentConfirmation.js`.
3. `shared/services/email.service.js` sends it through the Brevo client in `config/brevo.js`.
4. `jobs/appointmentReminder.job.js` runs on a schedule for upcoming appointments (same chain).
5. Failures are logged, never crash the request — email is best-effort after the booking is committed.
6. Status changes (confirmed / rescheduled / cancelled / completed / **no-show**) →
   `appointmentStatusUpdate.js` template + in-app notification row.

---

## 5. Alignment Matrix — Feature → Module → Table (tugma sa database/README.md)

Bawat feature ng apat na surfaces ay may direktang module at table. Ito ang
"alignment contract" ng backend — kapag may bagong feature sa frontend, dito
dapat lumabas kung saan ito papasok.

### Public website (marketing + onboarding)

| Public Feature | Module | Tables |
| --- | --- | --- |
| Landing care finder + Doctors directory | `doctors` (public GET) | `doctors` + `specialties` |
| Doctor cards: computed rating + review count | `ratings` (public averages) | `v_doctor_rating_averages` |
| "What patients say" carousel | `stories` (public GET, approved lang) | `patient_stories` |
| Footer/Contact info + "Open now / Closed" pill | `settings` (public read) | `clinic_info` |
| Contact page "Send us a message" | `contact` | `contact_messages` |
| Register / Login / Forgot password | `auth` (patient source) | `patients` |

### Patient Portal

| Patient Feature | Module | Tables |
| --- | --- | --- |
| Profile (info, health summary, photo, password) | `patients` + `auth` | `patients` |
| Email reminders / Portal notifications toggles | `patients` | `patients.email_reminders` + `portal_notifications` |
| Family members ("Who is this visit for?") | `patients` (sub-resource) | `patient_family_members` |
| Find a doctor + availability slots | `doctors` + `appointments` | `doctors` + `doctor_weekly_availability` + `fn_available_slots()` |
| Book / Reschedule / Cancel + auto-confirm pref | `appointments` | `appointments` + `app_settings` |
| Status timeline + history + details | `appointments` | `appointments` + `appointment_status_history` |
| Medical records (consultations + labs + meds) | `records` | `medical_records` + `lab_results` + `medications` |
| Rate your visit (one per appointment) | `ratings` | `visit_ratings` |
| My messages (two-way thread) | `messages` | `support_tickets` + `support_ticket_messages` |
| Share your experience | `stories` | `patient_stories` |
| Notifications bell (unread, mark-all-read) | `notifications` | `notifications` |

### Admin Console

| Admin Feature | Module | Tables |
| --- | --- | --- |
| Admin Login + topbar identity | `auth` (admin source) | `admins` |
| Patients mgmt (list/add/edit/delete + registry) | `patients` | `patients` |
| Labs & medications encoding | `records` | `lab_results` + `medications` |
| Doctors mgmt (CRUD + availability editor) | `doctors` | `doctors` + `doctor_weekly_availability` |
| Portal access (grant / reset / revoke) | `doctors` | `doctor_accounts` |
| Appointments mgmt (create/edit/status/delete/complete-visit) | `appointments` | `appointments` (+ `activity_log` writes) |
| Patient stories moderation (approve/reject/unpublish) | `stories` | `patient_stories` |
| Patient messages (reply loop) | `messages` | `support_tickets` + `support_ticket_messages` |
| Contact submissions (list/mark-handled) | `contact` | `contact_messages` |
| Settings (clinic info + appointment preferences) | `settings` | `clinic_info` + `app_settings` |
| Activity page (audit trail) | `activity` | `activity_log` |
| Dashboard + Reports (stats, CSV source) | `reports` | computed joins — walang extra table |

### Doctor Portal

| Doctor Feature | Module | Tables |
| --- | --- | --- |
| Doctor Login (admin-issued access) | `auth` (doctor source) | `doctor_accounts` |
| Today's schedule (complete visit / no-show) | `appointments` (doctor-scoped) | `appointments` |
| My patients + visit history + amended notes | `appointments` + `records` | `appointments` + `patients` + `medical_records` |
| This week (week view) | `appointments` (date range query) | `appointments` |
| Patient feedback page | `ratings` | `visit_ratings` (+ `v_doctor_rating_averages`) |

---

## 6. Auth & Security Alignment Notes

1. **Custom JWT, hindi Supabase Auth (phase 1).** Ang schema ay may
   `password_hash` columns sa `patients` / `admins` / `doctor_accounts` — dito
   nagba-base ang `auth.service` (bcrypt verify + JWT issue). Walang iisang
   `users` table: ang role ng JWT ay derived sa kung aling account source ang
   tumugma sa credentials.
2. **RLS mananatiling commented.** Ang backend ay gumagamit ng
   `SUPABASE_SERVICE_ROLE_KEY` — **bypass ng RLS** ang service role. Ang
   authorization ay naka-enforce sa `auth.middleware.requireRole()` + service-level
   scoping: patient sees own rows only, doctor sees own schedule/patients only,
   admin full access sa shared data. Ang commented RLS policies sa schema.sql ay
   para sa direct-Supabase-Auth path (phase 2) — hindi sila kaagad aktibo.
3. **`refresh_tokens` ay backend-owned.** Hindi ito clinic domain — kaya hindi
   kasama sa `database/schema.sql`. Ang schema ay i-a-apply sa ibabaw ng
   `database/schema.sql` (singleton source of truth) — ita-type lang ang
   `create table refresh_tokens (…)` (user id, token hash, expires_at,
   revoked_at) bilang hiwalay na SQL migration kapag naka-backend na.
4. **Secrets**: service-role key, JWT secrets, at Brevo API key — backend `.env`
   lang, hindi kailanman nasa frontend (`VITE_` vars ay public by design).
5. **Password hashing**: bcrypt/argon2 sa `auth.service` at
   `doctor.service` (portal access grant) — tugma sa "HUWAG plain text" note ng
   schema.
6. **Security requirements map**: ang kumpletong security checklist bawat
   module (OWASP API Top 10 + ASVS citations, verification tests, deployment
   notes) ay nasa `docs/BACKEND_SECURITY_AUDIT.md` — basahin bago mag-code.

