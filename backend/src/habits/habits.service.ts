import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class HabitsService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  private dStr(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    return this.enc.isEncrypted(v) ? this.enc.decryptSafe(v) : v;
  }

  private decryptHabit(row: any) {
    return {
      ...row,
      name: this.dStr(row.name) ?? '',
      unit: this.dStr(row.unit),
    };
  }

  async findAll(userId: string) {
    const rows = await this.prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.decryptHabit(r));
  }

  async create(userId: string, data: any) {
    const {
      name, area, frequency, customDays, type, target, unit,
      completions, measurements, linkedGoalId, linkedMilestoneId,
    } = data;
    const row = await this.prisma.habit.create({
      data: {
        userId,
        name: this.enc.encrypt(name),
        area, frequency,
        customDays:        customDays  ?? [],
        type,
        target:            target      ?? 1,
        unit:              unit ? this.enc.encrypt(unit) : null,
        completions:       completions ?? [],
        measurements:      measurements ?? {},
        linkedGoalId:      linkedGoalId      || null,
        linkedMilestoneId: linkedMilestoneId || null,
      },
    });
    return this.decryptHabit(row);
  }

  async update(id: string, data: any) {
    const fields: any = {};
    if (data.name             !== undefined) fields.name             = this.enc.encrypt(data.name);
    if (data.area             !== undefined) fields.area             = data.area;
    if (data.frequency        !== undefined) fields.frequency        = data.frequency;
    if (data.customDays       !== undefined) fields.customDays       = data.customDays;
    if (data.type             !== undefined) fields.type             = data.type;
    if (data.target           !== undefined) fields.target           = data.target;
    if (data.unit             !== undefined) fields.unit             = data.unit ? this.enc.encrypt(data.unit) : null;
    if (data.completions      !== undefined) fields.completions      = data.completions;
    if (data.measurements     !== undefined) fields.measurements     = data.measurements;
    if (data.linkedGoalId      !== undefined) fields.linkedGoalId      = data.linkedGoalId      || null;
    if (data.linkedMilestoneId !== undefined) fields.linkedMilestoneId = data.linkedMilestoneId || null;
    const row = await this.prisma.habit.update({ where: { id }, data: fields });
    return this.decryptHabit(row);
  }

  remove(id: string) {
    return this.prisma.habit.delete({ where: { id } });
  }
}
