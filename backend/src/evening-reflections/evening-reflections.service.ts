import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EveningReflectionsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.eveningReflection.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  }

  upsert(userId: string, date: string, data: any) {
    return this.prisma.eveningReflection.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: data,
    });
  }
}
