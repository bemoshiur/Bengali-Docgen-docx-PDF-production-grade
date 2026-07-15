// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * Bengali Taka (৳, U+09F3) formatting with correct South-Asian grouping.
 *
 * The single detail every accountant in BD notices: money is grouped
 * last-three-then-twos (lakh/crore), NOT in thousands. 1000000 is
 * ১০,০০,০০০ (ten lakh), never 1,000,000. Get this wrong and the document
 * reads as foreign. (BUILD_PROMPT.md §10.)
 */
import { toBengaliNumerals } from './numerals.js';

/** Bangladeshi Taka sign (U+09F3). */
export const TAKA_SIGN = '৳';
/** Indian Rupee sign (U+20B9) — for Bengali documents in India (West Bengal, etc.). */
export const RUPEE_SIGN = '₹';

export interface CurrencyOptions {
  numerals?: 'bengali' | 'ascii';
  /** Prepend the currency sign. Default true. */
  symbol?: boolean;
  /** Spell the amount out in Bengali words (e.g. "দশ লক্ষ টাকা"). */
  words?: boolean;
  /** Force a fixed number of decimal (poisha/paisa) places. */
  decimals?: number;
  /** Word used in the words form. Default "টাকা" (used for both ৳ and ₹ in Bengali). */
  currencyWord?: string;
}

/** Back-compat alias. */
export type TakaOptions = CurrencyOptions;

/**
 * Group an integer digit string in the Indian/Bengali style:
 * the last three digits, then groups of two.
 * @example groupSouthAsian("1000000") // → "10,00,000"
 */
export function groupSouthAsian(intDigits: string): string {
  const s = intDigits.replace(/^0+(?=\d)/, ''); // drop leading zeros, keep one
  if (s.length <= 3) return s;
  const head = s.slice(0, -3);
  const tail = s.slice(-3);
  // Insert a comma every 2 digits in the head, from the right.
  const grouped = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${grouped},${tail}`;
}

/** Shared money formatter used by {@link formatTaka} and {@link formatRupee}. */
function formatMoney(amount: number, symbolChar: string, opts: CurrencyOptions): string {
  const { numerals = 'bengali', symbol = true, words = false, decimals, currencyWord = 'টাকা' } = opts;

  if (words) {
    return `${takaInWords(Math.round(amount))} ${currencyWord}`;
  }

  const negative = amount < 0;
  const abs = Math.abs(amount);
  const fixed =
    decimals !== undefined
      ? abs.toFixed(decimals)
      : Number.isInteger(abs)
        ? abs.toFixed(0)
        : abs.toFixed(2);

  const [intPart, fracPart] = fixed.split('.');
  let body = groupSouthAsian(intPart!);
  if (fracPart) body += `.${fracPart}`;
  if (numerals === 'bengali') body = toBengaliNumerals(body);

  const sign = negative ? '-' : '';
  return `${sign}${symbol ? symbolChar : ''}${body}`;
}

/**
 * Format a Bangladeshi Taka amount (৳) with South-Asian lakh/crore grouping.
 * @example formatTaka(1000000)                 // "৳১০,০০,০০০"
 * @example formatTaka(1000000, {words:true})   // "দশ লক্ষ টাকা"
 * @example formatTaka(1234.5, {decimals:2})    // "৳১,২৩৪.৫০"
 */
export function formatTaka(amount: number, opts: CurrencyOptions = {}): string {
  return formatMoney(amount, TAKA_SIGN, opts);
}

/**
 * Format an Indian Rupee amount (₹) — for Bengali documents in India — with the
 * same South-Asian lakh/crore grouping.
 * @example formatRupee(1000000)                // "₹১০,০০,০০০"
 * @example formatRupee(1000000, {words:true})  // "দশ লক্ষ টাকা"
 */
export function formatRupee(amount: number, opts: CurrencyOptions = {}): string {
  return formatMoney(amount, RUPEE_SIGN, opts);
}

// ── Number → Bengali words ─────────────────────────────────────────────────

// 0–99 are irregular in Bengali and must be tabulated verbatim.
const ONES: string[] = [
  'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বাহান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঁচান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি',
  'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই',
  'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই',
];

/** Convert a non-negative integer to Bengali words using the Indian scale (কোটি/লক্ষ/হাজার/শত). */
export function takaInWords(n: number): string {
  if (!Number.isInteger(n)) throw new Error(`takaInWords expects an integer, got ${n}`);
  if (n < 0) return `ঋণাত্মক ${takaInWords(-n)}`;
  if (n < 100) return ONES[n]!;

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;
  const rest = n;

  if (crore > 0) parts.push(`${takaInWords(crore)} কোটি`);
  if (lakh > 0) parts.push(`${ONES[lakh]} লক্ষ`);
  if (thousand > 0) parts.push(`${ONES[thousand]} হাজার`);
  if (hundred > 0) parts.push(`${ONES[hundred]} শত`);
  if (rest > 0) parts.push(ONES[rest]!);

  return parts.join(' ');
}
