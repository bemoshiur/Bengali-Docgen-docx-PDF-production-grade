/**
 * Relationship parts: the root `_rels/.rels` and `word/_rels/document.xml.rels`.
 */
import { XML_DECL, el, empty } from './xml.js';

const OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';

export const REL_TYPES = {
  officeDocument: `${OFFICE}/officeDocument`,
  styles: `${OFFICE}/styles`,
  settings: `${OFFICE}/settings`,
  fontTable: `${OFFICE}/fontTable`,
  numbering: `${OFFICE}/numbering`,
  header: `${OFFICE}/header`,
  footer: `${OFFICE}/footer`,
} as const;

export interface Rel {
  id: string;
  type: string;
  target: string;
}

/** Allocates sequential rId values and serializes a rels part. */
export class RelManager {
  private readonly rels: Rel[] = [];
  private counter = 0;

  add(type: string, target: string): string {
    this.counter += 1;
    const id = `rId${this.counter}`;
    this.rels.push({ id, type, target });
    return id;
  }

  serialize(): string {
    const inner = this.rels
      .map((r) => empty('Relationship', { Id: r.id, Type: r.type, Target: r.target }))
      .join('');
    return XML_DECL + el('Relationships', { xmlns: PKG_RELS }, inner);
  }
}

/** The package root rels, always pointing at word/document.xml. */
export function buildRootRels(): string {
  return (
    XML_DECL +
    el(
      'Relationships',
      { xmlns: PKG_RELS },
      empty('Relationship', {
        Id: 'rId1',
        Type: REL_TYPES.officeDocument,
        Target: 'word/document.xml',
      }),
    )
  );
}
