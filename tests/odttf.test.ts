// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  obfuscate,
  deobfuscate,
  makeFontKey,
  fontKeyToXorKey,
  hasSfntMagic,
} from '../packages/lipi/src/fonts/obfuscate.ts';
import { readFontInfo, coversBengali } from '../packages/lipi/src/fonts/os2.ts';

const fontPath = (n: string) => fileURLToPath(new URL(`../packages/fonts/fonts/${n}`, import.meta.url));
const FONTS = ['NotoSansBengali-Regular.ttf', 'HindSiliguri-Bold.ttf', 'TiroBangla-Italic.ttf'];

describe('odttf obfuscation (ECMA-376 §17.8.1)', () => {
  it('derives a 16-byte reversed key from a font key GUID', () => {
    const key = fontKeyToXorKey('{00112233-4455-6677-8899-AABBCCDDEEFF}');
    // Bytes parsed left-to-right then reversed → FF EE DD … 00.
    expect(key.length).toBe(16);
    expect(key[0]).toBe(0xff);
    expect(key[15]).toBe(0x00);
  });

  it('rejects malformed font keys', () => {
    expect(() => fontKeyToXorKey('not-a-guid')).toThrow();
  });

  it.each(FONTS)('roundtrips %s byte-for-byte and preserves later bytes', (file) => {
    const ttf = readFileSync(fontPath(file));
    const key = makeFontKey();
    expect(hasSfntMagic(ttf)).toBe(true);

    const odttf = obfuscate(ttf, key);
    expect(odttf.subarray(0, 32).equals(ttf.subarray(0, 32))).toBe(false); // scrambled
    expect(odttf.subarray(32).equals(ttf.subarray(32))).toBe(true); // rest untouched
    expect(hasSfntMagic(odttf)).toBe(false);

    const back = deobfuscate(odttf, key);
    expect(back.equals(ttf)).toBe(true);
    expect(hasSfntMagic(back)).toBe(true);
  });

  it('is symmetric regardless of file length ≥ 32', () => {
    const buf = Buffer.from(Array.from({ length: 100 }, (_, i) => i % 256));
    const key = makeFontKey();
    expect(deobfuscate(obfuscate(buf, key), key).equals(buf)).toBe(true);
  });
});

describe('OS/2 signature parsing (§5.3)', () => {
  it.each(FONTS)('%s declares Bengali (ulUnicodeRange1 bit 16)', (file) => {
    const info = readFontInfo(readFileSync(fontPath(file)));
    expect(coversBengali(info.sig)).toBe(true);
    // usb0 is an 8-hex-digit uppercase string.
    expect(info.sig.usb0).toMatch(/^[0-9A-F]{8}$/);
  });

  it('reads family/weight/style from the name + OS/2 tables', () => {
    const info = readFontInfo(readFileSync(fontPath('HindSiliguri-Bold.ttf')));
    expect(info.familyName).toBe('Hind Siliguri');
    expect(info.bold).toBe(true);
    expect(info.weightClass).toBe(700);
    expect(info.panose).toMatch(/^[0-9A-F]{20}$/);
  });
});
