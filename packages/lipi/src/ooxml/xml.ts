/**
 * Tiny, allocation-light XML string builder.
 *
 * We emit OOXML by hand (BUILD_PROMPT.md §3: "Write the OOXML directly").
 * The one rule that matters: children of `w:rPr`, `w:pPr` and `w:font` are an
 * `xsd:sequence`, so every emitter here appends children in the canonical
 * ECMA-376 order. Getting it wrong makes Word silently repair the file.
 */

const ESC_RE = /[&<>"']/g;
const ESC_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/** Escape text/attribute content for XML. */
export function esc(s: string): string {
  return s.replace(ESC_RE, (c) => ESC_MAP[c]!);
}

export type AttrValue = string | number | boolean | undefined | null;
export type Attrs = Record<string, AttrValue>;

/** Serialize attributes, skipping undefined/null. `true` renders as a bare presence via `w:val`-less caller. */
export function attrs(a: Attrs | undefined): string {
  if (!a) return '';
  let out = '';
  for (const key of Object.keys(a)) {
    const v = a[key];
    if (v === undefined || v === null || v === false) continue;
    if (v === true) {
      // Boolean attributes are unusual in OOXML; callers should pass explicit values.
      out += ` ${key}="1"`;
      continue;
    }
    out += ` ${key}="${esc(String(v))}"`;
  }
  return out;
}

/** A self-closing element: `<name .../>`. */
export function empty(name: string, a?: Attrs): string {
  return `<${name}${attrs(a)}/>`;
}

/** An element with string children (already-serialized XML). Empty children → self-closing. */
export function el(name: string, a?: Attrs, ...children: (string | undefined)[]): string {
  const inner = children.filter((c): c is string => !!c).join('');
  if (inner === '') return empty(name, a);
  return `<${name}${attrs(a)}>${inner}</${name}>`;
}

/** An element wrapping escaped text: `<name>escaped</name>`. */
export function textEl(name: string, text: string, a?: Attrs): string {
  return `<${name}${attrs(a)}>${esc(text)}</${name}>`;
}

/** The XML declaration OOXML parts expect (standalone="yes"). */
export const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** The `w:` (+ friends) namespace attribute block for the document root. */
export const WML_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"';
