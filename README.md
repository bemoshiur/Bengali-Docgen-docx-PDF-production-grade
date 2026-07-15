# lipi — correct Bengali (বাংলা) DOCX & PDF from Node.js

[![CI](https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade/actions/workflows/ci.yml/badge.svg)](https://github.com/bemoshiur/Bengali-Docgen-docx-PDF-production-grade/actions/workflows/ci.yml)
![conjunct cases](https://img.shields.io/badge/conjunct%20cases-28-informational)
![node](https://img.shields.io/badge/node-%E2%89%A518-informational)
![license](https://img.shields.io/badge/license-MIT-blue)

> **[বাংলায় পড়ুন → README.bn.md](./README.bn.md)**

The library that did not exist: **correct Bengali DOCX and PDF generation from
Node.js** — conjuncts, embedded fonts, and page-accurate TOCs, all at once. It
opens correctly in MS Word, LibreOffice and Pages **with no Bengali font
installed on the machine**, because the font travels inside the file.

**Built for Bangladesh 🇧🇩 and India 🇮🇳.** Bengali is the language of ~270M
people — Bangladesh plus West Bengal, Assam and Tripura in India. Every
government office, NGO and enterprise there generates reports and hits the same
wall. `lipi` is the wall coming down. It speaks both `bn-BD` and `bn-IN`, and
formats both **Taka (৳)** and **Rupee (₹)** with correct lakh/crore grouping.

> **Free and open source (MIT). Download it, use it, ship it — commercially or
> not — free, forever.** No license fees, no lock-in. See [LICENSE](./LICENSE).

<table>
<tr><th>❌ typical <code>docx</code>/<code>pdfmake</code> output</th><th>✅ lipi</th></tr>
<tr>
<td>Bengali routed to the default font → tofu / broken conjuncts. Bold doesn't
apply. Fonts not embedded, so it only works on <em>your</em> machine. TOC empty
when generated headlessly.</td>
<td><code>ক্ষ</code> <code>জ্ঞ</code> <code>কৌ</code> <code>র্ক</code> render
correctly everywhere; bold Bengali is bold; the font is embedded; the TOC has
real page numbers.</td>
</tr>
</table>

<sub>Regenerate the side-by-side proof image with `scripts/comparison.ts` inside `Dockerfile.test` (needs LibreOffice).</sub>

## Quickstart

```bash
pnpm add lipi @lipi/fonts   # @lipi/fonts is an optional peer (OFL fonts)
```

```ts
import { Document, Heading, Para, Table, TOC } from 'lipi';
import { hindSiliguri } from '@lipi/fonts';

const doc = new Document({
  lang: 'bn-BD',
  font: hindSiliguri,        // embedded automatically
  numerals: 'bengali',       // ০১২ in TOC, tables, page refs
  margins: { top: 25, right: 25, bottom: 25, left: 30 }, // mm
});

doc.section({ pageNumbers: { format: 'lowerRoman', start: 1 } })
   .add(new TOC({ levels: [1, 3], title: 'সূচিপত্র' }));

doc.section({ pageNumbers: { format: 'decimal', start: 1 } })
   .add(new Heading(1, 'প্রকল্পের পটভূমি'))
   .add(new Para('গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের...'))
   .add(Table.from(rows, { header: true, widths: ['40%', '30%', '30%'] }));

await doc.toDocx('out.docx');
await doc.toPdf('out.pdf');    // requires LibreOffice (soffice) on PATH
```

Or try the demo without writing any code:

```bash
npx lipi demo ./out    # writes out/demo.docx (+ demo.pdf if LibreOffice is installed)
```

## Why is this hard? (the three bugs everyone hits)

Bengali is a **complex script**. The failures are always the same three:

1. **`w:rFonts` without `w:cs`.** Word/LibreOffice route complex-script text to a
   separate *complex-script font slot*. Set only `w:ascii`/`w:hAnsi` and Bengali
   silently falls back to Times/Arial → tofu. `lipi` sets `w:cs` (and the
   matching `w:szCs`) on **every run** and in the document defaults.
2. **Bold/italic need `w:bCs`/`w:iCs`.** `<w:b/>` bolds only the ASCII slot.
   `lipi` always emits the complex-script twin, so Bengali bold actually bolds.
3. **The `TOC` field never updates headlessly.** Convert with LibreOffice and
   you get an empty TOC. `lipi` writes a **static, pre-computed** TOC with real,
   clickable page numbers — the only correct answer for CI pipelines.

Full write-up in [BUILD_PROMPT.md](./BUILD_PROMPT.md) §2 and [CLAUDE.md](./CLAUDE.md).

## What makes it work

- **Font embedding (the crown jewel).** Fonts are embedded as obfuscated
  `.odttf` per ECMA-376 §17.8.1, with the **real** `OS/2` Unicode signature
  parsed from the font (Bengali = `ulUnicodeRange1` bit 16 — declare it wrong and
  Word falls back anyway). Verified: the packaged `.odttf` deobfuscates
  byte-for-byte back to the original TTF.
- **Shaping is delegated, not reimplemented.** Word (DirectWrite/CoreText) and
  LibreOffice (HarfBuzz) already have battle-tested Indic shapers. `lipi` hands
  them a correct file; it does not attempt reph reordering or split matras in JS.
- **Bengali utilities**: `toBengaliNumerals`, `formatTaka` (lakh/crore grouping —
  `৳১০,০০,০০০`, not `1,000,000`), amount-in-words, and revised-Bangladesh
  Bangabda dates.
- **BoQ helper** — the item/unit/qty/rate/amount table with an auto-total that
  every Bengali proposal needs.

## API

```ts
import { toBengaliNumerals, formatTaka, formatRupee } from 'lipi/bangla';

toBengaliNumerals(1234567)             // "১২৩৪৫৬৭"
formatTaka(1000000)                    // "৳১০,০০,০০০"   (Bangladesh)
formatRupee(1000000)                   // "₹১০,০০,০০০"   (India)
formatTaka(1000000, { words: true })   // "দশ লক্ষ টাকা"
```

- `new Document(opts)` → `.section(props)` → `.add(block)` (chainable)
- Blocks: `Heading`, `Para`, `Table.from(rows, opts)`, `Boq(items)`, `TOC`, `PageBreak`
- `registerFont({ name, regular, bold, italic, boldItalic })` for your own licensed fonts
- `await doc.toDocx(path)` / `await doc.toPdf(path)`

## Tests are the product

Nobody else ships **visual regression tests for Bengali**. `lipi` does:

```text
docx → soffice → pdf → pdftoppm → pixelmatch vs baseline   (pnpm test:visual)
```

Golden XML passing means nothing about whether `ৌ` and `র্ক` actually render —
only the visual test proves that. Unit tests also assert the three bugs are
fixed in every output and validate `w:rPr`/`w:font` element ordering against a
WordprocessingML schema with `xmllint`.

```bash
pnpm test          # unit + OOXML invariants + schema validation
pnpm test:visual   # Docker + LibreOffice + pixel baselines
```

## Fonts & licensing

`@lipi/fonts` bundles **OFL-1.1 only** — Noto Sans Bengali (default), Hind
Siliguri, Tiro Bangla — each with its verbatim licence. Run `lipi licenses` to
print them. v1 does **not** subset fonts (a naive subset drops conjuncts); full
fonts are embedded, ~100–250 KB per weight.

## Language ports

The full document writer is TypeScript-first, but the two most reusable
primitives — **`.odttf` font embedding** and **Bengali numerals/currency** — are
ported to other languages in [`ports/`](./ports): **Python, Ruby, PHP, C#, Java,
Go**. Each is a single self-testing file that proves the `.odttf` roundtrip is
byte-identical. Use them to embed a Bengali font from your own stack today.

## Non-goals (v1)

Reading/editing existing `.docx`, templating DSLs, charts/shapes, Bijoy/SutonnyMJ
conversion, browser builds, font subsetting. Library only — no web service.

## Contributing

Contributions are welcome — bug reports, conjunct fixtures, and especially fuller
language ports. Read [CLAUDE.md](./CLAUDE.md) for the three complex-script rules
before touching the OOXML writer, and append a note to [JOURNEY.md](./JOURNEY.md).

## License

**Free and open source, forever.**

- `lipi` and all language ports — **MIT** ([LICENSE](./LICENSE)). Use, modify,
  distribute and sell freely, including commercially. Just keep the copyright
  notice.
- Bundled fonts in `@lipi/fonts` — **SIL OFL-1.1** (also free/libre); each
  font's licence travels with it and is printed by `lipi licenses`.

Author: **S M Moshiur Rahman** · bemoshiur@gmail.com
