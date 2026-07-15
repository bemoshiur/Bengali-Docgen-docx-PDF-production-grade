/**
 * `word/styles.xml`. The default run properties (`w:docDefaults/w:rPrDefault`)
 * carry the CS font and `w:szCs` and the bidi language, so even runs with no
 * explicit rPr shape Bengali correctly (BUILD_PROMPT.md §2, §5). Heading
 * styles emit `w:b`+`w:bCs` together so heading bold works on Bengali (Bug 2).
 */
import { XML_DECL, el, empty } from './xml.js';
import { rFonts } from './runProps.js';
import { STYLE_METRICS } from './styleMetrics.js';

export interface StyleContext {
  fontName: string;
  /** Body font size in half-points (e.g. 24 = 12pt). */
  baseSizeHalfPt: number;
  langBidi: string;
}

interface HeadingSpec {
  id: string;
  name: string;
  sizeHalfPt: number;
  outlineLevel: number;
  spacingBeforePt: number;
  spacingAfterPt: number;
}

function langEl(ctx: StyleContext): string {
  return empty('w:lang', { 'w:val': 'en-US', 'w:eastAsia': 'en-US', 'w:bidi': ctx.langBidi });
}

function docDefaults(ctx: StyleContext): string {
  const rPr = el(
    'w:rPr',
    undefined,
    rFonts(ctx.fontName) +
      empty('w:sz', { 'w:val': ctx.baseSizeHalfPt }) +
      empty('w:szCs', { 'w:val': ctx.baseSizeHalfPt }) +
      langEl(ctx),
  );
  const pPr = el(
    'w:pPr',
    undefined,
    empty('w:spacing', { 'w:after': 120, 'w:line': 276, 'w:lineRule': 'auto' }),
  );
  return el(
    'w:docDefaults',
    undefined,
    el('w:rPrDefault', undefined, rPr) + el('w:pPrDefault', undefined, pPr),
  );
}

function normalStyle(): string {
  return el(
    'w:style',
    { 'w:type': 'paragraph', 'w:default': '1', 'w:styleId': 'Normal' },
    empty('w:name', { 'w:val': 'Normal' }) + empty('w:qFormat'),
  );
}

function headingStyle(ctx: StyleContext, h: HeadingSpec): string {
  const pPr = el(
    'w:pPr',
    undefined,
    empty('w:keepNext') +
      empty('w:keepLines') +
      empty('w:spacing', {
        'w:before': h.spacingBeforePt * 20,
        'w:after': h.spacingAfterPt * 20,
      }) +
      empty('w:outlineLvl', { 'w:val': h.outlineLevel }),
  );
  const rPr = el(
    'w:rPr',
    undefined,
    // Bold on both slots (Bug 2), size on both slots (Bug 1).
    empty('w:b') +
      empty('w:bCs') +
      empty('w:sz', { 'w:val': h.sizeHalfPt }) +
      empty('w:szCs', { 'w:val': h.sizeHalfPt }),
  );
  return el(
    'w:style',
    { 'w:type': 'paragraph', 'w:styleId': h.id },
    empty('w:name', { 'w:val': h.name }) +
      empty('w:basedOn', { 'w:val': 'Normal' }) +
      empty('w:next', { 'w:val': 'Normal' }) +
      empty('w:uiPriority', { 'w:val': 9 }) +
      empty('w:qFormat') +
      pPr +
      rPr,
  );
}

function simpleParagraphStyle(id: string, name: string, rPrInner?: string, pPrInner?: string): string {
  return el(
    'w:style',
    { 'w:type': 'paragraph', 'w:styleId': id },
    empty('w:name', { 'w:val': name }) +
      empty('w:basedOn', { 'w:val': 'Normal' }) +
      empty('w:next', { 'w:val': 'Normal' }) +
      (pPrInner ? el('w:pPr', undefined, pPrInner) : '') +
      (rPrInner ? el('w:rPr', undefined, rPrInner) : ''),
  );
}

function hyperlinkStyle(): string {
  return el(
    'w:style',
    { 'w:type': 'character', 'w:styleId': 'Hyperlink' },
    empty('w:name', { 'w:val': 'Hyperlink' }) +
      empty('w:uiPriority', { 'w:val': 99 }) +
      el('w:rPr', undefined, empty('w:color', { 'w:val': '0563C1' }) + empty('w:u', { 'w:val': 'single' })),
  );
}

/** Build the full styles.xml for a document. */
export function buildStyles(ctx: StyleContext): string {
  const headings: HeadingSpec[] = [
    { id: 'Heading1', name: 'heading 1', sizeHalfPt: STYLE_METRICS.Heading1!.size, outlineLevel: 0, spacingBeforePt: 12, spacingAfterPt: 6 },
    { id: 'Heading2', name: 'heading 2', sizeHalfPt: STYLE_METRICS.Heading2!.size, outlineLevel: 1, spacingBeforePt: 10, spacingAfterPt: 5 },
    { id: 'Heading3', name: 'heading 3', sizeHalfPt: STYLE_METRICS.Heading3!.size, outlineLevel: 2, spacingBeforePt: 8, spacingAfterPt: 4 },
  ];

  const styles = [
    normalStyle(),
    ...headings.map((h) => headingStyle(ctx, h)),
    // Title
    simpleParagraphStyle(
      'Title',
      'Title',
      empty('w:b') + empty('w:bCs') +
        empty('w:sz', { 'w:val': STYLE_METRICS.Title!.size }) +
        empty('w:szCs', { 'w:val': STYLE_METRICS.Title!.size }),
      empty('w:spacing', { 'w:after': 240 }) + empty('w:jc', { 'w:val': 'center' }),
    ),
    // Table body text — slightly smaller, tighter spacing.
    simpleParagraphStyle(
      'TableText',
      'Table Text',
      empty('w:sz', { 'w:val': STYLE_METRICS.TableText!.size }) +
        empty('w:szCs', { 'w:val': STYLE_METRICS.TableText!.size }),
      empty('w:spacing', { 'w:after': 0, 'w:line': 240, 'w:lineRule': 'auto' }),
    ),
    // TOC heading + entry levels.
    simpleParagraphStyle(
      'TOCHeading',
      'TOC Heading',
      empty('w:b') + empty('w:bCs') +
        empty('w:sz', { 'w:val': STYLE_METRICS.TOCHeading!.size }) +
        empty('w:szCs', { 'w:val': STYLE_METRICS.TOCHeading!.size }),
      empty('w:spacing', { 'w:after': 120 }),
    ),
    simpleParagraphStyle('TOC1', 'toc 1', undefined, empty('w:spacing', { 'w:after': 60 })),
    simpleParagraphStyle('TOC2', 'toc 2', undefined, empty('w:ind', { 'w:left': 220 }) + empty('w:spacing', { 'w:after': 40 })),
    simpleParagraphStyle('TOC3', 'toc 3', undefined, empty('w:ind', { 'w:left': 440 }) + empty('w:spacing', { 'w:after': 40 })),
    hyperlinkStyle(),
  ];

  return (
    XML_DECL +
    el(
      'w:styles',
      {
        'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      },
      docDefaults(ctx) + styles.join(''),
    )
  );
}
