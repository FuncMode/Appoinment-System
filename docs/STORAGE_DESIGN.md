# Storage Design — Supabase Storage (Avatars / Profile Photos)

**Date:** 2026-10-01
**Bakit:** may mga ina-upload na profile photo ang app — Patient Portal
(`Profile.jsx` "Change photo"), Admin Console (`PatientFormModal.jsx` /
`DoctorFormModal.jsx` "Upload photo"). Sa prototype, base64 data-URL sa
`localStorage` ang laman. Kapag may backend na, lilipat ito sa **Supabase
Storage** — at ang desisyon sa visibility/security ay kritikal dahil **ang
mukha ay PII** sa ilalim ng RA 10173 (sapat para i-identify ang tao).

**Angkol sa schema:** may `photo_url text` columns na — `patients.photo_url`,
`doctors.photo_url`, `admins.photo_url`. Walang schema change na kailangan;
ang idadagdag lang ay ang bucket mismo.

---

## 1. Pangunahing desisyon (lahat DECIDED 2026-10-01)

| aspeto | desisyon | bakit |
|---|---|---|
| Bucket name | `avatars` (isa lang) | isang uri lang ng media sa buong app; madaling i-audit at i-quota |
| Visibility | **PRIVADO** (hindi public) | ang mukha ng pasyente ay PII — ang pampublikong bucket ay ibinubunyag ang lahat ng photo sa sinumang may URL, walang expiry, walang authz. Itinanggi ang public bucket + CDN |
| Serving | **Naka-sign na URL, TTL 5 min**, ginagawa ng backend pagkatapos ng authz | pampublikong URL = permanenteng leak kapag nakopya/naka-index; ang naka-sign na URL ay nag-e-expire at laging dumadaan sa authz check ng backend |
| `photo_url` content | **object path lang** (`avatars/patients/{id}/{uuid}.jpg`) — HINDI buong URL, HINDI naka-sign na URL (nag-e-expire; bawal i-store) | ang naka-sign na URL ay per-request lang; ang path ay stable, muling mababago |
| Upload route | **Backend lang** — hindi direktang browser→Storage | ang anon key ay hindi mabibigyan ng storage access (tingnan §4); ang service_role lang ang maaaring mag-upload — parehong posture sa DB writes |
| Payload format (phase 1) | **base64 JSON** (`POST /api/.../photo` na may `{ data: dataURL }`) | tinatanggihan ang multer dep (prefer-existing-deps rule); ang frontend ay gumagana na sa dataURL ngayon (FileReader) — maliit na pagbabago lang; ang ≤1MB avatar ay kasya nang maayos sa JSON body |
| Paglipat sa multipart | Opsyonal sa phase 2 (multer/streaming) kung aabot na sa MBs ang media | hindi na kailangan para sa mga avatar |
| Sukat ng file | ≤ **1 MB** (tugma sa umiiral na frontend check) | ang DB CHECK ay walang katumban dito — ang backend Zod + bucket `file_size_limit` ang magiging double defense |
| Mga MIME type | `image/jpeg`, `image/png`, `image/webp` LANG. **WALANG SVG** (naka-store na XSS vector), walang GIF (animated/sobrang laki) | ang bucket `allowed_mime_types` = ikalawang linya ng depensa sa likod ng pag-validate ng backend |
| Filename | **Random UUID na ginawa sa backend** — hindi kailanman ginagamit ang filename mula sa client | path traversal + PII sa filename + filename collision — lahat binubura |
| Pagpalit ng larawan | i-upload muna ang bago → i-update ang DB → **i-delete ang lumang object** | walang orphan accumulation sa 1GB free tier; hindi nawawalan ng photo ang user sa gitna ng paglipat |
| Kagandahan ng seed data | ang `randomuser.me` URLs sa `photo_url` ng seed ay mananatili (demo-only, naka-label) | tingnan ang §5 na "demo vs uploaded" rule — hindi kailangang i-migrate ang seed |

## 2. Object layout (folder conventions)

```
avatars/
├── patients/{patient_id}/{uuid}.jpg     # sariling photo ng pasyente (Profile > Change photo)
├── doctors/{doctor_id}/{uuid}.jpg       # ina-upload ng admin (Doctors registry modal)
└── admins/{admin_id}/{uuid}.jpg         # admin profile photo (opsyonal; admin lang din ang nagpo-propagate)
```

- **Ang pagmamay-ari ay nasa folder** — ang `{role}/{id}/` prefix ang ginagamit

## 3. Daloy ng pag-upload (order of operations — katumbas ng encryption rules)

```
Frontend (mayroon na):     file input → image/* + ≤1MB client check → FileReader dataURL
                                   ↓  POST /api/patients/me/photo { data: dataURL }  (HTTPS, Bearer)
Backend:
  1. auth (requireAuth) → authz (BOLA scope: patient = sarili lang; admin = kahit sino)
  2. i-validate ang Zod: dataURL shape, size limit pagkatapos i-decode (≤1MB buffer)
  3. i-decode ang base64 → buffer
  4. **magic-byte sniff** (hindi sapat ang client na "Content-Type"!):
       FFD8FF → jpeg · 89504E47 → png · "RIFF....WEBP" → webp · iba = 415 Unsupported
  5. gumawa ng bagong object path (uuid) sa naka-scope na folder
  6. i-upload sa pamamagitan ng supabase-js storage (service_role client mula sa config/db.js)
  7. i-update ang `photo_url` (path lang) sa DB
  8. i-delete ang lumang object (kung `avatars/...` ang dating value)
  9. i-log sa activity_log; i-ibalik ang bagong path (+ mint na naka-sign na URL sa response)
```

- Ang pagkabigo pagkatapos ng hakbang 7 (bigong pag-delete) = umalis nang may
  orphan — tinatanggap (nakatakdang cleanup job sa phase 2, hindi katakutan).
- Rate limit: ang upload endpoint ay may sariling mas mahigpit na `express-rate-limit`
  bucket (hal. 10/hour/user) — ang pag-upload ng file ay isang abuse surface.

## 4. Paglilinaw sa pagitan ng layer (frontend ↔ backend ↔ storage)

| Layer | Responsibilidad | BAWAL |
|---|---|---|
| **Frontend** | client-side DX validation lang (uri/laki bago pa ma-upload — mabilis na feedback); nagpapadala ng dataURL sa backend; nagre-render ng naka-sign na URL na ibinigay ng API | direktang upload sa Storage gamit ang anon key; pag-store ng dataURL sa localStorage nang tuluyan (kasalukuyang `nmc.patientPhoto` = tinatanggal kapag naka-wire na); pag-gawa ng sariling storage policy sa browser |
| **Backend** | LAHAT ng authz + validation + upload + signing. Authz MUNA bago ang anumang storage/DB operation. Hindi kailanman tinatanggap ang client filename/path | pag-mint ng naka-sign na URL para sa row na wala sa scope ng requester (BOLA); pag-log ng photo bytes; paglalagay ng bucket name/key sa frontend |
| **Storage (Supabase)** | bucket-level `file_size_limit` + `allowed_mime_types` (defense in depth — tingnan ang SQL playbook sa `schema.sql`); at-rest encryption managed ng platform | **KAILANMAN ay walang pampublikong policy sa `avatars`**; walang anon/authenticated storage policy sa phase 1 — ang service_role ay lumalabas sa RLS at ito lang ang may access (pareho sa DB posture) |

**Mga natitirang panganib (tinatanggap, naka-dokumento):**
- **EXIF metadata** (GPS ng photo ng telepono) ay hindi natatanggal sa phase 1 —
  ang pag-re-encode sa pamamagitan ng `sharp` (nagtatanggal ng EXIF) ay isang
  phase-2 upgrade kung kinakailangan ng privacy review.
- Ang naka-sign na URL sa loob ng 5-min TTL ay kapag naibahagi = nakikita pa rin
  hanggang sa mag-expire — katanggap-tanggap para sa mga avatar (hindi clinical data).
- Ang magic-byte sniff ay hindi isang guarantee sa pag-parse ng image — ang
  paggamit ng **CSP + `X-Content-Type-Options: nosniff`** (nasa audit playbook
  na) ang ikatlong linya ng depensa sa mga malisyosong nilalaman.
  ng backend para i-scope ang authz: ang pasyente ay maaari lang mag-upload sa
  sariling folder niya; ang admin ay maaari sa lahat (naka-log sa `activity_log`).
- Ang `{uuid}.{ext}` ay bago sa bawat upload — walang in-place overwrite, kaya
  walang stale-CDN/cache na problema, at ang pag-delete ng lumang object ay
  eksplisito at na-o-audit.

## 5. Paglilingkod: paano makikita ng frontend ang photo

- **Tungkulin ng backend serializer:** sa bawat payload na nagdadala ng tao
  (patient/doctor/admin), kung `photo_url` ay nagsisimula sa `avatars/` → mag-mint
  ng `createSignedUrl(path, 300)` at ibigay bilang `photo` (isang kumpletong URL).
  Kung hindi (external demo URL) → ibalik nang direct.
- Ang isang patakarang ito ang gumagawa sa seed data na **zero-migration**:
  ang `randomuser.me` URLs ay patuloy na gagana hanggang sa palitan sila ng mga
  totoong upload — ang dalawang uri ng value ay magkakaiba sa prefix lang.
- Ang mga listahan (doctors directory ~18, patients registry ~26) ay nagko-compose
  ng mga naka-sign na URL kada row — mura sa laki ng clinic scale na ito; walang
  kailangan ng batch endpoint sa phase 1.

## 6. Mga alternatibo na tinanggihan (kung bakit)

| Alternatibo | bakit tinanggihan |
|---|---|
| Pampublikong bucket + CDN | permanenteng pampublikong URL ng mukha ng pasyente; walang authz; hindi katanggap-tanggap sa healthcare |
| Supabase Auth storage policies (RLS sa `storage.objects`) | phase 1 ay gumagamit ng custom JWT (walang Supabase auth uid) — walang maaring i-scope ang policy; ang backend service_role lamang ang path. Muling pagbisita sa phase 2 kung amponin ang Supabase Auth |
| Multer multipart ngayon | karagdagang dep + multipart DoS surface para sa ≤1MB avatar; ang base64 JSON ay katugma ng kasalukuyang frontend behavior |
| Pag-store ng base64 sa DB (`photo_url` = dataURL) | lumalagong bytes sa bawat row query, sinisira ang pagination/messaging payloads, at hindi ma-cache — ang Storage ang tamang tool |

## 7. Mga environment variable

**Wala** — ang `SUPABASE_URL` + service key (hingi na sa `config/db.js`) ang
sapat para sa Storage API. Ang bucket name (`avatars`) ay isang constant sa
backend (hindi env — ang pagbabago nito ay nangangailangan ng object migration,
hindi config). **Walang bagong entry sa `.env.example`.**

## 8. Checklist sa implementasyon (kapag nag-code na ng backend)

1. `database/schema.sql` STORAGE playbook (ibaba) — gumawa ng `avatars` bucket (isang beses, i-run sa Supabase SQL editor).
2. `shared/utils/storage.js` (o `config/storage.js`): path builder + magic-byte sniff + signed-URL helper sa itaas ng `db.js` client.
3. `POST /api/patients/me/photo` (patient, self) · `POST /api/patients/:id/photo` + `POST /api/doctors/:id/photo` (admin lang) — shared handler, naka-scope ng authz ang folder.
4. Serializer rule (§5) sa mga response ng patients/doctors/admin.
5. Rate limit bucket para sa upload routes; Zod schema (`dataURL`, decoded size).
6. Frontend swap targets (hiwalay na maliit na PR kapag handa na ang API): `Profile.jsx` (localStorage → API), `PatientFormModal.jsx` / `DoctorsMgmt.jsx` (FileReader → API), at patayin ang `nmc.patientPhoto` fallback.
7. Mga test: tinanggihan ang maling magic byte, tinanggihan ang sobrang laki, tinanggihan ang cross-user upload (BOLA), pag-delete ng lumang object, tinanggihan ang SVG, tamang signed-URL TTL.
8. I-verify: walang public-read policy sa bucket; ang anon key ay hindi maka-list/maka-get mula sa `avatars` (subukan gamit ang anon key!).

**Konteksto ng pag-align sa ibang layer:** `docs/SECURITY_ALIGNMENT.md` §K ·
**Mga path ng schema playbook:** `database/schema.sql` (STORAGE SETUP section) ·
**Mga endpoint ng blueprint:** `docs/BACKEND_ARCHITECTURE.md` (patients/doctors modules)