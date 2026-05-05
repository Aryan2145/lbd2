"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Check, AlertTriangle } from "lucide-react";
import type { GoalData, Milestone } from "@/components/goals/GoalCard";
import {
  Q_META, toTaskDate,
  type EisenhowerQ, type TaskData, type RecurringTemplate,
} from "@/components/tasks/TaskCard";
import { MAX_DATE_STR, todayDateStr, validateDate } from "@/lib/dateValidation";

interface Props {
  open:                boolean;
  onClose:             () => void;
  onSaveTask:          (t: TaskData) => void;
  onSaveTemplate:      (t: RecurringTemplate) => void;
  goals:               GoalData[];
  initialGoalId?:      string;
  initialMilestoneId?: string;
}

type TaskKind = "one-time"; // RECURRING_DISABLED: | "recurring"

const DEFAULT_FORM = {
  title: "", description: "", quadrant: "Q2" as EisenhowerQ, linkedGoalId: "",
  kind: "one-time" as TaskKind,
  deadline: "",
};

const Q_BUTTONS: Record<EisenhowerQ, { main: string; hint: string }> = {
  Q1: { main: "Urgent + Important",        hint: "Do it today, no excuses."          },
  Q2: { main: "Important, Not Urgent",     hint: "Plan it and schedule it."          },
  Q3: { main: "Urgent, Not Important",     hint: "Hand it off to someone."           },
  Q4: { main: "Not Urgent, Not Important", hint: "Hmm… do you really need this?"    },
};

const GOAL_AREA_META: Record<string, { label: string; color: string; bg: string }> = {
  professional:  { label: "Professional",   color: "#2563EB", bg: "#EFF6FF" },
  contribution:  { label: "Contribution",   color: "#7C3AED", bg: "#F5F3FF" },
  wealth:        { label: "Wealth",         color: "#C9A84C", bg: "#FEFCE8" },
  spiritual:     { label: "Spiritual",      color: "#059669", bg: "#ECFDF5" },
  personal:      { label: "Personal Growth",color: "#DB2777", bg: "#FDF2F8" },
  relationships: { label: "Relationships",  color: "#EA580C", bg: "#FFF7ED" },
  health:        { label: "Health",         color: "#DC2626", bg: "#FEF2F2" },
};

function fmtMilestoneDate(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US",
    { month: "short", day: "numeric", year: "numeric" });
}

export default function TaskCreateSheet({
  open, onClose, onSaveTask, onSaveTemplate: _onSaveTemplate,
  goals, initialGoalId, initialMilestoneId,
}: Props) {
  const [f,                 setF]               = useState({ ...DEFAULT_FORM });
  const [delegateTo,        setDelegateTo]       = useState("");
  const [delegateNudge,     setDelegateNudge]    = useState(false);
  const [q4Bang,            setQ4Bang]           = useState(false);
  const [linkedMilestoneId, setLinkedMilestoneId] = useState("");

  useEffect(() => {
    if (open) {
      setF({ ...DEFAULT_FORM, linkedGoalId: initialGoalId ?? "" });
      setLinkedMilestoneId(initialMilestoneId ?? "");
      setDelegateTo("");
      setDelegateNudge(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const today             = toTaskDate();
  const deadlineTodayNudge = f.deadline === today && f.quadrant !== "Q1";

  const selectedGoal        = goals.find((g) => g.id === f.linkedGoalId);
  const goalMilestones      = [...(selectedGoal?.milestones ?? [])].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const goalHasNoMilestones = !!f.linkedGoalId && goalMilestones.length === 0;
  const milestoneRequired   = !!f.linkedGoalId && goalMilestones.length > 0 && !linkedMilestoneId;

  const dateError = validateDate(f.deadline, { required: true });
  const canSave = (f.quadrant === "Q4" || (f.title.trim().length > 0 && !goalHasNoMilestones && !milestoneRequired)) && !dateError;

  const set = <K extends keyof typeof DEFAULT_FORM>(k: K, v: typeof DEFAULT_FORM[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  function selectQuadrant(q: EisenhowerQ) {
    setF((p) => ({
      ...p,
      quadrant: q,
      deadline: q === "Q1" ? today : (p.quadrant === "Q1" ? "" : p.deadline),
    }));
    setDelegateNudge(false);
  }

  function handleGoalChange(gId: string) {
    set("linkedGoalId", gId);
    setLinkedMilestoneId("");
  }

  function handleSave() {
    if (f.quadrant === "Q4") {
      setQ4Bang(true);
      setTimeout(() => {
        setF({ ...DEFAULT_FORM });
        setDelegateTo("");
        setLinkedMilestoneId("");
        setQ4Bang(false);
        onClose();
      }, 2400);
      return;
    }
    if (!canSave) return;
    if (f.quadrant === "Q3" && !delegateTo.trim()) { setDelegateNudge(true); return; }

    const description =
      f.quadrant === "Q3" && delegateTo.trim()
        ? `Delegated to: ${delegateTo.trim()}${f.description.trim() ? "\n" + f.description.trim() : ""}`
        : f.description.trim();

    onSaveTask({
      id: crypto.randomUUID(), kind: "one-time",
      title: f.title.trim(), description,
      deadline: f.deadline, quadrant: f.quadrant,
      status: "open", createdAt: Date.now(),
      linkedGoalId: f.linkedGoalId,
      linkedMilestoneId: linkedMilestoneId || undefined,
    });

    setF({ ...DEFAULT_FORM });
    setDelegateTo("");
    setLinkedMilestoneId("");
    setDelegateNudge(false);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)",
        zIndex: 400, backdropFilter: "blur(2px)",
      }} />

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "440px",
        backgroundColor: "#FFFFFF", zIndex: 401,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(28,25,23,0.12)",
      }}>

        {/* Q4 bang overlay */}
        {q4Bang && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20, backgroundColor: "#F9FAFB",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "18px", padding: "48px", textAlign: "center",
          }}>
            <span style={{ fontSize: "60px", lineHeight: 1 }}>🗑️</span>
            <p style={{ fontSize: "21px", fontWeight: 800, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>
              Not urgent AND<br />not important?
            </p>
            <p style={{ fontSize: "14px", color: "#57534E", lineHeight: 1.7, margin: 0 }}>
              Seriously, just forget about it.<br />Not everything deserves space on your list.
            </p>
            <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0 }}>Closing in a moment... ✌️</p>
          </div>
        )}

        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)", flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
              Task Command Center
            </p>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>Add Task</h2>
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

          <div style={{ marginBottom: "14px" }}>
            <Label>Title *</Label>
            <input value={f.title} onChange={(e) => set("title", e.target.value)}
              placeholder="What needs to be done?" style={inputStyle} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <Label>Description</Label>
            <textarea value={f.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Optional details..." rows={2}
              style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: "14px" }}>
            <Label>Priority</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {(["Q1","Q2","Q3","Q4"] as EisenhowerQ[]).map((q) => {
                const m = Q_META[q]; const ql = Q_BUTTONS[q];
                const active = f.quadrant === q;
                const todayQ1Hint = deadlineTodayNudge && q === "Q1";
                return (
                  <button key={q} onClick={() => selectQuadrant(q)} style={{
                    padding: "9px 11px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                    border: `2px solid ${active ? m.color : todayQ1Hint ? m.color + "88" : m.border}`,
                    backgroundColor: m.bg,
                    boxShadow: active ? `0 0 0 1px ${m.color}22` : todayQ1Hint ? `0 0 0 2px ${m.color}22` : "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, margin: 0,
                      color: active ? m.color : m.color + "AA" }}>
                      {ql.main}
                    </p>
                    <p style={{ fontSize: "10px", margin: "2px 0 0",
                      color: active ? m.color : m.color + "88" }}>
                      {ql.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delegate to */}
          {f.quadrant === "Q3" && (
            <div style={{ marginBottom: "14px" }}>
              <Label>Delegate to *</Label>
              <input value={delegateTo}
                onChange={(e) => { setDelegateTo(e.target.value); if (delegateNudge) setDelegateNudge(false); }}
                placeholder="Who will handle this?"
                style={{ ...inputStyle, borderColor: delegateNudge ? "#DC2626" : "#E8DDD0",
                  backgroundColor: delegateNudge ? "#FEF2F2" : "#FFFFFF" }} />
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
              <Label>Link to goal <span style={{ color: "#A8A29E", fontWeight: 400, textTransform: "none" }}>(optional)</span></Label>
              <GoalSelect goals={goals} value={f.linkedGoalId} onChange={handleGoalChange} zIndex={402} />
            </div>
          )}

          {/* No milestones warning */}
          {goalHasNoMilestones && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              padding: "10px 12px", borderRadius: "8px",
              backgroundColor: "#FFFBEB", border: "1px solid #FCD34D", marginBottom: "14px",
            }}>
              <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "12px", color: "#92400E", margin: 0, lineHeight: 1.5 }}>
                This goal has no milestones — add milestones to the goal first before linking a task.
              </p>
            </div>
          )}

          {/* Milestone — required */}
          {f.linkedGoalId && goalMilestones.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <Label>Milestone *</Label>
              <MilestoneSelect milestones={goalMilestones} value={linkedMilestoneId}
                onChange={setLinkedMilestoneId} required zIndex={402} />
              {milestoneRequired && (
                <p style={{ fontSize: "11px", color: "#D97706", fontWeight: 500, marginTop: "5px" }}>
                  Tasks must be linked to a specific milestone — pick one above.
                </p>
              )}
            </div>
          )}

          {/* Deadline */}
          <div style={{ marginBottom: "14px" }}>
            <Label>{f.quadrant === "Q1" ? "Deadline — locked to today 🔒" : "Deadline"}</Label>
            <input type="date" value={f.deadline} disabled={f.quadrant === "Q1"}
              min={todayDateStr()} max={MAX_DATE_STR}
              onChange={(e) => { if (f.quadrant === "Q1") return; set("deadline", e.target.value); }}
              style={{
                ...inputStyle, opacity: f.quadrant === "Q1" ? 0.6 : 1,
                cursor: f.quadrant === "Q1" ? "not-allowed" : "default",
                backgroundColor: f.quadrant === "Q1" ? "#FEF2F2" : "#FFFFFF",
                borderColor: dateError && f.quadrant !== "Q1" ? "#FCA5A5" : undefined,
              }} />
            {f.quadrant !== "Q1" && dateError && (
              <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginTop: "5px" }}>
                {dateError}
              </p>
            )}
            {f.quadrant === "Q1" && (
              <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, marginTop: "5px" }}>
                🔥 It&apos;s urgent — this one&apos;s happening today, no rescheduling!
              </p>
            )}
            {deadlineTodayNudge && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "8px", marginTop: "8px",
                padding: "9px 12px", borderRadius: "8px",
                backgroundColor: "#FEF2F2", border: "1.5px solid #FCA5A5",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                  <AlertTriangle size={13} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                    Deadline is today — set it as Urgent + Important for maximum focus!
                  </p>
                </div>
                <button
                  onClick={() => selectQuadrant("Q1")}
                  style={{
                    padding: "4px 10px", borderRadius: "6px", border: "none",
                    backgroundColor: "#DC2626", color: "#FFFFFF",
                    fontSize: "10px", fontWeight: 700, cursor: "pointer", flexShrink: 0,
                  }}
                >
                  Set Q1
                </button>
              </div>
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
          <button onClick={handleSave} disabled={!canSave} style={{
            flex: 2, padding: "10px", borderRadius: "10px", border: "none",
            background: canSave ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
            fontSize: "13px", fontWeight: 700,
            color: canSave ? "#FFFFFF" : "#A8A29E",
            cursor: canSave ? "pointer" : "default",
            boxShadow: canSave ? "0 2px 8px rgba(249,115,22,0.3)" : "none",
          }}>
            Add Task
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
};

// ── Custom dropdowns ──────────────────────────────────────────────────────────

function GoalSelect({ goals, value, onChange, zIndex }: {
  goals: GoalData[]; value: string; onChange: (id: string) => void; zIndex: number;
}) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);
  const triggerRef        = useRef<HTMLButtonElement>(null);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0, maxH: 260 });

  const openDrop = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const vh = window.innerHeight;
    const estH = Math.min((goals.length + 1) * 38, 260);
    const fitsBelow = r.bottom + 6 + estH < vh - 56;
    setPos({
      top:  fitsBelow ? r.bottom + 4 : r.top - estH - 4,
      left: r.left, width: r.width,
      maxH: fitsBelow ? Math.min(260, vh - r.bottom - 64) : Math.min(260, r.top - 12),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const sel  = goals.find((g) => g.id === value);
  const meta = sel ? GOAL_AREA_META[sel.area] : null;

  return (
    <div ref={containerRef}>
      <button ref={triggerRef} onClick={() => open ? setOpen(false) : openDrop()} style={{
        width: "100%", padding: "9px 12px", borderRadius: "8px", boxSizing: "border-box",
        border: `1.5px solid ${open ? "#F97316" : "#E8DDD0"}`,
        backgroundColor: "#FFFFFF", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {sel && meta ? (
          <>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, backgroundColor: meta.color }} />
            <span style={{ flex: 1, textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#1C1917",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sel.outcome || sel.statement.slice(0, 55)}
            </span>
            <span style={{ fontSize: "9px", fontWeight: 600, color: meta.color, backgroundColor: meta.bg,
              padding: "2px 7px", borderRadius: "8px", flexShrink: 0, whiteSpace: "nowrap" }}>
              {meta.label}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", fontSize: "13px", color: "#A8A29E" }}>
            No linked goal
          </span>
        )}
        <ChevronDown size={13} color="#A8A29E" style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "fixed", top: pos.top, left: pos.left, width: pos.width,
          backgroundColor: "#FFFFFF", borderRadius: "10px",
          border: "1.5px solid #EDE5D8", boxShadow: "0 8px 32px rgba(28,25,23,0.16)",
          zIndex, maxHeight: pos.maxH, overflowY: "auto",
        }}>
          {/* No goal */}
          <button onClick={() => { onChange(""); setOpen(false); }} style={{
            width: "100%", padding: "7px 12px", border: "none", borderBottom: "1px solid #F2EAE0",
            backgroundColor: value === "" ? "#FFF7ED" : "#FFFFFF", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "11px", fontWeight: 500, color: "#78716C" }}>No linked goal</span>
            {value === "" && <Check size={11} color="#F97316" />}
          </button>

          {goals.map((g) => {
            const m = GOAL_AREA_META[g.area]; const isSel = g.id === value;
            return (
              <button key={g.id} onClick={() => { onChange(g.id); setOpen(false); }} style={{
                width: "100%", padding: "7px 12px", border: "none", borderBottom: "1px solid #F9F5EF",
                backgroundColor: isSel ? "#FFF7ED" : "#FFFFFF", cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: m.color, flexShrink: 0 }} />
                <p style={{ flex: 1, fontSize: "12px", fontWeight: 600, margin: 0,
                  color: isSel ? "#F97316" : "#1C1917",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.outcome || g.statement.slice(0, 60)}
                </p>
                <span style={{ fontSize: "9px", fontWeight: 600, color: m.color, backgroundColor: m.bg,
                  padding: "2px 7px", borderRadius: "8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {m.label}
                </span>
                {isSel && <Check size={11} color="#F97316" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MilestoneSelect({ milestones, value, onChange, required: req, zIndex }: {
  milestones: Milestone[]; value: string; onChange: (id: string) => void;
  required?: boolean; zIndex: number;
}) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);
  const triggerRef        = useRef<HTMLButtonElement>(null);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0, maxH: 260 });

  const openDrop = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const vh = window.innerHeight;
    const estH = Math.min(milestones.length * 48, 240);
    const fitsBelow = r.bottom + 6 + estH < vh - 56;
    setPos({
      top:  fitsBelow ? r.bottom + 4 : r.top - estH - 4,
      left: r.left, width: r.width,
      maxH: fitsBelow ? Math.min(240, vh - r.bottom - 64) : Math.min(240, r.top - 12),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const sel       = milestones.find((m) => m.id === value);
  const needsPick = req && !value;

  return (
    <div ref={containerRef}>
      <button ref={triggerRef} onClick={() => open ? setOpen(false) : openDrop()} style={{
        width: "100%", padding: "9px 12px", borderRadius: "8px", boxSizing: "border-box",
        border: `1.5px solid ${needsPick ? "#D97706" : open ? "#D97706" : "#E8DDD0"}`,
        backgroundColor: needsPick ? "#FFFBEB" : "#FFFFFF", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {sel ? (
          <>
            <span style={{ fontSize: "11px", color: "#D97706", flexShrink: 0 }}>◆</span>
            <span style={{ flex: 1, textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#1C1917",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sel.title}
            </span>
            <span style={{ fontSize: "9px", color: "#D97706", fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap" }}>
              {fmtMilestoneDate(sel.deadline)}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", fontSize: "13px",
            color: needsPick ? "#D97706" : "#A8A29E", fontWeight: needsPick ? 600 : 400 }}>
            {needsPick ? "Select a milestone *" : "— Select a milestone —"}
          </span>
        )}
        <ChevronDown size={13} color={needsPick ? "#D97706" : "#A8A29E"} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "fixed", top: pos.top, left: pos.left, width: pos.width,
          backgroundColor: "#FFFFFF", borderRadius: "10px",
          border: "1.5px solid #FCD34D", boxShadow: "0 8px 32px rgba(28,25,23,0.16)",
          zIndex, maxHeight: pos.maxH, overflowY: "auto",
        }}>
          {milestones.map((m) => {
            const isSel = m.id === value;
            return (
              <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }} style={{
                width: "100%", padding: "8px 12px", border: "none", borderBottom: "1px solid #F9F5EF",
                backgroundColor: isSel ? "#FFFBEB" : "#FFFFFF", cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{ fontSize: "11px", color: "#D97706", flexShrink: 0 }}>◆</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, margin: 0,
                    color: isSel ? "#D97706" : "#1C1917",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.title}
                  </p>
                  <p style={{ fontSize: "10px", color: "#A8A29E", margin: "2px 0 0" }}>
                    Due {fmtMilestoneDate(m.deadline)}
                  </p>
                </div>
                {m.completed && (
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#16A34A",
                    backgroundColor: "#F0FDF4", padding: "2px 6px", borderRadius: "8px", flexShrink: 0 }}>
                    Done
                  </span>
                )}
                {isSel && !m.completed && <Check size={11} color="#D97706" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
