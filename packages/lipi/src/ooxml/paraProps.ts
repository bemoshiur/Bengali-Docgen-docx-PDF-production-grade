// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * `w:pPr` emission. Children of `CT_PPr` are an xsd:sequence; append in the
 * canonical ECMA-376 order (pStyle → keepNext → … → jc → outlineLvl → sectPr).
 */
import { el, empty } from './xml.js';
import { mmToTwip, ptToTwip, type ParaProps } from '../model/ast.js';

function renderTabs(tabs: NonNullable<ParaProps['tabs']>): string {
  const inner = tabs
    .map((t) =>
      empty('w:tab', {
        'w:val': t.val,
        'w:leader': t.leader && t.leader !== 'none' ? t.leader : undefined,
        'w:pos': t.pos,
      }),
    )
    .join('');
  return el('w:tabs', undefined, inner);
}

function renderSpacing(pp: ParaProps): string | undefined {
  if (pp.spacingBeforePt === undefined && pp.spacingAfterPt === undefined && pp.linePt === undefined) {
    return undefined;
  }
  return empty('w:spacing', {
    'w:before': pp.spacingBeforePt !== undefined ? ptToTwip(pp.spacingBeforePt) : undefined,
    'w:after': pp.spacingAfterPt !== undefined ? ptToTwip(pp.spacingAfterPt) : undefined,
    'w:line': pp.linePt !== undefined ? ptToTwip(pp.linePt) : undefined,
    'w:lineRule': pp.linePt !== undefined ? 'auto' : undefined,
  });
}

function renderIndent(pp: ParaProps): string | undefined {
  if (
    pp.indentLeftMm === undefined &&
    pp.indentRightMm === undefined &&
    pp.firstLineMm === undefined &&
    pp.hangingMm === undefined
  ) {
    return undefined;
  }
  return empty('w:ind', {
    'w:left': pp.indentLeftMm !== undefined ? mmToTwip(pp.indentLeftMm) : undefined,
    'w:right': pp.indentRightMm !== undefined ? mmToTwip(pp.indentRightMm) : undefined,
    'w:firstLine': pp.firstLineMm !== undefined ? mmToTwip(pp.firstLineMm) : undefined,
    'w:hanging': pp.hangingMm !== undefined ? mmToTwip(pp.hangingMm) : undefined,
  });
}

/**
 * Render `<w:pPr>`. `sectPr` is a fully-serialized `<w:sectPr>…</w:sectPr>`
 * placed as the paragraph's section-break marker (last child).
 * Returns `''` when there is nothing to emit.
 */
export function renderParaProps(pp: ParaProps, sectPr?: string): string {
  const parts: string[] = [];

  if (pp.styleId) parts.push(empty('w:pStyle', { 'w:val': pp.styleId }));
  if (pp.keepNext) parts.push(empty('w:keepNext'));
  if (pp.keepLines) parts.push(empty('w:keepLines'));
  if (pp.pageBreakBefore) parts.push(empty('w:pageBreakBefore'));
  if (pp.numbering) {
    parts.push(
      el(
        'w:numPr',
        undefined,
        empty('w:ilvl', { 'w:val': pp.numbering.level }) +
          empty('w:numId', { 'w:val': pp.numbering.numId }),
      ),
    );
  }
  if (pp.tabs && pp.tabs.length) parts.push(renderTabs(pp.tabs));
  if (pp.bidi) parts.push(empty('w:bidi'));
  const spacing = renderSpacing(pp);
  if (spacing) parts.push(spacing);
  const ind = renderIndent(pp);
  if (ind) parts.push(ind);
  if (pp.align) parts.push(empty('w:jc', { 'w:val': pp.align }));
  if (pp.outlineLevel !== undefined) parts.push(empty('w:outlineLvl', { 'w:val': pp.outlineLevel }));
  if (sectPr) parts.push(sectPr);

  if (parts.length === 0) return '';
  return el('w:pPr', undefined, parts.join(''));
}
