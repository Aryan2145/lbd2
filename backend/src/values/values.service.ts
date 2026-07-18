import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ValuesService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string) {
    const board = await this.prisma.valuesBoard.findUnique({ where: { userId } });
    return {
      selected: board?.selected ?? [],
      custom: board?.custom ?? {},
    };
  }

  async put(userId: string, selected: unknown, custom: unknown) {
    const data = {
      selected: (selected ?? []) as any,
      custom: (custom ?? {}) as any,
    };
    await this.prisma.valuesBoard.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.get(userId);
  }
}
