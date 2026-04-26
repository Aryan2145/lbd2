"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Check, Pencil, Trash2, AlertTriangle, Calendar } from "lucide-react";
import type { WeekPlan, EventGroup } from "@/lib/weeklyTypes";
import { GENERAL_GROUP_ID } from "@/lib/weeklyTypes";
import { ClipboardList } from "lucide-react";
import type { TaskData } from "@/components/tasks/TaskCard";
import { fmtDeadline } from "@/components/tasks/TaskCard";

interface Props {
  weekStart:    string;
  plan:         WeekPlan;
  eventGroups:  EventGroup[];
  overdueTasks: TaskData[];
  onUpdatePlan:    (p: WeekPlan) => void;
  onAddGroup:      (g: EventGroup) => void;
  onUpdateGroup:   (g: EventGroup) => void;
  onDeleteGroup:   (id: string)    => void;
  hasReview:       boolean;
  onOpenReview:    () => void;
}

const GROUP_COLORS = [
  "#6366F1","#3B82F6","#06B6D4","#10B981",
  "#F59E0B","#EF4444","#EC4899","#8B5CF6",
];

function weekLabel(weekStart: string): { num: number; range: string } {
  const d = new Date(weekStart + "T00:00:00");
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const num = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  const start = new Date(weekStart + "T00:00:00");
  const end   = new Date(weekStart + "T00:00:00");
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return { num, range: `${fmt(start)} – ${fmt(end)}` };
}

export default function WeekSidebar({
  weekStart, plan, eventGroups, overdueTasks,
  onUpdatePlan, onAddGroup, onUpdateGroup, onDeleteGroup,
  hasReview, onOpenReview,
}: Props) {
  const { num, range } = weekLabel(weekStart);

  // Priorities editing
  const [editPriIdx, setEditPriIdx] = useState<number | null>(null);
  const [priDraft,   setPriDraft]   = useState("");
  const priInputRef = useRef<HTMLInputElement>(null);

  // Outcomes editing
  const [editOutIdx, setEditOutIdx] = useState<number | null>(null);
  const [outDraft,   setOutDraft]   = useState("");
  const outInputRef = useRef<HTMLInputElement>(null);

  // New group form
  const [showGroupForm, setShowGroupForm]   = useState(false);
  const [newGroupName,  setNewGroupName]    = useState("");
  const [newGroupColor, setNewGroupColor]   = useState(GROUP_COLORS[0]);
  const [editGroupId,   setEditGroupId]     = useState<string | null>(null);

  useEffect(() => { if (editPriIdx !== null) priInputRef.current?.focus(); }, [editPriIdx]);
  useEffect(() => { if (editOutIdx !== null) outInputRef.current?.focus(); }, [editOutIdx]);

  function savePriority() {
    if (editPriIdx === null) return;
    const updated = [...plan.priorities];
    const val = priDraft.trim();
    if (val) { updated[editPriIdx] = val; }
    else     { updated.splice(editPriIdx, 1); }
    onUpdatePlan({ ...plan, priorities: updated });
    setEditPriIdx(null);
  }

  function addPriority() {
    if (plan.priorities.length >= 5) return;
    const updated = [...plan.priorities, ""];
    onUpdatePlan({ ...plan, priorities: updated });
    setEditPriIdx(updated.length - 1);
    setPriDraft("");
  }

  function deletePriority(idx: number) {
    const updated = [...plan.priorities];
    updated.splice(idx, 1);
    onUpdatePlan({ ...plan, priorities: updated });
    setEditPriIdx(null);
  }

  function saveOutcome() {
    if (editOutIdx === null) return;
    const updated = [...plan.outcomes];
    const val = outDraft.trim();
    if (val) { updated[editOutIdx] = val; }
    else     { updated.splice(editOutIdx, 1); }
    onUpdatePlan({ ...plan, outcomes: updated });
    setEditOutIdx(null);
  }

  function addOutcome() {
    const updated = [...plan.outcomes, ""];
    onUpdatePlan({ ...plan, outcomes: updated });
    setEditOutIdx(updated.length - 1);
    setOutDraft("");
  }

  function deleteOutcome(idx: number) {
    const updated = [...plan.outcomes];
    updated.splice(idx, 1);
    onUpdatePlan({ ...plan, outcomes: updated });
    setEditOutIdx(null);
  }

  function saveGroup() {
    if (!newGroupName.trim()) return;
    if (editGroupId) {
      const g = eventGroups.find((x) => x.id === editGroupId);
      if (g) onUpdateGroup({ ...g, name: newGroupName.trim(), color: newGroupColor });
    } else {
      onAddGroup({ id: `eg_${Date.now()}`, name: newGroupName.trim(), color: newGroupColor, createdAt: Date.now() });
    }
    setShowGroupForm(false);
    setNewGroupName("");
    setNewGroupColor(GROUP_COLORS[0]);
    setEditGroupId(null);
  }

  function startEditGroup(g: EventGroup) {
    setEditGroupId(g.id);
    setNewGroupName(g.name);
    setNewGroupColor(g.color);
    setShowGroupForm(true);
  }

  return (
    <div style={{
      width: 260, flexShrink: 0, overflowY: "auto",
      borderRight: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
      display: "flex", flexDirection: "column",
    }}>

      {/* Week banner */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #EDE5D8", flexShrink: 0 }}>
        <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#F97316", marginBottom: "2px" }}>
          Week {num}
        </p>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>{range}</p>
      </div>

      <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Priorities */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <p style={sectionTitle}>Priorities</p>
            {plan.priorities.length < 5 && (
              <button onClick={addPriority} style={addBtn}>
                <Plus size={11} color="#F97316" /> Add
              </button>
            )}
          </div>

          {plan.priorities.length === 0 && (
            <p style={emptyHint}>Add up to 5 weekly priorities</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {plan.priorities.map((pri, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: "#FFF7ED", border: "1.5px solid #FED7AA",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", fontWeight: 700, color: "#F97316",
                }}>
                  {idx + 1}
                </span>
                {editPriIdx === idx ? (
                  <input
                    ref={priInputRef}
                    value={priDraft}
                    onChange={(e) => setPriDraft(e.target.value)}
                    onBlur={savePriority}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") savePriority();
                      if (e.key === "Escape") setEditPriIdx(null);
                    }}
                    style={{ ...inlineInput, flex: 1 }}
                    placeholder="Enter priority…"
                  />
                ) : (
                  <p
                    onClick={() => { setEditPriIdx(idx); setPriDraft(pri); }}
                    style={{ flex: 1, fontSize: "12px", color: "#1C1917", cursor: "text",
                      lineHeight: 1.4, margin: 0,
                      padding: "3px 4px", borderRadius: 4,
                    }}
                  >
                    {pri || <span style={{ color: "#C4B5A8", fontStyle: "italic" }}>Click to edit…</span>}
                  </p>
                )}
                <button onClick={() => deletePriority(idx)} style={ghostBtn}>
                  <X size={11} color="#A8A29E" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Key Outcomes */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <p style={sectionTitle}>Key Outcomes</p>
            <button onClick={addOutcome} style={addBtn}>
              <Plus size={11} color="#F97316" /> Add
            </button>
          </div>

          {plan.outcomes.length === 0 && (
            <p style={emptyHint}>What must be true by end of week?</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {plan.outcomes.map((out, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <Check size={12} color="#16A34A" style={{ marginTop: 3, flexShrink: 0 }} />
                {editOutIdx === idx ? (
                  <input
                    ref={outInputRef}
                    value={outDraft}
                    onChange={(e) => setOutDraft(e.target.value)}
                    onBlur={saveOutcome}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveOutcome();
                      if (e.key === "Escape") setEditOutIdx(null);
                    }}
                    style={{ ...inlineInput, flex: 1 }}
                    placeholder="Enter outcome…"
                  />
                ) : (
                  <p
                    onClick={() => { setEditOutIdx(idx); setOutDraft(out); }}
                    style={{ flex: 1, fontSize: "12px", color: "#1C1917", cursor: "text",
                      lineHeight: 1.4, margin: 0, padding: "3px 4px", borderRadius: 4 }}
                  >
                    {out || <span style={{ color: "#C4B5A8", fontStyle: "italic" }}>Click to edit…</span>}
                  </p>
                )}
                <button onClick={() => deleteOutcome(idx)} style={ghostBtn}>
                  <X size={11} color="#A8A29E" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Event Groups */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <p style={sectionTitle}>Event Groups</p>
            <button onClick={() => { setShowGroupForm(true); setEditGroupId(null); setNewGroupName(""); setNewGroupColor(GROUP_COLORS[0]); }} style={addBtn}>
              <Plus size={11} color="#F97316" /> New
            </button>
          </div>

          {showGroupForm && (
            <div style={{ backgroundColor: "#FAF5EE", borderRadius: 10, padding: "10px", marginBottom: "8px", border: "1px solid #EDE5D8" }}>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name…"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveGroup()}
                style={{ ...inlineInput, width: "100%", marginBottom: "8px" }}
              />
              <div style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
                {GROUP_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewGroupColor(c)} style={{
                    width: 20, height: 20, borderRadius: "50%", backgroundColor: c,
                    border: newGroupColor === c ? "2px solid #1C1917" : "2px solid transparent",
                    cursor: "pointer",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={saveGroup} style={{
                  flex: 1, padding: "5px", borderRadius: 7, border: "none",
                  background: "linear-gradient(135deg, #F97316, #EA580C)",
                  fontSize: "11px", fontWeight: 700, color: "#FFF", cursor: "pointer",
                }}>
                  {editGroupId ? "Update" : "Create"}
                </button>
                <button onClick={() => { setShowGroupForm(false); setEditGroupId(null); }} style={{
                  padding: "5px 10px", borderRadius: 7, border: "1px solid #E8DDD0",
                  backgroundColor: "#FFF", fontSize: "11px", color: "#78716C", cursor: "pointer",
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {eventGroups.filter((g) => g.id !== GENERAL_GROUP_ID).map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 4px", borderRadius: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: g.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: "12px", color: "#1C1917", fontWeight: 500 }}>{g.name}</span>
                <button onClick={() => startEditGroup(g)} style={ghostBtn}><Pencil size={11} color="#A8A29E" /></button>
                <button onClick={() => onDeleteGroup(g.id)} style={ghostBtn}><Trash2 size={11} color="#EF4444" /></button>
              </div>
            ))}
          </div>
        </section>

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
              <AlertTriangle size={11} color="#DC2626" />
              <p style={{ ...sectionTitle, color: "#DC2626", margin: 0 }}>Overdue ({overdueTasks.length})</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {overdueTasks.slice(0, 5).map((t) => (
                <div key={t.id} style={{ fontSize: "11px", color: "#DC2626", backgroundColor: "#FEF2F2",
                  borderRadius: 6, padding: "4px 8px", border: "1px solid #FECACA",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.title}
                  <span style={{ color: "#9CA3AF", marginLeft: 4 }}>· {fmtDeadline(t.deadline)}</span>
                </div>
              ))}
              {overdueTasks.length > 5 && (
                <p style={{ fontSize: "10px", color: "#A8A29E", paddingLeft: 4 }}>+{overdueTasks.length - 5} more</p>
              )}
            </div>
          </section>
        )}

        {/* Weekly Review */}
        <section style={{ marginTop: "auto" }}>
          <button onClick={onOpenReview} style={{
            width: "100%", padding: "9px 12px", borderRadius: "10px",
            border: `1.5px solid ${hasReview ? "#BBF7D0" : "#FED7AA"}`,
            backgroundColor: hasReview ? "#F0FDF4" : "#FFF7ED",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontSize: "11px", fontWeight: 700,
            color: hasReview ? "#15803D" : "#F97316",
            cursor: "pointer", marginBottom: "8px",
          }}>
            <ClipboardList size={12} />
            {hasReview ? "✓ Review Done · Edit" : "Write Week Review"}
            {!hasReview && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor: "#F97316", flexShrink: 0,
              }} />
            )}
          </button>
        </section>

        {/* Google Calendar placeholder */}
        <section>
          <button style={{
            width: "100%", padding: "9px 12px", borderRadius: "10px",
            border: "1.5px dashed #E8DDD0", backgroundColor: "#FAFAFA",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontSize: "11px", fontWeight: 600, color: "#A8A29E", cursor: "not-allowed",
          }}>
            <Calendar size={12} /> Connect Google Calendar
          </button>
          <p style={{ fontSize: "9px", color: "#C4B5A8", textAlign: "center", marginTop: "4px" }}>Coming soon</p>
        </section>

      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "#A8A29E", margin: 0,
};

const addBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "3px",
  padding: "3px 8px", borderRadius: "6px",
  border: "1px solid #FED7AA", backgroundColor: "#FFF7ED",
  fontSize: "10px", fontWeight: 600, color: "#F97316", cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: "none",
  backgroundColor: "transparent", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer", padding: 0,
};

const inlineInput: React.CSSProperties = {
  padding: "4px 8px", borderRadius: 6, border: "1.5px solid #F97316",
  backgroundColor: "#FFFFFF", fontSize: "12px", color: "#1C1917",
  outline: "none", boxSizing: "border-box",
};

const emptyHint: React.CSSProperties = {
  fontSize: "11px", color: "#C4B5A8", fontStyle: "italic",
  marginBottom: "4px", lineHeight: 1.4,
};
