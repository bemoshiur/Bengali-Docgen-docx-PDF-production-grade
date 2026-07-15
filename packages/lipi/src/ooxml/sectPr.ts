// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * `w:sectPr` emission. This is where BUILD_PROMPT.md §6's TOC trick lives:
 * front matter and body get their OWN sections with independent
 * `w:pgNumType`, so the TOC's length has zero effect on body page numbers.
 *
 * Children of `CT_SectPr` are a sequence:
 *   headerReference* → footerReference* → type → pgSz → pgMar → pgNumType →
 *   cols → titlePg → docGrid
 */
import { el, empty } from './xml.js';
import { A4_MM, mmToTwip, type MarginsMm, type SectionProps } from '../model/ast.js';

export interface SectRefs {
  headerRelId?: string;
  footerRelId?: string;
  /** `nextPage` for every section after the first; omitted for the first. */
  type?: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage';
  titlePg?: boolean;
}

export const DEFAULT_MARGINS: MarginsMm = { top: 25, right: 25, bottom: 25, left: 30, header: 12, footer: 12 };

/** Printable content width (twips) for a section — page width minus L/R margins. */
export function sectionContentWidthTwips(props: SectionProps): number {
  const base = props.pageSizeMm ?? A4_MM;
  const wMm = props.landscape ? base.height : base.width;
  const m = { ...DEFAULT_MARGINS, ...props.marginsMm };
  return mmToTwip(wMm - m.left - m.right);
}

function pgSz(props: SectionProps): string {
  const base = props.pageSizeMm ?? A4_MM;
  const wMm = props.landscape ? base.height : base.width;
  const hMm = props.landscape ? base.width : base.height;
  return empty('w:pgSz', {
    'w:w': mmToTwip(wMm),
    'w:h': mmToTwip(hMm),
    'w:orient': props.landscape ? 'landscape' : undefined,
  });
}

function pgMar(props: SectionProps): string {
  const m = { ...DEFAULT_MARGINS, ...props.marginsMm };
  return empty('w:pgMar', {
    'w:top': mmToTwip(m.top),
    'w:right': mmToTwip(m.right),
    'w:bottom': mmToTwip(m.bottom),
    'w:left': mmToTwip(m.left),
    'w:header': mmToTwip(m.header ?? 12),
    'w:footer': mmToTwip(m.footer ?? 12),
    'w:gutter': 0,
  });
}

/** Render `<w:sectPr>` for a section. */
export function renderSectPr(props: SectionProps, refs: SectRefs = {}): string {
  const parts: string[] = [];

  if (refs.headerRelId) {
    parts.push(empty('w:headerReference', { 'w:type': 'default', 'r:id': refs.headerRelId }));
  }
  if (refs.footerRelId) {
    parts.push(empty('w:footerReference', { 'w:type': 'default', 'r:id': refs.footerRelId }));
  }
  if (refs.type) parts.push(empty('w:type', { 'w:val': refs.type }));

  parts.push(pgSz(props));
  parts.push(pgMar(props));

  if (props.pageNumbers) {
    parts.push(
      empty('w:pgNumType', {
        'w:fmt': props.pageNumbers.format,
        'w:start': props.pageNumbers.start,
      }),
    );
  }

  parts.push(empty('w:cols', { 'w:space': 708, 'w:num': 1 }));
  if (refs.titlePg) parts.push(empty('w:titlePg'));
  parts.push(empty('w:docGrid', { 'w:linePitch': 360 }));

  return el('w:sectPr', undefined, parts.join(''));
}
