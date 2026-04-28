import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DayPlansService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.dayPlan.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  }

  upsert(userId: string, date: string, data: any) {
    return this.prisma.dayPlan.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: data,
    });
  }
}
