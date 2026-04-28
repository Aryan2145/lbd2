import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeeklyReviewsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.weeklyReview.findMany({ where: { userId }, orderBy: { weekStart: 'desc' } });
  }

  upsert(userId: string, weekStart: string, data: any) {
    return this.prisma.weeklyReview.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, ...data },
      update: data,
    });
  }
}
