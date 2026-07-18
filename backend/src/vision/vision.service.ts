import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class VisionService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
    private media:  MediaService,
  ) {}

  private eJson(v: unknown): string {
    return this.enc.encrypt(JSON.stringify(v ?? []));
  }
  private dJson(v: unknown, fallback: unknown = []): unknown {
    if (typeof v === 'string' && this.enc.isEncrypted(v)) {
      try { return JSON.parse(this.enc.decrypt(v)); } catch { return fallback; }
    }
    return v ?? fallback;
  }
  private dStr(v: unknown): string {
    if (typeof v !== 'string' || !v) return '';
    return this.enc.isEncrypted(v) ? this.enc.decryptSafe(v) : v;
  }

  async get(userId: string) {
    const row = await this.prisma.visionCanvas.findUnique({ where: { userId } });
    if (!row) return { areas: [], purposeStatement: '' };
    return {
      ...row,
      areas:            this.dJson(row.areas, []),
      purposeStatement: this.dStr(row.purposeStatement),
    };
  }

  async upsert(userId: string, data: any) {
    // Snapshot old image pointers so we can purge any that get replaced/removed.
    const existing  = await this.prisma.visionCanvas.findUnique({ where: { userId } });
    const oldAreas  = (existing ? this.dJson(existing.areas, []) : []) as any[];
    const newAreas  = (data.areas ?? []) as any[];
    const keptIds   = new Set(newAreas.map((a) => a?.imageUrl).filter(Boolean));

    const areas            = this.eJson(newAreas);
    const purposeStatement = this.enc.encrypt(data.purposeStatement ?? '');
    const row = await this.prisma.visionCanvas.upsert({
      where:  { userId },
      create: { userId, areas, purposeStatement },
      update: { areas, purposeStatement },
    });

    // No orphans in R2: delete media that this save dropped.
    for (const a of oldAreas) {
      const old = a?.imageUrl;
      if (this.media.isMediaId(old) && !keptIds.has(old)) {
        try { await this.media.remove('vision', userId, old); } catch { /* best-effort */ }
      }
    }

    return {
      ...row,
      areas:            this.dJson(row.areas, []),
      purposeStatement: this.dStr(row.purposeStatement),
    };
  }
}
