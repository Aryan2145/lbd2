import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LegacyService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    const row = await this.prisma.legacyCanvas.findUnique({ where: { userId } });
    return row ?? { roleTexts: {}, purposeText: '', isSealed: false };
  }

  async upsert(userId: string, data: any) {
    const roleTexts   = data.roleTexts   ?? {};
    const purposeText = data.purposeText ?? '';
    const isSealed    = data.isSealed    ?? false;
    return this.prisma.legacyCanvas.upsert({
      where:  { userId },
      create: { userId, roleTexts, purposeText, isSealed },
      update: { roleTexts, purposeText, isSealed },
    });
  }
}
