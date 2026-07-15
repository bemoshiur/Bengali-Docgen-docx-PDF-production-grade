/**
 * `w:rPr` emission — where the three bugs from BUILD_PROMPT.md §2 live.
 *
 * Bug 1: complex-script codepoints route to the CS font slot, so `w:rFonts`
 *        MUST set `w:cs` (not just ascii/hAnsi), and size MUST set `w:szCs`.
 * Bug 2: `w:b` only bolds the ASCII slot; Bengali needs `w:bCs` too. Same for
 *        italic (`w:iCs`). We always emit both twins.
 *
 * Children of `CT_RPr` are an xsd:sequence — this function appends them in the
 * canonical ECMA-376 order. Wrong order ⇒ Word silently "repairs" the file.
 */
import { el, empty, esc } from './xml.js';
import type { RunProps } from '../model/ast.js';

export interface LangSpec {
  /** Latin/ASCII language, e.g. "en-US". */
  val: string;
  /** East-Asian language. */
  eastAsia: string;
  /** Complex-script (bidi) language — Bengali, e.g. "bn-BD". */
  bidi: string;
}

/** Run props already resolved against document defaults (font, size, lang). */
export interface ResolvedRunProps {
  fontName: string;
  sizeHalfPt: number;
  lang: LangSpec;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  smallCaps?: boolean;
  color?: string;
  vertAlign?: 'superscript' | 'subscript';
  /** Right-to-left run. Bengali is LTR, so normally omitted. */
  rtl?: boolean;
  /** Style id (`w:rStyle`), used by e.g. hyperlink runs. */
  styleId?: string;
}

/** The `<w:rFonts>` element: ascii, hAnsi AND cs must all be the Bengali font (Bug 1). */
export function rFonts(name: string): string {
  return empty('w:rFonts', {
    'w:ascii': name,
    'w:hAnsi': name,
    // The complex-script slot. Omit this and Bengali silently falls back to
    // Times/Arial → tofu. This single attribute is why most Bengali DOCX is broken.
    'w:cs': name,
  });
}

/** Emit `<w:rPr>` for a resolved run, children in canonical sequence order. */
export function renderRunProps(rp: ResolvedRunProps): string {
  const parts: string[] = [];

  if (rp.styleId) parts.push(empty('w:rStyle', { 'w:val': rp.styleId }));
  parts.push(rFonts(rp.fontName));

  // Bold: ASCII slot + complex-script twin (Bug 2).
  if (rp.bold) {
    parts.push(empty('w:b'));
    parts.push(empty('w:bCs'));
  }
  // Italic: ASCII slot + complex-script twin (Bug 2).
  if (rp.italic) {
    parts.push(empty('w:i'));
    parts.push(empty('w:iCs'));
  }
  if (rp.smallCaps) parts.push(empty('w:smallCaps'));
  if (rp.strike) parts.push(empty('w:strike'));
  if (rp.color) parts.push(empty('w:color', { 'w:val': rp.color }));

  // Size: ASCII slot + complex-script size (Bug 1 — omit szCs and CS size is wrong).
  parts.push(empty('w:sz', { 'w:val': rp.sizeHalfPt }));
  parts.push(empty('w:szCs', { 'w:val': rp.sizeHalfPt }));

  if (rp.underline) parts.push(empty('w:u', { 'w:val': 'single' }));
  if (rp.vertAlign) parts.push(empty('w:vertAlign', { 'w:val': rp.vertAlign }));
  if (rp.rtl) parts.push(empty('w:rtl'));

  // Language: declare the complex-script (bidi) language so shaping fires.
  parts.push(
    empty('w:lang', {
      'w:val': rp.lang.val,
      'w:eastAsia': rp.lang.eastAsia,
      'w:bidi': rp.lang.bidi,
    }),
  );

  return el('w:rPr', undefined, parts.join(''));
}

/**
 * The rPr for a TOC extraction marker (BUILD_PROMPT.md §6): 1pt, white, present
 * in the PDF text layer. NOT `w:vanish` — LibreOffice drops hidden text from
 * the text layer and the marker is lost.
 */
export function markerRunProps(): string {
  // Canonical CT_RPr order: color precedes sz/szCs.
  return el(
    'w:rPr',
    undefined,
    empty('w:color', { 'w:val': 'FFFFFF' }) +
      empty('w:sz', { 'w:val': 2 }) +
      empty('w:szCs', { 'w:val': 2 }),
  );
}

/** A `<w:t xml:space="preserve">` element preserving leading/trailing spaces. */
export function textRun(text: string, rPr: string): string {
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}
