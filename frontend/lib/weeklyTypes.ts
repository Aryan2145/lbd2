export interface EventGroup {
  id: string;
  name: string;
  color: string;    // HEX e.g. "#6366F1"
  createdAt: number;
  archived?: boolean;
}

export interface WeekEvent {
  id: string;
  groupId: string;
  title: string;
  description: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM 24-h
  endTime: string;    // HH:MM 24-h
  createdAt: number;
}

export const GENERAL_GROUP_ID = "eg_general";

export interface WeekPlan {
  weekStart: string;          // Monday ISO date YYYY-MM-DD
  priorities: string[];       // ordered, max 5
  outcomes: string[];
  doneOutcomes: string[];     // outcome texts that are marked complete
  dayNotes: Record<string, string>;
  dayThemes: Record<string, string>;
}
