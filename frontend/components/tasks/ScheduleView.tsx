"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import TaskCard, { daysUntil, fmtDeadline, type TaskData } from "@/components/tasks/TaskCard";

type Range = 7 | 14 | 30;

interface Props {
  tasks:      TaskData[];
  onComplete: (id: string) => void;
  onMiss:     (id: string) => void;
}

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  const dt = new Date(iso + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function ScheduleView({ tasks, onComplete, onMiss }: Props) {
  const [range, setRange] = useState<Range>(14);

  const today = toLocalISO(new Date());
  const cutoff = (() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + range);
    return toLocalISO(dt);
  })();

  // Overdue: open tasks with deadline strictly before today
  const overdue = tasks.filter((t) => t.status === "open" && t.deadline < today);

  // Upcoming: open tasks with deadline in [today, cutoff]
  const upcoming = tasks.filter(
    (t) => t.status === "open" && t.deadline >= today && t.deadline <= cutoff
  );

  // Group upcoming by deadline date
  const dateMap = new Map<string, TaskData[]>();
  for (const t of upcoming) {
    if (!dateMap.has(t.deadline)) dateMap.set(t.deadline, []);
    dateMap.get(t.deadline)!.push(t);
  }
  const sortedDates = [...dateMap.keys()].sort();

  const totalShown = overdue.length + upcoming.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Range selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px" }}>
        <p style={{ fontSize: "12px", color: "#78716C", fontWeight: 500 }}>
          Showing <span style={{ fontWeight: 700, color: "#1C1917" }}>{totalShown} tasks</span>
        </p>
        <div style={{ display: "flex", gap: "4px" }}>
          {([7,14,30] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "4px 12px", borderRadius: "20px",
              border: `1.5px solid ${range === r ? "#F97316" : "#E8DDD0"}`,
              backgroundColor: range === r ? "#FFF7ED" : "#FFFFFF",
              color: range === r ? "#F97316" : "#78716C",
              fontSize: "11px", fontWeight: 600, cursor: "pointer",
            }}>
              {r} days
            </button>
          ))}
        </div>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Overdue section */}
        {overdue.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <AlertTriangle size={13} color="#DC2626" />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>
                Overdue · {overdue.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {overdue.sort((a, b) => a.deadline.localeCompare(b.deadline)).map((t) => (
                <TaskCard key={t.id} task={t} onComplete={onComplete} onMiss={onMiss} />
              ))}
            </div>
          </div>
        )}

        {/* Date groups */}
        {sortedDates.length > 0 ? (
          sortedDates.map((date) => {
            const dayTasks = dateMap.get(date)!;
            return (
              <div key={date} style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917" }}>
                    {dayLabel(date)}
                  </span>
                  <span style={{ fontSize: "10px", color: "#A8A29E" }}>
                    {date !== today && date !== (() => {
                      const d = new Date(); d.setDate(d.getDate() + 1);
                      return toLocalISO(d);
                    })() ? fmtDeadline(date) : ""}
                  </span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "#EDE5D8" }} />
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#A8A29E" }}>
                    {dayTasks.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dayTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onComplete={onComplete} onMiss={onMiss} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          overdue.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "#A8A29E" }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#78716C", marginBottom: "6px" }}>
                All clear for the next {range} days
              </p>
              <p style={{ fontSize: "12px" }}>No open tasks scheduled in this window.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
