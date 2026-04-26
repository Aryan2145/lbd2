"use client";

import TaskCard, { toTaskDate, type TaskData } from "@/components/tasks/TaskCard";

interface Props {
  tasks:      TaskData[];
  onComplete: (id: string) => void;
  onMiss:     (id: string) => void;
  onSelect?:  (task: TaskData) => void;
}

const COLS = [
  {
    key:    "q1" as const,
    label:  "Do It Now",
    sub:    "Urgent + Important",
    color:  "#DC2626",
    bg:     "#FEF2F2",
    border: "#FCA5A5",
    empty:  "All clear! 🎉",
  },
  {
    key:    "q2" as const,
    label:  "Scheduled",
    sub:    "Important · Not Yet Urgent",
    color:  "#16A34A",
    bg:     "#F0FDF4",
    border: "#86EFAC",
    empty:  "Nothing on the horizon",
  },
  {
    key:    "q3" as const,
    label:  "Delegated",
    sub:    "Urgent · Not Important",
    color:  "#D97706",
    bg:     "#FFFBEB",
    border: "#FCD34D",
    empty:  "Nothing delegated",
  },
];

export default function EisenhowerMatrix({ tasks, onComplete, onMiss, onSelect }: Props) {
  const today = toTaskDate();
  const open  = tasks.filter((t) => t.status === "open");

  // Q2 tasks whose deadline has arrived are promoted into the Do It Now bucket
  const promoted = open.filter((t) => t.quadrant === "Q2" && t.deadline <= today);

  const buckets = {
    q1: [...open.filter((t) => t.quadrant === "Q1"), ...promoted],
    q2: open.filter((t) => t.quadrant === "Q2" && t.deadline > today),
    q3: open.filter((t) => t.quadrant === "Q3"),
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "14px",
      height: "100%",
      minHeight: 0,
    }}>
      {COLS.map((col) => {
        const colTasks = buckets[col.key];
        return (
          <div key={col.key} style={{
            borderRadius: "12px",
            border: `1px solid ${col.border}`,
            backgroundColor: col.bg,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}>
            {/* Header */}
            <div style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${col.border}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: col.color, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: col.color, margin: 0, lineHeight: 1.2 }}>
                  {col.label}
                </p>
                <p style={{
                  fontSize: "10px", color: col.color, opacity: 0.65, margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {col.sub}
                </p>
              </div>
              <span style={{
                fontSize: "11px", fontWeight: 700, color: col.color,
                backgroundColor: "#FFFFFF", padding: "2px 8px", borderRadius: "20px",
                border: `1px solid ${col.border}`, flexShrink: 0,
              }}>
                {colTasks.length}
              </span>
            </div>

            {/* Task list — scrolls internally */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              minHeight: 0,
            }}>
              {colTasks.length === 0 ? (
                <div style={{
                  flex: 1, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  minHeight: "80px",
                }}>
                  <p style={{ fontSize: "11px", color: col.color, opacity: 0.45, textAlign: "center", margin: 0 }}>
                    {col.empty}
                  </p>
                </div>
              ) : (
                colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onClick={onSelect ? () => onSelect(t) : undefined}
                    onComplete={onComplete}
                    onMiss={onMiss}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
