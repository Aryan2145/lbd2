"use client";

import { useState } from "react";
import { X } from "lucide-react";
// RECURRING_DISABLED: import { RefreshCw } from "lucide-react";
import type { GoalData } from "@/components/goals/GoalCard";
import {
  Q_META, toTaskDate,
  type EisenhowerQ, type TaskData, type RecurringTemplate,
} from "@/components/tasks/TaskCard";

interface Props {
  open:           boolean;
  onClose:        () => void;
  onSaveTask:     (t: TaskData) => void;
  onSaveTemplate: (t: RecurringTemplate) => void;
  goals:          GoalData[];
}

type TaskKind = "one-time"; // RECURRING_DISABLED: | "recurring"

const DEFAULT_FORM = {
  title: "", description: "", quadrant: "Q2" as EisenhowerQ, linkedGoalId: "",
  kind: "one-time" as TaskKind,
  deadline: toTaskDate(),
};

// Subheading-first labels for the priority selector (no Q# prefix)
const Q_BUTTONS: Record<EisenhowerQ, { main: string; hint: string }> = {
  Q1: { main: "Urgent + Important",       hint: "Do it today, no excuses." },
  Q2: { main: "Important, Not Urgent",    hint: "Plan it and schedule it." },
  Q3: { main: "Urgent, Not Important",    hint: "Hand it off to someone." },
  Q4: { main: "Not Urgent, Not Important",hint: "Hmm… do you really need this?" },
};

export default function TaskCreateSheet({ open, onClose, onSaveTask, onSaveTemplate: _onSaveTemplate, goals }: Props) {
  const [f,             setF]             = useState({ ...DEFAULT_FORM });
  const [delegateTo,    setDelegateTo]    = useState("");
  const [delegateNudge, setDelegateNudge] = useState(false);
  const [q4Bang,        setQ4Bang]        = useState(false);

  if (!open) return null;

  const today       = toTaskDate();
  const q2TodayNudge = f.quadrant === "Q2" && f.deadline === today;

  const set = <K extends keyof typeof DEFAULT_FORM>(k: K, v: typeof DEFAULT_FORM[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  function selectQuadrant(q: EisenhowerQ) {
    if (q === "Q4") {
      setQ4Bang(true);
      setTimeout(() => {
        setF({ ...DEFAULT_FORM });
        setDelegateTo("");
        setQ4Bang(false);
        onClose();
      }, 2400);
      return;
    }
    // Q1 always locks to today
    setF((p) => ({ ...p, quadrant: q, deadline: q === "Q1" ? today : p.deadline }));
    setDelegateNudge(false);
  }

  function handleSave() {
    if (!f.title.trim()) return;

    if (f.quadrant === "Q3" && !delegateTo.trim()) {
      setDelegateNudge(true);
      return;
    }

    const description =
      f.quadrant === "Q3" && delegateTo.trim()
        ? `Delegated to: ${delegateTo.trim()}${f.description.trim() ? "\n" + f.description.trim() : ""}`
        : f.description.trim();

    onSaveTask({
      id: crypto.randomUUID(),
      kind: "one-time",
      title: f.title.trim(),
      description,
      deadline: f.deadline,
      quadrant: f.quadrant,
      status: "open",
      createdAt: Date.now(),
      linkedGoalId: f.linkedGoalId,
    });

    setF({ ...DEFAULT_FORM });
    setDelegateTo("");
    setDelegateNudge(false);
    onClose();
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
        overflow: "hidden",
      }}>

        {/* ── Q4 bang overlay — covers the entire panel ── */}
        {q4Bang && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20,
            backgroundColor: "#F9FAFB",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "18px", padding: "48px",
            textAlign: "center",
          }}>
            <span style={{ fontSize: "60px", lineHeight: 1 }}>🗑️</span>
            <p style={{ fontSize: "21px", fontWeight: 800, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>
              Not urgent AND<br />not important?
            </p>
            <p style={{ fontSize: "14px", color: "#57534E", lineHeight: 1.7, margin: 0 }}>
              Seriously, just forget about it.<br />
              Not everything deserves space on your list.
            </p>
            <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0 }}>
              Closing in a moment... ✌️
            </p>
          </div>
        )}

        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)",
          flexShrink: 0,
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

          {/* Priority selector (subheading-first, no Q# prefix) */}
          <div style={{ marginBottom: "14px" }}>
            <Label>Priority</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {(["Q1","Q2","Q3","Q4"] as EisenhowerQ[]).map((q) => {
                const m      = Q_META[q];
                const ql     = Q_BUTTONS[q];
                const active = f.quadrant === q;
                const isQ4   = q === "Q4";
                return (
                  <button key={q} onClick={() => selectQuadrant(q)} style={{
                    padding: "9px 11px", borderRadius: "8px",
                    cursor: "pointer", textAlign: "left",
                    border: `2px solid ${active ? m.color : isQ4 ? "#D1D5DB" : "#E8DDD0"}`,
                    backgroundColor: active ? m.bg : isQ4 ? "#F9FAFB" : "#FAFAF9",
                    opacity: isQ4 && !active ? 0.7 : 1,
                    transition: "border-color 0.15s, background-color 0.15s",
                  }}>
                    <p style={{
                      fontSize: "11px", fontWeight: 700, margin: 0,
                      color: active ? m.color : isQ4 ? "#9CA3AF" : "#78716C",
                    }}>
                      {ql.main}
                    </p>
                    <p style={{
                      fontSize: "10px", margin: "2px 0 0",
                      color: active ? m.color : isQ4 ? "#9CA3AF" : "#A8A29E",
                      opacity: 0.85,
                    }}>
                      {ql.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delegate to — required when Q3 */}
          {f.quadrant === "Q3" && (
            <div style={{ marginBottom: "14px" }}>
              <Label>Delegate to *</Label>
              <input
                value={delegateTo}
                onChange={(e) => { setDelegateTo(e.target.value); if (delegateNudge) setDelegateNudge(false); }}
                placeholder="Who will handle this?"
                style={{
                  ...inputStyle,
                  borderColor: delegateNudge ? "#DC2626" : "#E8DDD0",
                  backgroundColor: delegateNudge ? "#FEF2F2" : "#FFFFFF",
                }}
              />
              {delegateNudge && (
                <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, marginTop: "5px" }}>
                  👆 You're delegating — someone has to own this!
                </p>
              )}
            </div>
          )}

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

          {/* Deadline */}
          <div style={{ marginBottom: "14px" }}>
            <Label>
              {f.quadrant === "Q1" ? "Deadline — locked to today 🔒" : "Deadline"}
            </Label>
            <input
              type="date"
              value={f.deadline}
              disabled={f.quadrant === "Q1"}
              onChange={(e) => {
                if (f.quadrant === "Q1") return;
                set("deadline", e.target.value);
              }}
              style={{
                ...inputStyle,
                opacity: f.quadrant === "Q1" ? 0.6 : 1,
                cursor: f.quadrant === "Q1" ? "not-allowed" : "default",
                backgroundColor: f.quadrant === "Q1" ? "#FEF2F2" : "#FFFFFF",
              }}
            />
            {f.quadrant === "Q1" && (
              <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, marginTop: "5px" }}>
                🔥 It's urgent — this one's happening today, no rescheduling!
              </p>
            )}
            {q2TodayNudge && (
              <p style={{ fontSize: "11px", color: "#D97706", fontWeight: 500, marginTop: "5px" }}>
                ⚡ Scheduling something for today? If it's truly urgent, move it to "Urgent + Important" instead!
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid #EDE5D8",
          display: "flex", gap: "8px", flexShrink: 0,
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
            Add Task
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
