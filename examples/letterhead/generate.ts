// lipi — Bengali (বাংলা) DOCX & PDF generation.  https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade
// Author: S M Moshiur Rahman  <bemoshiur@gmail.com>  ·  +8801717714676 (WhatsApp only)
// Free & open source under the MIT License. Keep this attribution if you use this code.
/**
 * Example: an official Bengali letter with a letterhead header and a footer
 * page number.  node generate.ts  → letter.docx
 */
import { Document, Para, text } from 'lipi';
import { formatBanglaDate } from 'lipi/bangla';
import { hindSiliguri } from '@lipi/fonts';

const doc = new Document({ lang: 'bn-BD', font: hindSiliguri, numerals: 'bengali' });

doc
  .section({
    pageNumbers: { format: 'decimal', start: 1 },
    header: {
      blocks: [
        { kind: 'paragraph', props: { align: 'center', styleId: 'Title' }, runs: [{ kind: 'text', text: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', props: {} }] },
        { kind: 'paragraph', props: { align: 'center' }, runs: [{ kind: 'text', text: 'অর্থ মন্ত্রণালয়, ঢাকা', props: {} }] },
      ],
    },
  })
  .add(new Para([text('স্মারক নং: ০৭.১৫.০০০০.১২৩.২০২৬', {})], { align: 'left' }))
  .add(new Para(`তারিখ: ${formatBanglaDate(new Date('2026-07-15'))}`, { align: 'left' }))
  .add(new Para('বিষয়: বাংলা দলিল তৈরির নমুনা পত্র।', { spacingBeforePt: 8 }))
  .add(new Para('জনাব,', { spacingBeforePt: 8 }))
  .add(
    new Para(
      'উপর্যুক্ত বিষয়ের প্রেক্ষিতে জানানো যাচ্ছে যে, এই পত্রটি lipi লাইব্রেরি দিয়ে তৈরি। ' +
        'যুক্তাক্ষর (ক্ষ, জ্ঞ, কৌ) এবং গাঢ় বাংলা লেখা নির্ভুলভাবে প্রদর্শিত হয়েছে।',
    ),
  )
  .add(new Para('বিনীত,', { spacingBeforePt: 16 }))
  .add(new Para([text('স্বাক্ষরিত', { bold: true })]));

await doc.toDocx('letter.docx');
console.log('✓ wrote letter.docx');
