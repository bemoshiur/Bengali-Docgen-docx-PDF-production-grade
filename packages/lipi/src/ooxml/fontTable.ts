// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * `word/fontTable.xml` + its rels + the `.odttf` parts (BUILD_PROMPT.md §5.1).
 *
 * Each family becomes one `<w:font>` carrying the REAL OS/2 signature and
 * PANOSE parsed from the regular face, plus `embedRegular`/`embedBold`/… entries
 * that reference obfuscated font parts by relationship id.
 */
import { XML_DECL, el, empty } from './xml.js';
import type { FaceKey, RegisteredFont } from '../fonts/register.js';

export interface FontTableOutput {
  /** word/fontTable.xml */
  fontTableXml: string;
  /** word/_rels/fontTable.xml.rels */
  fontTableRels: string;
  /** word/fonts/fontN.odttf */
  odttfParts: { path: string; bytes: Buffer }[];
}

const EMBED_TAG: Record<FaceKey, string> = {
  regular: 'w:embedRegular',
  bold: 'w:embedBold',
  italic: 'w:embedItalic',
  boldItalic: 'w:embedBoldItalic',
};

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const FONT_REL_TYPE = `${REL_NS}/font`;

/** Build the fontTable part, its rels, and the odttf files for the given fonts. */
export function buildFontTable(fonts: RegisteredFont[]): FontTableOutput {
  const relEntries: string[] = [];
  const odttfParts: { path: string; bytes: Buffer }[] = [];
  const fontEls: string[] = [];
  let relCounter = 0;

  for (const font of fonts) {
    const regular = font.faces[0]!;
    const children: string[] = [
      empty('w:panose1', { 'w:val': regular.info.panose }),
      empty('w:charset', { 'w:val': '00' }),
      empty('w:family', { 'w:val': 'auto' }),
      empty('w:pitch', { 'w:val': 'variable' }),
      empty('w:sig', {
        'w:usb0': regular.info.sig.usb0,
        'w:usb1': regular.info.sig.usb1,
        'w:usb2': regular.info.sig.usb2,
        'w:usb3': regular.info.sig.usb3,
        'w:csb0': regular.info.sig.csb0,
        'w:csb1': regular.info.sig.csb1,
      }),
    ];

    // Emit embeds in canonical face order (register.ts already orders faces).
    for (const face of font.faces) {
      relCounter += 1;
      const relId = `rId${relCounter}`;
      const partName = `font${relCounter}.odttf`;
      odttfParts.push({ path: `word/fonts/${partName}`, bytes: face.odttf });
      relEntries.push(
        empty('Relationship', {
          Id: relId,
          Type: FONT_REL_TYPE,
          Target: `fonts/${partName}`,
        }),
      );
      children.push(
        empty(EMBED_TAG[face.key], { 'r:id': relId, 'w:fontKey': face.fontKey }),
      );
    }

    fontEls.push(el('w:font', { 'w:name': font.name }, children.join('')));
  }

  const fontTableXml =
    XML_DECL +
    el(
      'w:fonts',
      {
        'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'xmlns:r': REL_NS,
      },
      fontEls.join(''),
    );

  const fontTableRels =
    XML_DECL +
    el(
      'Relationships',
      { xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships' },
      relEntries.join(''),
    );

  return { fontTableXml, fontTableRels, odttfParts };
}
