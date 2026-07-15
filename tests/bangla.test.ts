// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
import { describe, it, expect } from 'vitest';
import { toBengaliNumerals, toAsciiNumerals } from '../packages/lipi/src/bangla/numerals.ts';
import { formatTaka, formatRupee, groupSouthAsian, takaInWords } from '../packages/lipi/src/bangla/currency.ts';
import { formatBanglaDate, toBanglaDate } from '../packages/lipi/src/bangla/date.ts';

describe('numerals', () => {
  it('converts ASCII → Bengali digits', () => {
    expect(toBengaliNumerals(1234567)).toBe('১২৩৪৫৬৭');
    expect(toBengaliNumerals('Ch. 12')).toBe('Ch. ১২');
  });
  it('round-trips back to ASCII', () => {
    expect(toAsciiNumerals('১২৩৪৫৬৭')).toBe('1234567');
  });
});

describe('taka formatting (South-Asian grouping)', () => {
  it('groups last-three-then-twos', () => {
    expect(groupSouthAsian('1000000')).toBe('10,00,000');
    expect(groupSouthAsian('12345678')).toBe('1,23,45,678');
    expect(groupSouthAsian('100')).toBe('100');
  });
  it('formats taka the way BD accountants expect', () => {
    expect(formatTaka(1000000)).toBe('৳১০,০০,০০০'); // ten lakh, NOT 1,000,000
    expect(formatTaka(1000000, { symbol: false })).toBe('১০,০০,০০০');
    expect(formatTaka(1234.5, { decimals: 2 })).toBe('৳১,২৩৪.৫০');
    expect(formatTaka(-5000)).toBe('-৳৫,০০০');
  });
  it('formats Indian Rupee (₹) for the India audience with the same grouping', () => {
    expect(formatRupee(1000000)).toBe('₹১০,০০,০০০');
    expect(formatRupee(2500, { numerals: 'ascii' })).toBe('₹2,500');
    expect(formatRupee(1000000, { words: true })).toBe('দশ লক্ষ টাকা');
  });
  it('spells amounts in Bengali words with the Indian scale', () => {
    expect(formatTaka(1000000, { words: true })).toBe('দশ লক্ষ টাকা');
    expect(takaInWords(0)).toBe('শূন্য');
    expect(takaInWords(21)).toBe('একুশ');
    expect(takaInWords(1500)).toBe('এক হাজার পাঁচ শত');
    expect(takaInWords(12345678)).toBe('এক কোটি তেইশ লক্ষ পঁয়তাল্লিশ হাজার ছয় শত আটাত্তর');
  });
});

describe('bangla calendar (revised Bangladesh)', () => {
  it('puts Pohela Boishakh on 14 April', () => {
    expect(formatBanglaDate(new Date('2024-04-14'))).toBe('১ বৈশাখ ১৪৩১');
    expect(formatBanglaDate(new Date('2025-04-14'))).toBe('১ বৈশাখ ১৪৩২');
  });
  it('computes a mid-year date correctly', () => {
    // 15 Jul 2026 → 31 Asharh 1433.
    expect(formatBanglaDate(new Date('2026-07-15'))).toBe('৩১ আষাঢ় ১৪৩৩');
  });
  it('rolls the Bangla year back before 14 April', () => {
    const bd = toBanglaDate(new Date('2025-04-13'));
    expect(bd.year).toBe(1431);
    expect(bd.monthName).toBe('চৈত্র');
  });
});
