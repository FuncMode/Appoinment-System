# DESIGN.md — MedicaCare Visual Direction

> Design direction for the MedicaCare Hospital Appointment System. This is the
> direction file the anti-slop filter (`antislop.md`) reads alongside its rules:
> the filter stops technique without purpose; this file supplies the purpose.

## Design Read

> Reading this as: a **hospital patient portal + public marketing site** for
> **Filipino outpatients of all ages** booking appointments, in a **calm,
> clinical, trust-first** visual language, dial **ENERGY 1 / RHYTHM 2 / MOTION 1**.

## Dials

| Dial | Value | Why |
| --- | --- | --- |
| **ENERGY** | 1 (Calm) | Healthcare. Patients arrive worried or in a hurry; the page must reassure, not excite. Anchor feel: GOV.UK/Stripe clarity, never agency-flashy. |
| **RHYTHM** | 2 (Consistent with a few breaks) | The public pages share a consistent h2 + sub + content rhythm, deliberately broken by: the interactive care-finder panel (left accent rail), the numbered "How it works" rail (no cards), the live clinic-status pill, the portal-preview hero visual, the mono section captions (NHS/GOV.UK caption-above-heading pattern) on public sections, and the centered FAQ sections (Landing/Services — the 760px accordion reads better centered ahead of the centered closing CTA). Those breaks are the identity. |
| **MOTION** | 1 (Hover states only) | Motion budget goes to functional transitions only: FAQ/accordion reveal, carousel slide, 120ms control feedback. No scroll-reveal, no parallax, nothing decorative (also removed once already as R-19/R-01 hygiene). |

## Identity

- **Product:** MedicaCare, a fictional Quezon City hospital (est. 1991) with a
  real, working appointment engine behind the marketing pages.
- **Motif (repeated gesture):** the **live status language** — small colored
  dots and pills that always mean something real (ClinicStatus open/closed,
  appointment status badges, doctor availability, care-finder counts). If a
  dot is on screen, it marks actual state, never decoration.
- **Signature moment:** the Landing **portal preview card**, built from the
  demo patient's actual next appointment, so the marketing page shows the real
  product instead of an illustration.

## Palette (2 core + 1 accent)

- **Core: clinical blue** `--primary #2563EB` (+ hover/pressed/soft ramp).
  Blue reads medical, trustworthy, and calm; it is also the PhilHealth/DOH
  adjacency without claiming affiliation.
- **Core: neutral greys** `#F5F7FA` bg → `#111827` text. Quiet surfaces let
  medical data (names, times, statuses) be the color on the page.
- **Accent: semantic status colors** (success/warning/error/info + the amber
  rating star `#F59E0B`). Used only where they encode real state.
- Neutrals don't count toward the palette cap (R-29). No gradients as
  decoration; the one allowed gradient is the brand-blue overlay on auth
  photos, whose written job is quote-text readability.

## Typography

- **IBM Plex Sans** for everything: humanist, slightly technical, reads well at
  small sizes (medical data), and matches the Plex family's healthcare/lab
  heritage. Not Inter, not a display face: trust over trend.
- **IBM Plex Mono** reserved for reference numbers/receipts (booking codes,
  CSV exports) where "machine output" is the message.
- Weights 400-700; hierarchy via size + weight + color, not letter-spacing tricks.

## Icons

- **Lucide** via CDN: thin, rounded, clinical line icons that match the
  quiet-surfaces direction. Rule in code: *icons only when they clarify*
  (calendar, clock, phone, status); no sparkle/robot/AI ornament set, and no
  icon chips wrapping every feature.

## Theme

- **Fixed light theme, on purpose.** Clinical readability (medical data on
  white), matches hospital print materials (forms, prescriptions), and a
  majority-older patient audience. A dark mode toggle is intentionally out of
  scope for the prototype; if it is ever requested, R-21/R-34 apply: it ships
  working in BOTH modes or not at all.

## Motion

- 120ms control feedback (hover/border/focus), 200-450ms state transitions
  (accordion, carousel), both respecting `prefers-reduced-motion`. Nothing
  else moves.
- **Public section entrances removed** (frontend-design skill audit, applied
  to all public pages): the GSAP `AnimatedContent` scroll-reveal wrappers on
  every public section, the `FadeContent` blocks, the staggered per-card
  entrances on the public Doctors grid, the `SpotlightCard` cursor glows,
  `ClickSpark`/`GradientText` CTA decorations, and the map `GlareHover` were
  all removed — decorative entrances don't communicate state (same rule as
  the R-19 scroll-reveal removal, and the patient-portal doctor-grid
  precedent). GSAP-driven entrances also ignored `prefers-reduced-motion`.
  What remains as motion on public pages: the hero crossfade + title shine +
  Aurora wash (the one orchestrated hero moment), the trust ticker,
  auth-slide page transitions (user-triggered), CountUp stats, Magnet hover,
  and 120ms control feedback.
- **ui-guidelines audit pass (public pages):** the StarBorder CTA on the
  Landing hero was replaced by a solid white `.btn-light` button (no glow /
  gradient border), the Ribbons WebGL cursor-follow layer behind the closing
  CTA was removed, and the trust ticker now pauses on hover and stops under
  `prefers-reduced-motion` (vendored ScrollVelocity, WCAG 2.2.2). The
  remaining public motion set is unchanged: hero crossfade + title shine +
  Aurora wash, the (pausable) trust ticker, auth-slide page transitions
  (user-triggered), CountUp stats, Magnet hover, and 120ms control feedback.
- The Landing testimonial carousel auto-advance is pausable: it stops on
  hover/keyboard focus and via an explicit play/pause toggle (WCAG 2.2.2),
  styled as a third arrow button so it stays within the same control family.
  Under `prefers-reduced-motion: reduce` the auto-advance is off entirely
  (manual arrows/dots remain) — slides would otherwise jump instead of slide.
- Known deliberate exception (documented at the rule site, `styles.css`
  "chart entrance animations" note): the dashboard chart's one-shot draw-in
  stays on even under reduced-motion, because the data is fully readable
  without it.

## Patient portal (audit-002 decisions)

The portal shares the dials above, with these written decisions:

- **frontend-design skill audit (applied to all portal pages):** the portal
  already met the skill's bar — no entrance/scroll-reveal animations, no
  cursor-glow or gradient decorations, card hovers are the quiet 120ms
  border/feedback change, and every empty state carries an action. Copy
  pass applied: sentence em dashes in UI text were replaced with plain
  punctuation (booking empty-slots note, availability "(not a clinic day)"
  option, My messages empty state). The `—` empty-value glyph is unchanged.

- **Portal rhythm:** consistent page-header + card-section rhythm
  (ENERGY 1). The Dashboard breaks it once, on purpose: greeting + next
  appointment banner + stat row + recent activity list, where the banner is
  the focal point. Screens stay quiet; the data is the color.
- **Doctor ratings:** computed from visit ratings — one rating per completed
  appointment, verified against the appointment reference. The demo starts with
  fictional seed ratings from the fictional seed patients so realistic averages
  show from day one; the honesty labels on the Doctors pages disclose that the
  displayed ratings are prototype demo data, and ratings submitted by the
  logged-in patient add to the same pool. Averages are always shown with their
  review count, doctors never start as unrated in marketing views, and ratings
  are **never** used to sort or rank doctors (information, not ranking). This
  supersedes the audit-002 #10 seed-`rating`-field policy (the raw seed field
  is no longer displayed anywhere).
- **Years of experience / portraits:** seed (demo) data, never presented as
  real facts. The Doctor Listing and Availability pages carry visible honesty
  labels ("placeholder portraits (randomuser.me), not real staff"); the
  Medical Records and Profile pages carry their own fictional notes.
- **Public testimonials:** patient-submitted from the portal (Help & support),
  staff-moderated in the admin console before publishing, and shown under a
  display name only (staff see the account identity; the public site does not).
  Until real stories are approved, the Landing carousel shows the clearly
  labeled fictional prototype stories as a fallback; once real ones exist they
  replace the fiction entirely — the two are never mixed in one carousel.
  Auth-screen quotes remain labeled fictional brand copy.
- **Empty-value glyph:** `—` is the declared placeholder for "no value" in
  detail rows, tables, and date fallbacks. It is a null glyph, not
  punctuation; sentence text never uses em dashes (R-02).
- **No outbound notifications:** the prototype sends nothing (no SMS/email
  backend). Copy says only what the portal itself does ("status will update
  here in the portal"); any SMS/email production promise must be labeled as
  such or left out (R-36).
- **Shells are keyboard-first:** sidebar items and breadcrumbs are real
  focusable controls; modals trap Tab and restore focus. The status colors
  and dots on every screen keep the live-status motif: a dot always marks
  real state, including the sidebar's live pending-appointment count.

## Admin console (frontend-design skill audit)

The console shares the dials above and already met the skill's bar: no
entrance/scroll-reveal animations, no cursor-glow/gradient decorations,
table-first layouts where the data is the color, and every empty state
carries an action. Copy pass applied: sentence em dashes in UI text were
replaced with plain punctuation (labs/medications modal title, doctor
portal-access help, Complete visit title, slot-interval help, ticket
follow-up line, reply placeholder, revoke-access note). The `—` empty-value
glyph is unchanged, and the activity trail's `Ref X → Status` notation stays
(functional transition notation in the audit log, not link chrome).

## Doctor portal (frontend-design skill audit)

The portal shares the dials above and already met the skill's bar: no
entrance/scroll-reveal animations, no cursor-glow/gradient decorations, and
the week grid's hover tooltips, skeleton rows, and empty states are all
functional. Copy pass applied: sentence em dashes in UI text were replaced
with plain punctuation (Complete visit modal title, notes help text, no-show
toast, week-grid chip tooltip, dashboard empty-schedule message, feedback
empty-ratings message). The `—` empty-value glyph is unchanged, the `·`
separators in meta lines and tooltips stay (data separators, not link
chrome), and week-grid day headers keep their `Mon–Sun` en dash (a range,
not a sentence dash).
