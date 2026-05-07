import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class DayPlansService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  private eStr(v: string | null | undefined): string | null {
    return v ? this.enc.encrypt(v) : (v ?? null);
  }
  private dStr(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    return this.enc.isEncrypted(v) ? this.enc.decrypt(v) : v;
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
      priorities: this.dJson(row.priorities, []),
      gratitude:  this.dStr(row.gratitude),
      decisions:  this.dJson(row.decisions,  []),
    };
  }

  private encryptData(data: any) {
    const out: any = {};
    if (data.priorities !== undefined) out.priorities = this.eJson(data.priorities);
    if (data.gratitude  !== undefined) out.gratitude  = this.eStr(data.gratitude);
    if (data.decisions  !== undefined) out.decisions  = this.eJson(data.decisions);
    return out;
  }

  async findAll(userId: string) {
    const rows = await this.prisma.dayPlan.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return rows.map(r => this.decryptRow(r));
  }

  async upsert(userId: string, date: string, data: any) {
    const enc = this.encryptData(data);
    const row = await this.prisma.dayPlan.upsert({
      where:  { userId_date: { userId, date } },
      create: { userId, date, ...enc },
      update: enc,
    });
    return this.decryptRow(row);
  }
}
