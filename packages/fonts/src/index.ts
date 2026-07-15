// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * `@lipi/fonts` — OFL-1.1 Bengali fonts bundled for `lipi`.
 *
 * Only SIL Open Font License fonts are bundled (BUILD_PROMPT.md §7); the OFL
 * requires the licence to travel with the font, so each family ships its
 * verbatim `OFL.txt` and the `licenses()` helper (and `lipi licenses` CLI)
 * prints them. For your own licensed fonts, use `registerFont()` from `lipi`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Resolve a bundled asset relative to the built module (dist → ../fonts). */
function asset(name: string): string {
  return fileURLToPath(new URL(`../fonts/${name}`, import.meta.url));
}

/** A bundled font, shaped as `lipi`'s `FontInput` plus licence metadata. */
export interface BundledFont {
  name: string;
  regular: string;
  bold?: string;
  italic?: string;
  boldItalic?: string;
  license: 'OFL-1.1';
  /** Path to the verbatim OFL.txt bundled with this family. */
  licenseFile: string;
  copyright: string;
}

/** Hind Siliguri — clean UI/body font, five weights (regular + bold here). */
export const hindSiliguri: BundledFont = {
  name: 'Hind Siliguri',
  regular: asset('HindSiliguri-Regular.ttf'),
  bold: asset('HindSiliguri-Bold.ttf'),
  license: 'OFL-1.1',
  licenseFile: asset('HindSiliguri-OFL.txt'),
  copyright: 'Copyright (c) 2015 Indian Type Foundry (info@indiantypefoundry.com)',
};

/** Noto Sans Bengali — the default; broadest coverage, part of Google Noto. */
export const notoSansBengali: BundledFont = {
  name: 'Noto Sans Bengali',
  regular: asset('NotoSansBengali-Regular.ttf'),
  bold: asset('NotoSansBengali-Bold.ttf'),
  license: 'OFL-1.1',
  licenseFile: asset('NotoSansBengali-OFL.txt'),
  copyright: 'Copyright 2022 The Noto Project Authors (https://github.com/notofonts/bengali)',
};

/** Tiro Bangla — a traditional serif with a true italic, good for body text. */
export const tiroBangla: BundledFont = {
  name: 'Tiro Bangla',
  regular: asset('TiroBangla-Regular.ttf'),
  italic: asset('TiroBangla-Italic.ttf'),
  license: 'OFL-1.1',
  licenseFile: asset('TiroBangla-OFL.txt'),
  copyright: 'Copyright 2020 The Indigo Project Authors (https://github.com/TiroTypeworks/Indigo)',
};

/** All bundled fonts, keyed by camelCase id. */
export const fonts = { hindSiliguri, notoSansBengali, tiroBangla } as const;

/** The recommended default font. */
export const defaultFont = notoSansBengali;

export interface LicenseInfo {
  name: string;
  license: string;
  copyright: string;
  /** Full, verbatim OFL text bundled with the font. */
  text: string;
}

/** Return licence text + metadata for every bundled font. */
export function licenses(): LicenseInfo[] {
  return Object.values(fonts).map((f) => ({
    name: f.name,
    license: f.license,
    copyright: f.copyright,
    text: readFileSync(f.licenseFile, 'utf8'),
  }));
}
