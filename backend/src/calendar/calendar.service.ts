import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcalService } from '../gcal/gcal.service';

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private gcal: GcalService,
  ) {}

  findGroups(userId: string) {
    return this.prisma.eventGroup.findMany({ where: { userId }, include: { events: true } });
  }

  createGroup(userId: string, data: any) {
    const { id, name, color } = data;
    return this.prisma.eventGroup.create({
      data: { ...(id ? { id } : {}), userId, name, color },
      include: { events: true },
    });
  }

  updateGroup(id: string, data: any) {
    const fields: any = {};
    if (data.name  !== undefined) fields.name  = data.name;
    if (data.color !== undefined) fields.color = data.color;
    return this.prisma.eventGroup.update({ where: { id }, data: fields });
  }

  removeGroup(id: string) {
    return this.prisma.eventGroup.delete({ where: { id } });
  }

  async createEvent(userId: string, data: any) {
    const { groupId, title, date, startTime, endTime, description } = data;
    const dbEvent = await this.prisma.weekEvent.create({
      data: { userId, groupId, title, date, startTime, endTime, description: description || null },
    });

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleRefreshToken) {
        const googleEventId = await this.gcal.createEvent(user.googleRefreshToken, { title, date, startTime, endTime, description });
        return this.prisma.weekEvent.update({ where: { id: dbEvent.id }, data: { googleEventId } });
      }
    } catch { /* Google sync is non-blocking */ }

    return dbEvent;
  }

  async updateEvent(userId: string, id: string, data: any) {
    const fields: any = {};
    if (data.groupId     !== undefined) fields.groupId     = data.groupId;
    if (data.title       !== undefined) fields.title       = data.title;
    if (data.date        !== undefined) fields.date        = data.date;
    if (data.startTime   !== undefined) fields.startTime   = data.startTime;
    if (data.endTime     !== undefined) fields.endTime     = data.endTime;
    if (data.description !== undefined) fields.description = data.description || null;

    const updated = await this.prisma.weekEvent.update({ where: { id }, data: fields });

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleRefreshToken && updated.googleEventId) {
        await this.gcal.updateEvent(user.googleRefreshToken, updated.googleEventId, {
          title: updated.title,
          date: updated.date,
          startTime: updated.startTime,
          endTime: updated.endTime,
          description: updated.description,
        });
      }
    } catch { /* Google sync is non-blocking */ }

    return updated;
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
