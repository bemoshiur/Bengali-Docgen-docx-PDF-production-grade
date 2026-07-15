# @bemoshiur/lipi-fonts

OFL-1.1 Bengali fonts bundled for [`lipi`](https://www.npmjs.com/package/lipi).
Only SIL Open Font License fonts are bundled — the OFL requires the licence to
travel with the font, so each family ships its verbatim `OFL.txt`.

| Font | Weights bundled | License |
|---|---|---|
| **Noto Sans Bengali** (default) | Regular, Bold | OFL-1.1 |
| **Hind Siliguri** | Regular, Bold | OFL-1.1 |
| **Tiro Bangla** | Regular, Italic | OFL-1.1 |

```ts
import { notoSansBengali, hindSiliguri, tiroBangla, licenses } from '@bemoshiur/lipi-fonts';
// pass any of these as `new Document({ font: notoSansBengali })`
```

Print licences: `lipi licenses` (or call `licenses()`).

For your own licensed fonts (Kalpurush, SolaimanLipi, Nikosh, …) use
`registerFont()` from `lipi` — you are responsible for their licences. `lipi`
does not subset fonts in v1 (a naive subset drops conjuncts), so full faces are
embedded.

Copyright of bundled fonts:
- Noto Sans Bengali — © 2022 The Noto Project Authors
- Hind Siliguri — © 2015 Indian Type Foundry
- Tiro Bangla — © 2020 The Indigo Project Authors (Tiro Typeworks)

Licensed under the SIL Open Font License 1.1.
