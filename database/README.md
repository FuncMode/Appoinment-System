# MedicaCare Database — Patient Portal + Admin Console

PostgreSQL schema para sa **buong MedicaCare app** (Patient Portal + Admin
Console), handa sa **Supabase** (o kahit anong PostgreSQL 13+). Layunin:
**hindi kulang** — bawat feature ng dalawang console ay may katumbas na
table/column/function sa schema, at **walang duplicate na tables** (shared ang
patients/doctors/appointments sa dalawang console).

## Files

| File | Ano |
| --- | --- |
| `schema.sql` | Buong schema: tables, enums, indexes, triggers, slot-availability function, at commented RLS policies para sa Supabase. **Walang seed data** — blankong tables, populated ng app. |

## Paano i-run

**Supabase (recommended):**
1. Buhat ng project sa [supabase.com](https://supabase.com) → **SQL Editor**
2. I-paste ang buong `schema.sql` → **Run**
3. I-enable ang RLS policies sa dulo ng file kapag naka-Supabase Auth na

**Plain PostgreSQL / psql:**

```bash
psql -U postgres -d medicacare -f database/schema.sql
```

## Feature → Database Mapping (Patient Portal)

| Patient Portal Feature | Tables / Function |
| --- | --- |
| Register (create account) | `patients` (insert; `password_hash` — hashed, hindi plain text) |
| Login / session | `patients.email` + `patients.password_hash` (o Supabase Auth + `patients.auth_user_id`) |
| Profile: view/edit info, address, emergency contact | `patients` (update) |
| Profile: change password | `patients.password_hash` (update) |
| Profile: change photo | `patients.photo_url` (update) |
| Dashboard: next appointment banner, stats | `appointments` (query by patient + status/date), `patients` |
| Dashboard: notifications bell | `notifications` (insert on status change, `read_at` for mark-all-read) |
| Find a doctor: search + specialty/status filters | `doctors` + `specialties` |
| Doctor cards: computed rating + review count, experience, fee, room, photo | `doctors` + `v_doctor_rating_averages` (computed; laging may review count) |
| Rate your visit (completed appointments, one rating per appointment) | `visit_ratings` (insert; `UNIQUE(appointment_id)` = DB-level guard) |
| Doctor Availability: date + time slots | `doctor_weekly_availability` + `fn_available_slots()` |
| Book appointment: validation, live summary | `appointments` (insert; CHECK constraints) |
| Double-booking guard ("booked slots are disabled") | `uq_appointments_active_slot` (partial unique index) + `fn_available_slots` |
| Booking Confirmation: reference number | `appointments.reference_code` (auto: `AP-000123`) |
| Appointment Status: progress timeline | `appointments.status` + `appointment_status_history` (auto ng trigger) |
| Appointment History: search/filter/sort/pagination | `appointments` + indexes (`idx_appointments_patient/status`) |
| Appointment Details: receipt + .ics download | `appointments` + `patients` + `doctors` (join) |
| Reschedule (new date + available slots) | `appointments` update + `fn_available_slots` (own slot excluded via history/status) |
| Cancel appointment | `appointments.status = 'cancelled'` + `cancelled_at` (trigger) |
| Medical Records: table + health summary | `medical_records` + `patients` (blood_type, allergies, emergency_contact) |
| Help & Support: FAQs, contact info | Static UI content — walang table na kailangan (phase 2 kung dynamic) |
| Help & Support: Share your experience | `patient_stories` (insert as `pending`; display name lang ang publishable) |

## Admin Console → Database Mapping

| Admin Console Feature | Tables / Function |
| --- | --- |
| Admin Login (`#/admin/login`) | `admins` (email + `password_hash`, o Supabase Auth + `admins.auth_user_id`) |
| Topbar user card + logout | `admins` (identity, role) |
| Dashboard: today's appointments, pending, totals, activity chart | `appointments` + `patients` + `doctors` (computed queries; walang kailangang extra table) |
| Dashboard: pending reviews, today's schedule | `appointments` (query by status/date) |
| Dashboard / Patients / Doctors / Appointments: CSV export | Data mula sa mga table + `downloadFile` sa app |
| Patients Management: list, search, gender filter, add, delete | `patients` (CRUD) |
| Doctors Management: list, search, add, edit (status, fee, room, photo), delete | `doctors` (CRUD) + `specialties` |
| Doctors Management: weekly availability editor | `doctor_weekly_availability` (per-doctor day rows) |
| Appointments Management: list, search, status filter, sort, pagination | `appointments` + `SortableTh` sa app |
| Appointments Management: inline status update (Pending → Confirmed → …) | `appointments.status` update + auto `appointment_status_history` (trigger) |
| Appointments Management: create (live availability) | `appointments` insert + `fn_available_slots()` |
| Appointments Management: view details, delete | `appointments` (read/delete) + ConfirmModal |
| Reports: stats, per-specialty breakdown, busiest doctors, CSV | Computed queries sa `appointments`/`doctors`/`medical_records` |
| Settings: Clinic information | `clinic_info` (singleton row, id = 1) |
| Settings: Appointment preferences (email flags, auto-confirm, slot interval) | `app_settings` (singleton row, id = 1) |
| Settings: persistence note | Singleton rows sa DB — totoong persistence, hindi na in-memory |
| Patient stories: moderation (Approve / Reject / Unpublish / Restore) | `patient_stories` (status update + `reviewed_at` / `reviewed_by` audit trail) |
| Patient stories: sidebar badge (pending count) | `patient_stories` (query by status = 'pending') |

## Conventions

- **snake_case** columns; **UUID** primary keys (`gen_random_uuid()`)
- **Enums** sa fixed-value fields (`appointment_status`, `doctor_status`, `gender`)
- **`timestamptz`** sa lahat ng timestamps; `updated_at` ay auto (trigger)
- **Reference numbers**: `appointments.reference_code` = `AP-` + 6-digit sequence
- **Money**: `numeric(10,2)` (hindi float)
- **Em dash** sa SQL comments: exempt sa R-02 (hindi UI text)

## Security notes (importante)

1. **Password**: `password_hash` lang ang itatago — i-hash sa app side
   (bcrypt/argon2) o gumamit ng Supabase Auth. Bawal ang plain text
   (pareho ng itinuro ng audit-002 #4).
2. **RLS**: naka-comment sa dulo ng schema ang ready-made policies. I-enable
   lang kapag naka-Supabase Auth na; walang policy = denied by default.
3. **service_role key**: huwag ilalagay sa frontend. Sa prototype, ang
   kaya ng app ay client-side lang — sa totoong deployment, API/RLS ang
   gagawa ng verification (tingnan din ang README.md "Limitations").

## Next steps (pagkatapos i-wire sa Supabase)

1. I-uncomment ang RLS policies sa `schema.sql` kapag naka-Supabase Auth na
   (patient + admin policies).
2. I-wire ang frontend gamit ang `supabase-js` — una ang auth (register/login),
   tapos appointments (book/list/reschedule/cancel gamit ang
   `fn_available_slots`), tapos profile, records, notifications.
3. Admin console wiring: login sa `admins`, CRUD sa
   patients/doctors/appointments, settings sa `clinic_info` + `app_settings`
   (dito magiging totoo ang mga preference flags).
4. Phase 3 (optional): audit log table, email reminders integration
   (kapag may backend), at notification triggers na nagpopopulate ng
   `notifications` tuwing may status change.
