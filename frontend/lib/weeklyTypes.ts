export interface EventGroup {
  id: string;
  name: string;
  color: string;    // HEX e.g. "#6366F1"
  createdAt: number;
  archived?: boolean;
  kind?: string;    // "google" = auto-managed, hideable Google Calendar bucket
}

export interface WeekEvent {
  id: string;
  groupId: string;
  title: string;
  description: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM 24-h ("00:00" for all-day)
  endTime: string;    // HH:MM 24-h ("23:59" for all-day)
  allDay?: boolean;
  createdAt: number;
}

// Legacy id of the old shared "General" group. Kept only so pre-migration rows
// still read as the General bucket. The General group is now per-user and is
// identified by `kind === "general"`, never by this id.
export const GENERAL_GROUP_ID = "eg_general";

// True for a user's default "General" bucket. Prefer `kind`; fall back to the
// legacy shared id for any row created before the per-user migration.
export function isGeneralGroup(g: { id: string; kind?: string }): boolean {
  return g.kind === "general" || g.id === GENERAL_GROUP_ID;
}

// The id to assign to an event that has no explicit group: the current user's
// General bucket. Falls back to the legacy sentinel only before groups have
// loaded — the backend re-homes any unowned groupId to the real General bucket.
export function generalGroupId(groups: { id: string; kind?: string }[]): string {
  return groups.find(g => g.kind === "general")?.id ?? GENERAL_GROUP_ID;
}

export interface WeekPlan {
  weekStart: string;          // Monday ISO date YYYY-MM-DD
  outcomes: string[];
  doneOutcomes: string[];     // outcome texts that are marked complete
  dayNotes: Record<string, string>;
}
