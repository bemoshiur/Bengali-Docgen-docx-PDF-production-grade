/**
 * Visual regression (BUILD_PROMPT.md §9.3) — the only test that actually proves
 * conjuncts render. Golden XML / invariants pass happily while output is garbage.
 *
 *   docx → soffice → pdf → pdftoppm -r 150 -png → pixelmatch vs baseline
 *
 * Self-skips without LibreOffice; run it in Docker (`pnpm test:visual`) where the
 * baselines are deterministic. First run with no baseline BOOTSTRAPS the baseline
 * and passes with a warning — commit the PNG, then subsequent runs compare.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Document, Para, Heading } from '../../packages/lipi/src/index.ts';
import { notoSansBengali } from '../../packages/fonts/src/index.ts';
import { convertToPdf, findSoffice } from '../../packages/lipi/src/pdf/libreoffice.ts';

const CONJUNCTS = readFileSync(
  fileURLToPath(new URL('../fixtures/conjuncts.txt', import.meta.url)),
  'utf8',
);
const baselineDir = fileURLToPath(new URL('./baseline/', import.meta.url));

const hasPdftoppm = spawnSync('pdftoppm', ['-v'], { stdio: 'ignore' }).status !== null;

describe.skipIf(!findSoffice() || !hasPdftoppm)('visual: conjuncts render correctly', () => {
  it('matches the committed baseline (or bootstraps it)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lipi-visual-'));

    // A single page of every conjunct case, embedded font, no system Bengali font needed.
    const doc = new Document({ lang: 'bn-BD', font: notoSansBengali, numerals: 'bengali' });
    const sec = doc.section({ pageNumbers: { format: 'decimal', start: 1 } });
    sec.add(new Heading(1, 'যুক্তাক্ষর পরীক্ষা'));
    for (const line of CONJUNCTS.split('\n').filter(Boolean)) sec.add(new Para(line));

    const docxPath = join(dir, 'conjuncts.docx');
    writeFileSync(docxPath, await doc.toDocxBuffer({ computeTocPages: false }));
    const pdfPath = await convertToPdf(docxPath, { outDir: dir });

    // Rasterize page 1 at 150 dpi.
    const pngPrefix = join(dir, 'page');
    const r = spawnSync('pdftoppm', ['-r', '150', '-png', '-f', '1', '-l', '1', pdfPath, pngPrefix]);
    expect(r.status).toBe(0);
    const actualPng = join(dir, readdirSync(dir).find((f) => f.startsWith('page') && f.endsWith('.png'))!);

    const { PNG } = await import('pngjs');
    const pixelmatch = (await import('pixelmatch')).default;
    const actual = PNG.sync.read(readFileSync(actualPng));

    const baselinePath = join(baselineDir, 'conjuncts.png');
    if (!existsSync(baselinePath)) {
      writeFileSync(baselinePath, PNG.sync.write(actual));
      console.warn(`bootstrapped baseline at ${baselinePath} — commit it and re-run to compare`);
      return;
    }

    const baseline = PNG.sync.read(readFileSync(baselinePath));
    expect(actual.width).toBe(baseline.width);
    expect(actual.height).toBe(baseline.height);
    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const mismatched = pixelmatch(actual.data, baseline.data, diff.data, baseline.width, baseline.height, {
      threshold: 0.1,
    });
    const ratio = mismatched / (baseline.width * baseline.height);
    if (ratio > 0.001) writeFileSync(join(dir, 'diff.png'), PNG.sync.write(diff));
    expect(ratio).toBeLessThan(0.001); // 0.1%
  });
});
