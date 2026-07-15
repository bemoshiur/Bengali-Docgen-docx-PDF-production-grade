/**
 * Minimal, dependency-free sfnt (TrueType/OpenType) table reader.
 *
 * We only read what `fontTable.xml` needs (BUILD_PROMPT.md §5.3):
 *   - the real OS/2 `ulUnicodeRange1..4` → `w:sig/@usb0..3`
 *   - the real OS/2 `ulCodePageRange1..2` → `w:sig/@csb0..1`
 *   - PANOSE → `w:panose1`
 *   - the family / subfamily names from the `name` table
 *   - weight class + fsSelection so we can tell which weight/style a file is
 *
 * BUILD_PROMPT.md §5.3: "Do not hardcode these. Parse the font's real OS/2
 * table." Bengali is `ulUnicodeRange1` bit 16 — if `w:sig` doesn't declare it,
 * Word may refuse to render Bengali regardless of `w:cs`.
 */

export interface FontSig {
  /** ulUnicodeRange1 — Bengali lives here at bit 16. */
  usb0: string;
  usb1: string;
  usb2: string;
  usb3: string;
  /** ulCodePageRange1..2 (0 for OS/2 version 0 fonts, which lack the fields). */
  csb0: string;
  csb1: string;
}

export interface FontInfo {
  /** OS/2 table version (0–5). */
  os2Version: number;
  /** usWeightClass, e.g. 400 regular, 700 bold. */
  weightClass: number;
  /** True if fsSelection bit 0 (ITALIC) or bit 9 (OBLIQUE) is set. */
  italic: boolean;
  /** True if fsSelection bit 5 (BOLD) is set. */
  bold: boolean;
  /** 10 PANOSE bytes as 20 upper-case hex chars for `w:panose1/@w:val`. */
  panose: string;
  /** OS/2 Unicode/code-page signature for `w:sig`. */
  sig: FontSig;
  /** name table ID 1 (family), e.g. "Hind Siliguri". */
  familyName: string;
  /** name table ID 2 (subfamily), e.g. "Regular" / "Bold". */
  subfamilyName: string;
  /** name table ID 4 (full name), e.g. "Hind Siliguri Bold". */
  fullName: string;
}

interface TableRecord {
  offset: number;
  length: number;
}

const u16 = (b: Buffer, o: number) => b.readUInt16BE(o);
const u32 = (b: Buffer, o: number) => b.readUInt32BE(o);
const hex32 = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(8, '0');

/** Parse the sfnt table directory → tag → {offset, length}. */
export function readTableDirectory(buf: Buffer): Map<string, TableRecord> {
  const sfnt = u32(buf, 0);
  if (sfnt === 0x74746366) {
    throw new Error('TrueType Collections (.ttc) are not supported for embedding; supply a single-face .ttf/.otf');
  }
  const numTables = u16(buf, 4);
  const tables = new Map<string, TableRecord>();
  let p = 12;
  for (let i = 0; i < numTables; i++) {
    const tag = buf.toString('latin1', p, p + 4);
    tables.set(tag, { offset: u32(buf, p + 8), length: u32(buf, p + 12) });
    p += 16;
  }
  return tables;
}

/** Read the OS/2 signature + PANOSE + weight/style flags. */
function readOS2(buf: Buffer, rec: TableRecord): {
  os2Version: number;
  weightClass: number;
  bold: boolean;
  italic: boolean;
  panose: string;
  sig: FontSig;
} {
  const o = rec.offset;
  const version = u16(buf, o);
  const weightClass = u16(buf, o + 4);
  // PANOSE: 10 bytes at offset +32.
  const panose = buf
    .subarray(o + 32, o + 42)
    .toString('hex')
    .toUpperCase()
    .padEnd(20, '0');
  const usb0 = u32(buf, o + 42);
  const usb1 = u32(buf, o + 46);
  const usb2 = u32(buf, o + 50);
  const usb3 = u32(buf, o + 54);
  const fsSelection = u16(buf, o + 62);
  // Code-page ranges only exist for OS/2 version >= 1.
  let csb0 = 0;
  let csb1 = 0;
  if (version >= 1 && rec.length >= 86) {
    csb0 = u32(buf, o + 78);
    csb1 = u32(buf, o + 82);
  }
  return {
    os2Version: version,
    weightClass,
    bold: (fsSelection & 0x0020) !== 0,
    italic: (fsSelection & 0x0201) !== 0, // ITALIC (bit0) or OBLIQUE (bit9)
    panose,
    sig: {
      usb0: hex32(usb0),
      usb1: hex32(usb1),
      usb2: hex32(usb2),
      usb3: hex32(usb3),
      csb0: hex32(csb0),
      csb1: hex32(csb1),
    },
  };
}

/** Read a specific nameID from the `name` table, preferring Windows/Unicode records. */
function readName(buf: Buffer, rec: TableRecord, nameId: number): string {
  const o = rec.offset;
  const count = u16(buf, o + 2);
  const storageOffset = o + u16(buf, o + 4);
  let best = '';
  let bestScore = -1;
  let p = o + 6;
  for (let i = 0; i < count; i++, p += 12) {
    const platformId = u16(buf, p);
    const nameIdCur = u16(buf, p + 6);
    if (nameIdCur !== nameId) continue;
    const len = u16(buf, p + 8);
    const strOffset = storageOffset + u16(buf, p + 10);
    // Prefer Windows (platform 3, UTF-16BE); accept Mac (platform 1, latin1).
    let value: string;
    let score: number;
    if (platformId === 3 || platformId === 0) {
      value = buf.toString('utf16le', strOffset, strOffset + len);
      // utf16le is wrong endianness for sfnt; swap bytes.
      value = Buffer.from(buf.subarray(strOffset, strOffset + len)).swap16().toString('utf16le');
      score = 2;
    } else {
      value = buf.toString('latin1', strOffset, strOffset + len);
      score = 1;
    }
    if (score > bestScore) {
      best = value;
      bestScore = score;
    }
  }
  return best;
}

/** Parse a font buffer into the fields fontTable.xml needs. */
export function readFontInfo(buf: Buffer): FontInfo {
  const dir = readTableDirectory(buf);
  const os2Rec = dir.get('OS/2');
  if (!os2Rec) {
    throw new Error('font has no OS/2 table; cannot derive w:sig — supply a standard TTF/OTF');
  }
  const nameRec = dir.get('name');
  const os2 = readOS2(buf, os2Rec);
  const familyName = nameRec ? readName(buf, nameRec, 1) : '';
  const subfamilyName = nameRec ? readName(buf, nameRec, 2) : '';
  const fullName = nameRec ? readName(buf, nameRec, 4) : familyName;
  return {
    ...os2,
    familyName,
    subfamilyName,
    fullName,
  };
}

/** True if the font's OS/2 signature declares Bengali (ulUnicodeRange1 bit 16). */
export function coversBengali(sig: FontSig): boolean {
  return ((parseInt(sig.usb0, 16) >>> 16) & 1) === 1;
}
