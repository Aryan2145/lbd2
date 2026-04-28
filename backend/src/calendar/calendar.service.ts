import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  findGroups(userId: string) {
    return this.prisma.eventGroup.findMany({ where: { userId }, include: { events: true } });
  }

  createGroup(userId: string, data: any) {
    return this.prisma.eventGroup.create({ data: { userId, ...data } });
  }

  updateGroup(id: string, data: any) {
    return this.prisma.eventGroup.update({ where: { id }, data });
  }

  removeGroup(id: string) {
    return this.prisma.eventGroup.delete({ where: { id } });
  }

  createEvent(userId: string, data: any) {
    return this.prisma.weekEvent.create({ data: { userId, ...data } });
  }

  updateEvent(id: string, data: any) {
    return this.prisma.weekEvent.update({ where: { id }, data });
  }

  removeEvent(id: string) {
    return this.prisma.weekEvent.delete({ where: { id } });
  }
}
