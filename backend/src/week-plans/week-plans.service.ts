import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeekPlansService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.weekPlan.findMany({ where: { userId }, orderBy: { weekStart: 'desc' } });
  }

  upsert(userId: string, weekStart: string, data: any) {
    return this.prisma.weekPlan.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, ...data },
      update: data,
    });
  }
}
