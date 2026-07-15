/**
 * Bengali (Bangla) numeral conversion. Bengali uses its own digit glyphs
 * ০১২৩৪৫৬৭৮৯ (U+09E6–U+09EF); every generated table, TOC page reference and
 * BoQ figure should use them when the document locale is `bn`.
 */

/** Bengali digits indexed 0–9. */
export const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

const ASCII_TO_BENGALI: Record<string, string> = Object.fromEntries(
  BENGALI_DIGITS.map((d, i) => [String(i), d]),
);
const BENGALI_TO_ASCII: Record<string, string> = Object.fromEntries(
  BENGALI_DIGITS.map((d, i) => [d, String(i)]),
);

/**
 * Convert every ASCII digit in `input` to its Bengali glyph. Non-digit
 * characters (separators, signs, letters) pass through unchanged.
 *
 * @example toBengaliNumerals(1234567) // → "১২৩৪৫৬৭"
 */
export function toBengaliNumerals(input: number | string): string {
  const s = typeof input === 'number' ? numberToPlainString(input) : input;
  let out = '';
  for (const ch of s) out += ASCII_TO_BENGALI[ch] ?? ch;
  return out;
}

/** Inverse of {@link toBengaliNumerals}. */
export function toAsciiNumerals(input: string): string {
  let out = '';
  for (const ch of input) out += BENGALI_TO_ASCII[ch] ?? ch;
  return out;
}

/** Render a number without scientific notation or locale grouping. */
function numberToPlainString(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`cannot format non-finite number: ${n}`);
  if (Number.isInteger(n)) return n.toString();
  // Avoid exponent notation for typical document magnitudes.
  return n.toString();
}
