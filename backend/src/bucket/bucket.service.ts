import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BucketService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.bucketEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, data: any) {
    return this.prisma.bucketEntry.create({ data: { userId, ...data } });
  }

  update(id: string, data: any) {
    return this.prisma.bucketEntry.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.bucketEntry.delete({ where: { id } });
  }
}
