"use client";

import { useState, useRef } from "react";
import {
  X, Plus, Trash2, AlertTriangle, Pencil, Check, Flame, CheckCircle2, Circle,
  ChevronDown, ChevronUp, ArrowLeft, XCircle, CalendarDays, Clock, Sparkles, Lock,
  Briefcase, Globe, DollarSign, BookOpen, Heart, Activity, type LucideIcon,
} from "lucide-react";
import DualSlider from "./DualSlider";
import type { GoalData, GoalNote, LifeArea, Milestone } from "./GoalCard";
import { AREA_META } from "./GoalCard";
import type { HabitData } from "@/components/habits/HabitCard";
import {
  AREA_META as HABIT_AREA_META, FREQ_LABEL, calcStreak,
  isHabitDoneOnDate, isScheduledDay, toLocalDate,
} from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import { Q_META, daysUntil } from "@/components/tasks/TaskCard";
import { MAX_DATE_STR, todayDateStr, validateDate } from "@/lib/dateValidation";

// ── Constants ─────────────────────────────────────────────────────────────────
const AREA_ICONS: Record<LifeArea, LucideIcon> = {
  professional:  Briefcase,
  contribution:  Globe,
  wealth:        DollarSign,
  spiritual:     Sparkles,
  personal:      BookOpen,
  relationships: Heart,
  health:        Activity,
};

const CONNECTORS = [
  "by achieving", "measured by", "reaching", "growing to",
  "reducing to", "completing", "earning", "building",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTs(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function daysSinceMoved(ts: number) {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtShort(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildStatement(outcome: string, metric: string, unit: string, date: string, connector: string) {
  return [outcome.trim(), connector, metric.trim(), unit.trim(), "by", fmtDate(date)]
    .filter(Boolean).join(" ");
}

type HealthStatus = "Good" | "On Track" | "At Risk" | "Behind";

function calcGoalHealth(goal: GoalData): HealthStatus {
  const now = Date.now();
  const deadline = new Date(goal.deadline + "T00:00:00").getTime();
  const totalDuration = deadline - goal.createdAt;
  if (totalDuration <= 0) return goal.progress >= 100 ? "Good" : "Behind";
  const elapsed = Math.max(0, now - goal.createdAt);
  const timeRatio = Math.min(1, elapsed / totalDuration);
  if (timeRatio === 0) return "Good";
  const ratio = goal.progress / (timeRatio * 100);
  if (ratio >= 1.0) return "Good";
  if (ratio >= 0.75) return "On Track";
  if (ratio >= 0.45) return "At Risk";
  return "Behind";
}

const HEALTH_COLOR: Record<HealthStatus, string> = {
  "Good":     "#16A34A",
  "On Track": "#2563EB",
  "At Risk":  "#F97316",
  "Behind":   "#DC2626",
};

const HEALTH_BG: Record<HealthStatus, string> = {
  "Good":     "#F0FDF4",
  "On Track": "#EFF6FF",
  "At Risk":  "#FFF7ED",
  "Behind":   "#FEF2F2",
};

const HEALTH_DESC: Record<HealthStatus, string> = {
  "Good":     "You're ahead of schedule. Keep the momentum going!",
  "On Track": "You're progressing well. Stay consistent.",
  "At Risk":  "You're slightly behind. Push harder this week.",
  "Behind":   "You're falling behind. Consider reassessing your approach.",
};

function calcHabitConsistency(habits: HabitData[]): number {
  if (habits.length === 0) return 0;
  let totalDone = 0, totalScheduled = 0;
  const now = new Date();
  habits.forEach(h => {
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (d.getTime() < h.createdAt) break;
      if (!isScheduledDay(h.frequency, h.customDays, d.getDay())) continue;
      totalScheduled++;
      if (isHabitDoneOnDate(h, toLocalDate(d))) totalDone++;
    }
  });
  return totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  goal:           GoalData | null;
  linkedHabits:   HabitData[];
  tasks:          TaskData[];
  onClose:        () => void;
  onUpdate:       (updated: GoalData) => void;
  onDelete:       (id: string) => void;
  onUpdateTask?:  (t: TaskData)  => void;
  onUpdateHabit?: (h: HabitData) => void;
  onAddTask?:     (goalId: string, milestoneId: string) => void;
  onAddHabit?:    (goalId: string, milestoneId: string) => void;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GoalDetailSheet({
  goal, linkedHabits, tasks, onClose, onUpdate, onDelete,
  onUpdateTask, onUpdateHabit, onAddTask, onAddHabit,
}: Props) {
  const [mode,             setMode]             = useState<"view" | "edit">("view");
  const [noteText,         setNoteText]         = useState("");
  const [popupMilestoneId, setPopupMilestoneId] = useState<string | null>(null);
  const [expandedId,       setExpandedId]       = useState<string | null>(null);
  const [userInteracted,   setUserInteracted]   = useState(false);

  // Edit form
  const [eOutcome,   setEOutcome]   = useState("");
  const [eMetric,    setEMetric]    = useState("");
  const [eUnit,      setEUnit]      = useState("");
  const [eConnector, setEConnector] = useState(CONNECTORS[0]);
  const [eDeadline,  setEDeadline]  = useState("");
  const [eArea,      setEArea]      = useState<LifeArea>("professional");

  const noteRef = useRef<HTMLTextAreaElement>(null);

  if (!goal) return null;

  const color     = AREA_META[goal.area].color;
  const areaBg    = AREA_META[goal.area].bg;
  const areaLabel = AREA_META[goal.area].label;
  const AreaIcon  = AREA_ICONS[goal.area];
  const today     = toLocalDate();

  const daysLeft   = Math.max(0, Math.ceil(
    (new Date(goal.deadline + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
  const stale      = daysSinceMoved(goal.lastMoved) >= 14;
  const milestones = [...(goal.milestones ?? [])].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const editDeadlineConflicts = milestones.filter(m => eDeadline && m.deadline > eDeadline);
  const eDeadlineError = validateDate(eDeadline, { required: true });
  const editStatement  = buildStatement(eOutcome, eMetric, eUnit, eDeadline, eConnector);

  const firstIncompleteId = milestones.find(m => !m.completed)?.id ?? null;
  const activeExpandedId  = userInteracted ? expandedId : firstIncompleteId;

  const health     = calcGoalHealth(goal);
  const completedT = tasks.filter(t => t.status === "complete").length;
  const consistency = calcHabitConsistency(linkedHabits);
  const upcomingTasks = [...tasks]
    .filter(t => t.status === "open")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const enterEdit = () => {
    setEOutcome(goal.outcome);
    setEMetric(goal.metric);
    setEUnit(goal.metricUnit);
    setEConnector(CONNECTORS.find(c => goal.statement.includes(c)) ?? CONNECTORS[0]);
    setEDeadline(goal.deadline);
    setEArea(goal.area);
    setMode("edit");
  };

  const saveEdit = () => {
    onUpdate({
      ...goal,
      outcome: eOutcome.trim(), metric: eMetric.trim(), metricUnit: eUnit.trim(),
      deadline: eDeadline, area: eArea,
      statement: buildStatement(eOutcome, eMetric, eUnit, eDeadline, eConnector),
    });
    setMode("view");
  };

  const handleProgress = (v: number) =>
    onUpdate({ ...goal, progress: v, lastMoved: Date.now(), velocity: v - goal.progress });

  const addNote = () => {
    if (!noteText.trim()) return;
    const note: GoalNote = { id: crypto.randomUUID(), text: noteText.trim(), timestamp: Date.now() };
    onUpdate({ ...goal, notes: [note, ...goal.notes] });
    setNoteText("");
  };

  const deleteNote = (id: string) =>
    onUpdate({ ...goal, notes: goal.notes.filter(n => n.id !== id) });

  const toggleMilestone = (mId: string) =>
    onUpdate({ ...goal, milestones: milestones.map(m => m.id === mId ? { ...m, completed: !m.completed } : m) });

  const toggleExpand = (id: string) => {
    setUserInteracted(true);
    setExpandedId(prev => prev === id ? null : id);
  };

  const canSaveEdit = eOutcome.trim() && eMetric.trim() && !eDeadlineError && editDeadlineConflicts.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Full-page overlay */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundColor: "#FFFFFF",
        zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Floating back arrow — no dedicated bar */}
        <button
          onClick={() => { if (mode === "edit") { setMode("view"); } else { onClose(); } }}
          style={{ position: "absolute", top: 14, left: 18, zIndex: 10, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", color: "#78716C", fontSize: "13px", fontWeight: 600, padding: "4px 6px", borderRadius: "8px" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F0EB"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
        >
          <ArrowLeft size={15} /> {mode === "edit" ? "Back" : "Goals"}
        </button>

        {/* Body */}
        {mode === "edit" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "52px 28px 24px" }}>
            <EditField label="Life Area">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(Object.keys(AREA_META) as LifeArea[]).map(a => (
                  <button key={a} onClick={() => setEArea(a)} style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, border: `1.5px solid ${eArea === a ? "#F97316" : "#E8DDD0"}`, backgroundColor: eArea === a ? "#FFF7ED" : "#FFFFFF", color: eArea === a ? "#F97316" : "#78716C", cursor: "pointer" }}>
                    {AREA_META[a].label}
                  </button>
                ))}
              </div>
            </EditField>

            <EditField label="What do you want to achieve?">
              <textarea value={eOutcome} onChange={e => setEOutcome(e.target.value)} rows={2} style={taStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "#F97316"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
            </EditField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <EditField label="Measurable target">
                <input type="text" value={eMetric} onChange={e => setEMetric(e.target.value)} style={inStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </EditField>
              <EditField label="Unit (optional)">
                <input type="text" value={eUnit} onChange={e => setEUnit(e.target.value)} style={inStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </EditField>
            </div>

            <EditField label="Statement connector">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {CONNECTORS.map(c => (
                  <button key={c} onClick={() => setEConnector(c)} style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", border: `1.5px solid ${eConnector === c ? "#F97316" : "#E8DDD0"}`, backgroundColor: eConnector === c ? "#FFF7ED" : "#FFFFFF", color: eConnector === c ? "#F97316" : "#78716C", cursor: "pointer", fontWeight: eConnector === c ? 600 : 400 }}>{c}</button>
                ))}
              </div>
            </EditField>

            <EditField label="Target date">
              <StyledDateInput value={eDeadline} onChange={setEDeadline} error={!!eDeadlineError || editDeadlineConflicts.length > 0} />
              {eDeadlineError && <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginTop: "5px" }}>{eDeadlineError}</p>}
              {!eDeadlineError && editDeadlineConflicts.length > 0 && (
                <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, marginTop: "5px" }}>
                  ⚠ {editDeadlineConflicts.length} milestone{editDeadlineConflicts.length > 1 ? "s are" : " is"} after this date. Adjust milestones first.
                </p>
              )}
            </EditField>

            {editStatement.length > 10 && (
              <div style={{ padding: "12px 14px", borderRadius: "10px", background: "linear-gradient(135deg, #FFF7ED, #FEFCE8)", border: "1px solid #FED7AA", marginBottom: "8px" }}>
                <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F97316", marginBottom: "5px" }}>New statement</p>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#1C1917", lineHeight: 1.5, margin: 0 }}>{editStatement}</p>
              </div>
            )}
          </div>
        ) : (
          /* ── VIEW MODE — two-panel ── */
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

            {/* Left main panel */}
            <div style={{ flex: 1, overflowY: "auto", padding: "48px 24px 20px", minWidth: 0 }}>

              {/* ── Header card ── */}
              <div style={{ position: "relative", backgroundColor: "#F8FAFB", borderRadius: "16px", border: "1px solid #E5E9EE", padding: "20px 20px 0", marginBottom: "20px" }}>
                {/* Edit button — floats at top-right corner of card */}
                <button onClick={enterEdit} style={{ position: "absolute", top: -12, right: -10, width: 28, height: 28, borderRadius: "8px", backgroundColor: "#F8FAFB", border: "1px solid #E5E9EE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <Pencil size={12} color="#6B7280" />
                </button>

                {/* Top row: icon + text + ring */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "18px" }}>

                  {/* Area icon */}
                  <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 14px ${color}40` }}>
                    <AreaIcon size={26} color="#FFFFFF" />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color, display: "inline-block", marginBottom: "4px" }}>
                      {areaLabel}
                    </span>
                    <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1C1917", lineHeight: 1.3, margin: "0 0 5px" }}>
                      {goal.statement}
                    </h2>
                    {goal.outcome && (
                      <p style={{ fontSize: "13px", color: "#6B7280", fontStyle: "italic", margin: "0 0 10px", lineHeight: 1.5 }}>
                        &ldquo;{goal.outcome}&rdquo;
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#6B7280" }}>
                        <CalendarDays size={12} color="#9CA3AF" /> Target: {fmtShort(goal.deadline)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#6B7280" }}>
                        <Clock size={12} color="#9CA3AF" /> Created: {fmtShort(new Date(goal.createdAt).toISOString().slice(0, 10))}
                      </span>
                    </div>
                  </div>

                  {/* Progress ring */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <CircularProgress value={goal.progress} color={color} />
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", margin: "2px 0 0", textAlign: "center" }}>Overall Progress</p>
                  </div>
                </div>

                {/* Stats chips row */}
                <div style={{ display: "flex", gap: "8px", paddingBottom: "16px", flexWrap: "wrap" }}>
                  {[
                    { value: milestones.length, label: "Milestones" },
                    { value: tasks.length,       label: "Tasks" },
                    { value: linkedHabits.length, label: "Habits" },
                    { value: daysLeft,            label: "Days Left" },
                  ].map(s => (
                    <div key={s.label} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E9EE", borderRadius: "10px", padding: "8px 18px", textAlign: "center" }}>
                      <p style={{ fontSize: "20px", fontWeight: 800, color: "#1C1917", margin: "0 0 1px", lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: "10px", fontWeight: 500, color: "#6B7280", margin: 0 }}>{s.label}</p>
                    </div>
                  ))}
                  {/* Health chip */}
                  <div style={{ backgroundColor: HEALTH_BG[health], border: `1px solid ${HEALTH_COLOR[health]}30`, borderRadius: "10px", padding: "8px 18px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginBottom: "1px" }}>
                      <Activity size={13} color={HEALTH_COLOR[health]} />
                      <p style={{ fontSize: "14px", fontWeight: 800, color: HEALTH_COLOR[health], margin: 0, lineHeight: 1 }}>{health}</p>
                    </div>
                    <p style={{ fontSize: "10px", fontWeight: 500, color: "#6B7280", margin: 0 }}>Goal Health</p>
                  </div>
                </div>
              </div>

              {/* Stale alert */}
              {stale && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", marginBottom: "16px" }}>
                  <AlertTriangle size={14} color="#F97316" />
                  <p style={{ fontSize: "12px", color: "#9A3412", margin: 0 }}>
                    <strong>No progress in {daysSinceMoved(goal.lastMoved)} days.</strong> Drag the slider to update.
                  </p>
                </div>
              )}

              {/* Update Progress slider */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A8A29E", marginBottom: "10px" }}>Update Progress</p>
                <DualSlider value={goal.progress} onChange={handleProgress} startLabel="Not started" endLabel="Complete" />
              </div>

              {/* Milestone Roadmap */}
              {milestones.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A8A29E", marginBottom: "14px" }}>Milestone Roadmap</p>

                  {/* Horizontal stepper */}
                  <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
                    {milestones.map((m, idx) => {
                      const isCompleted = m.completed;
                      const isCurrent   = m.id === firstIncompleteId;
                      const isLocked    = !isCompleted && !isCurrent;
                      return (
                        <div key={m.id} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", maxWidth: 110 }}>
                            <div
                              onClick={() => toggleExpand(m.id)}
                              style={{
                                width: isLocked ? 26 : 32, height: isLocked ? 26 : 32, borderRadius: "50%",
                                backgroundColor: isCompleted || isCurrent ? color : "#EDE8E1",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: isCurrent ? `0 0 0 4px ${color}28` : "none",
                                cursor: "pointer", flexShrink: 0,
                              }}>
                              {isCompleted && <Check size={14} color="#fff" strokeWidth={3} />}
                              {isCurrent   && <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "#fff" }} />}
                              {isLocked    && <Lock size={10} color="#A8A29E" />}
                            </div>
                            <div style={{ textAlign: "center", marginTop: "6px", padding: "0 2px" }}>
                              <p style={{ fontSize: "10px", fontWeight: 700, color: isLocked ? "#A8A29E" : "#1C1917", margin: "0 0 1px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
                                {idx + 1}. {m.title}
                              </p>
                              <p style={{ fontSize: "9px", fontWeight: 600, margin: "0 0 1px", color: isCompleted ? "#16A34A" : isCurrent ? color : "#A8A29E" }}>
                                {isCompleted ? "Completed" : isCurrent ? "In Progress" : "Locked"}
                              </p>
                              <p style={{ fontSize: "9px", color: "#A8A29E", margin: 0 }}>{fmtShort(m.deadline)}</p>
                            </div>
                          </div>
                          {idx < milestones.length - 1 && (
                            <div style={{ flex: 1, height: "2px", marginTop: isLocked ? 12 : 15, backgroundColor: m.completed ? color : `${color}25`, minWidth: 8 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Expandable milestone cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {milestones.map((m, idx) => {
                      const isCompleted = m.completed;
                      const isCurrent   = m.id === firstIncompleteId;
                      const isLocked    = !isCompleted && !isCurrent;
                      const isExpanded  = activeExpandedId === m.id;
                      const mTasks  = tasks.filter(t => t.linkedMilestoneId === m.id && t.linkedGoalId === goal.id);
                      const mHabits = linkedHabits.filter(h => h.linkedMilestoneId === m.id);
                      const completedMT = mTasks.filter(t => t.status === "complete").length;
                      const statusLabel = isCompleted ? "Completed" : isCurrent ? "In Progress" : "Locked";
                      const statusColor = isCompleted ? "#16A34A" : isCurrent ? color : "#A8A29E";
                      const statusBg    = isCompleted ? "#F0FDF4"  : isCurrent ? `${color}18` : "#F5F0EB";

                      return (
                        <div key={m.id} style={{ borderRadius: "12px", border: `1px solid ${isExpanded ? color + "50" : "#EDE5D8"}`, overflow: "hidden", boxShadow: isExpanded ? `0 2px 12px ${color}15` : "none" }}>
                          {/* Header */}
                          <div onClick={() => toggleExpand(m.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", cursor: "pointer", backgroundColor: isExpanded ? areaBg : "#FFFFFF" }}>
                            <span style={{ fontSize: "10px", fontWeight: 600, color: "#A8A29E", flexShrink: 0 }}>
                              {idx + 1} of {milestones.length}
                            </span>
                            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                              <p style={{ fontSize: "14px", fontWeight: 700, color: isLocked ? "#A8A29E" : "#1C1917", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {m.title}
                              </p>
                              {isLocked && <Lock size={12} color="#A8A29E" style={{ flexShrink: 0 }} />}
                              <span style={{ fontSize: "10px", fontWeight: 700, color: statusColor, backgroundColor: statusBg, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>
                                {statusLabel}
                              </span>
                            </div>
                            {isExpanded ? <ChevronUp size={14} color="#A8A29E" /> : <ChevronDown size={14} color="#A8A29E" />}
                          </div>

                          {/* Expanded body */}
                          {isExpanded && (
                            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${color}20` }}>
                              {/* Progress row */}
                              <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "12px 0 14px" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "11px", color: "#78716C" }}>Progress</span>
                                    <span style={{ fontSize: "11px", fontWeight: 700, color }}>
                                      {mTasks.length > 0 ? `${completedMT}/${mTasks.length} tasks` : "—"}
                                    </span>
                                  </div>
                                  <div style={{ height: 5, borderRadius: 3, backgroundColor: `${color}20` }}>
                                    <div style={{ height: "100%", borderRadius: 3, backgroundColor: color, width: mTasks.length > 0 ? `${(completedMT / mTasks.length) * 100}%` : "0%" }} />
                                  </div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <p style={{ fontSize: "9px", color: "#A8A29E", margin: "0 0 1px" }}>Due date</p>
                                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", margin: 0 }}>{fmtShort(m.deadline)}</p>
                                </div>
                              </div>

                              {/* Tasks + Habits columns */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                {/* Tasks */}
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917" }}>Tasks ({mTasks.length})</span>
                                    <button onClick={e => { e.stopPropagation(); onAddTask?.(goal.id, m.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "10px", fontWeight: 600, color, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                      <Plus size={10} /> Add
                                    </button>
                                  </div>
                                  {mTasks.length === 0 ? (
                                    <p style={{ fontSize: "11px", color: "#A8A29E", fontStyle: "italic", margin: 0 }}>No tasks yet</p>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      {mTasks.slice(0, 5).map(t => {
                                        const isDone  = t.status === "complete";
                                        const isOpen  = t.status === "open";
                                        const days    = daysUntil(t.deadline);
                                        const overdue = days < 0 && isOpen;
                                        const qm = Q_META[t.quadrant];
                                        return (
                                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "6px", backgroundColor: "#F9F7F5", borderLeft: `3px solid ${isDone ? "#D1D5DB" : qm.color}` }}>
                                            <button
                                              onClick={e => { e.stopPropagation(); if (isOpen) onUpdateTask?.({ ...t, status: "complete", closedAt: Date.now(), variance: Math.round((Date.now() - new Date(t.deadline + "T00:00:00").getTime()) / 86400000) }); }}
                                              style={{ width: 16, height: 16, borderRadius: "50%", border: isDone ? "none" : `2px solid ${qm.color}`, backgroundColor: isDone ? "#16A34A" : "#FFFFFF", flexShrink: 0, cursor: isOpen ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                              {isDone && <Check size={9} color="#fff" strokeWidth={3} />}
                                            </button>
                                            <span style={{ flex: 1, fontSize: "11px", fontWeight: 500, color: isDone ? "#9CA3AF" : "#1C1917", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {t.title}
                                            </span>
                                            <span style={{ fontSize: "9px", fontWeight: 600, flexShrink: 0, color: overdue ? "#DC2626" : "#A8A29E" }}>
                                              {overdue ? `${Math.abs(days)}d late` : days === 0 ? "Today" : fmtShort(t.deadline).split(",")[0]}
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {mTasks.length > 5 && (
                                        <button onClick={() => setPopupMilestoneId(m.id)} style={{ fontSize: "11px", fontWeight: 600, color, background: "none", border: "none", cursor: "pointer", padding: "2px 0", textAlign: "left" }}>
                                          View all →
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Habits */}
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917" }}>Habits ({mHabits.length})</span>
                                    <button onClick={e => { e.stopPropagation(); onAddHabit?.(goal.id, m.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "10px", fontWeight: 600, color, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                      <Plus size={10} /> Add
                                    </button>
                                  </div>
                                  {mHabits.length === 0 ? (
                                    <p style={{ fontSize: "11px", color: "#A8A29E", fontStyle: "italic", margin: 0 }}>No habits yet</p>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      {mHabits.slice(0, 5).map(h => {
                                        const hm     = HABIT_AREA_META[h.area];
                                        const hDone  = isHabitDoneOnDate(h, today);
                                        const streak = calcStreak(h);
                                        let donePct  = 0;
                                        {
                                          let done = 0, sched = 0;
                                          const now2 = new Date();
                                          for (let i = 0; i < 30; i++) {
                                            const d = new Date(now2); d.setDate(now2.getDate() - i);
                                            if (d.getTime() < h.createdAt) break;
                                            if (!isScheduledDay(h.frequency, h.customDays, d.getDay())) continue;
                                            sched++;
                                            if (isHabitDoneOnDate(h, toLocalDate(d))) done++;
                                          }
                                          donePct = sched > 0 ? Math.round(done / sched * 100) : 0;
                                        }
                                        return (
                                          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "6px", backgroundColor: hDone ? "#F0FDF4" : "#F9F7F5", borderLeft: `3px solid ${hm.color}` }}>
                                            <div
                                              onClick={() => { if (h.type === "binary") { const c = hDone ? h.completions.filter(d => d !== today) : [...h.completions, today]; onUpdateHabit?.({ ...h, completions: c }); } }}
                                              style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, backgroundColor: hDone ? "#16A34A" : "#FFFFFF", border: hDone ? "none" : `2px solid ${hm.color}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: h.type === "binary" ? "pointer" : "default" }}>
                                              {hDone && <Check size={9} color="#fff" strokeWidth={3} />}
                                            </div>
                                            <span style={{ flex: 1, fontSize: "11px", fontWeight: 500, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                                            {streak > 0 && <span style={{ fontSize: "10px", fontWeight: 700, color: "#F97316", display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}><Flame size={10} color="#F97316" />{streak}</span>}
                                            <span style={{ fontSize: "10px", fontWeight: 700, flexShrink: 0, color: donePct >= 80 ? "#16A34A" : donePct >= 50 ? "#F97316" : "#DC2626" }}>{donePct}%</span>
                                          </div>
                                        );
                                      })}
                                      {mHabits.length > 5 && (
                                        <button onClick={() => setPopupMilestoneId(m.id)} style={{ fontSize: "11px", fontWeight: 600, color, background: "none", border: "none", cursor: "pointer", padding: "2px 0", textAlign: "left" }}>
                                          View all →
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card footer actions */}
                              <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${color}15` }}>
                                <button onClick={() => toggleMilestone(m.id)} style={{ padding: "6px 12px", borderRadius: "8px", border: `1.5px solid ${m.completed ? "#E8DDD0" : color}`, backgroundColor: m.completed ? "#FFFFFF" : `${color}12`, fontSize: "11px", fontWeight: 600, color: m.completed ? "#78716C" : color, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                  {m.completed ? <><Circle size={12} /> Mark Incomplete</> : <><Check size={12} /> Mark Complete</>}
                                </button>
                                <button onClick={() => setPopupMilestoneId(m.id)} style={{ padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #EDE5D8", backgroundColor: "#FFFFFF", fontSize: "11px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>
                                  Details
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A8A29E", marginBottom: "10px" }}>Progress Notes</p>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <textarea ref={noteRef} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Log an update, obstacle, or win…" rows={2}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "12px", color: "#1C1917", resize: "none", outline: "none", lineHeight: 1.5, fontFamily: "inherit" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#F97316"; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  <button onClick={addNote} disabled={!noteText.trim()} style={{ alignSelf: "flex-end", width: 34, height: 34, borderRadius: "8px", border: "none", flexShrink: 0, background: noteText.trim() ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0", cursor: noteText.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={14} color={noteText.trim() ? "#FFFFFF" : "#A8A29E"} />
                  </button>
                </div>
                {goal.notes.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#A8A29E", textAlign: "center", padding: "12px 0" }}>No notes yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {goal.notes.map(note => (
                      <div key={note.id} style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8", borderRadius: "8px", padding: "10px 12px", position: "relative" }}>
                        <p style={{ fontSize: "12px", color: "#1C1917", lineHeight: 1.5, margin: 0, paddingRight: "20px" }}>{note.text}</p>
                        <p style={{ fontSize: "9px", color: "#A8A29E", marginTop: "4px" }}>{fmtTs(note.timestamp)}</p>
                        <button onClick={() => deleteNote(note.id)} style={{ position: "absolute", top: "8px", right: "8px", width: 20, height: 20, borderRadius: "4px", border: "none", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.4"; }}>
                          <Trash2 size={11} color="#DC2626" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ width: 255, borderLeft: "1px solid #EDE5D8", overflowY: "auto", padding: "20px 16px", flexShrink: 0, backgroundColor: "#FAFAF9" }}>

              {/* Goal Health */}
              <div style={{ backgroundColor: HEALTH_BG[health], borderRadius: "12px", padding: "14px", border: `1px solid ${HEALTH_COLOR[health]}25`, marginBottom: "14px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A8A29E", margin: "0 0 5px" }}>Goal Health</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: HEALTH_COLOR[health], margin: "0 0 5px", lineHeight: 1 }}>{health}</p>
                <p style={{ fontSize: "11px", color: "#57534E", lineHeight: 1.5, margin: 0 }}>{HEALTH_DESC[health]}</p>
              </div>

              {/* Goal Summary */}
              <div style={{ backgroundColor: "#FFFFFF", borderRadius: "12px", padding: "14px", border: "1px solid #EDE5D8", marginBottom: "14px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A8A29E", margin: "0 0 10px" }}>Goal Summary</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { label: "Active Milestones", value: milestones.filter(m => !m.completed).length },
                    { label: "Total Tasks",        value: tasks.length },
                    { label: "Tasks Completed",    value: `${completedT} (${tasks.length > 0 ? Math.round(completedT / tasks.length * 100) : 0}%)` },
                    { label: "Active Habits",      value: linkedHabits.length },
                    { label: "Habit Consistency",  value: `${consistency}%` },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "#78716C" }}>{row.label}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#1C1917" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              {upcomingTasks.length > 0 && (
                <div style={{ backgroundColor: "#FFFFFF", borderRadius: "12px", padding: "14px", border: "1px solid #EDE5D8", marginBottom: "14px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A8A29E", margin: "0 0 10px" }}>Upcoming Deadlines</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {upcomingTasks.map((t, i) => {
                      const days    = daysUntil(t.deadline);
                      const overdue = days < 0;
                      const qm = Q_META[t.quadrant];
                      const mName = milestones.find(m => m.id === t.linkedMilestoneId)?.title ?? "";
                      return (
                        <div key={t.id} style={{ paddingBottom: i < upcomingTasks.length - 1 ? "8px" : 0, borderBottom: i < upcomingTasks.length - 1 ? "1px solid #F2EAE0" : "none" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px", marginBottom: "3px" }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: "#1C1917", margin: 0, lineHeight: 1.3, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                            <span style={{ fontSize: "10px", fontWeight: 600, color: overdue ? "#DC2626" : "#78716C", flexShrink: 0 }}>
                              {overdue ? `${Math.abs(days)}d late` : fmtShort(t.deadline).split(",")[0]}
                            </span>
                          </div>
                          {mName && <p style={{ fontSize: "9px", color: "#A8A29E", margin: "0 0 3px" }}>{mName.slice(0, 22)}{mName.length > 22 ? "…" : ""}</p>}
                          <span style={{ fontSize: "9px", fontWeight: 700, color: qm.color, backgroundColor: qm.bg, padding: "1px 6px", borderRadius: "10px" }}>
                            {qm.label.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Insights — Coming Soon */}
              <div style={{ backgroundColor: "#F5F0FF", borderRadius: "12px", padding: "14px", border: "1px solid #DDD6FE" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Sparkles size={13} color="#7C3AED" />
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7C3AED", margin: 0 }}>AI Insights</p>
                </div>
                <p style={{ fontSize: "11px", color: "#78716C", lineHeight: 1.5, margin: "0 0 10px" }}>
                  Personalized goal insights and suggestions coming soon.
                </p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, color: "#7C3AED", backgroundColor: "#EDE9FE", padding: "4px 10px", borderRadius: "20px" }}>
                  <Sparkles size={9} color="#7C3AED" /> Coming Soon
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #EDE5D8", display: "flex", gap: "10px", justifyContent: mode === "edit" ? "stretch" : "flex-end", flexShrink: 0 }}>
          {mode === "edit" ? (
            <>
              <button onClick={() => setMode("view")} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={!canSaveEdit} style={{ flex: 2, padding: "10px", borderRadius: "10px", border: "none", background: canSaveEdit ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0", fontSize: "13px", fontWeight: 700, color: canSaveEdit ? "#FFFFFF" : "#A8A29E", cursor: canSaveEdit ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Check size={14} /> Save changes
              </button>
            </>
          ) : (
            <button onClick={() => { onDelete(goal.id); onClose(); }} style={{ padding: "8px 16px", borderRadius: "8px", border: "1.5px solid #FCA5A5", backgroundColor: "#FEF2F2", fontSize: "11px", fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
              Delete goal
            </button>
          )}
        </div>
      </div>

      {/* Milestone popup */}
      {popupMilestoneId && (() => {
        const pm = milestones.find(m => m.id === popupMilestoneId);
        if (!pm) return null;
        const pmTasks  = tasks.filter(t => t.linkedMilestoneId === pm.id && t.linkedGoalId === goal.id);
        const pmHabits = linkedHabits.filter(h => h.linkedMilestoneId === pm.id);
        return (
          <MilestonePopup
            key={popupMilestoneId}
            milestone={pm}
            milestoneIndex={milestones.findIndex(m => m.id === popupMilestoneId) + 1}
            goal={goal}
            mTasks={pmTasks}
            mHabits={pmHabits}
            onClose={() => setPopupMilestoneId(null)}
            onUpdateGoal={onUpdate}
            onUpdateTask={onUpdateTask}
            onUpdateHabit={onUpdateHabit}
            onAddTask={onAddTask}
            onAddHabit={onAddHabit}
          />
        );
      })()}
    </>
  );
}

// ── Circular progress ring ────────────────────────────────────────────────────
function CircularProgress({ value, color }: { value: number; color: string }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke={`${color}20`} strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }} />
        <text x="48" y="48" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="800" fill={color}>{value}%</text>
      </svg>
    </div>
  );
}

// ── Edit sub-components ───────────────────────────────────────────────────────
function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#78716C", marginBottom: "6px", letterSpacing: "0.03em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "8px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s",
};

const taStyle: React.CSSProperties = { ...inStyle, resize: "none", lineHeight: 1.5 };

function StyledDateInput({ value, onChange, error, accentColor = "#F97316", min, max }: {
  value: string; onChange: (v: string) => void;
  error?: boolean; accentColor?: string; min?: string; max?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#DC2626" : focused ? accentColor : "#E8DDD0";
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", left: "10px", pointerEvents: "none", display: "flex", alignItems: "center", zIndex: 1 }}>
        <CalendarDays size={13} color={focused ? accentColor : "#A8A29E"} style={{ transition: "color 0.15s" }} />
      </div>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        min={min ?? todayDateStr()} max={max ?? MAX_DATE_STR}
        style={{ ...inStyle, paddingLeft: "30px", borderColor, boxShadow: focused ? `0 0 0 3px ${accentColor}18` : "none", colorScheme: "light" as React.CSSProperties["colorScheme"], transition: "border-color 0.15s, box-shadow 0.15s" }}
      />
    </div>
  );
}

// ── Milestone popup (unchanged) ───────────────────────────────────────────────
type PopupView = "milestone" | "task" | "habit";

function MilestonePopup({
  milestone, milestoneIndex, goal, mTasks, mHabits,
  onClose, onUpdateGoal, onUpdateTask, onUpdateHabit, onAddTask, onAddHabit,
}: {
  milestone:      Milestone;
  milestoneIndex: number;
  goal:           GoalData;
  mTasks:         TaskData[];
  mHabits:        HabitData[];
  onClose:        () => void;
  onUpdateGoal:   (g: GoalData)  => void;
  onUpdateTask?:  (t: TaskData)  => void;
  onUpdateHabit?: (h: HabitData) => void;
  onAddTask?:     (goalId: string, milestoneId: string) => void;
  onAddHabit?:    (goalId: string, milestoneId: string) => void;
}) {
  const [view,           setView]          = useState<PopupView>("milestone");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedHabId,  setSelectedHabId]  = useState<string | null>(null);
  const [editing,        setEditing]        = useState(false);
  const [editTitle,      setEditTitle]      = useState(milestone.title);
  const [editDeadline,   setEditDeadline]   = useState(milestone.deadline);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const today       = toLocalDate();
  const editMsDateError = validateDate(editDeadline, { required: true });
  const deadlineOk  = editDeadline && editDeadline <= goal.deadline && !editMsDateError;
  const linkedCount = mTasks.length + mHabits.length;

  const selectedTask  = mTasks.find(t => t.id === selectedTaskId)  ?? null;
  const selectedHabit = mHabits.find(h => h.id === selectedHabId) ?? null;

  function fmtMs(iso: string) {
    if (!iso) return "";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const saveEdit = () => {
    if (!editTitle.trim() || !deadlineOk) return;
    const updated = (goal.milestones ?? [])
      .map(m => m.id === milestone.id ? { ...m, title: editTitle.trim(), deadline: editDeadline } : m)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
    onUpdateGoal({ ...goal, milestones: updated });
    setEditing(false);
  };

  const doDelete = () => {
    mTasks.forEach(t  => onUpdateTask?.({ ...t,  linkedMilestoneId: "" }));
    mHabits.forEach(h => onUpdateHabit?.({ ...h, linkedMilestoneId: "" }));
    onUpdateGoal({ ...goal, milestones: (goal.milestones ?? []).filter(m => m.id !== milestone.id) });
    onClose();
  };

  const markTaskComplete = (t: TaskData, outcome: "complete" | "incomplete") =>
    onUpdateTask?.({ ...t, status: outcome, closedAt: Date.now(), variance: Math.round((Date.now() - new Date(t.deadline + "T00:00:00").getTime()) / 86_400_000) });

  const reopenTask = (t: TaskData) =>
    onUpdateTask?.({ ...t, status: "open", closedAt: undefined, variance: undefined });

  const toggleHabitToday = (h: HabitData) => {
    const completions = h.completions.includes(today)
      ? h.completions.filter(d => d !== today)
      : [...h.completions, today];
    onUpdateHabit?.({ ...h, completions });
  };

  const habitStats = (h: HabitData): { done: number; scheduled: number } => {
    let scheduled = 0, done = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      if (d.getTime() < h.createdAt) break;
      if (!isScheduledDay(h.frequency, h.customDays, d.getDay())) continue;
      scheduled++;
      if (isHabitDoneOnDate(h, toLocalDate(d))) done++;
    }
    return { done, scheduled };
  };

  const iconBtn28 = (bg: string, border: string): React.CSSProperties => ({
    width: "28px", height: "28px", borderRadius: "8px", border,
    backgroundColor: bg, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.30)", backdropFilter: "blur(2px)", zIndex: 60 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(460px, calc(100vw - 32px))", maxHeight: "82vh", backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #EDE5D8", boxShadow: "0 24px 80px rgba(28,25,23,0.22), 0 4px 16px rgba(28,25,23,0.08)", zIndex: 61, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {view === "milestone" && (
          <>
            <div style={{ padding: "16px 18px 13px", borderBottom: "1px solid #F2EAE0", background: "linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 70%)" }}>
              {editing ? (
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#D97706", margin: "0 0 8px" }}>Edit milestone</p>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #D97706", backgroundColor: "#FFFBEB", fontSize: "13px", fontWeight: 600, color: "#1C1917", outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: "8px" }} />
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <StyledDateInput value={editDeadline} onChange={setEditDeadline} error={!deadlineOk && !!editDeadline} accentColor="#D97706" max={goal.deadline} />
                    </div>
                    <button onClick={() => setEditing(false)} style={{ padding: "7px 11px", borderRadius: "8px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "12px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Cancel</button>
                    <button onClick={saveEdit} disabled={!editTitle.trim() || !deadlineOk} style={{ padding: "7px 13px", borderRadius: "8px", border: "none", background: editTitle.trim() && deadlineOk ? "linear-gradient(135deg, #D97706, #B45309)" : "#E8DDD0", fontSize: "12px", fontWeight: 700, color: editTitle.trim() && deadlineOk ? "#FFFFFF" : "#A8A29E", cursor: editTitle.trim() && deadlineOk ? "pointer" : "default" }}>Save</button>
                  </div>
                  {editMsDateError && <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginTop: "6px" }}>{editMsDateError}</p>}
                  {!editMsDateError && !deadlineOk && editDeadline && <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, marginTop: "6px" }}>Milestone date can&apos;t be after goal target ({fmtMs(goal.deadline)}).</p>}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <div style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "7px", background: "linear-gradient(135deg, #D97706, #B45309)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#FFFFFF" }}>{milestoneIndex}</div>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>{milestone.title}</p>
                      {milestone.completed && <span style={{ fontSize: "9px", fontWeight: 700, color: "#D97706", backgroundColor: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 7px", borderRadius: "20px" }}>Done</span>}
                    </div>
                    <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0 }}>Due {fmtMs(milestone.deadline)}</p>
                  </div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button onClick={() => { setEditTitle(milestone.title); setEditDeadline(milestone.deadline); setEditing(true); }} title="Edit milestone" style={iconBtn28("#FFF7ED", "1px solid #FED7AA")}><Pencil size={12} color="#F97316" /></button>
                    <button onClick={onClose} style={iconBtn28("#F5F0EB", "none")}><X size={13} color="#78716C" /></button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
              {/* Tasks */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#7C3AED", margin: 0 }}>Tasks</p>
                  {mTasks.length > 0 && <span style={{ fontSize: "10px", fontWeight: 700, color: "#7C3AED", backgroundColor: "#F5F3FF", padding: "1px 6px", borderRadius: "10px" }}>{mTasks.length}</span>}
                </div>
                {mTasks.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#C4B5A0", textAlign: "center", padding: "12px 0", margin: 0 }}>No tasks linked yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {mTasks.map(t => {
                      const qm = Q_META[t.quadrant];
                      const days = daysUntil(t.deadline);
                      const overdue = days < 0 && t.status === "open";
                      const deadlineText = overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : fmtMs(t.deadline);
                      return (
                        <div key={t.id} onClick={() => { setSelectedTaskId(t.id); setView("task"); }} style={{ backgroundColor: t.status !== "open" ? "#FAFAFA" : "#FFFFFF", borderRadius: "8px", border: `1px solid ${overdue ? "#FCA5A5" : "#EDE5D8"}`, borderLeft: `3px solid ${t.status !== "open" ? "#D1D5DB" : qm.color}`, padding: "5px 9px", cursor: "pointer", opacity: t.status !== "open" ? 0.7 : 1, display: "flex", alignItems: "center", gap: "7px", minHeight: "34px" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(28,25,23,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                          <p style={{ flex: 1, minWidth: 0, fontSize: "12px", fontWeight: 600, margin: 0, color: t.status !== "open" ? "#9CA3AF" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: t.status === "complete" ? "line-through" : "none" }}>{t.title}</p>
                          <span style={{ fontSize: "9px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, color: overdue ? "#DC2626" : "#78716C", backgroundColor: overdue ? "#FEF2F2" : "#F5F5F4", padding: "1px 5px", borderRadius: "4px" }}>{deadlineText}</span>
                          {t.status !== "open" && <span style={{ fontSize: "9px", fontWeight: 700, flexShrink: 0, padding: "1px 5px", borderRadius: "4px", color: t.status === "complete" ? "#16A34A" : "#6B7280", backgroundColor: t.status === "complete" ? "#F0FDF4" : "#F3F4F6" }}>{t.status === "complete" ? "Done" : "Closed"}</span>}
                          {t.status === "open" && (
                            <div style={{ display: "flex", gap: "2px" }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => markTaskComplete(t, "complete")} title="Mark done" style={{ width: 22, height: 22, borderRadius: "5px", border: "none", backgroundColor: "#F0FDF4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={13} color="#16A34A" /></button>
                              <button onClick={() => markTaskComplete(t, "incomplete")} title="Mark missed" style={{ width: 22, height: 22, borderRadius: "5px", border: "none", backgroundColor: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><XCircle size={13} color="#6B7280" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Habits */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#2563EB", margin: 0 }}>Habits</p>
                  {mHabits.length > 0 && <span style={{ fontSize: "10px", fontWeight: 700, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "1px 6px", borderRadius: "10px" }}>{mHabits.length}</span>}
                </div>
                {mHabits.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#C4B5A0", textAlign: "center", padding: "12px 0", margin: 0 }}>No habits linked yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {mHabits.map(h => {
                      const hm     = HABIT_AREA_META[h.area];
                      const hDone  = isHabitDoneOnDate(h, today);
                      const streak = calcStreak(h);
                      const stats  = habitStats(h);
                      const todayVal = h.type === "measurable" ? (h.measurements[today] ?? 0) : 0;
                      return (
                        <div key={h.id} onClick={() => { setSelectedHabId(h.id); setView("habit"); }} style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: `1px solid ${hDone ? "#86EFAC" : "#EDE5D8"}`, borderLeft: `3px solid ${hm.color}`, padding: "6px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", minHeight: "34px" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(28,25,23,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                          <p style={{ flex: 1, minWidth: 0, fontSize: "12px", fontWeight: 600, margin: 0, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</p>
                          {streak > 0 && <span style={{ fontSize: "10px", fontWeight: 700, color: "#F97316", flexShrink: 0 }}><Flame size={10} color="#F97316" style={{ verticalAlign: "middle" }} /> {streak}d</span>}
                          {h.type === "measurable" ? (
                            <span style={{ fontSize: "10px", fontWeight: 700, flexShrink: 0, color: hDone ? "#16A34A" : "#78716C" }}>{todayVal}/{h.target}{h.unit ? ` ${h.unit}` : ""}</span>
                          ) : (
                            <span style={{ fontSize: "10px", fontWeight: 600, flexShrink: 0, color: "#A8A29E" }}>{stats.done}/{stats.scheduled}d</span>
                          )}
                          <div onClick={e => { e.stopPropagation(); if (h.type === "binary") toggleHabitToday(h); }} style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, backgroundColor: hDone ? "#16A34A" : "#FFFFFF", border: hDone ? "none" : `2px solid ${hm.color}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: h.type === "binary" ? "pointer" : "default" }}>
                            {hDone ? <CheckCircle2 size={14} color="#FFFFFF" /> : <Circle size={12} color={hm.color} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "11px 18px", borderTop: "1px solid #F2EAE0", backgroundColor: "#FAFAF9" }}>
              {confirmDelete ? (
                <div>
                  <p style={{ fontSize: "12px", color: "#78716C", margin: "0 0 10px", lineHeight: 1.5 }}>
                    {linkedCount > 0
                      ? `Deleting will unlink ${mTasks.length > 0 ? `${mTasks.length} task${mTasks.length !== 1 ? "s" : ""}` : ""}${mTasks.length > 0 && mHabits.length > 0 ? " and " : ""}${mHabits.length > 0 ? `${mHabits.length} habit${mHabits.length !== 1 ? "s" : ""}` : ""}. They'll remain but won't be tied to this milestone.`
                      : "Delete this milestone? This can't be undone."}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "8px 0", borderRadius: "8px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "12px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Cancel</button>
                    <button onClick={doDelete} style={{ flex: 1, padding: "8px 0", borderRadius: "8px", border: "none", backgroundColor: "#FEF2F2", fontSize: "12px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Yes, delete</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={() => { onAddTask?.(goal.id, milestone.id); onClose(); }} style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px dashed #C4B5A0", backgroundColor: "transparent", fontSize: "12px", fontWeight: 600, color: "#7C3AED", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7C3AED"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F3FF"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#C4B5A0"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                    <Plus size={12} /> Task
                  </button>
                  <button onClick={() => { onAddHabit?.(goal.id, milestone.id); onClose(); }} style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px dashed #C4B5A0", backgroundColor: "transparent", fontSize: "12px", fontWeight: 600, color: "#2563EB", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2563EB"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#EFF6FF"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#C4B5A0"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                    <Plus size={12} /> Habit
                  </button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setConfirmDelete(true)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #FCA5A5", backgroundColor: "transparent", fontSize: "11px", fontWeight: 600, color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FEF2F2"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {view === "task" && selectedTask && (() => {
          const t = selectedTask;
          const qm = Q_META[t.quadrant];
          const days = daysUntil(t.deadline);
          const overdue = days < 0 && t.status === "open";
          return (
            <>
              <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #F2EAE0", display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setView("milestone")} style={iconBtn28("#F5F0EB", "none")}><ArrowLeft size={14} color="#78716C" /></button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: qm.color, margin: "0 0 2px" }}>{qm.label}</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                </div>
                <button onClick={onClose} style={iconBtn28("#F5F0EB", "none")}><X size={13} color="#78716C" /></button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 10px", borderRadius: "20px", backgroundColor: qm.bg, border: `1px solid ${qm.border}`, marginBottom: "14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: qm.color }}>{qm.label}</span>
                  <span style={{ fontSize: "10px", color: qm.color, opacity: 0.7 }}>· {qm.sub}</span>
                </div>
                {t.description && (
                  <div style={{ marginBottom: "14px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Description</p>
                    <p style={{ fontSize: "13px", color: "#1C1917", lineHeight: 1.55, margin: 0 }}>{t.description}</p>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", backgroundColor: overdue ? "#FEF2F2" : "#F5F0EB", border: `1px solid ${overdue ? "#FCA5A5" : "#EDE5D8"}`, marginBottom: "14px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Deadline</p>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: overdue ? "#DC2626" : "#1C1917", margin: 0 }}>{fmtMs(t.deadline)}{overdue && ` · ${Math.abs(days)}d overdue`}{!overdue && days === 0 && " · Due today"}{!overdue && days === 1 && " · Tomorrow"}</p>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8" }}>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Status</p>
                  {t.status === "open" ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => markTaskComplete(t, "complete")} style={{ flex: 1, padding: "9px 0", borderRadius: "8px", border: "none", backgroundColor: "#F0FDF4", fontSize: "12px", fontWeight: 700, color: "#16A34A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}><CheckCircle2 size={14} color="#16A34A" /> Mark done</button>
                      <button onClick={() => markTaskComplete(t, "incomplete")} style={{ flex: 1, padding: "9px 0", borderRadius: "8px", border: "none", backgroundColor: "#F3F4F6", fontSize: "12px", fontWeight: 700, color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}><XCircle size={14} color="#6B7280" /> Mark missed</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: t.status === "complete" ? "#16A34A" : "#6B7280", backgroundColor: t.status === "complete" ? "#F0FDF4" : "#F3F4F6", padding: "4px 10px", borderRadius: "6px" }}>
                        {t.status === "complete" ? "✓ Completed" : "✗ Missed"}
                      </span>
                      <button onClick={() => reopenTask(t)} style={{ padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "11px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Reopen</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}

        {view === "habit" && selectedHabit && (() => {
          const h   = selectedHabit;
          const hm  = HABIT_AREA_META[h.area];
          const hDone  = isHabitDoneOnDate(h, today);
          const streak = calcStreak(h);
          const stats  = habitStats(h);
          const todayVal = h.type === "measurable" ? (h.measurements[today] ?? 0) : 0;
          const dots = Array.from({ length: 28 }, (_, i) => {
            const d  = new Date(); d.setDate(d.getDate() - (27 - i));
            const ds  = toLocalDate(d);
            const sch = isScheduledDay(h.frequency, h.customDays, d.getDay()) && d.getTime() >= h.createdAt - 86_400_000;
            if (h.type === "measurable") {
              const val = h.measurements[ds] ?? 0;
              const ratio = h.target > 0 ? Math.min(1, val / h.target) : 0;
              return { ds, sch, ratio, done: ratio >= 1 };
            }
            return { ds, sch, ratio: h.completions.includes(ds) ? 1 : 0, done: h.completions.includes(ds) };
          });
          return (
            <>
              <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #F2EAE0", display: "flex", alignItems: "center", gap: "10px", borderLeft: `4px solid ${hm.color}` }}>
                <button onClick={() => setView("milestone")} style={iconBtn28("#F5F0EB", "none")}><ArrowLeft size={14} color="#78716C" /></button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: hm.color, backgroundColor: hm.bg, padding: "2px 7px", borderRadius: "20px", display: "inline-block", marginBottom: "3px" }}>{hm.label}</span>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</p>
                </div>
                <button onClick={onClose} style={iconBtn28("#F5F0EB", "none")}><X size={13} color="#78716C" /></button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", marginBottom: "2px" }}>
                      <Flame size={13} color={streak > 0 ? "#F97316" : "#D5C9BC"} />
                      <span style={{ fontSize: "18px", fontWeight: 800, color: streak > 0 ? "#F97316" : "#A8A29E" }}>{streak}</span>
                    </div>
                    <p style={{ fontSize: "9px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Streak</p>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8", textAlign: "center" }}>
                    <p style={{ fontSize: "18px", fontWeight: 800, color: hm.color, margin: "0 0 2px" }}>{stats.done}<span style={{ fontSize: "12px", fontWeight: 500, color: "#A8A29E" }}>/{stats.scheduled}</span></p>
                    <p style={{ fontSize: "9px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>30-day</p>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: hDone ? "#F0FDF4" : "#FFFFFF", border: `1px solid ${hDone ? "#86EFAC" : "#EDE5D8"}`, textAlign: "center" }}>
                    {h.type === "measurable" ? (
                      <><p style={{ fontSize: "18px", fontWeight: 800, color: hDone ? "#16A34A" : "#F97316", margin: "0 0 2px" }}>{todayVal}<span style={{ fontSize: "12px", fontWeight: 500, color: "#A8A29E" }}>/{h.target}</span></p><p style={{ fontSize: "9px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{h.unit || "Today"}</p></>
                    ) : (
                      <><div style={{ display: "flex", justifyContent: "center", marginBottom: "2px" }}>{hDone ? <CheckCircle2 size={20} color="#16A34A" /> : <Circle size={20} color="#A8A29E" />}</div><p style={{ fontSize: "9px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Today</p></>
                    )}
                  </div>
                </div>
                {h.description && <div style={{ marginBottom: "14px" }}><p style={{ fontSize: "10px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Description</p><p style={{ fontSize: "13px", color: "#1C1917", lineHeight: 1.55, margin: 0 }}>{h.description}</p></div>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "8px", backgroundColor: "#F5F0EB", border: "1px solid #EDE5D8", marginBottom: "14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#78716C" }}>Frequency</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#1C1917" }}>{FREQ_LABEL[h.frequency]}</span>
                </div>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Last 28 days</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                    {dots.map((dot, idx) => {
                      const opacity = h.type === "measurable"
                        ? dot.ratio >= 1 ? 1 : dot.ratio > 0 ? 0.25 + dot.ratio * 0.75 : dot.sch ? 0.4 : 0.15
                        : dot.done ? 1 : dot.sch ? 0.5 : 0.25;
                      return <div key={idx} title={dot.ds} style={{ width: "100%", aspectRatio: "1", borderRadius: "3px", backgroundColor: (h.type === "measurable" ? dot.ratio > 0 : dot.done) ? hm.color : dot.sch ? "#EDE5D8" : "#F7F4F0", opacity }} />;
                    })}
                  </div>
                </div>
              </div>
              {h.type === "binary" && (
                <div style={{ padding: "11px 18px", borderTop: "1px solid #F2EAE0", backgroundColor: "#FAFAF9" }}>
                  <button onClick={() => toggleHabitToday(h)} style={{ width: "100%", padding: "10px 0", borderRadius: "8px", border: "none", backgroundColor: hDone ? "#F0FDF4" : hm.color, fontSize: "13px", fontWeight: 700, color: hDone ? "#16A34A" : "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    {hDone ? <><CheckCircle2 size={15} color="#16A34A" /> Done today — tap to undo</> : <><Circle size={15} color="#FFFFFF" /> Mark done today</>}
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </>
  );
}
