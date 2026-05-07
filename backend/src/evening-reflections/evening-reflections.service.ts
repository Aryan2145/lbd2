import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class EveningReflectionsService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  private eStr(v: string | null | undefined): string | null {
    return v ? this.enc.encrypt(v) : (v ?? null);
  }
  private dStr(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    return this.enc.isEncrypted(v) ? this.enc.decryptSafe(v) : v;
  }
  private eJson(v: unknown): string {
    return this.enc.encrypt(JSON.stringify(v ?? []));
  }
  private dJson(v: unknown, fallback: unknown = []): unknown {
    if (typeof v === 'string' && this.enc.isEncrypted(v)) {
      try { return JSON.parse(this.enc.decrypt(v)); } catch { return fallback; }
    }
    return v ?? fallback;
  }

  private decryptRow(row: any) {
    return {
      ...row,
      mood:       this.dStr(row.mood) ?? '',
      highlights: this.dStr(row.highlights),
      gratitude:  this.dStr(row.gratitude),
      decisions:  this.dJson(row.decisions, []),
      wins:       (row.wins ?? []).map((w: string) =>
                    this.enc.isEncrypted(w) ? this.enc.decryptSafe(w) : w),
      stuck:      this.dJson(row.stuck, []),
    };
  }

  private encryptData(data: any) {
    const out: any = {};
    if (data.energyLevel !== undefined) out.energyLevel = data.energyLevel;
    if (data.mood        !== undefined) out.mood        = this.eStr(data.mood) ?? '';
    if (data.highlights  !== undefined) out.highlights  = this.eStr(data.highlights);
    if (data.gratitude   !== undefined) out.gratitude   = this.eStr(data.gratitude);
    if (data.decisions   !== undefined) out.decisions   = this.eJson(data.decisions);
    if (data.wins        !== undefined) out.wins        = (data.wins ?? []).map((w: string) => w ? this.enc.encrypt(w) : w);
    if (data.stuck       !== undefined) out.stuck       = this.eJson(data.stuck);
    return out;
  }

  async findAll(userId: string) {
    const rows = await this.prisma.eveningReflection.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return rows.map(r => this.decryptRow(r));
  }

  async upsert(userId: string, date: string, data: any) {
    const enc = this.encryptData(data);
    const row = await this.prisma.eveningReflection.upsert({
      where:  { userId_date: { userId, date } },
      create: { userId, date, ...enc },
      update: enc,
    });
    return this.decryptRow(row);
  }
}
