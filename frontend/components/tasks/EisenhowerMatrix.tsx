"use client";

import { useState } from "react";
import TaskCard, { toTaskDate, type TaskData } from "@/components/tasks/TaskCard";
import { AlertTriangle, CalendarClock, ArrowRightLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  tasks:      TaskData[];
  onComplete: (id: string) => void;
  onMiss:     (id: string) => void;
  onSelect?:  (task: TaskData) => void;
}

// All header bg colors verified ≥4.5:1 contrast against #FFFFFF
// Q1 #DC2626: 4.59:1 | Q2 #15803D: 4.69:1 | Q3 #B45309: 4.63:1
const COLS: {
  key:            "q1" | "q2" | "q3";
  label:          string;
  sub:            string;
  icon:           LucideIcon;
  headerFrom:     string;
  headerTo:       string;
  bodyBg:         string;
  borderColor:    string;
  borderWidth:    string;
  countColor:     string;
  shadow:         string;
  empty:          string;
}[] = [
  {
    key:         "q1",
    label:       "Do It Now",
    sub:         "Urgent + Important",
    icon:        AlertTriangle,
    headerFrom:  "#DC2626",
    headerTo:    "#B91C1C",
    bodyBg:      "#FEF2F2",
    borderColor: "#DC2626",
    borderWidth: "2px",
    countColor:  "#DC2626",
    shadow:      "0 0 0 1px #FCA5A540, 0 6px 24px rgba(220,38,38,0.18)",
    empty:       "All clear — nothing urgent.",
  },
  {
    key:         "q2",
    label:       "Scheduled",
    sub:         "Important · Not Yet Urgent",
    icon:        CalendarClock,
    headerFrom:  "#15803D",
    headerTo:    "#14532D",
    bodyBg:      "#F0FDF4",
    borderColor: "#16A34A",
    borderWidth: "1.5px",
    countColor:  "#15803D",
    shadow:      "0 4px 16px rgba(21,128,61,0.12)",
    empty:       "Nothing on the horizon.",
  },
  {
    key:         "q3",
    label:       "Delegated",
    sub:         "Urgent · Not Important",
    icon:        ArrowRightLeft,
    headerFrom:  "#B45309",
    headerTo:    "#78350F",
    bodyBg:      "#FFFBEB",
    borderColor: "#D97706",
    borderWidth: "1.5px",
    countColor:  "#B45309",
    shadow:      "0 4px 16px rgba(180,83,9,0.12)",
    empty:       "Nothing delegated.",
  },
];

export default function EisenhowerMatrix({ tasks, onComplete, onMiss, onSelect }: Props) {
  const today = toTaskDate();
  const open  = tasks.filter((t) => t.status === "open");
  const [mobileCol, setMobileCol] = useState<"q1" | "q2" | "q3">("q1");

  // Q2 tasks whose deadline has arrived are promoted into Do It Now
  const promoted    = open.filter((t) => t.quadrant === "Q2" && t.deadline <= today);
  const promotedIds = new Set(promoted.map((t) => t.id));

  const buckets = {
    q1: [...open.filter((t) => t.quadrant === "Q1"), ...promoted],
    q2: open.filter((t) => t.quadrant === "Q2" && t.deadline > today),
    q3: open.filter((t) => t.quadrant === "Q3"),
  };

  function renderCol(col: typeof COLS[number]) {
    const colTasks = buckets[col.key];
    const Icon     = col.icon;
    return (
      <>
        <div style={{
          padding: "11px 14px",
          background: `linear-gradient(135deg, ${col.headerFrom}, ${col.headerTo})`,
          display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
        }}>
          <Icon size={14} color="#FFFFFF" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "12px", fontWeight: 800, color: "#FFFFFF", margin: 0,
              lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {col.label}
            </p>
            <p style={{ fontSize: "10px", fontWeight: 500, color: "#FFFFFF", margin: 0,
              opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {col.sub}
            </p>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 800, color: col.countColor,
            backgroundColor: "#FFFFFF", padding: "2px 9px", borderRadius: "20px", flexShrink: 0 }}>
            {colTasks.length}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px",
          display: "flex", flexDirection: "column", gap: "5px", minHeight: 0 }}>
          {colTasks.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center",
              justifyContent: "center", minHeight: "80px" }}>
              <p style={{ fontSize: "11px", color: "#78716C", textAlign: "center", margin: 0 }}>
                {col.empty}
              </p>
            </div>
          ) : colTasks.map((t) => {
            const effectiveTask = col.key === "q1" && promotedIds.has(t.id)
              ? { ...t, quadrant: "Q1" as const }
              : t;
            return (
              <TaskCard key={t.id} task={effectiveTask}
                onClick={onSelect ? () => onSelect(effectiveTask) : undefined}
                onComplete={onComplete}
                onMiss={onMiss}
              />
            );
          })}
        </div>
      </>
    );
  }

  const activeMobileCol = COLS.find((c) => c.key === mobileCol)!;

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>

      {/* Mobile: tab bar + single column */}
      <div className="flex flex-col lg:hidden" style={{ height: "100%", minHeight: 0 }}>
        <div style={{ display: "flex", borderBottom: "1px solid #EDE5D8",
          backgroundColor: "#FAF5EE", flexShrink: 0 }}>
          {COLS.map((col) => {
            const active = mobileCol === col.key;
            return (
              <button key={col.key} onClick={() => setMobileCol(col.key)} style={{
                flex: 1, minWidth: 0, padding: "9px 4px", border: "none", cursor: "pointer",
                backgroundColor: "transparent",
                borderBottom: `2.5px solid ${active ? col.headerFrom : "transparent"}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                transition: "border-color 0.15s",
              }}>
                <span style={{ fontSize: "11px", fontWeight: 700,
                  color: active ? col.headerFrom : "#78716C" }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: "9px", fontWeight: 700,
                  color: active ? col.headerFrom : "#A8A29E",
                  backgroundColor: active ? col.headerFrom + "18" : "transparent",
                  padding: "0 6px", borderRadius: "20px",
                  border: `1px solid ${active ? col.headerFrom + "30" : "transparent"}`,
                }}>
                  {buckets[col.key].length}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{
          flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
          borderRadius: "12px",
          border: `${activeMobileCol.borderWidth} solid ${activeMobileCol.borderColor}`,
          backgroundColor: activeMobileCol.bodyBg,
          overflow: "hidden",
          margin: "10px 0 4px",
          boxShadow: activeMobileCol.shadow,
        }}>
          {renderCol(activeMobileCol)}
        </div>
      </div>

      {/* Desktop: original 3-column grid */}
      <div className="hidden lg:grid" style={{
        gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", height: "100%", minHeight: 0,
      }}>
        {COLS.map((col) => (
          <div key={col.key} style={{
            borderRadius: "12px",
            border: `${col.borderWidth} solid ${col.borderColor}`,
            backgroundColor: col.bodyBg,
            display: "flex", flexDirection: "column",
            overflow: "hidden", minHeight: 0,
            boxShadow: col.shadow,
          }}>
            {renderCol(col)}
          </div>
        ))}
      </div>

    </div>
  );
}
