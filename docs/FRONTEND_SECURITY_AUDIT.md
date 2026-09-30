# Frontend Security Audit — MedicaCare

**Skill:** `frontend-security` (from `schalkneethling/webdev-agent-skills`)
**Scope:** `frontend/` (Vite 5 + React 18, hash-routed SPA, no backend)
**Date:** 2026-09-26
**Baseline:** `npm run build` succeeds (`✓ built in 7.00s`), `npm audit` reports 1 high / 1 moderate (both dev-only).

> **Context:** this is a browser-only prototype — all state lives in `localStorage`,
> there is no server, and no `fetch`/`axios` call exists anywhere in `src/`.
> Findings are therefore rated as if this code were shipped to production, with
> prototype-only mitigations called out explicitly. The app's own Privacy and
> Help pages already disclose the localStorage/plain-text-password model.

---

### Summary

- **Critical: 2**
- **High: 2**
- **Medium: 4**
- **Low: 5**

---

### Status as of 2026-09-29 (re-audit vs. this document)

Re-run ng `frontend-security` checklist laban sa current code. Lahat ng
frontend-fixable items sa "Recommended order of work" (rows 1–6) ay **naka-apply
na at verified**:

| Finding | Fix (verified this re-audit) |
|---|---|
| HIGH-002 CSV injection | `csvCell` sa `admin/helpers.js` may leading `= + - @ TAB CR` guard |
| MEDIUM-002 escaper | hardened `escapeHTML` sa `shared/data.js` (kasama ang quotes), shared bilang `esc` sa admin + patient helpers |
| CRITICAL-002 window credentials | `DOCTOR_CREDENTIALS` hindi na naka-publish sa `window`; demo passwords dev-gated (`import.meta.env.DEV`, `data.js: SHOW_DEMO_PASSWORDS`) |
| MEDIUM-001 CSP | `Content-Security-Policy` meta injected at build time (`vite.config.js` `securityMeta()` plugin); referrer meta sa `index.html` |
| LOW-001 innerHTML | `icons.jsx` gumagamit na ng `replaceChildren()` + `ICON_NAME` allowlist regex |
| LOW-002 modulo bias | `randomInt()` rejection-samples na (`data.js`); ginagamit ng `generateOtp()` |
| LOW-004 noopener | `ContactPage` map link: `rel="noopener noreferrer"` |

**Verification run (2026-09-29):** `node scripts/security-checks.mjs` →
**25/25 PASS** (CSV formula, HTML escaping, CSPRNG distribution, OTP charset);
`npm run build` → **SUCCESS**.

**Natitirang open (hindi kaya ng frontend lang):**

| Finding | Bakit open | Susunod na hakbang |
|---|---|---|
| CRITICAL-001, HIGH-001, MEDIUM-004 (+ natitirang CRITICAL-002/LOW-005) | nangangailangan ng totoong server auth | `backend/` scaffold ay ready na — auth module ang unang i-implement (JWT + bcrypt + refresh tokens, tingnan ang `docs/BACKEND_ARCHITECTURE.md` §6) |
| MEDIUM-003 vite/esbuild advisory (GHSA-67mh-4wv8-2f99, dev-server lang) | fix = Vite 5 → 8 major upgrade (breaking) | i-schedule ang upgrade; huwag i-expose ang dev server (`--host`) sa network |
| LOW-003 third-party assets walang SRI | asset work (self-host fonts + portraits) | i-vendor ang IBM Plex at placeholder portraits sa `public/` |

`npm audit` (2026-09-29): 2 advisories, **parehong dev-only** (esbuild moderate +
vite high — dev-server exposure lang, wala sa production bundle).

---

### Critical Findings

#### [CRITICAL-001] Authentication and route guards are forgeable from the browser

- **Location:** `frontend/src/shared/store.jsx:113-123`, `frontend/src/App.jsx:146,171,189`, `frontend/src/shared/ui.jsx:330-349`, `frontend/src/shared/auth.jsx:20-39,92-97`
- **Pattern:**

  ```js
  const [adminSession, setAdminSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nmc.adminSession')) || null; } catch { return null; }
  });
  // ...
  } else if (sub === 'login' || !store.adminSession) {
    screen = <AdminLogin />;
  }
  ```

- **Risk:** the only check guarding the admin console, patient portal and doctor portal is *whether a localStorage key exists*. Anyone can run
  `localStorage.setItem('nmc.adminSession', '{"email":"x","role":"admin"}')` in DevTools and reach every `/admin/*` screen with no credentials.

  The second factor is equally client-side: `generateOtp()` builds the code in the browser, `OtpVerifyModal` **displays it on screen**, and `submit()` compares it in the browser. The OTP adds no security — it is a UI demonstration only.

- **Remediation:**
  1. Move credential verification, session issuance and OTP generation/delivery/verification to a server.
  2. Issue an opaque, server-validated session token (httpOnly + `Secure` + `SameSite` cookie). Never persist an authorization decision in `localStorage`.
  3. Re-check role on **every** state-changing request — the code comment at `store.jsx:112` already states this requirement; nothing currently enforces it.
  4. Until then, treat all three consoles as publicly reachable demos.
- **Reference:** [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) · [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

#### [CRITICAL-002] Hardcoded credentials shipped in the client bundle (and on `window`)

- **Location:** `frontend/src/public/AdminLogin.jsx:22`, `frontend/src/shared/data.js:159`, `frontend/src/shared/store.jsx:89`, `frontend/src/shared/data.js:533-539`
- **Pattern:**

  ```js
  const ADMIN_CREDENTIALS = { email: 'admin@medicacare.ph', password: 'admin123' };   // AdminLogin.jsx:22
  const DOCTOR_CREDENTIALS = { email: 'doctor@medicacare.ph', password: 'doctor123' }; // data.js:159

  Object.assign(window, { /* ... */ DOCTOR_CREDENTIALS, /* ... */ });                 // data.js:533
  ```

- **Risk:** every secret is readable in the built bundle *and* via `window.DOCTOR_CREDENTIALS.password` at runtime, by any script on the page. The passwords are also rendered into the DOM as a "demo account" helper (`AdminLogin.jsx:150`, `DoctorLogin.jsx:169`, `Login.jsx:168`), so they appear in screenshots, screen-shares and browser autofill.

- **Remediation:**
  1. Remove `DOCTOR_CREDENTIALS` from the `Object.assign(window, …)` block in `data.js` — nothing outside the seed path needs it, and `window.findDoctor` et al. can stay.
  2. Move demo credentials out of source into a dev-only, non-production flag (e.g. `import.meta.env.VITE_DEMO_LOGIN`) guarded by `import.meta.env.DEV`, or drop them entirely.
  3. Never compare against a literal in production; the server owns the credential store.
- **Reference:** [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

### High Findings

#### [HIGH-001] Passwords stored and compared in plaintext in `localStorage`

- **Location:** `frontend/src/shared/store.jsx:65,89`, `frontend/src/public/Login.jsx:66`, `frontend/src/public/DoctorLogin.jsx:61`, `frontend/src/patient/Profile.jsx:121,132`, `frontend/src/admin/DoctorsMgmt.jsx:62,71`
- **Pattern:**

  ```js
  if (account && account.password === form.password) { /* grant session */ }
  localStorage.setItem('nmc.users', JSON.stringify(users)); // users[].password is cleartext
  ```

- **Risk:** the full account list — including every registered patient, every admin-issued doctor account, and any password reset performed in the console — sits readable in `localStorage`. Any XSS, malicious browser extension, shared/kiosk machine, or `DevTools > Application` visit dumps **every** user's current password. Password-change and password-reset flows re-persist the new secret in the same cleartext column, so the fix must cover the whole lifecycle, not just login.
- **Remediation:** hash with a salted KDF server-side (`bcrypt`/`argon2id`). In a browser-only prototype the best available approximation is `crypto.subtle.digest('SHA-256', …)` with a per-user salt — imperfect (no work factor) but strictly better than cleartext — and it must be paired with CRITICAL-001 so hashes are never client-verifiable.
- **Reference:** [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

#### [HIGH-002] CSV formula injection in admin exports

- **Location:** `frontend/src/admin/helpers.js:20-23` — consumed by `AdminReports.jsx:73`, `AdminDashboard.jsx:105`, `AppointmentsMgmt.jsx:144`, `DoctorsMgmt.jsx:109`, `PatientsMgmt.jsx:62`
- **Pattern:**

  ```js
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;   // no leading-formula guard
  }
  ```

- **Risk:** `csvCell` neutralises quotes, commas and newlines but not a leading `=`, `+`, `-`, `@`, TAB or CR. The cells carry attacker-influenced data (patient name, reason for visit, message subject, testimonial text). Exported to CSV and opened in Excel/LibreOffice, `=HYPERLINK(...&cmd)` or a DDE payload executes in the spreadsheet user's context — a classic second-order injection from "just a prototype" data.
- **Remediation:**

  ```js
  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // defuse the formula
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  ```

  Applies to all five export call sites with no other changes.
- **Reference:** [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)

---

### Medium Findings

#### [MEDIUM-001] No Content-Security-Policy and no security headers

- **Location:** `frontend/index.html` (whole file) — no `Content-Security-Policy` meta; no `_headers`, `netlify.toml`, `vercel.json`, `.htaccess` or `web.config` anywhere in the repo.
- **Risk:** the app loads Google Fonts CSS, `randomuser.me` avatars, an OpenStreetMap iframe and a vendored `lucide.min.js`. With no CSP, a single injected string would execute unimpeded and exfiltrate everything in `localStorage` (CRITICAL-001/002 data). `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` and `Permissions-Policy` are all unset.
- **Remediation:** add a meta CSP as the deploy-agnostic baseline (header-based is better once a host is chosen):

  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self';
    script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src https://fonts.gstatic.com; img-src 'self' data: https://randomuser.me;
    frame-src https://www.openstreetmap.org; connect-src 'self';
    object-src 'none'; base-uri 'self'; form-action 'self'">
  ```

  Note the meta tag cannot express `frame-ancestors` — set `X-Frame-Options: SAMEORIGIN` at the host. Verify against a Lighthouse run before enforcing (the repo already has `frontend/scripts/lighthouse-audit.mjs`).
- **Reference:** [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

#### [MEDIUM-002] HTML builders escape `<>&` but not quotes — writes into a `srcdoc` sink

- **Location:** `frontend/src/patient/helpers.js:66,101`, `frontend/src/admin/helpers.js:36,156`
- **Pattern:**

  ```js
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // ...
  frame.srcdoc = buildDoctorScheduleHTML(doctor, appts, dateStr);   // admin/helpers.js:156
  ```

- **Risk:** **not currently exploitable** — every interpolation lands in element *text*, and `<>&` escaping is sufficient there. But the sink is real (`iframe.srcdoc`, plus `.html` file downloads from `AppointmentDetails.jsx:71` and `MedicalRecords.jsx:74`), the data is user-controlled, and the escape helper omits `"` and `'`. The moment any interpolated value is moved into an attribute (`class="${esc(x)}"`, `href="${esc(x)}"`), this becomes stored XSS in the printed/exported document.
- **Remediation:** harden `esc` once so attribute contexts are covered too:

  ```js
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  ```

  Ideally hoist this to one shared helper instead of three near-identical copies.
- **Reference:** [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

#### [MEDIUM-003] Dev-server dependency vulnerabilities (`vite`, `esbuild`)

- **Location:** `frontend/package.json:22` (`"vite": "^5.4.11"`)
- **Pattern:** `npm audit` → `1 high`, `1 moderate`

  | Package | Severity | Advisory |
  |---|---|---|
  | `vite <=6.4.2` | **high** | `server.fs.deny` bypass on Windows alternate paths ([GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)) — path traversal / source disclosure, CVSS 7.5 |
  | `vite <=6.4.1` | moderate | Optimized-deps `.map` path traversal ([GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)) |
  | `vite <=6.4.2` | moderate | `launch-editor` NTLMv2 hash disclosure on Windows ([GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)) |
  | `esbuild <=0.24.2` | moderate | Dev server accepts requests from any origin ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)) |

- **Risk:** **dev-only** — none of these ship in `dist/`. But this machine is Windows (where two of the four apply) and the dev server is exposed to `localhost`. Risk rises if `npm run dev` is ever run with `--host`.
- **Remediation:** `npm audit fix` is blocked because the fix is a major bump (`vite@8.3.1`). Plan an explicit Vite 5 → 6/7/8 upgrade. Until then: never run the dev server with `--host`, and keep `node_modules` out of any deployment artifact.
- **Reference:** [OWASP NPM Security](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)

#### [MEDIUM-004] No rate limiting or lockout on credential and OTP attempts

- **Location:** `frontend/src/public/AdminLogin.jsx:47-57`, `frontend/src/public/Login.jsx`, `frontend/src/shared/auth.jsx:31-39`
- **Pattern:** `setTimeout(() => { /* compare password */ }, 700)` — the only "throttle" is a simulated network delay.
- **Risk:** attempts are unlimited and unbounded. Combined with CRITICAL-001 (client-side comparison) there is nothing to slow a brute-force script; OTP accepts unlimited guesses with no expiry, attempt cap, or single-use enforcement (`auth.jsx:34` simply re-compares).
- **Remediation:** enforce server-side — attempt counters, exponential backoff, fixed OTP TTL, single-use codes. Rate-limiting cannot be made meaningful in the browser alone.

---

### Low Findings

#### [LOW-001] `innerHTML` assignment in the icon component

- **Location:** `frontend/src/shared/icons.jsx:12-16`
- **Pattern:** `ref.current.innerHTML = '';` then `window.lucide.createIcons(...)`.
- **Risk:** the assignment only *clears* the node, and `name` comes from app-internal props — **safe today**. The pattern is fragile: `name` is passed straight into an attribute that Lucide turns into SVG, so a future user-controlled `name` becomes DOM XSS.
- **Remediation:** replace with `ref.current.replaceChildren()`, and keep `name` on an allowlist.

#### [LOW-002] Modulo bias in random code/password generation

- **Location:** `frontend/src/shared/ui.jsx:335-345`, `frontend/src/admin/DoctorFormModal.jsx:54-55`
- **Pattern:** `set[buf[0] % set.length]` with `buf` a `Uint32Array(1)`.
- **Risk:** good use of `crypto.getRandomValues` (not `Math.random`), but `2^32 % 6 !== 0` skews the distribution — negligible for a 6-char demo OTP, worth correcting for anything security-bearing.
- **Remediation:** rejection-sample (`while (buf[0] >= Math.floor(0x100000000 / n) * n)`), or use the modulo-free `n === (x = (x * n) >>> 0)` trick.

#### [LOW-003] Third-party resources loaded without Subresource Integrity

- **Location:** `frontend/index.html:10-12` (Google Fonts CSS), `frontend/src/shared/data.js:45,119,151` + `Register.jsx:63` + `DoctorsMgmt.jsx:229` + `PatientsMgmt.jsx:191` (`randomuser.me`), `frontend/src/public/ContactPage.jsx:121` (OpenStreetMap iframe).
- **Risk:** a compromise or outage of `randomuser.me` / `fonts.googleapis.com` alters rendered content for every user. `lucide.min.js` is correctly vendored into `public/` (good).
- **Remediation:** self-host the IBM Plex files (already used across the brand) and vendor a small set of placeholder portraits; pin the OSM embed. SRI on Google Fonts CSS is impractical — self-hosting is the fix.

#### [LOW-004] `target="_blank"` without explicit `rel="noopener"`

- **Location:** `frontend/src/public/ContactPage.jsx:130-137`
- **Risk:** `rel="noreferrer"` is present and implies `noopener` in all current browsers, so this is informational only. Naming both is clearer for future readers.
- **Remediation:** `rel="noopener noreferrer"`.

#### [LOW-005] Credentials rendered into the DOM as demo helpers

- **Location:** `frontend/src/public/AdminLogin.jsx:150`, `frontend/src/public/DoctorLogin.jsx:169`, `frontend/src/public/Login.jsx:168`
- **Risk:** demo passwords appear in the page text, so they land in screenshots, recordings, shared screens and browser autofill prompts. Intentional for demos, but it is what makes CRITICAL-002 visible to every visitor.
- **Remediation:** gate behind `import.meta.env.DEV` or a click-to-copy that reads from a dev-only module, never a literal in the component.

---

### Checked and clear

The following skill scans returned **no findings** — listed so they are not re-audited:

| Scan | Result |
|---|---|
| `dangerouslySetInnerHTML` | none |
| `eval(` / `new Function(` | none |
| `setTimeout(string)` / `setInterval(string)` | none |
| `document.write` | none |
| `location.href =` / `location.replace` / `window.open` | none |
| `outerHTML =` / `insertAdjacentHTML` / `srcdoc` (except MEDIUM-002) | none |
| `fetch(` / `axios` / `XMLHttpRequest` | none — **zero network calls**, so CSRF is structurally N/A (no state-changing HTTP requests exist) |
| `document.cookie` / `postMessage` / `atob(` | none |
| Twig `\|raw` / `autoescape false` | N/A (no Twig) |
| Committed `.env` / secrets files | none found |
| Hardcoded `apiKey` / `secret` literals | none beyond the credential constants in CRITICAL-002 |
| Route guards present for all three portals | yes — `App.jsx:146,171,189` (client-side only, see CRITICAL-001) |
| Free-text input limits | good — `maxLength` on reason/notes/messages (500/300/280/80/40) |
| Email format validation | consistent regex across all auth forms |
| Profile photo upload | MIME-type check + 1 MB cap (`Profile.jsx:39-46`) — but see MEDIUM-002 note: `file.type` is client-asserted |
| OTP randomness | `crypto.getRandomValues` (see LOW-002) |
| React rendering of user data | text-node interpolation throughout — React auto-escapes; no raw sinks |

---

### Recommended order of work

| # | Item | Effort | Blocking for production? |
|---|---|---|---|
| 1 | HIGH-002 CSV formula injection | ~5 lines in one function | **Yes** |
| 2 | MEDIUM-002 harden the shared `esc()` helper | ~3 lines × 3 files | **Yes** |
| 3 | CRITICAL-002 drop `DOCTOR_CREDENTIALS` from `window` | 1 line + env gate | **Yes** |
| 4 | MEDIUM-001 add CSP + security headers | ~10 lines in `index.html` | **Yes** |
| 5 | LOW-003 self-host fonts + portraits | asset work | Recommended |
| 6 | LOW-001 / LOW-002 / LOW-004 | trivial | Recommended |
| 7 | CRITICAL-001 + HIGH-001 + MEDIUM-004 → real backend auth | **requires backend** | **Yes — cannot be solved in the frontend** |

Items 1–6 are frontend-only and can be fixed now. Items in row 7 define the
prototype's hard ceiling: no amount of client-side code can make a
browser-verified login trustworthy. Until a backend exists, the Privacy page's
existing disclosure (`PrivacyPage.jsx:26`) is the accurate description of the
security posture.

---

### References

- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP DOM Clobbering](https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html)
- [OWASP Node.js Security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [OWASP NPM Security](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)
- [OWASP AJAX Security](https://cheatsheetseries.owasp.org/cheatsheets/AJAX_Security_Cheat_Sheet.html)
- [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [OWASP User Privacy](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html)
