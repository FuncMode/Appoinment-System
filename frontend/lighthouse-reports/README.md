# Lighthouse Audit — Public Pages (Mobile + Desktop)

Production build (`npm run build` + `vite preview`), Lighthouse 13.4.1, Chrome headless (localhost).
Rerun: `node scripts/lighthouse-audit.mjs` (preview server sa port 4173; filters: `FORMS=`, `PAGES=`).

## Final scores (pagkatapos ng fixes)

| Page | Perf mobile | Perf desktop | A11y (M/D) | BP (M/D) | SEO (M/D) |
|---|---|---|---|---|---|
| Landing | 63 | 95 | 100/100 | 100/100 | 100/100 |
| Services | 85 | 100 | 100/100 | 100/100 | 100/100 |
| Doctors | 86 | 99 | 100/100 | 100/100 | 100/100 |
| About | 87 | 99 | 100/100 | 100/100 | 100/100 |
| Contact | 86 | 100 | 100/100 | 100/100 | 100/100 |
| Privacy | 87 | 100 | 100/100 | 100/100 | 100/100 |
| Terms | 87 | 99 | 100/100 | 100/100 | 100/100 |
| Register | 82 | 99 | 100/100 | 100/100 | 100/100 |
| Login | 84 | 99 | 100/100 | 100/100 | 100/100 |
| Forgot password | 83 | 99 | 100/100 | 100/100 | 100/100 |

Landing mobile LCP: **19.7s → 4.9s**. FCP mobile: **~3.6–5.1s → ~3.0–3.6s**.

## Mga fix na isinagawa

### Performance
- **Hero slides + auth backgrounds: PNG → WebP** (`ffmpeg`, resized): 3.1 MB → 190 KB (hero),
  2.2 MB → 102 KB (auth). Binura ang lumang PNGs; CSS refs in-update sa `styles.css`.
- **lucide UMD (350 kB, render-blocking CDN)** → naka-vendor sa `public/lucide.min.js`
  (same-origin, served by vite preview; walang third-party roundtrip).

### Accessibility
- **landmark-one-main**: ang root ng bawat public page ay `<main>` na (Landing, Services, Doctors,
  About, Contact, Privacy/Terms via LegalPage, Register, Login, ForgotPassword, AdminLogin, DoctorLogin).
- **button-name**: pagination buttons sa `shared/ui.jsx` may `aria-label` na ("Previous page", "Page N", "Next page").
- **select-name**: `SelectInput` nagfa-fallback sa text ng unang option kapag walang `aria-label`.
- **label (login password)**: `PwField` gumagamit ng `useId()` + `Field htmlFor` para sa explicit label association.
- **heading-order (services)**: feature-card titles ay `<h2 class="feature-card-title">` (styled dating h3 look).
- **color-contrast**: `.footer-emergency strong` at notice-bar `<strong>` → `#B91C1C` (≈6.3:1 sa #FEF2F2);
  muted text sa `--primary-soft` panel (doctors page) → `--text-secondary`.

### Best Practices
- **404 favicon**: bagong `public/favicon.svg` + `<link rel="icon">`.

### SEO
- `<meta name="description">` sa `index.html`; `public/robots.txt` (Disallows: /admin, /doctor, /patient).

## Files
- `summary.json` — 20 rows (10 pages × 2 form factors) + FCP/LCP
- `../scripts/lighthouse-audit.mjs` — audit runner (may retries at sariling Chrome launcher dahil
  ang chrome-launcher ay namamatay sa machine na ito; desktop = `--preset=desktop` sa Lighthouse 13)
- `../scripts/inspect-report.mjs` — quick inspector ng isang report (failing audit elements)

Note: dina-delete ang per-page `.report.json/.html` files matapos i-capture ang results (para hindi
mabakat sa repo) — i-rerun ang script para mabuo ulit ang mga full report anumang oras.

