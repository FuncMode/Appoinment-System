-- ============================================================
-- MedicaCare — Database Schema (PostgreSQL 13+)
-- Target: Supabase (SQL Editor) o kahit anong plain PostgreSQL
-- Scope: LAHAT ng features ng Patient Portal + Admin Console
--        (tingnan ang database/README.md para sa feature -> table mapping)
-- Auth note: kasama ang password_hash columns; kung gagamit ka ng Supabase
--        Auth, i-link ang patients.auth_user_id at admins.auth_user_id sa
--        auth.users (tingnan ang RLS section sa dulo).
-- ============================================================

-- ------------------------------------------------------------
-- Enumerations
-- ------------------------------------------------------------
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type doctor_status      as enum ('available', 'busy', 'on_leave');
create type gender             as enum ('male', 'female', 'other');
create type testimonial_status as enum ('pending', 'approved', 'rejected');

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
--   - status timeline: pending -> confirmed -> completed | cancelled
--   - contact_number / additional_notes: kinokolekta ng booking form
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
  is_first_visit   boolean not null default true,  -- "Is this your first visit with this doctor?" (booking form)
  status           appointment_status not null default 'pending',
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
create index idx_appointments_status    on appointments (status);

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

-- ------------------------------------------------------------
-- medical_records — Medical Records screen (table + health summary source)
--   - record_type: 'Consultation', 'Laboratory result', atbp.
--   - appointment_id: optional link kapag galing ang record sa isang visit
-- ------------------------------------------------------------
create table medical_records (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id) on delete cascade,
  doctor_id      uuid not null references doctors(id) on delete restrict,
  appointment_id uuid references appointments(id) on delete set null,
  visit_date     date not null,
  record_type    text not null,
  title          text not null,
  summary        text not null,
  created_at     timestamptz not null default now()
);

create index idx_medical_records_patient on medical_records (patient_id, visit_date desc);

-- ------------------------------------------------------------
-- notifications — Topbar bell (unread dot, "Mark all as read")
--   Sa prototype derived mula sa appointments; sa DB, totoong table na
--   para may read/unread state at para maging totoo ang "Mark all as read".
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

-- ------------------------------------------------------------
-- clinic_info — Settings > Clinic information (singleton row, id = 1)
--   Binabasa din ng public pages (footer, Contact) at ng patient portal.
--   Note: ang app ngayon ay readonly ito mula sa constants; sa DB,
--   ito ang totoong source na pagbabago ng admin.
-- ------------------------------------------------------------
create table clinic_info (
  id         int primary key default 1 check (id = 1),
  name       text not null,
  phone      text not null,
  email      text not null,
  address    text,
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
create trigger trg_appointments_updated_at before update on appointments for each row execute function fn_set_updated_at();
create trigger trg_admins_updated_at      before update on admins      for each row execute function fn_set_updated_at();
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
--   Halimbawa: select * from fn_available_slots('<doctor uuid>', current_date, 30);
-- ============================================================
create or replace function fn_available_slots(
  p_doctor_id    uuid,
  p_date         date,
  p_slot_minutes int default 30
)
returns table (slot_start time, slot_end time, is_available boolean)
language sql
stable
as $$
  with avail as (
    select a.start_time, a.end_time
    from doctor_weekly_availability a
    where a.doctor_id = p_doctor_id
      and a.weekday = extract(isodow from p_date)::smallint
  ),
  slots as (
    select
      (a.start_time + (s * make_interval(mins => p_slot_minutes)))::time  as slot_start,
      least(a.end_time, (a.start_time + ((s + 1) * make_interval(mins => p_slot_minutes))))::time as slot_end
    from avail a
    cross join generate_series(0, 47) as s
    where (a.start_time + ((s + 1) * make_interval(mins => p_slot_minutes))) <= a.end_time
  )
  select
    sl.slot_start,
    sl.slot_end,
    not exists (
      select 1
      from appointments ap
      where ap.doctor_id = p_doctor_id
        and ap.appointment_date = p_date
        and ap.status in ('pending', 'confirmed')
        and sl.slot_start < ap.end_time
        and sl.slot_end > ap.start_time
    ) as is_available
  from slots sl
  order by sl.slot_start;
$$;

-- ============================================================
-- Supabase Row Level Security (RLS) — i-uncomment kapag naka-Supabase Auth
--   Prerequisite: i-link ang patients.auth_user_id sa auth.users(id).
--   Ang walang policy na table ay DENIED by default kapag naka-enable ang
--   RLS, kaya i-enable at i-policy ang bawat isa nang sabay-sabay.
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
--   for select using (auth_user_id = auth.uid());
-- create policy "patients update own profile" on patients
--   for update using (auth_user_id = auth.uid());
-- create policy "patients read own appointments" on appointments
--   for select using (patient_id in (select id from patients where auth_user_id = auth.uid()));
-- create policy "patients create own appointments" on appointments
--   for insert with check (patient_id in (select id from patients where auth_user_id = auth.uid()));
-- create policy "patients read own status history" on appointment_status_history
--   for select using (appointment_id in (
--     select id from appointments where patient_id in (select id from patients where auth_user_id = auth.uid())));
-- create policy "patients read own records" on medical_records
--   for select using (patient_id in (select id from patients where auth_user_id = auth.uid()));
-- create policy "patients read own notifications" on notifications
--   for select using (patient_id in (select id from patients where auth_user_id = auth.uid()));
-- create policy "patients update own notifications" on notifications
--   for update using (patient_id in (select id from patients where auth_user_id = auth.uid()));
--
-- Visit ratings: pasyente ay insert + read own lang (hindi nito mae-edit o
-- made-delete ang sarili o ng iba — buo ang computation integrity); ang
-- public na pagbasa ng averages ay dadaan sa service_role/security-definer
-- na wiring kapag naka-backend na.
-- create policy "patients insert own visit ratings" on visit_ratings
--   for insert with check (patient_id in (select id from patients where auth_user_id = auth.uid()));
-- create policy "patients read own visit ratings" on visit_ratings
--   for select using (patient_id in (select id from patients where auth_user_id = auth.uid()));
--
-- Patient stories: insert own (lalabas as 'pending'), read own, at public
-- read ng approved lang (public carousel; ang pending/rejected ay private).
-- create policy "patients insert own stories" on patient_stories
--   for insert with check (patient_id in (select id from patients where auth_user_id = auth.uid()));
-- create policy "patients read own stories" on patient_stories
--   for select using (patient_id in (select id from patients where auth_user_id = auth.uid()));
-- create policy "public read approved stories" on patient_stories
--   for select using (status = 'approved');
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
--   for select using (auth_user_id = auth.uid());
-- create policy "admins update own profile" on admins
--   for update using (auth_user_id = auth.uid());
--
-- Admin full access sa shared data (patients/appointments/doctors/records);
-- ang patient policies sa itaas ang nagli-limit sa patient side.
-- create policy "admins manage appointments" on appointments
--   for all using (
--     exists (select 1 from admins where auth_user_id = auth.uid())
--   );
-- create policy "admins manage doctors" on doctors
--   for all using (
--     exists (select 1 from admins where auth_user_id = auth.uid())
--   );
-- create policy "admins manage patients" on patients
--   for all using (
--     exists (select 1 from admins where auth_user_id = auth.uid())
--   );
--
-- Public read ng clinic info (footer/Contact); write ay admin/service_role:
-- create policy "public read clinic info" on clinic_info
--   for select using (true);
-- create policy "admins update clinic info" on clinic_info
--   for update using (
--     exists (select 1 from admins where auth_user_id = auth.uid())
--   );
-- create policy "admins read app settings" on app_settings
--   for select using (
--     exists (select 1 from admins where auth_user_id = auth.uid())
--   );
-- create policy "admins update app settings" on app_settings
--   for update using (
--     exists (select 1 from admins where auth_user_id = auth.uid())
--   );





