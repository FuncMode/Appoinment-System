// Temp analysis script: extract key opportunities per report. Delete after use.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.report.json'));

const rows = [];
for (const f of files) {
  const name = f.replace(/\.report\.json$/, '');
  const m = name.match(/-(mobile|desktop)$/);
  if (!m) continue;
  const page = name.replace(/-(mobile|desktop)$/, '');
  const formFactor = m[1];
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const audits = r.audits;
  const opps = [];
  for (const key of [
    'render-blocking-resources', 'unused-css-rules', 'unused-javascript',
    'uses-responsive-images', 'uses-optimized-images', 'modern-image-formats',
    'offscreen-images', 'total-byte-weight', 'mainthread-work-breakdown',
    'bootup-time', 'dom-size', 'largest-contentful-paint-element',
    'lcp-lazy-loaded', 'prioritize-lcp-image'
  ]) {
    const a = audits[key];
    if (!a || a.score === null || a.score === 1) continue;
    const savings = a.details && a.details.overallSavingsMs ? Math.round(a.details.overallSavingsMs) :
      a.details && a.details.overallSavingsBytes ? Math.round(a.details.overallSavingsBytes / 1024) + ' KiB' : '';
    let extra = '';
    if (key === 'largest-contentful-paint-element' && a.details && a.details.items && a.details.items[0]) {
      const it = a.details.items[0];
      const node = it.items && it.items[0] && it.items[0].node ? it.items[0].node : null;
      extra = node ? (node.selector || '').slice(0, 80) + ' | ' + (node.nodeLabel || '').slice(0, 60) : '';
    }
    if (key === 'dom-size' && a.numericValue) extra = 'DOM nodes: ' + Math.round(a.numericValue);
    if (key === 'mainthread-work-breakdown' && a.numericValue) extra = Math.round(a.numericValue) + ' ms';
    if (key === 'bootup-time' && a.numericValue) extra = Math.round(a.numericValue) + ' ms JS exec';
    if (key === 'total-byte-weight' && a.numericValue) extra = Math.round(a.numericValue / 1024) + ' KiB';
    opps.push({ key, score: a.score === null ? 'n/a' : Math.round(a.score * 100), savings, extra });
  }
  rows.push({ page, formFactor, lcp: audits['largest-contentful-paint'] && Math.round(audits['largest-contentful-paint'].numericValue), opps, audits, name });
}
rows.sort((a, b) => (a.page + a.formFactor).localeCompare(b.page + b.formFactor));
for (const r of rows) {
  console.log(`\n=== ${r.page} [${r.formFactor}] LCP=${r.lcp}ms ===`);
  for (const o of r.opps) console.log(`  ${o.key} (score ${o.score}) savings=${o.savings} ${o.extra}`);
}

// Detailed URL-level breakdown for slow pages (LCP >= 3000ms)
for (const r of rows.filter(x => x.lcp >= 3000)) {
  console.log(`\n--- DETAILS ${r.name} (LCP=${r.lcp}ms) ---`);
  const dumpItems = (key, fmt) => {
    const a = r.audits[key];
    if (!a || !a.details || !a.details.items || !a.details.items.length) return;
    console.log(`  [${key}]`);
    for (const it of a.details.items.slice(0, 8)) console.log('    ' + fmt(it));
  };
  dumpItems('unused-javascript', it => `${it.url.replace(/^.*\/(node_modules\/)?/, '').slice(0, 90)} -> ${Math.round(it.wastedBytes / 1024)} KiB wasted, ${Math.round(it.wastedMs)} ms`);
  dumpItems('unused-css-rules', it => `${(it.url || '').replace(/^.*\//, '').slice(0, 60)} -> ${Math.round(it.wastedBytes / 1024)} KiB`);
  dumpItems('mainthread-work-breakdown', it => `${it.groupLabel}: ${Math.round(it.duration)} ms`);
  dumpItems('bootup-time', it => `${it.url.replace(/^.*\/(node_modules\/)?/, '').slice(0, 70)} -> ${Math.round(it.total)} ms`);
  dumpItems('uses-responsive-images', it => `${(it.url || '').replace(/^.*\//, '').slice(0, 60)} -> wasted ${Math.round((it.wastedBytes || 0) / 1024)} KiB of ${Math.round((it.totalBytes || 0) / 1024)} KiB`);
  dumpItems('render-blocking-resources', it => `${it.url} (${Math.round(it.wastedMs)} ms)`);
}