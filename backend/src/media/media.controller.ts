import {
  Controller, Post, Get, Delete, Param, Request, Res,
  UseGuards, UseInterceptors, UploadedFile,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';

const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED   = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence',
]);
// HEIC uploads sometimes carry an empty/octet-stream type; let those through and
// rely on the content gate (sharp/heic-convert) to reject genuine non-images.
const GENERIC   = new Set(['application/octet-stream', '']);
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB accepted upload; resized down on the server

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private media: MediaService) {}

  @Post(':scope/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(@Request() req, @Param('scope') scope: string, @UploadedFile() file: any) {
    if (!this.media.isScope(scope)) throw new BadRequestException('Invalid media scope.');
    if (!file) throw new BadRequestException('No file uploaded.');
    if (!ALLOWED.has(file.mimetype) && !GENERIC.has(file.mimetype)) {
      throw new BadRequestException('Unsupported image type.');
    }
    return this.media.upload(scope, req.user.userId, file.buffer);
  }

  @Get(':scope/:id')
  async getFull(@Request() req, @Param('scope') scope: string, @Param('id') id: string, @Res() res: Response) {
    return this.stream(scope, req.user.userId, id, 'full', res);
  }

  @Get(':scope/:id/thumb')
  async getThumb(@Request() req, @Param('scope') scope: string, @Param('id') id: string, @Res() res: Response) {
    return this.stream(scope, req.user.userId, id, 'thumb', res);
  }

  @Delete(':scope/:id')
  async remove(@Request() req, @Param('scope') scope: string, @Param('id') id: string) {
    if (!this.media.isScope(scope)) throw new BadRequestException('Invalid media scope.');
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid id.');
    await this.media.remove(scope, req.user.userId, id);
    return { ok: true };
  }

  private async stream(scope: string, userId: string, id: string, variant: 'full' | 'thumb', res: Response) {
    if (!this.media.isScope(scope)) throw new BadRequestException('Invalid media scope.');
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid id.');
    let payload: { buffer: Buffer; contentType: string };
    try {
      payload = await this.media.fetch(scope, userId, id, variant);
    } catch {
      // R2 NoSuchKey (wrong owner/scope or deleted) → 404, never leak which.
      throw new NotFoundException('Image not found.');
    }
    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(payload.buffer);
  }
}
