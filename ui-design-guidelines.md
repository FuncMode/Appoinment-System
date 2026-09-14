# Web & Mobile Application UI/UX Design Guidelines

> ✅ **Verified guide** — Ang mga numerong guideline dito ay naka cross-check laban sa mga authoritative source:
> **WCAG 2.2** (W3C), **Apple Human Interface Guidelines**, **Material Design 3** (Google), **Nielsen Norman Group**, **Baymard Institute**, at **Laws of UX**. Tingnan ang [References](#references) sa dulo.

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

> 📌 **Verified:** Walang iisang "official" radius standard, pero ang mga design system ay sumusunod sa consistent radius scale na may **4px increments** (tingnan ang Material Design *Shape* system). Ang pinakamahalaga ay **consistency** — iisang radius scale lang sa buong app, hindi per-component na random values.

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

> 📌 **Verified:** Siguraduhing nakakalusot ang palette sa contrast requirements — normal text ≥ **4.5:1**, large text (≥24px o ≥18.5px bold) ≥ **3:1** laban sa background nito (WCAG 2.2 SC 1.4.3). Ang `#6B7280` sa `#FFFFFF` = ~4.8:1 ✅; pero ang `#6B7280` sa `#F7F8FA` = ~4.5:1 (borderline — i-check pa rin).

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

> 📌 **Note:** Mababa ang readability ng glass/frosted surfaces dahil bumababa ang text-to-background contrast kapag may nilalaman sa likod — direktang conflict ito sa WCAG contrast requirements. Iwasan lalo na sa text-heavy areas (tables, forms).

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

> 📌 **Verified:** Tugma ito sa Material Design *Elevation* system — may defined elevation levels (0dp, 1dp, 3dp, 6dp, 8dp, 12dp, 16dp, 24dp) na may katumbas na shadow sizes. Ang punto: **konti lang ang distinct elevation levels** sa buong app (karaniwan 3–5 levels: card < dropdown < toast < modal), hindi iisang custom shadow bawat component.

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
Loading Page State → Can be centered
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

> 📌 **Verified:** Ito ang **4px/8px base grid** — ang pinakamalawak na spacing convention sa mga design system (ang Material Design ay may 4dp baseline grid; ang maraming design systems ay gumagamit ng 8pt grid). Ang pakinabang: lahat ng spacing ay multiple ng 4, kaya visually nag-a-align ang mga elements at consistent ang rhythm. Iwasan ang arbitrary values (13px, 19px, 27px) dahil hindi sila nag-a-align sa grid.

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

For a hospital/clinic appointment system:

```text
Today's Appointments
Pending Confirmations
Doctor Availability
No-show / Cancellation Rate
Today's Schedule
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

> 📌 **Verified:** Tugma ito sa **aesthetic and minimalist design** heuristic (Nielsen #8) — ang bawat element ay dapat may purpose. Tugma rin ito sa *recognition rather than recall* (Nielsen #6) — ang mga kilalang icons (search magnifier, trash) ay tumutulong sa recognition; ang mga random na icons ay nagdaragdag lang ng cognitive load.

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

> 📌 **Verified:** Ito ang **visual hierarchy** — isa sa mga pinaka-core na UI fundamental (itinuro ito ng UX Playbook, Clay guide, at NN/g). Ang mga technique para gumawa ng hierarchy: **size** (mas malaki = mas importante), **color/contrast** (mas mataas ang contrast = mas nakikita), **font weight**, at **proximity/alignment** (ang magkakaugnay na items ay magkakalapit).

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

> 📌 **Verified:** Tugma ang mga durations na ito sa Material Design *Motion* tokens — ang mga maikling transitions ay nasa ~150–200ms, at ang mas malalaking transitions ay karaniwang ~250–400ms (bihira sumobra sa ~500ms). Mahigit doon, mukhang maluho o mabagal na ang pakiramdam. **Accessibility rule:** galangin ang `prefers-reduced-motion` — magbigay ng non-animated fallback (tingnan ang WCAG 2.2 SC 2.3.3).

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

> 📌 **Note:** Sa text-heavy components (tables, cards, list rows), mag-set ng truncation/ellipsis rules para sa mahahabang values, at mag-design para sa **missing data** (`—` o "Unknown" ang fallback, hindi blank o crash).

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

> 📌 **Note:** Ang 220–280px ay ang karaniwang ginagamit ng mga matatag na dashboard products (karaniwang ~240–260px). Ang linya ay guideline, hindi patakaran — ang susunod na dapat gamitin ay kung magkasya nang komportable ang mga labels nang hindi nagte-truncate.

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

> 📌 **Verified:** Ang placeholder-only forms ay kilalang accessibility/usability problem — kapag nag-type na ang user, **mawawala ang label** at hindi na niya maaalala kung anong field iyon; madalas mababa rin ang placeholder contrast (WCAG 1.4.3 issue). Laging may `label` element ang bawat field.

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

> 📌 **Verified:** Ito ay requirement, hindi bonus — ang **WCAG 2.2 SC 2.1.1 (Keyboard)** ay nag-require na lahat ng functionality ay naka-operate sa keyboard; ang **visible focus indicators** (SC 2.4.7) ay Level AA din. Huwag tanggalin ang `outline` nang walang kapalit na visible focus style.

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

> 📌 **Verified:** Ang **3–5 destinations** ay ang opisyal na guidance ng Material Design para sa bottom navigation. Sa mas maraming sections, gumamit ng drawer/navigation stack.

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

> 📌 **Verified — may nuances ito, ito ang tamang numero:**
>
> | Standard | Minimum |
> |---|---|
> | **Apple HIG** | 44 × 44 pt tappable area |
> | **Material Design** | 48 × 48 dp touch target |
> | **WCAG 2.2 SC 2.5.8** (web, Level AA — required) | 24 × 24 CSS px, **o** sapat na spacing (hindi mag-overlap ang 24px circles ng magkatabing targets) |
> | **WCAG SC 2.5.5** (Level AAA — best practice) | 44 × 44 CSS px |
>
> **Praktikal na rule:** sa touch/primary controls, sundin ang 44–48px. Sa web pointer targets, 24×24px na may sapat na spacing ang AA floor — pero mas mabuti pa rin ang 44px+. Tumutulong din dito ang **Fitts's Law** (Laws of UX): mas malaki at mas malapit ang target, mas mabilis at mas mababa ang error rate.

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

> 📌 **Implementation note (web):** `type="email"`, `type="tel"`, `type="url"`, `inputmode="numeric"` — ang mga ito ang nagtatakda ng mobile keyboard type, at may libreng browser validation pa.

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

> 📌 **Related heuristic:** *Recognition rather than recall* (Nielsen #6) — i-minimize ang mga choices na kailangang tandaan; ipakita ang mga madalas gamitin, itago ang mga bihira sa overflow menu (tingnan din ang **Hick's Law** sa [§42](#42-psychological-principles-behind-the-rules)).

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

> 📌 **Verified:** Ang mga destructive confirmations ay dapat may explicit na **Cancel**, ang destructive button ay naka-istilo bilang **danger** (hindi primary), at ang message ay nagsasabi ng **anong mawawala** — hindi lang "Are you sure?".

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

> 📌 **Verified:** Ang mga ranges na ito ay tugma sa mga karaniwang type scales (ang body text ng Material Design ay 14–16sp; ang UI body text ng Apple HIG ay 17pt sa iOS, ~14–16px sa web). **Dalawang paalala:** (1) Ang 12px pababa ay masyadong maliit para sa body copy — i-reserve lang ang 12px sa helper/metadata text, at (2) ang **minimum 16px** para sa `input` font-size sa mobile ay iniiwasan ang iOS auto-zoom kapag nag-focus ang form field.

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

> 📌 **Verified:** Per **screen/view, isang primary action lang ang dapat may mataas na emphasis** — kung lahat ay primary, wala nang hierarchy (tingnan ang §13). Ang mga danger actions ay hindi dapat naka-pair nang dikit sa mga madaling ma-mis-click na primary actions.

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

> 📌 **Verified:** Ito ang **consistency** principle (UX Playbook; Nielsen #4 *Consistency and standards*; Clay guide) — ang isang component library / design tokens (colors, spacing, radius, shadows) ang mekanismo para panatilihing consistent ang buong app. Ang mga bawat component instance ay dapat magmukha at kumilos nang pareho saanman sila lumabas.

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

> 📌 **Verified:** Ito ang tinatawag na **state matrix** sa mga design system workflows (tinatalakay din ito ng Clay UX guide bilang bahagi ng interaction design). Karaniwang pinakamadalas laktawan ng mga designer: **empty, error, at loading** — kaya lagi itong i-audit bago i-consider na tapos ang isang screen.

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

> 📌 **Verified — idagdag ang response-time thresholds (Nielsen's response time limits):**
>
> | Delay | What users perceive | UI response |
> |---|---|---|
> | **< 0.1s** | Instant — walang napapansin | Walang feedback na kailangan |
> | **0.1–1s** | Napapansin na ang delay, pero hindi pa nawawala ang flow | Hindi na kailangan ang indicator, pero pwede na |
> | **1–10s** | Nawawala ang flow — kailangan ng feedback | **Kailangan na ang spinner/progress/inline loader** |
> | **> 10s** | Mawawala na ang attention | **Progress indicator + option na i-cancel** |
>
> **Praktikal na rules:** (1) ang skeleton screens ay mas mabilis na *pakiramdam* kaysa sa spinner dahil ipinapakita nila ang structure ng darating na content, (2) i-disable/lagyan ng loading state ang submit button para hindi ma-double-submit, at (3) kapag indefinite ang wait, ang spinner ay mas mainam kaysa sa frozen screen — pero kung alam ang progress, mas mainam ang progress bar.

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

> 📌 **Verified:** Tugma ito sa Clay guide at UX Playbook — ang empty state ay may 3 bahagi: **ano ang nangyari** (walang laman / walang tugma), **bakit o ano ang ibig sabihin nito**, at **ano ang susunod na hakbang** (call to action). Sa search/filter empty states, laging mag-offer ng recovery action ("Clear filters").

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

> 📌 **Verified:** Tugma ito sa Nielsen heuristic #9 (*Help users recognize, diagnose, and recover from errors*) — ang mga error messages ay dapat magsabi sa **plain language** (hindi error codes), magsabi ng **problema**, at magbigay ng **constructive advice**. Bonus: i-preserve ang input ng user pagkatapos ng error para hindi sila mag-ulat muli sa simula.

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

> 📌 **Verified — ang eksaktong WCAG 2.2 numbers (Level AA, ang legal/praktikal na target):**
>
> | Requirement | Value | WCAG SC |
> |---|---|---|
> | Normal text contrast | **≥ 4.5:1** | 1.4.3 |
> | Large text (≥24px, o ≥18.5px bold) | **≥ 3:1** | 1.4.3 |
> | Enhanced text contrast (AAA) | ≥ 7:1 | 1.4.6 |
> | **Non-text contrast** (icons, input borders, focus indicators) | **≥ 3:1** | 1.4.11 |
> | Keyboard operable | Lahat ng functionality | 2.1.1 |
> | Visible focus | May visible focus indicator | 2.4.7 |
> | Target size (web) | ≥ 24×24 px (AA) / 44×44 px (AAA) | 2.5.8 / 2.5.5 |
> | Form labels | Bawat field ay may label | 3.3.2 |
> | Error identification | May text description ang errors, hindi color alone | 3.3.1 / 1.4.1 |
>
> **Huwag umasa sa color alone** (SC 1.4.1) — dagdagan ng icon ✅/❌ o text label ang success/error states, dahil ang ~8% ng mga lalaki ay may color vision deficiency.

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

> 📌 **Verified:** Ito ang **user-centered design process** — pareho itong itinuturo ng UX Playbook (user research, personas, usability testing) at Clay guide (user research bilang foundational discipline). Ang mga desisyon sa UI ay dapat naka-anchored sa aktwal na behavior ng user, hindi sa gut-feel o sa trend.

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

> 📌 **Verified:** Ito ang **progressive disclosure** (UX Playbook) — ipakita ang mga default na kailangan, itago ang mga advanced/rarely-needed options sa likod ng interaction (expand, "More", separate screen).

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

---

# RESEARCH-BACKED ADDITIONS

Ang mga sumusunod na sections ay idinagdag pagkatapos ng cross-check sa mga authoritative UX sources — mga principles na hindi sakop ng orihinal na 40 sections pero equally important.

---

# 41. Nielsen's 10 Usability Heuristics (Quick Audit Checklist)

Ang mga ito ang pinaka-widely-cited na usability rules sa buong industriya (Nielsen Norman Group). Gamitin bilang audit checklist per screen:

```text
1.  Visibility of system status      → laging alam ng user kung anong nangyayari (loading, saving, sent)
2.  Match with the real world        → mga salita, icons, at concepts na pamilyar sa user (hindi jargon)
3.  User control and freedom         → may Undo/Cancel/Back/Escape exit sa bawat action
4.  Consistency and standards        → parehong words, icons, at behavior sa buong app
5.  Error prevention                 → i-prevent bago pa mangyari (confirmations, disabled states, validation)
6.  Recognition over recall          → visible ang options; huwag ipa-recall ang mga itinago na info
7.  Flexibility and efficiency       → shortcuts para sa expert users, pwede ring gamitin ng beginner
8.  Aesthetic and minimalist design  → walang irrelevant o bihirang kailangang impormasyon
9.  Error recovery                   → ang mga error ay nasa plain language + may solusyon
10. Help and documentation          → madaling hanapin, naka-contextual kung posibleng
```

> 📌 Karamihan sa mga sections ng guide na ito (§5, §7, §11, §20, §26, §30, §33, §35) ay mga konkretong pagpapakita ng mga heuristikong ito.

---

# 42. Psychological Principles Behind the Rules

Ang mga numeric rules sa guide na ito ay may psychology na basehan — kapag may nagtanong na "bakit 44px?", ito ang mga sagot:

### Fitts's Law

Ang oras para i-target ang isang object ay nakadepende sa **layo nito** at **laki nito**. → Basehan ng 44–48px touch targets (§23) at ng paglalagay ng primary actions sa madaling maabot na lugar.

### Hick's Law

Ang oras ng pagdedesisyon ay tumataas kasabay ng **bilang at komplikasyon ng mga choices**. → Basehan ng "isang primary action per screen" (§30), overflow menus (§26), at progressive disclosure (§39).

### Jakob's Law

Ang mga user ay **gugugulin ang karamihan ng oras nila sa ibang sites/apps**, kaya inaasahan nila ang mga pamilyar na pattern. → Basehan ng "huwag mag-invent ng bago" (§6, §16, §21) — gamitin ang mga convention na alam na ng user (sidebar, bottom nav, breadcrumbs).

### Proximity / Grouping

Ang mga magkakaugnay na items ay dapat magkalapit; ang malalayo ay iba ang iniisip na grupo. → Basehan ng spacing scale (§9) at alignment rules (§8).

> 📌 Source: **Laws of UX** (Jon Yablonski) — https://lawsofux.com/

---

# 43. First Impressions & Performance (UX as a Speed Problem)

Ang UI ay hindi lang itsura — ang bilis ay bahagi ng UX:

```text
First impression          → ang mga user ay bumubuo ng opinyon tungkol sa
                            visual appeal ng isang page sa ~50ms
                            (Lindgaard et al., 2006; ginagamit din ng Clay guide)

Largest Contentful Paint  → ≤ 2.5s    (Google Core Web Vitals — "good")
Interaction to Next Paint → ≤ 200ms  (response sa click/tap)
Cumulative Layout Shift   → ≤ 0.1    (hindi tumatalon ang layout habang naglo-load)
```

Praktikal na UI rules na nagmumula dito:

```text
1. Iwasan ang layout shift (CLS) — mag-reserve ng space para sa images/loading content
   (dahil dito gumagamit ng skeletons na may PAREHONG laki ng totoong content)
2. Instant feedback sa bawat click/tap (<0.1s rule — tingnan ang §33)
3. Iwasan ang mabibigat na animations/decorations sa unang render
```

> 📌 **Verified:** Ang Core Web Vitals thresholds (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) ay ang opisyal na "good" thresholds ng Google. Ang 50ms first-impression study (Lindgaard et al., *Behaviour & Information Technology*, 2006) ang pinagmulan ng sikat na "users judge your design in 50 milliseconds" claim.

---

# References

Ang mga sumusunod ang mga sinanggunian sa pag-verify ng guide na ito:

**Standards & Platform Guidelines**

1. **W3C — WCAG 2.2** (Web Content Accessibility Guidelines)
   - SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
   - SC 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
2. **Apple Human Interface Guidelines** — https://developer.apple.com/design/human-interface-guidelines/
   - 44×44pt minimum tappable area, typography, platform conventions
3. **Material Design 3** (Google) — https://m3.material.io/
   - Motion easing & duration tokens, elevation system, shape scale, bottom navigation (3–5 destinations), 4dp baseline grid

**UX Research & Education**

4. **Nielsen Norman Group** — https://www.nngroup.com/
   - *Response Times: The 3 Important Limits* (0.1s / 1s / 10s): https://www.nngroup.com/articles/response-times-3-important-limits/
   - *10 Usability Heuristics for User Interface Design*: https://www.nngroup.com/articles/ten-usability-heuristics/
5. **UX Playbook** — *UI Fundamentals: Best Practices for UX Designers* ✅ *(binigay na source)*
   - https://uxplaybook.org/articles/ui-fundamentals-best-practices-for-ux-designers
6. **Clay** — *The Ultimate UI/UX Design Guide* ✅ *(binigay na source)*
   - https://clay.global/blog/ux-guide
7. **Laws of UX** (Jon Yablonski) — https://lawsofux.com/
   - Fitts's Law, Hick's Law, Jakob's Law, at iba pang psychological principles
8. **Baymard Institute** — https://baymard.com/
   - E-commerce UX research (forms, checkout) — reference para sa §19, §24
9. **Lindgaard, G. et al. (2006)** — *Attention web designers: You have 50 milliseconds to make a good first impression!*, Behaviour & Information Technology









