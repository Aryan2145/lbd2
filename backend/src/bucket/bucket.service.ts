import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { MediaService } from '../media/media.service';

const TO_DB:   Record<string, any>    = { dreaming: 'dream', planning: 'planned', achieved: 'achieved', dream: 'dream', planned: 'planned' };
const FROM_DB: Record<string, string> = { dream: 'dreaming', planned: 'planning', achieved: 'achieved' };

@Injectable()
export class BucketService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
    private media:  MediaService,
  ) {}

  /** Purge an R2 media object if the pointer is one (legacy URLs are left alone). */
  private async cleanupPointer(userId: string, pointer: string | null) {
    if (this.media.isMediaId(pointer)) {
      try { await this.media.remove('dreams', userId, pointer); } catch { /* best-effort */ }
    }
  }

  private eStr(v: string | null | undefined): string | null {
    return v ? this.enc.encrypt(v) : (v ?? null);
  }
  private dStr(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    return this.enc.isEncrypted(v) ? this.enc.decryptSafe(v) : v;
  }

  private decryptRow(row: any) {
    return {
      ...row,
      title:            this.dStr(row.title)            ?? '',
      description:      this.dStr(row.description)      ?? '',
      imageUrl:         this.dStr(row.imageUrl)         ?? '',
      memoryPhotoUrl:   this.dStr(row.memoryPhotoUrl)   ?? null,
      changeReflection: this.dStr(row.changeReflection) ?? null,
      status: FROM_DB[row.status] ?? row.status,
    };
  }

  async findAll(userId: string) {
    const rows = await this.prisma.bucketEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.decryptRow(r));
  }

  async create(userId: string, data: any) {
    const { title, description, lifeArea, imageUrl, status, targetDate, achievedAt, memoryPhotoUrl, changeReflection } = data;
    const row = await this.prisma.bucketEntry.create({
      data: {
        userId,
        title:            this.enc.encrypt(title),
        description:      this.eStr(description)      ?? '',
        lifeArea,
        imageUrl:         imageUrl ? this.enc.encrypt(imageUrl) : '',
        status:           TO_DB[status]    ?? 'dream',
        targetDate:       targetDate       || null,
        achievedAt:       achievedAt       ? BigInt(Math.floor(Number(achievedAt))) : null,
        memoryPhotoUrl:   memoryPhotoUrl ? this.enc.encrypt(memoryPhotoUrl) : null,
        changeReflection: this.eStr(changeReflection),
      },
    });
    return this.decryptRow(row);
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.bucketEntry.findUnique({ where: { id } });

    const fields: any = {};
    if (data.title            !== undefined) fields.title            = this.enc.encrypt(data.title);
    if (data.description      !== undefined) fields.description      = this.eStr(data.description) ?? '';
    if (data.lifeArea         !== undefined) fields.lifeArea         = data.lifeArea;
    if (data.imageUrl         !== undefined) fields.imageUrl         = data.imageUrl ? this.enc.encrypt(data.imageUrl) : '';
    if (data.status           !== undefined) fields.status           = TO_DB[data.status]   ?? data.status;
    if (data.targetDate       !== undefined) fields.targetDate       = data.targetDate       || null;
    if (data.achievedAt       !== undefined) fields.achievedAt       = data.achievedAt       ? BigInt(Math.floor(Number(data.achievedAt))) : null;
    if (data.memoryPhotoUrl   !== undefined) fields.memoryPhotoUrl   = data.memoryPhotoUrl ? this.enc.encrypt(data.memoryPhotoUrl) : null;
    if (data.changeReflection !== undefined) fields.changeReflection = this.eStr(data.changeReflection);
    const row = await this.prisma.bucketEntry.update({ where: { id }, data: fields });

    // Purge any image that was replaced or cleared, so R2 keeps no orphans.
    if (existing) {
      if (data.imageUrl !== undefined) {
        const old = this.dStr(existing.imageUrl);
        if (old !== data.imageUrl) await this.cleanupPointer(existing.userId, old);
      }
      if (data.memoryPhotoUrl !== undefined) {
        const old = this.dStr(existing.memoryPhotoUrl);
        if (old !== data.memoryPhotoUrl) await this.cleanupPointer(existing.userId, old);
      }
    }
    return this.decryptRow(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.bucketEntry.findUnique({ where: { id } });
    const deleted  = await this.prisma.bucketEntry.delete({ where: { id } });
    if (existing) {
      await this.cleanupPointer(existing.userId, this.dStr(existing.imageUrl));
      await this.cleanupPointer(existing.userId, this.dStr(existing.memoryPhotoUrl));
    }
    return deleted;
  }
}
