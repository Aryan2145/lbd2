import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    return this.prisma.supportTicket.create({ data: { userId, ...data } });
  }

  update(id: string, data: any) {
    return this.prisma.supportTicket.update({ where: { id }, data });
  }
}
