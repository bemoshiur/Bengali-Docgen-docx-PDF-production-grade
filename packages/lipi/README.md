# lipi

Correct Bengali (বাংলা) DOCX & PDF generation from Node.js — conjuncts, embedded
fonts, and page-accurate TOCs, all at once.

```bash
pnpm add lipi @lipi/fonts
```

```ts
import { Document, Heading, Para, TOC } from 'lipi';
import { hindSiliguri } from '@lipi/fonts';

const doc = new Document({ lang: 'bn-BD', font: hindSiliguri, numerals: 'bengali' });
doc.section({ pageNumbers: { format: 'lowerRoman', start: 1 } }).add(new TOC());
doc.section({ pageNumbers: { format: 'decimal', start: 1 } })
   .add(new Heading(1, 'প্রকল্পের পটভূমি'))
   .add(new Para('গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের...'));
await doc.toDocx('out.docx');
await doc.toPdf('out.pdf');   // needs LibreOffice on PATH
```

Why this is hard and how it's solved (the three complex-script bugs, font
embedding, static TOC): see the [repo README](https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade).

`@lipi/fonts` is an **optional** peer — bring your own font with
`registerFont({ name, regular, bold, italic, boldItalic })`. PDF output needs
LibreOffice (`soffice`); `toDocx` does not.

MIT licensed.
