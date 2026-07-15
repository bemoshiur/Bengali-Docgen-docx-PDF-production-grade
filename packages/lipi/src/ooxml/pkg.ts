/**
 * OPC package assembly. A .docx is a ZIP; we build it deterministically with
 * fflate so golden snapshots are stable. `[Content_Types].xml` is written
 * first, as OPC readers expect.
 */
import { strToU8, zipSync, type Zippable } from 'fflate';

export type PackageFiles = Record<string, Uint8Array | string>;

/** Fixed zip mtime (2000-01-01Z) so archives are byte-stable. DOS dates must be ≥1980. */
const FIXED_MTIME = 946_684_800_000;

/** Assemble the given part map into .docx bytes. */
export function assembleDocx(files: PackageFiles): Uint8Array {
  const zippable: Zippable = {};

  // Ensure [Content_Types].xml is first for OPC-strict readers.
  const ordered = Object.keys(files).sort((a, b) => {
    if (a === '[Content_Types].xml') return -1;
    if (b === '[Content_Types].xml') return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });

  for (const path of ordered) {
    const content = files[path]!;
    const data = typeof content === 'string' ? strToU8(content) : content;
    // Fixed mtime → byte-stable archives across runs.
    zippable[path] = [data, { level: 6, mtime: FIXED_MTIME }];
  }

  return zipSync(zippable, {});
}
