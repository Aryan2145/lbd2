"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Check, Clock, Lightbulb, Pencil, Trash2 } from "lucide-react";
import type { DayPlan, DailyPriority, LifeArea } from "@/lib/dayTypes";
import { LIFE_AREAS, LIFE_AREA_COLORS, LIFE_AREA_LABELS } from "@/lib/dayTypes";
import type { WeekPlan, WeekEvent, EventGroup } from "@/lib/weeklyTypes";
import { GENERAL_GROUP_ID } from "@/lib/weeklyTypes";
import type { TaskData, EisenhowerQ } from "@/components/tasks/TaskCard";
import { Q_META } from "@/components/tasks/TaskCard";

const DAILY_QUOTES = [
  { text: "Do the hard thing first. The rest of the day gets easier.", author: "Brian Tracy" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "One day at a time. One task at a time. One moment at a time.", author: "" },
  { text: "Clarity comes from action, not from thought.", author: "" },
  { text: "Small steps forward are still steps forward.", author: "" },
  { text: "Your habits today are building your identity of tomorrow.", author: "James Clear" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "It's not about having time. It's about making time.", author: "" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
];

function getDailyQuote(): { text: string; author: string } {
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_QUOTES[doy % DAILY_QUOTES.length];
}

const EMPTY_PRI = (lifeArea: LifeArea = "professional"): DailyPriority => ({
  text: "", lifeArea, completed: false,
});

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ── Reusable color-coded custom select ────────────────────────────────────────
function ColorSelect({
  value, onChange, options, getColor, getLabel, listWidth,
}: {
  value:     string;
  onChange:  (v: string) => void;
  options:   readonly string[];
  getColor:  (v: string) => string;
  getLabel:  (v: string) => string;
  listWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const color = getColor(value);
  const label = getLabel(value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: "3px 8px 3px 6px", borderRadius: "20px",
          backgroundColor: `${color}18`, border: `1px solid ${color}40`,
          cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
        <span style={{ fontSize: "10px", fontWeight: 700, color }}>{label}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 300,
          backgroundColor: "#FFFFFF", borderRadius: "10px",
          border: "1px solid #E8DDD0",
          boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
          overflow: "hidden",
          minWidth: listWidth ? `${listWidth}px` : "140px",
        }}>
          {options.map((opt) => {
            const c = getColor(opt);
            const l = getLabel(opt);
            const selected = opt === value;
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "9px",
                  width: "100%", padding: "9px 14px", border: "none",
                  backgroundColor: selected ? `${c}15` : "transparent",
                  cursor: "pointer", textAlign: "left",
                  borderBottom: "1px solid #F5F5F4",
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: c, flexShrink: 0 }} />
                <span style={{ fontSize: "12px", fontWeight: selected ? 700 : 500, color: c }}>{l}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  date:           string;
  plan:           DayPlan;
  onUpdate:       (d: DayPlan) => void;
  weekPlan:       WeekPlan | null;
  todayEvents:    WeekEvent[];
  eventGroups:    EventGroup[];
  tasks:          TaskData[];
  onTaskClick?:   (t: TaskData) => void;
  onAddEvent?:    (e: WeekEvent) => void;
  onUpdateEvent?: (e: WeekEvent) => void;
  onDeleteEvent?: (id: string)   => void;
  onAddTask?:     (t: TaskData)  => void;
  onCompleteTask?:(id: string)   => void;
  onUpdateTask?:  (t: TaskData)  => void;
}

export default function MorningPlan({
  date, plan, onUpdate, weekPlan,
  todayEvents, eventGroups, tasks,
  onTaskClick,
  onAddEvent, onUpdateEvent, onDeleteEvent,
  onAddTask, onCompleteTask,
}: Props) {
  const [scheduleView,  setScheduleView]  = useState<"time" | "group">("time");
  const [taskFilter,    setTaskFilter]    = useState<"overdue" | "today" | "soon">("today");

  // ── Add event ──────────────────────────────────────────────────────────────
  const [showAddEvent,  setShowAddEvent]  = useState(false);
  const [newEvTitle,    setNewEvTitle]    = useState("");
  const [newEvStart,    setNewEvStart]    = useState("");
  const [newEvEnd,      setNewEvEnd]      = useState("");
  const [newEvGroupId,  setNewEvGroupId]  = useState("");

  // ── Edit event ─────────────────────────────────────────────────────────────
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEvTitle,    setEditEvTitle]    = useState("");
  const [editEvStart,    setEditEvStart]    = useState("");
  const [editEvEnd,      setEditEvEnd]      = useState("");
  const [editEvGroupId,  setEditEvGroupId]  = useState("");
  const [editEvDate,     setEditEvDate]     = useState("");

  // ── Add task ───────────────────────────────────────────────────────────────
  const [showAddTask,   setShowAddTask]   = useState(false);
  const [newTaskTitle,  setNewTaskTitle]  = useState("");
  const [newTaskQuad,   setNewTaskQuad]   = useState<EisenhowerQ>("Q2");

  // ── Undo-delete for priorities ─────────────────────────────────────────────
  const [pendingDeletePriIdx, setPendingDeletePriIdx] = useState<number | null>(null);
  const priDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planRef        = useRef(plan);
  const prisRef        = useRef<DailyPriority[]>([]);
  useEffect(() => { planRef.current = plan; }, [plan]);

  const quote    = getDailyQuote();
  const groupMap = Object.fromEntries(eventGroups.map((g) => [g.id, g]));

  const pris: DailyPriority[] = plan.priorities.length > 0 ? plan.priorities : [EMPTY_PRI()];
  prisRef.current = pris;

  function updatePri(idx: number, patch: Partial<DailyPriority>) {
    const updated = pris.map((p, i) => i === idx ? { ...p, ...patch } : p);
    onUpdate({ ...plan, priorities: updated });
  }

  function addPriority() {
    onUpdate({ ...plan, priorities: [...pris, EMPTY_PRI()] });
  }

  function requestDeletePri(idx: number) {
    if (priDeleteTimer.current) clearTimeout(priDeleteTimer.current);
    setPendingDeletePriIdx(idx);
    priDeleteTimer.current = setTimeout(() => {
      const cur = prisRef.current;
      const updated = cur.filter((_, i) => i !== idx);
      onUpdate({ ...planRef.current, priorities: updated.length ? updated : [] });
      setPendingDeletePriIdx(null);
      priDeleteTimer.current = null;
    }, 3000);
  }
  function undoDeletePri() {
    if (priDeleteTimer.current) clearTimeout(priDeleteTimer.current);
    priDeleteTimer.current = null;
    setPendingDeletePriIdx(null);
  }

  // ── Event save/edit ────────────────────────────────────────────────────────
  function saveEvent() {
    if (!newEvTitle.trim() || !newEvStart || !newEvEnd || !onAddEvent) return;
    onAddEvent({
      id: `ev_${Date.now()}`,
      groupId: newEvGroupId || GENERAL_GROUP_ID,
      title: newEvTitle.trim(),
      description: "",
      date,
      startTime: newEvStart,
      endTime: newEvEnd,
      createdAt: Date.now(),
    });
    setNewEvTitle(""); setNewEvStart(""); setNewEvEnd(""); setNewEvGroupId("");
    setShowAddEvent(false);
  }

  function startEditEvent(ev: WeekEvent) {
    setShowAddEvent(false);
    setEditingEventId(ev.id);
    setEditEvTitle(ev.title);
    setEditEvStart(ev.startTime);
    setEditEvEnd(ev.endTime);
    setEditEvGroupId(ev.groupId === GENERAL_GROUP_ID ? "" : ev.groupId);
    setEditEvDate(ev.date);
  }

  function cancelEditEvent() { setEditingEventId(null); }

  function saveEditEvent() {
    if (!editEvTitle.trim() || !editEvStart || !editEvEnd || !onUpdateEvent) return;
    onUpdateEvent({
      id: editingEventId!,
      groupId: editEvGroupId || GENERAL_GROUP_ID,
      title: editEvTitle.trim(),
      description: "",
      date: editEvDate,
      startTime: editEvStart,
      endTime: editEvEnd,
      createdAt: Date.now(),
    });
    setEditingEventId(null);
  }

  function deleteEditEvent() {
    if (!editingEventId || !onDeleteEvent) return;
    onDeleteEvent(editingEventId);
    setEditingEventId(null);
  }

  // ── Task save ──────────────────────────────────────────────────────────────
  function saveTask() {
    if (!newTaskTitle.trim() || !onAddTask) return;
    onAddTask({
      id: `t_${Date.now()}`,
      kind: "one-time",
      title: newTaskTitle.trim(),
      description: "",
      deadline: date,
      quadrant: newTaskQuad,
      status: "open",
      createdAt: Date.now(),
      linkedGoalId: "",
    });
    setNewTaskTitle(""); setNewTaskQuad("Q2");
    setShowAddTask(false);
  }

  // ── Task buckets ───────────────────────────────────────────────────────────
  const overdueTasks  = tasks.filter((t) => t.deadline < date && t.status === "open");
  const todayTasks    = tasks.filter((t) => t.deadline === date && t.status === "open");
  const upcomingTasks = tasks
    .filter((t) => {
      if (t.deadline <= date || t.status !== "open") return false;
      const days = Math.round((new Date(t.deadline + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime()) / 86400000);
      return days <= 3;
    })
    .slice(0, 3);

  // ── Add-event live validation ─────────────────────────────────────────────
  const evStartMins   = newEvStart ? toMins(newEvStart) : -1;
  const evEndMins     = newEvEnd   ? toMins(newEvEnd)   : -1;
  const evTimeInvalid = newEvStart && newEvEnd ? evStartMins >= evEndMins : false;
  const evConflict    = newEvStart && newEvEnd && !evTimeInvalid
    ? todayEvents.find((e) => {
        const es = toMins(e.startTime), ee = toMins(e.endTime);
        return !(evEndMins <= es || evStartMins >= ee);
      }) ?? null
    : null;
  const evNudge = newEvStart && newEvEnd && !evTimeInvalid && !evConflict
    ? todayEvents.find((e) => {
        const gap = evStartMins - toMins(e.endTime);
        return gap >= 0 && gap < 15;
      }) ?? null
    : null;
  const canAddEvent = newEvTitle.trim().length > 0 && !!newEvStart && !!newEvEnd && !evTimeInvalid && !evConflict;

  // ── Edit-event live validation ────────────────────────────────────────────
  const editStartMins    = editEvStart ? toMins(editEvStart) : -1;
  const editEndMins      = editEvEnd   ? toMins(editEvEnd)   : -1;
  const editTimeInvalid  = editEvStart && editEvEnd ? editStartMins >= editEndMins : false;
  const editEvConflict   = editEvDate && editEvStart && editEvEnd && !editTimeInvalid
    ? todayEvents.find((e) => {
        if (e.id === editingEventId) return false;
        if (e.date !== editEvDate) return false;
        const es = toMins(e.startTime), ee = toMins(e.endTime);
        return !(editEndMins <= es || editStartMins >= ee);
      }) ?? null
    : null;
  const canSaveEdit = editEvTitle.trim().length > 0 && !!editEvStart && !!editEvEnd && !editTimeInvalid && !editEvConflict;

  // ── Schedule views ────────────────────────────────────────────────────────
  const sortedEvents  = [...todayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const groupedEvents = eventGroups
    .map((g) => ({ group: g, events: sortedEvents.filter((e) => e.groupId === g.id) }))
    .filter(({ events }) => events.length > 0);

  const completedPriCount = pris.filter((p) => p.completed && p.text.trim()).length;
  const totalPriCount     = pris.filter((p) => p.text.trim()).length;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <style>{`@keyframes drainBar { from { width: 100%; } to { width: 0%; } }`}</style>

      {/* ── Left context panel ── */}
      <div style={{
        width: 252, flexShrink: 0, overflowY: "auto",
        borderRight: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
        padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px",
      }}>

        {weekPlan && weekPlan.priorities.length > 0 && (
          <section>
            <p style={sectionTitle}>This Week&apos;s Focus</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "8px" }}>
              {weekPlan.priorities.map((pri, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    backgroundColor: "#FFF7ED", border: "1.5px solid #FED7AA",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "8px", fontWeight: 700, color: "#F97316",
                  }}>
                    {i + 1}
                  </span>
                  <p style={{ fontSize: "11px", color: "#1C1917", lineHeight: 1.4, margin: 0 }}>{pri}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div style={{
            padding: "14px", borderRadius: "12px",
            background: "linear-gradient(135deg, #FFF7ED, #FEF3C7)",
            border: "1px solid #FED7AA",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
              <span>💡</span>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "#F97316",
                textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Thought for the day
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#78350F", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
              &ldquo;{quote.text}&rdquo;
            </p>
            {quote.author && (
              <p style={{ fontSize: "10px", color: "#92400E", margin: "6px 0 0", fontWeight: 600 }}>
                — {quote.author}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Main planning panel ── */}
      <div style={{ flex: 1, overflow: "hidden", padding: "16px 20px", display: "flex" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "14px",
          flex: 1,
          minHeight: 0,
        }}>

          {/* ── Top-left: Today's Priorities ── */}
          <div style={boxStyle}>
            <div style={boxHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={sectionTitle}>Today&apos;s Priorities</p>
                {totalPriCount > 0 && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700, color: "#16A34A",
                    backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0",
                    padding: "1px 8px", borderRadius: "20px",
                  }}>
                    {completedPriCount}/{totalPriCount}
                  </span>
                )}
              </div>
              <button onClick={addPriority} style={iconBtn} title="Add priority">
                <Plus size={13} color="#F97316" />
              </button>
            </div>
            <div style={boxContent}>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {pris.map((pri, idx) => (
                  pendingDeletePriIdx === idx ? (
                    <div key={idx} style={{
                      padding: "8px 10px", borderRadius: "10px",
                      border: "1.5px solid #FED7AA", backgroundColor: "#FFF7ED",
                      position: "relative", overflow: "hidden",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", color: "#A8A29E", fontStyle: "italic" }}>
                          {pri.text || `Priority ${idx + 1}`}
                        </span>
                        <button onClick={undoDeletePri} style={{
                          fontSize: "11px", fontWeight: 700, color: "#F97316",
                          background: "none", border: "none", cursor: "pointer", padding: "0 4px",
                        }}>
                          Undo
                        </button>
                      </div>
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, height: "2px",
                        backgroundColor: "#F97316",
                        animation: "drainBar 3s linear forwards",
                      }} />
                    </div>
                  ) : (
                    <div key={idx} style={{
                      display: "flex", alignItems: "flex-start", gap: "8px",
                      padding: "8px 10px", borderRadius: "10px",
                      backgroundColor: pri.completed ? "#F0FDF4" : "#FAFAFA",
                      border: `1.5px solid ${pri.completed ? "#BBF7D0" : "#E8DDD0"}`,
                    }}>
                      <button
                        onClick={() => updatePri(idx, { completed: !pri.completed })}
                        style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                          border: `2px solid ${pri.completed ? "#16A34A" : "#C8BFB5"}`,
                          backgroundColor: pri.completed ? "#16A34A" : "#FFFFFF",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        {pri.completed && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                      </button>
                      <textarea
                        ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
                        value={pri.text}
                        onChange={(e) => {
                          updatePri(idx, { text: e.target.value });
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder={`Priority ${idx + 1}…`}
                        rows={1}
                        style={{
                          flex: 1, minWidth: 0, border: "none", outline: "none",
                          backgroundColor: "transparent", padding: 0, resize: "none",
                          overflow: "hidden", lineHeight: "1.45", fontFamily: "inherit",
                          fontSize: "13px", fontWeight: 600,
                          color: pri.completed ? "#78716C" : "#1C1917",
                          textDecoration: pri.completed ? "line-through" : "none",
                        }}
                      />
                      <div style={{ flexShrink: 0, marginTop: 2 }}>
                        <ColorSelect
                          value={pri.lifeArea}
                          onChange={(v) => updatePri(idx, { lifeArea: v as LifeArea })}
                          options={LIFE_AREAS}
                          getColor={(a) => LIFE_AREA_COLORS[a as LifeArea]}
                          getLabel={(a) => LIFE_AREA_LABELS[a as LifeArea]}
                        />
                      </div>
                      <button onClick={() => requestDeletePri(idx)} style={{ ...ghostBtn, marginTop: 1 }}>
                        <X size={11} color="#C4B5A8" />
                      </button>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* ── Top-right: Today's Schedule ── */}
          <div style={boxStyle}>
            <div style={boxHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <p style={sectionTitle}>Today&apos;s Schedule</p>
                <span style={{ fontSize: "10px", color: "#A8A29E", fontWeight: 500 }}>
                  {todayEvents.length} block{todayEvents.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  onClick={() => { setShowAddEvent((v) => !v); setEditingEventId(null); }}
                  style={iconBtn} title="Add event"
                >
                  <Plus size={13} color="#F97316" />
                </button>
                <div style={{ display: "flex", borderRadius: "7px", border: "1.5px solid #E8DDD0", overflow: "hidden" }}>
                  {([["time", "By Time"], ["group", "By Group"]] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setScheduleView(v)} style={{
                      padding: "3px 9px", border: "none",
                      backgroundColor: scheduleView === v ? "#F97316" : "#FFFFFF",
                      color: scheduleView === v ? "#FFFFFF" : "#78716C",
                      fontSize: "10px", fontWeight: 600, cursor: "pointer",
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={boxContent}>

              {showAddEvent && (
                <div style={{
                  marginBottom: "10px", padding: "10px 12px", borderRadius: "10px",
                  border: `1.5px solid ${evConflict || evTimeInvalid ? "#FCA5A5" : "#FED7AA"}`,
                  backgroundColor: "#FFF7ED",
                  display: "flex", flexDirection: "column", gap: "7px",
                }}>
                  <input
                    value={newEvTitle} onChange={(e) => setNewEvTitle(e.target.value)}
                    placeholder="Event title…" autoFocus
                    onKeyDown={(e) => e.key === "Enter" && canAddEvent && saveEvent()}
                    style={{ border: "none", outline: "none", backgroundColor: "transparent",
                      fontSize: "13px", fontWeight: 600, color: "#1C1917", padding: 0, width: "100%" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <input type="time" value={newEvStart} onChange={(e) => setNewEvStart(e.target.value)}
                      style={{ ...timeInputStyle, borderColor: evTimeInvalid ? "#FCA5A5" : "#E8DDD0" }} />
                    <span style={{ fontSize: "11px", color: "#A8A29E" }}>–</span>
                    <input type="time" value={newEvEnd} onChange={(e) => setNewEvEnd(e.target.value)}
                      style={{ ...timeInputStyle, borderColor: evTimeInvalid ? "#FCA5A5" : "#E8DDD0" }} />
                    <select value={newEvGroupId} onChange={(e) => setNewEvGroupId(e.target.value)}
                      style={{ flex: 1, fontSize: "11px", border: "1px solid #E8DDD0", borderRadius: "6px",
                        padding: "3px 6px", outline: "none", backgroundColor: "#FFFFFF", color: "#78716C", cursor: "pointer" }}>
                      <option value="">No group</option>
                      {eventGroups.filter((g) => g.id !== GENERAL_GROUP_ID).map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <button onClick={saveEvent} disabled={!canAddEvent}
                      style={{ ...saveBtn, opacity: canAddEvent ? 1 : 0.4, cursor: canAddEvent ? "pointer" : "not-allowed" }}>
                      Add
                    </button>
                    <button onClick={() => setShowAddEvent(false)} style={ghostBtn}><X size={12} color="#A8A29E" /></button>
                  </div>
                  {evTimeInvalid && (
                    <p style={{ fontSize: "10px", color: "#DC2626", fontWeight: 600, margin: 0 }}>
                      End time must be after start time.
                    </p>
                  )}
                  {evConflict && !evTimeInvalid && (
                    <p style={{ fontSize: "10px", color: "#DC2626", fontWeight: 600, margin: 0 }}>
                      Overlaps with &ldquo;{evConflict.title}&rdquo; ({evConflict.startTime}–{evConflict.endTime})
                    </p>
                  )}
                  {evNudge && (
                    <p style={{ fontSize: "10px", color: "#92400E", fontWeight: 600, margin: 0,
                      display: "flex", alignItems: "center", gap: "4px" }}>
                      <Lightbulb size={10} color="#92400E" />
                      &ldquo;{evNudge.title}&rdquo; ends at {evNudge.endTime} — consider a 15-min buffer.
                    </p>
                  )}
                </div>
              )}

              {editingEventId && (
                <div style={{
                  marginBottom: "10px", padding: "10px 12px", borderRadius: "10px",
                  border: `1.5px solid ${editTimeInvalid || editEvConflict ? "#FCA5A5" : "#A5B4FC"}`,
                  backgroundColor: "#EEF2FF",
                  display: "flex", flexDirection: "column", gap: "7px",
                }}>
                  <input
                    value={editEvTitle} onChange={(e) => setEditEvTitle(e.target.value)}
                    autoFocus
                    style={{ border: "none", outline: "none", backgroundColor: "transparent",
                      fontSize: "13px", fontWeight: 600, color: "#1C1917", padding: 0, width: "100%" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <input type="time" value={editEvStart} onChange={(e) => setEditEvStart(e.target.value)}
                      style={{ ...timeInputStyle, borderColor: editTimeInvalid ? "#FCA5A5" : "#E8DDD0" }} />
                    <span style={{ fontSize: "11px", color: "#A8A29E" }}>–</span>
                    <input type="time" value={editEvEnd} onChange={(e) => setEditEvEnd(e.target.value)}
                      style={{ ...timeInputStyle, borderColor: editTimeInvalid ? "#FCA5A5" : "#E8DDD0" }} />
                    <input type="date" value={editEvDate} onChange={(e) => setEditEvDate(e.target.value)}
                      style={{ ...timeInputStyle, fontSize: "10px" }} />
                    <select value={editEvGroupId} onChange={(e) => setEditEvGroupId(e.target.value)}
                      style={{ flex: 1, fontSize: "11px", border: "1px solid #E8DDD0", borderRadius: "6px",
                        padding: "3px 6px", outline: "none", backgroundColor: "#FFFFFF", color: "#78716C", cursor: "pointer" }}>
                      <option value="">No group</option>
                      {eventGroups.filter((g) => g.id !== GENERAL_GROUP_ID).map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <button onClick={saveEditEvent} disabled={!canSaveEdit}
                      style={{ ...saveBtn, opacity: canSaveEdit ? 1 : 0.4, cursor: canSaveEdit ? "pointer" : "not-allowed" }}>
                      Save
                    </button>
                    <button onClick={deleteEditEvent} style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "3px 10px", borderRadius: "6px", border: "1px solid #FCA5A5",
                      backgroundColor: "#FEF2F2", fontSize: "11px", fontWeight: 700,
                      color: "#DC2626", cursor: "pointer",
                    }}>
                      <Trash2 size={10} /> Delete
                    </button>
                    <button onClick={cancelEditEvent} style={ghostBtn}><X size={12} color="#A8A29E" /></button>
                  </div>
                  {editTimeInvalid && (
                    <p style={{ fontSize: "10px", color: "#DC2626", fontWeight: 600, margin: 0 }}>
                      End time must be after start time.
                    </p>
                  )}
                  {editEvConflict && !editTimeInvalid && (
                    <p style={{ fontSize: "10px", color: "#DC2626", fontWeight: 600, margin: 0 }}>
                      Overlaps with &ldquo;{editEvConflict.title}&rdquo; ({editEvConflict.startTime}–{editEvConflict.endTime})
                    </p>
                  )}
                </div>
              )}

              {todayEvents.length === 0 && !showAddEvent && !editingEventId ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: "100%", gap: "6px" }}>
                  <Clock size={20} color="#D6C5B4" />
                  <p style={{ fontSize: "11px", color: "#C4B5A8", margin: 0 }}>No events today</p>
                </div>
              ) : scheduleView === "time" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {sortedEvents.map((ev) => {
                    const g = groupMap[ev.groupId];
                    const color = g?.color ?? "#6366F1";
                    return (
                      <div key={ev.id} style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "7px 10px", borderRadius: "9px",
                        backgroundColor: color + "10", borderLeft: `3px solid ${color}`,
                      }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color, minWidth: 72, flexShrink: 0 }}>
                          {ev.startTime}–{ev.endTime}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917", flex: 1,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.title}
                        </span>
                        {g && g.name !== "General" && (
                          <span style={{ fontSize: "9px", fontWeight: 600, color, whiteSpace: "nowrap" }}>
                            {g.name}
                          </span>
                        )}
                        <button
                          onClick={() => editingEventId === ev.id ? cancelEditEvent() : startEditEvent(ev)}
                          style={{ ...ghostBtn, color: "#A8A29E" }}
                          title="Edit event"
                        >
                          <Pencil size={10} color={editingEventId === ev.id ? "#6366F1" : "#C4B5A8"} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {groupedEvents.map(({ group: g, events }) => (
                    <div key={g.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: g.color }} />
                        <span style={{ fontSize: "9px", fontWeight: 700, color: g.color,
                          textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {g.name}
                        </span>
                      </div>
                      {events.map((ev) => (
                        <div key={ev.id} style={{
                          display: "flex", gap: "8px", padding: "5px 10px",
                          borderRadius: "8px", backgroundColor: g.color + "10", marginBottom: "3px",
                          alignItems: "center",
                        }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: g.color, minWidth: 72, flexShrink: 0 }}>
                            {ev.startTime}–{ev.endTime}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#1C1917", flex: 1,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.title}
                          </span>
                          <button
                            onClick={() => editingEventId === ev.id ? cancelEditEvent() : startEditEvent(ev)}
                            style={ghostBtn}
                          >
                            <Pencil size={10} color={editingEventId === ev.id ? "#6366F1" : "#C4B5A8"} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom: Tasks (full width) ── */}
          <div style={{ ...boxStyle, gridColumn: "1 / -1" }}>
            <div style={boxHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <p style={sectionTitle}>Tasks</p>
                <div style={{ display: "flex", gap: "4px" }}>
                  {([
                    ["overdue", "Overdue",  overdueTasks.length,  "#DC2626", "#FEF2F2", "#FECACA"],
                    ["today",   "Due Today", todayTasks.length,   "#F97316", "#FFF7ED", "#FED7AA"],
                    ["soon",    "Due Soon",  upcomingTasks.length, "#78716C", "#F5F5F4", "#E7E5E4"],
                  ] as const).map(([key, label, count, color, bg]) => (
                    <button
                      key={key}
                      onClick={() => setTaskFilter(key)}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        padding: "3px 8px", borderRadius: "20px", cursor: "pointer",
                        border: `1px solid ${taskFilter === key ? color : "#E8DDD0"}`,
                        backgroundColor: taskFilter === key ? bg : "transparent",
                        fontSize: "10px", fontWeight: 600,
                        color: taskFilter === key ? color : "#A8A29E",
                      }}
                    >
                      {label}
                      {count > 0 && (
                        <span style={{
                          minWidth: 14, height: 14, borderRadius: "7px", padding: "0 3px",
                          backgroundColor: taskFilter === key ? color : "#E8DDD0",
                          color: taskFilter === key ? "#FFFFFF" : "#78716C",
                          fontSize: "9px", fontWeight: 700,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowAddTask((v) => !v)} style={iconBtn} title="Add task">
                <Plus size={13} color="#F97316" />
              </button>
            </div>
            <div style={boxContent}>
              {showAddTask && (
                <div style={{
                  marginBottom: "10px", padding: "10px 12px", borderRadius: "10px",
                  border: "1.5px solid #FED7AA", backgroundColor: "#FFF7ED",
                  display: "flex", flexDirection: "column", gap: "7px",
                }}>
                  <input
                    value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title…" autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveTask()}
                    style={{ border: "none", outline: "none", backgroundColor: "transparent",
                      fontSize: "13px", fontWeight: 600, color: "#1C1917", padding: 0, width: "100%" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ flex: 1 }}>
                      <ColorSelect
                        value={newTaskQuad}
                        onChange={(v) => setNewTaskQuad(v as EisenhowerQ)}
                        options={["Q1", "Q2", "Q3", "Q4"]}
                        getColor={(q) => Q_META[q as EisenhowerQ].color}
                        getLabel={(q) => `${Q_META[q as EisenhowerQ].label} — ${Q_META[q as EisenhowerQ].sub}`}
                        listWidth={240}
                      />
                    </div>
                    <button onClick={saveTask} style={saveBtn}>Add</button>
                    <button onClick={() => setShowAddTask(false)} style={ghostBtn}><X size={12} color="#A8A29E" /></button>
                  </div>
                </div>
              )}

              {taskFilter === "overdue" && (
                overdueTasks.length === 0
                  ? <p style={emptyText}>No overdue tasks.</p>
                  : <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {overdueTasks.map((t) => <TaskRow key={t.id} task={t} onClick={onTaskClick} onComplete={onCompleteTask} />)}
                    </div>
              )}
              {taskFilter === "today" && (
                todayTasks.length === 0
                  ? <p style={emptyText}>No tasks due today.</p>
                  : <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {todayTasks.map((t) => <TaskRow key={t.id} task={t} onClick={onTaskClick} onComplete={onCompleteTask} />)}
                    </div>
              )}
              {taskFilter === "soon" && (
                upcomingTasks.length === 0
                  ? <p style={emptyText}>Nothing due in the next 3 days.</p>
                  : <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {upcomingTasks.map((t) => <TaskRow key={t.id} task={t} dim onClick={onTaskClick} onComplete={onCompleteTask} />)}
                    </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task, dim, onClick, onComplete,
}: {
  task:        TaskData;
  dim?:        boolean;
  onClick?:    (t: TaskData) => void;
  onComplete?: (id: string) => void;
}) {
  const m    = Q_META[task.quadrant];
  const done = task.status !== "open";

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "6px 10px", borderRadius: "8px",
        backgroundColor: done ? "#F0FDF4" : m.bg,
        border: `1px solid ${done ? "#BBF7D0" : m.border}`,
        cursor: onClick ? "pointer" : "default",
        marginBottom: "3px", opacity: dim ? 0.65 : 1,
      }}
      onClick={() => !done && onClick?.(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!done && onComplete) onComplete(task.id);
        }}
        style={{
          width: 16, height: 16, borderRadius: "4px", flexShrink: 0,
          border: `2px solid ${done ? "#16A34A" : m.color}`,
          backgroundColor: done ? "#16A34A" : "#FFFFFF",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: done ? "default" : "pointer",
        }}
      >
        {done && <Check size={9} color="#FFFFFF" strokeWidth={3} />}
      </button>

      <span style={{
        flex: 1, fontSize: "12px", fontWeight: 600,
        color: done ? "#78716C" : m.color,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        textDecoration: done ? "line-through" : "none",
      }}>
        {task.title}
      </span>
      <span style={{
        fontSize: "9px", fontWeight: 700,
        color: done ? "#16A34A" : m.color,
        backgroundColor: done ? "#F0FDF4" : m.bg, padding: "1px 5px", borderRadius: "4px",
      }}>
        {done ? "Done" : m.label}
      </span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "#78716C", margin: 0,
};

const boxStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E8DDD0",
  borderRadius: "16px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 0,
};

const boxHeader: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "11px 14px", borderBottom: "1px solid #F0EAE3", flexShrink: 0,
};

const boxContent: React.CSSProperties = {
  flex: 1, overflowY: "auto", padding: "12px 14px", minHeight: 0,
};

const emptyText: React.CSSProperties = {
  fontSize: "11px", color: "#C4B5A8", fontStyle: "italic", margin: 0,
};

const iconBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: "6px", border: "1px solid #FED7AA",
  backgroundColor: "#FFF7ED", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0,
};

const saveBtn: React.CSSProperties = {
  padding: "3px 12px", borderRadius: "6px", border: "none",
  background: "linear-gradient(135deg, #F97316, #EA580C)",
  fontSize: "11px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer", flexShrink: 0,
};

const timeInputStyle: React.CSSProperties = {
  padding: "3px 6px", borderRadius: "6px", border: "1px solid #E8DDD0",
  fontSize: "11px", color: "#1C1917", outline: "none", backgroundColor: "#FFFFFF",
};

const ghostBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: "none",
  backgroundColor: "transparent", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer", padding: 0, flexShrink: 0,
};
