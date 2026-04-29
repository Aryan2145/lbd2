import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function statusToDB(s: string)   { return s === 'in-progress' ? 'in_progress' : (s ?? 'open'); }
function statusFromDB(s: string) { return s === 'in_progress' ? 'in-progress' : s; }

function msgsToDB(messages: any[]) {
  return (messages ?? []).map((m: any) => ({
    id: m.id, role: m.authorType ?? m.role ?? 'user',
    content: m.body ?? m.content ?? '', createdAt: m.createdAt,
  }));
}

function msgsFromDB(messages: any[]) {
  return (messages ?? []).map((m: any) => ({
    id: m.id, authorType: m.role ?? m.authorType ?? 'user',
    body: m.content ?? m.body ?? '', createdAt: m.createdAt,
  }));
}

function toOut(row: any) {
  return { ...row, title: row.subject, status: statusFromDB(row.status), messages: msgsFromDB(row.messages as any[] ?? []) };
}

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const rows = await this.prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toOut);
  }

  async create(userId: string, data: any) {
    const subject  = data.title ?? data.subject ?? '';
    const row = await this.prisma.supportTicket.create({
      data: { userId, subject, status: statusToDB(data.status) as any, messages: msgsToDB(data.messages ?? []) },
    });
    return toOut(row);
  }

  async update(id: string, data: any) {
    const fields: any = {};
    if (data.title    !== undefined) fields.subject  = data.title;
    if (data.subject  !== undefined) fields.subject  = data.subject;
    if (data.status   !== undefined) fields.status   = statusToDB(data.status) as any;
    if (data.messages !== undefined) fields.messages = msgsToDB(data.messages);
    const row = await this.prisma.supportTicket.update({ where: { id }, data: fields });
    return toOut(row);
  }
}
