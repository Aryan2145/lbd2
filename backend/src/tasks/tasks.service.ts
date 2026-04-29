import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const Q: Record<string, any> = { Q1: 'q1', Q2: 'q2', Q3: 'q3', Q4: 'q4', q1: 'q1', q2: 'q2', q3: 'q3', q4: 'q4' };

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    const { title, deadline, quadrant, status, linkedGoalId, kind, closedAt, variance } = data;
    return this.prisma.task.create({
      data: {
        userId, title, deadline,
        quadrant: Q[quadrant] ?? 'q1',
        status: status ?? 'open',
        linkedGoalId: linkedGoalId || null,
        kind: kind ?? 'one-time',
        closedAt: closedAt ? BigInt(Math.floor(Number(closedAt))) : null,
        variance: variance ?? null,
      },
    });
  }

  update(id: string, data: any) {
    const fields: any = {};
    if (data.title        !== undefined) fields.title        = data.title;
    if (data.deadline     !== undefined) fields.deadline     = data.deadline;
    if (data.quadrant     !== undefined) fields.quadrant     = Q[data.quadrant] ?? data.quadrant;
    if (data.status       !== undefined) fields.status       = data.status;
    if (data.linkedGoalId !== undefined) fields.linkedGoalId = data.linkedGoalId || null;
    if (data.kind         !== undefined) fields.kind         = data.kind;
    if (data.closedAt     !== undefined) fields.closedAt     = data.closedAt ? BigInt(Math.floor(Number(data.closedAt))) : null;
    if (data.variance     !== undefined) fields.variance     = data.variance ?? null;
    return this.prisma.task.update({ where: { id }, data: fields });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
