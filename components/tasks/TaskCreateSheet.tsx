"use client";

import { useState } from "react";
import { X, Clock, RefreshCw } from "lucide-react";
import type { GoalData } from "@/components/goals/GoalCard";
import {
  Q_META, toTaskDate,
  type EisenhowerQ, type TaskData, type RecurringTemplate,
} from "@/components/tasks/TaskCard";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Props {
  open:             boolean;
  onClose:          () => void;
  onSaveTask:       (t: TaskData) => void;
  onSaveTemplate:   (t: RecurringTemplate) => void;
  goals:            GoalData[];
}

type TaskKind    = "one-time" | "recurring";
type SchedType   = "daily" | "weekly" | "monthly" | "yearly";
type EndCond     = "never" | "on-date" | "after-n";

const DEFAULT_FORM = {
  title: "", description: "", quadrant: "Q2" as EisenhowerQ, linkedGoalId: "",
  kind: "one-time" as TaskKind,
  // one-time
  deadline: toTaskDate(),
  // recurring
  scheduleType: "daily"  as SchedType,
  every: 1,
  days: [] as number[],
  monthDay: 1,
  month: 0,
  time: "",
  startDate: toTaskDate(),
  endCondition: "never" as EndCond,
  endDate: "",
  endAfter: 10,
};

export default function TaskCreateSheet({ open, onClose, onSaveTask, onSaveTemplate, goals }: Props) {
  const [f, setF] = useState({ ...DEFAULT_FORM });

  if (!open) return null;

  const set = <K extends keyof typeof DEFAULT_FORM>(k: K, v: typeof DEFAULT_FORM[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  function handleSave() {
    if (!f.title.trim()) return;
    const now = Date.now();

    if (f.kind === "one-time") {
      onSaveTask({
        id: crypto.randomUUID(),
        kind: "one-time",
        title: f.title.trim(),
        description: f.description.trim(),
        deadline: f.deadline,
        quadrant: f.quadrant,
        status: "open",
        createdAt: now,
        linkedGoalId: f.linkedGoalId,
      });
    } else {
      onSaveTemplate({
        id: crypto.randomUUID(),
        title: f.title.trim(),
        description: f.description.trim(),
        quadrant: f.quadrant,
        scheduleType: f.scheduleType,
        every: Math.max(1, f.every),
        days: f.days,
        monthDay: f.monthDay,
        month: f.month,
        time: f.time,
        startDate: f.startDate,
        endCondition: f.endCondition,
        endDate: f.endDate,
        endAfter: Math.max(1, f.endAfter),
        occurrenceCount: 0,
        active: true,
        linkedGoalId: f.linkedGoalId,
        createdAt: now,
      });
    }

    setF({ ...DEFAULT_FORM });
    onClose();
  }

  function toggleDay(d: number) {
    setF((p) => ({
      ...p,
      days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d],
    }));
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)",
          zIndex: 400, backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "440px", backgroundColor: "#FFFFFF",
        zIndex: 401, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(28,25,23,0.12)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
              Task Command Center
            </p>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
              Add Task
            </h2>
          </div>
          <button onClick={onClose} style={{
            width: "32px", height: "32px", borderRadius: "8px", border: "none",
            backgroundColor: "#F5F0EB", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={15} color="#78716C" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Task kind selector */}
          <div style={{ marginBottom: "18px" }}>
            <Label>Task type</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {([["one-time", Clock, "One-time"], ["recurring", RefreshCw, "Recurring"]] as const).map(
                ([val, Icon, label]) => (
                  <button
                    key={val}
                    onClick={() => set("kind", val)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 14px", borderRadius: "10px",
                      border: `2px solid ${f.kind === val ? "#F97316" : "#E8DDD0"}`,
                      backgroundColor: f.kind === val ? "#FFF7ED" : "#FAFAF9",
                      cursor: "pointer",
                    }}>
                    <Icon size={14} color={f.kind === val ? "#F97316" : "#A8A29E"} />
                    <span style={{ fontSize: "12px", fontWeight: 600,
                      color: f.kind === val ? "#F97316" : "#78716C" }}>
                      {label}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: "14px" }}>
            <Label>Title *</Label>
            <input
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="What needs to be done?"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: "14px" }}>
            <Label>Description</Label>
            <textarea
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional details..."
              rows={2}
              style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {/* Quadrant */}
          <div style={{ marginBottom: "14px" }}>
            <Label>Eisenhower quadrant</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {(["Q1","Q2","Q3","Q4"] as EisenhowerQ[]).map((q) => {
                const m = Q_META[q];
                const active = f.quadrant === q;
                return (
                  <button key={q} onClick={() => set("quadrant", q)} style={{
                    padding: "8px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                    border: `2px solid ${active ? m.color : "#E8DDD0"}`,
                    backgroundColor: active ? m.bg : "#FAFAF9",
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: 700,
                      color: active ? m.color : "#78716C", margin: 0 }}>
                      {q} · {m.label}
                    </p>
                    <p style={{ fontSize: "10px", color: active ? m.color : "#A8A29E",
                      margin: "2px 0 0", opacity: 0.85 }}>
                      {m.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal link */}
          {goals.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <Label>Link to goal <span style={{ color: "#A8A29E", fontWeight: 400 }}>(optional)</span></Label>
              <select value={f.linkedGoalId} onChange={(e) => set("linkedGoalId", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">No linked goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.statement.slice(0, 60)}…</option>
                ))}
              </select>
            </div>
          )}

          {/* ── One-time: deadline ── */}
          {f.kind === "one-time" && (
            <div style={{ marginBottom: "14px" }}>
              <Label>Deadline</Label>
              <input type="date" value={f.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                style={inputStyle} />
            </div>
          )}

          {/* ── Recurring: schedule builder ── */}
          {f.kind === "recurring" && (
            <div style={{
              padding: "14px", borderRadius: "10px",
              backgroundColor: "#FAF5EE", border: "1px solid #EDE5D8",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#78716C",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                Schedule
              </p>

              {/* Schedule type pills */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
                {(["daily","weekly","monthly","yearly"] as SchedType[]).map((s) => (
                  <button key={s} onClick={() => set("scheduleType", s)} style={{
                    padding: "4px 12px", borderRadius: "20px", border: "none", cursor: "pointer",
                    fontSize: "11px", fontWeight: 600,
                    backgroundColor: f.scheduleType === s ? "#F97316" : "#EDE5D8",
                    color: f.scheduleType === s ? "#FFFFFF" : "#78716C",
                  }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {/* Every N */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#78716C", whiteSpace: "nowrap" }}>Every</span>
                <input
                  type="number" min={1} max={99} value={f.every}
                  onChange={(e) => set("every", Number(e.target.value))}
                  style={{ ...inputStyle, width: "60px", textAlign: "center", padding: "6px 8px" }}
                />
                <span style={{ fontSize: "12px", color: "#78716C" }}>
                  {f.scheduleType === "daily" ? "day(s)" :
                   f.scheduleType === "weekly" ? "week(s)" :
                   f.scheduleType === "monthly" ? "month(s)" : "year(s)"}
                </span>
              </div>

              {/* Weekly: day checkboxes */}
              {f.scheduleType === "weekly" && (
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "11px", color: "#A8A29E", marginBottom: "6px" }}>On days</p>
                  <div style={{ display: "flex", gap: "5px" }}>
                    {DAYS_SHORT.map((d, i) => (
                      <button key={i} onClick={() => toggleDay(i)} style={{
                        width: "34px", height: "34px", borderRadius: "8px", border: "none",
                        cursor: "pointer", fontSize: "10px", fontWeight: 700,
                        backgroundColor: f.days.includes(i) ? "#F97316" : "#EDE5D8",
                        color: f.days.includes(i) ? "#FFFFFF" : "#78716C",
                      }}>
                        {d.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly/Yearly: day of month */}
              {(f.scheduleType === "monthly" || f.scheduleType === "yearly") && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", color: "#78716C" }}>On day</span>
                  <input
                    type="number" min={1} max={31} value={f.monthDay}
                    onChange={(e) => set("monthDay", Number(e.target.value))}
                    style={{ ...inputStyle, width: "60px", textAlign: "center", padding: "6px 8px" }}
                  />
                  {f.scheduleType === "yearly" && (
                    <>
                      <span style={{ fontSize: "12px", color: "#78716C" }}>of</span>
                      <select value={f.month} onChange={(e) => set("month", Number(e.target.value))}
                        style={{ ...inputStyle, width: "90px", padding: "6px 8px" }}>
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                    </>
                  )}
                </div>
              )}

              {/* Time (optional) */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#78716C", whiteSpace: "nowrap" }}>At time</span>
                <input type="time" value={f.time}
                  onChange={(e) => set("time", e.target.value)}
                  style={{ ...inputStyle, width: "120px", padding: "6px 8px" }}
                />
                <span style={{ fontSize: "10px", color: "#A8A29E" }}>(optional)</span>
              </div>

              {/* Start date */}
              <div style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "11px", color: "#A8A29E", marginBottom: "4px" }}>Start date</p>
                <input type="date" value={f.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  style={inputStyle} />
              </div>

              {/* End condition */}
              <div>
                <p style={{ fontSize: "11px", color: "#A8A29E", marginBottom: "6px" }}>Ends</p>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                  {([["never","Never"],["on-date","On date"],["after-n","After N"]] as [EndCond, string][]).map(
                    ([val, label]) => (
                      <button key={val} onClick={() => set("endCondition", val)} style={{
                        padding: "4px 12px", borderRadius: "20px", border: "none", cursor: "pointer",
                        fontSize: "11px", fontWeight: 600,
                        backgroundColor: f.endCondition === val ? "#F97316" : "#EDE5D8",
                        color: f.endCondition === val ? "#FFFFFF" : "#78716C",
                      }}>
                        {label}
                      </button>
                    )
                  )}
                </div>
                {f.endCondition === "on-date" && (
                  <input type="date" value={f.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                    style={inputStyle} />
                )}
                {f.endCondition === "after-n" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="number" min={1} max={999} value={f.endAfter}
                      onChange={(e) => set("endAfter", Number(e.target.value))}
                      style={{ ...inputStyle, width: "70px", textAlign: "center", padding: "6px 8px" }}
                    />
                    <span style={{ fontSize: "12px", color: "#78716C" }}>occurrences</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid #EDE5D8",
          display: "flex", gap: "8px",
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: "10px",
            border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
            fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{
            flex: 2, padding: "10px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}>
            {f.kind === "recurring" ? "Create recurring task" : "Add task"}
          </button>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: 600, color: "#78716C",
      textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
      {children}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "8px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none",
  boxSizing: "border-box",
};
