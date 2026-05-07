import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────
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

  private decryptGoal(row: any) {
    return {
      ...row,
      statement:  this.dStr(row.statement) ?? '',
      outcome:    this.dStr(row.outcome),
      metric:     this.dStr(row.metric),
      milestones: this.dJson(row.milestones, []),
      notes: (row.notes ?? []).map((n: any) => ({
        ...n,
        text: this.dStr(n.text) ?? '',
      })),
    };
  }

  // ── Queries ───────────────────────────────────────────────────────────────────
  async findAll(userId: string) {
    const rows = await this.prisma.goal.findMany({
      where: { userId },
      include: { notes: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.decryptGoal(r));
  }

  async create(userId: string, data: any) {
    const { statement, outcome, metric, deadline, area, progress, velocity, milestones } = data;
    const row = await this.prisma.goal.create({
      data: {
        userId,
        statement:  this.enc.encrypt(statement),
        outcome:    this.eStr(outcome),
        metric:     this.eStr(metric),
        deadline, area,
        progress:   progress  ?? 0,
        velocity:   velocity  ?? null,
        milestones: this.eJson(milestones ?? []),
      },
      include: { notes: true },
    });
    return this.decryptGoal(row);
  }

  async update(id: string, userId: string, data: any) {
    const fields: any = {};
    if (data.statement  !== undefined) fields.statement  = this.enc.encrypt(data.statement);
    if (data.outcome    !== undefined) fields.outcome    = this.eStr(data.outcome);
    if (data.metric     !== undefined) fields.metric     = this.eStr(data.metric);
    if (data.deadline   !== undefined) fields.deadline   = data.deadline;
    if (data.area       !== undefined) fields.area       = data.area;
    if (data.progress   !== undefined) fields.progress   = data.progress;
    if (data.velocity   !== undefined) fields.velocity   = data.velocity ?? null;
    if (data.milestones !== undefined) fields.milestones = this.eJson(data.milestones);
    return this.prisma.goal.update({ where: { id }, data: fields });
  }

  remove(id: string, userId: string) {
    return this.prisma.goal.delete({ where: { id } });
  }

  async addNote(goalId: string, text: string) {
    const note = await this.prisma.goalNote.create({
      data: { goalId, text: this.enc.encrypt(text) },
    });
    return { ...note, text };
  }

  removeNote(id: string) {
    return this.prisma.goalNote.delete({ where: { id } });
  }
}
