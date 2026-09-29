# Healthcare Management Website — Backend File Architecture (Node.js + Express)

> Status: **Blueprint only** — no code written yet.
> Goal: A **modular, scalable, industry-standard** backend that is **explicitly connected to the Frontend (React + Vite + Tailwind)** and the **Database (Supabase PostgreSQL)**.
> Stack agreed by user: **Node.js + Express** (JavaScript), **Supabase PostgreSQL** (existing DB), **Vercel** deployment.

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
│   ├── auth/
│   │   ├── auth.routes.js           # POST /api/auth/register, /login, /refresh, /logout
│   │   ├── auth.controller.js       # HTTP layer only: parse req → call service → send response
│   │   ├── auth.service.js          # Business logic: credentials, sessions, token issuance
│   │   ├── auth.repository.js       # Data access only: users, refresh_tokens via Supabase
│   │   ├── auth.validation.js       # Zod schemas: registerSchema, loginSchema
│   │   └── auth.middleware.js       # requireAuth (verify JWT), requireRole('admin'|'patient'|'staff')
│   │
│   ├── users/                       # User profiles & account management (linked to auth)
│   │   ├── user.routes.js
│   │   ├── user.controller.js
│   │   ├── user.service.js
│   │   ├── user.repository.js
│   │   └── user.validation.js
│   │
│   ├── patients/                    # Patient profiles & medical history
│   │   ├── patient.routes.js
│   │   ├── patient.controller.js
│   │   ├── patient.service.js
│   │   ├── patient.repository.js
│   │   └── patient.validation.js
│   │
│   ├── doctors/                     # Doctor profiles, specialty, availability schedule
│   │   ├── doctor.routes.js
│   │   ├── doctor.controller.js
│   │   ├── doctor.service.js
│   │   ├── doctor.repository.js
│   │   └── doctor.validation.js
│   │
│   ├── appointments/                # ★ CORE feature: booking lifecycle (depends on doctors + patients)
│   │   ├── appointment.routes.js
│   │   ├── appointment.controller.js
│   │   ├── appointment.service.js   # Conflict detection + status transitions
│   │   ├── appointment.repository.js
│   │   └── appointment.validation.js
│   │
│   ├── notifications/               # Email reminders (sent via Brevo) + in-app notifications
│   │   ├── notification.routes.js
│   │   ├── notification.controller.js
│   │   ├── notification.service.js
│   │   └── notification.repository.js
│   │
│   └── dashboard/                   # Aggregated read-only stats for admin dashboard
│       ├── dashboard.routes.js
│       └── dashboard.controller.js
│
├── db/
│   ├── schema.sql                   # Full PostgreSQL DDL (source of truth for Supabase tables)
│   ├── seed.sql                     # Dummy test data (fictional placeholders only — no real PII)
│   └── migrations/
│       └── 001_init_core_tables.sql # users, patients, doctors, appointments, refresh_tokens
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
│   │   └── roles.js                 # USER_ROLES, APPOINTMENT_STATUS enums (single source of truth)
│   ├── utils/
│   │   ├── ApiError.js              # class ApiError extends Error { status, code }
│   │   ├── apiResponse.js           # ok(), created(), fail() response-shape helpers
│   │   ├── asyncHandler.js          # Wraps async controllers so errors reach errorHandler
│   │   └── pagination.js            # page/limit parsing + meta builder
│   ├── services/
│   │   └── email.service.js          # Thin wrapper over Brevo API — sendEmail({to, subject, html}); used by notifications & auth
│   ├── templates/
│   │   └── emails/
│   │       ├── appointmentConfirmation.js   # HTML email template: booking confirmed
│   │       ├── appointmentReminder.js       # HTML email template: upcoming appointment
│   │       └── appointmentStatusUpdate.js   # HTML email template: cancelled / rescheduled / completed
│   └── validators/
│       └── common.schema.js         # Shared Zod primitives (uuid, phone, email, date-time)
│
├── jobs/
│   └── appointmentReminder.job.js   # Scheduled job → upcoming appointments → trigger notifications
│
└── tests/                           # Mirrors modules/ structure
    ├── setup.js                     # Test env bootstrap (isolated Supabase config)
    ├── auth.test.js
    ├── appointments.test.js
    ├── users.test.js
    └── notifications.test.js          # Mocks Brevo — never sends real emails in tests
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
│  repositories ──▶ config/db.js ──▶ Supabase PostgreSQL (users, patients, doctors,          │
│                                    appointments, refresh_tokens, notifications tables)     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

Email flow (Brevo):
1. Patient books → `appointment.service` saves to Supabase, then calls `notification.service`.
2. `notification.service` renders the HTML from `shared/templates/emails/appointmentConfirmation.js`.
3. `shared/services/email.service.js` sends it through the Brevo client in `config/brevo.js`.
4. `jobs/appointmentReminder.job.js` runs on a schedule for upcoming appointments (same chain).
5. Failures are logged, never crash the request — email is best-effort after the booking is committed.
