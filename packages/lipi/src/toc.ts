/**
 * Static, pre-computed TOC (BUILD_PROMPT.md §6).
 *
 * We NEVER emit a `TOC` field — it doesn't update headlessly. Instead we expand
 * the TOC into ordinary paragraphs: a title, then one entry per heading with a
 * clickable internal hyperlink, a right tab-stop with a dot leader, and the page
 * number in the document's numerals. Page numbers come from a marker→page map
 * extracted from a body-only PDF (see `extractMarkerPages`).
 */
import type { HeadingRef } from './model/blocks.js';
import type { InlineNode, Numerals, ParagraphNode, TocNode } from './model/ast.js';
import { toBengaliNumerals } from './bangla/numerals.js';

/** Marker token format: ASCII-only so it never interferes with shaping. */
export function markerToken(n: number): string {
  return `ZQX${String(n).padStart(4, '0')}ZQX`;
}

const MARKER_RE = /ZQX(\d{4})ZQX/g;

/**
 * Extract a `marker → page-number` map from the text of a body-only PDF.
 * `pageTexts[i]` is the concatenated text of physical PDF page `i` (0-based);
 * page numbers returned are 1-based and equal the body page numbers because
 * the body-only render starts at physical page 1.
 */
export function extractMarkerPages(pageTexts: string[]): Map<string, number> {
  const map = new Map<string, number>();
  pageTexts.forEach((text, i) => {
    for (const m of text.matchAll(MARKER_RE)) {
      const token = m[0];
      if (!map.has(token)) map.set(token, i + 1);
    }
  });
  return map;
}

export interface TocExpandOptions {
  numerals: Numerals;
  /** Right tab-stop position (twips) for the dot leader + page number. */
  tabPos: number;
  /** marker → page number. Absent ⇒ entries render without page numbers. */
  pageMap?: Map<string, number>;
}

function fmtPage(n: number, numerals: Numerals): string {
  return numerals === 'bengali' ? toBengaliNumerals(n) : String(n);
}

/** Expand a TOC placeholder into real paragraphs, given the collected headings. */
export function expandToc(
  toc: TocNode,
  headings: HeadingRef[],
  opts: TocExpandOptions,
): ParagraphNode[] {
  const [min, max] = toc.levels;
  const paras: ParagraphNode[] = [];

  // Title.
  paras.push({
    kind: 'paragraph',
    props: { styleId: 'TOCHeading' },
    runs: [{ kind: 'text', text: toc.title, props: {} }],
  });

  for (const h of headings) {
    if (h.level < min || h.level > max) continue;
    const level = Math.min(Math.max(h.level, 1), 3);
    const runs: InlineNode[] = [
      {
        kind: 'hyperlink',
        anchor: h.bookmarkName,
        runs: [{ kind: 'text', text: h.text, props: {} }],
      },
      { kind: 'tab' },
    ];
    const page = opts.pageMap?.get(h.marker);
    if (page !== undefined) {
      runs.push({ kind: 'text', text: fmtPage(page, opts.numerals), props: {} });
    }
    paras.push({
      kind: 'paragraph',
      props: {
        styleId: `TOC${level}`,
        tabs: [{ pos: opts.tabPos, val: 'right', leader: 'dot' }],
      },
      runs,
    });
  }

  return paras;
}
