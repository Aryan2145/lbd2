import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

const TO_DB:   Record<string, any>    = { dreaming: 'dream', planning: 'planned', achieved: 'achieved', dream: 'dream', planned: 'planned' };
const FROM_DB: Record<string, string> = { dream: 'dreaming', planned: 'planning', achieved: 'achieved' };

@Injectable()
export class BucketService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  private eStr(v: string | null | undefined): string | null {
    return v ? this.enc.encrypt(v) : (v ?? null);
  }
  private dStr(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    return this.enc.isEncrypted(v) ? this.enc.decrypt(v) : v;
  }

  private decryptRow(row: any) {
    return {
      ...row,
      title:            this.dStr(row.title)            ?? '',
      description:      this.dStr(row.description)      ?? '',
      imageUrl:         this.dStr(row.imageUrl)         ?? '',
      memoryPhotoUrl:   this.dStr(row.memoryPhotoUrl)   ?? null,
      changeReflection: this.dStr(row.changeReflection) ?? null,
      status: FROM_DB[row.status] ?? row.status,
    };
  }

  async findAll(userId: string) {
    const rows = await this.prisma.bucketEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.decryptRow(r));
  }

  async create(userId: string, data: any) {
    const { title, description, lifeArea, imageUrl, status, targetDate, achievedAt, memoryPhotoUrl, changeReflection } = data;
    const row = await this.prisma.bucketEntry.create({
      data: {
        userId,
        title:            this.enc.encrypt(title),
        description:      this.eStr(description)      ?? '',
        lifeArea,
        imageUrl:         imageUrl ? this.enc.encrypt(imageUrl) : '',
        status:           TO_DB[status]    ?? 'dream',
        targetDate:       targetDate       || null,
        achievedAt:       achievedAt       ? BigInt(Math.floor(Number(achievedAt))) : null,
        memoryPhotoUrl:   memoryPhotoUrl ? this.enc.encrypt(memoryPhotoUrl) : null,
        changeReflection: this.eStr(changeReflection),
      },
    });
    return this.decryptRow(row);
  }

  async update(id: string, data: any) {
    const fields: any = {};
    if (data.title            !== undefined) fields.title            = this.enc.encrypt(data.title);
    if (data.description      !== undefined) fields.description      = this.eStr(data.description) ?? '';
    if (data.lifeArea         !== undefined) fields.lifeArea         = data.lifeArea;
    if (data.imageUrl         !== undefined) fields.imageUrl         = data.imageUrl ? this.enc.encrypt(data.imageUrl) : '';
    if (data.status           !== undefined) fields.status           = TO_DB[data.status]   ?? data.status;
    if (data.targetDate       !== undefined) fields.targetDate       = data.targetDate       || null;
    if (data.achievedAt       !== undefined) fields.achievedAt       = data.achievedAt       ? BigInt(Math.floor(Number(data.achievedAt))) : null;
    if (data.memoryPhotoUrl   !== undefined) fields.memoryPhotoUrl   = data.memoryPhotoUrl ? this.enc.encrypt(data.memoryPhotoUrl) : null;
    if (data.changeReflection !== undefined) fields.changeReflection = this.eStr(data.changeReflection);
    const row = await this.prisma.bucketEntry.update({ where: { id }, data: fields });
    return this.decryptRow(row);
  }

  remove(id: string) {
    return this.prisma.bucketEntry.delete({ where: { id } });
  }
}
