import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class WeekPlansService {
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

  private decryptRow(row: any) {
    return {
      ...row,
      outcomes:     this.dJson(row.outcomes,      []),
      doneOutcomes: this.dJson(row.doneOutcomes,  []),
      dayNotes:     this.dJson(row.dayNotes,      {}),
    };
  }

  private encryptData(data: any) {
    const out: any = {};
    if (data.outcomes     !== undefined) out.outcomes     = this.eJson(data.outcomes);
    if (data.doneOutcomes !== undefined) out.doneOutcomes = this.eJson(data.doneOutcomes);
    if (data.dayNotes     !== undefined) out.dayNotes     = this.eJson(data.dayNotes);
    return out;
  }

  async findAll(userId: string) {
    const rows = await this.prisma.weekPlan.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
    });
    return rows.map(r => this.decryptRow(r));
  }

  async upsert(userId: string, weekStart: string, data: any) {
    const enc = this.encryptData(data);
    const row = await this.prisma.weekPlan.upsert({
      where:  { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, ...enc },
      update: enc,
    });
    return this.decryptRow(row);
  }
}
