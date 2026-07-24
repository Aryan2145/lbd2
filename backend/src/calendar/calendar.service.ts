import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { GcalService } from '../gcal/gcal.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

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

  // The per-user "General" bucket — the default home for events created without
  // an explicit group. Found by `kind` (never by a shared id), so it is strictly
  // per-user and can never collide across accounts. Mirrors ensureGoogleGroup.
  private async ensureGeneralGroup(userId: string) {
    const existing = await this.prisma.eventGroup.findFirst({ where: { userId, kind: 'general' } });
    if (existing) return existing;
    return this.prisma.eventGroup.create({
      data: { userId, kind: 'general', name: this.enc.encrypt('General'), color: '#9CA3AF' },
    });
  }

  // Resolve the group an event should belong to: the requested group only if the
  // caller owns it, otherwise the caller's own General bucket. This is what stops
  // an event from ever being attached to another user's group (the root cause of
  // the cross-user leak — a client that sent a shared/foreign groupId).
  private async resolveGroupId(userId: string, groupId?: string): Promise<string> {
    if (groupId) {
      const g = await this.prisma.eventGroup.findFirst({ where: { id: groupId, userId } });
      if (g) return g.id;
    }
    return (await this.ensureGeneralGroup(userId)).id;
  }

  async findGroups(userId: string) {
    await this.ensureGeneralGroup(userId); // guarantee a per-user General bucket exists
    const rows = await this.prisma.eventGroup.findMany({
      where: { userId },
      // Scope nested events to the same user as a defence in depth: even if a
      // stray cross-user row exists, the join can never surface it under another
      // account. `include: { events: true }` alone joins by groupId only.
      include: { events: { where: { userId } } },
    });
    return rows.map(g => this.decryptGroup(g));
  }

  async createGroup(userId: string, data: any) {
    // Ignore any client-supplied `id` — ids are always server-generated so two
    // users can never end up owning/sharing the same group id.
    const { name, color } = data;
    const row = await this.prisma.eventGroup.create({
      data: { userId, name: this.enc.encrypt(name), color },
      include: { events: { where: { userId } } },
    });
    return this.decryptGroup(row);
  }

  async updateGroup(userId: string, id: string, data: any) {
    const fields: any = {};
    if (data.name     !== undefined) fields.name     = this.enc.encrypt(data.name);
    if (data.color    !== undefined) fields.color    = data.color;
    if (data.archived !== undefined) fields.archived = data.archived;
    // Scoped by userId: a non-owner's update matches zero rows (no-op).
    await this.prisma.eventGroup.updateMany({ where: { id, userId }, data: fields });
    const row = await this.prisma.eventGroup.findFirst({ where: { id, userId } });
    return row ? this.decryptGroup(row) : null;
  }

  removeGroup(userId: string, id: string) {
    // Scoped by userId so a user can only ever delete their own groups.
    return this.prisma.eventGroup.deleteMany({ where: { id, userId } });
  }

  async createEvent(userId: string, data: any) {
    const { title, date, startTime, endTime, description } = data;
    const groupId = await this.resolveGroupId(userId, data.groupId);
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
        const { id: googleEventId, updated } = await this.gcal.createEvent(user.googleRefreshToken, {
          title, date, startTime, endTime, description,
        });
        return this.decryptEvent(
          await this.prisma.weekEvent.update({
            where: { id: dbEvent.id },
            data: { googleEventId, googleUpdatedAt: updated },
          }),
        );
      }
    } catch (err: any) {
      this.logger.error(`GCal createEvent failed for user ${userId}: ${err?.message ?? err}`);
    }

    return this.decryptEvent(dbEvent);
  }

  async updateEvent(userId: string, id: string, data: any) {
    // Ownership gate: only touch the event if it belongs to the caller.
    const owned = await this.prisma.weekEvent.findFirst({ where: { id, userId } });
    if (!owned) return null;

    const fields: any = {};
    // Re-target only to a group the caller owns (else fall back to their General).
    if (data.groupId     !== undefined) fields.groupId     = await this.resolveGroupId(userId, data.groupId);
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
        const gUpdated = await this.gcal.updateEvent(user.googleRefreshToken, updated.googleEventId, {
          title:       data.title       ?? this.dStr(updated.title),
          date:        updated.date,
          startTime:   updated.startTime,
          endTime:     updated.endTime,
          description: data.description ?? this.dStr(updated.description),
        });
        // Record the new stamp so the reverse sync recognises this as our echo.
        await this.prisma.weekEvent.update({ where: { id }, data: { googleUpdatedAt: gUpdated } });
      }
    } catch (err: any) {
      this.logger.error(`GCal updateEvent failed for user ${userId}: ${err?.message ?? err}`);
    }

    return this.decryptEvent(updated);
  }

  async removeEvent(userId: string, id: string) {
    // Ownership gate: never delete an event that isn't the caller's.
    const event = await this.prisma.weekEvent.findFirst({ where: { id, userId } });
    if (!event) return { count: 0 };
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.googleRefreshToken && event?.googleEventId) {
        await this.gcal.deleteEvent(user.googleRefreshToken, event.googleEventId);
      }
    } catch (err: any) {
      this.logger.error(`GCal deleteEvent failed for user ${userId}: ${err?.message ?? err}`);
    }
    return this.prisma.weekEvent.delete({ where: { id } });
  }

  // ── Reverse sync: Google → app, one week at a time ──────────────────────────

  // Add days to a YYYY-MM-DD string without touching local timezone.
  private addDaysStr(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }

  // The hideable bucket that holds events created directly in Google. Found by
  // `kind` (not a shared id), so it's safely per-user and survives renames.
  private async ensureGoogleGroup(userId: string) {
    const existing = await this.prisma.eventGroup.findFirst({ where: { userId, kind: 'google' } });
    if (existing) return existing;
    return this.prisma.eventGroup.create({
      data: { userId, kind: 'google', name: this.enc.encrypt('Google Calendar'), color: '#4285F4' },
    });
  }

  // Pull one week from Google and reconcile it into the app. Called on page open,
  // on week navigation, and on manual refresh. Returns the fresh group+event tree
  // so the client can drop it straight into state.
  async syncGoogleWeek(userId: string, weekStart: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleRefreshToken) return this.findGroups(userId); // not connected — no-op

    const weekEndStr = this.addDaysStr(weekStart, 6);
    const timeMin = `${weekStart}T00:00:00+05:30`;
    const timeMax = `${this.addDaysStr(weekStart, 7)}T00:00:00+05:30`;

    let gEvents;
    try {
      gEvents = await this.gcal.listEvents(user.googleRefreshToken, timeMin, timeMax);
    } catch (err: any) {
      this.logger.error(`GCal listEvents failed for user ${userId}: ${err?.message ?? err}`);
      return this.findGroups(userId); // fail soft — never wipe local state on a fetch error
    }

    const googleGroup = await this.ensureGoogleGroup(userId);

    // Local events in this week that originated from / are mirrored to Google.
    const localSynced = await this.prisma.weekEvent.findMany({
      where: { userId, googleEventId: { not: null }, date: { gte: weekStart, lte: weekEndStr } },
    });
    const localByGid = new Map(localSynced.map(e => [e.googleEventId!, e]));
    const seen = new Set<string>();

    for (const ge of gEvents) {
      if (ge.cancelled) continue; // absence handles deletions below
      seen.add(ge.googleEventId);
      const existing = localByGid.get(ge.googleEventId);

      if (existing) {
        // Same stamp we last recorded → our own push echoing back → skip.
        if (existing.googleUpdatedAt && existing.googleUpdatedAt === ge.updated) continue;
        // Otherwise Google changed it since we last synced → most-recent-wins → apply.
        await this.prisma.weekEvent.update({
          where: { id: existing.id },
          data: {
            title:           this.enc.encrypt(ge.title),
            description:     ge.description ? this.enc.encrypt(ge.description) : null,
            date:            ge.date,
            startTime:       ge.startTime,
            endTime:         ge.endTime,
            allDay:          ge.allDay,
            googleUpdatedAt: ge.updated,
          },
        });
      } else {
        // New Google-side event → import into the hideable Google group.
        // Skip spanning events that merely overlap the window but start elsewhere.
        if (ge.date < weekStart || ge.date > weekEndStr) continue;
        await this.prisma.weekEvent.create({
          data: {
            userId, groupId: googleGroup.id,
            title:           this.enc.encrypt(ge.title),
            description:     ge.description ? this.enc.encrypt(ge.description) : null,
            date:            ge.date,
            startTime:       ge.startTime,
            endTime:         ge.endTime,
            allDay:          ge.allDay,
            googleEventId:   ge.googleEventId,
            googleUpdatedAt: ge.updated,
          },
        });
      }
    }

    // Deletion detection: a mirrored local event Google no longer returns for
    // this week was deleted (or moved out) in Google → remove it locally.
    // Guard against a truncated page (cap hit) wrongly nuking the week.
    if (gEvents.length < 250) {
      for (const local of localSynced) {
        if (!seen.has(local.googleEventId!)) {
          await this.prisma.weekEvent.delete({ where: { id: local.id } });
        }
      }
    }

    return this.findGroups(userId);
  }
}
