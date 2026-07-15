# JOURNEY.md

Append after every session: what shipped, what broke, what was decided and why.
Future-you will want to undo the font-slot and TOC-numbering decisions and will
be wrong — so they're logged with reasons.

---

## 2026-07-15 (latest) — GitHub Packages, release, mega README + screenshot

### Shipped
- **Published to GitHub Packages.** Renamed `lipi` → `@bemoshiur/lipi` and
  `@lipi/fonts` → `@bemoshiur/lipi-fonts` (GitHub Packages requires the @owner
  scope; `lipi` is taken on public npm). Updated all imports/deps/examples/docs.
  `.github/workflows/publish.yml` publishes both via the Actions `GITHUB_TOKEN`
  (no personal token). Confirmed: `+ @bemoshiur/lipi@0.1.0` to npm.pkg.github.com.
- **v0.1.0 GitHub Release** with installable tarballs (bemoshiur-lipi-*.tgz).
- **Repo metadata**: description, homepage, 18 topics. Clean MIT `LICENSE` so
  GitHub detects the licence; `NOTICE` for the OFL fonts.
- **Real conjunct screenshot** (`docs/screenshot-showcase.png`) via
  `scripts/gen-showcase.mjs` + Playwright — a browser render (HarfBuzz, same
  class as Word) of every conjunct case + a sample govt doc, bundled font
  embedded as base64. Split matras কৌ/কো, reph র্ক, four-part ক্ষ্ম all correct.
- **Mega README**: hero screenshot, in-depth features, architecture,
  font-embedding + static-TOC deep dives, API reference tables, verification
  matrix.

### Fixed / caught
- `pnpm/action-setup` failed on both workflows: `version:` conflicted with the
  `packageManager` field → removed `version:`.
- Root `build`/`typecheck` scripts used a broken `--filter ./packages/**` →
  switched to `pnpm -r --if-present` (fonts builds before lipi topologically).
- `file://` is blocked in Playwright → served the showcase over a local HTTP
  server to screenshot it.

### Decisions
- GitHub Packages over public npm (owner's choice). Note: even public GitHub
  Packages require auth to install — documented; the release tarballs are the
  no-auth path. PUBLISHING.md covers both + how to switch to public npm later.

---

## 2026-07-15 (later) — open source, India, and language ports

### Shipped
- **Explicit MIT licensing.** Added `LICENSE` (repo), `packages/lipi/LICENSE`,
  `packages/fonts/LICENSE` (MIT AND OFL-1.1). README/BN say plainly: free
  forever, commercial use OK. `@lipi/fonts` license field → `(MIT AND OFL-1.1)`.
- **India, not just Bangladesh.** Added `formatRupee` (₹) beside `formatTaka`
  (৳), sharing the South-Asian grouping. Framed docs for `bn-BD` + `bn-IN`.
  33 tests (added a Rupee case).
- **Language ports** (`ports/`): `.odttf` obfuscation + numerals/currency in
  **Python, Ruby, PHP, C#, Java, Go**. Python/Ruby/PHP/C# verified locally —
  each proves the odttf roundtrip is byte-identical against the bundled font,
  cross-validating the GUID-reverse byte order. Java/Go written to the same
  logic (no JRE/Go here to run them).
- **Author attribution header** on every source file (46 files) via
  `scripts/add-author-header.mjs` (idempotent; preserves shebang / `<?php`):
  S M Moshiur Rahman <bemoshiur@gmail.com>, +8801717714676 (WhatsApp).
- `CONTRIBUTING.md`; ports README; gitignore for `bin/`/`obj/`/`*.class`.

### Decisions
- **Ports cover primitives, not the whole writer.** The OOXML document
  generation stays TS-first; a full port is weeks per language. The two ported
  primitives (font embedding + numerals/currency) are the most reused and are
  small enough to port faithfully and test. Roadmap item in CONTRIBUTING.
- **No `Co-Authored-By: Claude` on commits** (owner's request — attribution is
  the author's). The initial commit already carried the trailer; not rewritten
  because that needs a force-push (declined). New commits omit it.
- **Rupee words stay "টাকা".** In West Bengal Bengali the rupee is colloquially
  "টাকা"; `currencyWord` opt overrides if needed.

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
