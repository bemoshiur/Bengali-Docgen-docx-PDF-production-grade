/**
 * Example: a real Terms-of-Reference (ToR) document with front matter, a static
 * TOC, multiple sections, a staffing table and a BoQ — the shape of an actual
 * Bangladesh government / NGO procurement document.
 *
 *   node generate.ts            # writes tor.docx (+ tor.pdf if LibreOffice present)
 */
import { Document, Heading, Para, Table, Boq, TOC, PageBreak, text } from 'lipi';
import { formatBanglaDate, formatTaka } from 'lipi/bangla';
import { notoSansBengali } from '@lipi/fonts';

const doc = new Document({
  lang: 'bn-BD',
  font: notoSansBengali,
  numerals: 'bengali',
  margins: { top: 25, right: 25, bottom: 25, left: 30 },
});

// Front matter + TOC (roman numerals).
doc
  .section({ pageNumbers: { format: 'lowerRoman', start: 1 } })
  .add(new Para('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', { styleId: 'Title' }))
  .add(new Para([text('কর্মপরিধি (Terms of Reference)', { bold: true })], { align: 'center' }))
  .add(new Para(formatBanglaDate(new Date('2026-07-15')), { align: 'center' }))
  .add(new PageBreak())
  .add(new TOC({ levels: [1, 3], title: 'সূচিপত্র' }));

// Body (decimal numerals, restarts at 1).
const body = doc.section({ pageNumbers: { format: 'decimal', start: 1 } });

const sections: Array<[string, string[]]> = [
  ['পটভূমি', ['এই কর্মপরিধিটি প্রকল্পের সার্বিক লক্ষ্য ও উদ্দেশ্য বর্ণনা করে। যুক্তাক্ষর যেমন ক্ষ, জ্ঞ, স্ত্র নির্ভুলভাবে প্রদর্শিত হয়।']],
  ['উদ্দেশ্য', ['প্রকল্পের মূল উদ্দেশ্য নিম্নরূপ নির্ধারিত হয়েছে।']],
  ['কর্মপরিধি', ['পরামর্শক প্রতিষ্ঠানের দায়িত্ব ও কর্তব্য এই অংশে বিস্তারিত বর্ণিত।']],
  ['প্রতিবেদন দাখিল', ['নির্দিষ্ট সময়সূচি অনুযায়ী প্রতিবেদন দাখিল করতে হবে।']],
];
for (const [title, paras] of sections) {
  body.add(new Heading(1, title));
  for (const p of paras) body.add(new Para(p));
  body.add(new Heading(2, 'বিস্তারিত'));
  body.add(new Para('উপরোক্ত অংশের বিস্তারিত ব্যাখ্যা এখানে সংযোজিত।'));
}

body.add(new Heading(1, 'জনবল কাঠামো'));
body.add(
  Table.from(
    [
      ['পদবি', 'সংখ্যা', 'মাসিক সম্মানী'],
      ['দলনেতা', '১', formatTaka(200000)],
      ['সিনিয়র বিশেষজ্ঞ', '২', formatTaka(150000)],
      ['গবেষণা সহকারী', '৩', formatTaka(60000)],
    ],
    { header: true, widths: ['50%', '20%', '30%'] },
  ),
);

body.add(new Heading(1, 'ব্যয় প্রাক্কলন'));
body.add(
  new Boq([
    { item: 'পরামর্শক সেবা', unit: 'জনমাস', qty: 24, rate: 150000 },
    { item: 'ভ্রমণ ও পরিবহন', unit: 'লট', qty: 1, rate: 500000 },
    { item: 'প্রতিবেদন মুদ্রণ', unit: 'কপি', qty: 200, rate: 1500 },
  ]),
);

await doc.toDocx('tor.docx');
console.log('✓ wrote tor.docx');
try {
  await doc.toPdf('tor.pdf');
  console.log('✓ wrote tor.pdf');
} catch (e) {
  console.log('• skipped PDF:', e instanceof Error ? e.message.split('\n')[0] : e);
}
