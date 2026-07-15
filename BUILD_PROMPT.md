# Build Prompt — `lipi`: production-grade Bengali document generation

Paste this whole file into Claude Code as the opening prompt. Keep it in the repo as `BUILD_PROMPT.md`.

---

## 0. Mission

Build the library that does not exist: **correct Bengali (বাংলা) DOCX and PDF generation from Node.js**.

Every existing option is an example repo, a blog post about hacking `config_fonts.php`, or a micro-package. Nobody has shipped a maintained library that gets conjuncts, font embedding, and page-accurate TOCs right at the same time. That is the entire product.

Audience is not just Bangladesh. Bengali script covers BD + West Bengal + Assam (Assamese) + Tripura, roughly 270M people. Every government office, NGO, and enterprise there needs generated reports and hits the same wall.

**Success test:** a developer runs `npx @lipi/cli demo`, opens the output in MS Word on Windows, LibreOffice on Linux, and Pages on macOS, and every conjunct in `tests/fixtures/conjuncts.txt` renders identically and correctly, with no font installed on their machine.

---

## 1. Non-goals (protect the ship date)

| Not in v1 | Reason |
|---|---|
| Reading/editing existing .docx | Different problem, 3x the surface |
| Templating DSL / Handlebars | Users have their own |
| Charts, SmartArt, shapes | Out of scope forever |
| Bijoy/SutonnyMJ legacy conversion | Separate package later |
| Browser build | Node only, v1 |
| Font subsetting | See §7, dangerous for complex scripts |
| Tracked changes, comments, footnotes | v2 |
| RTL/Arabic/Devanagari | Bengali first, generalize after it works |

Do not build a web service. Library only. Ops burden must stay near zero.

---

## 2. The three bugs everyone hits

This section is the moat. Read it twice. Everything else is plumbing.

### Bug 1 — `w:rFonts` without `w:cs`

Bengali is a **complex script**. Word and LibreOffice route complex-script codepoints to the *complex script font slot*, not the ASCII slot. If you only set `w:ascii` and `w:hAnsi`, Bengali text silently falls back to the default CS font (usually Times/Arial) and you get tofu or broken shaping. This is why 90% of Bengali DOCX output looks wrong.

```xml
<w:rPr>
  <w:rFonts w:ascii="Hind Siliguri" w:hAnsi="Hind Siliguri" w:cs="Hind Siliguri"/>
  <w:sz w:val="22"/>
  <w:szCs w:val="22"/>          <!-- CS size is separate. Omit it and size is wrong. -->
  <w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="bn-BD"/>
</w:rPr>
```

Set `w:cs` and `w:szCs` on **every run**, and in `w:docDefaults/w:rPrDefault` in `styles.xml`. Never rely on theme fonts.

### Bug 2 — bold/italic on Bengali needs `w:bCs` / `w:iCs`

`<w:b/>` applies to the ASCII slot only. Bengali runs need `<w:bCs/>` and `<w:iCs/>`. Emit **both** so mixed BN/EN runs behave:

```xml
<w:rPr>
  <w:b/><w:bCs/>
  <w:i/><w:iCs/>
</w:rPr>
```

This is why people's Bengali bold "doesn't work" and they give up and use images.

### Bug 3 — the TOC field never updates headlessly

`<w:fldSimple w:instr='TOC \o "1-3" \h \z \u'/>` requires Word to run a field update. Generate a DOCX and convert it with LibreOffice headless and you get an empty TOC or "Right-click to update field". Every CI-generated document with a TOC is broken this way.

The fix is a **static, pre-computed TOC**. See §6. This is not a hack, it is the only correct answer for headless pipelines.

---

## 3. Architecture

DOCX is the source of truth. PDF is a downstream conversion.

**Do not try to shape Bengali yourself.** Word (DirectWrite/CoreText) and LibreOffice (HarfBuzz) already have battle-tested Indic shapers. Your job is to hand them a file with the font correctly embedded and the correct script attributes so their shapers fire. Reimplementing reph reordering and split matras in JS is a two-year project and a bug farm.

```
User doc model  →  OOXML writer  →  .docx  →  [LibreOffice adapter]  →  .pdf
                    (pure JS)                    (optional peer dep)
```

**Do not build on top of `docx` (dolanmiu) or `pdfmake`.** `docx` has no font embedding at all. Building on it makes you a plugin with a ceiling, not a library. Write the OOXML directly. The subset you need (paragraphs, runs, tables, sections, headers/footers, images, bookmarks) is tractable.

---

## 4. Package layout

pnpm workspace. Two published packages at v1. Keep it small.

```
lipi/
├── packages/
│   ├── lipi/                    # @lipi/core → published as "lipi"
│   │   ├── src/
│   │   │   ├── model/           # Document, Paragraph, Run, Table, Section
│   │   │   ├── ooxml/
│   │   │   │   ├── document.ts      # word/document.xml
│   │   │   │   ├── styles.ts        # word/styles.xml + docDefaults
│   │   │   │   ├── settings.ts      # word/settings.xml
│   │   │   │   ├── fontTable.ts     # word/fontTable.xml  ← §5
│   │   │   │   ├── numbering.ts
│   │   │   │   ├── contentTypes.ts
│   │   │   │   ├── rels.ts
│   │   │   │   └── pkg.ts           # zip assembly (fflate)
│   │   │   ├── fonts/
│   │   │   │   ├── obfuscate.ts     # odttf XOR  ← §5.2
│   │   │   │   ├── os2.ts           # read OS/2 ulUnicodeRange → w:sig ← §5.3
│   │   │   │   └── register.ts
│   │   │   ├── toc.ts               # ← §6
│   │   │   ├── bangla/
│   │   │   │   ├── numerals.ts      # ০১২৩৪৫৬৭৮৯
│   │   │   │   ├── currency.ts      # ৳ + lakh/crore grouping
│   │   │   │   └── date.ts          # Bangabda
│   │   │   └── pdf/
│   │   │       └── libreoffice.ts   # ← §8
│   │   └── package.json
│   └── fonts/                   # @lipi/fonts — OFL only, see §7
├── examples/
│   ├── tor-bengali/             # generate a real 40-page ToR with TOC
│   └── letterhead/
├── tests/
│   ├── fixtures/conjuncts.txt   # ← §9.1
│   ├── golden/                  # normalized document.xml snapshots
│   └── visual/                  # PNG baselines  ← §9.3
├── CLAUDE.md
├── JOURNEY.md
└── README.md  +  README.bn.md
```

Fonts live in a **separate package** so users with their own licensed fonts do not pay 2MB on install. `lipi` declares `@lipi/fonts` as an optional peer.

npm names: check `lipi` availability first. If squatted, publish scoped `@lipi/core` and `@lipi/fonts` and keep the brand. Fallbacks: `borno`, `bangla-docgen`.

---

## 5. Font embedding (the crown jewel)

Nobody else does this. It is why the output works on a machine with zero Bengali fonts installed.

### 5.1 Files to emit

| Path | Note |
|---|---|
| `word/fonts/font1.odttf` | obfuscated TTF, one per weight/style |
| `word/fontTable.xml` | `<w:embedRegular r:id w:fontKey>` etc. |
| `word/_rels/fontTable.xml.rels` | rel type `.../relationships/font` |
| `[Content_Types].xml` | `<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>` |
| `word/settings.xml` | `<w:embedTrueTypeFonts/>` |

`fontTable.xml` entry:

```xml
<w:font w:name="Hind Siliguri">
  <w:panose1 w:val="00000000000000000000"/>
  <w:charset w:val="00"/>
  <w:family w:val="auto"/>
  <w:pitch w:val="variable"/>
  <w:sig w:usb0="..." w:usb1="..." w:usb2="..." w:usb3="..." w:csb0="..." w:csb1="..."/>
  <w:embedRegular r:id="rId1" w:fontKey="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"/>
  <w:embedBold    r:id="rId2" w:fontKey="{...}"/>
</w:font>
```

### 5.2 The `.odttf` obfuscation algorithm

Per ECMA-376 Part 1 §17.8.1. XOR, so the same function obfuscates and deobfuscates.

```
1. Generate a GUID per font file. Store it in w:fontKey as "{B1B2B3B4-B5B6-B7B8-B9BA-BBBCBDBEBFC0}".
2. Strip { } and - from the GUID string  →  32 hex chars.
3. Parse left-to-right into 16 bytes.
4. REVERSE the 16-byte array.
5. key = [...reversed, ...reversed]   // 32 bytes
6. XOR the FIRST 32 BYTES of the .ttf with key. Leave the rest untouched.
7. Write as .odttf
```

**Verify, do not trust.** Before shipping: open Word, insert Bengali text in Hind Siliguri, tick File → Options → Save → "Embed fonts in the file", save as .docx. Unzip it. Take the real `.odttf` and its `w:fontKey`, run your function, and assert the output is a valid TTF (`\x00\x01\x00\x00` or `OTTO` magic at byte 0). If the magic bytes are wrong, your byte order in step 4 is wrong. Write this as a test, do not do it by hand once.

### 5.3 `w:sig` — the silent killer

The `usb0..usb3` / `csb0..csb1` bits declare which Unicode ranges the font covers. **Bengali is `OS/2.ulUnicodeRange1` bit 16.** If your `w:sig` does not declare Bengali, Word may decide the font cannot render Bengali and fall back regardless of `w:cs`.

Do not hardcode these. Parse the font's real `OS/2` table (`ulUnicodeRange1..4` → `usb0..usb3`, `ulCodePageRange1..2` → `csb0..csb1`) and emit the actual values. Use `fontkit` or `opentype.js` for parsing, or read the table directly (offset table → `OS/2` tag → version, then ulUnicodeRange1 at offset 42).

### 5.4 Validate against the real schema

The ISO schema is available locally:

```
/mnt/skills/public/docx/scripts/office/schemas/ISO-IEC29500-4_2016/wml.xsd
```

Confirmed to contain `embedRegular`, `embedBold`, `embedItalic`, `embedBoldItalic`, `embedTrueTypeFonts`, `CT_FontRel/@fontKey`, `CT_Font/sig/@usb0`, `szCs`, `bCs`, `bidi`.

Copy it into `tests/schemas/` and add a CI step that validates every generated `document.xml`, `styles.xml`, `fontTable.xml`, and `settings.xml` against it with `xmllint --schema`. Element **order inside `CT_RPr` and `CT_Font` is a sequence, not a choice** — wrong order = file Word silently repairs or rejects. The schema catches this. Nothing else will.

---

## 6. TOC architecture (single pass, not two)

The naive approach is two-pass with a fixed-point loop: render → PDF → find page numbers → re-render → page numbers shifted because the TOC itself added pages → loop. Ugly and sometimes non-convergent.

**Do this instead.** Put the TOC in its own `w:sectPr` with its own page numbering, and restart body numbering at 1:

```
Section 1 (front matter + TOC)   → w:pgNumType w:fmt="lowerRoman" w:start="1"   → i, ii, iii
Section 2 (body)                 → w:pgNumType w:fmt="decimal"    w:start="1"   → 1, 2, 3
```

Now TOC length has **zero effect** on body page numbers. Algorithm collapses to:

```
1. Render body-only .docx with a marker in each heading paragraph.
2. Convert to PDF.
3. Extract markers + page numbers from the PDF text layer (pdfjs-dist or PyMuPDF).
4. Build the TOC block from the map.
5. Render final .docx with front matter + TOC + body.
```

One extra render, deterministic, no loop.

### Marker design

The marker must be extractable from the PDF text layer but must not perturb layout. Use a unique token in a **1pt run, colour `FFFFFF`, in the same paragraph as the heading**:

```xml
<w:r>
  <w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/><w:color w:val="FFFFFF"/><w:vanish w:val="false"/></w:rPr>
  <w:t xml:space="preserve">ZQX0001ZQX</w:t>
</w:r>
```

Do **not** use `<w:vanish/>` (hidden text) — LibreOffice drops it from the PDF text layer entirely and you get nothing back. Keep the marker present but visually negligible. Token format `ZQX%04dZQX`, ASCII only so no shaping interference.

Keep the markers in the final render too. Layout must be byte-identical between pass 1 and pass 2 or the page numbers you extracted are lies.

### TOC entry rendering

- Right-aligned page number via a **right tab stop with dot leader** (`<w:tab w:val="right" w:leader="dot" w:pos="9350"/>`), not manual dots.
- Page numbers in the TOC must be **Bengali numerals** when locale is `bn`. So must the footer page field, which means you cannot use `PAGE` field + `\* DBNum`. Use a static footer per section, or accept ASCII digits in the footer and document it. Decide and write the decision in JOURNEY.md.
- Add `<w:bookmarkStart>` / `<w:bookmarkEnd>` at each heading and make TOC entries internal hyperlinks so the DOCX stays clickable.

---

## 7. Fonts and licensing

Bundle **OFL only**. This is a legal landmine and it is why nobody ships fonts in an npm package.

| Font | License | Bundle? |
|---|---|---|
| Noto Sans Bengali | SIL OFL 1.1 | Yes, default |
| Hind Siliguri | SIL OFL 1.1 | Yes |
| Tiro Bangla | SIL OFL 1.1 | Yes |
| Kalpurush | Ekushey, murky | No. Opt-in download only |
| SolaimanLipi | murky | No |
| Nikosh | BCC (GoB) | No. Opt-in, document provenance |

Ship `@lipi/fonts` with the OFL text, the original copyright lines, and per-font `LICENSE` files preserved verbatim. OFL requires the licence to travel with the font. Add a `licenses` field in the font metadata and a `lipi licenses` CLI command that prints them.

For non-bundled fonts provide `registerFont(path, { name, weight, style })` and make the docs blunt about the user being responsible for their own licence.

### Subsetting — do not, yet

Word supports `w:saveSubsetFonts`. Do **not** subset in v1. Subsetting a complex script requires retaining every glyph reachable through `GSUB` (conjunct ligatures, reph forms, matra variants), and a naive codepoint-based subset silently drops conjuncts. You get a file that looks fine in your test and breaks on ক্ষ. Embed full fonts, eat the ~200KB per weight, and revisit with a `harfbuzzjs` closure-based subsetter in v2. Write this in the README so people stop asking.

---

## 8. PDF adapter (LibreOffice)

`packages/lipi/src/pdf/libreoffice.ts`. Optional. Detect `soffice` on PATH, throw a clear actionable error if missing.

```bash
soffice --headless --norestore \
  -env:UserInstallation=file:///tmp/lo-$$ \
  --convert-to 'pdf:writer_pdf_Export' \
  --outdir out in.docx
```

Landmines:

| Issue | Fix |
|---|---|
| LO single-instance lock kills concurrent calls | Unique `-env:UserInstallation` per process. Non-negotiable. |
| LO needs writable HOME | Set `HOME` to a temp dir in containers |
| Embedded fonts sometimes ignored | Also install fonts to `/usr/share/fonts/truetype/lipi/` + `fc-cache -f -v`. Belt and braces. |
| Zombie soffice processes | Kill on timeout. Default 60s, configurable. |
| First run is slow (profile creation) | Warm-up call in long-lived processes |

Ship a `Dockerfile.test` with `libreoffice-writer`, `fonts-noto-core`, and `fontconfig` so CI is reproducible and users can copy it.

**Do not** add a pdfkit/pdfmake direct-PDF path in v1. `fontkit` has an Indic shaper but pdfkit's text pipeline does not reliably route through it, and split matras (ৌ) will break. Document this in README under "Why LibreOffice?" and offer a `harfbuzzjs`-based direct writer as a v2 milestone.

---

## 9. Test strategy

The tests are the product. Nobody else has visual regression tests for Bengali. Say so in the README.

### 9.1 `tests/fixtures/conjuncts.txt`

Each line is a case that breaks naive implementations. Do not trim this list.

```
ক্ষ        ka+hasant+ssa — the canonical conjunct
জ্ঞ        jha-nya ligature
ঞ্জ        nya+ja
ক্র        ra-phala, subjoined ra
র্ক        REPH — ra moves ABOVE and AFTER the following consonant
র্ক্য       reph + ya-phala stacked
স্ত্র       triple conjunct
ন্ত্র       triple
ক্ষ্ম       four-part
কি        i-kar renders BEFORE the consonant (logical after, visual before)
কী
কু কূ      u-kar/uu-kar attach below, shape changes per consonant
কৃ        ri-kar
কে কৈ     e-kar/oi-kar render BEFORE
কো        o-kar = SPLIT matra, glyphs on BOTH sides
কৌ        au-kar = SPLIT matra — the single best breakage detector
হৃ         special ligature
ত্ত        doubled
ঙ্ক
ড়  ঢ়  য়    nukta forms
ৎ         khanda ta
ং  ঃ  ঁ     anusvara / visarga / candrabindu
০১২৩৪৫৬৭৮৯  Bengali digits
৳         taka sign U+09F3
৺         isshar
মুহাম্মদ     real-word smoke test
বাংলাদেশ সরকার
গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
```

If ৌ and র্ক render correctly, almost everything else does. Those two are the smoke test.

### 9.2 Golden XML

Generate → unzip → normalize (strip GUIDs, timestamps, rIds → canonical order) → snapshot compare. Catches OOXML regressions cheaply.

### 9.3 Visual regression (the one that matters)

```
docx → soffice → pdf → pdftoppm -r 150 -png → pixelmatch vs tests/visual/baseline/*.png
```

Threshold 0.1%. Run in the Docker image so font rendering is deterministic. This is the only test that actually proves conjuncts work. Golden XML will pass happily while the output is garbage.

### 9.4 Roundtrip

Assert the `.odttf` in the output zip deobfuscates back to a byte-identical TTF. Cheap, catches §5.2 errors instantly.

---

## 10. Core API

Keep it small and boring. This is a library, not a framework.

```ts
import { Document, Heading, Para, Table, TOC, PageBreak } from 'lipi';
import { hindSiliguri } from '@lipi/fonts';

const doc = new Document({
  lang: 'bn-BD',
  font: hindSiliguri,          // embedded automatically
  numerals: 'bengali',          // ০১২ in TOC, tables, page refs
  margins: { top: 25, right: 25, bottom: 25, left: 30 }, // mm
});

doc.section({ pageNumbers: { format: 'lowerRoman', start: 1 } })
   .add(new TOC({ levels: [1, 3], title: 'সূচিপত্র' }));

doc.section({ pageNumbers: { format: 'decimal', start: 1 } })
   .add(new Heading(1, 'প্রকল্পের পটভূমি'))
   .add(new Para('গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের...'))
   .add(Table.from(rows, { header: true, widths: ['40%', '30%', '30%'] }));

await doc.toDocx('out.docx');
await doc.toPdf('out.pdf');     // requires soffice
```

Also ship `Boq` helper (item / unit / qty / rate / amount with auto-total in Bengali numerals) because that is the single most common real-world Bengali document and every proposal has one.

Bangla utils, exported standalone:

```ts
toBengaliNumerals(1234567)     // ১২৩৪৫৬৭
formatTaka(1000000)            // ৳১০,০০,০০০   ← lakh/crore grouping, NOT 1,000,000
formatTaka(1000000, { words: true })  // দশ লক্ষ টাকা
```

Indian grouping: last 3 digits, then groups of 2. Get this wrong and every accountant in BD notices.

---

## 11. The README

The README is the marketing. Build it deliberately.

1. **First thing after the title: one image.** Left half = default `pdfkit`/`docx` output with broken conjuncts. Right half = lipi output, correct. Caption both. Generate this image with a script in `scripts/comparison.ts` and commit both the script and the PNG so it is reproducible and honest.
2. Second thing: the 8-line quickstart from §10.
3. Then "Why is this hard?" pointing at §2. People need to understand the problem to value the fix.
4. `README.bn.md`, full parity, linked at the top. BN-first, consistent with everything else in the org.
5. Badges: npm, CI, and a **"conjuncts: 24/24 passing"** badge generated from the test run. That badge is the whole pitch in 20px.

---

## 12. Milestones

| Milestone | Definition of done |
|---|---|
| M1 — skeleton | pnpm workspace, TS strict, vitest, `Dockerfile.test`, CLAUDE.md, JOURNEY.md, xmllint schema validation wired into CI |
| M2 — DOCX writer | Paragraphs, runs, headings, page breaks. `w:cs`/`w:szCs`/`w:bCs` correct everywhere. Schema-valid. Opens in Word without a repair prompt. |
| M3 — font embedding | `.odttf` roundtrip test green, real `w:sig` from OS/2, opens correctly on a machine with **no Bengali fonts installed**. This is the milestone that makes the project worth existing. |
| M4 — visual tests | Docker + pdftoppm + pixelmatch. All 24 conjunct cases green. Comparison PNG generated. |
| M5 — tables + BoQ | Table model, widths, merges, header repeat, auto-total |
| M6 — TOC | Section-restart numbering, marker extraction, dot leaders, bookmarks, Bengali numerals |
| M7 — PDF adapter | soffice wrapper, concurrency-safe, clear errors |
| M8 — ship | READMEs (EN+BN), `@lipi/fonts` with licences, publish, post |

M1 to M4 is the real work. If M3 lands and M4 is green, the project has already won even with nothing else.

---

## 13. Working agreement

Create `CLAUDE.md` with:
- The §2 three bugs, verbatim. Every future session must read them before touching `ooxml/`.
- "Never hardcode `w:sig`. Parse OS/2."
- "Never emit `w:b` without `w:bCs`."
- "Never use the TOC field. Static only."
- "Validate against `tests/schemas/wml.xsd` before claiming done."
- "Visual test green or it is not done. Golden XML passing means nothing."
- Commands: `pnpm test`, `pnpm test:visual`, `pnpm build`, `docker compose -f docker-compose.test.yml run test`

Create `JOURNEY.md` and append after every session: what shipped, what broke, what was decided and why. Specifically log the font-slot decisions and the TOC numbering decision, because future-you will want to undo them and will be wrong.

Commit granularity: one milestone per PR. Conventional commits. Tag `v0.x` from M4 onward so the comparison PNG has something to link to.

---

## 14. Verification checklist before publishing

- [ ] `.odttf` roundtrips to byte-identical TTF
- [ ] All XML validates against `wml.xsd`
- [ ] Word opens the file with **no repair dialog**
- [ ] Output correct on a clean VM with **zero Bengali fonts installed**
- [ ] ৌ and র্ক correct in Word (Windows), LibreOffice (Linux), Pages (macOS)
- [ ] Bold Bengali is actually bold
- [ ] TOC page numbers match reality in a 40+ page document
- [ ] `formatTaka(1000000)` → `৳১০,০০,০০০`
- [ ] OFL licence files present and referenced for every bundled font
- [ ] Comparison PNG regenerated from the current build
- [ ] `README.bn.md` at parity
- [ ] Concurrent `toPdf()` calls do not deadlock

---

## 15. First move

Do **not** start with the doc model. Start with M3's core risk in isolation:

1. Make `scripts/spike-odttf.ts`.
2. Take a real Word-generated .docx with an embedded font. Extract the `.odttf` and its `w:fontKey`.
3. Deobfuscate it. Assert TTF magic bytes.
4. Re-obfuscate. Assert byte-identical to the original.

If that spike does not go green in the first hour, nothing downstream matters. Kill the unknown first, then build the boring parts around it.
