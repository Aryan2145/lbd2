"use client";

import TaskCard, { Q_META, type TaskData, type EisenhowerQ } from "@/components/tasks/TaskCard";

interface Props {
  tasks:      TaskData[];
  onComplete: (id: string) => void;
  onMiss:     (id: string) => void;
  onSelect?:  (task: TaskData) => void;
}

export default function EisenhowerMatrix({ tasks, onComplete, onMiss, onSelect }: Props) {
  const open = tasks.filter((t) => t.status === "open");

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr", gap: "12px", height: "100%",
    }}>
      {(["Q1","Q2","Q3","Q4"] as EisenhowerQ[]).map((q) => {
        const m = Q_META[q];
        const qTasks = open.filter((t) => t.quadrant === q);
        return (
          <div key={q} style={{
            borderRadius: "12px", border: `1px solid ${m.border}`,
            backgroundColor: m.bg, display: "flex", flexDirection: "column",
            overflow: "hidden", minHeight: "200px",
          }}>
            {/* Quadrant header */}
            <div style={{
              padding: "12px 14px 10px",
              borderBottom: `1px solid ${m.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    backgroundColor: m.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: m.color }}>
                    {q} — {m.label}
                  </span>
                </div>
                <p style={{ fontSize: "10px", color: m.color, opacity: 0.75,
                  margin: "2px 0 0 14px" }}>
                  {m.sub}
                </p>
              </div>
              <span style={{
                fontSize: "11px", fontWeight: 700, color: m.color,
                backgroundColor: "#FFFFFF", padding: "2px 8px", borderRadius: "20px",
                border: `1px solid ${m.border}`,
              }}>
                {qTasks.length}
              </span>
            </div>

            {/* Tasks list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {qTasks.length === 0 ? (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "24px",
                }}>
                  <p style={{ fontSize: "11px", color: m.color, opacity: 0.5, textAlign: "center" }}>
                    No open tasks in {m.label}
                  </p>
                </div>
              ) : (
                qTasks.map((t) => (
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
