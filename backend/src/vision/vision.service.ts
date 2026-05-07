import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class VisionService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
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
    return this.enc.isEncrypted(v) ? this.enc.decrypt(v) : v;
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
    const areas            = this.eJson(data.areas            ?? []);
    const purposeStatement = this.enc.encrypt(data.purposeStatement ?? '');
    const row = await this.prisma.visionCanvas.upsert({
      where:  { userId },
      create: { userId, areas, purposeStatement },
      update: { areas, purposeStatement },
    });
    return {
      ...row,
      areas:            this.dJson(row.areas, []),
      purposeStatement: this.dStr(row.purposeStatement),
    };
  }
}
