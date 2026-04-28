import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    return this.prisma.task.create({ data: { userId, ...data } });
  }

  update(id: string, data: any) {
    return this.prisma.task.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
