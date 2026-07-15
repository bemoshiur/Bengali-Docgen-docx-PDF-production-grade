// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * Generate the README's before/after proof image (BUILD_PROMPT.md §11).
 *
 * "before" = what naive docx libraries produce: no `w:cs`, no `w:bCs`, no
 * embedded font — simulated by stripping those from lipi's own output. "after" =
 * lipi as-is. Both render through LibreOffice so the difference is honest.
 *
 * Requires LibreOffice + poppler. Run inside Dockerfile.test:
 *   node scripts/comparison.ts   → docs/comparison-{before,after}.png
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

async function main() {
  const { buildDemoDocument } = await import(join(repoRoot, 'packages/lipi/dist/cli/demo.js'));
  const fonts = await import(join(repoRoot, 'packages/fonts/dist/index.js'));
  const { convertToPdf, findSoffice } = await import(join(repoRoot, 'packages/lipi/dist/pdf/libreoffice.js'));

  if (!findSoffice()) {
    console.error('LibreOffice not found. Run this inside Dockerfile.test.');
    process.exit(1);
  }

  const dir = mkdtempSync(join(tmpdir(), 'lipi-cmp-'));
  const correct = await buildDemoDocument(fonts.defaultFont).toDocxBuffer({ computeTocPages: false });

  // "before": strip the complex-script fixes + drop the embedded font.
  const parts = unzipSync(correct);
  const doc = strFromU8(parts['word/document.xml']!)
    .replace(/ w:cs="[^"]*"/g, '')
    .replace(/<w:bCs\/>/g, '')
    .replace(/<w:iCs\/>/g, '')
    .replace(/<w:szCs [^/]*\/>/g, '');
  const brokenParts: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(parts)) {
    if (k.startsWith('word/fonts/') || k === 'word/fontTable.xml') continue; // no embedded font
    brokenParts[k] = k === 'word/document.xml' ? strToU8(doc) : v;
  }
  const broken = zipSync(brokenParts);

  const outDir = join(repoRoot, 'docs');
  mkdirSync(outDir, { recursive: true });

  for (const [name, bytes] of [['before', broken], ['after', correct]] as const) {
    const docxPath = join(dir, `${name}.docx`);
    writeFileSync(docxPath, bytes);
    const pdf = await convertToPdf(docxPath, { outDir: dir });
    spawnSync('pdftoppm', ['-r', '150', '-png', '-f', '2', '-l', '2', pdf, join(dir, name)]);
    const png = readdirSync(dir).find((f) => f.startsWith(name) && f.endsWith('.png'))!;
    writeFileSync(join(outDir, `comparison-${name}.png`), readFileSync(join(dir, png)));
    console.log(`✓ wrote docs/comparison-${name}.png`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
