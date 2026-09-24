-- ============================================================
-- MedicaCare — Database Schema (PostgreSQL 13+)
-- Target: Supabase (SQL Editor) o kahit anong plain PostgreSQL
-- Scope: LAHAT ng features ng Public pages + Patient Portal + Admin Console
--        + Doctor portal (tingnan ang database/README.md para sa
--        feature -> table mapping)
-- Auth note: kasama ang password_hash columns; kung gagamit ka ng Supabase
--        Auth, i-link ang patients.auth_user_id at admins.auth_user_id sa
--        auth.users (tingnan ang RLS section sa dulo).
-- ============================================================

-- ------------------------------------------------------------
-- Enumerations
-- ------------------------------------------------------------
-- 'no-show' — doctor-side status sa Doctor portal ("Patient did not arrive").
--   Hindi kasama sa uq_appointments_active_slot (pending/confirmed lang) kaya
--   automatic na napapalaya ang slot — pareho ng cancellation, pero
--   nire-report hindi binubura (tugma sa isSlotTaken behavior ng app).
--   Existing deployments: alter type appointment_status add value 'no-show' after 'cancelled';
-- 'on-leave' — hyphen, tugma sa doctorStatusMeta() values ng app (hindi 'on_leave').
create type appointment_status   as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no-show');
create type doctor_status        as enum ('available', 'busy', 'on-leave');
create type gender               as enum ('male', 'female', 'other');
create type testimonial_status   as enum ('pending', 'approved', 'rejected');
create type lab_result_status    as enum ('final', 'pending');        -- app labels: 'Final' / 'Pending'
create type medication_status    as enum ('active', 'completed');     -- app labels: 'Active' / 'Completed'
create type support_ticket_status as enum ('open', 'resolved');

-- Reference number sequence para sa Booking Confirmation ("AP-000123")
create sequence appointment_ref_seq start 1;

-- ------------------------------------------------------------
-- patients — Register / Login / Profile / Records health summary
--   - password_hash: i-hash sa app (bcrypt/argon2) — HUWAG plain text
--     (aral mula sa audit-002 #4). O gamitin ang Supabase Auth.
--   - age: derived na mula sa date_of_birth (hindi na stored)
--   - photo_url: patient-uploaded photo (Profile > Change photo)
-- ------------------------------------------------------------
create table patients (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  email             text not null unique,
  phone             text not null,
  password_hash     text not null,
  gender            gender,
  date_of_birth     date,
  blood_type        text,
  allergies         text,
  address           text,
  emergency_contact text,
  photo_url         text,
  email_reminders   boolean not null default true,     -- Profile > "Email reminders" toggle
  portal_notifications boolean not null default true,  -- Profile > "Portal notifications" toggle
  last_visit_date   date,
  created_at        timestamptz not null default now(),   -- "Joined"
  updated_at        timestamptz not null default now()
  -- auth_user_id   uuid references auth.users(id) on delete set null  -- (Supabase Auth; i-uncomment)
);

-- ------------------------------------------------------------
-- specialties — lookup (Doctor filters, Landing care finder, Reports)
-- ------------------------------------------------------------
create table specialties (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ------------------------------------------------------------
-- doctors — Find a doctor / Availability / booking / records
--   - status: live availability ("Available / Busy today / On leave")
--   - HINDI na stored ang rating dito: ang displayed average ay computed
--     mula sa visit_ratings (tingnan ang v_doctor_rating_averages view sa
--     ibaba) at laging ipinapakita kasama ang review count
-- ------------------------------------------------------------
create table doctors (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  specialty_id        uuid not null references specialties(id),
  status              doctor_status not null default 'available',
  years_of_experience int not null default 0 check (years_of_experience >= 0),
  consultation_fee    numeric(10, 2) not null check (consultation_fee >= 0),
  room                text not null,
  gender              gender,
  photo_url           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- FK index: specialty filter/join sa doctor directory + reports
-- (hindi auto-indexed ang FK columns — schema-foreign-key-indexes rule)
create index idx_doctors_specialty on doctors (specialty_id);

-- ------------------------------------------------------------
-- doctor_accounts — Doctor portal login (admin-issued access)
--   - Grant / reset / revoke mula sa Admin console > Doctors page
--     ("Portal access" fields); isang account bawat doctor (UNIQUE doctor_id).
--   - password: min 8 characters sa app; i-hash (bcrypt/argon2) bago i-save.
-- ------------------------------------------------------------
create table doctor_accounts (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid not null unique references doctors(id) on delete cascade,
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
  -- auth_user_id uuid references auth.users(id) on delete set null  -- (Supabase Auth; i-uncomment)
);

-- ------------------------------------------------------------
-- doctor_weekly_availability — Doctor Availability screen
--   - weekday: 1 = Monday ... 7 = Sunday (ISO; tugma sa extract(isodow))
--   - start/end_time: working hours; ginalaw mula rito ang booking slots
--     (tingnan ang fn_available_slots sa ibaba)
-- ------------------------------------------------------------
create table doctor_weekly_availability (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references doctors(id) on delete cascade,
  weekday    smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time   time not null,
  unique (doctor_id, weekday, start_time)
);

-- ------------------------------------------------------------
-- appointments — Book / Confirmation / Status / History / Details /
--                Reschedule / Cancel
--   - reference_code: ipinapakita sa Booking Confirmation ("AP-000123")
--   - status timeline: pending -> confirmed -> completed | cancelled | no-show
--   - contact_number / additional_notes: kinokolekta ng booking form
--   - booked_for: "Who is this visit for?" — pangalan ng family member kapag
--     proxy booking; NULL = para sa account owner mismo
--   - notes: visit notes na isinusulat ng doctor sa "Complete visit" (min 10,
--     max 500 chars — tugma sa app validation; NULL = hindi pa kumpleto)
--   - Double-booking guard: partial unique index sa ibaba (isang aktibong
--     appointment per doctor+date+slot — pareho ng "booked slots are
--     disabled" behavior ng prototype)
-- ------------------------------------------------------------
create table appointments (
  id               uuid primary key default gen_random_uuid(),
  reference_code   text not null unique default ('AP-' || lpad(nextval('appointment_ref_seq')::text, 6, '0')),
  patient_id       uuid not null references patients(id) on delete cascade,
  doctor_id        uuid not null references doctors(id) on delete restrict,
  appointment_date date not null,
  start_time       time not null,
  end_time         time not null,
  reason           text not null check (char_length(reason) between 1 and 500),
  additional_notes text,
  contact_number   text not null,
  booked_for       text,  -- proxy booking: pangalan ng pinag-book-an; NULL = self
  is_first_visit   boolean not null default true,  -- "Is this your first visit with this doctor?" (booking form)
  status           appointment_status not null default 'pending',
  notes            text check (notes is null or char_length(notes) between 10 and 500),  -- doctor's visit notes ("Complete visit")
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  confirmed_at     timestamptz,
  completed_at     timestamptz,
  cancelled_at     timestamptz,
  check (end_time > start_time)
);

-- Isang aktibong appointment per doctor+date+slot; ang cancelled/completed
-- ay nagpapalaya ng slot (pareho ng prototype behavior).
create unique index uq_appointments_active_slot
  on appointments (doctor_id, appointment_date, start_time)
  where status in ('pending', 'confirmed');

create index idx_appointments_patient   on appointments (patient_id, appointment_date desc);
create index idx_appointments_doctor    on appointments (doctor_id, appointment_date);
-- Composite (status =, appointment_date range) — query-composite-indexes rule:
-- isang index scan para sa status-filtered lists/dashboard, hindi dalawang
-- hiwalay na single-column indexes.
create index idx_appointments_status_date on appointments (status, appointment_date);

-- ------------------------------------------------------------
-- appointment_status_history — Status timeline ("Booked -> Reviewed by
--   staff -> Confirmed -> Visit completed") + audit trail
--   Auto-populated ng trigger sa bawat insert/status change.
-- ------------------------------------------------------------
create table appointment_status_history (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  from_status    appointment_status,
  to_status      appointment_status not null,
  created_at     timestamptz not null default now()
);

-- FK index: timeline lookup + fast ON DELETE CASCADE (FK index rule)
create index idx_status_history_appointment on appointment_status_history (appointment_id, created_at);

-- ------------------------------------------------------------
-- medical_records — Medical Records screen (table + health summary source)
--   - record_type: 'Consultation', 'Laboratory result', atbp.
--   - appointment_id: optional link kapag galing ang record sa isang visit
--   - Flow: kapag nag-"Complete visit" ang doctor (notes sa appointments.notes),
--     gumagawa ang app ng record dito (record_type 'Consultation',
--     title = reason, summary = notes) — kasama itong lumalabas sa patient's
--     Medical Records page kasama ang lab_results + medications sa ibaba.
-- ------------------------------------------------------------
create table medical_records (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id) on delete cascade,
  doctor_id      uuid references doctors(id) on delete set null,  -- nullable: staff-encoded records pwedeng walang doktor
  appointment_id uuid references appointments(id) on delete set null,
  visit_date     date not null,
  record_type    text not null,
  title          text not null,
  summary        text not null,
  created_at     timestamptz not null default now()
);

create index idx_medical_records_patient on medical_records (patient_id, visit_date desc);
create index idx_medical_records_doctor on medical_records (doctor_id);          -- FK index
create index idx_medical_records_appointment on medical_records (appointment_id); -- FK index (details page join)

-- ------------------------------------------------------------
-- notifications — Topbar bell (unread dot, "Mark all as read")
--   Sa prototype derived mula sa appointments; sa DB, totoong table na
--   para may read/unread state at para maging totoo ang "Mark all as read".
--   - type: appointment_status enum — kasama na ang 'no-show' notification.
-- ------------------------------------------------------------
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  type           appointment_status not null,
  title          text not null,
  message        text not null,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index idx_notifications_patient on notifications (patient_id, read_at, created_at desc);
create index idx_notifications_appointment on notifications (appointment_id);      -- FK index

-- ------------------------------------------------------------
-- visit_ratings — "Rate your visit" (patient portal, completed appointments)
--   - isang rating bawat appointment: ang UNIQUE(appointment_id) ay ang
--     one-rating-per-appointment guard ng UI, naka-enforce din sa DB level
--   - stars: 1–5; comment: optional, max 300 chars (tugma sa app validation)
--   - Ang displayed average ng doktor ay computed mula rito (tingnan ang
--     v_doctor_rating_averages view) at laging ipinapakita kasama ang
--     review count; hinding-hindi ginagamit na ranking/sorting ng doctors
-- ------------------------------------------------------------
create table visit_ratings (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  patient_id     uuid not null references patients(id) on delete cascade,
  doctor_id      uuid not null references doctors(id) on delete cascade,
  stars          smallint not null check (stars between 1 and 5),
  comment        text check (char_length(comment) <= 300),
  created_at     timestamptz not null default now()
);

create index idx_visit_ratings_doctor on visit_ratings (doctor_id);
create index idx_visit_ratings_patient on visit_ratings (patient_id);              -- FK index + RLS policy column

-- Computed averages para sa Doctor cards / Admin Doctors table. Laging
-- ipapares ang avg_rating sa rating_count sa display (small samples stay
-- labeled; walang rating = walang ipinapakita, hindi invented number).
create view v_doctor_rating_averages as
select
  doctor_id,
  round(avg(stars)::numeric, 1) as avg_rating,
  count(*)                      as rating_count
from visit_ratings
group by doctor_id;

-- ============================================================
-- DOCTOR PORTAL + SHARED FEATURES
-- (doctor accounts, structured records, proxy booking, messaging,
--  audit trail — bawat isa ay may katumbas na screen sa app)
-- ============================================================

-- ------------------------------------------------------------
-- lab_results — Admin-encoded lab work > patient Medical Records
--   ("Lab results" section ng Medical Records page).
--   - findings: JSON array ng {item, value, unit, range, flag};
--     flag: 'high' | 'low' | null (null = normal sa app).
--   - status: 'final' / 'pending' (app labels: 'Final' / 'Pending').
-- ------------------------------------------------------------
create table lab_results (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  doctor_id   uuid references doctors(id) on delete set null,
  test_name   text not null,
  category    text,
  status      lab_result_status not null default 'final',
  result_date date not null,
  findings    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index idx_lab_results_patient on lab_results (patient_id, result_date desc);
create index idx_lab_results_doctor on lab_results (doctor_id);                    -- FK index
-- JSONB note (advanced-jsonb-indexing rule): walang containment (@>) queries
-- ang app sa findings, kaya walang index ngayon. Kapag nagdagdag ng JSONB
-- filtering (hal. findings @> '{"flag":"high"}'), i-uncomment:
-- create index idx_lab_results_findings_gin on lab_results using gin (findings);

-- ------------------------------------------------------------
-- medications — Admin-encoded prescriptions > patient Medical Records
--   ("Medications" section; prescriber ay required sa form, kaya NOT NULL).
-- ------------------------------------------------------------
create table medications (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id) on delete cascade,
  doctor_id      uuid not null references doctors(id) on delete restrict,  -- prescriber
  appointment_id uuid references appointments(id) on delete set null,
  name           text not null,
  dose           text,
  form           text,
  frequency      text not null,
  start_date     date,
  status         medication_status not null default 'active',  -- app labels: 'Active' / 'Completed'
  instructions   text,
  created_at     timestamptz not null default now()
);

create index idx_medications_patient on medications (patient_id, start_date desc);
create index idx_medications_doctor on medications (doctor_id);                    -- FK index
create index idx_medications_appointment on medications (appointment_id);          -- FK index

-- ------------------------------------------------------------
-- patient_family_members — proxy booking ("Who is this visit for?")
--   Managed sa Profile page; ang appointments.booked_for ang snapshot ng
--   pangalan sa mismong booking (hindi FK — nama-manage ang members nang
--   hiwalay sa historical bookings).
-- ------------------------------------------------------------
create table patient_family_members (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  full_name  text not null,
  relation   text not null,
  age        smallint check (age is null or age >= 0),
  created_at timestamptz not null default now()
);

create index idx_patient_family_members on patient_family_members (patient_id);

-- ------------------------------------------------------------
-- support_tickets + support_ticket_messages — "Message the clinic"
--   (patient portal "My messages" <-> admin "Patient messages" page)
--   Thread model: ang unang mensahe ng pasyente ay ang unang row sa
--   support_ticket_messages (sender = 'patient'); ang staff replies at
--   patient follow-ups ay karagdagang rows — two-way ang usapan.
--   - subject: 1-80 chars; body: 1-500 (unang message at follow-up ay
--     10+ chars sa app validation)
--   - status: 'open' hanggang mag-reply ang staff (nagiging 'resolved');
--     ang patient follow-up ay nagbubukas ulit (balik 'open')
-- ------------------------------------------------------------
create table support_tickets (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  subject    text not null check (char_length(subject) between 1 and 80),
  status     support_ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table support_ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references support_tickets(id) on delete cascade,
  sender      text not null check (sender in ('patient', 'staff')),
  author_name text,  -- display name nuong nagpadala (audit trail)
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index idx_support_tickets_patient on support_tickets (patient_id, created_at desc);
create index idx_support_tickets_status  on support_tickets (status);
create index idx_support_messages_ticket on support_ticket_messages (ticket_id, created_at);

-- ------------------------------------------------------------
-- activity_log — Admin > Activity page (audit trail ng lahat ng roles)
--   Ang patient / doctor / staff actions ay nire-record dito (ang store ay
--   may 20-entry cap; sa DB, buong trail). Ang actor ay display name (text)
--   dahil pwedeng patient, doctor, o admin — walang single FK na lupal.
-- ------------------------------------------------------------
create table activity_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);

create index idx_activity_log_created on activity_log (created_at desc);

-- ============================================================
-- ADMIN CONSOLE — walang duplicate: ang patients, doctors, specialties,
-- doctor_weekly_availability, appointments, appointment_status_history,
-- medical_records at notifications sa itaas ay SHARED ng patient portal at
-- admin console (iisa lang ang source of truth ng data).
-- Ang mga sumusunod ay admin-specific lang:
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- admins — Admin Login (#/admin/login) + admin identity (Topbar user card)
--   - role: text para flexible ("Administrator", "Staff", atbp.)
--   - password_hash: i-hash sa app (bcrypt/argon2) — HUWAG plain text
-- ------------------------------------------------------------
create table admins (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'Administrator',
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
  -- auth_user_id uuid references auth.users(id) on delete set null  -- (Supabase Auth; i-uncomment)
);

-- ------------------------------------------------------------
-- patient_stories — "Share your experience" (Help & support) → admin
--   moderation ("Patient stories" page) → public "What patients say" carousel
--   - display_name lang ang ipinapakita sa publiko (hindi ang account identity;
--     ang reviewed_by admins link ay para lang sa audit trail ng moderation)
--   - status: pending → approved | rejected (terminal sa prototype flow;
--     ang Unpublish/Restore actions sa UI ay balik sa 'pending')
--   - CHECK limits: tugma sa form validation (display name ≤ 40, quote 30–280)
-- ------------------------------------------------------------
create table patient_stories (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  quote        text not null check (char_length(quote) between 30 and 280),
  status       testimonial_status not null default 'pending',
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references admins(id) on delete set null
);

create index idx_patient_stories_status on patient_stories (status, created_at desc);
create index idx_patient_stories_patient on patient_stories (patient_id);          -- FK index + RLS policy column

-- ------------------------------------------------------------
-- clinic_info — Settings > Clinic information (singleton row, id = 1)
--   Binabasa din ng public pages (footer, Contact) at ng patient portal.
--   hours: per-day JSONB — bawat key ay mon..sun, value = [open, close]
--   (24h strings) o null kapag sarado. Ito ang source ng "Open now /
--   Closed" pill (ClinicStatus component) at ng footer clinic hours —
--   kaya mapapagalaw na ng admin ang schedule mula sa Settings.
--   Note: ang app ngayon ay readonly ito mula sa constants; sa DB,
--   ito ang totoong source na pagbabago ng admin.
-- ------------------------------------------------------------
create table clinic_info (
  id         int primary key default 1 check (id = 1),
  name       text not null,
  phone      text not null,
  email      text not null,
  address    text,
  hours      jsonb not null default '{
    "mon": ["08:00", "17:00"],
    "tue": ["08:00", "17:00"],
    "wed": ["08:00", "17:00"],
    "thu": ["08:00", "17:00"],
    "fri": ["08:00", "17:00"],
    "sat": ["09:00", "13:00"],
    "sun": null
  }'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- app_settings — Settings > Appointment preferences (singleton row, id = 1)
--   - email_admins_on_new_appointment / remind_patients: mailing list flags
--     (magiging totoong email kapag may backend/integration na)
--   - auto_confirm_appointments: kapag true, ang bagong booking ay
--     diretso 'confirmed' instead of 'pending' (i-wire sa booking flow)
--   - slot_interval_minutes: interval ng time slots sa booking form
--     (15 / 30 / 60 — tugma sa dropdown ng Settings)
-- ------------------------------------------------------------
create table app_settings (
  id                               int primary key default 1 check (id = 1),
  email_admins_on_new_appointment  boolean not null default true,
  remind_patients                  boolean not null default true,
  auto_confirm_appointments        boolean not null default false,
  slot_interval_minutes            smallint not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  updated_at                       timestamptz not null default now()
);

-- ============================================================
-- Triggers
-- ============================================================

-- updated_at sa bawat update
create or replace function fn_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_patients_updated_at   before update on patients   for each row execute function fn_set_updated_at();
create trigger trg_doctors_updated_at    before update on doctors    for each row execute function fn_set_updated_at();
create trigger trg_doctor_accounts_updated_at before update on doctor_accounts for each row execute function fn_set_updated_at();
create trigger trg_appointments_updated_at before update on appointments for each row execute function fn_set_updated_at();
create trigger trg_admins_updated_at      before update on admins      for each row execute function fn_set_updated_at();
create trigger trg_support_tickets_updated_at before update on support_tickets for each row execute function fn_set_updated_at();
create trigger trg_clinic_info_updated_at before update on clinic_info for each row execute function fn_set_updated_at();
create trigger trg_app_settings_updated_at before update on app_settings for each row execute function fn_set_updated_at();

-- Status timestamps + automatic status history (status timeline feature)
create or replace function fn_appointment_status_change() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into appointment_status_history (appointment_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif (new.status is distinct from old.status) then
    if new.status = 'confirmed' then new.confirmed_at = now(); end if;
    if new.status = 'completed' then new.completed_at = now(); end if;
    if new.status = 'cancelled' then new.cancelled_at = now(); end if;
    insert into appointment_status_history (appointment_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger trg_appointment_status_change
  before insert or update of status on appointments
  for each row execute function fn_appointment_status_change();

-- ============================================================
-- Available slots function — Doctor Availability + booking form
--   Ginalaw na slots mula sa weekly availability ng doctor, may "taken"
--   flag kung may aktibong (pending/confirmed) appointment sa slot.
--   p_exclude_appt_id (optional): appointment na hindi ituturing na taken —
--   ginagamit ng Reschedule modal para manatiling selectable ang
--   kasalukuyang slot ng pasyente (parity ng JS getSlotsFor(…, excludeApptId)).
--   Halimbawa:
--     select * from fn_available_slots('<doctor uuid>', current_date, 30);
--     select * from fn_available_slots('<doctor uuid>', current_date, 30, '<appt uuid>');
-- ============================================================
create or replace function fn_available_slots(
  p_doctor_id       uuid,
  p_date            date,
  p_slot_minutes    int default 30,
  p_exclude_appt_id uuid default null
)
returns table (slot_start time, slot_end time, is_available boolean)
language sql
stable
as $$
  with avail as (
    select
      extract(epoch from a.start_time)::int as start_sec,
      extract(epoch from a.end_time)::int   as end_sec
    from doctor_weekly_availability a
    where a.doctor_id = p_doctor_id
      and a.weekday = extract(isodow from p_date)::smallint
  ),
  -- Seconds-since-midnight ang arithmetic (hindi time + interval na
  -- nagwi-wrap sa midnight, kaya walang phantom slots); 96 slots x 15-min
  -- interval = 24h na coverage (sapat kahit anong shift; sa 30/60-min
  -- interval, mas mahaba pa ang covered na oras).
  slots as (
    select
      v.start_sec + s * p_slot_minutes * 60                         as slot_start_sec,
      least(v.end_sec, v.start_sec + (s + 1) * p_slot_minutes * 60) as slot_end_sec
    from avail v
    cross join generate_series(0, 95) as s
    where v.start_sec + (s + 1) * p_slot_minutes * 60 <= v.end_sec
  )
  select
    (time '00:00' + make_interval(secs => sl.slot_start_sec))::time,
    (time '00:00' + make_interval(secs => sl.slot_end_sec))::time,
    not exists (
      select 1
      from appointments ap
      where ap.doctor_id = p_doctor_id
        and ap.appointment_date = p_date
        and ap.status in ('pending', 'confirmed')
        -- Reschedule: ang sariling appointment ng pasyente ay hindi tinuturing
        -- na taken para manatiling selectable ang kasalukuyang slot niya
        and (p_exclude_appt_id is null or ap.id <> p_exclude_appt_id)
        and sl.slot_start_sec < extract(epoch from ap.end_time)::int
        and sl.slot_end_sec   > extract(epoch from ap.start_time)::int
    ) as is_available
  from slots sl
  order by sl.slot_start_sec;
$$;

-- ============================================================
-- Supabase Row Level Security (RLS) — i-uncomment kapag naka-Supabase Auth
--   Prerequisite: i-link ang patients.auth_user_id sa auth.users(id).
--   Ang walang policy na table ay DENIED by default kapag naka-enable ang
--   RLS, kaya i-enable at i-policy ang bawat isa nang sabay-sabay.
--   RLS performance (security-rls-performance rule): bawat auth.uid() call ay
--   naka-wrap sa (select auth.uid()) para isang beses lang per query (initPlan,
--   cached) — hindi per-row. Lahat ng policy columns (patient_id, doctor_id,
--   ticket_id, atbp.) ay may indexes sa schema sa itaas. Kailangan din ang
--   to authenticated sa mga user-scoped policies para hindi tumama sa anon.
-- ============================================================
-- alter table patients enable row level security;
-- alter table appointments enable row level security;
-- alter table appointment_status_history enable row level security;
-- alter table medical_records enable row level security;
-- alter table notifications enable row level security;
-- alter table visit_ratings enable row level security;
-- alter table patient_stories enable row level security;
--
-- create policy "patients read own profile" on patients
--   to authenticated
--   for select using (auth_user_id = (select auth.uid()));
-- create policy "patients update own profile" on patients
--   to authenticated
--   for update using (auth_user_id = (select auth.uid()));
-- create policy "patients read own appointments" on appointments
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients create own appointments" on appointments
--   to authenticated
--   for insert with check (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients read own status history" on appointment_status_history
--   to authenticated
--   for select using (appointment_id in (
--     select id from appointments where patient_id in (select id from patients where auth_user_id = (select auth.uid()))));
-- create policy "patients read own records" on medical_records
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients read own notifications" on notifications
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients update own notifications" on notifications
--   to authenticated
--   for update using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
--
-- Visit ratings: pasyente ay insert + read own lang (hindi nito mae-edit o
-- made-delete ang sarili o ng iba — buo ang computation integrity); ang
-- public na pagbasa ng averages ay dadaan sa service_role/security-definer
-- na wiring kapag naka-backend na.
-- create policy "patients insert own visit ratings" on visit_ratings
--   to authenticated
--   for insert with check (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients read own visit ratings" on visit_ratings
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
--
-- Patient stories: insert own (lalabas as 'pending'), read own, at public
-- read ng approved lang (public carousel; ang pending/rejected ay private).
-- create policy "patients insert own stories" on patient_stories
--   to authenticated
--   for insert with check (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients read own stories" on patient_stories
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "public read approved stories" on patient_stories
--   for select using (status = 'approved');
--
-- Doctor portal: ang doctor account ay naka-link sa doctors (doctor_id) —
-- i-link ang doctor_accounts.auth_user_id sa auth.users kapag naka-Supabase
-- Auth, tapos i-scope ang appointments/doctors queries sa doctor na iyon
-- (hal. appointments kung saan doctor_id = (select doctor_id from
-- doctor_accounts where auth_user_id = (select auth.uid()))).
-- alter table doctor_accounts enable row level security;
-- create policy "doctors read own account" on doctor_accounts
--   to authenticated
--   for select using (auth_user_id = (select auth.uid()));
-- create policy "doctors update own account" on doctor_accounts
--   to authenticated
--   for update using (auth_user_id = (select auth.uid()));
--
-- Lab results / medications: pasyente ay read own lang (admin/service_role
-- ang nag-e-encode); family members: full CRUD sa sarili.
-- alter table lab_results enable row level security;
-- alter table medications enable row level security;
-- alter table patient_family_members enable row level security;
-- create policy "patients read own lab results" on lab_results
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients read own medications" on medications
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients manage own family members" on patient_family_members
--   to authenticated
--   for all using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
--
-- Support messages: pasyente ay insert own + read own tickets; ang staff
-- replies ay service_role/backend (tingnan din ang admin policies sa ibaba).
-- alter table support_tickets enable row level security;
-- alter table support_ticket_messages enable row level security;
-- create policy "patients insert own tickets" on support_tickets
--   to authenticated
--   for insert with check (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients read own tickets" on support_tickets
--   to authenticated
--   for select using (patient_id in (select id from patients where auth_user_id = (select auth.uid())));
-- create policy "patients read own ticket messages" on support_ticket_messages
--   to authenticated
--   for select using (ticket_id in (
--     select id from support_tickets where patient_id in (select id from patients where auth_user_id = (select auth.uid()))));
-- create policy "patients insert own ticket messages" on support_ticket_messages
--   to authenticated
--   for insert with check (
--     sender = 'patient' and ticket_id in (
--       select id from support_tickets where patient_id in (select id from patients where auth_user_id = (select auth.uid()))));
--
-- Activity log: read ay admin lang (ang writes ay galing sa backend /
-- service_role mula sa lahat ng roles — tingnan ang admin policies sa ibaba).
-- alter table activity_log enable row level security;
--
-- Ang doctors / specialties / doctor_weekly_availability ay public read
-- (marketing + booking data) — pwedeng iwanang walang RLS o gawan ng
-- "public read" policy; ang WRITE dito ay admin-only (phase 2) o
-- service_role lang habang prototype pa.
--
-- ============================================================
-- ADMIN CONSOLE RLS (i-uncomment kasama ng mga nasa itaas)
-- ============================================================
-- alter table admins enable row level security;
-- alter table clinic_info enable row level security;
-- alter table app_settings enable row level security;
--
-- create policy "admins read own profile" on admins
--   to authenticated
--   for select using (auth_user_id = (select auth.uid()));
-- create policy "admins update own profile" on admins
--   to authenticated
--   for update using (auth_user_id = (select auth.uid()));
--
-- Admin full access sa shared data (patients/appointments/doctors/records);
-- ang patient policies sa itaas ang nagli-limit sa patient side.
-- create policy "admins manage appointments" on appointments
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins manage doctors" on doctors
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins manage patients" on patients
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
--
-- Public read ng clinic info (footer/Contact); write ay admin/service_role:
-- create policy "public read clinic info" on clinic_info
--   for select using (true);
-- create policy "admins update clinic info" on clinic_info
--   for update using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins read app settings" on app_settings
--   for select using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins update app settings" on app_settings
--   for update using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
--
-- Admin access sa mga bagong tables (labs/meds encoding, support replies,
-- doctor portal access management, activity trail):
-- create policy "admins manage doctor accounts" on doctor_accounts
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins manage lab results" on lab_results
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins manage medications" on medications
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins manage support tickets" on support_tickets
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins manage support ticket messages" on support_ticket_messages
--   for all using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
-- create policy "admins read activity log" on activity_log
--   for select using (
--     exists (select 1 from admins where auth_user_id = (select auth.uid()))
--   );
--
-- Least privilege (security-privileges rule): sa Supabase, ang anon/
-- authenticated/service_role roles ay platform-managed — ang RLS sa itaas
-- ang nagli-limit ng access; walang superuser na dapat gamitin sa app.



-- ============================================================
-- SEED DATA — fictional demo data ng buong app (public pages +
-- Patient Portal + Admin Console + Doctor portal)
--   - FICTIONAL lahat: pangalan, email, phone, address, atbp. — demo/test
--     data lang (walang totoong pasyente, tugma sa "no real patient data"
--     rule ng project)
--   - Demo login credentials (pareho ng ipinapakita ng app sa login screens):
--       Patient : patient@medicacare.ph / patient123
--       Admin   : admin@medicacare.ph   / admin123
--       Doctor  : doctor@medicacare.ph  / doctor123
--   - Password hashes: crypt() mula sa pgcrypto — hindi plain text
--   - I-run KASAMA ng schema.sql sa bagong database lamang (hindi idempotent
--     ang mga INSERT; i-run ulit = magdo-doble/mag-e-error)
--   - Fixed UUID scheme para madaling i-reference ang seed rows:
--       doctors      00000000-0000-4000-8000-0000000000<ord 01-18>
--       patients     10000000-0000-4000-8000-0000000000<ord 01-24>
--       appointments 20000000-0000-4000-8000-0000000000<n>
--       demo visits  30000000-0000-4000-8000-0000000000<n>
--       admin        40000000-0000-4000-8000-000000000001
--       tickets      50000000-0000-4000-8000-0000000000<n>
-- ============================================================
create extension if not exists pgcrypto;  -- crypt()/gen_salt() para sa password hashes

-- Specialties (10 — SPECIALTIES ng app)
insert into specialties (name) values
  ('Cardiology'), ('Pediatrics'), ('Dermatology'), ('Neurology'),
  ('OB-GYN'), ('Orthopedics'), ('ENT'), ('Psychiatry'),
  ('Internal Medicine'), ('Family Medicine');

-- clinic_info singleton (HOSPITAL constants ng app — footer/Contact/Settings).
-- hours: eksaktong tugma ng hardcoded schedule ng app (ClinicStatus pill +
-- footer: Mon–Fri 8AM–5PM, Sat 9AM–1PM, Sun closed).
insert into clinic_info (id, name, phone, email, address, hours) values
  (1, 'MedicaCare', '+63 (2) 8567 4400', 'care@medicacare.ph',
   '221 Rizal Avenue, Quezon City, Metro Manila',
   '{"mon":["08:00","17:00"],"tue":["08:00","17:00"],"wed":["08:00","17:00"],"thu":["08:00","17:00"],"fri":["08:00","17:00"],"sat":["09:00","13:00"],"sun":null}'::jsonb);

-- app_settings singleton (default appointment preferences ng Settings page)
insert into app_settings (id, email_admins_on_new_appointment, remind_patients,
                          auto_confirm_appointments, slot_interval_minutes)
values (1, true, true, false, 30);

-- Doctors (18 — DOCTORS ng app; ord = 1-based index na ginagamit sa
-- deterministic photo URL, availability rotation, at rating pattern)
insert into doctors (id, full_name, specialty_id, status, years_of_experience,
                     consultation_fee, room, gender, photo_url)
select
  ('00000000-0000-4000-8000-' || lpad(v.ord::text, 12, '0'))::uuid,
  v.full_name,
  (select id from specialties where name = v.specialty),
  v.status::doctor_status,
  v.exp,
  v.fee,
  v.room,
  v.gender::gender,
  'https://randomuser.me/api/portraits/' ||
    (case when v.gender = 'F' then 'women' else 'men' end) || '/' ||
    ((v.ord * 5) % 99)::text || '.jpg'
from (values
  (1,  'Dr. Maria Elena Villanueva-Santos', 'Cardiology',        'available', 18, 1800.00, 'Cardio Wing • Rm 402',     'F'),
  (2,  'Dr. Rafael Domingo',                'Pediatrics',        'available', 12, 1200.00, 'Peds Wing • Rm 210',       'M'),
  (3,  'Dr. Ana Beatriz Concepcion',        'Dermatology',       'available',  9, 1500.00, 'Outpatient • Rm 118',      'F'),
  (4,  'Dr. Joaquin Mendoza',               'Neurology',         'on-leave',  21, 2200.00, 'Neuro Wing • Rm 505',      'M'),
  (5,  'Dr. Katrina Salvador-Ramos',        'OB-GYN',            'available', 15, 1600.00, 'Women''s Health • Rm 302', 'F'),
  (6,  'Dr. Miguel Sebastian Torres',       'Orthopedics',       'busy',      11, 1700.00, 'Ortho Wing • Rm 401',      'M'),
  (7,  'Dr. Isabelle Fajardo',              'ENT',               'available',  8, 1400.00, 'Outpatient • Rm 122',      'F'),
  (8,  'Dr. Emmanuel de la Cruz',           'Psychiatry',        'available', 14, 2000.00, 'Mental Health • Rm 601',   'M'),
  (9,  'Dr. Corazon Bautista-Uy',           'Internal Medicine', 'available', 20, 1300.00, 'Outpatient • Rm 105',      'F'),
  (10, 'Dr. Andres Kalaw',                  'Family Medicine',   'available',  6, 1000.00, 'Outpatient • Rm 108',      'M'),
  (11, 'Dr. Patricia Lourdes Aquino',       'Cardiology',        'available', 16, 1800.00, 'Cardio Wing • Rm 405',     'F'),
  (12, 'Dr. Benjamin Ocampo',               'Pediatrics',        'busy',      10, 1200.00, 'Peds Wing • Rm 212',       'M'),
  (13, 'Dr. Rosario Mercado-Lim',           'Dermatology',       'available', 13, 1500.00, 'Outpatient • Rm 120',      'F'),
  (14, 'Dr. Vicente Alvarez',               'Neurology',         'available', 22, 2200.00, 'Neuro Wing • Rm 508',      'M'),
  (15, 'Dr. Regina Pascual',                'OB-GYN',            'on-leave',  11, 1600.00, 'Women''s Health • Rm 305', 'F'),
  (16, 'Dr. Enrique Balagtas',              'Orthopedics',       'available', 17, 1700.00, 'Ortho Wing • Rm 403',      'M'),
  (17, 'Dr. Camila Reyes-Tan',              'ENT',               'available',  7, 1400.00, 'Outpatient • Rm 124',      'F'),
  (18, 'Dr. Fernando Zaragoza',             'Psychiatry',        'busy',      19, 2000.00, 'Mental Health • Rm 604',   'M')
) as v(ord, full_name, specialty, status, exp, fee, room, gender);

-- Patients (24 — PATIENTS registry ng app). p1 = demo patient account:
-- ang patients.email ang login identity kaya 'patient@medicacare.ph' ang
-- naka-seed dito (ang gmail sa registry ay contact email lang sa prototype).
-- age: galing sa app registry — derive ng date_of_birth (2026 - age,
-- placeholder na June 15) para may ma-compute na age sa admin tables.
-- p1 lang ang may kumpletong health summary (dob/address/emergency/blood/
-- allergies) — siya ang logged-in demo patient.
insert into patients (
  id, full_name, email, phone, password_hash, gender, date_of_birth,
  address, emergency_contact, blood_type, allergies, photo_url,
  last_visit_date, created_at
)
select
  ('10000000-0000-4000-8000-' || lpad(v.ord::text, 12, '0'))::uuid,
  v.full_name,
  v.email,
  v.phone,
  crypt('patient123', gen_salt('bf')),  -- demo hash; sa totoong wiring, account creation ang magse-set
  v.gender::gender,
  case when v.ord = 1 then date '1991-04-12' else make_date(2026 - v.age, 6, 15) end,
  case when v.ord = 1 then '18 Sampaguita St., Barangay San Antonio, Quezon City' end,
  case when v.ord = 1 then 'Maria Bautista • +63 918 445 2201' end,
  case when v.ord = 1 then 'O+' end,
  case when v.ord = 1 then 'Penicillin' end,
  'https://randomuser.me/api/portraits/' ||
    (case when v.gender = 'F' then 'women' else 'men' end) || '/' ||
    (((v.ord + 1) * 3) % 99)::text || '.jpg',
  v.last_visit,
  v.joined::timestamptz
from (values
  (1,  'Juan Miguel Bautista',                'patient@medicacare.ph',       '+63 917 234 5678', 'M', 34, date '2024-08-14', date '2026-08-22'),
  (2,  'Maria Kristina Del Rosario-Fernandez','mk.fernandez@outlook.com',    '+63 918 445 1120', 'F', 29, date '2025-01-03', date '2026-09-01'),
  (3,  'Jose Emmanuel Villanueva',            'jose.villanueva@yahoo.com',   '+63 917 998 2345', 'M', 52, date '2023-06-19', date '2026-07-30'),
  (4,  'Sofia Andrea Ramos',                  'sofia.ramos@gmail.com',       '+63 916 210 8877', 'F', 41, date '2024-11-22', date '2026-08-14'),
  (5,  'Carlo Antonio Reyes',                 'carlo.reyes.a@gmail.com',     '+63 917 883 4412', 'M', 24, date '2025-03-11', date '2026-08-28'),
  (6,  'Angelica Nicole de la Peña',          'angelica.delapena@gmail.com', '+63 928 445 6710', 'F', 38, date '2023-02-04', date '2026-06-17'),
  (7,  'Luis Alfonso Aguilar',                'luis.aguilar@gmail.com',      '+63 917 003 5678', 'M', 47, date '2024-04-30', date '2026-09-04'),
  (8,  'Diana Beatrice Mangubat-Cruz',        'diana.mc@gmail.com',          '+63 918 662 1109', 'F', 33, date '2025-06-08', date '2026-08-19'),
  (9,  'Rafael Sebastian Ocampo',             'rafael.ocampo@gmail.com',     '+63 917 554 8823', 'M', 61, date '2022-09-15', date '2026-05-22'),
  (10, 'Isabel Corazon Salvador',             '',                            '+63 918 111 2345', 'F', 28, date '2026-02-14', null),
  (11, 'Miguel Ignacio Torres-Sy',            'miguel.torres@gmail.com',     '+63 917 445 2298', 'M', 45, date '2024-07-01', date '2026-08-30'),
  (12, 'Katrina Marie Aquino',                'katrina.aquino@gmail.com',    '+63 928 990 1123', 'F', 36, date '2025-08-19', date '2026-09-03')
) as v(ord, full_name, email, phone, gender, age, joined, last_visit);

insert into patients (
  id, full_name, email, phone, password_hash, gender, date_of_birth,
  photo_url, last_visit_date, created_at
)
select
  ('10000000-0000-4000-8000-' || lpad(v.ord::text, 12, '0'))::uuid,
  v.full_name, v.email, v.phone,
  crypt('patient123', gen_salt('bf')),
  v.gender::gender,
  make_date(2026 - v.age, 6, 15),
  'https://randomuser.me/api/portraits/' ||
    (case when v.gender = 'F' then 'women' else 'men' end) || '/' ||
    (((v.ord + 1) * 3) % 99)::text || '.jpg',
  v.last_visit,
  v.joined::timestamptz
from (values
  (13, 'Emmanuel Joaquin Domingo III',       'em.domingo@gmail.com',       '+63 917 662 4488', 'M', 55, date '2023-11-27', date '2026-07-11'),
  (14, 'Regine Bianca Uy',                   'regine.uy@gmail.com',        '+63 918 335 7710', 'F', 22, date '2026-01-08', date '2026-08-25'),
  (15, 'Antonio Rafael Mercado',             'antonio.mercado@gmail.com',  '+63 917 220 9987', 'M', 39, date '2024-10-15', date '2026-08-08'),
  (16, 'Camille Alexandra Pascual-Gomez',    'camille.pg@gmail.com',       '+63 918 774 0056', 'F', 31, date '2025-05-02', null),
  (17, 'Vicente Andres Bonifacio',           'vicente.bonifacio@gmail.com','+63 917 883 4412', 'M', 66, date '2021-03-21', date '2026-04-19'),
  (18, 'Bianca Trinidad Lim',                'bianca.lim@gmail.com',       '+63 918 001 4478', 'F', 27, date '2025-12-10', date '2026-08-16'),
  (19, 'Renato Enrique Kalaw',               'renato.kalaw@gmail.com',     '+63 917 220 8834', 'M', 43, date '2024-02-28', date '2026-09-05'),
  (20, 'Alessandra Mikaela Villanueva-Zaragoza','alessandra.vz@gmail.com', '+63 928 445 6712', 'F', 30, date '2025-09-14', date '2026-08-21'),
  (21, 'Paolo Cesar Fajardo',                'paolo.fajardo@gmail.com',    '+63 917 990 3345', 'M', 26, date '2026-03-04', null),
  (22, 'Trinidad Amor Concepcion',           'trinidad.c@gmail.com',       '+63 918 662 8890', 'F', 58, date '2022-11-09', date '2026-06-30'),
  (23, 'Marcos Julian Lozano',               'marcos.lozano@gmail.com',    '+63 917 445 9987', 'M', 37, date '2024-06-24', date '2026-08-12'),
  (24, 'Kristine Joy Balagtas',              'kristine.balagtas@gmail.com','+63 928 335 7723', 'F', 34, date '2025-02-17', date '2026-08-26')
) as v(ord, full_name, email, phone, gender, age, joined, last_visit);

-- Admin (CURRENT_ADMIN ng app; login email = ADMIN_CREDENTIALS)
insert into admins (id, full_name, email, password_hash, role, photo_url) values
  ('40000000-0000-4000-8000-000000000001'::uuid, 'Dr. Helena Cruz-Ilagan',
   'admin@medicacare.ph', crypt('admin123', gen_salt('bf')),
   'Administrator', 'https://randomuser.me/api/portraits/women/44.jpg');

-- Doctor portal account (DOCTOR_CREDENTIALS ng app — d1 ang may access)
insert into doctor_accounts (doctor_id, email, password_hash)
values
  (('00000000-0000-4000-8000-000000000001')::uuid,
   'doctor@medicacare.ph', crypt('doctor123', gen_salt('bf')));

-- Weekly availability (AVAIL_PATTERNS rotation ng app — 6 patterns, per-doctor
-- rotation; weekdays 08:30-16:30, Saturday 08:30-11:30, Sunday 08:30-12:00)
insert into doctor_weekly_availability (doctor_id, weekday, start_time, end_time)
select
  ('00000000-0000-4000-8000-' || lpad(v.ord::text, 12, '0'))::uuid,
  w.weekday,
  time '08:30',
  case w.weekday when 6 then time '11:30' when 7 then time '12:00' else time '16:30' end
from (values
  (1,  array[1,2,3,4,5]), (2,  array[1,2,3,5]),   (3,  array[2,3,4,5,6]),
  (4,  array[1,3,4,6]),   (5,  array[1,2,4,5,6]), (6,  array[3,4,5,6,7]),
  (7,  array[1,2,3,4,5]), (8,  array[1,2,3,5]),   (9,  array[2,3,4,5,6]),
  (10, array[1,3,4,6]),   (11, array[1,2,4,5,6]), (12, array[3,4,5,6,7]),
  (13, array[1,2,3,4,5]), (14, array[1,2,3,5]),   (15, array[2,3,4,5,6]),
  (16, array[1,3,4,6]),   (17, array[1,2,4,5,6]), (18, array[3,4,5,6,7])
) as v(ord, days)
cross join lateral unnest(v.days) as w(weekday);

-- Appointments — fixed-date seeds (APPOINTMENTS ng app; ap1-ap25). Ang
-- contact_number ay galing sa phone ng patient; ang status timestamps ay
-- deterministic (confirmed = created+1d, completed = appointment time,
-- cancelled = created+2d). Ang status history ay auto-populate ng trigger.
-- ON CONFLICT skip: kung sakaling tumama ang isang "today" slot sa fixed
-- date ng isang aktibong appointment, hindi bumabagsak ang seed.
insert into appointments (
  id, patient_id, doctor_id, appointment_date, start_time, end_time,
  reason, contact_number, is_first_visit, status, notes,
  created_at, confirmed_at, completed_at, cancelled_at
)
select
  ('20000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(v.p::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad(v.d::text, 12, '0'))::uuid,
  v.dt,
  v.st::time,
  v.st::time + interval '30 minutes',
  v.reason,
  pt.phone,
  true,
  v.status::appointment_status,
  v.notes,
  v.created::timestamptz,
  case when v.status in ('confirmed', 'completed') then v.created::timestamptz + interval '1 day' end,
  case when v.status = 'completed' then (v.dt + v.st::time)::timestamptz end,
  case when v.status = 'cancelled' then v.created::timestamptz + interval '2 days' end
from (values
  (1,  1,  1,  date '2026-09-11', '10:30', 'Annual cardiac check-up and ECG review',    'confirmed', null, date '2026-09-04'),
  (2,  1,  9,  date '2026-07-18', '14:00', 'Follow-up on blood pressure medication',    'completed', 'Blood pressure 118/76 on current medication. Continue lifestyle changes; repeat CBC in 6 months.', date '2026-07-02'),
  (3,  1,  3,  date '2026-05-22', '11:15', 'Skin allergy consultation',                 'completed', 'Allergic contact dermatitis. Prescribed topical steroid; avoid suspected irritant. Follow up if the rash persists after 2 weeks.', date '2026-05-15'),
  (4,  1,  10, date '2026-08-30', '09:00', 'Routine wellness exam',                     'cancelled', null, date '2026-08-15'),
  (5,  1,  8,  date '2026-09-24', '15:30', 'Consultation for anxiety and sleep issues', 'pending',   null, date '2026-09-06'),
  (6,  2,  5,  date '2026-09-09', '09:00', 'Prenatal check-up, 22 weeks',               'confirmed', null, date '2026-09-01'),
  (7,  3,  6,  date '2026-09-09', '11:00', 'Left knee pain, post-surgery follow-up',    'confirmed', null, date '2026-09-01'),
  (8,  4,  13, date '2026-09-09', '13:30', 'Recurring rash on forearm',                 'pending',   null, date '2026-09-05'),
  (9,  5,  2,  date '2026-09-09', '15:00', 'Pediatric consultation for nephew',         'pending',   null, date '2026-09-06'),
  (10, 6,  4,  date '2026-09-10', '10:00', 'Chronic migraine assessment',               'confirmed', null, date '2026-09-02'),
  (11, 7,  1,  date '2026-09-10', '14:30', 'Cardiac stress test results discussion',    'confirmed', null, date '2026-09-03'),
  (12, 8,  7,  date '2026-09-10', '16:00', 'Chronic sinusitis',                         'pending',   null, date '2026-09-05'),
  (13, 9,  9,  date '2026-09-11', '08:30', 'Diabetes management review',                'confirmed', null, date '2026-09-04'),
  (14, 11, 6,  date '2026-09-11', '13:00', 'Shoulder rehabilitation follow-up',         'pending',   null, date '2026-09-07'),
  (15, 12, 14, date '2026-09-08', '11:30', 'Post-stroke neuro assessment',              'completed', 'Stable neuro exam. Continue current medication and physical therapy; repeat imaging in 3 months.', date '2026-09-01'),
  (16, 13, 8,  date '2026-09-08', '14:00', 'Therapy session',                           'completed', 'Therapy session completed. Patient responding well to the current plan; next session to be scheduled.', date '2026-09-01'),
  (17, 14, 2,  date '2026-09-07', '10:00', 'Pediatric wellness check',                  'completed', 'Growth on track, vaccinations up to date. Advised routine follow-up next year.', date '2026-08-30'),
  (18, 15, 16, date '2026-09-07', '15:00', 'Fractured wrist follow-up',                 'completed', 'Fracture healed well. Cast removed; referred to physical therapy for grip strengthening.', date '2026-08-29'),
  (19, 17, 11, date '2026-09-06', '09:30', 'Palpitations and shortness of breath',      'cancelled', null, date '2026-08-28'),
  (20, 18, 17, date '2026-09-12', '10:00', 'Tinnitus consultation',                     'pending',   null, date '2026-09-07'),
  (21, 19, 3,  date '2026-09-12', '14:00', 'Adult acne consultation',                   'confirmed', null, date '2026-09-05'),
  (22, 20, 5,  date '2026-09-13', '11:00', 'Annual OB-GYN check-up',                    'pending',   null, date '2026-09-08'),
  (23, 22, 14, date '2026-09-13', '15:30', 'Peripheral neuropathy screening',           'confirmed', null, date '2026-09-04'),
  (24, 23, 1,  date '2026-09-14', '09:00', 'Cardiology second opinion',                 'pending',   null, date '2026-09-08'),
  (25, 24, 18, date '2026-09-14', '14:30', 'Medication adjustment consultation',        'pending',   null, date '2026-09-08')
) as v(n, p, d, dt, st, reason, status, notes, created)
join patients pt on pt.id = ('10000000-0000-4000-8000-' || lpad(v.p::text, 12, '0'))::uuid
on conflict (doctor_id, appointment_date, start_time) where status in ('pending', 'confirmed') do nothing;

-- "Today's schedule" (apT1-apT24 ng app) — dated relative sa run date
-- (current_date) para live-looking ang admin dashboard/doctor schedule.
-- Bawat doctor ay may pasyente ngayon (printable daily schedule).
insert into appointments (
  id, patient_id, doctor_id, appointment_date, start_time, end_time,
  reason, contact_number, is_first_visit, status, notes,
  created_at, confirmed_at, completed_at, cancelled_at
)
select
  ('20000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(v.p::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad(v.d::text, 12, '0'))::uuid,
  current_date,
  v.st::time,
  v.st::time + interval '30 minutes',
  v.reason,
  pt.phone,
  true,
  v.status::appointment_status,
  v.notes,
  (current_date - v.created_off)::timestamptz,
  case when v.status in ('confirmed', 'completed') then (current_date - v.created_off)::timestamptz + interval '1 day' end,
  case when v.status = 'completed' then (current_date + v.st::time)::timestamptz end,
  null
from (values
  (26, 2,  13, '09:00', 'Recurring rash follow-up',                    'completed', 'Rash improving on current treatment. Continue antihistamine; return if it recurs.', 0),
  (27, 3,  1,  '10:30', 'Blood pressure medication review',            'confirmed', null, 2),
  (28, 5,  2,  '13:30', 'Pediatric wellness check',                    'completed', 'Well-child visit. No acute findings; immunizations current.', 0),
  (29, 6,  7,  '15:00', 'Chronic sinusitis re-evaluation',             'confirmed', null, 1),
  (30, 7,  9,  '16:30', 'Fasting blood sugar results consultation',    'pending',   null, 0),
  (31, 1,  1,  '08:30', 'Post-ECG consultation and results review',    'confirmed', 'Continue current medication and low-sodium diet.', 0),
  (32, 8,  2,  '09:30', 'Cough and fever follow-up',                   'confirmed', null, 1),
  (33, 9,  3,  '10:00', 'Eczema flare-up management',                  'confirmed', null, 2),
  (34, 10, 4,  '11:00', 'Migraine management follow-up',               'confirmed', null, 3),
  (35, 11, 4,  '14:00', 'Numbness and tingling in both hands',         'confirmed', null, 1),
  (36, 12, 5,  '09:00', 'Prenatal check-up (2nd trimester)',           'completed', 'Vitals stable, fetal heart tone normal at 144 bpm. Continue prenatal vitamins.', 0),
  (37, 13, 6,  '11:30', 'Knee pain evaluation',                        'confirmed', null, 2),
  (38, 14, 7,  '10:30', 'Recurrent ear infection consultation',        'confirmed', null, 1),
  (39, 15, 8,  '15:30', 'Scheduled therapy session',                   'confirmed', null, 0),
  (40, 16, 9,  '09:30', 'Diabetes management follow-up',               'completed', 'HbA1c improved to 6.8%. Continue metformin; diet counseling reiterated.', 0),
  (41, 17, 10, '08:30', 'General health consultation',                 'pending',   null, 0),
  (42, 18, 11, '13:00', 'Chest pain clearance for surgery',            'confirmed', null, 2),
  (43, 19, 12, '14:30', 'Child immunization (MMR booster)',            'pending',   null, 0),
  (44, 20, 13, '13:00', 'Acne treatment progress check',               'pending',   null, 0),
  (45, 21, 14, '09:30', 'Seizure medication review',                   'confirmed', null, 1),
  (46, 22, 15, '10:30', 'Contraception counseling',                    'confirmed', null, 1),
  (47, 23, 16, '16:00', 'Lower back pain follow-up',                   'confirmed', null, 3),
  (48, 24, 17, '09:00', 'Dizziness and ear pressure evaluation',       'pending',   null, 0),
  (49, 4,  18, '10:00', 'Anxiety medication adjustment',               'confirmed', null, 2)
) as v(n, p, d, st, reason, status, notes, created_off)
join patients pt on pt.id = ('10000000-0000-4000-8000-' || lpad(v.p::text, 12, '0'))::uuid
on conflict (doctor_id, appointment_date, start_time) where status in ('pending', 'confirmed') do nothing;

-- Demo rating history (SEED_RATINGS ng app): ang fictional ratings ng app ay
-- may appointment ids na wala sa APPOINTMENTS — para buo ang FK integrity,
-- ginagawa muna silang totoong completed visits (Agosto 2026, deterministic
-- per-doctor rotation: 4-7 visits bawat doctor, raters ay p1-p5) tapos
-- saka nagkakaroon ng visit_ratings. Lalabas ang mga ito sa visit history ng
-- p1-p5 — fictional demo data lang, may "demo" marker sa reason.
with doc_seed as (
  select
    ('00000000-0000-4000-8000-' || lpad(v.ord::text, 12, '0'))::uuid as id,
    v.ord,
    case
      when v.ord in (1,2,4,5,7,9,11,14,16,18) then array[5,5,5,4,5,4,5]  -- seeded ~4.8+ (high)
      when v.ord in (3,6,8,12,13,15,17)       then array[5,4,5,4,5,4,5]  -- seeded ~4.6 (mid)
      else array[5,4,4,5,4,5,4]                                          -- seeded ~4.4-4.5 (good)
    end as pattern
  from generate_series(1, 18) as v(ord)
),
gen as (
  select
    ds.id  as doctor_id,
    ds.ord,
    g.j,
    ds.pattern[((g.j - 1) % 7) + 1]                                        as stars,
    date '2026-08-01' + (((ds.ord - 1) * 3 + (g.j - 1) * 5) % 27)          as visit_date,
    time '09:00' + ((g.j - 1) * interval '90 minutes')                     as visit_time
  from doc_seed ds
  cross join generate_series(1, 4 + ((ds.ord - 1) % 4)) as g(j)
)
insert into appointments (
  id, patient_id, doctor_id, appointment_date, start_time, end_time,
  reason, contact_number, is_first_visit, status,
  created_at, confirmed_at, completed_at
)
select
  ('30000000-0000-4000-8000-' || lpad((((gen.ord - 1) * 7 + gen.j))::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(((((gen.j - 1) % 5) + 1))::text, 12, '0'))::uuid,
  gen.doctor_id,
  gen.visit_date,
  gen.visit_time,
  gen.visit_time + interval '30 minutes',
  'Completed visit (demo rating history)',
  pt.phone,
  true,
  'completed'::appointment_status,
  (gen.visit_date - 7)::timestamptz,
  (gen.visit_date - 6)::timestamptz,
  (gen.visit_date + gen.visit_time)::timestamptz
from gen
join patients pt on pt.id = ('10000000-0000-4000-8000-' || lpad(((((gen.j - 1) % 5) + 1))::text, 12, '0'))::uuid;

-- Ratings ng demo visits (stars ay pattern-based — pareho ng SEED_RATINGS;
-- comment: null dahil walang komento ang seed ratings ng app)
with doc_seed as (
  select
    v.ord,
    case
      when v.ord in (1,2,4,5,7,9,11,14,16,18) then array[5,5,5,4,5,4,5]
      when v.ord in (3,6,8,12,13,15,17)       then array[5,4,5,4,5,4,5]
      else array[5,4,4,5,4,5,4]
    end as pattern
  from generate_series(1, 18) as v(ord)
),
gen as (
  select
    ds.ord,
    g.j,
    ds.pattern[((g.j - 1) % 7) + 1]                               as stars,
    date '2026-08-01' + (((ds.ord - 1) * 3 + (g.j - 1) * 5) % 27) as visit_date
  from doc_seed ds
  cross join generate_series(1, 4 + ((ds.ord - 1) % 4)) as g(j)
)
insert into visit_ratings (appointment_id, patient_id, doctor_id, stars, comment, created_at)
select
  ('30000000-0000-4000-8000-' || lpad((((gen.ord - 1) * 7 + gen.j))::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(((((gen.j - 1) % 5) + 1))::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((gen.ord)::text, 12, '0'))::uuid,
  gen.stars,
  null,
  (gen.visit_date + time '12:00')::timestamptz
from gen;

-- Medical records (SEED ng app — derived mula sa completed visits na may
-- doctor notes; parity ng app behavior: ang records page ng pasyente ay
-- nagmumula sa completed appointments — record_type 'Consultation',
-- title = reason, summary = notes). Data-driven insert: automatic na tugma
-- sa anumang completed appointment na may notes (fixed seeds + today's
-- schedule rows), kahit magbago ang seed data sa hinaharap.
insert into medical_records (patient_id, doctor_id, appointment_id, visit_date, record_type, title, summary)
select a.patient_id, a.doctor_id, a.id, a.appointment_date,
       'Consultation', a.reason, a.notes
from appointments a
where a.status = 'completed' and a.notes is not null;

-- Notifications (p1 = demo patient; 2 unread para live ang topbar bell —
-- unread dot + "Mark all as read" — at 2 na read para may history)
insert into notifications (patient_id, appointment_id, type, title, message, read_at, created_at)
values
  (('10000000-0000-4000-8000-000000000001')::uuid,
   ('20000000-0000-4000-8000-000000000005')::uuid,   -- ap5 (pending)
   'pending', 'Appointment received',
   'Your booking with Dr. Emmanuel de la Cruz is in the review queue. We''ll notify you once it''s confirmed.',
   null, now() - interval '2 hours'),
  (('10000000-0000-4000-8000-000000000001')::uuid,
   ('20000000-0000-4000-8000-000000000001')::uuid,   -- ap1 (confirmed)
   'confirmed', 'Appointment confirmed',
   'Dr. Maria Elena Villanueva-Santos confirmed your visit. See you on the schedule!',
   null, now() - interval '1 day'),
  (('10000000-0000-4000-8000-000000000001')::uuid,
   ('20000000-0000-4000-8000-000000000002')::uuid,   -- ap2 (completed)
   'completed', 'Visit completed',
   'Your consultation notes are now available under Medical records.',
   now(), now() - interval '9 days'),
  (('10000000-0000-4000-8000-000000000001')::uuid,
   ('20000000-0000-4000-8000-000000000004')::uuid,   -- ap4 (cancelled)
   'cancelled', 'Appointment cancelled',
   'Your wellness exam slot was released. You can rebook anytime from Find a doctor.',
   now(), now() - interval '10 days');

-- Lab results (SEED_LABS ng app — p1; findings JSONB, flag null = normal)
insert into lab_results (patient_id, doctor_id, test_name, category, status, result_date, findings)
values
  (('10000000-0000-4000-8000-000000000001')::uuid, null,
   'Complete Blood Count (CBC)', 'Hematology', 'final', date '2026-07-16',
   '[{"item":"Hemoglobin","value":"14.2","unit":"g/dL","range":"13.0–17.0","flag":null},
     {"item":"White blood cells","value":"7.1","unit":"10⁹/L","range":"4.5–11.0","flag":null},
     {"item":"Platelets","value":"245","unit":"10⁹/L","range":"150–400","flag":null}]'::jsonb),
  (('10000000-0000-4000-8000-000000000001')::uuid, null,
   'Fasting Blood Sugar', 'Clinical Chemistry', 'final', date '2026-07-16',
   '[{"item":"Glucose, fasting","value":"96","unit":"mg/dL","range":"70–99","flag":null}]'::jsonb),
  (('10000000-0000-4000-8000-000000000001')::uuid, null,
   'Lipid Panel', 'Clinical Chemistry', 'final', date '2026-05-20',
   '[{"item":"Total cholesterol","value":"198","unit":"mg/dL","range":"<200","flag":null},
     {"item":"LDL cholesterol","value":"141","unit":"mg/dL","range":"<100","flag":"high"},
     {"item":"HDL cholesterol","value":"48","unit":"mg/dL","range":">40","flag":null},
     {"item":"Triglycerides","value":"132","unit":"mg/dL","range":"<150","flag":null}]'::jsonb);

-- Medications (SEED_MEDICATIONS ng app — p1; prescriber: d9, d3, d1)
insert into medications (patient_id, doctor_id, name, dose, form, frequency, start_date, status, instructions)
values
  (('10000000-0000-4000-8000-000000000001')::uuid,
   ('00000000-0000-4000-8000-000000000009')::uuid,
   'Amlodipine', '5 mg', 'Tablet', 'Once daily, morning', date '2026-07-18', 'active',
   'Take with or without food. Monitor blood pressure weekly.'),
  (('10000000-0000-4000-8000-000000000001')::uuid,
   ('00000000-0000-4000-8000-000000000003')::uuid,
   'Hydrocortisone cream 1%', 'Apply thinly', 'Topical cream', 'Twice daily', date '2026-05-22', 'completed',
   'Apply to the affected area for up to 2 weeks.'),
  (('10000000-0000-4000-8000-000000000001')::uuid,
   ('00000000-0000-4000-8000-000000000001')::uuid,
   'Aspirin (low-dose)', '81 mg', 'Tablet', 'Once daily', date '2026-09-11', 'active',
   'Take after meals.');

-- Family members (SEED_FAMILY ng app — proxy booking ng p1)
insert into patient_family_members (patient_id, full_name, relation, age)
values
  (('10000000-0000-4000-8000-000000000001')::uuid, 'Maria Bautista', 'Spouse',   33),
  (('10000000-0000-4000-8000-000000000001')::uuid, 'Sofia Bautista', 'Daughter',  6);

-- Support tickets + thread messages (SEED_TICKETS ng app — patient messages
-- loop: ang unang mensahe = 'patient' row; ang staff reply = 'staff' row)
insert into support_tickets (id, patient_id, subject, status, created_at, updated_at)
values
  (('50000000-0000-4000-8000-000000000001')::uuid,
   ('10000000-0000-4000-8000-000000000014')::uuid, 'HMO coverage question',              'open',     '2026-09-15'::timestamptz, '2026-09-15'::timestamptz),
  (('50000000-0000-4000-8000-000000000002')::uuid,
   ('10000000-0000-4000-8000-000000000002')::uuid, 'Rescheduling my prenatal check-up',  'resolved', '2026-09-12'::timestamptz, '2026-09-12'::timestamptz),
  (('50000000-0000-4000-8000-000000000003')::uuid,
   ('10000000-0000-4000-8000-000000000001')::uuid, 'Clinic hours this coming holiday',   'open',     '2026-09-18'::timestamptz, '2026-09-18'::timestamptz),
  (('50000000-0000-4000-8000-000000000004')::uuid,
   ('10000000-0000-4000-8000-000000000001')::uuid, 'Copy of my ECG results',             'resolved', '2026-09-10'::timestamptz, '2026-09-11'::timestamptz);

insert into support_ticket_messages (ticket_id, sender, author_name, body, created_at)
values
  (('50000000-0000-4000-8000-000000000001')::uuid, 'patient', 'Regine Bianca Uy',
   'Hi! I just want to confirm if my HMO covers annual physical exams, or if I have to pay out of pocket first. Thank you!',
   '2026-09-15'::timestamptz),
  (('50000000-0000-4000-8000-000000000002')::uuid, 'patient', 'Maria Kristina Del Rosario-Fernandez',
   'Good morning, may I move my prenatal visit to a Saturday slot instead? Weekdays are difficult for me now.',
   '2026-09-12'::timestamptz),
  (('50000000-0000-4000-8000-000000000002')::uuid, 'staff', 'Dr. Helena Cruz-Ilagan',
   'Of course! Your prenatal check-up has been moved to the next available Saturday slot. See you then!',
   '2026-09-12'::timestamptz),
  (('50000000-0000-4000-8000-000000000003')::uuid, 'patient', 'Juan Miguel Bautista',
   'Hello! Will the outpatient department be open on the upcoming holiday? I want to book a follow-up visit that week.',
   '2026-09-18'::timestamptz),
  (('50000000-0000-4000-8000-000000000004')::uuid, 'patient', 'Juan Miguel Bautista',
   'Hi, I had an ECG during my last visit. May I request a copy of the results for my HMO filing?',
   '2026-09-10'::timestamptz),
  (('50000000-0000-4000-8000-000000000004')::uuid, 'staff', 'Dr. Helena Cruz-Ilagan',
   'Hi Juan! Your ECG results are ready — you can view them under Medical records in your portal, or pick up a printed copy at the Records section, Ground Floor.',
   '2026-09-11'::timestamptz);

-- Patient stories (SEED_TESTIMONIALS ng app — 2 pending + 1 approved;
-- ang approved ay lalabas sa public "What patients say" carousel)
insert into patient_stories (patient_id, display_name, quote, status, created_at, reviewed_at, reviewed_by)
values
  (('10000000-0000-4000-8000-000000000002')::uuid, 'Kristina F.',
   'Booking my prenatal check-up took less than a minute, and the confirmation was already in the portal when I looked.',
   'pending', '2026-09-13'::timestamptz, null, null),
  (('10000000-0000-4000-8000-000000000007')::uuid, 'Luis A.',
   'I used to call three times just to ask for available schedules. Now I can see the open slots myself and pick one.',
   'pending', '2026-09-14'::timestamptz, null, null),
  (('10000000-0000-4000-8000-000000000005')::uuid, 'Carlo R.',
   'Booked my annual check-up while commuting and the confirmation was already waiting when I got to the office.',
   'approved', '2026-09-10'::timestamptz, '2026-09-11'::timestamptz,
   ('40000000-0000-4000-8000-000000000001')::uuid);

-- Activity log (SEED_ACTIVITY ng app — timestamps relative sa run time,
-- pareho ng minutesAgo() ng app; actor ay display name, walang FK)
insert into activity_log (actor, action, detail, created_at)
values
  ('Dr. Maria Elena Villanueva-Santos', 'Completed visit',     'Juan Miguel Bautista',                                        now() - interval '9 minutes'),
  ('Dr. Helena Cruz-Ilagan',            'Status update',       'Ref AP8 → Confirmed',                                         now() - interval '26 minutes'),
  ('Kristine Joy Balagtas',             'Booked appointment',  'Dr. Camila Reyes-Tan · today at 9:00 AM',                     now() - interval '47 minutes'),
  ('Dr. Emmanuel de la Cruz',           'Marked no-show',      'Angelica Nicole de la Peña',                                  now() - interval '63 minutes'),
  ('Dr. Helena Cruz-Ilagan',            'Story approved',      '"Kristina F."',                                               now() - interval '88 minutes'),
  ('Dr. Katrina Salvador-Ramos',        'Amended visit notes', 'Sofia Andrea Ramos',                                          now() - interval '121 minutes'),
  ('Dr. Helena Cruz-Ilagan',            'Created appointment', 'Marcos Julian Lozano with Dr. Maria Elena Villanueva-Santos', now() - interval '154 minutes'),
  ('Dr. Helena Cruz-Ilagan',            'Updated appointment', 'Ref AP23 → rescheduled to a later slot',                      now() - interval '206 minutes');

-- Planner statistics pagkatapos ng bulk seed (monitor-vacuum-analyze rule) —
-- mas magandang query plans agad sa unang run
analyze;





