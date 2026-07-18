import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service';
import { EncryptionService } from '../encryption/encryption.service';
import { ImageService } from './image.service';

type Variant = 'full' | 'thumb';

/** Top-level R2 folders — one per feature that stores images. */
export const MEDIA_SCOPES = ['dreams', 'vision'] as const;
export type MediaScope = (typeof MEDIA_SCOPES)[number];

/**
 * Upload → resize → encrypt → R2, and the reverse for viewing.
 *
 * Objects are laid out as `{scope}/{userId}/{id}` — the scope ("dreams" | "vision")
 * is the top-level folder, and the userId makes ownership structural: keys are
 * always built from the *authenticated* caller's userId, so a user cannot address
 * another user's object. No ownership table needed. Stored plaintext is always WebP.
 */
@Injectable()
export class MediaService {
  constructor(
    private storage: StorageService,
    private enc:     EncryptionService,
    private images:  ImageService,
  ) {}

  private static ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** True if a stored pointer is an R2 media id (vs. a legacy Drive URL / empty). */
  isMediaId(v: string | null | undefined): v is string {
    return !!v && MediaService.ID_RE.test(v);
  }

  isScope(v: unknown): v is MediaScope {
    return typeof v === 'string' && (MEDIA_SCOPES as readonly string[]).includes(v);
  }

  private assertScope(scope: string): MediaScope {
    if (!this.isScope(scope)) throw new BadRequestException('Invalid media scope.');
    return scope;
  }

  private fullKey(scope: string, userId: string, id: string)  { return `${scope}/${userId}/${id}`; }
  private thumbKey(scope: string, userId: string, id: string) { return `${scope}/${userId}/${id}_t`; }

  /** Process + encrypt + store; returns the opaque id to persist on the entry. */
  async upload(scope: string, userId: string, input: Buffer): Promise<{ id: string }> {
    this.assertScope(scope);
    const { full, thumb } = await this.images.process(input);
    const id = randomUUID();
    await Promise.all([
      this.storage.put(this.fullKey(scope, userId, id),  this.enc.encryptBuffer(full)),
      this.storage.put(this.thumbKey(scope, userId, id), this.enc.encryptBuffer(thumb)),
    ]);
    return { id };
  }

  /** Fetch + decrypt a stored variant for the owning user. */
  async fetch(scope: string, userId: string, id: string, variant: Variant): Promise<{ buffer: Buffer; contentType: string }> {
    this.assertScope(scope);
    const key = variant === 'thumb' ? this.thumbKey(scope, userId, id) : this.fullKey(scope, userId, id);
    const cipher = await this.storage.get(key);
    return { buffer: this.enc.decryptBuffer(cipher), contentType: 'image/webp' };
  }

  /** Remove both variants (called when an entry that references them is deleted). */
  async remove(scope: string, userId: string, id: string): Promise<void> {
    this.assertScope(scope);
    await Promise.all([
      this.storage.delete(this.fullKey(scope, userId, id)),
      this.storage.delete(this.thumbKey(scope, userId, id)),
    ]);
  }
}
