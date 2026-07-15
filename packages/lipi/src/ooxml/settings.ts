/**
 * `word/settings.xml`. `<w:embedTrueTypeFonts/>` is the switch that tells Word
 * to honour the embedded `.odttf` fonts (BUILD_PROMPT.md §5.1). We deliberately
 * do NOT emit `w:saveSubsetFonts` — full fonts only in v1 (§7).
 */
import { XML_DECL, el, empty } from './xml.js';

export interface SettingsContext {
  langBidi: string;
}

const COMPAT_URI = 'http://schemas.microsoft.com/office/word';

export function buildSettings(ctx: SettingsContext): string {
  const compat = el(
    'w:compat',
    undefined,
    empty('w:compatSetting', {
      'w:name': 'compatibilityMode',
      'w:uri': COMPAT_URI,
      'w:val': 15,
    }),
  );

  const body =
    empty('w:embedTrueTypeFonts') +
    empty('w:defaultTabStop', { 'w:val': 720 }) +
    empty('w:characterSpacingControl', { 'w:val': 'doNotCompress' }) +
    compat +
    empty('w:themeFontLang', { 'w:val': 'en-US', 'w:bidi': ctx.langBidi });

  return (
    XML_DECL +
    el(
      'w:settings',
      { 'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' },
      body,
    )
  );
}
