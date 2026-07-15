# lipi — Node.js থেকে নির্ভুল বাংলা DOCX ও PDF

[![CI](https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade/actions/workflows/ci.yml/badge.svg)](https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade/actions/workflows/ci.yml)
![যুক্তাক্ষর](https://img.shields.io/badge/%E0%A6%AF%E0%A7%81%E0%A6%95%E0%A7%8D%E0%A6%A4%E0%A6%BE%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0-28-informational)
![license](https://img.shields.io/badge/license-MIT-blue)

> **[Read in English → README.md](./README.md)**

যে লাইব্রেরিটি এতদিন ছিল না: **Node.js থেকে নির্ভুল বাংলা DOCX ও PDF তৈরি** —
যুক্তাক্ষর, ফন্ট এমবেডিং এবং পৃষ্ঠা-সঠিক সূচিপত্র (TOC), একসাথে সব। ফাইলটি MS
Word, LibreOffice ও Pages-এ সঠিকভাবে খোলে — **কম্পিউটারে কোনো বাংলা ফন্ট ইনস্টল
না থাকলেও**, কারণ ফন্ট ফাইলের ভেতরেই এমবেড করা থাকে।

বাংলা লিপি বাংলাদেশ + পশ্চিমবঙ্গ + আসাম + ত্রিপুরা জুড়ে প্রায় ২৭ কোটি মানুষের।
প্রতিটি সরকারি দপ্তর, এনজিও ও প্রতিষ্ঠান রিপোর্ট তৈরি করতে গিয়ে একই দেয়ালে ধাক্কা
খায়। `lipi` সেই দেয়াল ভেঙে দেয়।

## দ্রুত শুরু

```bash
pnpm add lipi @lipi/fonts
```

```ts
import { Document, Heading, Para, Table, TOC } from 'lipi';
import { hindSiliguri } from '@lipi/fonts';

const doc = new Document({
  lang: 'bn-BD',
  font: hindSiliguri,        // স্বয়ংক্রিয়ভাবে এমবেড হয়
  numerals: 'bengali',       // সূচিপত্র, টেবিল, পৃষ্ঠায় ০১২
  margins: { top: 25, right: 25, bottom: 25, left: 30 }, // মিমি
});

doc.section({ pageNumbers: { format: 'lowerRoman', start: 1 } })
   .add(new TOC({ levels: [1, 3], title: 'সূচিপত্র' }));

doc.section({ pageNumbers: { format: 'decimal', start: 1 } })
   .add(new Heading(1, 'প্রকল্পের পটভূমি'))
   .add(new Para('গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের...'))
   .add(Table.from(rows, { header: true, widths: ['40%', '30%', '30%'] }));

await doc.toDocx('out.docx');
await doc.toPdf('out.pdf');    // LibreOffice (soffice) প্রয়োজন
```

কোড না লিখেই ডেমো দেখতে:

```bash
npx lipi demo ./out    # out/demo.docx তৈরি করে (LibreOffice থাকলে demo.pdf-ও)
```

## এটি কঠিন কেন? (যে তিনটি বাগে সবাই আটকায়)

বাংলা একটি **জটিল লিপি (complex script)**। সমস্যা সবসময় একই তিনটি:

1. **`w:cs` ছাড়া `w:rFonts`।** Word/LibreOffice জটিল-লিপির লেখা আলাদা *complex-script
   ফন্ট স্লটে* পাঠায়। কেবল `w:ascii`/`w:hAnsi` দিলে বাংলা নীরবে Times/Arial-এ পড়ে যায়
   → টোফু। `lipi` প্রতিটি রান-এ এবং ডকুমেন্ট ডিফল্টে `w:cs` (ও মিলিয়ে `w:szCs`) দেয়।
2. **বোল্ড/ইটালিকের জন্য `w:bCs`/`w:iCs` লাগে।** `<w:b/>` শুধু ASCII স্লট বোল্ড করে।
   `lipi` সবসময় complex-script যমজটিও দেয়, তাই বাংলা বোল্ড আসলেই বোল্ড হয়।
3. **`TOC` ফিল্ড headless অবস্থায় আপডেট হয় না।** LibreOffice দিয়ে রূপান্তর করলে
   সূচিপত্র ফাঁকা আসে। `lipi` **স্থির, পূর্ব-গণনাকৃত** সূচিপত্র লেখে — আসল, ক্লিকযোগ্য
   পৃষ্ঠা নম্বর সহ।

## যা এটিকে কাজ করায়

- **ফন্ট এমবেডিং (মূল রত্ন)।** ECMA-376 §17.8.1 অনুযায়ী ফন্ট obfuscated `.odttf`
  হিসেবে এমবেড হয়, ফন্টের **প্রকৃত** `OS/2` ইউনিকোড স্বাক্ষর পার্স করে (বাংলা =
  `ulUnicodeRange1` bit 16)। প্রমাণিত: এমবেডকৃত `.odttf` বাইট-বাই-বাইট মূল TTF-এ ফিরে যায়।
- **শেপিং নিজে করা হয় না** — Word (DirectWrite/CoreText) ও LibreOffice (HarfBuzz)-এর
  পরীক্ষিত Indic শেপারকেই কাজে লাগানো হয়।
- **বাংলা ইউটিলিটি**: `toBengaliNumerals`, `formatTaka` (লক্ষ/কোটি গ্রুপিং —
  `৳১০,০০,০০০`), টাকার কথায় রূপান্তর, এবং সংশোধিত বাংলাদেশ বঙ্গাব্দ তারিখ।
- **BoQ সহায়ক** — item/unit/qty/rate/amount টেবিল, স্বয়ংক্রিয় মোট সহ।

## পরীক্ষাই পণ্য

আর কেউ **বাংলার জন্য ভিজ্যুয়াল রিগ্রেশন টেস্ট** দেয় না; `lipi` দেয়:

```text
docx → soffice → pdf → pdftoppm → pixelmatch vs baseline   (pnpm test:visual)
```

শুধু XML মিলে গেলেই `ৌ` আর `র্ক` ঠিকমতো রেন্ডার হচ্ছে তা প্রমাণ হয় না — কেবল ভিজ্যুয়াল
টেস্টই তা প্রমাণ করে।

## ফন্ট ও লাইসেন্স

`@lipi/fonts` কেবল **OFL-1.1** ফন্ট বান্ডল করে — Noto Sans Bengali (ডিফল্ট), Hind
Siliguri, Tiro Bangla — প্রতিটির হুবহু লাইসেন্স সহ। `lipi licenses` চালিয়ে দেখুন।
v1-এ ফন্ট subset করা হয় না (naive subset যুক্তাক্ষর ফেলে দেয়)।

## লাইসেন্স

`lipi`-এর জন্য MIT; `@lipi/fonts`-এর বান্ডল করা ফন্টের জন্য OFL-1.1।
