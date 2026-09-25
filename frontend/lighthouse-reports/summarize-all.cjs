// One-off: summarize all lighthouse reports in this folder.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.report.json'));

const pad = (s, n) => String(s).padEnd(n);
const rows = [];

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const c = j.categories;
  const a = j.audits;
  const g = k => (a[k] && a[k].displayValue) || '-';
  rows.push({
    file: f.replace('.report.json', ''),
    perf: c.performance.score,
    seo: c.seo.score,
    a11y: c.accessibility.score,
    bp: c['best-practices'].score,
    fcp: g('first-contentful-paint'),
    lcp: g('largest-contentful-paint'),
    tbt: g('total-blocking-time'),
    cls: g('cumulative-layout-shift'),
    si: g('speed-index'),
    bytes: g('total-byte-weight'),
  });
}

rows.sort((x, y) => (x.file < y.file ? -1 : 1));
console.log(pad('PAGE', 22) + pad('FORM-Part', 10) + 'Perf  SEO  A11y BP  | FCP    LCP    TBT    CLS    SI     Bytes');
for (const r of rows) {
  // file names look like <page>-<mobile|desktop>
  const m = r.file.match(/^(.*)-(mobile|desktop)$/);
  const page = m ? m[1] : r.file;
  console.log(
    pad(page, 22) + pad(r.file.endsWith('-mobile') ? 'mobile' : 'desktop', 10) +
    pad(r.perf, 6) + pad(r.seo, 5) + pad(r.a11y, 5) + pad(r.bp, 4) + '| ' +
    pad(r.fcp, 7) + pad(r.lcp, 7) + pad(r.tbt, 7) + pad(r.cls, 7) + pad(r.si, 7) + r.bytes
  );
}
