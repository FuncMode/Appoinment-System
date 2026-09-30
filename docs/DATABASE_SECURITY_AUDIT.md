# Database Security Audit — MedicaCare

**Skill:** `supabase-postgres-best-practices` (Supabase Agent Skills **v1.1.1** — kasama ang security & RLS, schema design, query patterns, connection management)
**Scope:** `database/schema.sql` (21 tables, triggers, `fn_available_slots`, commented RLS playbook, seed data)
**Date:** 2026-09-29 (re-audit; orihinal na v1.1.1 audit ay nasa `database/README.md`)
**Companion docs:** `docs/BACKEND_SECURITY_AUDIT.md` (API layer) · `docs/FRONTEND_SECURITY_AUDIT.md` (client layer)

> **Context:** ang schema ay tumatakbo sa Supabase (phase 1: backend + service_role — RLS bypass ang service role) o plain PostgreSQL. Ang commented RLS policies sa schema ay para sa **phase-2 direct Supabase Auth path**. Ang audit na ito ay nag-re-verify ng buong rule set ng skill at nag-apply ng mga security gaps na kayang i-fix sa schema level.

---

## 1. Naka-apply ngayon (2026-09-29) — mga butas na naayos sa mismong schema

| # | Gap (mula sa skill rules) | Panganib | Ayos na |
|---|---|---|---|
| 1 | **`contact_messages` wala sa RLS enable list** — may admin policy pero walang `alter table ... enable row level security` line sa commented playbook | kapag nag-enable ng RLS following the playbook, ang table na may **PII (name, email)** ay maiiwanang walang proteksyon — buo ang read/write ng kahit anong role | ✅ naidagdag ang enable line + phase-2 anon **INSERT-only** policy (commented) |
| 2 | **`doctors` / `specialties` / `doctor_weekly_availability` — "pwedeng iwanang walang RLS"** ang dating note | sa Supabase, ang table na **walang RLS** ay buo ang insert/update/delete access ng `authenticated` role — kahit sinong portal user ay pwedeng mag-DELETE ng doctor rows (security-rls-basics: denied-by-default) | ✅ pinalitan ng enable + explicit **public-read-only** policies (walang write policy = denied); mas mahigpit na note |
| 3 | **`pgcrypto` naka-install sa `public` schema** | ang extension functions sa public ay callable ng kahit sinong may schema usage; best practice ay dedicated `extensions` schema | ✅ `create schema if not exists extensions` + `create extension ... with schema extensions` + lahat ng `crypt()`/`gen_salt()` seed calls ay schema-qualified (`extensions.crypt(...)`) |
| 4 | **`v_doctor_rating_averages` view — walang security note** | default ang views ay security-definer semantics (bypass ng RLS ng base table) | ✅ naidagdag ang SECURITY note: aggregates-only ang exposure (intended), at naka-dokumento ang `with (security_invoker = true)` option sa PG15+ |
| 5 | **Walang `force row level security` guidance** | kahit may RLS, ang table owner ay hindi sakop nito by default | ✅ naidagdag sa RLS section header bilang optional hardening (ang service_role ay may BYPASSRLS — hindi maaapektuhan ang backend) |

---

## 2. Skill rules → status (buong v1.1.1 rule set, re-verified 2026-09-29)

| Rule (category) | Impact | Status | Tala |
|---|---|---|---|
| `security-rls-basics` | CRITICAL | ✅ hardened ngayon | denied-by-default playbook; **gaps #1 & #2 na-close** — lahat ng 21 tables ay mayroon nang enable + policy guidance |
| `security-rls-performance` | HIGH | ✅ (noon pa) | `(select auth.uid())` initPlan wrapping + `to authenticated` sa lahat ng policies |
| `security-privileges` | MEDIUM | ✅ note / 📋 self-hosted | Supabase: platform-managed roles; plain-PG self-hosted: i-revoke ang public defaults + dedicated app roles (tingnan §3) |
| `schema-foreign-key-indexes` | HIGH | ✅ (noon pa) | 14 FK indexes |
| `query-composite-indexes` | HIGH | ✅ (noon pa) | `idx_appointments_status_date` |
| `query-partial-indexes` | HIGH | ✅ (noon pa) | `uq_appointments_active_slot` |
| `schema-data-types` / `schema-lowercase-identifiers` | HIGH/MEDIUM | ✅ (noon pa) | text/timestamptz/numeric/enums, snake_case |
| `schema-primary-keys` | HIGH | ✅ na may tala | UUIDv4 PKs — OK sa scale; UUIDv7 kapag lumobo |
| `advanced-jsonb-indexing` | MEDIUM | ✅ documented | commented GIN index sa `lab_results.findings` |
| `monitor-vacuum-analyze` | MEDIUM | ✅ (noon pa) | `analyze;` pagkatapos ng bulk seed |
| `data-batch-inserts` | MEDIUM | ✅ (noon pa) | multi-row batch inserts ang seed |
| `data-pagination` | MEDIUM-HIGH | ℹ️ app-side | OFFSET pagination OK sa scale; keyset kapag lumobo |
| `conn-*` (connection management) | CRITICAL | ℹ️ app-side | Supabase pooler sa production; walang per-request connections sa serverless — nasa `backend/config/db.js` notes |
| `lock-*` (concurrency) | MEDIUM-HIGH | ℹ️ | booking slot conflict ay hawak ng partial unique index (DB-level, race-safe) |
| extensions placement | security | ✅ hardened ngayon | pgcrypto → `extensions` schema (gap #3) |
| seed data credentials | hygiene | ✅ documented | fictional demo lang, `crypt()`/`gen_salt('bf')` hashes (hindi plaintext); i-rotate bago i-publish |

---

## 3. Implement-later checklist (hindi kaya sa schema lang ngayon)

- [ ] **Phase-2 RLS switch-on (sabay-sabay, hindi dahan-dahan):** i-uncomment ang LAHAT ng `alter table ... enable row level security` + policies — kasama na ang bagong `contact_messages` / `doctors` / `specialties` / `doctor_weekly_availability` lines. Ang table na nauna pero kulang ang policy = denied (OK); ang table na naiwan = exposed (DELIKADO).
- [ ] **RLS policy tests** (§4 sa ibaba) bago i-publish ang phase-2 path.
- [ ] **`force row level security`** sa user-scoped tables (patients, appointments, records) kapag phase-2 na — optional pero recommended.
- [ ] **`security_invoker = true`** sa `v_doctor_rating_averages` (PG15+ lang) kung gusto mong sumailalim sa RLS ang ratings view.
- [ ] **Self-hosted plain PG lang:** `revoke all on schema public from public;` + dedicated least-privilege app roles (`grant select, insert, update on ... to app_writer`) — ayon sa security-privileges rule. Sa Supabase, platform-managed na ito.
- [ ] **Connection pooling** sa production (Supabase pooler / pgbouncer) — naka-note na sa `backend/config/db.js` stub.
- [ ] **Encryption at rest + backups/PITR** — platform-level setting sa Supabase dashboard; i-enable bago mag-load ng totoong patient data.
- [ ] **Seed credentials rotation** bago i-publish: alisin ang demo accounts o i-rotate ang passwords (naka-document na sa `database/README.md`).
- [ ] **`refresh_tokens` table** (JWT rotation) — itatype kapag may backend na (tingnan ang `BACKEND_ARCHITECTURE.md` §6): `user_id, token_hash, expires_at, revoked_at` + index sa `token_hash`.

---

## 4. Verification requirements (RLS tests kapag phase-2 na)

1. **Tenant isolation:** patient A JWT → hindi makita ang rows ni patient B sa appointments/records/notifications/labs/meds/tickets (**0 rows o 403**, hindi 200)
2. **Deny by default:** walang token (anon) → walang mababasa sa patients/appointments/records (public-read lang ang doctors/specialties/stories-approved/clinic_info)
3. **Stories moderation:** anon makakita lang ng `status='approved'`; pending/rejected ay hindi lumalabas sa public query
4. **Contact form:** anon ay **INSERT lang** — hindi makapag-read (may PII) at hindi makapag-delete
5. **Write protection sa public tables:** authenticated (non-admin) na tumangkang mag-INSERT/UPDATE/DELETE sa doctors/specialties/availability → **denied**
6. **Ratings integrity:** pasyente ay insert own lang, hindi kayang mag-update/mag-delete (computation integrity ng averages)
7. **Admin separation:** non-admin authenticated na tumangkang magbasa ng `activity_log` / `admins` rows → denied
8. **Slot race test:** dalawang sabayang booking sa parehong slot → isa lang ang pumasa (partial unique index)

---

## 5. References

- [Supabase Agent Skills — postgres best practices](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices)
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL Roles and Privileges](https://supabase.com/blog/postgres-roles-and-privileges)
- [OWASP ASVS V4 (Access Control) / V6 (Stored Crypto)](https://owasp.org/www-project-application-security-verification-standard/)
