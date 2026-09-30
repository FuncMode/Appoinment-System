# Cross-Layer Security Alignment — Frontend ↔ Backend ↔ Database

**Date:** 2026-09-29
**Sources:** `docs/FRONTEND_SECURITY_AUDIT.md` · `docs/BACKEND_SECURITY_AUDIT.md` ·
`docs/DATABASE_SECURITY_AUDIT.md` · `database/README.md` · `docs/BACKEND_ARCHITECTURE.md`
**Layunin:** siguraduhing tugma ang mga security decision ng tatlong layers —
walang layer na nangangako ng proteksyon na hindi kayang i-honor ng kabilang layer.

---

## 1. Alignment matrix (bawat security concern, layer-by-layer)

### A. Auth chain (pinaka-critical junction)

| Hakbang | Frontend | Backend | Database | Aligned? |
|---|---|---|---|---|
| Credentials input | login forms (demo passwords dev-gated, `SHOW_DEMO_PASSWORDS = import.meta.env.DEV`) | `auth.validation` Zod schemas | — | ✅ |
| Verification | **WALA na** — plaintext compare sa localStorage ay prototype-only (CRITICAL-001/001-HIGH-001: open, server auth ang fix) | bcrypt verify vs DB hash (generic errors, constant-time) | `password_hash` sa `patients` / `admins` / `doctor_accounts` (walang iisang users table — role = account source) | ✅ (design) / ⚠️ (hangga't walang backend code) |
| Hashing | — | bcrypt cost ≥ 10 o argon2id (V2.4) | `password_hash` text column; seed hashes via pgcrypto `bf` (bcrypt-format `$2a$`) | ✅ |
| Session | kasalukuyan: localStorage session keys (forgeable — CRITICAL-001) | JWT access 15m + refresh 7d rotation + reuse detection | `refresh_tokens` (backend-owned, hash-only) — itatype kapag may backend na | ✅ (design) / ⚠️ (decision point — tingnan §2-D) |

### B. Transport & headers

| Concern | Frontend | Backend | Aligned? |
|---|---|---|---|
| CORS | — (hindi applicable sa browser side) | `CORS_ORIGINS` strict allowlist (localhost:5173 + prod origin), walang wildcard+credentials | ✅ tugma sa Vite dev port 5173 |
| CSP ↔ API | `connect-src 'self'` sa vite.config — **may nakalagay nang comment** na dagdagan ang API origin kapag naka-deploy na ang backend | `VITE_API_BASE_URL` ang endpoint na tatawagin ng `apiClient.js` (blueprint) | ⚠️ **action item sa deployment** — bago mag-live, i-update ang connect-src (kung hindi, blokad ng CSP ang lahat ng API calls) |
| Security headers | CSP meta sa build; X-Frame-Options/Permissions-Policy = header-only (host-side) | helmet (API8, implement-later sa `app.js`) | ✅ complementary — walang overlap |
| HTTPS | — | deployment note sa BACKEND_SECURITY_AUDIT §5 | ✅ |

### C. Input validation parity (frontend maxLengths ↔ backend Zod ↔ DB CHECKs)

| Field | Frontend | Database CHECK | Aligned? |
|---|---|---|---|
| Appointment reason | ≤ 500 | `char_length(reason) between 1 and 500` | ✅ |
| Visit notes (doctor) | 10–500 | `char_length(notes) between 10 and 500` | ✅ |
| Rating comment | ≤ 300 | `char_length(comment) <= 300` | ✅ |
| Stars | 1–5 | `stars between 1 and 5` | ✅ |
| Ticket subject | 1–80 | `char_length(subject) between 1 and 80` | ✅ |
| Message body | ≤ 500 | `char_length(body) between 1 and 500` | ✅ |
| Story display name / quote | ≤ 40 / 30–280 | CHECKs tugma | ✅ |
| Contact message | ≥ 10 | `between 10 and 2000` (DB cap mas maluwag — sanity lang) | ✅ |
| Backend Zod | — | (implement-later: kopyahin ang parehong limits sa `*.validation.js` — walang bagong numbers) | 📋 |

> **Rule:** ang DB CHECK ang huling linya ng depensa — ang backend Zod at
> frontend maxLength ay parehong dapat tumugma dito, hindi kabilangan.

---

## 2. Mga decision points (kelangan ng pagpapasya kapag nag-code na ng backend)

### D. Kung saan titira ang token (frontend storage ↔ backend issuance)
- **Blueprint ngayon:** `apiClient.js` — `fetch + Bearer token` sa Authorization header (VITE_API_BASE_URL).
- **FRONTEND_SECURITY_AUDIT (CRITICAL-001 fix):** inirerekomenda ang **httpOnly + Secure + SameSite cookie** para hindi mabasa ng XSS ang token.
- **Trade-off:** Bearer-in-header = **CSRF-immune** pero XSS-readable; httpOnly cookie = XSS-resistant pero **kailangan ng CSRF defense** (SameSite=Strict + CSRF token sa state-changing requests).
- **Decision rule:** kung mananatili ang Bearer header → **bawal itago ang token sa localStorage kung kaya (in-memory + refresh cookie)**, at laging i-flag na ang XSS ay session-hijack na. Kung cookie ang pipiliin → idagdag ang CSRF middleware sa backend checklist (BACKEND_SECURITY_AUDIT §3).

### E. CSRF posture
- Ngayon: **structurally N/A** (zero network calls sa prototype).
- Kapag may backend: Bearer header path = N/A pa rin; cookie path = kailangan (tingnan D).

### F. Demo credentials lifecycle
- DB seed: `patient123` / `admin123` / `doctor123` — bcrypt-format hashes (pgcrypto `bf`, default rounds mas mababa kaysa backend bcrypt cost 10 — **i-re-hash with backend bcrypt kapag na-wire ang auth**, o tanggapin lang ang mababang rounds para sa demo).
- Frontend: dev-gated na ang pagpapakita (hindi na nasa production bundle).
- Backend: i-verify laban sa **DB hash**, huwag sa literal na password sa code (CRITICAL-002 fix parity).
- Bago mag-prod: i-rotate/i-alis ang seed accounts (nasa database/README na).

### G. Authorization layering (RLS ↔ service_role ↔ BOLA/BFLA)
- Phase 1: backend + service_role = **RLS bypass** → ang TANGING authorization ay `requireRole()` (BFLA) + service-level scoping (BOLA). Lahat ng queries patient/doctor-scoped.
- Phase 2 (direct Supabase Auth): i-uncomment ang RLS playbook — **sabay-sabay** (kasama ang bagong contact_messages + public-read tables), sunod ang RLS tests sa DATABASE_SECURITY_AUDIT §4.
- Frontend: kahit kailan ay walang direktang DB access — laging dadaan sa backend API. ✅

### H. Secrets flow
- Frontend: `VITE_*` = public by design (walang secrets — verified ng FRONTEND audit).
- Backend: lahat ng keys sa `.env` (service_role, JWT secrets, Brevo) — `.gitignore` covered, fail-fast validation sa `config/env`.
- Database: walang secrets — passwords hashed lang; `extensions` schema isolated.
- ✅ walang secret na tumatawid sa maling layer.

### I. Field-level encryption (PHI) — tingnan ang `docs/ENCRYPTION_DESIGN.md`
- **Frontend: ZERO crypto sa browser** — ang key sa JS ay laging nababasa ng user, kaya walang silbi. Transit protection = HTTPS/TLS. Frontend nagpapadala lang ng plaintext sa backend at nagre-render ng decrypted response.
- **Backend: tagapag-taglay ng lahat ng encrypt/decrypt** — `shared/utils/crypto.js` (AES-256-GCM, key mula sa `ENCRYPTION_KEY` env). Nag-e-encrypt bago i-INSERT, nagde-decrypt **pagkatapos** ng authorization check (BOLA scope muna bago i-decrypt — walang decrypt sa mga row na hindi naka-scope sa requester).
- **Database: ciphertext lang ang naka-store** sa mga `[ENC]` columns ng `schema.sql`; ang key ay **hindi kailanman** nasa DB. Ang mga CHECK constraints sa haba ng encrypted columns ay mawawalan ng bisa sa ciphertext (base64 ay mas mahaba) — ang validation ay lilipat nang buo sa backend Zod (phase-2 playbook sa schema).
- **Password ≠ encryption:** ang `password_hash` ay mananatiling one-way hash (bcrypt) — hindi kailanman ine-encrypt/reversible.

---

## 3. Mga minor na parity fixes na na-apply ngayon (2026-09-29)

| Fix | Layer | Bakit |
|---|---|---|
| `frontend/.gitignore`: `.env.local` → `.env.*` + `!.env.example` | frontend | parity sa backend — hindi ma-commit ang kahit anong env variant |
| `vite.config.js` connect-src comment: paalala na idagdag ang API origin kapag naka-deploy na ang backend | frontend ↔ backend junction | maiiwasan ang "gumagana locally, blocked sa prod" na CSP surprise |

---

## 4. Buod

| Junction | Status |
|---|---|
| Password chain (input → hash → store) | ✅ aligned sa design |
| Auth/session issuance | ✅ aligned sa design / ⚠️ hintayin ang backend code |
| Token storage | ⚠️ **decision point D** — Bearer vs httpOnly cookie |
| CORS ↔ CSP | ✅ dev / ⚠️ i-update ang connect-src sa deployment |
| Validation parity | ✅ (DB CHECKs ang source of truth) |
| Demo credentials | ✅ aligned + rotation note |
| Secrets flow | ✅ walang tumatawid |
| Authorization layering | ✅ phase-1/phase-2 path malinaw |
| CSV export safety | ✅ frontend-side lang (may csvCell guard); backend magre-return ng JSON |
| Audit trail | ✅ frontend 20-entry cap → backend writes → `activity_log` full trail |
| Field-level encryption (PHI) | ✅ design aligned sa `docs/ENCRYPTION_DESIGN.md` — frontend zero-crypto (TLS lang), backend AES-256-GCM + key sa env, DB ciphertext + `[ENC]` markers sa schema |

**Masusing per-layer findings:** FRONTEND_SECURITY_AUDIT.md · BACKEND_SECURITY_AUDIT.md · DATABASE_SECURITY_AUDIT.md

---
