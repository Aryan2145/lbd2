import { BadRequestException, Injectable } from '@nestjs/common';
import type { Sharp, SharpOptions } from 'sharp';
// sharp's CJS runtime exports a bare callable (`module.exports = sharp`) while its
// ESM typings use a default export — the two interop forms disagree. Require the
// CJS factory directly and type it, so it works regardless of esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: (input?: Buffer, options?: SharpOptions) => Sharp = require('sharp');

// sharp's prebuilt binary can't decode HEIC (HEVC-in-HEIF) — no HEVC codec, for
// patent reasons — so iPhone .heic photos are transcoded to JPEG first.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const heicConvert: (opts: { buffer: Buffer; format: 'JPEG' | 'PNG'; quality?: number }) => Promise<ArrayBuffer | Buffer> =
  require('heic-convert');

const MAX_WIDTH   = 1500; // full-size ceiling (matches the vision-banner spec)
const THUMB_WIDTH = 400;  // list/grid thumbnail
const QUALITY     = 80;

// HEIF major brands sharp can't read (need transcoding). AVIF is read natively.
const HEIC_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'msf1']);

function heifMajorBrand(buf: Buffer): string | null {
  if (buf.length < 12 || buf.toString('ascii', 4, 8) !== 'ftyp') return null;
  return buf.toString('ascii', 8, 12).replace(/\0/g, '').trim().toLowerCase();
}

function needsHeicTranscode(buf: Buffer): boolean {
  const brand = heifMajorBrand(buf);
  if (!brand || brand.startsWith('avif') || brand.startsWith('avis')) return false;
  if (brand === 'mif1' || brand === 'msf1') {
    // Generic HEIF box — skip if it's actually AVIF (sharp handles that).
    if (buf.toString('ascii', 16, Math.min(buf.length, 64)).toLowerCase().includes('avif')) return false;
  }
  return HEIC_BRANDS.has(brand);
}

/**
 * Normalizes arbitrary uploaded images (any size/format the AI tools produce)
 * into a predictable WebP full-size + thumbnail. Runs BEFORE encryption —
 * ciphertext can't be resized, so this is the only place to clamp size.
 */
@Injectable()
export class ImageService {
  async process(input: Buffer): Promise<{ full: Buffer; thumb: Buffer; contentType: string }> {
    // Transcode HEIC → JPEG up front so the rest of the pipeline is format-agnostic.
    let source = input;
    if (needsHeicTranscode(input)) {
      try {
        const jpeg = await heicConvert({ buffer: input, format: 'JPEG', quality: 0.92 });
        source = Buffer.from(jpeg as ArrayBuffer);
      } catch {
        throw new BadRequestException('Could not read this HEIC image.');
      }
    }

    // failOn:'none' tolerates minor corruption; rotate() bakes in EXIF orientation.
    const base = sharp(source, { failOn: 'none' }).rotate();

    let full: Buffer, thumb: Buffer;
    try {
      [full, thumb] = await Promise.all([
        base.clone().resize({ width: MAX_WIDTH,   withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer(),
        base.clone().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer(),
      ]);
    } catch {
      throw new BadRequestException('File is not a readable image.');
    }

    return { full, thumb, contentType: 'image/webp' };
  }
}
