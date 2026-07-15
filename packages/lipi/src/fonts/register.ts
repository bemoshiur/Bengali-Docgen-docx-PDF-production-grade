// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * Turn user font input into embed-ready faces: read bytes, parse the real
 * OS/2 signature, generate a per-face font key, and obfuscate to `.odttf`.
 */
import { readFileSync } from 'node:fs';
import { makeFontKey, obfuscate } from './obfuscate.js';
import { readFontInfo, coversBengali, type FontInfo } from './os2.js';

export type FaceKey = 'regular' | 'bold' | 'italic' | 'boldItalic';

/** As accepted by `new Document({ font })` and `registerFont`. */
export interface FontInput {
  /** Family name used for `w:rFonts` and the `fontTable` entry. */
  name: string;
  regular: string | Uint8Array;
  bold?: string | Uint8Array;
  italic?: string | Uint8Array;
  boldItalic?: string | Uint8Array;
}

export interface PreparedFace {
  key: FaceKey;
  /** The `w:fontKey` GUID string. */
  fontKey: string;
  /** Obfuscated font bytes for `word/fonts/fontN.odttf`. */
  odttf: Buffer;
  info: FontInfo;
}

export interface RegisteredFont {
  name: string;
  /** Faces in canonical order: regular, bold, italic, boldItalic (present ones only). */
  faces: PreparedFace[];
}

const FACE_ORDER: FaceKey[] = ['regular', 'bold', 'italic', 'boldItalic'];

function loadBytes(src: string | Uint8Array): Buffer {
  return typeof src === 'string' ? readFileSync(src) : Buffer.from(src);
}

/**
 * Prepare a font for embedding. Warns (does not throw) if the regular face's
 * OS/2 signature doesn't declare Bengali — Word may then refuse to shape it.
 */
export function registerFont(input: FontInput): RegisteredFont {
  const faces: PreparedFace[] = [];
  for (const key of FACE_ORDER) {
    const src = input[key];
    if (!src) continue;
    const ttf = loadBytes(src);
    const info = readFontInfo(ttf);
    const fontKey = makeFontKey();
    faces.push({ key, fontKey, odttf: obfuscate(ttf, fontKey), info });
  }
  if (faces.length === 0) {
    throw new Error(`font "${input.name}" has no faces; at least "regular" is required`);
  }
  const regular = faces[0]!;
  if (!coversBengali(regular.info.sig)) {
    // Not fatal: some legacy fonts under-declare their OS/2 ranges.
    console.warn(
      `[lipi] warning: font "${input.name}" OS/2 signature (usb0=${regular.info.sig.usb0}) ` +
        `does not declare Bengali (bit 16). Word may fall back. See BUILD_PROMPT.md §5.3.`,
    );
  }
  return { name: input.name, faces };
}
