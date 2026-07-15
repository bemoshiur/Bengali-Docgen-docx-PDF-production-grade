/**
 * Single source of truth for style sizes/weights, shared by styles.xml
 * (`buildStyles`) and the run renderer (`document.ts`). The renderer
 * direct-formats every run — including `w:rFonts/@w:cs` and `w:szCs` on ALL of
 * them (BUILD_PROMPT.md §2) — so it must know each style's effective size to
 * avoid clobbering headings with the body default.
 */

export const BASE_SIZE_HALFPT = 24; // 12pt body

export interface StyleMetric {
  size: number; // half-points
  bold?: boolean;
}

export const STYLE_METRICS: Record<string, StyleMetric> = {
  Normal: { size: BASE_SIZE_HALFPT },
  Heading1: { size: 32, bold: true },
  Heading2: { size: 28, bold: true },
  Heading3: { size: 26, bold: true },
  Title: { size: 48, bold: true },
  TableText: { size: 22 },
  TOCHeading: { size: 28, bold: true },
  TOC1: { size: BASE_SIZE_HALFPT },
  TOC2: { size: BASE_SIZE_HALFPT },
  TOC3: { size: BASE_SIZE_HALFPT },
};

/** Effective run size/weight for a paragraph style id (falls back to Normal). */
export function metricFor(styleId: string | undefined): StyleMetric {
  return (styleId && STYLE_METRICS[styleId]) || STYLE_METRICS.Normal!;
}
