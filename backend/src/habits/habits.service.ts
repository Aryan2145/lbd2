import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.habit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    return this.prisma.habit.create({ data: { userId, ...data } });
  }

  update(id: string, data: any) {
    return this.prisma.habit.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.habit.delete({ where: { id } });
  }
}
