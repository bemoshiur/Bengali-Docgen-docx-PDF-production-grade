// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * The demo document — the §0 success test. Exercises conjuncts, headings, a
 * two-section TOC, a data table, and a BoQ, all in embedded Bengali.
 * Reused by `lipi demo` and the examples.
 */
import { Document, Heading, Para, Table, Boq, TOC, PageBreak, text } from '../index.js';
import { formatBanglaDate } from '../bangla/date.js';
import type { FontInput } from '../fonts/register.js';

/** The two conjuncts that, if correct, prove almost everything else works (§9.1). */
const SMOKE = 'ক্ষ  জ্ঞ  স্ত্র  র্ক  কৌ  কো  মুহাম্মদ';

export function buildDemoDocument(font: FontInput): Document {
  const doc = new Document({
    lang: 'bn-BD',
    font,
    numerals: 'bengali',
    margins: { top: 25, right: 25, bottom: 25, left: 30 },
  });

  // Front matter (roman numerals) with the TOC.
  doc
    .section({ pageNumbers: { format: 'lowerRoman', start: 1 } })
    .add(new Para('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', { styleId: 'Title' }))
    .add(new Para([text('প্রকল্প প্রস্তাবনা — নমুনা দলিল', { bold: true })], { align: 'center' }))
    .add(new Para(formatBanglaDate(new Date('2026-07-15')), { align: 'center' }))
    .add(new PageBreak())
    .add(new TOC({ levels: [1, 3], title: 'সূচিপত্র' }));

  // Body (decimal numerals, restarts at 1).
  const body = doc.section({ pageNumbers: { format: 'decimal', start: 1 } });

  body
    .add(new Heading(1, 'প্রকল্পের পটভূমি'))
    .add(
      new Para(
        'গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের অর্থ মন্ত্রণালয়ের অধীনে এই প্রকল্পটি বাস্তবায়িত হবে। ' +
          'নিচের অনুচ্ছেদে যুক্তাক্ষর নির্ভুলভাবে প্রদর্শিত হয়েছে।',
      ),
    )
    .add(new Heading(2, 'যুক্তাক্ষর পরীক্ষা'))
    .add(new Para(SMOKE))
    .add(
      new Para([
        text('গাঢ় বাংলা: '),
        text('এই লেখাটি গাঢ়', { bold: true }),
        text('  এবং বাঁকা: '),
        text('এই লেখাটি বাঁকা', { italic: true }),
      ]),
    );

  body
    .add(new Heading(1, 'জনবল বিবরণী'))
    .add(
      Table.from(
        [
          ['পদবি', 'সংখ্যা', 'মাসিক বেতন'],
          ['প্রকল্প পরিচালক', '১', '৳১,২০,০০০'],
          ['উপ-পরিচালক', '২', '৳৯০,০০০'],
          ['হিসাবরক্ষক', '১', '৳৪৫,০০০'],
        ],
        { header: true, widths: ['50%', '20%', '30%'] },
      ),
    );

  body
    .add(new Heading(1, 'ব্যয় প্রাক্কলন (BoQ)'))
    .add(
      new Boq([
        { item: 'অফিস আসবাবপত্র', unit: 'সেট', qty: 5, rate: 45000 },
        { item: 'কম্পিউটার ও প্রিন্টার', unit: 'সেট', qty: 8, rate: 85000 },
        { item: 'নেটওয়ার্ক সরঞ্জাম', unit: 'লট', qty: 1, rate: 250000 },
      ]),
    )
    .add(new Heading(2, 'উপসংহার'))
    .add(new Para('এই দলিলটি lipi লাইব্রেরি দিয়ে তৈরি — ফন্ট এমবেড করা, তাই কোনো বাংলা ফন্ট ইনস্টল ছাড়াই সঠিকভাবে খোলে।'));

  return doc;
}
