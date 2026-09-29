// Security-checks.mjs — dev-only assertions for the fixes in
// docs/FRONTEND_SECURITY_AUDIT.md (HIGH-002 CSV injection, MEDIUM-002 shared
// HTML escaper, LOW-002 CSPRNG modulo bias).
// Run with: node scripts/security-checks.mjs   (from frontend/)
import { createServer } from 'vite';

globalThis.window = globalThis;
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

let failed = 0;
const eq = (label, got, want) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { csvCell } = await server.ssrLoadModule('/src/admin/helpers.js');
  const { escapeHTML, randomInt } = await server.ssrLoadModule('/src/shared/data.js');

  // HIGH-002 — a leading =, +, -, @, TAB or CR must never reach Excel as a formula
  eq('csvCell =formula', csvCell('=HYPERLINK("http://evil","x")'), `"'=HYPERLINK(""http://evil"",""x"")"`);
  eq('csvCell +formula', csvCell('+1+2'), `'+1+2`);
  eq('csvCell -formula', csvCell('-2+3'), "'-2+3");
  eq('csvCell @formula', csvCell('@SUM(A1)'), "'@SUM(A1)");
  eq('csvCell TAB', csvCell('\tcmd'), "'\tcmd");
  eq('csvCell CR', csvCell('\rcmd'), "'\rcmd");
  // …and the quoting it already did must keep working
  eq('csvCell comma quoting', csvCell('Dela Cruz, Juan'), '"Dela Cruz, Juan"');
  eq('csvCell quote escaping', csvCell('say "hi"'), '"say ""hi"""');
  eq('csvCell newline', csvCell('a\nb'), '"a\nb"');
  eq('csvCell plain', csvCell('Annual check-up'), 'Annual check-up');
  eq('csvCell null', csvCell(null), '');
  eq('csvCell apostrophe kept', csvCell("O'Brien"), "O'Brien");

  // MEDIUM-002 — one hardened escaper for every printed/exported document
  eq('esc angle/amp', escapeHTML('<b> & </b>'), '&lt;b&gt; &amp; &lt;/b&gt;');
  eq('esc double quote', escapeHTML('a " b'), 'a &quot; b');
  eq('esc single quote', escapeHTML("a ' b"), 'a &#39; b');
  eq('esc null', escapeHTML(null), '');
  eq('esc undefined', escapeHTML(undefined), '');
  eq('esc number', escapeHTML(42), '42');
  eq('esc attribute breakout', escapeHTML('" onload="alert(1)'), '&quot; onload=&quot;alert(1)');

  // LOW-002 — rejection sampling: in range, complete, and unbiased
  let inRange = true;
  const counts = new Array(10).fill(0);
  for (let i = 0; i < 50000; i++) {
    const n = randomInt(10);
    if (!Number.isInteger(n) || n < 0 || n >= 10) inRange = false;
    counts[n]++;
  }
  eq('randomInt stays in [0,10)', inRange, true);
  eq('randomInt(1) === 0', randomInt(1), 0);
  eq('randomInt covers every bucket', counts.every(c => c > 0), true);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  eq(`randomInt distribution spread ${min}-${max}`, max / min < 1.15, true); // ~5k per bucket at 50k draws

  const { generateOtp } = await server.ssrLoadModule('/src/shared/ui.jsx');
  const otp = generateOtp();
  eq('generateOtp length', otp.length, 6);
  eq('generateOtp charset', /^[0-9A-Z]{6}$/.test(otp), true);
} catch (e) {
  failed++;
  console.log('FAIL  unexpected error:', e.message);
} finally {
  await server.close();
}

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
