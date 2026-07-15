import type {
  BlockNode,
  CellNode,
  CellProps,
  InlineNode,
  Numerals,
  ParaProps,
  ParagraphNode,
  RowNode,
  RunNode,
  RunProps,
  TableNode,
  TocNode,
} from './ast.js';
import { toBengaliNumerals } from '../bangla/numerals.js';
import { formatTaka } from '../bangla/currency.js';

// ── Inline run helpers ─────────────────────────────────────────────────────

/** A formatted text run. */
export function text(s: string, props: RunProps = {}): RunNode {
  return { kind: 'text', text: s, props };
}
/** A tab character (advances to the next tab stop; used for TOC dot leaders). */
export function tab(): RunNode {
  return { kind: 'tab' };
}
/** A soft line break within a paragraph. */
export function lineBreak(): RunNode {
  return { kind: 'break', breakType: 'line' };
}

// ── Build context ──────────────────────────────────────────────────────────

/** Info the Document collects about each heading so it can build the TOC. */
export interface HeadingRef {
  level: number;
  text: string;
  bookmarkName: string;
  marker: string;
}

/** Passed to every block's {@link Block.build}. Owns doc-wide unique counters. */
export interface BuildContext {
  numerals: Numerals;
  /** Allocate a globally-unique bookmark id. */
  nextBookmarkId(): number;
  /** Allocate the next `ZQX%04dZQX` marker token (BUILD_PROMPT.md §6). */
  nextMarker(): string;
  /** Called by headings so the Document can enumerate them for the TOC. */
  registerHeading(ref: HeadingRef): void;
  /** Format an integer with the document's numeral system. */
  num(n: number): string;
}

/** Everything addable to a Section implements this. */
export interface Block {
  build(ctx: BuildContext): BlockNode | BlockNode[];
}

// ── Paragraph ────────────────────────────────────────────────────────────

function normalizeContent(content: string | InlineNode | InlineNode[]): InlineNode[] {
  if (typeof content === 'string') return [text(content)];
  if (Array.isArray(content)) return content;
  return [content];
}

export class Para implements Block {
  protected runs: InlineNode[];
  protected props: ParaProps;

  constructor(content: string | InlineNode | InlineNode[] = '', props: ParaProps = {}) {
    this.runs = normalizeContent(content);
    this.props = props;
  }

  build(_ctx: BuildContext): ParagraphNode {
    return { kind: 'paragraph', props: this.props, runs: this.runs };
  }
}

// ── Heading ──────────────────────────────────────────────────────────────

/**
 * A heading. Auto-assigns an outline level (drives Word's navigation pane and
 * the TOC), a bookmark (so TOC entries are clickable), and an extraction
 * marker (so pass-1 PDF text yields this heading's page number — §6).
 */
export class Heading implements Block {
  private readonly content: InlineNode[];

  constructor(
    private readonly level: number,
    content: string | InlineNode | InlineNode[],
    private readonly extra: ParaProps = {},
  ) {
    if (level < 1 || level > 9) throw new Error(`heading level must be 1–9, got ${level}`);
    this.content = normalizeContent(content);
  }

  build(ctx: BuildContext): ParagraphNode {
    const id = ctx.nextBookmarkId();
    const bookmarkName = `_Lipi_Toc_${id}`;
    const marker = ctx.nextMarker();
    const plain = this.content
      .map((r) => (r.kind === 'text' ? r.text : ''))
      .join('');
    ctx.registerHeading({ level: this.level, text: plain, bookmarkName, marker });

    const runs: InlineNode[] = [
      // Invisible-but-extractable marker in the SAME paragraph as the heading.
      { kind: 'marker', token: marker },
      ...this.content,
    ];
    return {
      kind: 'paragraph',
      props: {
        ...this.extra,
        styleId: `Heading${this.level}`,
        outlineLevel: this.level - 1,
        keepNext: true,
        bookmark: { id, name: bookmarkName },
      },
      runs,
    };
  }
}

// ── Page break ─────────────────────────────────────────────────────────────

export class PageBreak implements Block {
  build(_ctx: BuildContext): ParagraphNode {
    return { kind: 'paragraph', props: {}, runs: [{ kind: 'break', breakType: 'page' }] };
  }
}

// ── Table ────────────────────────────────────────────────────────────────

export type CellInput = string | { text: string; props?: RunProps & CellProps };
export type RowInput = CellInput[];

export interface TableOptions {
  header?: boolean;
  widths?: (string | number)[];
  borders?: boolean;
  layout?: 'fixed' | 'auto';
  align?: ParaProps['align'];
}

function cellFrom(input: CellInput, defaultAlign?: ParaProps['align']): CellNode {
  const raw = typeof input === 'string' ? { text: input } : input;
  const runProps: RunProps = {
    bold: raw.props?.bold,
    italic: raw.props?.italic,
    color: raw.props?.color,
    sizeHalfPt: raw.props?.sizeHalfPt,
    fontName: raw.props?.fontName,
  };
  const cellProps: CellProps = {
    width: raw.props?.width,
    align: raw.props?.align,
    vAlign: raw.props?.vAlign,
    shade: raw.props?.shade,
    colspan: raw.props?.colspan,
    vMerge: raw.props?.vMerge,
  };
  return {
    props: cellProps,
    blocks: [
      {
        kind: 'paragraph',
        props: { align: cellProps.align ?? defaultAlign, styleId: 'TableText' },
        runs: [text(raw.text, runProps)],
      },
    ],
  };
}

export class Table implements Block {
  protected node: TableNode;

  constructor(node: TableNode) {
    this.node = node;
  }

  /** Build a table from a 2-D array of cell inputs. */
  static from(rows: RowInput[], opts: TableOptions = {}): Table {
    const rowNodes: RowNode[] = rows.map((r, i) => ({
      cells: r.map((c) => cellFrom(c, opts.align)),
      header: opts.header === true && i === 0,
    }));
    return new Table({
      kind: 'table',
      rows: rowNodes,
      widths: opts.widths,
      borders: opts.borders ?? true,
      layout: opts.layout ?? 'fixed',
    });
  }

  build(_ctx: BuildContext): TableNode {
    return this.node;
  }
}

// ── Bill of Quantities (BoQ) ────────────────────────────────────────────────

export interface BoqItem {
  item: string;
  unit: string;
  qty: number;
  rate: number;
}

export interface BoqOptions {
  /** Column headers, defaulting to Bengali. */
  headers?: { sl: string; item: string; unit: string; qty: string; rate: string; amount: string };
  totalLabel?: string;
  widths?: (string | number)[];
}

const DEFAULT_BOQ_HEADERS = {
  sl: 'ক্রমিক',
  item: 'বিবরণ',
  unit: 'একক',
  qty: 'পরিমাণ',
  rate: 'দর',
  amount: 'মোট টাকা',
};

/**
 * The single most common real-world Bengali document element (BUILD_PROMPT.md
 * §10). Renders item/unit/qty/rate/amount with an auto-computed total, all in
 * the document's numeral system.
 */
export class Boq implements Block {
  constructor(
    private readonly items: BoqItem[],
    private readonly opts: BoqOptions = {},
  ) {}

  build(ctx: BuildContext): TableNode {
    const h = this.opts.headers ?? DEFAULT_BOQ_HEADERS;
    const numerals = ctx.numerals;
    const fmtNum = (n: number) => (numerals === 'bengali' ? toBengaliNumerals(n) : String(n));
    const fmtMoney = (n: number) => formatTaka(n, { numerals, symbol: false });

    const headerRow: RowInput = [h.sl, h.item, h.unit, h.qty, h.rate, h.amount].map((tx) => ({
      text: tx,
      props: { bold: true, align: 'center' as const, shade: 'EFEFEF' },
    }));

    const bodyRows: RowInput[] = this.items.map((it, i) => {
      const amount = it.qty * it.rate;
      return [
        { text: fmtNum(i + 1), props: { align: 'center' as const } },
        { text: it.item },
        { text: it.unit, props: { align: 'center' as const } },
        { text: fmtNum(it.qty), props: { align: 'right' as const } },
        { text: fmtMoney(it.rate), props: { align: 'right' as const } },
        { text: fmtMoney(amount), props: { align: 'right' as const } },
      ];
    });

    const total = this.items.reduce((s, it) => s + it.qty * it.rate, 0);
    const totalRow: RowInput = [
      { text: this.opts.totalLabel ?? 'সর্বমোট', props: { bold: true, align: 'right' as const, colspan: 5, shade: 'EFEFEF' } },
      { text: fmtMoney(total), props: { bold: true, align: 'right' as const, shade: 'EFEFEF' } },
    ];

    const table = Table.from([headerRow, ...bodyRows, totalRow], {
      header: true,
      widths: this.opts.widths ?? ['8%', '40%', '12%', '12%', '14%', '14%'],
    });
    // Mark the header row so it repeats across pages.
    return table.build(ctx);
  }
}

// ── Table of Contents (placeholder) ─────────────────────────────────────────

export interface TocOptions {
  levels?: [number, number];
  title?: string;
}

/**
 * A static, pre-computed TOC (BUILD_PROMPT.md §6). This is only a placeholder
 * in the AST; the Document expands it into real paragraphs once heading page
 * numbers are known (or, without LibreOffice, without page numbers).
 */
export class TOC implements Block {
  readonly levels: [number, number];
  readonly title: string;

  constructor(opts: TocOptions = {}) {
    this.levels = opts.levels ?? [1, 3];
    this.title = opts.title ?? 'সূচিপত্র';
  }

  build(_ctx: BuildContext): TocNode {
    return { kind: 'toc', title: this.title, levels: this.levels };
  }
}
