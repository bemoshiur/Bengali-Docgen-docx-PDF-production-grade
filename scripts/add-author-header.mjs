// Prepend the author attribution header to every source file that lacks it.
// Idempotent: skips files already containing the author marker. Preserves a
// leading shebang or `<?php` line. Run: node scripts/add-author-header.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, extname } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = 'S M Moshiur Rahman';

const LINES = [
  'lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade',
  'Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)',
  'Free & open source under the MIT License. Keep this attribution if you use this code.',
];

const HASH = new Set(['.py', '.rb']);
const CSTYLE = new Set(['.ts', '.js', '.mjs', '.cs', '.java', '.go']);
const ROOTS = ['packages/lipi/src', 'packages/fonts/src', 'scripts', 'tests', 'examples', 'ports'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'bin', 'obj']);

function header(ext) {
  const prefix = HASH.has(ext) ? '# ' : '// ';
  return LINES.map((l) => prefix + l).join('\n') + '\n';
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let changed = 0;
for (const root of ROOTS) {
  const abs = join(repoRoot, root);
  let entries;
  try {
    entries = [...walk(abs)];
  } catch {
    continue;
  }
  for (const file of entries) {
    const ext = extname(file);
    if (ext === '.php') {
      // handled below with its own branch
    } else if (!HASH.has(ext) && !CSTYLE.has(ext)) {
      continue;
    }
    const content = readFileSync(file, 'utf8');
    if (content.includes(MARKER)) continue;

    const h = ext === '.php' ? LINES.map((l) => '// ' + l).join('\n') + '\n' : header(ext);
    let out;
    if (ext === '.php') {
      // Insert after the opening `<?php` line.
      const nl = content.indexOf('\n');
      out = content.slice(0, nl + 1) + h + content.slice(nl + 1);
    } else if (content.startsWith('#!')) {
      // Insert after the shebang line.
      const nl = content.indexOf('\n');
      out = content.slice(0, nl + 1) + h + content.slice(nl + 1);
    } else {
      out = h + content;
    }
    writeFileSync(file, out);
    changed++;
    console.log(`+ header: ${file.replace(repoRoot + '/', '')}`);
  }
}
console.log(`\nDone. ${changed} file(s) updated.`);
