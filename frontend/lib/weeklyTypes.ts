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

export const GENERAL_GROUP_ID = "eg_general";

export interface WeekPlan {
  weekStart: string;          // Monday ISO date YYYY-MM-DD
  outcomes: string[];
  doneOutcomes: string[];     // outcome texts that are marked complete
  dayNotes: Record<string, string>;
}
