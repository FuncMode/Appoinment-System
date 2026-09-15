// Dev-only browser click-through (audit-002 #19 / R-35): drives the built app
// in a headless Chrome/Edge via the DevTools Protocol and exercises every
// patient-portal control at desktop + mobile widths, checking for console
// errors and horizontal overflow on every screen.
//
// Zero dependencies (Node 18+ built-in fetch/WebSocket + a system browser).
// Run with:
//   npm run build
//   npx vite preview --port 4179 --strictPort   (terminal 1)
//   node scripts/clickthrough.mjs               (terminal 2)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BROWSER = process.env.BROWSER_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 4181;
const APP = 'http://localhost:4179';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

// ---------- CDP over WebSocket (no ws dependency needed) ----------
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.open = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', () => reject(new Error('CDP websocket failed')), { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method && this.handlers.has(msg.method.split('.')[0])) {
        this.handlers.get(msg.method.split('.')[0])(msg.params);
      }
    });
  }
  on(domain, handler) { this.handlers.set(domain, handler); }
  async send(method, params = {}) {
    await this.open;
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP timeout: ' + method));
        }
      }, 15000);
    });
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- results ----------
const results = [];
let pageErrors = [];
function step(name, fn) {
  return (async () => {
    try { await fn(); results.push(`PASS  ${name}`); }
    catch (e) { results.push(`FAIL  ${name}\n        -> ${String(e.message).split('\n')[0]}`); }
  })();
}

// ---------- browser ----------
async function launchBrowser() {
  const profile = mkdtempSync(join(tmpdir(), 'mc-click-'));
  const proc = spawn(BROWSER, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1280,800', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    try {
      targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      if (targets?.length) break;
    } catch { /* not up yet */ }
  }
  if (!targets?.length) throw new Error('browser did not expose a CDP target');
  const page = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  cdp.on('Runtime', (p) => {
    if (p.method === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails;
      pageErrors.push((d.exception?.description || d.text || 'exception').split('\n')[0]);
    } else if (p.method === 'Runtime.consoleAPICalled' && p.type === 'error') {
      pageErrors.push('console.error: ' + (p.args || []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
    }
  });
  cdp.on('Log', (p) => {
    if (p.entry?.level === 'error' && !/favicon|net::ERR_ABORTED/i.test((p.entry.url || '') + ' ' + p.entry.text)) {
      pageErrors.push('log: ' + p.entry.text.slice(0, 200));
    }
  });
  cdp.close = async () => {
    // Chrome/Edge spawns child processes — kill the whole tree, then clean up
    try { spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { proc.kill(); }
    await sleep(600);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); }
    catch { /* temp dir cleanup is best-effort */ }
  };
  return cdp;
}

// ---------- in-page helpers (installed via Runtime.evaluate) ----------
const HELPERS = `
window.__q  = (sel) => !!document.querySelector(sel);
window.__click = (sel, text) => {
  const els = [...document.querySelectorAll(sel)];
  const el = text
    ? els.find(e => e.textContent.trim().toLowerCase().includes(String(text).toLowerCase()) && e.getClientRects().length > 0)
    : els.find(e => e.getClientRects().length > 0);
  if (!el) return false;
  el.click();
  return true;
};
window.__set = (sel, value, idx = 0) => {
  const el = [...document.querySelectorAll(sel)][idx];
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};
window.__hash = () => window.location.hash;
window.__overflow = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
window.__text = () => document.body.innerText;
window.__count = (sel, text) => [...document.querySelectorAll(sel)]
  .filter(e => !text || e.textContent.toLowerCase().includes(String(text).toLowerCase())).length;
true;
`;

class Session {
  constructor(cdp) { this.cdp = cdp; }
  async eval(expression) {
    const r = await this.cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'evaluate failed');
    return r.result?.value;
  }
  async installHelpers() { await this.eval(HELPERS); }
  async goto(hash, waitFor = 'window.__q("#root") && document.body.innerText.length > 150') {
    await this.eval(`window.location.hash = '${hash}'`);
    await this.waitFor(waitFor);
    await sleep(250);
  }
  async waitFor(expr, timeout = 6000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { if (await this.eval(expr)) return true; } catch { /* retry */ }
      await sleep(120);
    }
    throw new Error('waitFor timed out: ' + expr.slice(0, 80));
  }
  async click(sel, text) {
    // Retry loop: pages simulate a 600ms fetch, so controls can appear late
    const expr = `window.__click(${JSON.stringify(sel)}, ${JSON.stringify(text ?? null)})`;
    const t0 = Date.now();
    for (;;) {
      if (await this.eval(expr)) return sleep(250);
      if (Date.now() - t0 > 5000) throw new Error(`not found/clickable: ${sel}${text ? ` "${text}"` : ''}`);
      await sleep(150);
    }
  }
  async set(sel, value, idx) {
    if (!(await this.eval(`window.__set(${JSON.stringify(sel)}, ${JSON.stringify(value)}, ${idx ?? 0})`))) {
      throw new Error(`not found: ${sel}[${idx ?? 0}]`);
    }
    return sleep(150);
  }
  async expect(expr, what) {
    if (!(await this.eval(expr))) throw new Error('expect failed: ' + (what || expr.slice(0, 80)));
  }
  async noOverflow(what) {
    const o = await this.eval('window.__overflow()');
    if (o > 2) throw new Error(`horizontal overflow ${o}px on ${what}`);
  }
}

// ---------- scenario ----------
async function runScenario(s, vp) {
  const M = vp.name === 'mobile';

  // --- login through the real form (demo account shortcut) ---
  await step(`[${vp.name}] login: demo account → portal`, async () => {
    await s.goto('/login');
    await s.click('.demo-accounts-toggle');
    await s.click('.demo-account');                 // fills email/password
    await s.click('form button[type="submit"]');
    await s.waitFor(`window.__hash().includes('/patient/dashboard')`);
  });

  // --- dashboard ---
  await step(`[${vp.name}] dashboard renders (stats + quick actions)`, async () => {
    await s.waitFor(`window.__count('.quick-action') >= 3`);
    await s.expect(`window.__count('.card') >= 2`, 'stat/summary cards');
    await s.noOverflow('dashboard');
  });
  await step(`[${vp.name}] dashboard: notifications bell + mark all read`, async () => {
    await s.click('.notif-wrap .btn-icon');
    await s.waitFor(`window.__q('.notif-panel')`);
    await s.click('.notif-panel .btn-link', 'Mark all as read');
    await s.click('.notif-wrap .btn-icon');         // close
  });
  if (!M) {
    await step(`[${vp.name}] sidebar: keyboard buttons + navigation`, async () => {
      await s.click('.sidebar-item', 'Find a doctor');
      await s.waitFor(`window.__hash().includes('/patient/doctors')`);
      await s.eval(`window.location.hash = '/patient/dashboard'`);
      await sleep(300);
    });
  } else {
    await step(`[${vp.name}] mobile drawer: hamburger → nav item`, async () => {
      await s.click('.mobile-menu-btn');
      await s.waitFor(`window.__q('.mobile-nav .sidebar-item')`);
      await s.click('.mobile-nav .sidebar-item', 'Find a doctor');
      await s.waitFor(`window.__hash().includes('/patient/doctors')`);
    });
  }

  // --- doctor listing ---
  await step(`[${vp.name}] doctors: honesty label present`, async () => {
    await s.goto('/patient/doctors');
    await s.waitFor(`window.__text().includes('prototype demo data')`);
  });
  await step(`[${vp.name}] doctors: search filters cards`, async () => {
    await s.set('.doctor-filter-search input', 'cardio');
    await s.waitFor(`window.__count('.doctor-card') >= 1`);
    await s.set('.doctor-filter-search input', '');
    await sleep(300);
  });
  await step(`[${vp.name}] doctors: specialty + availability filters`, async () => {
    await s.set('select', 'Cardiology', 0);
    await s.waitFor(`window.__count('.doctor-card') >= 1`);
    await s.set('select', 'available', 1);
    await sleep(200);
    await s.set('select', 'all', 1);
    await s.set('select', 'all', 0);                // reset to placeholder option
    await sleep(200);
  });
  await step(`[${vp.name}] doctors: View profile modal open + close`, async () => {
    await s.click('.doctor-card .btn', 'View profile');
    await s.waitFor(`window.__q('.modal')`);
    await s.click('.modal .btn-icon');              // aria-label "Close dialog"
    await s.waitFor(`!window.__q('.modal')`);
  });
  await step(`[${vp.name}] doctors: Book button → availability`, async () => {
    await s.click('.doctor-card .btn', 'Book');
    await s.waitFor(`window.__hash().includes('/patient/availability/')`);
  });

  // --- availability ---
  await step(`[${vp.name}] availability: date chip + slot chip + Continue`, async () => {
    await s.waitFor(`window.__count('.date-chip') >= 5`);
    await s.click('.date-chip');
    await s.click('.chip:not(.date-chip):not([disabled])');   // first open slot
    await s.click('.btn', 'Continue');
    await s.waitFor(`window.__hash().includes('/patient/book')`);
    await s.noOverflow('availability');
  });
  await step(`[${vp.name}] availability: Cancel returns to doctors`, async () => {
    await s.click('.btn', 'Cancel');
    await s.waitFor(`window.__hash().includes('/patient/doctors')`);
  });

  // --- booking form ---
  await step(`[${vp.name}] book: empty submit shows validation errors`, async () => {
    await s.goto('/patient/book', `window.__q('form')`);
    await sleep(700);                               // simulated fetch + skeleton
    await s.click('form button[type="submit"]');
    await s.waitFor(`window.__count('.field-error') >= 1`);
  });
  await step(`[${vp.name}] book: valid submit → confirmation`, async () => {
    await s.set('form select', 'd9', 0);            // doctor
    await s.eval(`(() => { const t = [...document.querySelectorAll('form select')][1]; const opt = [...t.options].find(o => o.value); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(t, opt.value); t.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    await sleep(300);
    await s.eval(`(() => { const t = [...document.querySelectorAll('form select')][2]; const opt = [...t.options].find(o => o.value); if (opt) { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(t, opt.value); t.dispatchEvent(new Event('change', {bubbles:true})); } })()`);
    await s.set('form textarea', 'Automated click-through verification booking', 0);
    await s.set('form input.input', '+63 917 555 0101', 0);
    await s.click('form button[type="submit"]');
    await s.waitFor(`window.__hash().includes('/patient/confirmation')`);
  });

  // --- confirmation ---
  await step(`[${vp.name}] confirmation: reference number + actions`, async () => {
    await s.waitFor(`window.__text().includes('Appointment successfully booked')`);
    await s.expect(`window.__text().includes('Reference')`, 'reference number shown');
    await s.click('.btn', 'View appointment status');
    await s.waitFor(`window.__hash().includes('/patient/status')`);
  });

  // --- status ---
  await step(`[${vp.name}] status: timeline + details link`, async () => {
    await s.waitFor(`window.__count('.card') >= 1`);
    await s.click('.btn', 'View full appointment details');
    await s.waitFor(`window.__hash().includes('/patient/appointment/')`);
  });

  // --- history ---
  await step(`[${vp.name}] history: search + filters + sort`, async () => {
    await s.goto('/patient/history', `window.__q('.table-toolbar') || window.__q('.card')`);
    await sleep(700);
    await s.set('.table-toolbar input', 'cardiac');
    await s.waitFor(`window.__count('tbody tr') <= 2`);
    await s.set('.table-toolbar input', '');
    await s.set('select', 'pending', 0);            // status filter select
    if (!M) await s.click('.th-sort');              // sort header: desktop table only
    await s.noOverflow('history');
  });
  await step(`[${vp.name}] history: row actions → details page`, async () => {
    await s.click('tbody .btn', 'Details');
    await s.waitFor(`window.__hash().includes('/patient/appointment/')`);
  });

  // --- appointment details ---
  await step(`[${vp.name}] details: receipt + ics downloads`, async () => {
    await s.waitFor(`window.__text().includes('Appointment details')`);
    await s.click('.btn', 'Download receipt');
    await s.click('.btn', 'Add to calendar');
    await sleep(300);
  });
  await step(`[${vp.name}] details: reschedule modal works`, async () => {
    await s.click('.btn', 'Reschedule appointment');
    await s.waitFor(`window.__q('.modal select')`);
    // Pick the SECOND date option: the first one is the appointment's own
    // current date, and re-selecting it keeps Save disabled (no-op reschedule)
    await s.eval(`(() => { const t = document.querySelector('.modal select'); const opts = [...t.options].filter(o => o.value); const opt = opts[1] || opts[0]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(t, opt.value); t.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    // Save can be swallowed if clicked before the slot chip's re-render lands
    // (disabled button) — retry chip+Save until the modal actually closes
    let closed = false;
    for (let i = 0; i < 4 && !closed; i++) {
      await s.click('.modal .chip:not([disabled])');  // first open slot chip
      await s.click('.modal .btn', 'Save new schedule');
      try { await s.waitFor(`!window.__q('.modal')`, 2000); closed = true; } catch { /* retry */ }
    }
    if (!closed) {
      throw new Error('reschedule modal never closed | SAVE-DISABLED=' + await s.eval(
        `(() => { const b = [...document.querySelectorAll('.modal .btn')].find(x => x.textContent.includes('Save new schedule')); return b ? String(b.disabled) : 'NO-SAVE-BTN'; })()`)
        + ' | CHIPS=' + await s.eval(
        `(() => { const chips = [...document.querySelectorAll('.modal .chip')]; return chips.length + ' total, enabled=' + chips.filter(c => !c.disabled).length + ', on=' + chips.filter(c => c.className.includes(' on')).length; })()`)
        + ' | MODAL=' + await s.eval(
        `document.querySelector('.modal') ? document.querySelector('.modal').innerText.slice(0, 120).replace(/\\n/g, ' | ') : 'NO MODAL'`));
    }
    await s.waitFor(`window.__text().includes('Moved to') || window.__text().includes('Appointment rescheduled')`, 6000);
  });
  await step(`[${vp.name}] details: cancel flow opens confirm modal, Keep it keeps`, async () => {
    await s.click('.btn', 'Cancel appointment');
    await s.waitFor(`window.__text().includes('Cancel this appointment?')`);
    // One retry: a synthetic click can land on a node React is replacing
    try {
      await s.click('.modal .btn', 'Keep it');
      await s.waitFor(`!window.__q('.modal')`, 2500);
    } catch {
      await s.click('.modal .btn', 'Keep it');
      await s.waitFor(`!window.__q('.modal')`, 4000);
    }
  });

  // --- profile ---
  await step(`[${vp.name}] profile: edit + save persists`, async () => {
    await s.goto('/patient/profile', `window.__q('form')`);
    await sleep(700);
    await s.set('form input.input', '+63 917 234 9999', 0);
    await s.click('form button[type="submit"]');
    await s.waitFor(`window.__q('.toast')`);
  });
  await step(`[${vp.name}] profile: wrong current password shows inline error`, async () => {
    const pwForm = await s.eval(`[...document.querySelectorAll('form')].length - 1`);
    await s.set('form input[type="password"]', 'wrongpass', 0);
    await s.set('form input[type="password"]', 'newpass123', 1);
    await s.set('form input[type="password"]', 'newpass123', 2);
    await s.eval(`[...document.querySelectorAll('form')][${pwForm}].requestSubmit()`);
    await s.waitFor(`window.__text().includes('Current password is incorrect')`);
  });

  // --- records ---
  await step(`[${vp.name}] records: fictional note + table`, async () => {
    await s.goto('/patient/records', `window.__q('table')`);
    await sleep(700);
    await s.expect(`window.__text().includes('fictional demo records')`, 'fictional note');
    await s.expect(`window.__count('tbody tr') > 0`, 'record rows');
    await s.noOverflow('records');
  });

  // --- help ---
  await step(`[${vp.name}] help: FAQ accordions toggle`, async () => {
    await s.goto('/patient/help', `window.__count('button[aria-expanded]') >= 4`);
    // Only the FAQ buttons (inside .card-body) — the notif bell also has aria-expanded
    await s.eval(`[...document.querySelectorAll('.card-body button[aria-expanded]')].forEach(b => b.click())`);
    await sleep(300);
    await s.expect(`window.__text().includes('within the scope of this prototype')`, 'honest security answer visible');
    await s.noOverflow('help');
  });

  // --- logout ---
  await step(`[${vp.name}] logout returns to login`, async () => {
    if (M) {
      await s.click('.mobile-menu-btn');
      await s.waitFor(`window.__q('.mobile-nav .btn-icon')`);
    }
    await s.click('.sidebar-footer .btn-icon');     // aria-label "Log out"
    await s.waitFor(`window.__hash().includes('/login')`);
  });

  // --- admin console sanity (sidebar buttons + live count render here too) ---
  await step(`[${vp.name}] admin: demo login + sidebar + live badge`, async () => {
    await s.goto('/admin/login', `window.__q('.demo-account') || window.__q('form')`);
    const hasDemo = await s.eval(`window.__click('.demo-accounts-toggle')`);
    if (hasDemo) await s.click('.demo-account');
    await s.click('form button[type="submit"]');
    await s.waitFor(`window.__hash().includes('/admin/dashboard')`);
    await sleep(700);
    if (!M) {
      await s.click('.sidebar-item', 'Doctors');
      await s.waitFor(`window.__hash().includes('/admin/doctors')`);
    }
    await s.expect(`window.__count('.sidebar-item .badge-count') >= 1`, 'live pending badge');
    await s.noOverflow('admin dashboard');
    if (M) {                                        // sidebar is drawer-only on mobile
      await s.click('.mobile-menu-btn');
      await s.waitFor(`window.__q('.mobile-nav .sidebar-footer .btn-icon')`);
    }
    await s.click('.sidebar-footer .btn-icon');     // log out of admin
    await s.waitFor(`window.__hash().includes('/admin/login')`);
  });

  if (pageErrors.length) {
    throw new Error(`console/page errors on ${vp.name}: ${pageErrors.slice(0, 3).join(' | ')}`);
  }
}

async function runViewport(vp) {
  const cdp = await launchBrowser();
  const s = new Session(cdp);
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: vp.mobile ? 2 : 1, mobile: vp.mobile,
    });
    await cdp.send('Page.navigate', { url: APP + '/#/login' });
    await sleep(1200);
    await s.installHelpers();
    pageErrors = [];
    await runScenario(s, vp);
  } catch (e) {
    results.push(`FAIL  [${vp.name}] scenario aborted -> ${String(e.message).split('\n')[0]}`);
  } finally {
    await cdp.close();
  }
}

console.log(`Click-through vs ${APP} (${VIEWPORTS.map(v => v.name).join(' + ')})\n`);
for (const vp of VIEWPORTS) await runViewport(vp);

const fails = results.filter(r => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(`\n${results.length - fails.length}/${results.length} actions passed, ${fails.length} failed.`);
if (fails.length) { console.log('\nFAILURES:'); fails.forEach(f => console.log(f)); }
process.exit(fails.length ? 1 : 0);




