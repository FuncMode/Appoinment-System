# Cross-Layer Security Alignment — Frontend ↔ Backend ↔ Database

**Date:** 2026-09-29 · **Huling update:** 2026-10-01 (§D token storage + §J realtime transport + §K avatar storage — LAHAT DECIDED)
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

### D. Kung saan titira ang token (frontend storage ↔ backend issuance) — **DECIDED 2026-10-01: Bearer header + localStorage**
- **Desisyon:** `apiClient.js` — `fetch + Bearer token` sa Authorization header (VITE_API_BASE_URL); access token sa `localStorage`, inaalis sa logout/expiry.
- **Bakit HINDI httpOnly cookie** (ang dating CRITICAL-001 reco): ang cross-origin setup natin (SPA sa Vercel + API sa ibang origin) ay nangangailangan ng `SameSite=None; Secure` + `CORS credentials: true` (walang wildcard) + CSRF middleware — **bago at mas malaking surface** (CSRF + CORS misconfig risk + third-party cookie blocking) kaysa sa tinatanggal nitong XSS-read. Ang httpOnly ay best practice sa same-origin monolith — hindi sa architecture natin.
- **Trade-off na tinatanggap:** XSS-readable ang token — mitigated ng: (1) **15m access TTL**; (2) **refresh rotation + reuse detection** (theft detection, §A); (3) **CSP + React auto-escaping + walang innerHTML sa user content** (verified sa FRONTEND audit); (4) token ay hindi kailanman nasa URLs o logs.
- **§J alignment:** ang Bearer pattern ang natural na katuwang ng realtime token flow (hiwalay na ES256 token via `GET /api/realtime/token`, tingnan §J).
- **Epekto sa §E (CSRF):** sa Bearer na desisyon, ang CSRF defense ay **structurally N/A** — hindi na kailangang isama ang CSRF middleware (BACKEND_SECURITY_AUDIT §3) maliban kung maglipat sa cookie path sa hinaharap (i-reopen ang §D kung sakali).

### E. CSRF posture
- Ngayon: **structurally N/A** (zero network calls sa prototype).
- Kapag may backend: Bearer header path = N/A pa rin; cookie path = kailangan (tingnan D).

### F. Demo credentials lifecycle
- DB seed: `patient123` / `admin123` / `doctor123` — bcrypt-format hashes (pgcrypto `bf`, default rounds mas mababa kaysa backend bcrypt cost 10 — **i-re-hash with backend bcrypt kapag na-wire ang auth**, o tanggapin lang ang mababang rounds para sa demo).
- Frontend: dev-gated na ang pagpapakita (hindi na nasa production bundle).
- Backend: i-verify laban sa **DB hash**, huwag sa literal na password sa code (CRITICAL-002 fix parity).
- Bago mag-prod: i-rotate/i-alis ang seed accounts (nasa database/README na).

### G. Authorization layering (RLS ↔ service_role ↔ BOLA/BFLA)
- **UPDATE 2026-10-01 (Supabase deployment):** nung i-run ang `schema.sql` sa Supabase,
  pinili ang **"Run and enable RLS"** sa SQL editor guard — lahat ng public tables ay
  naka-**enable RLS na, walang policies** (deny-by-default sa `anon`/`authenticated`).
  ✅ Zero epekto sa phase-1 path: ang `sb_secret`/service_role ay BYPASSRLS, at ang
  SQL-editor/psql access ay owner-bypass. Benepisyo: sarado ang Data API exposure window
  habang wala pang backend (hindi maa-access ng publishable/anon key ang kahit anong table).
  Epekto sa phase 2: hindi na kailangang i-uncomment ang mga `enable row level security`
  lines — **policies na lang** ang i-u-uncomment (ganun pa rin ang sabay-sabay na rule).
- Phase 1: backend + service_role = **RLS bypass** → ang TANGING authorization ay `requireRole()` (BFLA) + service-level scoping (BOLA). Lahat ng queries patient/doctor-scoped.
- Phase 2 (direct Supabase Auth): i-uncomment ang RLS **policies** — **sabay-sabay** (kasama ang bagong contact_messages + public-read tables), sunod ang RLS tests sa DATABASE_SECURITY_AUDIT §4.
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

### J. Realtime transport (Supabase Realtime) — **DECIDED 2026-10-01**

**Desisyon: Private Broadcast Channels + signal-based refetch, JWT-authorized.**
Layunin: totoong realtime UX (walang polling UX) nang hindi binubuksan ang phase-2
door (RLS + Supabase Auth) nang maaga.

**Mga tinanggihang alternatibo (at bakit):**
- `postgres_changes` mula sa browser — nangangailangan ng RLS sa app tables +
  Supabase-compatible tokens = pinapabuksan agad ang phase-2 (labag sa §G phase-1 path).
- Backend-mediated SSE/WebSocket push — hindi kayang i-host ng Vercel serverless ang
  persistent connections (BACKEND_ARCHITECTURE: Vercel ang target deployment).
- Polling lang — mahinang UX (desisyon ng user: "mas maganda talaga kung realtime").

**⚠️ Correction sa unang draft (na-verify sa docs, 2026-10-01):** ang private channel
authorization sa kasalukuyang Supabase ay **RLS policies sa `realtime.messages` table**
(gamit ang `realtime.topic()` helper + JWT claims), **HINDI** backend authorization-endpoint
callback. Dahil dito, **Supabase-compatible token ang kailangan kahit sa broadcast** —
hindi tatanggapin ng Realtime ang custom JWT na pinirmahan ng sarili nating secret.

**Token-minting flow (ang puno't dulo ng disenyo):**
1. Main auth JWT — **WALANG BINAGO**: sariling secret, Bearer header, 15m (§6.1).
2. Hiwalay na **realtime token**: ES256, **5-min TTL**, minted ng backend gamit ang
   Supabase **JWT signing keys** (exported private key, `jose` lib). Claims:
   `sub` = patients.id / doctors.id · `role` = `authenticated` · `app_role` = patient/admin/doctor.
   Endpoint: `GET /api/realtime/token` (requireAuth).
3. Client: `rt.realtime.setAuth(realtimeToken)` bago mag-subscribe →
   `rt.channel(topic, { config: { private: true } })`.
4. **Signal lang ang dumadaloy sa channel** (hal. `appointments.changed`) — walang data
   payload. Ang mismong data ay kinukuha pa rin ng store sa authenticated API call.
   Kaya: ang tanging authorization layer ay nananatiling `requireRole()` + service-level
   scoping (BOLA/BFLA, §G) — walang pangalawang security surface.
5. Fallback refetch sa `CHANNEL_ERROR` / reconnect — **mahalaga ito** dahil ang
   REST-published messages ay hindi replayable (replay ay para lang sa
   DB-trigger-published messages).

**Publish (backend):** HTTP POST sa `/realtime/v1/api/broadcast` gamit ang `sb_secret`
key — request-scoped, **walang persistent WebSocket connection** → Vercel-safe.
Isang `publishSignal(channel, event)` one-liner sa service layer pagkatapos ng bawat
successful mutation. (Kapag nakalimutan = walang realtime doon, hindi sira — fallback refetch.)

**Channel map (= BOLA scopes na naka-compile sa topic naming):**
| Portal | Topic | RLS sa `realtime.messages` (for select to authenticated) |
|---|---|---|
| Patient | `patient:{patients.id}` | `realtime.topic() = 'patient:' \|\| auth.uid()::text` |
| Doctor | `doctor:{doctors.id}` | `realtime.topic() = 'doctor:' \|\| auth.uid()::text` |
| Admin | `admin` | `(auth.jwt() ->> 'app_role') = 'admin'` |

**Alignment check laban sa mga decision na ito:**
- §G frontend walang direktang DB access — ✅ signal-only; data laging via authenticated API.
- §G RLS commented (phase 1) sa app tables — ✅ walang binago; ang `realtime.messages` RLS
  ay hiwalay na mundo (realtime schema, hindi app data).
- §6.1 custom JWT — ✅ walang binago; realtime token hiwalay, mas maliit ang TTL at scope.
- §H secrets flow — ✅ signing key + `sb_secret` sa backend `.env` lang;
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` = public by design.

**Mga limitasyon / trade-off (tanggap sa desisyon):**
- Free tier limits: 200 concurrent connections · 100 msg/s · 256KB broadcast payload —
  sobra-sobra sa clinic traffic; i-review kapag nag-scale.
- RLS policy cache per connection — ang revocation ay makikita lang pagkatapos ng token
  refresh/expiry (kaya maikli ang 5-min TTL).
- Supabase signing key rotation → kailangang i-update ang exported private key sa env.
- Manual `publishSignal()` calls — discipline sa service layer.

**Upgrade path:** kapag inampon ang Supabase Auth (phase 2), lilipat sa
`postgres_changes` + RLS sa app tables — ang store loader methods ngayon ang magiging
mga swap target, walang frontend rewrite.

**Env vars na idadagdag SA PAG-IMPLEMENT** (huwag kalimutang i-update ang
`.env.example` files): backend — `SUPABASE_SIGNING_PRIVATE_KEY`, `SUPABASE_SECRET_KEY`;
frontend — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

### K. Avatar uploads / Supabase Storage — **DECIDED 2026-10-01** (buong design: `docs/STORAGE_DESIGN.md`)

| Aspeto | Desisyon |
|---|---|
| Bucket | **PRIVATEng `avatars`** — WALANG public policy kailanman: ang mukha ay PII (RA 10173); access laging via backend-signed URLs (TTL 5 min) pagkatapos ng authz |
| Upload flow | frontend base64 dataURL (existing FileReader behavior, hindi pa rin bagong dep) → `POST /api/.../photo` → backend: auth → authz (BOLA scope) → Zod + **magic-byte sniff** (jpeg/png/webp lang; SVG banned) → random-uuid path `{role}/{id}/` → service_role upload → DB `photo_url` = **path lang** (hindi URL) → delete old object |
| Client access | **Zero direct storage access sa frontend** — walang anon/authenticated storage policy sa phase 1 (katulad ng service_role-only DB posture); ang `nmc.patientPhoto` localStorage key ay ibabasura kapag naka-wire na |
| Serving rule | serializer: `photo_url` na nagsisimula sa `avatars/` → mint `createSignedUrl(path, 300)`; external demo URLs (randomuser.me seed) → pass-through — zero-migration ang seed data |
| Env | **Wala bagong env var** — `SUPABASE_URL` + service key sapat na (via `config/db.js`); bucket name = backend constant |

**Alignment check laban sa mga decision na ito:**
- §G frontend walang direktang DB access — ✅ pareho sa storage: browser never talks to Storage directly.
- §I field-level encryption — ✅ walang overlap: `photo_url` ay path/TIER-3 (hindi [ENC]); ang photo file mismo ay naka-protect ng private bucket + signed URL, hindi ng field crypto.
- §H secrets flow — ✅ service_role key (storage rights kasama) ay nasa backend `.env` lang.
- Defense in depth — ✅ backend validation (1st) → bucket `file_size_limit`/`allowed_mime_types` (2nd) → CSP/nosniff sa frontend (3rd).

**Mga limitasyon / trade-off (tanggap sa desisyon):**
- EXIF metadata (GPS) ng uploaded photo ay hindi natatanggal sa phase 1 — phase-2 `sharp` re-encode kung kakailanganin ng privacy review.
- Signed URL ay shareable within TTL — katanggap-tanggap para sa avatars (hindi clinical data).
- Multipart/multer + streaming = phase 2 lang kung aabot ng MBs ang media.

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
| Token storage (§D) | ✅ **decided** — Bearer + localStorage (15m TTL + refresh rotation + CSP mitigations); httpOnly tinanggihan dahil mas malaki ang cross-origin cookie/CSRF surface sa setup natin |
| CORS ↔ CSP | ✅ dev / ⚠️ i-update ang connect-src sa deployment |
| Validation parity | ✅ (DB CHECKs ang source of truth) |
| Demo credentials | ✅ aligned + rotation note |
| Secrets flow | ✅ walang tumatawid |
| Authorization layering | ✅ phase-1/phase-2 path malinaw |
| CSV export safety | ✅ frontend-side lang (may csvCell guard); backend magre-return ng JSON |
| Audit trail | ✅ frontend 20-entry cap → backend writes → `activity_log` full trail |
| Field-level encryption (PHI) | ✅ design aligned sa `docs/ENCRYPTION_DESIGN.md` — frontend zero-crypto (TLS lang), backend AES-256-GCM + key sa env, DB ciphertext + `[ENC]` markers sa schema |
| Realtime transport (§J) | ✅ **decided** — private broadcast channels + signal-based refetch, JWT-authorized; app-table RLS at custom JWT hindi binago; token-minting via Supabase signing keys |
| Avatar storage (§K) | ✅ **decided** — private `avatars` bucket, backend-only uploads (service_role), signed URLs TTL 5 min, magic-byte validation, zero client storage access; walang bagong dep/env — `docs/STORAGE_DESIGN.md` |

**Masusing per-layer findings:** FRONTEND_SECURITY_AUDIT.md · BACKEND_SECURITY_AUDIT.md · DATABASE_SECURITY_AUDIT.md

---
