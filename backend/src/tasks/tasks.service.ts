import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

const Q: Record<string, any> = { Q1: 'q1', Q2: 'q2', Q3: 'q3', Q4: 'q4', q1: 'q1', q2: 'q2', q3: 'q3', q4: 'q4' };

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  private dStr(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    return this.enc.isEncrypted(v) ? this.enc.decrypt(v) : v;
  }

  private decryptTask(row: any) {
    return { ...row, title: this.dStr(row.title) ?? '' };
  }

  async findAll(userId: string) {
    const rows = await this.prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.decryptTask(r));
  }

  async create(userId: string, data: any) {
    const { title, deadline, quadrant, status, linkedGoalId, linkedMilestoneId, kind, closedAt, variance } = data;
    const row = await this.prisma.task.create({
      data: {
        userId,
        title: this.enc.encrypt(title),
        deadline,
        quadrant:          Q[quadrant] ?? 'q1',
        status:            status      ?? 'open',
        linkedGoalId:      linkedGoalId      || null,
        linkedMilestoneId: linkedMilestoneId || null,
        kind:              kind        ?? 'one-time',
        closedAt:          closedAt  ? BigInt(Math.floor(Number(closedAt)))  : null,
        variance:          variance  ?? null,
      },
    });
    return this.decryptTask(row);
  }

  async update(id: string, data: any) {
    const fields: any = {};
    if (data.title             !== undefined) fields.title             = this.enc.encrypt(data.title);
    if (data.deadline          !== undefined) fields.deadline          = data.deadline;
    if (data.quadrant          !== undefined) fields.quadrant          = Q[data.quadrant] ?? data.quadrant;
    if (data.status            !== undefined) fields.status            = data.status;
    if (data.linkedGoalId      !== undefined) fields.linkedGoalId      = data.linkedGoalId      || null;
    if (data.linkedMilestoneId !== undefined) fields.linkedMilestoneId = data.linkedMilestoneId || null;
    if (data.kind              !== undefined) fields.kind              = data.kind;
    if (data.closedAt          !== undefined) fields.closedAt          = data.closedAt  ? BigInt(Math.floor(Number(data.closedAt)))  : null;
    if (data.variance          !== undefined) fields.variance          = data.variance  ?? null;
    return this.prisma.task.update({ where: { id }, data: fields });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
