import { BadRequestException, Injectable } from '@nestjs/common';
import type { Sharp, SharpOptions } from 'sharp';
// sharp's CJS runtime exports a bare callable (`module.exports = sharp`) while its
// ESM typings use a default export — the two interop forms disagree. Require the
// CJS factory directly and type it, so it works regardless of esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: (input?: Buffer, options?: SharpOptions) => Sharp = require('sharp');

const MAX_WIDTH   = 1500; // full-size ceiling (matches the vision-banner spec)
const THUMB_WIDTH = 400;  // list/grid thumbnail
const QUALITY     = 80;

/**
 * Normalizes arbitrary uploaded images (any size/format the AI tools produce)
 * into a predictable WebP full-size + thumbnail. Runs BEFORE encryption —
 * ciphertext can't be resized, so this is the only place to clamp size.
 */
@Injectable()
export class ImageService {
  async process(input: Buffer): Promise<{ full: Buffer; thumb: Buffer; contentType: string }> {
    // failOn:'none' tolerates minor corruption; rotate() bakes in EXIF orientation.
    const base = sharp(input, { failOn: 'none' }).rotate();

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
