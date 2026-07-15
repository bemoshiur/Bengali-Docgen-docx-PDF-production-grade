#!/usr/bin/env node
// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * `lipi` CLI. Commands:
 *   lipi demo [outDir]   generate demo.docx (+ demo.pdf if LibreOffice is present)
 *   lipi licenses        print bundled font licences (OFL requirement, §7)
 *   lipi --version | --help
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { findSoffice } from '../pdf/libreoffice.js';
import { buildDemoDocument } from './demo.js';

const HELP = `lipi — correct Bengali (বাংলা) DOCX/PDF generation

Usage:
  lipi demo [outDir]     Generate demo.docx (and demo.pdf if soffice is installed)
  lipi licenses          Print licences for bundled @bemoshiur/lipi-fonts
  lipi --version
  lipi --help
`;

async function loadFonts(): Promise<typeof import('@bemoshiur/lipi-fonts')> {
  try {
    return await import('@bemoshiur/lipi-fonts');
  } catch {
    console.error(
      'This command needs the @bemoshiur/lipi-fonts package.\n  pnpm add @bemoshiur/lipi-fonts',
    );
    process.exit(1);
  }
}

async function cmdDemo(outDir: string): Promise<void> {
  const fontsPkg = await loadFonts();
  const doc = buildDemoDocument(fontsPkg.defaultFont);

  const docxPath = resolve(outDir, 'demo.docx');
  await doc.toDocx(docxPath);
  console.log(`✓ wrote ${docxPath}`);

  if (findSoffice()) {
    const pdfPath = resolve(outDir, 'demo.pdf');
    await doc.toPdf(pdfPath);
    console.log(`✓ wrote ${pdfPath}`);
  } else {
    console.log('• LibreOffice (soffice) not found — skipped PDF. See BUILD_PROMPT.md §8.');
  }
  console.log('\nOpen demo.docx in Word/LibreOffice/Pages — every conjunct should render');
  console.log('correctly with NO Bengali font installed (the font is embedded).');
}

async function cmdLicenses(): Promise<void> {
  const fontsPkg = await loadFonts();
  for (const l of fontsPkg.licenses()) {
    console.log(`\n════════ ${l.name} — ${l.license} ════════`);
    console.log(l.copyright);
    console.log('');
    console.log(l.text.trim());
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'demo': {
      const outDir = rest[0] ? resolve(rest[0]) : process.cwd();
      if (!existsSync(outDir)) {
        console.error(`output directory does not exist: ${outDir}`);
        process.exit(1);
      }
      await cmdDemo(outDir);
      break;
    }
    case 'licenses':
      await cmdLicenses();
      break;
    case '--version':
    case '-v':
      // Read our own version lazily to avoid a JSON import assertion.
      console.log((await import('../version.js')).VERSION);
      break;
    case undefined:
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
