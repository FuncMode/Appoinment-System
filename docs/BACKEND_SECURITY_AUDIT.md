# Backend Security Audit — MedicaCare

**Skills:** `security-guidance` (OWASP Secure Agent Playbook — ASVS workflow) ·
`api-security-design` (Microsoft Security Skills — OWASP API Security Top 10)
**Scope:** `backend/` scaffold — **structure lang, walang code pa** (102 stub files).
**Date:** 2026-09-29
**Companion docs:** `docs/BACKEND_ARCHITECTURE.md` (blueprint) ·
`docs/FRONTEND_SECURITY_AUDIT.md` (frontend counterpart)

> **Context:** walang code pa ang backend, kaya ang audit na ito ay
> **requirements map** — bawat file ay may nakatalagang security requirements
> (ASVS / API-Top-10 citations) na KAILANGANG i-verify kapag isinusulat na ang
> code. Ang mga security-critical stubs ay mayroon nang `// Security (...)`
> annotation lines sa mismong file — ito ang "cite requirements inline" step ng
> ASVS workflow. Kapag nag-code ka na, ang doc na ito ang verification checklist.

---

## 1. Naka-apply na ngayon (architecture-level, verified 2026-09-29)

| Item | Status |
|---|---|
| **Secrets hygiene** | `.env.example` — placeholders lang, walang totoong key; may `openssl rand -hex 32` guidance sa JWT secrets (access ≠ refresh); `.gitignore` ay nag-tatakip ng `.env` + `.env.*` (maliban sa `.env.example`) |
| **Service-role key isolation** | server-side lang (`config/db.js`) — hindi kailanman sa frontend (`VITE_` vars ay public by design; naka-dokumenta na sa FRONTEND_SECURITY_AUDIT) |
| **Auth architecture** | custom JWT (phase 1): access 15m + refresh 7d rotation sa `refresh_tokens` (token **hash** lang ang stored); role derived from account source (`patients` / `admins` / `doctor_accounts` — walang iisang `users` table) |
| **Security stub annotations** | 14 security-critical stubs mayroon nang `// Security (ASVS …/API…)` requirement lines: `config/` (env, cors, db, logger, brevo), `auth` module (service, middleware, repository, routes, validation), `middleware/` (errorHandler, rateLimiter, validate), `email.service` |
| **Defense-in-depth vs. RLS** | naka-dokumenta na ang service-role = RLS bypass; ang authorization ay naka-enforce sa `requireRole()` (BFLA) + service-level scoping (BOLA), HINDI umaasa sa RLS |
| **Audit trail** | `activity_log` table na (actor/action/detail) — kakailanganin lang ang V16.3 logging rules sa implementation |
| **Rate limiting plan** | `middleware/rateLimiter.js` stub sa `/api/auth/*` (brute-force) |

---

## 2. OWASP API Security Top 10 → saan nakatira sa backend na ito

| # | Risk | Primary control | Saan sa backend | Status |
|---|---|---|---|---|
| API1 | **BOLA** (object-level authz) | per-object check | service layer per module (hal. `appointment.service` — patient sees own rows only) | 📋 implement-later |
| API2 | Broken authentication | JWT verify + rotation | `auth.middleware` (verify sa bawat request) + `auth.service` (rotation/reuse-detection) | 📋 implement-later |
| API3 | Broken object property auth | Zod schema validation + response filtering | `middleware/validate` + `*.validation.js` (`.strict()`) | 📋 implement-later |
| API4 | Unrestricted resource consumption | rate limit + payload caps | `middleware/rateLimiter` + `express.json({ limit })` sa `app.js` | 📋 implement-later |
| API5 | **BFLA** (function-level authz) | role check per operation | `auth.middleware.requireRole()` sa bawat admin/doctor route | 📋 implement-later |
| API6 | Unrestricted access to sensitive flows | step-up / anti-abuse | OTP flow (admin login), rate limits, activity logging | 📋 implement-later |
| API7 | SSRF | outbound URL allowlist | `config/brevo` (fixed Brevo endpoint lang — walang user-controlled URLs sa outbound calls) | ✅ by design |
| API8 | Security misconfiguration | env validation, generic errors, headers | `config/env` (fail-fast), `middleware/errorHandler`, `config/cors`, helmet (idagdag) | 📋 implement-later |
| API9 | Improper inventory | route inventory | `routes/index.js` — iisa ang API router, 13 modules lang, naka-dokumenta sa blueprint | ✅ by design |
| API10 | Unsafe third-party consumption | validate upstream + timeouts | `email.service` (timeout, best-effort, i-validate ang response) | 📋 implement-later |

> **Rule of thumb (mula sa skill):** ang BOLA at BFLA ay **hindi matatakpan ng
> anumang gateway/RLS** — nasa backend code dapat ang per-object at
> per-function authorization. Ang service-role key ay RLS bypass, kaya ang
> service-level scoping ang TANGING depensa — walang shortcut dito.

---

## 3. Per-module security requirements (implement-later checklist)

Bawat requirement ay may ASVS/API citation — i-cite din sa code comment kapag
na-implement (`// ASVS 4.1.3: ...`), ayon sa `security-guidance` workflow.

### modules/auth (pinaka-critical)
- [ ] **V2.4** bcrypt cost ≥ 10 (o argon2id); constant-time compare; walang plaintext
- [ ] **V2.5/V16.3** generic login/forgot errors (walang account enumeration); i-log ang failures (hindi ang passwords)
- [ ] **V3.3/V3.5** access 15m; refresh rotation + **reuse detection** → i-revoke ang token family kapag may nagamit na lumang refresh token
- [ ] **V6.2** JWT secrets ≥ 32 bytes, hiwalay ang access/refresh; i-validate ang `iss`/`aud`/`exp`
- [ ] **V2.1/V5.1** password policy (min 8/max 128, common-password check); `.strict()` schemas
- [ ] **API4** rate limit: tight sa `/login`, `/forgot-password`; moderate sa `/register`
- [ ] **V4.1** register: hindi pwedeng i-set ang `role` mula sa body (patient lang ang pwedeng mag-self-register)

### middleware/ + config/
- [ ] **V14.2** `config/env` fail-fast: required vars, secret length check, walang defaults sa production
- [ ] **V14.4/API8** `config/cors`: strict allowlist, walang `*` + credentials combo
- [ ] **API8** idagdag ang `helmet` sa `app.js` (HSTS, X-Content-Type-Options, atbp. — header-level security, katulad ng CSP note sa frontend)
- [ ] **V16.5** `errorHandler`: generic client message, stack trace sa logs lang
- [ ] **API4** `validate` + `express.json({ limit })` payload cap; params/query validation
- [ ] **V16.2/V16.4** `logger`: walang secrets sa log lines; persistent store sa production
- [ ] **V16.3** i-log ang security events: login success/failure, authz failures (403), password changes, rate-limit hits

### modules/appointments (pinakamaraming BOLA surface)
- [ ] **API1** lahat ng queries ay naka-scope: patient → own `patient_id` lang; doctor → own `doctor_id` lang; admin → full
- [ ] **API1** slots: `fn_available_slots()` + `uq_appointments_active_slot` (DB-level double-booking guard) + re-check sa service (race-safe)
- [ ] **V5.2/V11** status transitions: valid paths lang (pending→confirmed→completed/cancelled/no-show); hindi pwedeng i-cancel ng pasyente ang completed na appointment; si doctor lang ang pwedeng mag-complete-visit sa sarili niyang appointment
- [ ] **V11** reschedule: sariling slot ng appointment ang excluded (`p_exclude_appt_id`); date future, within clinic hours
- [ ] **API4** booking rate limit (anti-spam sa `/api/appointments`)

### modules/doctors
- [ ] **API5** portal access grant/reset/revoke — **admin-only** (BFLA)
- [ ] **V2.4** generated portal password: random (CSPRNG), i-hash bago i-save, ipakita nang isang beses lang sa admin
- [ ] **API1** public doctor directory: approved/read-only fields lang ang exposure

### modules/records, ratings, stories, messages
- [ ] **API1** lahat ng patient data (records/labs/meds/tickets) ay own-`patient_id` scoped
- [ ] **DB** one-rating-per-appointment: `UNIQUE(appointment_id)` guard + service re-check
- [ ] **V5.2** story moderation: public read = `status='approved'` lang; rejected = walang content leak sa response
- [ ] **V11** support ticket loop: patient ay own-tickets lang; staff reply ay admin/staff role lang; follow-up ay nag-o-open ulit (business rule)

### modules/contact (public endpoint!)
- [ ] **API4** tightest rate limit dito (walang auth ang endpoint — spam/vector target)
- [ ] **V5.1** strict validation (name/email/message lengths — parity sa DB CHECKs)
- [ ] **V16.5** generic success response (hindi nire-reveal kung mayroon nang existing submission)
- [ ] (phase 2) CAPTCHA / honeypot kapag live na

### modules/settings, reports, activity, notifications
- [ ] **API5** settings write + reports + activity read = **admin-only**
- [ ] **API1** notifications: own-`patient_id` lang
- [ ] **V11** prefs-driven behavior (`auto_confirm_appointments` atbp.) ay server-side validated (hindi tiwala sa client)

### shared/ + jobs/
- [ ] **V6.2** `refresh_tokens`: hash-only storage, `expires_at`/`revoked_at` checks sa query
- [ ] **API10** `email.service`: timeout + retry cap; template values naka-escape; failure ay best-effort (hindi nagpapabagsak ng request)
- [ ] **V5.1** `common.schema.js`: reusable validated primitives (uuid, email, phone, datetime)
- [ ] **jobs** reminder job: service-role context — i-scope sa appointments lang na due; walang arbitrary query surface

---

## 4. Verification requirements (kelangan sa tests)

Ang `backend/tests/*.test.js` stubs ay dapat i-extend ng mga security assertions na ito:

1. **BOLA test (lahat ng module):** valid JWT ni user A + object ni user B → **403/404** (hindi 200)
2. **BFLA test:** patient JWT sa admin endpoint → **403**; walang token → **401**
3. **JWT test:** expired / tama-signature-mali-iss / walang token → lahat rejected
4. **Refresh rotation test:** reused refresh token → **401 + revoked family**; bagong token ay gumagana
5. **Enumeration test:** login/forgot sa hindi-existing email at maling password → **parehong generic** ang message at timing
6. **Validation test:** unexpected field sa body → **400** (hindi na-save); oversized payload → **413/400**
7. **Rate limit test:** sunod-sunod na login failures → **429**
8. **Error leak test:** forced 500 → response walang stack trace / DB detail
9. **CSV/export test:** leading `=+-@` sa data → na-neutralize sa admin exports (parity ng frontend fix na HIGH-002)

---

## 5. Deployment notes (kapag may host na)

- HTTPS lang (HSTS via helmet); walang mixed content
- `trust proxy` nang tama kapag nasa reverse proxy (kung hindi, mali ang rate-limit keying)
- Secrets rotation runbook: service-role key, JWT secrets, Brevo key — may env fallback path (blueprint §6)
- Health endpoint (`/health`) na walang sensitive info; everything else naka-auth
- Logs → persistent store; retention per data-retention policy ng clinic

---

## 6. References

- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
