# Field-Level Encryption Design (PHI Protection)

**Date:** 2026-09-29
**Bakit:** health data ito — ang `appointments.reason` ("Consultation for anxiety"),
`lab_results.findings`, `medications.name`, atbp. ay **sensitive personal
information** sa ilalim ng **RA 10173 (Data Privacy Act of 2012)**. Ang
encryption ang tinatangkilik na "reasonable safeguard" — at ang naka-encrypt na
data ay may mas mababang compliance burden kapag may breach (NPC rules).

**Layered approach (defense in depth):**

| Layer | Ano | Protection niya | Status |
|---|---|---|---|
| In transit | TLS/HTTPS (frontend→backend→Supabase) | sniffing/MITM | ✅ Supabase forces TLS; i-enforce sa hosting |
| At rest | Supabase-managed disk/database encryption | physical theft, disk dump | ✅ automatic sa Supabase (i-verify sa project settings) |
| **Field-level** | **AES-256-GCM sa backend, bago i-store** | DB dump, SQL injection exfil, service_role leak, insider DBA access | 📋 itong doc — i-implement kasama ng auth module |
| Passwords | bcrypt one-way hash (HINDI encryption) | credential exposure | ✅ already in design |

> **Bakit kailangan pa ang field-level kung may at-rest na?** Ang at-rest
> encryption ay nagproprotekta lang sa **disk**. Kapag may nakakuha ng
> service_role key, o may SQL injection, o may curious na DBA — **lumalabas na
> plaintext** ang data. Ang field-level encryption ay pinapanatili ang
> ciphertext sa loob ng DB; ang susi ay nasa backend env lang.

---

## 1. Column classification (ano ang i-e-encrypt — at ano ang HINDI)

### TIER 1 — Encrypt (AES-256-GCM): PHI / health secrets

| Table.Column | Bakit |
|---|---|
| `patients.date_of_birth` | PII; sapat para i-identify ang tao |
| `patients.blood_type` | Health data (PHI) |
| `patients.allergies` | Health data (PHI) |
| `patients.address` | PII (home address) |
| `patients.emergency_contact` | PII ng **third party** (pangalan + phone) |
| `appointments.reason` | **Pinaka-sensitibo** — health complaint ("anxiety", "prenatal") |
| `appointments.additional_notes` | Pweding maglaman ng health details |
| `appointments.notes` | Doctor's visit notes — clinical PHI |
| `appointments.contact_number` | PII (phone) |
| `medical_records.title` / `summary` | Clinical PHI (title = reason, summary = notes) |
| `lab_results.test_name` / `findings` | Lab values — PHI (JSONB na base64 ciphertext pagkatapos) |
| `medications.name` / `dose` / `instructions` | Prescription info — PHI |
| `support_ticket_messages.body` | Pweding maglaman ng health details |
| `contact_messages.name` / `email` / `message` | PII mula sa publiko (walang auth) |
| `patient_family_members.full_name` / `relation` | PII ng third party |

### TIER 2 — Blind index (HMAC-SHA256) sa tabi ng ciphertext

Para sa **equality search** sa encrypted fields (hindi kayang i-WHERE ang
randomized ciphertext):

| Blind index column | Source | Ginagamit sa |
|---|---|---|
| `patients.phone_search` | HMAC(normalized phone) | Admin Patients search |
| `patients.email_search` *(opsyonal)* | HMAC(lower email) | kung ie-encrypt din ang email |

Equality lang ang kayang i-handle ng blind index — walang LIKE/partial match.
Kung kailangan ang partial search sa encrypted field, i-decrypt muna ang
candidate set (authz-scoped) tapos i-filter sa backend.

### TIER 3 — Plaintext (may sadyang dahilan — **huwag i-encrypt**)

| Column | Bakit plaintext |
|---|---|
| `patients.email` | **Login identity** — kailangan ng unique index + lookup; hindi kayang i-unique-index ang randomized ciphertext. Residual risk: documented, may RLS/BOLA pa rin |
| `patients.full_name` | Admin search by name (partial/LIKE); display sa lists. Alternative sa production: blind index |
| `doctors.full_name` atbp. sa `doctors` | **PUBLIKO** na marketing data (doctor directory) |
| `appointment_date`, `start/end_time`, `status`, `specialty_id` | Operational — kailangan sa slot logic (`fn_available_slots`), scheduling, filters |
| `reference_code` | Nasa resibo, ginagamit sa lookup |
| `notifications.title/message` | Derived sa status, mababang sensitivity |
| `activity_log.actor/action` | Audit trail na binabasa ng admin |
| `admins/doctor_accounts.email` | Internal accounts (maliit na bilang), login lookup |

> **Prinsipyo:** i-encrypt ang data na **mag-isa nitong nakakapag-identify o
> nakakapag-reveal ng kalagayan ng kalusugan**. Huwag i-encrypt ang kailangan
> sa query/index/logic — ang kapalit ay mas lumalang functional break, at ang
> seguridad ay nakasalalay pa rin sa RLS (phase 2) at BOLA/BFLA (phase 1).

---

## 2. Format at crypto primitives

```
ciphertext = "v1:" + base64(iv[12]) + ":" + base64(authTag[16]) + ":" + base64(ct)
```

- **AES-256-GCM** (AEAD) — built-in sa Node `crypto`, walang bagong dependency
  (tugma sa "prefer existing deps" rule). Random 12-byte IV **bawat field,
  bawat write** — randomized kaya walang equality leak, kaya nga may blind
  index para sa search.
- **`v1:` prefix** — key version sa ciphertext mismo: kapag nag-rotate, ang
  bagong writes ay `v2:` (bagong key) habang binabasa pa rin ang `v1`.
- **Auth tag** — integrity: kapag may nag-tamper sa ciphertext sa DB, ang
  decrypt ay mag-fail (hindi tahimik na magre-return ng basurang data).

## 3. Key management

| aspeto | desisyon |
|---|---|
| Saan nakatira ang key | backend `.env` — `ENCRYPTION_KEY` (32-byte hex; `openssl rand -hex 32`) |
| Bawal | sa source code, sa DB, sa logs, sa frontend, sa error messages |
| Rotation | versioned ciphertext (§2) + one-time re-encrypt script sa backend |
| Prototype | isang key sa env — **OK lang para sa demo** |
| Production | **envelope encryption**: DEK per-field-set + KMS-wrapped (Supabase Vault / AWS KMS / GCP KMS); ang raw key ay hindi na nakatira sa env kundi sa KMS |
| Compromise response | rotate key + re-encrypt (ang `v1:`/`v2:` format ang gumagawa nitong posible) |

## 4. Cross-layer alignment (frontend ↔ backend ↔ database)

| Layer | Responsibilidad | BAWAL |
|---|---|---|
| **Frontend** | ZERO crypto. Nagpapadala ng plaintext sa backend **over HTTPS**; nagre-render ng decrypted API response. (Ang key sa JS ay basang-basa sa DevTools — walang silbi ang client-side field crypto sa web app na ito.) | key sa bundle, localStorage ng PHI nang matagal (CRITICAL-001 pa rin ang playbook), crypto.subtle "sariling" encryption |
| **Backend** | LAHAT ng encrypt/decrypt. Order of operations: **auth → authz (BOLA scope) → validate (Zod, sa PLAINTEXT) → encrypt → i-INSERT**. Sa read: **authz muna bago i-decrypt**. Never log decrypted PHI; never ibalik ang key sa response. | decrypt ng rows na hindi naka-scope; logging ng PHI; key sa error/stack |
| **Database** | Ciphertext lang ang nakatira sa `[ENC]` columns. **Walang key sa DB** — kahit pgcrypto ay hindi ginagamit sa field encryption (hash ng passwords lang). Ang Supabase at-rest encryption ay layered pa rin sa ilalim. | key sa settings/vault ng app user na may wide access; plaintext PHI sa new columns |

**Gotcha (naka-note na sa schema):** ang `char_length` CHECK constraints sa
encrypted columns (hal. `reason between 1 and 500`) ay **magigive-up** pagkatapos
ma-encrypt — ang base64 ciphertext ay mas mahaba at variable ang haba. Sa
phase-2 playbook: i-drop/widen ang mga CHECK na iyon at **lilipat ang validation
nang buo sa backend Zod** (na mas mahigpit pa — length + format + sanitize).

## 5. Implementation checklist (kapag nag-code na ng backend)

1. `shared/utils/crypto.js` — implement ayon sa stub header (encrypt/decrypt/blindIndex).
2. `config/env.js` — fail-fast validation ng `ENCRYPTION_KEY` (32-byte hex).
3. Sa bawat service na sumusulat sa TIER-1 columns: encrypt bago INSERT/UPDATE.
4. Sa bawat read: authz scope muna → decrypt → response.
5. Admin patient search: gamitin ang blind index para sa phone equality; plaintext LIKE para sa name/email.
6. Migration script (one-time): basahin ang mga existing row (plaintext) → encrypt → i-write back; idagdag ang `phone_search` blind indexes.
7. Schema phase-2: i-drop ang nababanggit na CHECK constraints sa `[ENC]` columns (naka-comment ang playbook sa `schema.sql`).
8. Tests: roundtrip encrypt/decrypt, tampered-ciphertext reject, maling key reject, blind-index equality, walang plaintext sa DB dump (regex scan).
9. Log hygiene review: siguraduhing walang decrypted PHI sa pino-log ng errors.

**Masusing column markers:** `[ENC]` comments sa `database/schema.sql` ·
**Alignment context:** `docs/SECURITY_ALIGNMENT.md` §I
