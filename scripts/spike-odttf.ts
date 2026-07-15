// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * BUILD_PROMPT.md §15 — First move. Kill the crown-jewel risk in isolation.
 *
 * We cannot open MS Word here, so we prove the two things that ARE provable
 * without it and that catch every byte-order mistake:
 *   1. deobfuscate(obfuscate(ttf)) === ttf   (roundtrip, byte-identical)
 *   2. the obfuscated first 32 bytes actually changed (we really scrambled)
 *   3. sfnt magic is restored after the roundtrip
 *   4. the OS/2 signature we parse declares Bengali (usb0 bit 16)
 *
 * The remaining "does Word accept it" gate is manual — documented in JOURNEY.md.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { obfuscate, deobfuscate, makeFontKey, hasSfntMagic } from '../packages/lipi/src/fonts/obfuscate.ts';
import { readFontInfo, coversBengali } from '../packages/lipi/src/fonts/os2.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, '..', 'packages', 'fonts', 'fonts');

function check(name: string, cond: boolean): void {
  if (!cond) {
    console.error(`  ✗ FAIL: ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${name}`);
  }
}

for (const file of ['NotoSansBengali-Regular.ttf', 'HindSiliguri-Bold.ttf', 'TiroBangla-Italic.ttf']) {
  console.log(`\n${file}`);
  const ttf = readFileSync(join(fontsDir, file));
  const key = makeFontKey();

  check('input has sfnt magic', hasSfntMagic(ttf));

  const odttf = obfuscate(ttf, key);
  check('first 32 bytes changed', !ttf.subarray(0, 32).equals(odttf.subarray(0, 32)));
  check('bytes past 32 untouched', ttf.subarray(32).equals(odttf.subarray(32)));
  check('obfuscated no longer has sfnt magic', !hasSfntMagic(odttf));

  const back = deobfuscate(odttf, key);
  check('roundtrip is byte-identical', back.equals(ttf));
  check('roundtrip restores sfnt magic', hasSfntMagic(back));

  const info = readFontInfo(ttf);
  console.log(`    family="${info.familyName}" subfamily="${info.subfamilyName}" weight=${info.weightClass} bold=${info.bold} italic=${info.italic}`);
  console.log(`    sig usb0=${info.sig.usb0} usb1=${info.sig.usb1} csb0=${info.sig.csb0}`);
  check('OS/2 signature declares Bengali (usb0 bit 16)', coversBengali(info.sig));
}

console.log(process.exitCode ? '\nSPIKE RED ✗' : '\nSPIKE GREEN ✓');
