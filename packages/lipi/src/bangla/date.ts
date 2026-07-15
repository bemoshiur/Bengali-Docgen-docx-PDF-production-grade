/**
 * Bengali calendar (বঙ্গাব্দ / Bangabda) dates, using the revised Bangladesh
 * calendar adopted by the Bangla Academy (effective 1425 BS / 2018).
 *
 * The revised rule is fixed and tiles the Gregorian year exactly:
 *   - the first five months (Boishakh–Bhadro) are 31 days,
 *   - the remaining seven (Ashwin–Choitro) are 30 days,
 *   - Falgun gains a day (→ 31) when the following February is a leap month,
 *   - Pohela Boishakh (1 Boishakh) is always 14 April.
 *
 * Sum: 31×5 + 30×7 = 365 (366 in a leap year). The month boundaries this
 * produces line up with the government's fixed anchors (1 Falgun = 13 Feb,
 * 1 Magh = 14 Jan, etc.). See JOURNEY.md for why this table and not another.
 */
import { toBengaliNumerals } from './numerals.js';

export const BANGLA_MONTHS = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র',
] as const;

export const BANGLA_WEEKDAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার',
] as const;

export interface BanglaDate {
  /** Bangla year (বঙ্গাব্দ). */
  year: number;
  /** 1-based month index. */
  month: number;
  /** Month name in Bengali. */
  monthName: string;
  /** 1-based day of month. */
  day: number;
  /** Weekday name in Bengali. */
  weekday: string;
}

function isGregorianLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Whole days between two UTC dates (b - a). */
function daysBetween(a: Date, b: Date): number {
  const MS = 86_400_000;
  const ua = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const ub = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((ub - ua) / MS);
}

/** Convert a Gregorian date to its revised-Bangladesh Bangla date. */
export function toBanglaDate(date: Date = new Date()): BanglaDate {
  const gYear = date.getUTCFullYear();
  // Boishakh 1 is 14 April. Decide which Bangla year we're in.
  const boishakhThisYear = new Date(Date.UTC(gYear, 3, 14)); // April = month 3
  const inNewYear = daysBetween(boishakhThisYear, date) >= 0;
  const boishakhYear = inNewYear ? gYear : gYear - 1;
  const banglaYear = boishakhYear - 593;

  const boishakh1 = new Date(Date.UTC(boishakhYear, 3, 14));
  let offset = daysBetween(boishakh1, date); // 0-based day index within Bangla year

  // Month lengths: first 5 are 31, rest 30; Falgun (+1) if next Feb is leap.
  const falgunExtra = isGregorianLeap(boishakhYear + 1) ? 1 : 0;
  const lengths = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30 + falgunExtra, 30];

  let month = 0;
  for (; month < 12; month++) {
    if (offset < lengths[month]!) break;
    offset -= lengths[month]!;
  }
  // `offset` now the 0-based day within `month`.
  return {
    year: banglaYear,
    month: month + 1,
    monthName: BANGLA_MONTHS[month]!,
    day: offset + 1,
    weekday: BANGLA_WEEKDAYS[date.getUTCDay()]!,
  };
}

export interface FormatBanglaDateOptions {
  /** Include the Bengali weekday name. */
  weekday?: boolean;
  numerals?: 'bengali' | 'ascii';
}

/**
 * Format a Gregorian date as a Bengali date string.
 * @example formatBanglaDate(new Date('2026-07-15')) // "৩১ আষাঢ় ১৪৩৩"
 */
export function formatBanglaDate(date: Date = new Date(), opts: FormatBanglaDateOptions = {}): string {
  const { weekday = false, numerals = 'bengali' } = opts;
  const bd = toBanglaDate(date);
  const num = (n: number) => (numerals === 'bengali' ? toBengaliNumerals(n) : String(n));
  const core = `${num(bd.day)} ${bd.monthName} ${num(bd.year)}`;
  return weekday ? `${bd.weekday}, ${core}` : core;
}
