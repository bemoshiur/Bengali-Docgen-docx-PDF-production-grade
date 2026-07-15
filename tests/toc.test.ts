// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
import { describe, it, expect } from 'vitest';
import { markerToken, extractMarkerPages, expandToc } from '../packages/lipi/src/toc.ts';
import type { HeadingRef } from '../packages/lipi/src/model/blocks.ts';
import type { TocNode } from '../packages/lipi/src/model/ast.ts';

describe('TOC marker extraction (§6)', () => {
  it('formats tokens as ZQX%04dZQX', () => {
    expect(markerToken(1)).toBe('ZQX0001ZQX');
    expect(markerToken(42)).toBe('ZQX0042ZQX');
  });
  it('maps markers to their first page number', () => {
    const map = extractMarkerPages(['intro ZQX0001ZQX text', 'more ZQX0002ZQX', 'ZQX0001ZQX again']);
    expect(map.get('ZQX0001ZQX')).toBe(1);
    expect(map.get('ZQX0002ZQX')).toBe(2);
  });
});

describe('TOC expansion', () => {
  const headings: HeadingRef[] = [
    { level: 1, text: 'পটভূমি', bookmarkName: '_Lipi_Toc_1', marker: 'ZQX0001ZQX' },
    { level: 2, text: 'উদ্দেশ্য', bookmarkName: '_Lipi_Toc_2', marker: 'ZQX0002ZQX' },
    { level: 4, text: 'গভীর', bookmarkName: '_Lipi_Toc_3', marker: 'ZQX0003ZQX' }, // out of range
  ];
  const toc: TocNode = { kind: 'toc', title: 'সূচিপত্র', levels: [1, 3] };

  it('emits a title + one entry per in-range heading, each clickable with a dot leader', () => {
    const paras = expandToc(toc, headings, { numerals: 'bengali', tabPos: 9350 });
    expect(paras).toHaveLength(3); // title + 2 entries (level 4 excluded)
    expect(paras[0]!.runs[0]).toMatchObject({ kind: 'text', text: 'সূচিপত্র' });
    const entry = paras[1]!;
    expect(entry.props.tabs?.[0]).toMatchObject({ val: 'right', leader: 'dot' });
    expect(entry.runs[0]).toMatchObject({ kind: 'hyperlink', anchor: '_Lipi_Toc_1' });
  });

  it('renders Bengali page numbers when a page map is supplied', () => {
    const pageMap = new Map([['ZQX0001ZQX', 5]]);
    const paras = expandToc(toc, headings, { numerals: 'bengali', tabPos: 9350, pageMap });
    const entry = paras[1]!;
    const last = entry.runs[entry.runs.length - 1];
    expect(last).toMatchObject({ kind: 'text', text: '৫' });
  });

  it('omits page numbers when no map is supplied (still clickable)', () => {
    const paras = expandToc(toc, headings, { numerals: 'bengali', tabPos: 9350 });
    const entry = paras[1]!;
    // hyperlink + tab, but no trailing page-number run
    expect(entry.runs.at(-1)).toMatchObject({ kind: 'tab' });
  });
});
