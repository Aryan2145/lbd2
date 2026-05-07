import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

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

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private enc:    EncryptionService,
  ) {}

  private dStr(v: unknown): string {
    if (typeof v !== 'string' || !v) return '';
    return this.enc.isEncrypted(v) ? this.enc.decrypt(v) : v;
  }
  private eMsgs(messages: any[]): string {
    return this.enc.encrypt(JSON.stringify(msgsToDB(messages)));
  }
  private dMsgs(v: unknown): any[] {
    if (typeof v === 'string' && this.enc.isEncrypted(v)) {
      try { return msgsFromDB(JSON.parse(this.enc.decrypt(v))); } catch { return []; }
    }
    return msgsFromDB((v as any[]) ?? []);
  }

  private toOut(row: any) {
    return {
      ...row,
      title:    this.dStr(row.subject),
      status:   statusFromDB(row.status),
      messages: this.dMsgs(row.messages),
    };
  }

  async findAll(userId: string) {
    const rows = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.toOut(r));
  }

  async create(userId: string, data: any) {
    const subject = data.title ?? data.subject ?? '';
    const row = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject:  this.enc.encrypt(subject),
        status:   statusToDB(data.status) as any,
        messages: this.eMsgs(data.messages ?? []),
      },
    });
    return this.toOut(row);
  }

  async update(id: string, data: any) {
    const fields: any = {};
    if (data.title    !== undefined) fields.subject  = this.enc.encrypt(data.title);
    if (data.subject  !== undefined) fields.subject  = this.enc.encrypt(data.subject);
    if (data.status   !== undefined) fields.status   = statusToDB(data.status) as any;
    if (data.messages !== undefined) fields.messages = this.eMsgs(data.messages);
    const row = await this.prisma.supportTicket.update({ where: { id }, data: fields });
    return this.toOut(row);
  }
}
