/**
 * LibreOffice PDF adapter (BUILD_PROMPT.md §8). Optional: detect `soffice`,
 * throw an actionable error if missing. The landmines this handles:
 *   - single-instance lock: a UNIQUE `-env:UserInstallation` per call,
 *   - writable HOME in containers,
 *   - zombie soffice: kill on timeout.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

/** Candidate soffice locations, most specific first. */
function sofficeCandidates(): string[] {
  const list: string[] = [];
  if (process.env.LIPI_SOFFICE) list.push(process.env.LIPI_SOFFICE);
  list.push(
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/opt/homebrew/bin/soffice',
    '/snap/bin/libreoffice',
  );
  // Scan PATH for `soffice`.
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir) list.push(join(dir, 'soffice'));
  }
  return list;
}

/** Resolve the soffice binary path, or null if none is installed. */
export function findSoffice(): string | null {
  for (const c of sofficeCandidates()) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

export class SofficeNotFoundError extends Error {
  constructor() {
    super(
      'LibreOffice (soffice) not found. PDF conversion needs it.\n' +
        '  • macOS:  brew install --cask libreoffice\n' +
        '  • Debian: apt-get install libreoffice-writer fonts-noto-core\n' +
        '  • Or set LIPI_SOFFICE=/path/to/soffice\n' +
        'See Dockerfile.test for a reproducible setup.',
    );
    this.name = 'SofficeNotFoundError';
  }
}

let callSeq = 0;

export interface ConvertOptions {
  /** Kill soffice after this many ms. Default 60_000. */
  timeoutMs?: number;
  /** Output directory for the .pdf. Defaults to a temp dir. */
  outDir?: string;
}

/**
 * Convert a .docx to .pdf via headless LibreOffice. Returns the output path.
 * Safe to call concurrently: each call gets its own LibreOffice profile.
 */
export function convertToPdf(docxPath: string, opts: ConvertOptions = {}): Promise<string> {
  const soffice = findSoffice();
  if (!soffice) return Promise.reject(new SofficeNotFoundError());

  const timeoutMs = opts.timeoutMs ?? 60_000;
  const outDir = opts.outDir ?? mkdtempSync(join(tmpdir(), 'lipi-pdf-'));
  // A unique profile dir per call — the non-negotiable fix for LO's single-instance lock.
  const profile = mkdtempSync(join(tmpdir(), 'lo-profile-'));
  callSeq += 1;
  const userInstallation = pathToFileURL(profile).href;

  const args = [
    '--headless',
    '--norestore',
    '--nolockcheck',
    `-env:UserInstallation=${userInstallation}`,
    '--convert-to',
    'pdf:writer_pdf_Export',
    '--outdir',
    outDir,
    docxPath,
  ];

  return new Promise<string>((resolve, reject) => {
    const child = spawn(soffice, args, {
      env: { ...process.env, HOME: profile },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr?.on('data', (d) => (stderr += d.toString()));

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`LibreOffice timed out after ${timeoutMs}ms converting ${docxPath}`));
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`LibreOffice exited with code ${code}\n${stderr}`));
        return;
      }
      const base = docxPath.replace(/\.docx$/i, '').split(/[\\/]/).pop()!;
      const pdfPath = join(outDir, `${base}.pdf`);
      if (!existsSync(pdfPath)) {
        reject(new Error(`LibreOffice reported success but ${pdfPath} is missing\n${stderr}`));
        return;
      }
      resolve(pdfPath);
    });
  });
}

/**
 * Extract per-page text from a PDF (for TOC marker extraction, §6).
 * Uses the optional `pdfjs-dist` peer; throws a clear error if it's absent.
 */
export async function extractPdfPageTexts(pdfPath: string): Promise<string[]> {
  let pdfjs: typeof import('pdfjs-dist/legacy/build/pdf.mjs');
  try {
    // Optional dependency: only needed for computed TOC page numbers.
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    throw new Error(
      'Computing TOC page numbers needs the optional "pdfjs-dist" package.\n' +
        '  pnpm add pdfjs-dist',
    );
  }
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
    pages.push(text);
  }
  await doc.destroy();
  return pages;
}
