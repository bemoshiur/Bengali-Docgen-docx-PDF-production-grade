# Contributing to lipi

Thanks for helping make Bengali document generation correct and free for
everyone in Bangladesh 🇧🇩, India 🇮🇳 and beyond.

`lipi` is **free and open source under the MIT License** — anyone may use,
modify, distribute and sell it, forever. Contributions are welcome and stay
under the same license.

## Before you touch the OOXML writer

Read [CLAUDE.md](./CLAUDE.md). The whole product is getting three
complex-script bugs right (`w:cs`/`w:szCs`, `w:bCs`/`w:iCs`, static TOC). Break
one and Bengali silently renders as tofu.

## Workflow

1. `pnpm install && pnpm build`
2. Make your change. Keep the author/attribution header at the top of new source
   files (`node scripts/add-author-header.mjs` adds it).
3. `pnpm test` (unit + schema validation) and, if you have Docker,
   `pnpm test:visual` (the only test that proves conjuncts actually render).
4. Append a short note to [JOURNEY.md](./JOURNEY.md): what changed and why.
5. Open a PR. One milestone / topic per PR; conventional commit messages.

## Especially wanted

- Fuller **language ports** (`ports/`) — the document writer, not just the
  primitives, in Java / C# / Python / Ruby / Go / PHP.
- More conjunct fixtures and visual baselines.
- The full ISO `wml.xsd` dropped into `tests/schemas/` (see JOURNEY.md).

## Good faith

Report security or licensing concerns privately to bemoshiur@gmail.com.
Be kind. This project exists to remove a wall, not to build new ones.
