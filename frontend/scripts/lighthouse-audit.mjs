// One-off Lighthouse audit: all public pages x mobile/desktop, 4 categories.
// Run with the production preview server up:  node scripts/lighthouse-audit.mjs
// Env filters: FORMS=mobile,desktop  PAGES=landing,services  (defaults: all)
import { spawnSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

// Public pages only (App.jsx public routes); patient/admin/doctor portals need a session
const PAGES = [
  ['landing', '/'],
  ['services', '/services'],
  ['doctors', '/doctors'],
  ['about', '/about'],
  ['contact', '/contact'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['register', '/register'],
  ['login', '/login'],
  ['forgot-password', '/forgot-password'],
];

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const CATEGORIES = 'performance,accessibility,best-practices,seo';
const FORMS = (process.env.FORMS || 'mobile,desktop').split(',');
const PAGE_FILTER = process.env.PAGES ? process.env.PAGES.split(',') : null;
const MAX_ATTEMPTS = 3;
const outDir = resolve(process.cwd(), 'lighthouse-reports');
mkdirSync(outDir, { recursive: true });

const lhCli = join(process.env.APPDATA || '', 'npm', 'node_modules', 'lighthouse', 'cli', 'index.js');
const useDirect = existsSync(lhCli); // bypass npx/cmd.exe (mangles args with spaces on Windows)

// chrome-launcher's spawned Chrome dies instantly on this machine (its DevTools
// port never comes up, even though manually launched headless Chrome works and
// serves /json/version fine). Workaround: launch Chrome ourselves on a fixed
// debugging port and point Lighthouse at it with --port.
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LH_PORT = 9223;
const auditId = Date.now();
const profileDir = join(tmpdir(), `lh-audit-profile-${auditId}`);
const killTag = `lh-audit-profile-${auditId}`; // unique substring for process matching

function launchChrome() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu',
    `--remote-debugging-port=${LH_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio',
    'about:blank',
  ], { stdio: 'ignore' });
  chrome.unref();
  // Wait for the DevTools endpoint to answer before handing the port to Lighthouse
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const probe = spawnSync('powershell.exe', ['-NoProfile', '-Command',
      `try { (Invoke-WebRequest "http://127.0.0.1:${LH_PORT}/json/version" -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }`],
      { encoding: 'utf8', timeout: 8000 });
    if (probe.stdout && probe.stdout.trim() === '200') return true;
  }
  return false;
}

function killChrome() {
  // Kill only the audit's Chrome (matched by our unique profile dir name on its
  // command line — plain substring, no backslash escaping needed in -like)
  spawnSync('powershell.exe', ['-NoProfile', '-Command',
    `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${killTag}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`],
    { timeout: 30000 });
}

const summary = [];
let chromeUp = false;
for (const form of FORMS) {
  for (const [name, hash] of PAGES) {
    if (PAGE_FILTER && !PAGE_FILTER.includes(name)) continue;
    const base = join(outDir, `${name}-${form}`);
    const url = `${BASE}/#${hash}`;
    console.log(`\n=== ${name} (${form}) -> ${url}`);
    let parsed = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !parsed; attempt++) {
      if (!chromeUp) {
        killChrome();
        rmSync(profileDir, { recursive: true, force: true });
        chromeUp = launchChrome();
        if (!chromeUp) { console.log('Chrome did not come up; retrying...'); continue; }
      }
      if (attempt > 1) {
        console.log(`retry ${attempt}/${MAX_ATTEMPTS}...`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000); // sync sleep
      }
      const args = [
        url,
        `--output-path=${name}-${form}`,
        '--output=json', '--output=html',
        `--only-categories=${CATEGORIES}`,
        // Lighthouse 13: desktop requires --preset=desktop (it sets form factor
        // AND screen emulation); --form-factor=desktop alone fails validation,
        // and --screenEmulation.desktop is not a real flag
        ...(form === 'mobile'
          ? ['--form-factor=mobile', '--screenEmulation.mobile']
          : ['--preset=desktop']),
        `--port=${LH_PORT}`,
        '--quiet',
      ];
      const runner = useDirect ? process.execPath : 'npx';
      const finalArgs = useDirect ? [lhCli, ...args] : ['lighthouse', ...args];
      // cwd is the reports dir so the output path stays relative — the absolute
      // project path skips shell quoting problems entirely
      const res = spawnSync(runner, finalArgs, {
        shell: !useDirect, encoding: 'utf8', timeout: 240000, cwd: outDir,
      });
      try {
        // Parse the report even if the exit code is 1 — the EPERM-on-cleanup
        // crash happens after the report file is already written
        parsed = JSON.parse(readFileSync(`${base}.report.json`, 'utf8'));
      } catch {
        if (res.stderr) console.log('[stderr]', res.stderr.slice(-500));
      }
    }
    if (!parsed) { chromeUp = false; } // Chrome may be wedged — relaunch on next page
    if (parsed) {
      const row = { page: name, form };
      for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) {
        row[c] = Math.round((parsed.categories[c]?.score ?? 0) * 100);
      }
      row.fcp_ms = parsed.audits['first-contentful-paint']?.numericValue != null
        ? Math.round(parsed.audits['first-contentful-paint'].numericValue) : null;
      row.lcp_ms = parsed.audits['largest-contentful-paint']?.numericValue != null
        ? Math.round(parsed.audits['largest-contentful-paint'].numericValue) : null;
      summary.push(row);
      console.log(`P=${row.performance} A=${row.accessibility} BP=${row['best-practices']} SEO=${row.seo} FCP=${row.fcp_ms}ms LCP=${row.lcp_ms}ms`);
    } else {
      console.log(`FAILED after ${MAX_ATTEMPTS} attempts`);
      summary.push({ page: name, form, performance: null, accessibility: null, 'best-practices': null, seo: null });
    }
  }
}
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('\nDONE — summary written to lighthouse-reports/summary.json');
console.table(summary);

