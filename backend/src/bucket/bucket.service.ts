import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const TO_DB: Record<string, any>      = { dreaming: 'dream', planning: 'planned', achieved: 'achieved', dream: 'dream', planned: 'planned' };
const FROM_DB: Record<string, string> = { dream: 'dreaming', planned: 'planning', achieved: 'achieved' };

@Injectable()
export class BucketService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const rows = await this.prisma.bucketEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return rows.map(r => ({ ...r, status: FROM_DB[r.status] ?? r.status }));
  }

  async create(userId: string, data: any) {
    const { title, description, lifeArea, imageUrl, status, targetDate, achievedAt, memoryPhotoUrl, changeReflection } = data;
    const row = await this.prisma.bucketEntry.create({
      data: {
        userId, title,
        description: description ?? '',
        lifeArea,
        imageUrl: imageUrl ?? '',
        status: TO_DB[status] ?? 'dream',
        targetDate: targetDate || null,
        achievedAt: achievedAt ? BigInt(Math.floor(Number(achievedAt))) : null,
        memoryPhotoUrl: memoryPhotoUrl || null,
        changeReflection: changeReflection || null,
      },
    });
    return { ...row, status: FROM_DB[row.status] ?? row.status };
  }

  async update(id: string, data: any) {
    const fields: any = {};
    if (data.title            !== undefined) fields.title            = data.title;
    if (data.description      !== undefined) fields.description      = data.description ?? '';
    if (data.lifeArea         !== undefined) fields.lifeArea         = data.lifeArea;
    if (data.imageUrl         !== undefined) fields.imageUrl         = data.imageUrl ?? '';
    if (data.status           !== undefined) fields.status           = TO_DB[data.status] ?? data.status;
    if (data.targetDate       !== undefined) fields.targetDate       = data.targetDate || null;
    if (data.achievedAt       !== undefined) fields.achievedAt       = data.achievedAt ? BigInt(Math.floor(Number(data.achievedAt))) : null;
    if (data.memoryPhotoUrl   !== undefined) fields.memoryPhotoUrl   = data.memoryPhotoUrl || null;
    if (data.changeReflection !== undefined) fields.changeReflection = data.changeReflection || null;
    const row = await this.prisma.bucketEntry.update({ where: { id }, data: fields });
    return { ...row, status: FROM_DB[row.status] ?? row.status };
  }

  remove(id: string) {
    return this.prisma.bucketEntry.delete({ where: { id } });
  }
}
