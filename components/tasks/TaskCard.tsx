"use client";

import { CheckCircle2, XCircle, RefreshCw, Clock } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type EisenhowerQ  = "Q1" | "Q2" | "Q3" | "Q4";
export type TaskStatus   = "open" | "complete" | "incomplete";

export interface TaskData {
  id:            string;
  kind:          "one-time" | "instance";
  parentId?:     string;          // instance → template id
  title:         string;
  description:   string;
  deadline:      string;          // YYYY-MM-DD
  quadrant:      EisenhowerQ;
  status:        TaskStatus;
  closedAt?:     number;
  variance?:     number;          // days late (+) or early (-) at close
  createdAt:     number;
  linkedGoalId:  string;
}

export interface RecurringTemplate {
  id:             string;
  title:          string;
  description:    string;
  quadrant:       EisenhowerQ;
  scheduleType:   "daily" | "weekly" | "monthly" | "yearly";
  every:          number;         // interval (e.g. every 2 weeks)
  days:           number[];       // weekly: [0-6] (0=Sun)
  monthDay:       number;         // monthly/yearly: day of month (1-31)
  month:          number;         // yearly: month index (0-11)
  time:           string;         // "HH:MM" or ""
  startDate:      string;         // YYYY-MM-DD
  endCondition:   "never" | "on-date" | "after-n";
  endDate:        string;
  endAfter:       number;
  occurrenceCount: number;
  active:         boolean;
  linkedGoalId:   string;
  createdAt:      number;
}

// ── Shared constants ──────────────────────────────────────────────────────────
export const Q_META: Record<EisenhowerQ, { label: string; sub: string; color: string; bg: string; border: string }> = {
  Q1: { label: "Do",       sub: "Urgent + Important",      color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
  Q2: { label: "Schedule", sub: "Not Urgent + Important",  color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
  Q3: { label: "Delegate", sub: "Urgent + Not Important",  color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  Q4: { label: "Eliminate",sub: "Not Urgent + Not Important", color: "#6B7280", bg: "#F9FAFB", border: "#D1D5DB" },
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
  task:       TaskData;
  onClick?:   () => void;
  onComplete: (id: string) => void;
  onMiss:     (id: string) => void;
}

export default function TaskCard({ task, onClick, onComplete, onMiss }: Props) {
  const qMeta    = Q_META[task.quadrant];
  const days     = daysUntil(task.deadline);
  const overdue  = days < 0 && task.status === "open";
  const isClosed = task.status !== "open";

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isClosed ? "#FAFAFA" : "#FFFFFF",
        borderRadius: "10px",
        border: `1px solid ${overdue ? "#FCA5A5" : "#EDE5D8"}`,
        borderLeft: `3px solid ${isClosed ? "#D1D5DB" : qMeta.color}`,
        padding: "11px 12px",
        cursor: onClick ? "pointer" : "default",
        opacity: isClosed ? 0.65 : 1,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(28,25,23,0.08)";
      }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "4px" }}>
        {task.kind === "instance" && (
          <RefreshCw size={10} color="#A8A29E" style={{ marginTop: "3px", flexShrink: 0 }} />
        )}
        <p style={{
          fontSize: "12px", fontWeight: 700, color: isClosed ? "#9CA3AF" : "#1C1917",
          lineHeight: 1.35, margin: 0, flex: 1,
          textDecoration: task.status === "complete" ? "line-through" : "none",
        }}>
          {task.title}
        </p>
        {isClosed && (
          <span style={{
            fontSize: "9px", fontWeight: 700, flexShrink: 0,
            padding: "2px 6px", borderRadius: "20px",
            color: task.status === "complete" ? "#16A34A" : "#6B7280",
            backgroundColor: task.status === "complete" ? "#F0FDF4" : "#F3F4F6",
          }}>
            {task.status === "complete" ? "Done" : "Closed"}
          </span>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p style={{ fontSize: "11px", color: "#78716C", lineHeight: 1.4, margin: "0 0 6px",
          display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.description}
        </p>
      )}

      {/* Deadline row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Clock size={10} color={overdue ? "#DC2626" : "#A8A29E"} />
          <span style={{ fontSize: "10px", fontWeight: 500,
            color: overdue ? "#DC2626" : "#78716C" }}>
            {overdue
              ? `${Math.abs(days)} days overdue`
              : days === 0 ? "Due today"
              : days === 1 ? "Due tomorrow"
              : fmtDeadline(task.deadline)}
          </span>
        </div>

        {/* Action buttons */}
        {task.status === "open" && (
          <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onComplete(task.id)}
              title="Mark complete"
              style={{
                display: "flex", alignItems: "center", gap: "3px",
                padding: "3px 8px", borderRadius: "6px", border: "none",
                backgroundColor: "#F0FDF4", cursor: "pointer", fontSize: "10px",
                fontWeight: 600, color: "#16A34A",
              }}>
              <CheckCircle2 size={11} /> Done
            </button>
            <button
              onClick={() => onMiss(task.id)}
              title="Close as incomplete"
              style={{
                display: "flex", alignItems: "center", gap: "3px",
                padding: "3px 8px", borderRadius: "6px", border: "none",
                backgroundColor: "#F3F4F6", cursor: "pointer", fontSize: "10px",
                fontWeight: 600, color: "#6B7280",
              }}>
              <XCircle size={11} /> Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
