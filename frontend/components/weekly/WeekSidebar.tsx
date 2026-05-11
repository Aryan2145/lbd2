"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Check, Pencil, Trash2, AlertTriangle, Archive, ChevronDown, RotateCcw } from "lucide-react";
import type { WeekPlan, EventGroup, WeekEvent } from "@/lib/weeklyTypes";
import { GENERAL_GROUP_ID } from "@/lib/weeklyTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import { fmtDeadline } from "@/components/tasks/TaskCard";

interface Props {
  weekStart:    string;
  plan:         WeekPlan;
  eventGroups:  EventGroup[];
  weekEvents:   WeekEvent[];
  overdueTasks: TaskData[];
  onUpdatePlan:    (p: WeekPlan) => void;
  onAddGroup:      (g: EventGroup) => void;
  onUpdateGroup:   (g: EventGroup) => void;
  onDeleteGroup:   (id: string)    => void;
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
  weekStart, plan, eventGroups, weekEvents, overdueTasks,
  onUpdatePlan, onAddGroup, onUpdateGroup, onDeleteGroup,
}: Props) {
  const { num, range } = weekLabel(weekStart);

  // Outcomes editing
  const [editOutIdx, setEditOutIdx] = useState<number | null>(null);
  const [outDraft,   setOutDraft]   = useState("");
  const outInputRef = useRef<HTMLInputElement>(null);

  // New group form
  const [showGroupForm, setShowGroupForm]   = useState(false);
  const [newGroupName,  setNewGroupName]    = useState("");
  const [newGroupColor, setNewGroupColor]   = useState(GROUP_COLORS[0]);
  const [editGroupId,   setEditGroupId]     = useState<string | null>(null);
  const [archiveOpen,   setArchiveOpen]     = useState(false);

  useEffect(() => { if (editOutIdx !== null) outInputRef.current?.focus(); }, [editOutIdx]);

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

        {/* Key Outcomes */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <p style={sectionTitle}>Key Outcomes</p>
            <button onClick={addOutcome} style={addBtn}>
              <Plus size={11} color="#FFFFFF" /> Add
            </button>
          </div>

          {plan.outcomes.length === 0 && (
            <p style={emptyHint}>What must be true by end of week?</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
            {plan.outcomes.map((out, idx) => {
              const done = (plan.doneOutcomes ?? []).includes(out);
              const toggleDone = () => {
                if (!out.trim()) return; // can't toggle empty placeholder
                const cur  = plan.doneOutcomes ?? [];
                const next = done ? cur.filter((t) => t !== out) : [...cur, out];
                onUpdatePlan({ ...plan, doneOutcomes: next });
              };
              return (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                  <button
                    onClick={toggleDone}
                    title={done ? "Mark as not done" : "Mark as done"}
                    style={{
                      width: 14, height: 14, borderRadius: 3, padding: 0, cursor: "pointer",
                      border: done ? "none" : "1.5px solid #C4B5A8",
                      backgroundColor: done ? "#16A34A" : "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 3,
                    }}
                  >
                    {done && <Check size={9} color="#FFFFFF" strokeWidth={3} />}
                  </button>
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
                      style={{
                        flex: 1, fontSize: "13px",
                        color: done ? "#15803D" : "#1C1917",
                        textDecoration: done ? "line-through" : "none",
                        cursor: "text", lineHeight: 1.4, margin: 0,
                        padding: "3px 4px", borderRadius: 4,
                      }}
                    >
                      {out || <span style={{ color: "#78716C", fontStyle: "italic" }}>Click to edit…</span>}
                    </p>
                  )}
                  <button onClick={() => deleteOutcome(idx)} style={ghostBtn}>
                    <X size={11} color="#78716C" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Event Groups */}
        {(() => {
          const activeGroups   = eventGroups.filter((g) => g.id !== GENERAL_GROUP_ID && !g.archived);
          const archivedGroups = eventGroups.filter((g) => g.id !== GENERAL_GROUP_ID && g.archived);
          return (
            <section>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <p style={sectionTitle}>Event Groups</p>
                  <span style={countBadge}>{activeGroups.length}</span>
                </div>
                <button onClick={() => { setShowGroupForm(true); setEditGroupId(null); setNewGroupName(""); setNewGroupColor(GROUP_COLORS[0]); }} style={addBtn}>
                  <Plus size={11} color="#FFFFFF" /> New
                </button>
              </div>

              {/* Create / Edit form */}
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

              {/* Active groups list — scrolls after 4 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: activeGroups.length > 4 ? "144px" : undefined, overflowY: activeGroups.length > 4 ? "auto" : undefined }}>
                {activeGroups.map((g) => {
                  const groupHasEvents = weekEvents.some((e) => e.groupId === g.id);
                  return (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 4px", borderRadius: 7, flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: g.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: "13px", color: "#1C1917", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                      <button onClick={() => startEditGroup(g)} style={iconBtn}><Pencil size={11} color="#FFFFFF" /></button>
                      {groupHasEvents ? (
                        <button
                          onClick={() => onUpdateGroup({ ...g, archived: true })}
                          title="Archive group"
                          style={{ ...iconBtn, backgroundColor: "#6B7280" }}
                        >
                          <Archive size={11} color="#FFFFFF" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onDeleteGroup(g.id)}
                          style={{ ...iconBtn, backgroundColor: "#EF4444" }}
                        >
                          <Trash2 size={11} color="#FFFFFF" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {activeGroups.length === 0 && (
                  <p style={emptyHint}>No groups yet. Create one above.</p>
                )}
              </div>

              {/* Archived groups toggle */}
              {archivedGroups.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => setArchiveOpen((o) => !o)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "5px",
                      padding: "5px 4px", borderRadius: 7, border: "none",
                      backgroundColor: "transparent", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <ChevronDown size={12} color="#78716C" style={{ transition: "transform 0.2s", transform: archiveOpen ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }} />
                    <span style={{ ...sectionTitle, margin: 0 }}>Archived</span>
                    <span style={countBadge}>{archivedGroups.length}</span>
                  </button>

                  {archiveOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", maxHeight: archivedGroups.length > 4 ? "144px" : undefined, overflowY: archivedGroups.length > 4 ? "auto" : undefined }}>
                      {archivedGroups.map((g) => {
                        const groupHasEvents = weekEvents.some((e) => e.groupId === g.id);
                        return (
                          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 4px", borderRadius: 7, flexShrink: 0, opacity: 0.7 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: g.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: "13px", color: "#1C1917", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                            <button
                              onClick={() => onUpdateGroup({ ...g, archived: false })}
                              title="Unarchive group"
                              style={ghostBtn}
                            >
                              <RotateCcw size={11} color="#78716C" />
                            </button>
                            {!groupHasEvents && (
                              <button
                                onClick={() => onDeleteGroup(g.id)}
                                style={ghostBtn}
                              >
                                <Trash2 size={11} color="#EF4444" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
              <AlertTriangle size={11} color="#DC2626" />
              <p style={{ ...sectionTitle, color: "#DC2626", margin: 0 }}>Overdue ({overdueTasks.length})</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "144px", overflowY: "auto" }}>
              {overdueTasks.map((t) => (
                <div key={t.id} style={{ fontSize: "11px", color: "#DC2626", backgroundColor: "#FEF2F2",
                  borderRadius: 6, padding: "4px 8px", border: "1px solid #FECACA",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
                  {t.title}
                  <span style={{ color: "#78716C", marginLeft: 4 }}>· {fmtDeadline(t.deadline)}</span>
                </div>
              ))}
            </div>
          </section>
        )}



      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "#1C1917", margin: 0,
};

const addBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "3px",
  padding: "3px 8px", borderRadius: "6px",
  border: "none", backgroundColor: "#F97316",
  fontSize: "10px", fontWeight: 600, color: "#FFFFFF", cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: "none",
  backgroundColor: "transparent", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer", padding: 0,
};

const iconBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: "none",
  backgroundColor: "#F97316", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer", padding: 0, flexShrink: 0,
};

const inlineInput: React.CSSProperties = {
  padding: "4px 8px", borderRadius: 6, border: "1.5px solid #F97316",
  backgroundColor: "#FFFFFF", fontSize: "13px", color: "#1C1917",
  outline: "none", boxSizing: "border-box",
};

const emptyHint: React.CSSProperties = {
  fontSize: "11px", color: "#57534E", fontStyle: "italic",
  marginBottom: "4px", lineHeight: 1.4,
};

const countBadge: React.CSSProperties = {
  fontSize: "9px", fontWeight: 700,
  backgroundColor: "#F97316", color: "#FFFFFF",
  borderRadius: "10px", padding: "1px 5px",
};
