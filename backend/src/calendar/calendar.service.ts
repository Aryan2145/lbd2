import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { GcalService } from '../gcal/gcal.service';

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
    private gcal:   GcalService,
  ) {}

  private dStr(v: unknown): string | null {
    if (typeof v !== 'string' || !v) return null;
    return this.enc.isEncrypted(v) ? this.enc.decryptSafe(v) : v;
  }

  private decryptGroup(g: any) {
    return {
      ...g,
      name:   this.dStr(g.name) ?? '',
      events: (g.events ?? []).map((e: any) => this.decryptEvent(e)),
    };
  }

  private decryptEvent(e: any) {
    return {
      ...e,
      title:       this.dStr(e.title)       ?? '',
      description: this.dStr(e.description) ?? null,
    };
  }

  async findGroups(userId: string) {
    const rows = await this.prisma.eventGroup.findMany({
      where: { userId },
      include: { events: true },
    });
    return rows.map(g => this.decryptGroup(g));
  }

  async createGroup(userId: string, data: any) {
    const { id, name, color } = data;
    const row = await this.prisma.eventGroup.create({
      data: { ...(id ? { id } : {}), userId, name: this.enc.encrypt(name), color },
      include: { events: true },
    });
    return this.decryptGroup(row);
  }

  async updateGroup(id: string, data: any) {
    const fields: any = {};
    if (data.name     !== undefined) fields.name     = this.enc.encrypt(data.name);
    if (data.color    !== undefined) fields.color    = data.color;
    if (data.archived !== undefined) fields.archived = data.archived;
    return this.prisma.eventGroup.update({ where: { id }, data: fields });
  }

  removeGroup(id: string) {
    return this.prisma.eventGroup.delete({ where: { id } });
  }

  async createEvent(userId: string, data: any) {
    const { groupId, title, date, startTime, endTime, description } = data;
    const dbEvent = await this.prisma.weekEvent.create({
      data: {
        userId, groupId, date, startTime, endTime,
        title:       this.enc.encrypt(title),
        description: description ? this.enc.encrypt(description) : null,
      },
    });

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleRefreshToken) {
        // Pass plaintext to Google — Google needs to read the event title
        const googleEventId = await this.gcal.createEvent(user.googleRefreshToken, {
          title, date, startTime, endTime, description,
        });
        return this.decryptEvent(
          await this.prisma.weekEvent.update({ where: { id: dbEvent.id }, data: { googleEventId } }),
        );
      }
    } catch { /* Google sync is non-blocking */ }

    return this.decryptEvent(dbEvent);
  }

  async updateEvent(userId: string, id: string, data: any) {
    const fields: any = {};
    if (data.groupId     !== undefined) fields.groupId     = data.groupId;
    if (data.title       !== undefined) fields.title       = this.enc.encrypt(data.title);
    if (data.date        !== undefined) fields.date        = data.date;
    if (data.startTime   !== undefined) fields.startTime   = data.startTime;
    if (data.endTime     !== undefined) fields.endTime     = data.endTime;
    if (data.description !== undefined) fields.description = data.description ? this.enc.encrypt(data.description) : null;

    const updated = await this.prisma.weekEvent.update({ where: { id }, data: fields });

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleRefreshToken && updated.googleEventId) {
        // Pass plaintext to Google
        await this.gcal.updateEvent(user.googleRefreshToken, updated.googleEventId, {
          title:       data.title       ?? this.dStr(updated.title),
          date:        updated.date,
          startTime:   updated.startTime,
          endTime:     updated.endTime,
          description: data.description ?? this.dStr(updated.description),
        });
      }
    } catch { /* Google sync is non-blocking */ }

    return this.decryptEvent(updated);
  }

  async removeEvent(userId: string, id: string) {
    const event = await this.prisma.weekEvent.findUnique({ where: { id } });
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleRefreshToken && event?.googleEventId) {
        await this.gcal.deleteEvent(user.googleRefreshToken, event.googleEventId);
      }
    } catch { /* Google sync is non-blocking */ }
    return this.prisma.weekEvent.delete({ where: { id } });
  }
}
