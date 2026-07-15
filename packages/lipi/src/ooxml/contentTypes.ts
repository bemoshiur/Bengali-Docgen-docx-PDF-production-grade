/**
 * `[Content_Types].xml`. The critical line for font embedding is the
 * `.odttf` Default (BUILD_PROMPT.md §5.1) — without it Word can't identify the
 * obfuscated font parts.
 */
import { XML_DECL, el, empty } from './xml.js';

const WML = 'application/vnd.openxmlformats-officedocument.wordprocessingml';

export interface ContentTypesInput {
  headerCount: number;
  footerCount: number;
  hasFonts: boolean;
  hasNumbering: boolean;
}

export function buildContentTypes(input: ContentTypesInput): string {
  const parts: string[] = [
    empty('Default', {
      Extension: 'rels',
      ContentType: 'application/vnd.openxmlformats-package.relationships+xml',
    }),
    empty('Default', { Extension: 'xml', ContentType: 'application/xml' }),
  ];

  if (input.hasFonts) {
    parts.push(
      empty('Default', {
        Extension: 'odttf',
        ContentType: 'application/vnd.openxmlformats-officedocument.obfuscatedFont',
      }),
    );
  }

  const override = (partName: string, ct: string) =>
    empty('Override', { PartName: partName, ContentType: ct });

  parts.push(override('/word/document.xml', `${WML}.document.main+xml`));
  parts.push(override('/word/styles.xml', `${WML}.styles+xml`));
  parts.push(override('/word/settings.xml', `${WML}.settings+xml`));
  if (input.hasFonts) parts.push(override('/word/fontTable.xml', `${WML}.fontTable+xml`));
  if (input.hasNumbering) parts.push(override('/word/numbering.xml', `${WML}.numbering+xml`));
  for (let i = 1; i <= input.headerCount; i++) {
    parts.push(override(`/word/header${i}.xml`, `${WML}.header+xml`));
  }
  for (let i = 1; i <= input.footerCount; i++) {
    parts.push(override(`/word/footer${i}.xml`, `${WML}.footer+xml`));
  }

  return (
    XML_DECL +
    el(
      'Types',
      { xmlns: 'http://schemas.openxmlformats.org/package/2006/content-types' },
      parts.join(''),
    )
  );
}
