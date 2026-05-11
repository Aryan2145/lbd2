"use client";

import { useState } from "react";
import { X, Calendar, Target, Pencil, Check } from "lucide-react";
// RECURRING_DISABLED: import { RefreshCw } from "lucide-react";
import type { TaskData, EisenhowerQ } from "@/components/tasks/TaskCard";
import { Q_META, fmtDeadline } from "@/components/tasks/TaskCard";
import type { GoalData } from "@/components/goals/GoalCard";
import { validateDate } from "@/lib/dateValidation";
import CalendarPicker from "@/components/ui/CalendarPicker";

interface Props {
  task:       TaskData | null;
  goals:      GoalData[];
  onClose:    () => void;
  onComplete: (id: string) => void;
  onMiss:     (id: string) => void;
  onReopen?:  (id: string) => void;
  onUpdate?:  (t: TaskData) => void;
}

export default function TaskDetailSheet({ task, goals, onClose, onComplete, onMiss, onReopen, onUpdate }: Props) {
  const [isEditing,    setIsEditing]    = useState(false);
  const [editTitle,    setEditTitle]    = useState("");
  const [editDesc,     setEditDesc]     = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editQuadrant, setEditQuadrant] = useState<EisenhowerQ>("Q2");

  if (!task) return null;

  const m          = Q_META[task.quadrant];
  const linkedGoal = goals.find((g) => g.id === task.linkedGoalId);
  const linkedMilestone = linkedGoal && task.linkedMilestoneId
    ? (linkedGoal.milestones ?? []).find((ms) => ms.id === task.linkedMilestoneId)
    : undefined;
  const isOpen     = task.status === "open";

  function openEdit() {
    if (!task) return;
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditDeadline(task.deadline);
    setEditQuadrant(task.quadrant);
    setIsEditing(true);
  }

  function saveEdit() {
    if (!editTitle.trim() || !onUpdate || !task) return;
    onUpdate({ ...task, title: editTitle.trim(), description: editDesc.trim(), deadline: editDeadline, quadrant: editQuadrant });
    setIsEditing(false);
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 60,
      }} />

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "520px",
        backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0",
        padding: "28px", zIndex: 61,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }}>
        {isEditing ? (
          /* ── Edit mode ── */
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917", margin: 0 }}>Edit Task</h2>
              <button onClick={() => setIsEditing(false)} style={closeBtn}>
                <X size={14} color="#78716C" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={lbl}>Title</label>
                <textarea
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  rows={2}
                  style={{ ...inp, resize: "none", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={lbl}>Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  style={{ ...inp, resize: "none", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Deadline</label>
                  <CalendarPicker value={editDeadline} onChange={setEditDeadline} accentColor="#F97316" />
                  {validateDate(editDeadline, { required: true }) && (
                    <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginTop: "5px" }}>
                      {validateDate(editDeadline, { required: true })}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Quadrant</label>
                  <select
                    value={editQuadrant}
                    onChange={(e) => setEditQuadrant(e.target.value as EisenhowerQ)}
                    style={{ ...inp, cursor: "pointer" }}
                  >
                    {(["Q1","Q2","Q3","Q4"] as const).map((q) => (
                      <option key={q} value={q}>{q} · {Q_META[q].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveEdit} disabled={!editTitle.trim() || !!validateDate(editDeadline, { required: true })} style={{
                flex: 1, padding: "11px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
                opacity: (editTitle.trim() && !validateDate(editDeadline, { required: true })) ? 1 : 0.45,
              }}>
                <Check size={14} style={{ display: "inline", marginRight: 6 }} />
                Save Changes
              </button>
              <button onClick={() => setIsEditing(false)} style={{
                padding: "11px 20px", borderRadius: "10px",
                border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
                fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
              }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* ── View mode ── */
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
                    color: m.color, backgroundColor: m.bg, border: `1px solid ${m.border}`,
                  }}>
                    {task.quadrant} · {m.label}
                  </span>
                  {/* RECURRING_DISABLED — recurring badge
                  {task.kind === "instance" && (
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
                      color: "#78716C", backgroundColor: "#F3F4F6",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}>
                      <RefreshCw size={9} /> Recurring
                    </span>
                  )} */}
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px",
                    color: task.status === "complete" ? "#16A34A" : task.status === "incomplete" ? "#9CA3AF" : "#F97316",
                    backgroundColor: task.status === "complete" ? "#F0FDF4" : task.status === "incomplete" ? "#F9FAFB" : "#FFF7ED",
                  }}>
                    {task.status === "complete" ? "Completed" : task.status === "incomplete" ? "Missed" : "Open"}
                  </span>
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>
                  {task.title}
                </h2>
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                {onUpdate && (
                  <button onClick={openEdit} style={editBtn} title="Edit">
                    <Pencil size={13} color="#FFFFFF" />
                  </button>
                )}
                <button onClick={onClose} style={dismissBtn}>
                  <X size={14} color="#FFFFFF" />
                </button>
              </div>
            </div>

            {task.description && (
              <p style={{ fontSize: "13px", color: "#57534E", lineHeight: 1.65, marginBottom: "16px" }}>
                {task.description}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "20px" }}>
              <Calendar size={13} color="#A8A29E" />
              <span style={{ fontSize: "12px", color: "#57534E", fontWeight: 500 }}>
                Due {fmtDeadline(task.deadline)}
              </span>
            </div>

            {linkedGoal && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px", borderRadius: "10px",
                backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
                marginBottom: "20px",
              }}>
                <Target size={14} color="#F97316" />
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 700, color: "#F97316",
                    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                    Linked Goal
                  </p>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917", margin: 0 }}>
                    {linkedGoal.outcome}
                  </p>
                </div>
              </div>
            )}

            {linkedMilestone && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px", borderRadius: "10px",
                backgroundColor: "#FFFBEB", border: "1px solid #FCD34D",
                marginBottom: "20px",
              }}>
                <span style={{ fontSize: "14px" }}>◆</span>
                <div>
                  <p style={{ fontSize: "9px", fontWeight: 700, color: "#D97706",
                    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                    Milestone
                  </p>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917", margin: 0 }}>
                    {linkedMilestone.title}
                  </p>
                  <p style={{ fontSize: "10px", color: "#78716C", margin: "2px 0 0" }}>
                    Due {fmtDeadline(linkedMilestone.deadline)}
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              {isOpen ? (
                <>
                  <button onClick={() => { onComplete(task.id); onClose(); }} style={{
                    flex: 1, padding: "11px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #16A34A, #15803D)",
                    fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
                  }}>
                    Mark Done ✓
                  </button>
                  <button onClick={() => { onMiss(task.id); onClose(); }} style={{
                    flex: 1, padding: "11px", borderRadius: "10px", border: "none",
                    backgroundColor: "#6B7280",
                    fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
                  }}>
                    Mark Missed
                  </button>
                </>
              ) : (
                onReopen && (
                  <button onClick={() => { onReopen(task.id); onClose(); }} style={{
                    flex: 1, padding: "11px", borderRadius: "10px",
                    border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
                    fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
                  }}>
                    Reopen Task
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700, color: "#44403C",
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: "10px",
  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
};

const editBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "none",
  backgroundColor: "#F97316", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};

const dismissBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "none",
  backgroundColor: "#6B7280", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};
