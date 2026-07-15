import { randomUUID } from 'node:crypto';

/**
 * Embedded-font obfuscation per ECMA-376 Part 1 §17.8.1.
 *
 * OOXML embeds TrueType/OpenType fonts as `.odttf` files whose first 32 bytes
 * are XOR-scrambled with a key derived from a per-font GUID (`w:fontKey`).
 * The operation is a pure XOR, so the *same* function obfuscates and
 * deobfuscates — see {@link deobfuscate}.
 *
 * The one place implementations go wrong is the byte order of the key
 * (BUILD_PROMPT.md §5.2 step 4): the 16 GUID bytes must be **reversed**.
 * Get that wrong and the roundtrip still passes but Word rejects the file.
 */

/** A `w:fontKey` GUID string: `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}`, upper-case. */
export type FontKey = `{${string}}`;

/** Generate a fresh, spec-shaped font key GUID. */
export function makeFontKey(): FontKey {
  return `{${randomUUID().toUpperCase()}}` as FontKey;
}

/**
 * Derive the 16-byte XOR key from a font-key GUID string.
 *
 * Steps (BUILD_PROMPT.md §5.2):
 *   1. Strip `{`, `}`, `-`  → 32 hex chars.
 *   2. Parse left-to-right into 16 bytes.
 *   3. REVERSE the 16-byte array.
 */
export function fontKeyToXorKey(fontKey: string): Buffer {
  const hex = fontKey.replace(/[{}\-]/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(
      `invalid font key ${JSON.stringify(fontKey)}: expected 32 hex digits after stripping {}-`,
    );
  }
  // Parse left-to-right into 16 bytes, then reverse the array.
  return Buffer.from(hex, 'hex').reverse();
}

/**
 * XOR the first 32 bytes of `ttf` with the key derived from `fontKey`.
 * Returns a new Buffer; the input is not mutated. Bytes past 32 are copied
 * verbatim. Because XOR is its own inverse this is symmetric.
 */
export function obfuscate(ttf: Buffer | Uint8Array, fontKey: string): Buffer {
  const key = fontKeyToXorKey(fontKey);
  const out = Buffer.from(ttf); // defensive copy
  const n = Math.min(32, out.length);
  for (let i = 0; i < n; i++) {
    out[i] = out[i]! ^ key[i % 16]!;
  }
  return out;
}

/**
 * Deobfuscate an `.odttf` back to its original font bytes.
 * Identical to {@link obfuscate} (XOR is symmetric); provided as a named
 * export so call sites read correctly.
 */
export const deobfuscate = obfuscate;

/** TTF/OTF sfnt magic numbers at byte 0 of a valid font file. */
const SFNT_MAGICS = new Set([
  0x00010000, // TrueType outlines
  0x4f54544f, // 'OTTO' — CFF/OpenType outlines
  0x74727565, // 'true' — legacy Apple TrueType
  0x74746366, // 'ttcf' — TrueType Collection (unsupported for embedding)
]);

/** True if `buf` starts with a recognised sfnt magic number. */
export function hasSfntMagic(buf: Buffer | Uint8Array): boolean {
  if (buf.length < 4) return false;
  const magic =
    ((buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!) >>> 0;
  return SFNT_MAGICS.has(magic);
}
