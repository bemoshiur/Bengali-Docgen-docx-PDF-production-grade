// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
import { describe, it, expect, beforeAll } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { Document, Heading, Para, Table, Boq, TOC, text } from '../packages/lipi/src/index.ts';
import { notoSansBengali } from '../packages/fonts/src/index.ts';
import { deobfuscate, hasSfntMagic } from '../packages/lipi/src/fonts/obfuscate.ts';
import { validateDocxFiles, hasXmllint } from '../scripts/validate-xml.ts';

function buildDoc(): Document {
  const doc = new Document({ lang: 'bn-BD', font: notoSansBengali, numerals: 'bengali' });
  doc.section({ pageNumbers: { format: 'lowerRoman', start: 1 } }).add(new TOC());
  doc
    .section({ pageNumbers: { format: 'decimal', start: 1 } })
    .add(new Heading(1, 'পটভূমি'))
    .add(new Para([text('সাধারণ'), text(' গাঢ়', { bold: true }), text(' বাঁকা', { italic: true })]))
    .add(new Heading(2, 'যুক্তাক্ষর'))
    .add(new Para('ক্ষ জ্ঞ কৌ কো র্ক'))
    .add(Table.from([['ক', 'খ'], ['১', '২']], { header: true, widths: ['50%', '50%'] }))
    .add(new Boq([{ item: 'আসবাব', unit: 'সেট', qty: 2, rate: 1000 }]));
  return doc;
}

let files: Record<string, Uint8Array>;
let documentXml: string;

beforeAll(async () => {
  const bytes = await buildDoc().toDocxBuffer({ computeTocPages: false });
  files = unzipSync(bytes);
  documentXml = strFromU8(files['word/document.xml']!);
});

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('OOXML output', () => {
  it('is an OPC package with all required parts', () => {
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        '[Content_Types].xml',
        '_rels/.rels',
        'word/document.xml',
        'word/styles.xml',
        'word/settings.xml',
        'word/fontTable.xml',
        'word/_rels/fontTable.xml.rels',
        'word/fonts/font1.odttf',
      ]),
    );
  });

  it('Bug 1: every w:rFonts sets w:cs and every w:sz has a w:szCs', () => {
    const ascii = count(documentXml, /w:ascii=/g);
    const cs = count(documentXml, /w:cs=/g);
    const sz = count(documentXml, /<w:sz /g);
    const szCs = count(documentXml, /<w:szCs /g);
    expect(cs).toBe(ascii);
    expect(cs).toBeGreaterThan(0);
    expect(szCs).toBe(sz);
  });

  it('Bug 2: bold/italic always carry bCs/iCs twins', () => {
    expect(count(documentXml, /<w:bCs\/>/g)).toBe(count(documentXml, /<w:b\/>/g));
    expect(count(documentXml, /<w:b\/>/g)).toBeGreaterThan(0);
    expect(count(documentXml, /<w:iCs\/>/g)).toBe(count(documentXml, /<w:i\/>/g));
    expect(count(documentXml, /<w:i\/>/g)).toBeGreaterThan(0);
  });

  it('Bug 3: no TOC field, but static clickable entries + bookmarks', () => {
    expect(documentXml).not.toMatch(/instr=" TOC/);
    expect(documentXml).not.toContain('fldSimple w:instr=" TOC');
    expect(documentXml).toContain('<w:hyperlink');
    expect(documentXml).toContain('<w:bookmarkStart');
  });

  it('enables embedded fonts + declares the odttf content type + real Bengali sig', () => {
    expect(strFromU8(files['word/settings.xml']!)).toContain('embedTrueTypeFonts');
    expect(strFromU8(files['[Content_Types].xml']!)).toContain('obfuscatedFont');
    expect(strFromU8(files['word/fontTable.xml']!)).toMatch(/w:usb0="A001806F"/);
  });

  it('embeds a font that deobfuscates back to a valid TTF (§9.4)', () => {
    const ft = strFromU8(files['word/fontTable.xml']!);
    const key = ft.match(/w:embedRegular[^>]*w:fontKey="(\{[^"]+\})"/)![1]!;
    const odttf = Buffer.from(files['word/fonts/font1.odttf']!);
    expect(hasSfntMagic(odttf)).toBe(false);
    expect(hasSfntMagic(deobfuscate(odttf, key))).toBe(true);
  });

  it('restarts page numbering across two sections (roman → decimal, §6)', () => {
    expect(count(documentXml, /w:fmt="lowerRoman"/g)).toBe(1);
    expect(count(documentXml, /w:fmt="decimal"/g)).toBe(1);
  });

  it('renders the BoQ auto-total in Bengali numerals', () => {
    // qty 2 × rate 1000 = 2000 → ২,০০০, and সর্বমোট total row present.
    expect(documentXml).toContain('সর্বমোট');
    expect(documentXml).toContain('২,০০০');
  });

  it('validates against the WordprocessingML schema (rPr/font ordering, §5.4)', () => {
    if (!hasXmllint()) {
      console.warn('xmllint absent — skipping schema validation');
      return;
    }
    const res = validateDocxFiles(files);
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(true);
  });
});
