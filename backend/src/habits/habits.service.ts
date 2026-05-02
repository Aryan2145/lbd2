import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.habit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    const { name, area, frequency, customDays, type, target, unit, completions, measurements, linkedGoalId, linkedMilestoneId } = data;
    return this.prisma.habit.create({
      data: {
        userId, name, area, frequency,
        customDays: customDays ?? [],
        type, target: target ?? 1,
        unit: unit || null,
        completions: completions ?? [],
        measurements: measurements ?? {},
        linkedGoalId: linkedGoalId || null,
        linkedMilestoneId: linkedMilestoneId || null,
      },
    });
  }

  update(id: string, data: any) {
    const fields: any = {};
    if (data.name             !== undefined) fields.name             = data.name;
    if (data.area             !== undefined) fields.area             = data.area;
    if (data.frequency        !== undefined) fields.frequency        = data.frequency;
    if (data.customDays       !== undefined) fields.customDays       = data.customDays;
    if (data.type             !== undefined) fields.type             = data.type;
    if (data.target           !== undefined) fields.target           = data.target;
    if (data.unit             !== undefined) fields.unit             = data.unit || null;
    if (data.completions      !== undefined) fields.completions      = data.completions;
    if (data.measurements     !== undefined) fields.measurements     = data.measurements;
    if (data.linkedGoalId      !== undefined) fields.linkedGoalId      = data.linkedGoalId || null;
    if (data.linkedMilestoneId !== undefined) fields.linkedMilestoneId = data.linkedMilestoneId || null;
    return this.prisma.habit.update({ where: { id }, data: fields });
  }

  remove(id: string) {
    return this.prisma.habit.delete({ where: { id } });
  }
}
