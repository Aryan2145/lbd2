import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Leaderboard scoring — cumulative points, never out of 100.
 *
 *   TOTAL = Setup points (earned once, from current state)
 *         + Consistency points (accrue forever, from the activity ledger)
 *
 * GOLDEN RULE: measure the verb, not the noun — presence/counts/activity only,
 * never a goal's progress % and never the content of anything a user wrote.
 */

// ── Setup point values ──────────────────────────────────────────────────────────
const SETUP = {
  legacy: 100,   // legacy cards filled + purpose written + LOCKED (sealed)
  vision: 100,   // every life-area card complete WITH an image
  values: 50,    // all 5 core values selected
  bucket: 50,    // ≥1 bucket item
  goals:  50,    // 7 per life area with a goal (+1 on the 7th) → 50
  habits: 50,    // 7 per life area with a habit (+1 on the 7th) → 50
};
const AREA_STEP = 7;
const AREAS_FULL = 7; // seven life areas

// 7 per covered area, +1 bonus once all seven are covered, capped at 50.
function areaPoints(coveredAreas: number): number {
  if (coveredAreas <= 0) return 0;
  const base = coveredAreas * AREA_STEP + (coveredAreas >= AREAS_FULL ? 1 : 0);
  return Math.min(50, base);
}

// ── Consistency point values (per recorded period) ──────────────────────────────
const CONSISTENCY: Record<string, number> = {
  weekly_plan:   10, // per week
  weekly_review: 10, // per week
  daily_review:   5, // per day
  daily_plan:     5, // per day
  tasks:          3, // per day
  habits:         3, // per day
};
const CONSISTENCY_ORDER = ['weekly_plan', 'weekly_review', 'daily_review', 'daily_plan', 'tasks', 'habits'];

const NEW_JOINER_DAYS = 14;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const hasStr = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0;

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async board(groupKey?: string) {
    const [scored, groups] = await Promise.all([this.scoreAll(), this.prisma.group.findMany({ orderBy: { createdAt: 'asc' } })]);

    // ── Group grid cards (Overall + Ungrouped + each group) ──
    const card = (name: string, color: string, members: any[], extra: object = {}) => ({
      name, color,
      count: members.length,
      avgScore: members.length ? Math.round(members.reduce((a, m) => a + m.total, 0) / members.length) : 0,
      top3: members.slice().sort((a, b) => b.total - a.total).slice(0, 3).map(m => ({ id: m.id, name: m.name, total: m.total })),
      ...extra,
    });

    const grid: any[] = [card('Overall', '#0F172A', scored, { key: 'overall', system: true })];
    if (groups.length > 0) {
      const ungrouped = scored.filter(u => !u.group);
      grid.push(card('Ungrouped', '#94A3B8', ungrouped, { key: 'ungrouped', system: true }));
    }
    for (const g of groups) {
      const members = scored.filter(u => u.group?.id === g.id);
      grid.push(card(g.name, g.color, members, { key: g.id, id: g.id, system: false }));
    }

    // ── Selected group's ranked list ──
    const selected = groupKey || 'overall';
    let list = scored;
    if (selected === 'ungrouped') list = scored.filter(u => !u.group);
    else if (selected !== 'overall') list = scored.filter(u => u.group?.id === selected);

    list = list.slice().sort((a, b) => b.total - a.total);
    list.forEach((u, i) => (u.rank = i + 1));

    return { groups: grid, selected, users: list };
  }

  // ── Score every user ─────────────────────────────────────────────────────────
  private async scoreAll() {
    const now = new Date(Date.now() + IST_OFFSET_MS);

    const users = await this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true, createdAt: true,
        group: { select: { id: true, name: true, color: true } },
        legacyCanvas: { select: { isSealed: true } },
        visionCanvas: { select: { areas: true } },
        valuesBoard:  { select: { selected: true } },
        goals:  { select: { area: true } },
        habits: { select: { area: true } },
        activity: { select: { head: true } },
        _count: { select: { bucketEntries: true } },
      },
    });

    return users.map(u => this.scoreUser(u, now));
  }

  private scoreUser(u: any, now: Date) {
    // ── Setup (live / current-state) ──
    const legacyDone = !!u.legacyCanvas?.isSealed;

    const areas = Array.isArray(u.visionCanvas?.areas) ? u.visionCanvas.areas : [];
    const completeAreas = areas.filter((a: any) => hasStr(a?.text) && hasStr(a?.imageUrl)).length;
    const visionDone = completeAreas >= AREAS_FULL;

    const selectedValues = Array.isArray(u.valuesBoard?.selected) ? u.valuesBoard.selected : [];
    const valuesDone = selectedValues.length >= 5;

    const bucketDone = u._count.bucketEntries >= 1;

    const goalAreas  = new Set(u.goals.map((g: any) => g.area)).size;
    const habitAreas = new Set(u.habits.map((h: any) => h.area)).size;

    const setup = {
      legacy: { points: legacyDone ? SETUP.legacy : 0, max: SETUP.legacy, done: legacyDone },
      vision: { points: visionDone ? SETUP.vision : 0, max: SETUP.vision, done: visionDone },
      values: { points: valuesDone ? SETUP.values : 0, max: SETUP.values, done: valuesDone },
      bucket: { points: bucketDone ? SETUP.bucket : 0, max: SETUP.bucket, done: bucketDone },
      goals:  { points: areaPoints(goalAreas),  max: SETUP.goals,  areas: goalAreas },
      habits: { points: areaPoints(habitAreas), max: SETUP.habits, areas: habitAreas },
    };
    const setupTotal = Object.values(setup).reduce((a, s) => a + s.points, 0);

    // ── Consistency (from the activity ledger) ──
    const counts: Record<string, number> = {};
    for (const row of u.activity) counts[row.head] = (counts[row.head] ?? 0) + 1;

    const consistency: Record<string, { periods: number; points: number }> = {};
    let consistencyTotal = 0;
    for (const head of CONSISTENCY_ORDER) {
      const periods = counts[head] ?? 0;
      const points = periods * CONSISTENCY[head];
      consistency[head] = { periods, points };
      consistencyTotal += points;
    }

    const daysSince = Math.floor((now.getTime() - new Date(u.createdAt).getTime()) / 86_400_000);

    return {
      id: u.id, name: u.name, email: u.email,
      group: u.group ?? null,
      rank: 0,
      total: setupTotal + consistencyTotal,
      setupTotal,
      consistencyTotal,
      isNewJoiner: daysSince < NEW_JOINER_DAYS,
      setup,
      consistency,
    };
  }
}
