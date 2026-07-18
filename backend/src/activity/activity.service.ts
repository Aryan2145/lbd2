import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// The six consistency heads and their cadence. Daily heads key on the day;
// weekly heads key on the Monday week-start — so editing a weekly artifact across
// several days still records one period.
const DAILY_HEADS  = ['daily_review', 'daily_plan', 'tasks', 'habits'] as const;
const WEEKLY_HEADS = ['weekly_plan', 'weekly_review'] as const;
const ALL_HEADS = [...DAILY_HEADS, ...WEEKLY_HEADS] as const;
type Head = (typeof ALL_HEADS)[number];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istNow(): Date { return new Date(Date.now() + IST_OFFSET_MS); }
function dayStr(d: Date): string { return d.toISOString().slice(0, 10); }
function mondayStr(d: Date): string {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return dayStr(x);
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  /** Idempotently record that the user acted on `head` in the current period. */
  async record(userId: string, head: string) {
    if (!ALL_HEADS.includes(head as Head)) {
      throw new BadRequestException(`Unknown activity head: ${head}`);
    }
    const now = istNow();
    const periodKey = (WEEKLY_HEADS as readonly string[]).includes(head)
      ? mondayStr(now)
      : dayStr(now);

    await this.prisma.consistencyActivity.upsert({
      where: { userId_head_periodKey: { userId, head, periodKey } },
      create: { userId, head, periodKey },
      update: {},
    });
    return { ok: true };
  }
}
