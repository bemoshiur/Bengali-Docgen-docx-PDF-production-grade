# lipi — language ports

`lipi`'s full OOXML document writer is TypeScript-first. These ports bring the
two most reusable, self-contained primitives to other languages so you can embed
Bengali fonts and format numbers from your own stack today:

1. **`.odttf` embedded-font obfuscation** (ECMA-376 §17.8.1) — the exact byte
   transform Word/LibreOffice expect for embedded fonts, including the tricky
   GUID-reversed XOR key. This is the piece every language needs to embed a
   Bengali font into an OOXML file it builds itself.
2. **Bengali numerals + South-Asian currency** — `to_bengali_numerals`,
   `group_south_asian` (lakh/crore), and `format_taka` (৳, Bangladesh) /
   `format_rupee` (₹, India).

Each port is a single self-testing file that reads a bundled font, proves the
`.odttf` roundtrip is **byte-identical**, and checks the formatters.

| Language | File | Run | Verified here |
|---|---|---|---|
| Python | `python/lipi_core.py` | `python3 python/lipi_core.py` | ✅ |
| Ruby | `ruby/lipi_core.rb` | `ruby ruby/lipi_core.rb` | ✅ |
| PHP | `php/lipi_core.php` | `php php/lipi_core.php` | ✅ |
| C# | `csharp/` | `cd csharp && dotnet run` | ✅ |
| Java | `java/LipiCore.java` | `javac java/LipiCore.java && java -cp java lipi.LipiCore` | logic mirrors verified ports |
| Go | `go/lipicore.go` | `go run go/lipicore.go` | logic mirrors verified ports |

Run any port from the repo root (they walk up to find the bundled font).

## Scope & roadmap

These ports intentionally cover the **primitives**, not the whole document
writer. The OOXML paragraph/table/section/TOC generation, the three
complex-script bug fixes (`w:cs`/`w:bCs`/static TOC), and OS/2 signature parsing
live in the TypeScript package (`packages/lipi`). Full ports of the document
writer are a roadmap item — contributions welcome (see the repo `CONTRIBUTING`).

All ports are MIT licensed, free to use forever, including commercially.
