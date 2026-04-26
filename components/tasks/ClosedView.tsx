"use client";

import { useState } from "react";
import { RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { Q_META, fmtDeadline, type TaskData } from "@/components/tasks/TaskCard";

interface Props {
  tasks:      TaskData[];
  onReopen:   (id: string) => void;
}

type Filter = "all" | "complete" | "incomplete";

export default function ClosedView({ tasks, onReopen }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const closed = tasks
    .filter((t) => t.status !== "open")
    .filter((t) => filter === "all" || t.status === filter)
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));

  const completeCount   = tasks.filter((t) => t.status === "complete").length;
  const incompleteCount = tasks.filter((t) => t.status === "incomplete").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {([
            ["all",        "All closed",   completeCount + incompleteCount],
            ["complete",   "Completed",    completeCount],
            ["incomplete", "Missed",       incompleteCount],
          ] as [Filter, string, number][]).map(([val, label, count]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: "5px 12px", borderRadius: "20px",
              border: `1.5px solid ${filter === val ? "#F97316" : "#E8DDD0"}`,
              backgroundColor: filter === val ? "#FFF7ED" : "#FFFFFF",
              color: filter === val ? "#F97316" : "#78716C",
              fontSize: "11px", fontWeight: 600, cursor: "pointer",
            }}>
              {label} · {count}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "#A8A29E" }}>
          Click <RotateCcw size={10} style={{ display: "inline", verticalAlign: "middle" }} /> to reopen a task
        </p>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {closed.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            height: "200px" }}>
            <p style={{ fontSize: "13px", color: "#A8A29E" }}>No closed tasks here</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {closed.map((t) => {
              const m = Q_META[t.quadrant];
              const closedDate = t.closedAt
                ? new Date(t.closedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "";
              const isComplete = t.status === "complete";

              return (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "10px",
                  backgroundColor: isComplete ? "#F0FDF4" : "#F9FAFB",
                  border: `1px solid ${isComplete ? "#BBF7D0" : "#E5E7EB"}`,
                }}>
                  {/* Status icon */}
                  {isComplete
                    ? <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                    : <XCircle size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
                  }

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                      <p style={{ fontSize: "13px", fontWeight: 600,
                        color: isComplete ? "#15803D" : "#6B7280",
                        textDecoration: isComplete ? "line-through" : "none",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {t.title}
                      </p>
                      <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700,
                        padding: "2px 6px", borderRadius: "20px",
                        color: m.color, backgroundColor: m.bg, border: `1px solid ${m.border}` }}>
                        {t.quadrant}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: "#9CA3AF" }}>
                      <span>Due {fmtDeadline(t.deadline)}</span>
                      {closedDate && <span>Closed {closedDate}</span>}
                      {t.variance !== undefined && (
                        <span style={{ color: t.variance <= 0 ? "#16A34A" : "#DC2626" }}>
                          {t.variance === 0 ? "On time"
                            : t.variance > 0 ? `${t.variance}d late`
                            : `${Math.abs(t.variance)}d early`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reopen button */}
                  <button
                    onClick={() => onReopen(t.id)}
                    title="Reopen task"
                    style={{
                      flexShrink: 0, display: "flex", alignItems: "center", gap: "4px",
                      padding: "5px 10px", borderRadius: "6px",
                      border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
                      fontSize: "11px", fontWeight: 600, color: "#78716C", cursor: "pointer",
                    }}>
                    <RotateCcw size={11} /> Reopen
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
