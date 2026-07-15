// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * Validate generated OOXML with xmllint (BUILD_PROMPT.md §5.4):
 *   1. every XML part is well-formed,
 *   2. every extracted `w:rPr` and `w:font` fragment matches the ordered
 *      content model in tests/schemas/wml-lipi.xsd (or wml.xsd if you drop the
 *      full ISO schema in — see JOURNEY.md).
 *
 * Importable (used by tests) and runnable: `node scripts/validate-xml.ts [file.docx]`.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync, strFromU8 } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const SCHEMA_DIR = join(repoRoot, 'tests', 'schemas');
/** Prefer the full ISO schema if present; else the focused one. */
const SCHEMA = existsSync(join(SCHEMA_DIR, 'wml.xsd'))
  ? join(SCHEMA_DIR, 'wml.xsd')
  : join(SCHEMA_DIR, 'wml-lipi.xsd');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Whether xmllint is on PATH. */
export function hasXmllint(): boolean {
  const r = spawnSync('xmllint', ['--version'], { stdio: 'ignore' });
  return r.status === 0;
}

function xmllint(args: string[]): { ok: boolean; out: string } {
  const r = spawnSync('xmllint', args, { encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** Extract every `<w:rPr>…</w:rPr>` and `<w:font>…</w:font>` fragment from XML. */
function extractFragments(xml: string): string[] {
  const frags: string[] = [];
  for (const re of [/<w:rPr>[\s\S]*?<\/w:rPr>/g, /<w:font [\s\S]*?<\/w:font>/g]) {
    for (const m of xml.matchAll(re)) frags.push(m[0]);
  }
  return frags;
}

/** Validate the XML parts of an in-memory .docx (part path → bytes). */
export function validateDocxFiles(files: Record<string, Uint8Array>): ValidationResult {
  const errors: string[] = [];
  const tmp = mkdtempSync(join(tmpdir(), 'lipi-xml-'));
  const allFragments: string[] = [];

  for (const [path, bytes] of Object.entries(files)) {
    if (!/\.(xml|rels)$/.test(path)) continue;
    const xml = strFromU8(bytes);
    const partFile = join(tmp, path.replace(/[\\/]/g, '_'));
    writeFileSync(partFile, xml);
    const wf = xmllint(['--noout', partFile]);
    if (!wf.ok) errors.push(`not well-formed: ${path}\n${wf.out}`);
    if (path.endsWith('document.xml') || path.endsWith('fontTable.xml') || path.endsWith('styles.xml')) {
      allFragments.push(...extractFragments(xml));
    }
  }

  // One schema pass over all extracted rPr/font fragments.
  const wrapper = `<w:fragments xmlns:w="${W_NS}" xmlns:r="${R_NS}">${allFragments.join('')}</w:fragments>`;
  const fragFile = join(tmp, 'fragments.xml');
  writeFileSync(fragFile, wrapper);
  const schemaCheck = xmllint(['--noout', '--schema', SCHEMA, fragFile]);
  if (!schemaCheck.ok) errors.push(`schema validation failed against ${SCHEMA}\n${schemaCheck.out}`);

  return { ok: errors.length === 0, errors };
}

/** Unzip a .docx file into a part map. */
export function readDocx(path: string): Record<string, Uint8Array> {
  return unzipSync(new Uint8Array(readFileSync(path)));
}

// ── CLI ──────────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!hasXmllint()) {
    console.error('xmllint not found (install libxml2-utils). Skipping.');
    process.exit(0);
  }
  const target = process.argv[2];
  let files: Record<string, Uint8Array>;
  if (target) {
    files = readDocx(target);
  } else {
    // Generate the demo from the BUILT packages (run `pnpm build` first).
    const distDemo = join(repoRoot, 'packages/lipi/dist/cli/demo.js');
    if (!existsSync(distDemo)) {
      console.error('No .docx path given and packages are not built. Run `pnpm build` or pass a .docx path.');
      process.exit(1);
    }
    const { buildDemoDocument } = await import(distDemo);
    const fonts = await import(join(repoRoot, 'packages/fonts/dist/index.js'));
    const bytes = await buildDemoDocument(fonts.defaultFont).toDocxBuffer({ computeTocPages: false });
    files = unzipSync(bytes);
  }
  const result = validateDocxFiles(files);
  if (result.ok) {
    console.log('✓ XML valid: all parts well-formed, rPr/font ordering matches schema');
  } else {
    console.error('✗ XML validation failed:\n' + result.errors.join('\n\n'));
    process.exit(1);
  }
}
