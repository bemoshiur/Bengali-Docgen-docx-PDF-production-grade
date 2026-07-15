/**
 * The `Document` facade and `Section` builder — the public entry point.
 *
 * Render pipeline:
 *   1. build the AST once (collecting headings + their extraction markers),
 *   2. if there's a TOC and LibreOffice is available, render a body-only docx,
 *      convert to PDF, and read back marker→page numbers (BUILD_PROMPT.md §6),
 *   3. expand the TOC placeholder with those page numbers,
 *   4. package everything into a .docx.
 */
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { registerFont, type FontInput, type RegisteredFont } from '../fonts/register.js';
import { buildFontTable } from '../ooxml/fontTable.js';
import { buildStyles } from '../ooxml/styles.js';
import { buildSettings } from '../ooxml/settings.js';
import { buildContentTypes } from '../ooxml/contentTypes.js';
import { RelManager, REL_TYPES, buildRootRels } from '../ooxml/rels.js';
import { renderDocument, type RenderContext } from '../ooxml/document.js';
import { assembleDocx, type PackageFiles } from '../ooxml/pkg.js';
import { sectionContentWidthTwips } from '../ooxml/sectPr.js';
import { BASE_SIZE_HALFPT } from '../ooxml/styleMetrics.js';
import type { LangSpec } from '../ooxml/runProps.js';
import { expandToc, extractMarkerPages } from '../toc.js';
import { convertToPdf, extractPdfPageTexts, findSoffice } from '../pdf/libreoffice.js';
import { toBengaliNumerals } from '../bangla/numerals.js';
import type { BlockNode, MarginsMm, Numerals, SectionNode, SectionProps } from './ast.js';
import type { Block, BuildContext, HeadingRef } from './blocks.js';

export interface DocumentOptions {
  /** Document language / complex-script (bidi) locale. Default `bn-BD`. */
  lang?: string;
  /** The font to embed. Accepts a FontInput (auto-registered) or a RegisteredFont. */
  font: FontInput | RegisteredFont;
  /** Numeral system for generated numbers (TOC, tables, BoQ). Default `bengali`. */
  numerals?: Numerals;
  /** Default page margins in mm, applied to every section. */
  margins?: Partial<MarginsMm>;
  /** Body font size in points. Default 12. */
  baseFontSizePt?: number;
}

export interface RenderOptions {
  /** Compute real TOC page numbers via LibreOffice. Default true (auto-skips if soffice absent). */
  computeTocPages?: boolean;
}

function isRegistered(font: FontInput | RegisteredFont): font is RegisteredFont {
  return Array.isArray((font as RegisteredFont).faces);
}

/** A section builder; `add()` is chainable per the §10 API. */
export class Section {
  private readonly items: Block[] = [];
  constructor(readonly props: SectionProps) {}

  add(...blocks: Block[]): this {
    this.items.push(...blocks);
    return this;
  }

  /** @internal */
  blocks(): readonly Block[] {
    return this.items;
  }
}

export class Document {
  private readonly sectionsList: Section[] = [];
  private readonly font: RegisteredFont;
  private readonly numerals: Numerals;
  private readonly langStr: string;
  private readonly marginsMm?: Partial<MarginsMm>;
  private readonly baseSizeHalfPt: number;

  constructor(opts: DocumentOptions) {
    this.font = isRegistered(opts.font) ? opts.font : registerFont(opts.font);
    this.numerals = opts.numerals ?? 'bengali';
    this.langStr = opts.lang ?? 'bn-BD';
    this.marginsMm = opts.margins;
    this.baseSizeHalfPt = opts.baseFontSizePt ? Math.round(opts.baseFontSizePt * 2) : BASE_SIZE_HALFPT;
  }

  /** Start a new section. Doc-level margins apply unless the section overrides them. */
  section(props: SectionProps = {}): Section {
    const merged: SectionProps = {
      ...props,
      marginsMm: { ...this.marginsMm, ...props.marginsMm },
    };
    const s = new Section(merged);
    this.sectionsList.push(s);
    return s;
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  private langSpec(): LangSpec {
    return { val: 'en-US', eastAsia: 'en-US', bidi: this.langStr };
  }

  private buildAst(): { sections: SectionNode[]; headings: HeadingRef[] } {
    const headings: HeadingRef[] = [];
    let bmId = 0;
    let markerN = 0;
    const ctx: BuildContext = {
      numerals: this.numerals,
      nextBookmarkId: () => (bmId += 1),
      nextMarker: () => `ZQX${String((markerN += 1)).padStart(4, '0')}ZQX`,
      registerHeading: (r) => headings.push(r),
      num: (n) => (this.numerals === 'bengali' ? toBengaliNumerals(n) : String(n)),
    };

    const sections: SectionNode[] = this.sectionsList.map((s) => {
      const blocks: BlockNode[] = [];
      for (const block of s.blocks()) {
        const built = block.build(ctx);
        if (Array.isArray(built)) blocks.push(...built);
        else blocks.push(built);
      }
      return { props: s.props, blocks };
    });
    return { sections, headings };
  }

  private hasToc(sections: SectionNode[]): boolean {
    return sections.some((s) => s.blocks.some((b) => b.kind === 'toc'));
  }

  private expandTocs(
    sections: SectionNode[],
    headings: HeadingRef[],
    pageMap: Map<string, number> | undefined,
  ): SectionNode[] {
    return sections.map((sec) => {
      const blocks: BlockNode[] = [];
      for (const b of sec.blocks) {
        if (b.kind === 'toc') {
          blocks.push(
            ...expandToc(b, headings, {
              numerals: this.numerals,
              tabPos: sectionContentWidthTwips(sec.props),
              pageMap,
            }),
          );
        } else {
          blocks.push(b);
        }
      }
      return { props: sec.props, blocks };
    });
  }

  /** Package already-expanded sections (no TOC placeholders) into .docx bytes. */
  private packageSections(sections: SectionNode[]): Uint8Array {
    const rels = new RelManager();
    const renderCtx: RenderContext = {
      fontName: this.font.name,
      lang: this.langSpec(),
      numerals: this.numerals,
    };
    const { documentXml, headers, footers } = renderDocument(sections, renderCtx, rels);

    // Parts referenced by the package (not by r:id in document.xml).
    rels.add(REL_TYPES.styles, 'styles.xml');
    rels.add(REL_TYPES.settings, 'settings.xml');
    rels.add(REL_TYPES.fontTable, 'fontTable.xml');

    const styles = buildStyles({
      fontName: this.font.name,
      baseSizeHalfPt: this.baseSizeHalfPt,
      langBidi: this.langStr,
    });
    const settings = buildSettings({ langBidi: this.langStr });
    const { fontTableXml, fontTableRels, odttfParts } = buildFontTable([this.font]);
    const contentTypes = buildContentTypes({
      headerCount: headers.length,
      footerCount: footers.length,
      hasFonts: true,
      hasNumbering: false,
    });

    const files: PackageFiles = {
      '[Content_Types].xml': contentTypes,
      '_rels/.rels': buildRootRels(),
      'word/document.xml': documentXml,
      'word/_rels/document.xml.rels': rels.serialize(),
      'word/styles.xml': styles,
      'word/settings.xml': settings,
      'word/fontTable.xml': fontTableXml,
      'word/_rels/fontTable.xml.rels': fontTableRels,
    };
    for (const h of headers) files[`word/header${h.index}.xml`] = h.xml;
    for (const f of footers) files[`word/footer${f.index}.xml`] = f.xml;
    for (const p of odttfParts) files[p.path] = p.bytes;

    return assembleDocx(files);
  }

  private async computeBodyPageMap(sections: SectionNode[]): Promise<Map<string, number>> {
    const body = sections.filter((s) => !s.blocks.some((b) => b.kind === 'toc'));
    const bytes = this.packageSections(body);
    const dir = mkdtempSync(join(tmpdir(), 'lipi-pass1-'));
    const docxPath = join(dir, 'body.docx');
    writeFileSync(docxPath, bytes);
    const pdfPath = await convertToPdf(docxPath, { outDir: dir });
    const texts = await extractPdfPageTexts(pdfPath);
    return extractMarkerPages(texts);
  }

  /** Render to .docx bytes (async because computing TOC pages may invoke LibreOffice). */
  async toDocxBuffer(opts: RenderOptions = {}): Promise<Uint8Array> {
    const { sections, headings } = this.buildAst();
    let pageMap: Map<string, number> | undefined;

    if (this.hasToc(sections) && opts.computeTocPages !== false) {
      if (findSoffice()) {
        pageMap = await this.computeBodyPageMap(sections);
      } else {
        console.warn(
          '[lipi] LibreOffice not found: the TOC will render without page numbers ' +
            '(entries stay clickable). Install soffice for computed page numbers — see BUILD_PROMPT.md §8.',
        );
      }
    }

    const expanded = this.expandTocs(sections, headings, pageMap);
    return this.packageSections(expanded);
  }

  /** Render and write a .docx file. */
  async toDocx(path: string, opts: RenderOptions = {}): Promise<void> {
    const bytes = await this.toDocxBuffer(opts);
    await writeFile(path, bytes);
  }

  /** Render to PDF via LibreOffice (requires `soffice`). */
  async toPdf(path: string, opts: RenderOptions = {}): Promise<void> {
    const dir = mkdtempSync(join(tmpdir(), 'lipi-pdf-'));
    const docxPath = join(dir, 'doc.docx');
    await this.toDocx(docxPath, opts);
    const pdfPath = await convertToPdf(docxPath, { outDir: dir });
    copyFileSync(pdfPath, path);
  }
}
