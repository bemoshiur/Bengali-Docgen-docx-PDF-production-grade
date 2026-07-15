# CLAUDE.md — working agreement for `lipi`

Read this before touching `packages/lipi/src/ooxml/` or `fonts/`. The whole
product is getting three things right; everything else is plumbing.

## The three bugs everyone hits (BUILD_PROMPT.md §2 — verbatim intent)

1. **`w:rFonts` without `w:cs`.** Bengali is a complex script; Word/LibreOffice
   route it to the *complex-script font slot*. Every run's `w:rFonts` must set
   `w:ascii`, `w:hAnsi` **and** `w:cs`, and every `w:sz` must have a matching
   `w:szCs`. Set it on every run **and** in `w:docDefaults`. Never rely on theme
   fonts. → `ooxml/runProps.ts`, `ooxml/styles.ts`.
2. **Bold/italic need `w:bCs`/`w:iCs`.** `<w:b/>` only bolds the ASCII slot.
   Emit `<w:b/><w:bCs/>` and `<w:i/><w:iCs/>` together, always. → `runProps.ts`.
3. **The TOC field never updates headlessly.** Never emit `<w:fldSimple w:instr="TOC …"/>`.
   The TOC is **static, pre-computed** paragraphs with a marker→page pass. → `toc.ts`.

## Hard rules

- **Never hardcode `w:sig`. Parse OS/2.** (`fonts/os2.ts` → `readFontInfo`.)
  Bengali is `ulUnicodeRange1` bit 16; if `w:sig` doesn't declare it Word may
  fall back regardless of `w:cs`.
- **Never emit `w:b` without `w:bCs`** (or `w:i` without `w:iCs`).
- **Never use the TOC field.** Static only.
- **Children of `w:rPr`, `w:pPr`, `w:font` are an `xsd:sequence`.** Emit in the
  canonical ECMA-376 order — the emitters already do; keep it that way. Wrong
  order = Word silently repairs the file.
- **Validate against the schema before claiming done.** `pnpm validate:xml` (or
  the `docx.test.ts` schema case) runs `xmllint` against
  `tests/schemas/wml-lipi.xsd`. Drop the full ISO `wml.xsd` into
  `tests/schemas/` to supersede it.
- **Visual test green or it is not done.** Golden XML / invariants passing means
  nothing about whether conjuncts actually render — that needs
  `pnpm test:visual` (Docker + LibreOffice + pixelmatch).
- **Don't subset fonts in v1** (§7). A naive codepoint subset drops conjuncts.

## Commands

```bash
pnpm build           # tsc → dist for both packages (build @lipi/fonts first)
pnpm test            # vitest: odttf roundtrip, bangla utils, OOXML invariants, schema
pnpm test:visual     # docker compose … — conjunct pixel baselines (needs LibreOffice)
pnpm validate:xml    # xmllint well-formedness + rPr/font ordering (needs `pnpm build`)
pnpm spike           # the §15 odttf de-risk spike
node packages/lipi/dist/cli/index.js demo <dir>   # generate demo.docx
```

## Layout

- `packages/lipi/src/model/` — public API (`Document`, `Para`, `Heading`, `Table`, `Boq`, `TOC`).
- `packages/lipi/src/ooxml/` — the OOXML writers. `document.ts` direct-formats every run.
- `packages/lipi/src/fonts/` — `obfuscate.ts` (odttf), `os2.ts` (sig parsing), `register.ts`.
- `packages/lipi/src/bangla/` — numerals, taka, Bangabda date.
- `packages/lipi/src/pdf/libreoffice.ts` — the soffice adapter (optional).
- `packages/fonts/` — `@lipi/fonts`, OFL fonts + licences.

## Every session: append to JOURNEY.md — what shipped, what broke, what was decided.
