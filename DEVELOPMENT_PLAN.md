# 🏥 Hospital Appointment System — Development Plan

**IPT2 Final Project — Healthcare Management Website**

> Ang development plan na ito ay nakabatay at naka-align sa `PROJECT_INSTRUCTIONS.md` (instructor's instructions). Walang binago o dinagdag na requirement — ang ginamit na base ay **Option 2 — Hospital Appointment System**.

---

## 1. Define the Purpose and Target Users

### Purpose / Problem na sinosolusyunan

- Sa isang hospital, hindi praktikal na pumunta o tumawag pa lang para magpa-register at mag-book ng appointment.
- Walang iisang lugar kung saan makikita ng pasyente ang listahan ng doctors, availability ng doctor, status ng appointment niya, at appointment history niya.
- Walang organized na paraan para sa hospital staff na i-manage ang mga appointments at i-update ang status ng bawat isa.

### Objective

Gumawa ng functional na web-based Hospital Appointment System kung saan ang mga pasyente ay maaaring mag-register, mag-view ng doctors, mag-schedule ng appointment, makita ang status at history ng appointments, at makita ang availability ng doctors — gamit ang Frontend + Backend + Database + API.

### Target Users (fictional / sample accounts lang)

| User | Gamit sa System |
| --- | --- |
| **Patient** | Mag-register, mag-login, mag-view ng doctors, mag-book ng appointment, tingnan ang appointment status at history |
| **Hospital Staff / Admin** | Mag-manage ng patients at doctors, i-update ang appointment status (CRUD) |
| **Doctor** | Makita ang mga appointments na naka-assign sa kanya at ang availability niya |

> ⚠️ Ayon sa Security and Privacy section ng instructions: **BAWAL** ang real patients' personal or medical information. Gumamit lang ng dummy data, sample accounts, at fictional patients.

---

## 2. List the Requirements and MVP Features

### MVP Features (Option 2 — Hospital Appointment System)

1. **Patient registration** — data-entry form na may validation
2. **Doctor listing** — cards o table ng mga doctors
3. **Appointment scheduling** — appointment booking form (Create)
4. **Appointment status** — Pending / Confirmed / Completed / Cancelled (Update/Read)
5. **Appointment history** — listahan ng mga nakaraan at paparating na appointments (Read/Delete)
6. **Doctor availability** — available dates at time slots ng bawat doctor

### Minimum Functional Requirements (mula sa instructions)

| Requirement | Minimum Expectation |
| --- | --- |
| Frontend | Functional and responsive user interface |
| Backend | Working server-side processing |
| Database | Persistent storage of system data |
| API | At least one working API |
| CRUD | Create, Read, Update, Delete |
| Forms | Working data-entry forms |
| Validation | Appropriate input validation |
| Navigation | Working navigation between pages |
| Integration | Frontend, backend, and database must communicate |

> Hindi kailangan ng billing, prescriptions, o medical records — hindi ito kasama sa Option 2 features.

---

## 3. Create the User Flow and Project Scope

### System Flow (mula sa Example System Flow ng instructions)

```text
Patient
  ↓
Frontend Website
  ↓
Backend / API
  ↓
Database
  ↓
Backend / API
  ↓
Frontend
  ↓
Appointment Result
```

Halimbawa: Nag-fill out ang pasyente ng appointment form → ipinapadala ng frontend ang information sa backend → i-vi-validate ng backend ang information → sine-save ng backend sa database → ibinabalik ng database ang resulta → nagpapadala ang backend ng response → ipinapakita ng frontend ang **"Appointment Successfully Booked."**

### Patient Flow

```text
Homepage → Register / Login → Dashboard
  → Doctor Listing → Doctor Availability (pumili ng date & time slot)
  → Book Appointment (form + validation)
  → "Appointment Successfully Booked." (confirmation)
  → Appointment Status → Appointment History
  → (opsyonal) Cancel / Update appointment
  → Logout
```

### Admin / Staff Flow

```text
Login → Dashboard
  → Patients (list, search, add, edit, delete)
  → Doctors (list, add, edit, delete)
  → Appointments (list, update status, delete)
  → Logout
```

### Scope

- **Kasama (In Scope):** ang 6 na MVP features sa itaas + CRUD + forms + validation + navigation + API integration.
- **Hindi kasama (Out of Scope):** real patient data (bawal), at mga features na hindi nasa Option 2 (billing, prescriptions, medical records).

---

## 4. Design the Database and System Architecture

### Proposed Tables (properly related, na may PKs, FKs, at data types)

| Table | Primary Key | Important Columns (data types) | Relationships |
| --- | --- | --- | --- |
| `users` | `user_id` (INT, PK, AUTO_INCREMENT) | `email` (VARCHAR), `password_hash` (VARCHAR), `role` (ENUM: patient/staff/doctor) | Referenced by patients/doctors |
| `patients` | `patient_id` (INT, PK) | `user_id` (INT, FK → users), `first_name` (VARCHAR), `last_name` (VARCHAR), `phone` (VARCHAR), `address` (VARCHAR) | 1 patient → many appointments |
| `doctors` | `doctor_id` (INT, PK) | `user_id` (INT, FK → users), `first_name`, `last_name`, `specialty` (VARCHAR), `availability` (DATE/TIME) | 1 doctor → many appointments |
| `appointments` | `appointment_id` (INT, PK) | `patient_id` (INT, FK → patients), `doctor_id` (INT, FK → doctors), `appointment_date` (DATE), `time_slot` (TIME), `reason` (VARCHAR), `status` (ENUM: Pending/Confirmed/Completed/Cancelled), `created_at` (DATETIME) | FK sa patients at doctors |

- **Primary keys:** bawat table ay may sarili mong PK.
- **Foreign keys:** `appointments` ay naka-relate sa `patients` at `doctors` (FK relationships).
- **Data types:** tamang data type sa bawat column (INT, VARCHAR, DATE, TIME, DATETIME, ENUM).
- **CRUD operations:** gagana sa lahat ng tables.

### System Architecture

```text
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│     FRONTEND     │  ────►  │  BACKEND / API   │  ────►  │     DATABASE     │
│  (User Interface)│  ◄────  │ (Validation, CRUD│  ◄────  │ (Persistent      │
│                  │         │  Business Logic) │         │  Storage)        │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

- Ang frontend ay nagpapadala ng requests sa backend/API.
- Ang backend ay nag-vi-validate, gumagawa ng CRUD operations, at nakikipag-communicate sa database.
- Ang database ay nagso-store ng data at nagre-return ng results sa backend, na ipinapadala bilang response sa frontend.

---

## 5. Choose the Tech Stack

Ayon sa instructions: *"You are free to choose any programming language, framework, database, or development technology that you are comfortable with."* — Kaya ang final choice ay depende sa kung ano ang kaya ng grupo ipaliwanag at i-defend sa final presentation.

### Possible Technologies (mula sa instructions)

| Component | Options mula sa Instructions |
| --- | --- |
| **Frontend** | HTML, CSS, JavaScript, Bootstrap, React, Vue, Angular, Flutter Web, or any other suitable technology |
| **Backend** | PHP, Python, Java, JavaScript/Node.js, C#, Java Spring, Laravel, Django, Express.js, or any other suitable backend technology |
| **Database** | MySQL, PostgreSQL, SQLite, MongoDB, Firebase, Supabase, or any other appropriate database technology |
| **API** | REST API, JSON API, external healthcare-related API, public health information API, geolocation API, weather API, appointment or notification API |

> **Paalala:** Kahit anong combination mula sa lists sa itaas ay sapat na — ang mahalaga, functional ang Frontend → Backend → Database → API communication at kaya itong ipaliwanag ng grupo. Ang prototype sa susunod na step ay hindi nakadepende sa tech stack.

---

## 6. Create the Prototype

Ang prototype ay gagawin sa **Figma**. I-copy-paste ang buong prompt sa ibaba sa Figma AI/design tool para mabuo ang prototype.

**Mga paalala sa prompt na ito:**

- Walang binanggit na tech stack — design lang ang focus ng prototype.
- Kumpleto ang user flow at **tuloy-tuloy (walang putol)** — bawat screen ay naka-link sa susunod, mula landing page hanggang logout, at kaya itong i-loop ulit.
- Functional ang prototype — may mga interaction, validation states, loading, empty, error, at success states.

### 📋 Figma Prototype Prompt (copy-paste ito)

````text
Design a complete, functional, clickable, production-ready Figma prototype for a
HOSPITAL APPOINTMENT SYSTEM — a healthcare management web application.

GOAL
The goal is a functional, professional, responsive, production-ready application UI —
NOT a generic AI-generated SaaS landing page. Every design decision must be based on
usability, information hierarchy, real user workflows, platform conventions, and
actual application data. The prototype must feel like a real product people can
comfortably use every day. The entire user flow must be walkable from start to finish
with no dead ends and no broken links.

=== REQUIRED: COMPLETE USER FLOW (uninterrupted — every screen links to the next) ===

1. LANDING / HOMEPAGE — hospital name, short welcome description, healthcare-themed
   content, navigation menu, primary actions: "Login" and "Register".
2. REGISTER (PATIENT) — form: full name, email, phone number, password, confirm
   password. Show inline validation states (empty required fields, invalid email
   format, password mismatch). Successful submit → LOGIN screen.
3. LOGIN — email + password. Show error state for wrong credentials. Successful
   login goes by role: Patient → PATIENT DASHBOARD; Admin/Staff → ADMIN DASHBOARD.
4. PATIENT DASHBOARD — upcoming appointment summary, quick actions: "Book
   Appointment", "View Doctors", "Appointment History". Navigation menu visible.
5. DOCTOR LISTING — cards or table of fictional doctors (name, specialty,
   availability status badge) with a working search field. Clicking a doctor →
   DOCTOR AVAILABILITY screen.
6. DOCTOR AVAILABILITY — available dates and time slots as selectable chips/buttons.
   "Continue" → BOOK APPOINTMENT form pre-filled with the selected doctor, date,
   and time slot.
7. BOOK APPOINTMENT — form: doctor, date, time slot, reason for visit. Show
   validation error state (required fields, invalid inputs), loading state on the
   submit button, and success state. Submit → BOOKING CONFIRMATION.
8. BOOKING CONFIRMATION — success screen with confirmation message
   "Appointment Successfully Booked." plus the appointment summary. Buttons:
   "View Appointment Status" and "Back to Dashboard".
9. APPOINTMENT STATUS — the current appointment with a status badge
   (Pending / Confirmed / Completed / Cancelled).
10. APPOINTMENT HISTORY — table/list of past and upcoming appointments with
    details (doctor, date, time slot, status) and actions: "View Details" and
    "Cancel Appointment".
11. APPOINTMENT DETAILS — full information of the selected appointment; button:
    "Cancel Appointment".
12. CANCEL CONFIRMATION MODAL — centered confirmation modal: "Cancel this
    appointment?" with "Keep Appointment" and "Yes, Cancel It". Confirming returns
    to APPOINTMENT HISTORY with the appointment marked Cancelled and a success toast.
13. PROFILE — patient can view and edit their own information and change password,
    with the same validation states.
14. ADMIN DASHBOARD — today's appointments count, pending appointments, total
    patients, total doctors, and a recent appointments list.
15. PATIENTS MANAGEMENT (ADMIN) — searchable table of patients with full CRUD:
    "Add Patient" (modal/form with validation), Edit, Delete (with confirmation
    modal). Include loading, empty, and error states.
16. DOCTORS MANAGEMENT (ADMIN) — searchable table of doctors with full CRUD:
    Add/Edit/Delete doctor including their availability schedule; confirmation
    modal on delete.
17. APPOINTMENTS MANAGEMENT (ADMIN) — table of all appointments; update the
    appointment status (Pending → Confirmed → Completed, or Cancelled) and delete
    an appointment with a confirmation modal.
18. LOGOUT — returns to the LANDING page. The flow must be able to loop:
    Login → Dashboard → Book Appointment → ... → Logout → Login again.

=== INTERACTION RULES (the prototype must be functional) ===

- Every button, link, and menu item must have a real navigation/interaction
  target. No dead ends anywhere in the prototype.
- Include all relevant UI states inside the flow: default, hover, focus, active,
  disabled, loading (skeleton rows / button loading), empty (e.g., no appointments
  yet, with a clear call to action), error (failed load with a Retry action),
  validation error, and success (toasts / confirmation screens).
- Use realistic application data with FICTIONAL patients, doctors, and sample
  accounts only (this is a healthcare project — never use real patient data).
  Include long names, missing values, zero values, and many table rows so the UI
  stays usable with imperfect data.
- Design the desktop (web) layout as the primary layout, plus mobile layouts for
  the key screens (dashboard, doctor listing, booking form, appointment history)
  where tables transform properly for small screens.

=== UI/UX DESIGN GUIDELINES (STRICTLY FOLLOW ALL OF THESE) ===

# Web & Mobile Application UI/UX Design Guidelines

Ang goal ng design ay gumawa ng **functional, professional, responsive, at production-ready application UI**, hindi generic AI-generated SaaS landing page. Ang bawat design decision ay dapat naka-base sa **usability, information hierarchy, real user workflows, platform conventions, at actual application data**.

---

# 1. Common Design Problems to Avoid

## Sobrang Rounded ang Lahat

Iwasan ang paggamit ng `border-radius: 20px–32px` sa halos lahat ng components.

Hindi kailangang maging pill o bubble ang:

* Inputs
* Buttons
* Tables
* Sidebar items
* Navigation
* Modals
* Cards
* Dropdowns
* Search bars

Recommended:

* Inputs: `6px–8px`
* Buttons: `6px–8px`
* Cards: `8px–12px`
* Modals: `10px–12px`
* Pills: gamitin lamang sa tags, filters, status badges, o compact selectors

Ang shape ay dapat may purpose at hindi decorative lamang.

---

# 2. Avoid Gradient Overload

Huwag gawing default ang:

* Violet → Blue gradients
* Purple → Pink gradients
* Gradient buttons
* Gradient headings
* Gradient backgrounds
* Gradient borders

Mas appropriate sa real applications ang controlled palette:

```text
Primary Color
Neutral Background
Neutral Text Colors
Success
Warning
Error
Info
```

Example:

```text
Primary      = Brand Color
Background   = #F7F8FA
Surface      = #FFFFFF
Border       = #E5E7EB
Text Primary = #111827
Text Muted   = #6B7280
Success      = Green
Warning      = Amber
Error        = Red
```

Gradients can still be used, pero only when part sila ng actual brand identity.

---

# 3. Avoid Glassmorphism as Default UI

Huwag gumamit ng:

* `backdrop-filter: blur(...)`
* Transparent panels
* Glowing borders
* Frosted cards
* Floating glass navigation

kung wala naman itong functional purpose.

For dashboards, management systems, productivity tools, at admin applications, mas appropriate ang:

* Solid surfaces
* Clear borders
* Subtle elevation
* Strong visual hierarchy
* High readability

---

# 4. Avoid Forced Bento Layouts

Hindi lahat ng information kailangang ilagay sa magkakahiwalay na giant cards.

For example, huwag gawing:

```text
[ Profile Card ]

[ Settings Card ]

[ Security Card ]

[ Notification Card ]

[ Billing Card ]
```

kung mas logical naman ang:

```text
Settings

Profile
--------------------------------
Name
Email
Profile Picture

Security
--------------------------------
Password
Two-Factor Authentication

Notifications
--------------------------------
Email Notifications
Push Notifications
```

Use cards only when kailangan talagang i-group o i-separate visually ang information.

---

# 5. Avoid Landing Page Patterns Inside Applications

Ang actual application ay hindi dapat mukhang marketing website.

Avoid unnecessary:

* Huge hero sections
* Giant slogans
* Generic headlines
* Decorative illustrations
* Multiple CTA buttons
* Floating blobs
* Product marketing copy

Example na iwasan:

> Transform Your Workflow Today

Instead:

> Projects

> Create Project

> Manage Users

> Orders

> Account Settings

Application screens should communicate **what users can do**, hindi kung gaano kaganda ang product.

---

# 6. Avoid Floating Pill Navigation by Default

For web applications, prefer navigation patterns such as:

```text
Sidebar
Top Navigation
Tabs
Breadcrumbs
Contextual Navigation
```

For mobile applications:

```text
Bottom Navigation
Navigation Stack
Top App Bar
Tabs
Context Menus
```

Floating capsule navigation should only be used kapag bagay talaga sa application structure.

---

# 7. Control Shadows and Elevation

Hindi kailangan ng shadow bawat component.

Recommended hierarchy:

```text
Normal Card
→ Border only or very subtle shadow

Dropdown
→ Small shadow

Modal
→ Stronger shadow

Toast
→ Small elevation

Primary Button
→ Usually no glow
```

Avoid:

```css
box-shadow:
0 0 30px rgba(...),
0 20px 60px rgba(...);
```

unless intentional talaga sa branding.

---

# 8. Do Not Center Everything

Applications require different alignments.

Usually:

```text
Page Titles        → Left aligned
Forms              → Left aligned
Tables             → Structured columns
Settings           → Left aligned
Dashboard Content  → Grid/column aligned
Empty State        → Can be centered
Confirmation Modal → Can be centered
```

Centered layouts should be intentional, not default.

---

# 9. Avoid Excessive Whitespace

Marketing websites can use huge whitespace.

Productivity applications usually need higher information density.

Use spacing based on relationships.

Recommended spacing scale:

```text
4px
8px
12px
16px
24px
32px
48px
```

Example:

```text
Label
4px
Input

16px

Next Field

24px

Different Section
```

Avoid random values like:

```text
13px
19px
27px
37px
```

unless technically required.

---

# 10. Avoid Generic AI Dashboard Layouts

Do not automatically generate:

```text
Welcome back, John 👋

[12.5K Users]
[98% Growth]
[$45K Revenue]
[4.9 Rating]

Random Line Graph

Recent Activity
```

Dashboard content must depend on the actual application.

Examples:

For project management:

```text
Tasks Due Today
Blocked Tasks
Project Progress
Recent Updates
Team Workload
```

For school management:

```text
Students
Attendance
Classes Today
Pending Records
Announcements
```

For video generation application:

```text
Active Renders
Queued Projects
Failed Generations
Storage Usage
Recent Videos
```

Data must represent actual product workflows.

---

# 11. Use Icons Only When Useful

Icons should improve recognition or save space.

Good use:

```text
Search
Edit
Delete
Download
Upload
Filter
Notifications
Settings
Back
Close
More Actions
```

Avoid putting random icons beside:

```text
Dashboard
Overview
User Information
Recent Activity
Description
About
```

kung wala silang additional function.

---

# 12. Avoid Gradient Text Headings

Avoid default styles such as:

```css
background: linear-gradient(...);
background-clip: text;
color: transparent;
```

For application UI, prioritize readability.

Use:

```text
Strong text color
Clear font weight
Proper typography hierarchy
```

instead.

---

# 13. Cards Should Not All Look the Same

Hierarchy should determine component appearance.

Example:

```text
Critical Alert
→ visually prominent

Primary Information
→ medium emphasis

Metadata
→ low emphasis

Secondary Information
→ muted

Actions
→ positioned close to related content
```

Do not give all information equal visual weight.

---

# 14. Avoid Excessive Animation

Avoid combining:

* Fade-up
* Hover scale
* Parallax
* Animated gradient
* Floating background shapes
* Glowing cursor
* Spring animation
* Continuous movement

For applications, use subtle motion.

Recommended:

```text
Button interaction: 150ms
Dropdown: 150–200ms
Tabs: 150–200ms
Modal: 200–250ms
Toast: 200–250ms
```

Animations should communicate state changes, not distract users.

---

# 15. Use Realistic Application Data

Do not design only around perfect data.

Test interfaces with:

* Very long names
* Very long titles
* Missing profile pictures
* Missing information
* Hundreds of table rows
* Empty results
* Failed API request
* Loading states
* Deleted items
* Duplicate names
* Extremely large numbers
* Zero values
* Long notifications
* Slow network
* Partial uploads
* Failed uploads

The UI should remain usable in all these cases.

---

# WEB APPLICATION DESIGN

Web applications should prioritize **productivity, information density, keyboard interaction, multitasking, and large-screen layouts**.

---

# 16. Web Navigation

For complex web applications, sidebar navigation is usually appropriate.

Example:

```text
Logo

Dashboard
Projects
Media
Analytics
Team

──────────

Settings
Help
```

The sidebar should support:

```text
Active state
Hover state
Collapsed state
Expanded state
Tooltips when collapsed
Responsive behavior
```

Do not add unnecessary floating navigation.

---

# 17. Web Layout Structure

Recommended layout:

```text
┌──────────────┬───────────────────────────────┐
│              │ Top Bar                       │
│   Sidebar    ├───────────────────────────────┤
│              │                               │
│              │ Page Header                   │
│              │                               │
│              │ Main Content                  │
│              │                               │
└──────────────┴───────────────────────────────┘
```

Common widths:

```text
Sidebar: 220–280px
Main Content: Flexible
Content Max Width: Depends on application
```

Do not force everything inside a narrow `1200px` centered container if the application requires more horizontal workspace.

---

# 18. Web Tables

Tables should remain tables.

Support:

* Sorting
* Filtering
* Search
* Pagination
* Row selection
* Bulk actions
* Column alignment
* Sticky headers when useful
* Empty states
* Loading states
* Long text handling

Example:

```text
Name          Status       Created       Owner        Actions
----------------------------------------------------------------
Video 001     Rendering    Aug 12        Ranna        ...
Video 002     Complete     Aug 12        Ranna        ...
Video 003     Failed       Aug 11        Ranna        ...
```

Do not convert desktop tables into giant decorative cards.

---

# 19. Web Forms

Use visible labels.

Good:

```text
Project Name
[________________________]

Description
[________________________]
[________________________]

Visibility
[ Private ▼ ]

                  Cancel   Create Project
```

Avoid placeholder-only forms.

Forms should support:

```text
Default
Hover
Focus
Filled
Disabled
Read-only
Validation error
Validation success
Loading
```

---

# 20. Web Keyboard Support

Web applications should support keyboard users.

Examples:

```text
Tab navigation
Shift + Tab
Enter to submit
Escape to close modal
Arrow keys inside menus
Keyboard-accessible dropdowns
Visible focus indicators
```

Keyboard shortcuts can be added when useful.

Example:

```text
Ctrl / Cmd + K → Search
Ctrl / Cmd + S → Save
Esc → Close
```

---

# MOBILE APPLICATION DESIGN

Mobile interfaces should not simply be a smaller version of desktop.

Design based on:

* Touch interaction
* Small screens
* One-handed use
* Mobile navigation
* Limited horizontal space
* Mobile keyboard
* Native platform behavior

---

# 21. Mobile Navigation

For 3–5 primary sections, use bottom navigation.

Example:

```text
Home
Projects
Create
Activity
Profile
```

Avoid putting 8–10 items inside bottom navigation.

Secondary pages should use navigation stacks:

```text
Projects
    ↓
Project Details
    ↓
Edit Project
```

---

# 22. Mobile Top App Bar

Recommended:

```text
←   Project Details                     ⋮
```

or:

```text
Projects                         Search
```

Keep primary navigation predictable.

Do not place huge marketing headlines at the top of mobile application screens.

---

# 23. Mobile Touch Targets

Interactive components should be easy to tap.

Recommended minimum target:

```text
44–48px
```

Especially for:

* Buttons
* Navigation items
* Checkboxes
* Menu actions
* Icon buttons
* List rows

Avoid tiny `24px` clickable icons without enough surrounding touch area.

---

# 24. Mobile Forms

Mobile forms should consider the on-screen keyboard.

Use appropriate keyboard types.

Examples:

```text
Email
→ email keyboard

Phone
→ numeric/phone keyboard

Number
→ numeric keyboard

URL
→ URL keyboard
```

Forms should avoid unnecessarily long single screens.

Group related fields and allow comfortable scrolling.

---

# 25. Desktop Tables Should Transform Properly on Mobile

Do not simply squeeze desktop tables.

Desktop:

```text
Name | Status | Created | Owner | Actions
```

Mobile can become:

```text
Project Alpha
Complete

Created Aug 12
Owner: Ranna

View Details >
```

Alternative strategies:

```text
Hide secondary columns
Horizontal scroll
Expandable rows
Dedicated detail screen
```

Choose based on the data.

---

# 26. Mobile Actions

Do not overload the screen with visible buttons.

Desktop:

```text
Edit | Duplicate | Export | Archive | Delete
```

Mobile:

```text
⋮ More

Edit
Duplicate
Export
Archive
Delete
```

Keep the most important action visible.

Move secondary actions to overflow menus or bottom sheets.

---

# 27. Mobile Bottom Sheets

For mobile applications, prefer bottom sheets for contextual actions such as:

```text
Choose File
Select Filter
Share
More Actions
Select Account
Choose Sort Order
```

Use modal dialogs for important confirmations.

Example:

```text
Delete Project?

This project will be permanently deleted.

Cancel              Delete
```

---

# 28. Responsive Behavior Must Be Designed

Do not treat responsiveness as:

```css
@media(max-width: 768px) {
    everything {
        display: block;
    }
}
```

Define behavior per breakpoint.

Example:

### Desktop

```text
Sidebar
Full table
Multiple columns
Persistent filters
```

### Tablet

```text
Collapsible sidebar
Reduced columns
Flexible grid
```

### Mobile

```text
Bottom navigation
Single-column content
Priority information only
Secondary actions hidden
Tables transformed
```

---

# 29. Typography System

Example hierarchy:

```text
Page Title
28–32px / Semibold

Section Title
18–20px / Semibold

Card Title
16px / Medium

Body
14–16px / Regular

Label
13–14px / Medium

Helper Text
12–13px / Regular

Table Data
13–14px / Regular
```

Avoid making everything bold.

Use font weight to establish hierarchy.

---

# 30. Button Hierarchy

Create consistent button types.

### Primary

Main action.

```text
Create Project
Save Changes
Generate Video
Submit
```

### Secondary

Alternative action.

```text
Preview
Duplicate
Export
```

### Ghost / Text

Minor actions.

```text
Cancel
View Details
Learn More
```

### Danger

Destructive action.

```text
Delete
Remove
Deactivate
```

Never make all actions primary buttons.

---

# 31. Component System

Create reusable components for both web and mobile.

Core components:

```text
Button
Input
Textarea
Select
Checkbox
Radio
Switch
Tabs
Card
Table
List
Modal
Bottom Sheet
Dropdown
Tooltip
Toast
Alert
Badge
Avatar
Pagination
Search
Breadcrumb
Sidebar
Navigation Bar
Loading Indicator
Skeleton
Empty State
Error State
```

Each component should use the same design rules across the application.

---

# 32. Complete UI States

Every major screen or component should account for:

### Default

Normal state.

### Hover

Mainly for desktop/web pointer interaction.

### Focus

Keyboard or input focus.

### Active

Currently selected or pressed.

### Disabled

Unavailable interaction.

### Loading

Operation is processing.

### Empty

No data currently available.

### Error

Something failed.

### Validation Error

User input is invalid.

### Success

Operation completed.

### Offline

Relevant especially for mobile applications.

---

# 33. Loading States

Avoid full-screen spinner whenever possible.

Use:

```text
Skeleton rows
Skeleton cards
Inline loaders
Progress indicators
Button loading states
```

Example:

```text
[ Saving... ]
```

instead of letting users press Save multiple times.

---

# 34. Empty States

Do not display an empty white screen.

Example:

```text
No projects yet

Create your first project to start working.

[ Create Project ]
```

For search:

```text
No results found for "example"

Try changing your search or filters.
```

---

# 35. Error States

Errors should explain what happened and what the user can do.

Bad:

```text
Error 500
```

Better:

```text
We couldn't load your projects.

Check your connection and try again.

[ Retry ]
```

For developer/admin applications, technical details can optionally be available under:

```text
View Details
```

---

# 36. Accessibility

Web and mobile interfaces should provide:

* Good text/background contrast
* Visible keyboard focus
* Proper input labels
* Accessible names for icon buttons
* Logical tab order
* Large touch targets
* Screen-reader-friendly controls
* Errors that are not communicated by color alone
* Readable text size
* Support for text scaling where possible

Never rely only on:

```text
Green = correct
Red = wrong
```

Also use text or icons.

---

# 37. Design for Real Workflows

Before designing a screen, identify:

```text
What is the user trying to accomplish?
What information do they need?
What action happens most frequently?
What action is most important?
What can fail?
What happens when there is no data?
What happens when there is too much data?
What happens on mobile?
```

The interface should follow the workflow instead of forcing the workflow into a visual template.

---

# 38. Web and Mobile Feature Parity

Web and mobile versions do not need identical interfaces.

They should have consistent:

```text
Data
Terminology
Business logic
Account state
Permissions
Core workflows
```

But interactions can differ.

Example:

```text
WEB
Right-click / Dropdown / Modal / Table

MOBILE
Long press / Bottom Sheet / List / Full Screen Page
```

Same feature, different platform-appropriate interaction.

---

# 39. Information Density

### Web

Can display:

```text
More columns
Persistent sidebar
Side panels
Multiple panes
Advanced filters
Detailed dashboards
```

### Mobile

Prioritize:

```text
Most important information
Primary actions
Compact summaries
Progressive disclosure
Dedicated detail screens
```

Do not force desktop information density onto mobile.

---

# 40. Final Design Principle

Every screen should answer three questions immediately:

```text
1. Where am I?
2. What information matters here?
3. What can I do next?
```

If visual decoration makes any of these harder to understand, remove the decoration.

The goal is not to make the application look like an AI-generated design showcase.

The goal is to make it feel like a **real product people can comfortably use every day.**

=== DELIVERABLE ===

A complete, clickable Figma prototype of the Hospital Appointment System where the
ENTIRE user flow above can be walked through from start to finish (Landing →
Register → Login → Dashboard → Doctor Listing → Availability → Booking →
Confirmation → Status → History → Cancel → Admin management → Logout) without a
single broken link or dead end.
````

---

> ✅ **Output ng Step 6:** Isang buo at clickable na Figma prototype na may kumpletong user flow na walang putol, na susundin ang lahat ng UI/UX design guidelines sa prompt.

---

## 7. Set Up the Project and File Architecture

### Suggested Folder Structure

```text
Healthcare Management Website/
│
├── frontend/                  # User interface (views/pages, CSS, JS)
│   ├── index.html             # Homepage / Landing
│   ├── register.html          # Patient registration form
│   ├── login.html             # Login form
│   ├── dashboard.html         # Patient/Admin dashboard
│   ├── doctors.html           # Doctor listing
│   ├── book-appointment.html  # Appointment scheduling form
│   ├── appointments.html      # Appointment status & history
│   ├── admin/                 # Admin pages (patients, doctors, appointments)
│   ├── css/                   # Styles (responsive design)
│   └── js/                    # Frontend logic & API calls
│
├── backend/                   # Server-side processing
│   ├── config/                # Database connection & app config
│   ├── auth/                  # Authentication handling
│   ├── patients/              # Patient CRUD logic
│   ├── doctors/               # Doctor CRUD logic
│   ├── appointments/          # Appointment CRUD logic
│   └── validation/            # Server-side input validation
│
├── api/                       # REST API endpoints
│
├── database/                  # Database-related files
│   ├── schema.sql             # Database structure (tables, PKs, FKs)
│   └── sample_data.sql        # Dummy/sample data (fictional patients)
│
├── docs/                      # Documentation
│   ├── PROJECT_INSTRUCTIONS.md
│   ├── DEVELOPMENT_PLAN.md
│   └── erd.png                # Database Design / ERD
│
├── .env.example               # Placeholder environment variables
├── agents.md                  # Coding rules for AI agents
└── README.md                  # Installation/Setup instructions
```

### Mga alituntunin

- Sundin ang folder structure na ito habang nagde-develop para malinaw ang paghihiwalay ng Frontend, Backend, API, at Database files (kailangan itong lahat isumite).
- Kapag may existing na structure na, huwag na itong palitan nang walang malinaw na dahilan (tingnan ang `agents.md`).

---

## 8. Install and Configure Dependencies

- Mag-install lamang ng mga libraries/frameworks na kakailanganin — maaaring gumamit ng libraries at frameworks ayon sa instructions, pero **dapat maintindihan at maipaliwanag ng grupo ang bawat code na isusumite**.
- Bago magdagdag ng dependency, siguraduhing:
  1. Wala pang katumbas na functionality sa project.
  2. Wala sa standard library/framework ang supporta nito.
  3. Hindi ito unnecessary o abandoned package.
- I-document sa README.md kung paano i-install ang lahat ng dependencies (`Installation/Setup Instructions` ay required sa documentation).
- I-verify na gumagana ang project pagkatapos ng installation bago magpatuloy.

---

## 9. Configure Environment Variables

- **Huwag mag-hardcode** ng secrets, API keys, tokens, passwords, o database credentials sa source code.
- Gamitin ang environment variables para sa configuration (hal. database host, database name, database user, database password, app secret).
- Gumawa ng `.env` file para sa actual values at `.env.example` para sa placeholder values lang.
- **Huwag isama sa submission o i-commit ang `.env` na may totoong credentials** — real secrets ay hindi kasama sa source control.
- I-update ang `.env.example` kapag may bagong environment variable na kailangan.

### Halimbawa ng `.env.example`

```text
DB_HOST=localhost
DB_NAME=healthcare_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
APP_SECRET=your_app_secret
```

---

## 10. Set Up the Database

### Mga hakbang

1. Gumawa ng database (hal. `healthcare_db`).
2. I-create ang mga tables base sa design sa Step 4 (`users`, `patients`, `doctors`, `appointments`) na may:
   - Primary keys
   - Foreign keys / relationships
   - Tamang data types
3. Maglagay ng **dummy/sample data** — fictional patients, fictional doctors, sample accounts lamang.
   - ⚠️ Ayon sa instructions: **DO NOT use real patients' personal or medical information.**
4. I-save ang:
   - `database/schema.sql` — database structure
   - `database/sample_data.sql` — sample data
   
   (Kailangan itong isumite: SQL file / database backup, database structure, sample data.)
5. I-test ang CRUD operations laban sa database bago ikonekta sa backend.
6. Gawing parameterized ang lahat ng database queries (tingnan din Step 15 — Security).

---

## 11. Plan the API Endpoints

Ang project ay dapat magpakita ng kahit isang gumaganang API (REST API ang pinaka-sapat para sa appointment system).

### Planned REST API Endpoints

| Method | Endpoint | Description | CRUD |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Patient registration | Create |
| POST | `/api/auth/login` | Login / authentication | Read |
| GET | `/api/patients` | List of patients | Read |
| GET | `/api/patients/{id}` | Single patient details | Read |
| POST | `/api/patients` | Add new patient | Create |
| PUT | `/api/patients/{id}` | Update patient info | Update |
| DELETE | `/api/patients/{id}` | Delete patient | Delete |
| GET | `/api/doctors` | Doctor listing | Read |
| GET | `/api/doctors/{id}/availability` | Doctor availability/slots | Read |
| POST | `/api/doctors` | Add doctor (admin) | Create |
| PUT | `/api/doctors/{id}` | Update doctor (admin) | Update |
| DELETE | `/api/doctors/{id}` | Delete doctor (admin) | Delete |
| GET | `/api/appointments` | List appointments (with filters: patient, status) | Read |
| GET | `/api/appointments/{id}` | Appointment details | Read |
| POST | `/api/appointments` | Book new appointment | Create |
| PUT | `/api/appointments/{id}` | Update appointment / status | Update |
| DELETE | `/api/appointments/{id}` | Cancel/delete appointment | Delete |

### API Rules

- I-validate ang lahat ng external input sa backend bago iproseso.
- Consistent ang format ng responses (hal. JSON: `success`, `message`, `data`).
- Huwag i-expose ang internal errors, secrets, stack traces, o sensitive data sa API responses.
- I-document ang lahat ng endpoints (**API Documentation** ay required sa submission).

---

## 12. Implement the Backend

Ang backend ay dapat kayang gawin ang mga sumusunod (mula sa instructions):

- ✅ **Receive requests from the frontend** — tanggapin ang mga requests mula sa frontend forms/pages.
- ✅ **Process user inputs** — iproseso ang data mula sa registration, booking, at management forms.
- ✅ **Perform CRUD operations** — Create, Read, Update, Delete sa patients, doctors, at appointments.
- ✅ **Communicate with the database** — mag-query ng database gamit ang parameterized queries.
- ✅ **Handle authentication** — login/logout, session o token handling, role checking (patient/staff/doctor).
- ✅ **Validate submitted information** — server-side validation (required fields, email format, phone format, date/time validity, duplicate checking).
- ✅ **Return appropriate responses** — success at error responses na maiintindihan ng frontend.

### Implementation Checklist

1. Database connection (gamit ang environment variables mula Step 9).
2. Authentication module (register, login, logout, role-based access).
3. Patient CRUD module.
4. Doctor CRUD module (kasama ang availability).
5. Appointment CRUD module (booking, status update, history, cancel).
6. Validation layer sa lahat ng inputs.
7. Consistent error handling — huwag is silently swallow ang errors; meaningful error responses ang ibalik.

---

## 13. Implement the Frontend

Ang frontend ay dapat mayroong mga sumusunod (mula sa instructions):

- ✅ **User-friendly interface** — malinis, madaling gamitin, healthcare-related design at content.
- ✅ **Responsive design** — gumagana sa desktop, tablet, at mobile (sundin ang responsive behavior sa Figma prototype sa Step 6).
- ✅ **Navigation menu** — working navigation between pages.
- ✅ **Homepage/Dashboard** — landing page + patient/admin dashboard.
- ✅ **Forms for data entry** — registration form, login form, appointment booking form, admin add/edit forms.
- ✅ **Tables or cards for displaying information** — doctor listing (cards), patients/appointments (tables).
- ✅ **Proper validation of user inputs** — client-side validation (para sa instant feedback) + server-side validation (para sa security).
- ✅ **Appropriate healthcare-related design and content** — sundin ang design at content ng Figma prototype.

### Pages base sa User Flow (Step 3 at Step 6)

1. Homepage / Landing
2. Register (Patient)
3. Login
4. Patient Dashboard
5. Doctor Listing
6. Doctor Availability
7. Book Appointment (form)
8. Booking Confirmation — "Appointment Successfully Booked."
9. Appointment Status
10. Appointment History
11. Profile
12. Admin: Dashboard, Patients, Doctors, Appointments management

> Gumamit lang ng dummy data at fictional patients/doctors sa buong frontend.

---

## 14. Connect the Frontend to the Backend

### Integration Flow (base sa Example System Flow ng instructions)

```text
Frontend Form → API Request → Backend (validate) → Database → Result → Backend Response → Frontend Display
```

### Mga gawain

1. I-connect ang bawat form sa kanya-kanyang API endpoint (tingnan ang Step 11):
   - Registration form → `POST /api/auth/register`
   - Login form → `POST /api/auth/login`
   - Booking form → `POST /api/appointments`
   - Admin forms → patients/doctors/appointments endpoints
2. I-display sa frontend ang response ng backend:
   - Success → hal. **"Appointment Successfully Booked."** + appointment summary
   - Validation error → ipakita ang error message sa kanya-kanyang field
   - Server error → friendly error message na may Retry
3. I-handle ang lahat ng UI states mula sa prototype (Step 6): loading, empty, error, validation error, success.
4. I-test ang **buong system flow**: frontend → backend → database → backend → frontend — dapat nagtutulungan ang lahat ng components (**Integration** ay required: "Frontend, backend, and database must communicate").
5. I-test ang CRUD operations end-to-end gamit ang working forms at working navigation.

---

## 15. Apply Security Throughout the Development

Base sa **Security and Privacy** section ng instructions at sa `agents.md`:

### Data Privacy

- ⚠️ **BAWAL gumamit ng real patients' personal or medical information.**
- Gumamit lamang ng: dummy data, sample accounts, fictional patients, fictional medical records.

### Password Protection

- Huwag mag-store ng plain-text passwords — i-hash ang passwords bago i-save sa database.
- Huwag mag-hardcode ng credentials sa source code (gamitin ang environment variables — Step 9).

### Input Validation

- I-validate ang lahat ng inputs sa **frontend** (user experience) at sa **backend** (security).
- Iwasan ang SQL injection — parameterized queries lang.
- Iwasan ang command injection, path traversal, at unsafe dynamic execution.

### Proper Authentication

- May login/logout at session o token handling.
- Role-based access (patient / staff / doctor) — hindi makakapasok ang ordinary user sa admin pages.

### Preventing Unauthorized Access

- I-protect ang admin pages at admin API endpoints — mga ito ay para lang sa authorized users.
- Huwag i-expose ang internal errors, secrets, stack traces, o sensitive data sa responses.
- I-check ang authorization sa bawat request, hindi lang sa UI.

### Secure Handling of User Information

- Huwag i-log ang secrets o sensitive data.
- Huwag isama ang `.env` na may totoong credentials sa submission/source control.
- Iwasan ang paggamit ng ginagamit na totoong email/password sa mga sample accounts.

---

## 🎯 Definition of Done (aligned sa Minimum Functional Requirements)

Bago isumite, siguraduhing:

- [ ] Functional at responsive ang user interface (Frontend)
- [ ] Gumagana ang server-side processing (Backend)
- [ ] May persistent storage ng system data (Database)
- [ ] May kahit isang working API
- [ ] Kumpleto ang CRUD (Create, Read, Update, Delete)
- [ ] Gumagana ang lahat ng data-entry forms
- [ ] May input validation (client-side at server-side)
- [ ] Gumagana ang navigation between pages
- [ ] Nagkakausap ang frontend, backend, at database (Integration)
- [ ] Walang real patient information — dummy/fictional data lang
- [ ] Na-test nang maigi ang buong system bago ang final presentation
