// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * The normalized document AST. Fluent API classes build these plain nodes;
 * the OOXML emitters in `../ooxml` consume them. Keeping a single data
 * contract in the middle means the writer never sees builder objects and the
 * builders never touch XML.
 */

export type Align = 'left' | 'right' | 'center' | 'both' | 'distribute';
export type Numerals = 'bengali' | 'ascii';

/** Run-level formatting. Emitted as `w:rPr` with matched CS twins (bCs/iCs/szCs). */
export interface RunProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** 6-hex RGB with no leading `#`, or `'auto'`. */
  color?: string;
  /** Font size in half-points (OOXML `w:sz`/`w:szCs`). */
  sizeHalfPt?: number;
  /** Override the run's font family; falls back to the document font. */
  fontName?: string;
  smallCaps?: boolean;
  superscript?: boolean;
  subscript?: boolean;
}

export type RunNode =
  | { kind: 'text'; text: string; props: RunProps }
  /** TOC extraction marker: 1pt, white, ASCII — visible to the PDF text layer, invisible to the eye (BUILD_PROMPT.md §6). */
  | { kind: 'marker'; token: string }
  | { kind: 'tab' }
  | { kind: 'break'; breakType: 'page' | 'line' | 'column' }
  /** A `PAGE` field. ASCII digits only — see the numerals decision in JOURNEY.md. */
  | { kind: 'pageField' };

/** An internal hyperlink (used for clickable TOC entries → heading bookmarks). */
export interface HyperlinkNode {
  kind: 'hyperlink';
  anchor: string;
  runs: RunNode[];
}

export type InlineNode = RunNode | HyperlinkNode;

export interface TabStop {
  /** Position in twips. */
  pos: number;
  val: 'left' | 'right' | 'center';
  leader?: 'dot' | 'none';
}

export interface Bookmark {
  id: number;
  name: string;
}

export interface ParaProps {
  /** Style id, e.g. `Normal`, `Heading1`. */
  styleId?: string;
  align?: Align;
  /** 0-based outline level for headings (drives TOC + navigation pane). */
  outlineLevel?: number;
  /** Right-to-left paragraph direction. Bengali is LTR, so usually false. */
  bidi?: boolean;
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  /** Line spacing in points (auto rule). */
  linePt?: number;
  indentLeftMm?: number;
  indentRightMm?: number;
  firstLineMm?: number;
  hangingMm?: number;
  keepNext?: boolean;
  keepLines?: boolean;
  pageBreakBefore?: boolean;
  tabs?: TabStop[];
  bookmark?: Bookmark;
  numbering?: { numId: number; level: number };
}

export interface ParagraphNode {
  kind: 'paragraph';
  props: ParaProps;
  runs: InlineNode[];
}

export interface CellProps {
  /** Width as a percentage of table width, e.g. `'40%'`, or twips number. */
  width?: string | number;
  align?: Align;
  /** Vertical alignment within the cell. */
  vAlign?: 'top' | 'center' | 'bottom';
  /** Background shading, 6-hex RGB. */
  shade?: string;
  /** Horizontal span (merged columns). */
  colspan?: number;
  /** Vertical merge role. */
  vMerge?: 'restart' | 'continue';
}

export interface CellNode {
  props: CellProps;
  /** A cell contains block content; most commonly a single paragraph. */
  blocks: ParagraphNode[];
}

export interface RowNode {
  cells: CellNode[];
  /** Repeat this row as a header on every page the table spans. */
  header?: boolean;
}

export interface TableNode {
  kind: 'table';
  rows: RowNode[];
  /** Column widths; `'40%'` style or twips. Length defines column count. */
  widths?: (string | number)[];
  /** Table width in twips, or `'auto'`/`'pct'`. Defaults to full page (pct 5000). */
  layout?: 'fixed' | 'auto';
  /** Emit borders (default true). */
  borders?: boolean;
}

/** A placeholder expanded into real paragraphs at render time (static TOC, BUILD_PROMPT.md §6). */
export interface TocNode {
  kind: 'toc';
  title: string;
  levels: [number, number];
}

export type BlockNode = ParagraphNode | TableNode | TocNode;

export interface PageNumbering {
  format: 'decimal' | 'lowerRoman' | 'upperRoman' | 'lowerLetter' | 'upperLetter';
  start?: number;
}

export interface MarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
  header?: number;
  footer?: number;
}

export interface HeaderFooter {
  /** Block content for the header/footer. */
  blocks: ParagraphNode[];
}

export interface SectionProps {
  pageNumbers?: PageNumbering;
  pageSizeMm?: { width: number; height: number };
  marginsMm?: Partial<MarginsMm>;
  header?: HeaderFooter;
  footer?: HeaderFooter;
  /** Landscape flips width/height. */
  landscape?: boolean;
}

export interface SectionNode {
  props: SectionProps;
  blocks: BlockNode[];
}

// ── Units ────────────────────────────────────────────────────────────────
// OOXML measures pages/indents in twips (1/1440 inch) and font size in
// half-points. Our public API takes mm and pt; convert at the boundary.

export const TWIPS_PER_MM = 1440 / 25.4; // ≈ 56.6929

export function mmToTwip(mm: number): number {
  return Math.round(mm * TWIPS_PER_MM);
}

export function ptToTwip(pt: number): number {
  return Math.round(pt * 20);
}

export function ptToHalfPt(pt: number): number {
  return Math.round(pt * 2);
}

/** A4 in twips, the default Bengali government-document page size. */
export const A4_MM = { width: 210, height: 297 } as const;
