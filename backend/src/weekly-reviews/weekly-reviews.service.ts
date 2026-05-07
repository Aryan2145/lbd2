import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class WeeklyReviewsService {
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
      topWins:         this.dJson(row.topWins,         []),
      outcomeNotes:    this.dStr(row.outcomeNotes),
      taskReflection:  this.dStr(row.taskReflection),
      habitReflection: this.dStr(row.habitReflection),
      journalText:     this.dStr(row.journalText),
      journalSections: this.dJson(row.journalSections, []),
      lifeLessons:     this.dJson(row.lifeLessons,     []),
      coreValuesLived: this.dJson(row.coreValuesLived, []),
    };
  }

  private encryptData(data: any) {
    const out: any = {};
    if (data.topWins         !== undefined) out.topWins         = this.eJson(data.topWins);
    if (data.outcomeNotes    !== undefined) out.outcomeNotes    = this.eStr(data.outcomeNotes);
    if (data.outcomeChecked  !== undefined) out.outcomeChecked  = data.outcomeChecked;
    if (data.taskReflection  !== undefined) out.taskReflection  = this.eStr(data.taskReflection);
    if (data.habitReflection !== undefined) out.habitReflection = this.eStr(data.habitReflection);
    if (data.overallRating   !== undefined) out.overallRating   = data.overallRating;
    if (data.journalDate     !== undefined) out.journalDate     = data.journalDate;
    if (data.journalText     !== undefined) out.journalText     = this.eStr(data.journalText);
    if (data.journalSections !== undefined) out.journalSections = this.eJson(data.journalSections);
    if (data.lifeLessons     !== undefined) out.lifeLessons     = this.eJson(data.lifeLessons);
    if (data.coreValuesLived !== undefined) out.coreValuesLived = this.eJson(data.coreValuesLived);
    return out;
  }

  async findAll(userId: string) {
    const rows = await this.prisma.weeklyReview.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
    });
    return rows.map(r => this.decryptRow(r));
  }

  async upsert(userId: string, weekStart: string, data: any) {
    const enc = this.encryptData(data);
    const row = await this.prisma.weeklyReview.upsert({
      where:  { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, ...enc },
      update: enc,
    });
    return this.decryptRow(row);
  }
}
