import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

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

  createEvent(userId: string, data: any) {
    const { groupId, title, date, startTime, endTime, description } = data;
    return this.prisma.weekEvent.create({
      data: { userId, groupId, title, date, startTime, endTime, description: description || null },
    });
  }

  updateEvent(id: string, data: any) {
    const fields: any = {};
    if (data.groupId     !== undefined) fields.groupId     = data.groupId;
    if (data.title       !== undefined) fields.title       = data.title;
    if (data.date        !== undefined) fields.date        = data.date;
    if (data.startTime   !== undefined) fields.startTime   = data.startTime;
    if (data.endTime     !== undefined) fields.endTime     = data.endTime;
    if (data.description !== undefined) fields.description = data.description || null;
    return this.prisma.weekEvent.update({ where: { id }, data: fields });
  }

  removeEvent(id: string) {
    return this.prisma.weekEvent.delete({ where: { id } });
  }
}
