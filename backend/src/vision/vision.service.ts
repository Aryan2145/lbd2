import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisionService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    const row = await this.prisma.visionCanvas.findUnique({ where: { userId } });
    return row ?? { areas: [], purposeStatement: '' };
  }

  async upsert(userId: string, data: any) {
    const areas            = data.areas            ?? [];
    const purposeStatement = data.purposeStatement ?? '';
    return this.prisma.visionCanvas.upsert({
      where:  { userId },
      create: { userId, areas, purposeStatement },
      update: { areas, purposeStatement },
    });
  }
}
