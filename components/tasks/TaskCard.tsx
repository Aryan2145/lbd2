"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
// RECURRING_DISABLED: import { RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type EisenhowerQ  = "Q1" | "Q2" | "Q3" | "Q4";
export type TaskStatus   = "open" | "complete" | "incomplete";

export interface TaskData {
  id:                 string;
  kind:               "one-time" | "instance";
  parentId?:          string;
  title:              string;
  description:        string;
  deadline:           string;          // YYYY-MM-DD
  quadrant:           EisenhowerQ;
  status:             TaskStatus;
  closedAt?:          number;
  variance?:          number;
  createdAt:          number;
  linkedGoalId:       string;
  linkedMilestoneId?: string;          // "" or undefined = none
}

/* RECURRING_DISABLED — RecurringTemplate feature removed from UI; type kept for data compatibility
export interface RecurringTemplate {
  id:             string;
  title:          string;
  description:    string;
  quadrant:       EisenhowerQ;
  scheduleType:   "daily" | "weekly" | "monthly" | "yearly";
  every:          number;
  days:           number[];
  monthDay:       number;
  month:          number;
  time:           string;
  startDate:      string;
  endCondition:   "never" | "on-date" | "after-n";
  endDate:        string;
  endAfter:       number;
  occurrenceCount: number;
  active:         boolean;
  linkedGoalId:   string;
  createdAt:      number;
}
RECURRING_DISABLED */
// Stub type kept so existing imports compile without changes
export interface RecurringTemplate {
  id: string; title: string; description: string; quadrant: EisenhowerQ;
  scheduleType: "daily" | "weekly" | "monthly" | "yearly"; every: number;
  days: number[]; monthDay: number; month: number; time: string;
  startDate: string; endCondition: "never" | "on-date" | "after-n";
  endDate: string; endAfter: number; occurrenceCount: number;
  active: boolean; linkedGoalId: string; createdAt: number;
}

// ── Shared constants ──────────────────────────────────────────────────────────
export const Q_META: Record<EisenhowerQ, { label: string; sub: string; color: string; bg: string; border: string }> = {
  Q1: { label: "Do It Now",  sub: "Urgent + Important",         color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
  Q2: { label: "Scheduled",  sub: "Not Urgent + Important",     color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
  Q3: { label: "Delegated",  sub: "Urgent + Not Important",     color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  Q4: { label: "Dropped",    sub: "Not Urgent + Not Important", color: "#6B7280", bg: "#F9FAFB", border: "#D1D5DB" },
};

export function toTaskDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
}

export function fmtDeadline(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US",
    { month: "short", day: "numeric", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  task:             TaskData;
  onClick?:         () => void;
  onComplete:       (id: string) => void;
  onMiss:           (id: string) => void;
  displayQuadrant?: EisenhowerQ;
}

export default function TaskCard({ task, onClick, onComplete, onMiss, displayQuadrant }: Props) {
  const qMeta    = Q_META[displayQuadrant ?? task.quadrant];
  const days     = daysUntil(task.deadline);
  const overdue  = days < 0 && task.status === "open";
  const isClosed = task.status !== "open";

  const deadlineText = overdue
    ? `${Math.abs(days)}d overdue`
    : days === 0  ? "Due today"
    : days === 1  ? "Tomorrow"
    : fmtDeadline(task.deadline);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isClosed ? "#FAFAFA" : "#FFFFFF",
        borderRadius: "8px",
        border: `1px solid ${overdue ? "#FCA5A5" : "#EDE5D8"}`,
        borderLeft: `3px solid ${isClosed ? "#D1D5DB" : qMeta.color}`,
        padding: "5px 9px",
        cursor: onClick ? "pointer" : "default",
        opacity: isClosed ? 0.65 : 1,
        display: "flex",
        alignItems: "center",
        gap: "7px",
        minHeight: "34px",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(28,25,23,0.08)";
      }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      {/* RECURRING_DISABLED — recurring instance icon
      {task.kind === "instance" && (
        <RefreshCw size={9} color="#A8A29E" style={{ flexShrink: 0 }} />
      )} */}

      {/* Title — single line, truncated */}
      <p style={{
        flex: 1, minWidth: 0,
        fontSize: "12px", fontWeight: 600,
        color: isClosed ? "#9CA3AF" : "#1C1917",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        textDecoration: task.status === "complete" ? "line-through" : "none",
        margin: 0,
      }}>
        {task.title}
      </p>

      {/* Right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        {/* Milestone indicator */}
        {task.linkedMilestoneId && (
          <span title="Linked to milestone" style={{
            fontSize: "9px", fontWeight: 700,
            color: "#D97706", backgroundColor: "#FFFBEB",
            padding: "1px 4px", borderRadius: "3px",
            border: "1px solid #FCD34D",
          }}>
            ◆
          </span>
        )}
        {/* Deadline badge */}
        <span style={{
          fontSize: "9px", fontWeight: 600, whiteSpace: "nowrap",
          color: overdue ? "#DC2626" : "#78716C",
          backgroundColor: overdue ? "#FEF2F2" : "#F5F5F4",
          padding: "1px 5px", borderRadius: "4px",
        }}>
          {deadlineText}
        </span>

        {/* Closed status badge */}
        {isClosed && (
          <span style={{
            fontSize: "9px", fontWeight: 700,
            padding: "1px 5px", borderRadius: "4px",
            color: task.status === "complete" ? "#16A34A" : "#6B7280",
            backgroundColor: task.status === "complete" ? "#F0FDF4" : "#F3F4F6",
          }}>
            {task.status === "complete" ? "Done" : "Closed"}
          </span>
        )}

        {/* Action buttons (icon-only) */}
        {task.status === "open" && (
          <div style={{ display: "flex", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onComplete(task.id)}
              title="Mark done"
              style={{
                width: 22, height: 22, borderRadius: "5px", border: "none",
                backgroundColor: "#F0FDF4", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={13} color="#16A34A" />
            </button>
            <button
              onClick={() => onMiss(task.id)}
              title="Mark missed"
              style={{
                width: 22, height: 22, borderRadius: "5px", border: "none",
                backgroundColor: "#F3F4F6", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <XCircle size={13} color="#6B7280" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
