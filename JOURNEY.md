# JOURNEY.md

Append after every session: what shipped, what broke, what was decided and why.
Future-you will want to undo the font-slot and TOC-numbering decisions and will
be wrong — so they're logged with reasons.

---

## 2026-07-15 — M1–M7 core, verified locally

### Shipped
- **odttf spike first (§15).** `fonts/obfuscate.ts` implements ECMA-376 §17.8.1
  XOR obfuscation. Proven: roundtrip is byte-identical, first 32 bytes really
  scramble, sfnt magic restores. `pnpm spike` green.
- **OS/2 parser (§5.3).** `fonts/os2.ts` reads the real `ulUnicodeRange1..4` /
  `ulCodePageRange1..2` → `w:sig`, plus PANOSE and name-table family/weight.
  All three bundled fonts declare Bengali (usb0 bit 16): Noto `A001806F`,
  Hind `00010007`, Tiro `00018003`.
- **DOCX writer (M2).** Hand-written OOXML. Verified in generated output:
  `w:ascii` count == `w:cs` count, `w:sz` == `w:szCs`, `w:b` == `w:bCs`,
  `w:i` == `w:iCs`. Zero TOC fields.
- **Font embedding (M3).** `fontTable.xml` + `.odttf` parts + rels + content
  type + `w:embedTrueTypeFonts`. The packaged `word/fonts/font1.odttf`
  deobfuscates **byte-for-byte** back to `NotoSansBengali-Regular.ttf`. This is
  the milestone that makes the project worth existing.
- **Bangla utils.** Numerals, `formatTaka` (South-Asian lakh/crore grouping),
  `takaInWords` (full 0–99 table + Indian scale), revised-BD Bangabda dates.
- **Tables + BoQ (M5)**, **static TOC (M6)** with section-restart numbering,
  dot leaders, bookmarks, markers.
- **PDF adapter (M7).** `pdf/libreoffice.ts` — concurrency-safe (unique
  `-env:UserInstallation` per call), timeout-kills soffice, clear "not found"
  error. `pdfjs-dist` (optional) for marker→page extraction.
- **CLI**: `lipi demo`, `lipi licenses`. **32 tests green.**

### Decisions (log the ones future-you will second-guess)

- **Direct-format every run** instead of leaning only on `docDefaults`.
  `ooxml/document.ts` emits full `w:rPr` (rFonts+cs, sz+szCs, lang bidi) on every
  text run, sourcing the size from the paragraph style via `styleMetrics.ts`.
  Why: the spec says "set on every run"; direct formatting is bulletproof against
  the CS-slot fallback. `styleMetrics.ts` is the single source of truth so
  headings don't get clobbered with the body size.
- **Footer page numbers use a live `PAGE` field (ASCII digits); TOC page numbers
  are Bengali.** (§6 explicitly permits "accept ASCII digits in the footer and
  document it".) `PAGE`/`NUMPAGES` recompute on headless PDF export, unlike the
  TOC field, so they're safe. Bengali digits in the footer would need static
  per-page footers or a numeral-format the field doesn't reliably honour.
  Revisit in v2 if customers ask.
- **TOC numbering via two independent sections** (front matter lowerRoman,
  body decimal, both `w:start="1"`). TOC length therefore can't shift body page
  numbers. Pass 1 renders **body-only** so a marker's physical PDF page == its
  body page number; pass 2 adds front matter + TOC. Deterministic, one extra
  render, no fixed-point loop.
- **Focused vendored schema** `tests/schemas/wml-lipi.xsd` instead of the full
  ISO set. The ECMA transitional zip and every GitHub mirror I tried were
  offline. The focused schema models exactly the two ordered content models the
  spec cares about (`CT_RPr`, `CT_Font`) and validated in one xmllint pass over
  extracted fragments. Drop the full `wml.xsd` into `tests/schemas/` to
  supersede it. It already earned its keep — it caught a real bug (marker `rPr`
  emitted `color` after `szCs`; canonical order is `color` before `sz`).

### What broke / caught
- fflate rejects `mtime: 0` (DOS zip dates must be ≥1980) → fixed epoch 2000-01-01.
- Marker `rPr` element order bug — caught by the schema validator, fixed.
- Running library `.ts` source directly under node fails on `.js` import
  specifiers (node type-stripping doesn't rewrite them). Tests run via vitest
  (vite resolves `.js`→`.ts`); the standalone validator uses built `dist`.

### Not done locally (needs LibreOffice / MS Word — CI/manual gates)
- **M4 visual regression** (docx→pdf→png→pixelmatch). Code + Docker wired;
  `soffice` isn't on this macOS box, so baselines must be generated in
  `Dockerfile.test`. **Golden XML/invariants passing means nothing about whether
  ৌ and র্ক actually render — that gate is still open until visual runs green.**
- **Manual Word gate (§5.2):** open `demo.docx` in MS Word on a machine with no
  Bengali font installed and confirm no repair dialog + correct conjuncts. The
  odttf byte-order matches the widely-used reference implementation and roundtrips
  perfectly, so this is expected to pass, but it is unverified by a human here.
