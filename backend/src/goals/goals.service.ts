import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.goal.findMany({ where: { userId }, include: { notes: true }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    const { statement, outcome, metric, deadline, area, progress, velocity } = data;
    return this.prisma.goal.create({
      data: { userId, statement, outcome: outcome || null, metric: metric || null, deadline, area, progress: progress ?? 0, velocity: velocity ?? null },
      include: { notes: true },
    });
  }

  update(id: string, userId: string, data: any) {
    const fields: any = {};
    if (data.statement  !== undefined) fields.statement  = data.statement;
    if (data.outcome    !== undefined) fields.outcome    = data.outcome    || null;
    if (data.metric     !== undefined) fields.metric     = data.metric     || null;
    if (data.deadline   !== undefined) fields.deadline   = data.deadline;
    if (data.area       !== undefined) fields.area       = data.area;
    if (data.progress   !== undefined) fields.progress   = data.progress;
    if (data.velocity   !== undefined) fields.velocity   = data.velocity   ?? null;
    return this.prisma.goal.update({ where: { id }, data: fields });
  }

  remove(id: string, userId: string) {
    return this.prisma.goal.delete({ where: { id } });
  }

  addNote(goalId: string, text: string) {
    return this.prisma.goalNote.create({ data: { goalId, text } });
  }

  removeNote(id: string) {
    return this.prisma.goalNote.delete({ where: { id } });
  }
}
