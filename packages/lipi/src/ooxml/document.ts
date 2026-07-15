/**
 * `word/document.xml` and the header/footer parts.
 *
 * The renderer DIRECT-FORMATS every text run: it always emits `w:rFonts` with
 * `w:cs`, `w:sz` + `w:szCs`, and the bidi `w:lang` (BUILD_PROMPT.md §2, "set on
 * every run"). Effective size/weight come from the paragraph's style via
 * `styleMetrics`, so headings stay large while every run still declares the
 * complex-script slot.
 */
import { XML_DECL, WML_NS, el, empty, esc } from './xml.js';
import { renderRunProps, markerRunProps, textRun, type LangSpec, type ResolvedRunProps } from './runProps.js';
import { renderParaProps } from './paraProps.js';
import { renderSectPr, sectionContentWidthTwips, type SectRefs } from './sectPr.js';
import { metricFor } from './styleMetrics.js';
import { REL_TYPES, type RelManager } from './rels.js';
import type {
  BlockNode,
  CellNode,
  InlineNode,
  Numerals,
  ParagraphNode,
  RowNode,
  RunNode,
  RunProps,
  SectionNode,
  TableNode,
} from '../model/ast.js';

export interface RenderContext {
  fontName: string;
  lang: LangSpec;
  numerals: Numerals;
}

export interface RenderedDocument {
  documentXml: string;
  headers: { index: number; xml: string }[];
  footers: { index: number; xml: string }[];
}

/** Table pct width base: 5000 = 100% (fiftieths of a percent). */
const PCT_FULL = 5000;

// ── Runs ─────────────────────────────────────────────────────────────────

function resolveRunProps(
  props: RunProps,
  styleId: string | undefined,
  ctx: RenderContext,
  runStyleId?: string,
): ResolvedRunProps {
  const metric = metricFor(styleId);
  const resolved: ResolvedRunProps = {
    fontName: props.fontName ?? ctx.fontName,
    sizeHalfPt: props.sizeHalfPt ?? metric.size,
    lang: ctx.lang,
  };
  if (runStyleId) resolved.styleId = runStyleId;
  resolved.bold = props.bold ?? metric.bold ?? false;
  resolved.italic = props.italic ?? false;
  if (props.underline) resolved.underline = true;
  if (props.strike) resolved.strike = true;
  if (props.smallCaps) resolved.smallCaps = true;
  if (props.color) resolved.color = props.color;
  if (props.superscript) resolved.vertAlign = 'superscript';
  else if (props.subscript) resolved.vertAlign = 'subscript';
  return resolved;
}

function renderTextRun(
  node: Extract<RunNode, { kind: 'text' }>,
  styleId: string | undefined,
  ctx: RenderContext,
  runStyleId?: string,
): string {
  const rPr = renderRunProps(resolveRunProps(node.props, styleId, ctx, runStyleId));
  return textRun(node.text, rPr);
}

function renderInline(node: InlineNode, styleId: string | undefined, ctx: RenderContext): string {
  if (node.kind === 'hyperlink') {
    // Internal link → give inner runs the Hyperlink character style.
    const runs = node.runs.map((r) => renderRun(r, styleId, ctx, 'Hyperlink')).join('');
    return el('w:hyperlink', { 'w:anchor': node.anchor }, runs);
  }
  return renderRun(node, styleId, ctx);
}

function renderRun(node: RunNode, styleId: string | undefined, ctx: RenderContext, runStyleId?: string): string {
  switch (node.kind) {
    case 'text':
      return renderTextRun(node, styleId, ctx, runStyleId);
    case 'marker':
      // 1pt white, ASCII, present in the text layer (BUILD_PROMPT.md §6).
      return `<w:r>${markerRunProps()}<w:t xml:space="preserve">${esc(node.token)}</w:t></w:r>`;
    case 'tab':
      return '<w:r><w:tab/></w:r>';
    case 'break':
      return node.breakType === 'line'
        ? '<w:r><w:br/></w:r>'
        : `<w:r>${empty('w:br', { 'w:type': node.breakType })}</w:r>`;
    case 'pageField': {
      const rPr = renderRunProps(resolveRunProps({}, styleId, ctx));
      return el('w:fldSimple', { 'w:instr': ' PAGE \\* MERGEFORMAT ' }, textRun('1', rPr));
    }
  }
}

// ── Paragraphs ─────────────────────────────────────────────────────────────

function renderParagraph(p: ParagraphNode, ctx: RenderContext, sectPr?: string): string {
  const pPr = renderParaProps(p.props, sectPr);
  const runs = p.runs.map((r) => renderInline(r, p.props.styleId, ctx)).join('');
  const bm = p.props.bookmark;
  const bmStart = bm ? empty('w:bookmarkStart', { 'w:id': bm.id, 'w:name': bm.name }) : '';
  const bmEnd = bm ? empty('w:bookmarkEnd', { 'w:id': bm.id }) : '';
  return el('w:p', undefined, pPr + bmStart + runs + bmEnd);
}

// ── Tables ─────────────────────────────────────────────────────────────────

function widthToTwips(w: string | number | undefined, contentTwips: number, fallback: number): number {
  if (w === undefined) return fallback;
  if (typeof w === 'number') return w;
  const pct = parseFloat(w);
  if (w.trim().endsWith('%') && Number.isFinite(pct)) return Math.round((pct / 100) * contentTwips);
  const n = Number(w);
  return Number.isFinite(n) ? n : fallback;
}

function tableBorders(): string {
  const side = (name: string) =>
    empty(`w:${name}`, { 'w:val': 'single', 'w:sz': 4, 'w:space': 0, 'w:color': '999999' });
  return el('w:tblBorders', undefined, ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(side).join(''));
}

function renderCell(cell: CellNode, widthTwips: number, ctx: RenderContext): string {
  const tcPrParts: string[] = [empty('w:tcW', { 'w:w': widthTwips, 'w:type': 'dxa' })];
  if (cell.props.colspan && cell.props.colspan > 1) {
    tcPrParts.push(empty('w:gridSpan', { 'w:val': cell.props.colspan }));
  }
  if (cell.props.vMerge) {
    tcPrParts.push(empty('w:vMerge', cell.props.vMerge === 'restart' ? { 'w:val': 'restart' } : undefined));
  }
  if (cell.props.shade) tcPrParts.push(empty('w:shd', { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': cell.props.shade }));
  tcPrParts.push(empty('w:vAlign', { 'w:val': cell.props.vAlign ?? 'center' }));

  const tcPr = el('w:tcPr', undefined, tcPrParts.join(''));
  const body = cell.blocks.map((b) => renderParagraph(b, ctx)).join('') || el('w:p', undefined, '');
  return el('w:tc', undefined, tcPr + body);
}

function renderRow(row: RowNode, colTwips: number[], ctx: RenderContext): string {
  const trPr = row.header ? el('w:trPr', undefined, empty('w:tblHeader')) : '';
  let col = 0;
  const cells = row.cells
    .map((cell) => {
      const span = cell.props.colspan ?? 1;
      let w = 0;
      for (let i = 0; i < span && col < colTwips.length; i++) w += colTwips[col++]!;
      return renderCell(cell, w || colTwips[0] || 1000, ctx);
    })
    .join('');
  return el('w:tr', undefined, trPr + cells);
}

function renderTable(t: TableNode, ctx: RenderContext, contentTwips: number): string {
  const numCols =
    t.widths?.length ?? Math.max(1, ...t.rows.map((r) => r.cells.reduce((n, c) => n + (c.props.colspan ?? 1), 0)));

  const colTwips: number[] = [];
  for (let i = 0; i < numCols; i++) {
    colTwips.push(widthToTwips(t.widths?.[i], contentTwips, Math.floor(contentTwips / numCols)));
  }

  const tblPrParts: string[] = [empty('w:tblW', { 'w:w': PCT_FULL, 'w:type': 'pct' })];
  if (t.borders !== false) tblPrParts.push(tableBorders());
  tblPrParts.push(empty('w:tblLayout', { 'w:type': t.layout === 'auto' ? 'autofit' : 'fixed' }));
  tblPrParts.push(empty('w:tblLook', { 'w:val': '04A0', 'w:firstRow': 1, 'w:lastRow': 0, 'w:firstColumn': 1, 'w:lastColumn': 0, 'w:noHBand': 0, 'w:noVBand': 1 }));
  const tblPr = el('w:tblPr', undefined, tblPrParts.join(''));

  const grid = el('w:tblGrid', undefined, colTwips.map((w) => empty('w:gridCol', { 'w:w': w })).join(''));
  const rows = t.rows.map((r) => renderRow(r, colTwips, ctx)).join('');
  return el('w:tbl', undefined, tblPr + grid + rows);
}

// ── Blocks / sections ────────────────────────────────────────────────────

function renderBlock(block: BlockNode, ctx: RenderContext, contentTwips: number): string {
  switch (block.kind) {
    case 'paragraph':
      return renderParagraph(block, ctx);
    case 'table':
      // Tables must be followed by a paragraph or Word complains; callers append one.
      return renderTable(block, ctx, contentTwips);
    case 'toc':
      // TOC nodes are expanded to paragraphs before rendering; render title as a fallback.
      return el('w:p', undefined, renderParaProps({ styleId: 'TOCHeading' }) + textRun(block.title, renderRunProps(resolveRunProps({}, 'TOCHeading', ctx))));
  }
}

function footerXml(ctx: RenderContext): string {
  const rPr = renderRunProps(resolveRunProps({}, undefined, ctx));
  const field = el('w:fldSimple', { 'w:instr': ' PAGE \\* MERGEFORMAT ' }, textRun('1', rPr));
  const para = el('w:p', undefined, renderParaProps({ align: 'center', styleId: 'Normal' }) + field);
  return XML_DECL + el('w:ftr', { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships' }, para);
}

function headerXml(hf: NonNullable<SectionNode['props']['header']>, ctx: RenderContext): string {
  const body = hf.blocks.map((b) => renderParagraph(b, ctx)).join('');
  return XML_DECL + el('w:hdr', { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships' }, body);
}

/** Render document.xml plus header/footer parts, wiring relationships through `rels`. */
export function renderDocument(sections: SectionNode[], ctx: RenderContext, rels: RelManager): RenderedDocument {
  const bodyParts: string[] = [];
  const headers: { index: number; xml: string }[] = [];
  const footers: { index: number; xml: string }[] = [];
  let finalSectPr = '';

  sections.forEach((section, i) => {
    const isLast = i === sections.length - 1;
    const contentTwips = sectionContentWidthTwips(section.props);
    const refs: SectRefs = {};
    if (i > 0) refs.type = 'nextPage';

    // Header (explicit only).
    if (section.props.header) {
      const index = headers.length + 1;
      headers.push({ index, xml: headerXml(section.props.header, ctx) });
      refs.headerRelId = rels.add(REL_TYPES.header, `header${index}.xml`);
    }
    // Footer: explicit, else auto page-number footer when the section numbers pages.
    if (section.props.footer) {
      const index = footers.length + 1;
      const body = section.props.footer.blocks.map((b) => renderParagraph(b, ctx)).join('');
      footers.push({ index, xml: XML_DECL + el('w:ftr', { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships' }, body) });
      refs.footerRelId = rels.add(REL_TYPES.footer, `footer${index}.xml`);
    } else if (section.props.pageNumbers) {
      const index = footers.length + 1;
      footers.push({ index, xml: footerXml(ctx) });
      refs.footerRelId = rels.add(REL_TYPES.footer, `footer${index}.xml`);
    }

    // Content.
    for (const block of section.blocks) {
      bodyParts.push(renderBlock(block, ctx, contentTwips));
      // A table cannot be the last body element and should be separated; add a spacer paragraph.
      if (block.kind === 'table') bodyParts.push(el('w:p', undefined, ''));
    }

    const sectPr = renderSectPr(section.props, refs);
    if (isLast) {
      finalSectPr = sectPr;
    } else {
      // Section-break paragraph carrying this section's properties.
      bodyParts.push(el('w:p', undefined, renderParaProps({}, sectPr)));
    }
  });

  const body = el('w:body', undefined, bodyParts.join('') + finalSectPr);
  const documentXml = XML_DECL + `<w:document ${WML_NS}>${body}</w:document>`;
  return { documentXml, headers, footers };
}
