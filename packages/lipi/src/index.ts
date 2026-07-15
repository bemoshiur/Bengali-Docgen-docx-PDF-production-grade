// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * `lipi` — correct Bengali (বাংলা) DOCX and PDF generation from Node.js.
 *
 * @example
 * ```ts
 * import { Document, Heading, Para, TOC } from '@bemoshiur/lipi';
 * import { hindSiliguri } from '@bemoshiur/lipi-fonts';
 *
 * const doc = new Document({ lang: 'bn-BD', font: hindSiliguri, numerals: 'bengali' });
 * doc.section({ pageNumbers: { format: 'lowerRoman', start: 1 } }).add(new TOC());
 * doc.section({ pageNumbers: { format: 'decimal', start: 1 } })
 *    .add(new Heading(1, 'প্রকল্পের পটভূমি'))
 *    .add(new Para('গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের...'));
 * await doc.toDocx('out.docx');
 * ```
 */

// Core API
export {
  Document,
  Section,
  type DocumentOptions,
  type RenderOptions,
} from './model/document.js';

export {
  Para,
  Heading,
  PageBreak,
  Table,
  Boq,
  TOC,
  text,
  tab,
  lineBreak,
  type Block,
  type BuildContext,
  type TableOptions,
  type BoqItem,
  type BoqOptions,
  type TocOptions,
  type CellInput,
  type RowInput,
} from './model/blocks.js';

export type {
  Align,
  Numerals,
  RunProps,
  ParaProps,
  SectionProps,
  PageNumbering,
  MarginsMm,
} from './model/ast.js';

// Fonts
export {
  registerFont,
  type FontInput,
  type RegisteredFont,
  type FaceKey,
} from './fonts/register.js';
export { makeFontKey, obfuscate, deobfuscate } from './fonts/obfuscate.js';
export { readFontInfo, coversBengali, type FontInfo, type FontSig } from './fonts/os2.js';

// PDF
export { findSoffice, convertToPdf, SofficeNotFoundError } from './pdf/libreoffice.js';

// Bangla utilities (also available at '@bemoshiur/lipi/bangla')
export {
  BENGALI_DIGITS,
  toBengaliNumerals,
  toAsciiNumerals,
  TAKA_SIGN,
  RUPEE_SIGN,
  groupSouthAsian,
  formatTaka,
  formatRupee,
  takaInWords,
  type CurrencyOptions,
  type TakaOptions,
  BANGLA_MONTHS,
  BANGLA_WEEKDAYS,
  toBanglaDate,
  formatBanglaDate,
  type BanglaDate,
} from './bangla/index.js';
