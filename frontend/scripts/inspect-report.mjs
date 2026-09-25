// One-off codemod: strip unused imports from src/public pages so each page can
// be a standalone lazy chunk (the old barrels pulled every page into one graph)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.jsx') || f.startsWith('screens-') || f === 'hero.jsx') continue;
  const p = join(dir, f);
  const src = readFileSync(p, 'utf8');
  const body = src.replace(/(^|\n)import[\s\S]*?from\s+'[^']*';/g, '\n');

  // Rebuild each named-import statement keeping only used symbols
  const rebuilt = src.replace(
    /^import\s+\{([^}]*)\}\s+from\s+'([^']+)';/gm,
    (stmt, names, from) => {
      const kept = names.split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(n => {
          const bare = n.split(' as ')[0].trim();
          return new RegExp(`\\b${bare}\\b`).test(body);
        });
      if (!kept.length) return '';
      // sort kept names (keep any `x as y` aliasing intact)
      kept.sort((a, b) => a.split(' as ')[0].localeCompare(b.split(' as ')[0]));
      return `import { ${kept.join(', ')} } from '${from}';`;
    }
  );
  // Collapse runs of blank lines left behind
  const out = rebuilt.replace(/\n{3,}/g, '\n\n');
  if (out !== src) {
    writeFileSync(p, out);
    console.log('updated', f);
  }
}
