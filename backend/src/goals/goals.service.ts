import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.goal.findMany({ where: { userId }, include: { notes: true }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    return this.prisma.goal.create({ data: { userId, ...data } });
  }

  update(id: string, userId: string, data: any) {
    return this.prisma.goal.update({ where: { id }, data });
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
