"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  X, Plus, Trash2, AlertTriangle, Pencil, Check, Flame, CheckCircle2, Circle,
  ChevronDown, ChevronUp, ArrowLeft, XCircle, CalendarDays, Clock, Sparkles, Lock,
  Briefcase, Globe, DollarSign, BookOpen, Heart, Activity, LayoutGrid, Target,
  Zap, CheckSquare, type LucideIcon,
} from "lucide-react";
import type { GoalData, GoalNote, LifeArea, Milestone } from "./GoalCard";
import { AREA_META } from "./GoalCard";
import type { HabitData, HabitFrequency, HabitType } from "@/components/habits/HabitCard";
import {
  AREA_META as HABIT_AREA_META, FREQ_LABEL, calcStreak,
  isHabitDoneOnDate, isScheduledDay, toLocalDate,
} from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import { Q_META, daysUntil, toTaskDate, type EisenhowerQ } from "@/components/tasks/TaskCard";
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
  onSaveTask?:    (t: TaskData)  => void;
  onSaveHabit?:   (h: HabitData) => void;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GoalDetailSheet({
  goal, linkedHabits, tasks, onClose, onUpdate, onDelete,
  onUpdateTask, onUpdateHabit, onSaveTask, onSaveHabit,
}: Props) {
  const [mode,             setMode]             = useState<"view" | "edit">("view");
  const [noteText,         setNoteText]         = useState("");
  const [popupMilestoneId, setPopupMilestoneId] = useState<string | null>(null);
  const [expandedId,       setExpandedId]       = useState<string | null>(null);
  const [userInteracted,   setUserInteracted]   = useState(false);
  const [taskCreateCtx,    setTaskCreateCtx]    = useState<{ goalId: string; milestoneId: string } | null>(null);
  const [tcForm,           setTcForm]           = useState({ title: "", description: "", quadrant: "Q2" as EisenhowerQ, deadline: "" });
  const [tcDelegateTo,     setTcDelegateTo]     = useState("");
  const [tcDelegateNudge,  setTcDelegateNudge]  = useState(false);
  const [tcQ4Bang,         setTcQ4Bang]         = useState(false);

  const [habitCreateCtx,   setHabitCreateCtx]   = useState<{ goalId: string; milestoneId: string } | null>(null);
  const [hcName,           setHcName]           = useState("");
  const [hcDesc,           setHcDesc]           = useState("");
  const [hcArea,           setHcArea]           = useState<LifeArea>("health");
  const [hcFrequency,      setHcFrequency]      = useState<HabitFrequency>("daily");
  const [hcCustomDays,     setHcCustomDays]     = useState<number[]>([1,2,3,4,5]);
  const [hcType,           setHcType]           = useState<HabitType>("binary");
  const [hcTarget,         setHcTarget]         = useState(1);
  const [hcUnit,           setHcUnit]           = useState("");
  const [hcCue,            setHcCue]            = useState("");
  const [hcReward,         setHcReward]         = useState("");

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
    .filter(t => t.deadline)
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

        {/* Body */}
        {mode === "edit" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 24px" }}>
            {/* Back button — scrolls with content */}
            <button
              onClick={() => setMode("view")}
              style={{ display: "flex", alignItems: "center", gap: "5px", color: "#1C1917", fontSize: "13px", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "16px 0 12px", marginBottom: "4px" }}
            >
              <ArrowLeft size={15} /> Back
            </button>
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
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 20px", minWidth: 0 }}>

              {/* Back button — scrolls with content */}
              <button
                onClick={onClose}
                style={{ display: "flex", alignItems: "center", gap: "5px", color: "#1C1917", fontSize: "13px", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "16px 0 12px", marginBottom: "4px" }}
              >
                <ArrowLeft size={15} /> Goals
              </button>

              {/* ── Header card ── */}
              <div style={{ position: "relative", backgroundColor: areaBg, borderRadius: "16px", border: `1px solid ${color}30`, padding: "20px", marginBottom: "20px" }}>
                {/* Edit button */}
                <button onClick={enterEdit} style={{ position: "absolute", top: -12, right: -10, width: 28, height: 28, borderRadius: "8px", backgroundColor: areaBg, border: `1px solid ${color}30`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <Pencil size={12} color={color} />
                </button>

                {/* Card body: left | right (ring) */}
                <div style={{ display: "flex", alignItems: "stretch", gap: "20px" }}>

                  {/* Left column */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

                    {/* Icon + text */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 14px ${color}40` }}>
                        <AreaIcon size={26} color="#FFFFFF" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color, display: "inline-block", marginBottom: "4px" }}>
                          {areaLabel}
                        </span>
                        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1C1917", lineHeight: 1.3, margin: "0 0 5px" }}>
                          {goal.statement}
                        </h2>
                        {goal.outcome && (
                          <p style={{ fontSize: "13px", color: "#374151", fontStyle: "italic", margin: "0 0 10px", lineHeight: 1.5 }}>
                            &ldquo;{goal.outcome}&rdquo;
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#374151" }}>
                            <CalendarDays size={12} color="#6B7280" /> Target: {fmtShort(goal.deadline)}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#374151" }}>
                            <Clock size={12} color="#6B7280" /> Created: {fmtShort(new Date(goal.createdAt).toISOString().slice(0, 10))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats chips */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      {[
                        { value: milestones.length, label: "Milestones" },
                        { value: tasks.length,       label: "Tasks" },
                        { value: linkedHabits.length, label: "Habits" },
                        { value: daysLeft,            label: "Days Left" },
                      ].map(s => (
                        <div key={s.label} style={{ flex: 1, backgroundColor: "#FFFFFF", border: `1px solid ${color}25`, borderRadius: "10px", padding: "10px 6px", textAlign: "center" }}>
                          <p style={{ fontSize: "20px", fontWeight: 800, color, margin: "0 0 1px", lineHeight: 1 }}>{s.value}</p>
                          <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", margin: 0 }}>{s.label}</p>
                        </div>
                      ))}
                      {/* Health chip */}
                      <div style={{ flex: 1, backgroundColor: HEALTH_BG[health], border: `1px solid ${HEALTH_COLOR[health]}40`, borderRadius: "10px", padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ fontSize: "14px", fontWeight: 800, color: HEALTH_COLOR[health], margin: "0 0 2px", lineHeight: 1 }}>{health}</p>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", margin: 0 }}>Goal Health</p>
                      </div>
                    </div>

                  </div>{/* end left column */}

                  {/* Right column — ring vertically centered */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, borderLeft: `1px solid ${color}20`, paddingLeft: "20px" }}>
                    <CircularProgress value={goal.progress} color={color} onChange={handleProgress} />
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#374151", margin: "4px 0 0", textAlign: "center" }}>Overall Progress</p>
                  </div>

                </div>{/* end card body */}
              </div>{/* end header card */}

              {/* Stale alert */}
              {stale && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", marginBottom: "16px" }}>
                  <AlertTriangle size={14} color="#F97316" />
                  <p style={{ fontSize: "12px", color: "#9A3412", margin: 0 }}>
                    <strong>No progress in {daysSinceMoved(goal.lastMoved)} days.</strong> Drag the slider to update.
                  </p>
                </div>
              )}

              {/* Milestone Roadmap */}
              {milestones.length > 0 && (
                <div style={{ marginBottom: "20px" }}>

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <Activity size={15} color="#374151" />
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917" }}>Milestone Roadmap</span>
                    </div>
                    <button onClick={() => setPopupMilestoneId(milestones[0]?.id ?? null)} style={{ fontSize: "12px", fontWeight: 600, color, background: "none", border: `1.5px solid ${color}40`, borderRadius: "20px", padding: "4px 12px", cursor: "pointer" }}>
                      View Details
                    </button>
                  </div>

                  {/* Timeline + cards */}
                  <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
                    <div style={{ display: "flex", width: "100%", minWidth: `${milestones.length * 120}px` }}>
                      {milestones.map((m, idx) => {
                        const isCompleted = m.completed;
                        const isCurrent   = m.id === firstIncompleteId;
                        const isLocked    = !isCompleted && !isCurrent;
                        const isExpanded  = activeExpandedId === m.id;
                        const prevDeadline = idx === 0
                          ? new Date(goal.createdAt).toISOString().slice(0, 10)
                          : milestones[idx - 1].deadline;
                        const dateRange = `${fmtShort(prevDeadline).replace(/,\s*\d{4}$/, "")} – ${fmtShort(m.deadline)}`;

                        const nodeColor   = isCompleted ? "#16A34A" : isCurrent ? color : "#D1D5DB";
                        const statusLabel = isCompleted ? "Completed" : isCurrent ? "In Progress" : "Locked";
                        const statusColor = isCompleted ? "#16A34A" : isCurrent ? color : "#374151";

                        return (
                          <div key={m.id} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                            {/* Node column */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>

                              {/* Timeline row — fixed height so all connectors sit at same Y */}
                              <div style={{ display: "flex", alignItems: "center", width: "100%", height: 36, marginBottom: "14px" }}>
                                {/* Left connector */}
                                <div style={{ flex: 1, height: 2, backgroundColor: idx === 0 ? "transparent" : milestones[idx - 1].completed ? "#16A34A" : `${color}30` }} />
                                {/* Circle */}
                                <div style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: "50%", flexShrink: 0,
                                  backgroundColor: nodeColor,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  boxShadow: isCurrent ? `0 0 0 5px ${color}22` : "none",
                                  border: isLocked ? "2px solid #D1D5DB" : "none",
                                }}>
                                  {isCompleted && <Check size={13} color="#fff" strokeWidth={3} />}
                                  {isCurrent   && <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#fff" }} />}
                                  {isLocked    && <Lock size={10} color="#9CA3AF" />}
                                </div>
                                {/* Right connector */}
                                <div style={{ flex: 1, height: 2, backgroundColor: idx === milestones.length - 1 ? "transparent" : m.completed ? "#16A34A" : `${color}30` }} />
                              </div>

                              {/* Card */}
                              <div
                                onClick={() => toggleExpand(m.id)}
                                style={{
                                  position: "relative",
                                  width: "calc(100% - 16px)",
                                  maxWidth: 180,
                                  borderRadius: "10px",
                                  border: `1.5px solid ${isExpanded ? color : isCurrent ? `${color}50` : "#E5E9EE"}`,
                                  backgroundColor: isCurrent || isExpanded ? `${color}08` : "#FFFFFF",
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  boxShadow: isExpanded ? `0 2px 10px ${color}15` : "none",
                                  transition: "border-color 0.15s",
                                }}
                              >
                                {isLocked && (
                                  <div style={{ position: "absolute", top: 6, right: 6 }}>
                                    <Lock size={11} color="#9CA3AF" />
                                  </div>
                                )}
                                <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", margin: "0 0 4px", lineHeight: 1.3, paddingRight: isLocked ? "14px" : 0 }}>
                                  <span style={{ color: isCurrent ? color : "#1C1917" }}>{idx + 1}.</span> {m.title}
                                </p>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: statusColor, margin: "0 0 4px" }}>{statusLabel}</p>
                                <p style={{ fontSize: "12px", fontWeight: 500, color: "#374151", margin: 0 }}>{dateRange}</p>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scrollable milestone accordion list */}
                  <div style={{ maxHeight: 560, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px", paddingRight: "2px" }}>
                    {milestones.map((m, mIdx) => {
                      const isCompleted = m.completed;
                      const isCurrent   = m.id === firstIncompleteId;
                      const isLocked    = !isCompleted && !isCurrent;
                      const isExpanded  = activeExpandedId === m.id;
                      const statusColor = isCompleted ? "#16A34A" : isCurrent ? color : "#6B7280";
                      const statusBg    = isCompleted ? "#F0FDF4"  : isCurrent ? `${color}15` : "#F3F4F6";
                      const mTasks      = tasks.filter(t => t.linkedMilestoneId === m.id && t.linkedGoalId === goal.id);
                      const mHabits     = linkedHabits.filter(h => h.linkedMilestoneId === m.id);
                      const completedMT = mTasks.filter(t => t.status === "complete").length;
                      const progressPct = mTasks.length > 0 ? Math.round((completedMT / mTasks.length) * 100) : 0;

                      return (
                        <div key={m.id} style={{ borderRadius: "12px", border: `1px solid ${isExpanded ? `${color}50` : `${color}25`}`, overflow: "hidden", backgroundColor: areaBg, boxShadow: isExpanded ? `0 2px 12px ${color}18` : `0 1px 4px ${color}10` }}>

                          {/* Collapsed row — always visible */}
                          <div onClick={() => toggleExpand(m.id)} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${color}20` : "none" }}>
                            {/* Completion checkbox */}
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                const updated = milestones.map(ms =>
                                  ms.id === m.id ? { ...ms, completed: !ms.completed } : ms
                                );
                                onUpdate({ ...goal, milestones: updated });
                              }}
                              style={{
                                width: 20, height: 20, borderRadius: "6px", flexShrink: 0,
                                border: `2px solid ${isCompleted ? "#16A34A" : `${color}50`}`,
                                backgroundColor: isCompleted ? "#16A34A" : "#FFFFFF",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", transition: "border-color 0.15s, background-color 0.15s",
                              }}
                            >
                              {isCompleted && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", margin: "0 0 3px" }}>Milestone {mIdx + 1} of {milestones.length}</p>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</p>
                                {isLocked && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: 600, color: "#6B7280", backgroundColor: "#F3F4F6", padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>
                                    <Lock size={10} color="#6B7280" /> Locked
                                  </span>
                                )}
                                {isCompleted && <span style={{ fontSize: "11px", fontWeight: 700, color: "#16A34A", backgroundColor: "#F0FDF4", padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>✓ Completed</span>}
                                {isCurrent   && <span style={{ fontSize: "11px", fontWeight: 700, color, backgroundColor: `${color}15`, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>In Progress</span>}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={16} color="#6B7280" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#6B7280" style={{ flexShrink: 0 }} />}
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div>
                              {/* Sub-header: progress + due + menu */}
                              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "20px", borderBottom: `1px solid ${color}20` }}>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Progress</p>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: `${color}18` }}>
                                      <div style={{ height: "100%", borderRadius: 3, backgroundColor: color, width: `${progressPct}%` }} />
                                    </div>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", flexShrink: 0 }}>{progressPct}%</span>
                                  </div>
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Due date</p>
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <CalendarDays size={12} color="#374151" />
                                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917" }}>{fmtShort(m.deadline)}</span>
                                  </div>
                                </div>

                              </div>

                              {/* Tasks + Habits */}
                              <div style={{ padding: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

                                {/* Tasks */}
                                <div style={{ padding: "14px 16px", borderRadius: "10px", border: `1px solid ${color}20`, backgroundColor: "#FFFFFF" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px", marginBottom: "12px", borderBottom: `1px solid ${color}20` }}>
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Tasks ({mTasks.length})</span>
                                    <button onClick={e => { e.stopPropagation(); setTaskCreateCtx({ goalId: goal.id, milestoneId: m.id }); setTcForm({ title: "", description: "", quadrant: "Q2", deadline: "" }); setTcDelegateTo(""); setTcDelegateNudge(false); setTcQ4Bang(false); }} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, color, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                      <Plus size={12} /> Add Task
                                    </button>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", minHeight: 108, maxHeight: 180, overflowY: "auto" }}>
                                    {mTasks.length === 0 ? (
                                      <p style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>No tasks yet</p>
                                    ) : mTasks.map(t => {
                                      const isDone  = t.status === "complete";
                                      const isOpen  = t.status === "open";
                                      const days    = daysUntil(t.deadline);
                                      const overdue = days < 0 && isOpen;
                                      const qm      = Q_META[t.quadrant];
                                      return (
                                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid #F5F5F5" }}>
                                          <button onClick={e => { e.stopPropagation(); if (isOpen) onUpdateTask?.({ ...t, status: "complete", closedAt: Date.now(), variance: Math.round((Date.now() - new Date(t.deadline + "T00:00:00").getTime()) / 86400000) }); }} style={{ width: 18, height: 18, borderRadius: "50%", border: isDone ? "none" : "1.5px solid #D1D5DB", backgroundColor: isDone ? "#16A34A" : "#FFFFFF", flexShrink: 0, cursor: isOpen ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {isDone && <Check size={10} color="#fff" strokeWidth={3} />}
                                          </button>
                                          <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: isDone ? "#6B7280" : "#1C1917", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                          <div style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
                                            <CalendarDays size={11} color="#9CA3AF" />
                                            <span style={{ fontSize: "11px", color: overdue ? "#DC2626" : "#374151" }}>{overdue ? `${Math.abs(days)}d late` : days === 0 ? "Today" : fmtShort(t.deadline).replace(/,\s*\d{4}$/, "")}</span>
                                          </div>
                                          <span style={{ fontSize: "10px", fontWeight: 700, flexShrink: 0, color: isDone ? "#16A34A" : qm.color, backgroundColor: isDone ? "#F0FDF4" : `${qm.color}15`, padding: "2px 7px", borderRadius: "10px" }}>{isDone ? "Done" : qm.label.split(" ")[0]}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Habits */}
                                <div style={{ padding: "14px 16px", borderRadius: "10px", border: `1px solid ${color}20`, backgroundColor: "#FFFFFF" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px", marginBottom: "12px", borderBottom: `1px solid ${color}20` }}>
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Habits ({mHabits.length})</span>
                                    <button onClick={e => { e.stopPropagation(); setHabitCreateCtx({ goalId: goal.id, milestoneId: m.id }); setHcName(""); setHcDesc(""); setHcArea("health"); setHcFrequency("daily"); setHcCustomDays([1,2,3,4,5]); setHcType("binary"); setHcTarget(1); setHcUnit(""); setHcCue(""); setHcReward(""); }} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, color, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                      <Plus size={12} /> Add Habit
                                    </button>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", minHeight: 108, maxHeight: 180, overflowY: "auto" }}>
                                    {mHabits.length === 0 ? (
                                      <p style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>No habits yet</p>
                                    ) : mHabits.map(h => {
                                      const hDone  = isHabitDoneOnDate(h, today);
                                      const streak = calcStreak(h);
                                      let donePct  = 0;
                                      { let done = 0, sched = 0; const now2 = new Date();
                                        for (let i = 0; i < 30; i++) { const d = new Date(now2); d.setDate(now2.getDate() - i); if (d.getTime() < h.createdAt) break; if (!isScheduledDay(h.frequency, h.customDays, d.getDay())) continue; sched++; if (isHabitDoneOnDate(h, toLocalDate(d))) done++; }
                                        donePct = sched > 0 ? Math.round(done / sched * 100) : 0; }
                                      const pctColor = donePct >= 80 ? "#16A34A" : donePct >= 50 ? "#F97316" : "#DC2626";
                                      return (
                                        <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid #F5F5F5" }}>
                                          <div onClick={() => { if (h.type === "binary") { const c = hDone ? h.completions.filter(d => d !== today) : [...h.completions, today]; onUpdateHabit?.({ ...h, completions: c }); } }} style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, backgroundColor: hDone ? "#16A34A" : "#FFFFFF", border: hDone ? "none" : "1.5px solid #D1D5DB", display: "flex", alignItems: "center", justifyContent: "center", cursor: h.type === "binary" ? "pointer" : "default" }}>
                                            {hDone && <Check size={10} color="#fff" strokeWidth={3} />}
                                          </div>
                                          <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                                          {streak > 0 && (
                                            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: 700, color: "#F97316", flexShrink: 0 }}>
                                              <Flame size={11} color="#F97316" />{streak} day streak
                                            </span>
                                          )}
                                          <span style={{ fontSize: "12px", fontWeight: 700, color: pctColor, flexShrink: 0 }}>{donePct}%</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

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
            <div style={{ width: 320, borderLeft: "1px solid #EDE5D8", overflowY: "auto", padding: "20px", flexShrink: 0, backgroundColor: "#FAFAF9" }}>

              {/* Goal Health */}
              <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", padding: "16px", border: "1px solid #E5E9EE", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <Heart size={14} color={HEALTH_COLOR[health]} fill={HEALTH_COLOR[health]} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Goal Health</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "30px", fontWeight: 800, color: HEALTH_COLOR[health], lineHeight: 1 }}>{health}</span>
                  <Activity size={20} color={HEALTH_COLOR[health]} />
                </div>
                {/* Sparkline */}
                <svg width="100%" height="44" viewBox="0 0 260 44" preserveAspectRatio="none" style={{ display: "block", marginBottom: "10px" }}>
                  <defs>
                    <linearGradient id={`sg-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={HEALTH_COLOR[health]} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={HEALTH_COLOR[health]} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d="M0,34 C30,30 50,26 80,22 C110,18 130,20 160,15 C190,10 220,12 260,6" fill="none" stroke={HEALTH_COLOR[health]} strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,34 C30,30 50,26 80,22 C110,18 130,20 160,15 C190,10 220,12 260,6 L260,44 L0,44 Z" fill={`url(#sg-${goal.id})`} />
                </svg>
                <p style={{ fontSize: "12px", color: "#57534E", lineHeight: 1.5, margin: 0 }}>{HEALTH_DESC[health]}</p>
              </div>

              {/* Goal Summary */}
              <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", padding: "16px", border: "1px solid #E5E9EE", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
                  <LayoutGrid size={14} color="#2563EB" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Goal Summary</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {([
                    { icon: <Target size={12} color="#EA580C" />,     label: "Total Milestones",   value: milestones.length },
                    { icon: <CheckSquare size={12} color="#F97316" />, label: "Active Milestones",  value: milestones.filter(m => !m.completed).length },
                    { icon: <Circle size={12} color="#2563EB" />,      label: "Total Tasks",        value: tasks.length },
                    { icon: <CheckCircle2 size={12} color="#16A34A" />,label: "Tasks Completed",    value: `${completedT} (${tasks.length > 0 ? Math.round(completedT / tasks.length * 100) : 0}%)` },
                    { icon: <Flame size={12} color="#EA580C" />,       label: "Active Habits",      value: linkedHabits.length },
                    { icon: <Zap size={12} color="#7C3AED" />,         label: "Habit Consistency",  value: `${consistency}%` },
                  ] as { icon: React.ReactNode; label: string; value: string | number }[]).map(row => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "7px", backgroundColor: "#F9F9F9", border: "1px solid #E5E9EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {row.icon}
                      </div>
                      <span style={{ fontSize: "12px", color: "#1C1917", flex: 1 }}>{row.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              {upcomingTasks.length > 0 && (
                <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", padding: "16px", border: "1px solid #E5E9EE", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CalendarDays size={14} color="#EA580C" />
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Upcoming Deadlines</span>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#2563EB", cursor: "pointer" }}>View all</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {upcomingTasks.map((t) => {
                      const done    = t.status === "complete";
                      const days    = daysUntil(t.deadline);
                      const overdue = days < 0 && !done;
                      const qm      = Q_META[t.quadrant];
                      const mIdx    = milestones.findIndex(m => m.id === t.linkedMilestoneId);
                      return (
                        <div key={t.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          {/* Checkbox + vertical line */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                            <div
                              onClick={() => onUpdateTask?.({ ...t, status: done ? "open" : "complete" })}
                              style={{
                                width: 20, height: 20, borderRadius: "5px", cursor: "pointer",
                                backgroundColor: done ? "#16A34A" : "#FFFFFF",
                                border: `2px solid ${done ? "#16A34A" : qm.color}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background-color 0.15s, border-color 0.15s",
                              }}
                            >
                              {done && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                            </div>
                            <div style={{ width: 1.5, height: 20, backgroundColor: `${qm.color}35`, marginTop: "3px" }} />
                          </div>
                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px", marginBottom: "3px" }}>
                              <p style={{ fontSize: "13px", fontWeight: 700, color: done ? "#9CA3AF" : "#1C1917", margin: 0, lineHeight: 1.3, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: done ? "line-through" : "none" }}>{t.title}</p>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: overdue ? "#DC2626" : done ? "#9CA3AF" : "#57534E", flexShrink: 0 }}>
                                {overdue ? `${Math.abs(days)}d late` : fmtShort(t.deadline).split(",")[0]}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              {mIdx >= 0 && <span style={{ fontSize: "11px", color: "#78716C" }}>Milestone {mIdx + 1}</span>}
                              {mIdx >= 0 && <span style={{ fontSize: "11px", color: "#C4B5A0" }}>·</span>}
                              <span style={{ fontSize: "11px", fontWeight: 600, color: done ? "#9CA3AF" : qm.color }}>{qm.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              <div style={{ backgroundColor: "#F5F0FF", borderRadius: "14px", padding: "16px", border: "1px solid #DDD6FE" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={14} color="#7C3AED" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#7C3AED" }}>AI Insights</span>
                  </div>
                  <Sparkles size={13} color="#C4B5FD" />
                </div>
                <p style={{ fontSize: "12px", color: "#57534E", lineHeight: 1.5, margin: "0 0 12px" }}>
                  Personalized goal insights and suggestions coming soon.
                </p>
                <button style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1.5px solid #C4B5FD", backgroundColor: "transparent", fontSize: "12px", fontWeight: 600, color: "#7C3AED", cursor: "pointer" }}>
                  View All Insights →
                </button>
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
          ) : null}
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
            onOpenTaskCreate={(goalId, milestoneId) => { setTaskCreateCtx({ goalId, milestoneId }); setTcForm({ title: "", description: "", quadrant: "Q2", deadline: "" }); setTcDelegateTo(""); setTcDelegateNudge(false); setTcQ4Bang(false); }}
            onOpenHabitCreate={(goalId, milestoneId) => { setHabitCreateCtx({ goalId, milestoneId }); setHcName(""); setHcDesc(""); setHcArea("health"); setHcFrequency("daily"); setHcCustomDays([1,2,3,4,5]); setHcType("binary"); setHcTarget(1); setHcUnit(""); setHcCue(""); setHcReward(""); }}
          />
        );
      })()}
      {/* ── Task Create Modal ── */}
      {taskCreateCtx && (() => {
        const tcToday          = toTaskDate();
        const deadlineTodayNudge = tcForm.deadline === tcToday && tcForm.quadrant !== "Q1";
        const dateError        = validateDate(tcForm.deadline, { required: true });
        const canSave          = (tcForm.quadrant === "Q4" || (tcForm.title.trim().length > 0 && !dateError));
        const tcColor          = AREA_META[goal.area].color;
        const Q_LABELS: Record<EisenhowerQ, { main: string; hint: string }> = {
          Q1: { main: "Urgent + Important",        hint: "Do it today, no excuses."       },
          Q2: { main: "Important, Not Urgent",     hint: "Plan it and schedule it."       },
          Q3: { main: "Urgent, Not Important",     hint: "Hand it off to someone."        },
          Q4: { main: "Not Urgent, Not Important", hint: "Hmm… do you really need this?" },
        };
        function selectQuadrant(q: EisenhowerQ) {
          setTcForm(p => ({
            ...p, quadrant: q,
            deadline: q === "Q1" ? tcToday : (p.quadrant === "Q1" ? "" : p.deadline),
          }));
          setTcDelegateNudge(false);
        }
        function closeModal() {
          setTaskCreateCtx(null);
          setTcDelegateTo(""); setTcDelegateNudge(false); setTcQ4Bang(false);
        }
        function handleTaskSave() {
          if (tcForm.quadrant === "Q4") {
            setTcQ4Bang(true);
            setTimeout(() => { closeModal(); }, 2400);
            return;
          }
          if (!canSave) return;
          if (tcForm.quadrant === "Q3" && !tcDelegateTo.trim()) { setTcDelegateNudge(true); return; }
          const description = tcForm.quadrant === "Q3" && tcDelegateTo.trim()
            ? `Delegated to: ${tcDelegateTo.trim()}${tcForm.description.trim() ? "\n" + tcForm.description.trim() : ""}`
            : tcForm.description.trim();
          onSaveTask?.({
            id: crypto.randomUUID(), kind: "one-time",
            title: tcForm.title.trim(), description,
            deadline: tcForm.deadline, quadrant: tcForm.quadrant,
            status: "open", createdAt: Date.now(),
            linkedGoalId: taskCreateCtx!.goalId,
            linkedMilestoneId: taskCreateCtx!.milestoneId || undefined,
          });
          closeModal();
        }
        const inputSt: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #E8DDD0", fontSize: "13px", color: "#1C1917", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF" };
        const labelSt: React.CSSProperties = { fontSize: "11px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", display: "block" };
        return (
          <>
            <div onClick={closeModal} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)", zIndex: 200, backdropFilter: "blur(3px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, maxWidth: "calc(100vw - 32px)", backgroundColor: "#FFFFFF", borderRadius: "18px", zIndex: 201, boxShadow: "0 24px 64px rgba(28,25,23,0.18)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

              {/* Q4 bang overlay */}
              {tcQ4Bang && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, backgroundColor: "#F9FAFB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px", padding: "48px", textAlign: "center" }}>
                  <span style={{ fontSize: "60px", lineHeight: 1 }}>🗑️</span>
                  <p style={{ fontSize: "21px", fontWeight: 800, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>Not urgent AND<br />not important?</p>
                  <p style={{ fontSize: "14px", color: "#57534E", lineHeight: 1.7, margin: 0 }}>Seriously, just forget about it.<br />Not everything deserves space on your list.</p>
                  <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0 }}>Closing in a moment... ✌️</p>
                </div>
              )}

              {/* Header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #EDE5D8", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)", flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: tcColor, margin: "0 0 3px" }}>New Task</p>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>Add Task</h2>
                </div>
                <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: "8px", border: "none", backgroundColor: "#F5F0EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={15} color="#78716C" />
                </button>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

                {/* Title */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelSt}>Title *</label>
                  <input autoFocus value={tcForm.title} onChange={e => setTcForm(p => ({ ...p, title: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleTaskSave(); }} placeholder="What needs to be done?" style={inputSt} onFocus={e => { e.currentTarget.style.borderColor = tcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                </div>

                {/* Description */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelSt}>Description</label>
                  <textarea value={tcForm.description} onChange={e => setTcForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes…" rows={2} style={{ ...inputSt, resize: "none", lineHeight: 1.5 }} onFocus={e => { e.currentTarget.style.borderColor = tcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                </div>

                {/* Priority */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelSt}>Priority</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {(["Q1","Q2","Q3","Q4"] as EisenhowerQ[]).map(q => {
                      const qm = Q_META[q];
                      const selected = tcForm.quadrant === q;
                      const todayHint = deadlineTodayNudge && q === "Q1";
                      return (
                        <button key={q} onClick={() => selectQuadrant(q)} style={{ padding: "9px 11px", borderRadius: "10px", cursor: "pointer", textAlign: "left", border: `2px solid ${selected ? "#FFFFFF" : "transparent"}`, backgroundColor: qm.color, boxShadow: selected ? `0 0 0 2px ${qm.color}` : "none", transition: "box-shadow 0.15s" }}>
                          <p style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 2px" }}>{Q_LABELS[q].main}</p>
                          <p style={{ fontSize: "10px", fontWeight: 500, color: "#FFFFFF", margin: 0, lineHeight: 1.3 }}>{Q_LABELS[q].hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delegate To (Q3 only) */}
                {tcForm.quadrant === "Q3" && (
                  <div style={{ marginBottom: "14px" }}>
                    <label style={labelSt}>Delegate to *</label>
                    <input value={tcDelegateTo} onChange={e => { setTcDelegateTo(e.target.value); if (tcDelegateNudge) setTcDelegateNudge(false); }} placeholder="Who will handle this?" style={{ ...inputSt, borderColor: tcDelegateNudge ? "#DC2626" : "#E8DDD0", backgroundColor: tcDelegateNudge ? "#FEF2F2" : "#FFFFFF" }} onFocus={e => { e.currentTarget.style.borderColor = tcDelegateNudge ? "#DC2626" : tcColor; }} onBlur={e => { e.currentTarget.style.borderColor = tcDelegateNudge ? "#DC2626" : "#E8DDD0"; }} />
                    {tcDelegateNudge && <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, margin: "5px 0 0" }}>👆 You&apos;re delegating — someone has to own this!</p>}
                  </div>
                )}

                {/* Deadline */}
                <div style={{ marginBottom: "8px" }}>
                  <label style={labelSt}>{tcForm.quadrant === "Q1" ? "Deadline — locked to today 🔒" : "Deadline *"}</label>
                  <input type="date" value={tcForm.deadline} disabled={tcForm.quadrant === "Q1"} min={todayDateStr()} max={MAX_DATE_STR} onChange={e => { if (tcForm.quadrant !== "Q1") setTcForm(p => ({ ...p, deadline: e.target.value })); }} style={{ ...inputSt, opacity: tcForm.quadrant === "Q1" ? 0.7 : 1, cursor: tcForm.quadrant === "Q1" ? "not-allowed" : "default", backgroundColor: tcForm.quadrant === "Q1" ? "#FEF3F2" : "#FFFFFF", borderColor: dateError && tcForm.quadrant !== "Q1" ? "#FCA5A5" : "#E8DDD0" }} onFocus={e => { if (tcForm.quadrant !== "Q1") e.currentTarget.style.borderColor = tcColor; }} onBlur={e => { e.currentTarget.style.borderColor = dateError && tcForm.quadrant !== "Q1" ? "#FCA5A5" : "#E8DDD0"; }} />
                  {tcForm.quadrant === "Q1" && <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, margin: "5px 0 0" }}>🔥 It&apos;s urgent — this one&apos;s happening today, no rescheduling!</p>}
                  {tcForm.quadrant !== "Q1" && dateError && <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, margin: "5px 0 0" }}>{dateError}</p>}
                  {deadlineTodayNudge && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "8px", padding: "9px 12px", borderRadius: "8px", backgroundColor: "#FEF2F2", border: "1.5px solid #FCA5A5" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "7px" }}>
                        <AlertTriangle size={13} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>Deadline is today — set it as Urgent + Important for maximum focus!</p>
                      </div>
                      <button onClick={() => selectQuadrant("Q1")} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", backgroundColor: "#DC2626", color: "#FFFFFF", fontSize: "10px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Set Q1</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid #EDE5D8", display: "flex", gap: "8px", flexShrink: 0 }}>
                <button onClick={closeModal} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleTaskSave} disabled={!canSave} style={{ flex: 2, padding: "10px", borderRadius: "10px", border: "none", background: canSave ? `linear-gradient(135deg, ${tcColor}, ${tcColor}CC)` : "#E8DDD0", fontSize: "13px", fontWeight: 700, color: canSave ? "#FFFFFF" : "#A8A29E", cursor: canSave ? "pointer" : "default", boxShadow: canSave ? `0 2px 8px ${tcColor}40` : "none" }}>Add Task</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Habit Create Modal ── */}
      {habitCreateCtx && (() => {
        const hcColor  = AREA_META[goal.area].color;
        const canSave  = hcName.trim().length > 0 && (hcType === "binary" || hcTarget >= 1);
        const DAYS_LBL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const FREQS    = Object.keys(FREQ_LABEL) as HabitFrequency[];
        const AREAS    = Object.keys(HABIT_AREA_META) as LifeArea[];
        function closeHabitModal() { setHabitCreateCtx(null); }
        function handleHabitSave() {
          if (!canSave) return;
          onSaveHabit?.({
            id: crypto.randomUUID(), name: hcName.trim(), description: hcDesc.trim(),
            area: hcArea, frequency: hcFrequency,
            customDays: hcFrequency === "custom" ? hcCustomDays : [],
            cue: hcCue.trim(), reward: hcReward.trim(),
            type: hcType, target: hcType === "binary" ? 1 : hcTarget,
            unit: hcType === "binary" ? "" : hcUnit.trim(),
            completions: [], measurements: {},
            linkedGoalId: habitCreateCtx!.goalId,
            linkedMilestoneId: habitCreateCtx!.milestoneId || "",
            createdAt: Date.now(),
          });
          closeHabitModal();
        }
        const inSt: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", color: "#1C1917", outline: "none", fontFamily: "inherit" };
        const lbSt: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" };
        return (
          <>
            <div onClick={closeHabitModal} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)", zIndex: 200, backdropFilter: "blur(3px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, maxWidth: "calc(100vw - 32px)", backgroundColor: "#FFFFFF", borderRadius: "18px", zIndex: 201, boxShadow: "0 24px 64px rgba(28,25,23,0.18)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

              {/* Header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #EDE5D8", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)", flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: hcColor, margin: "0 0 3px" }}>New Habit</p>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>Build a new habit</h2>
                </div>
                <button onClick={closeHabitModal} style={{ width: 32, height: 32, borderRadius: "8px", border: "none", backgroundColor: "#F5F0EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={15} color="#78716C" />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

                {/* Name */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbSt}>Habit name *</label>
                  <input autoFocus value={hcName} onChange={e => setHcName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && canSave) handleHabitSave(); }} placeholder="e.g. Morning meditation" style={inSt} onFocus={e => { e.currentTarget.style.borderColor = hcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                </div>

                {/* Description */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbSt}>Description (optional)</label>
                  <input value={hcDesc} onChange={e => setHcDesc(e.target.value)} placeholder="e.g. 10 mins of breath-focused meditation" style={inSt} onFocus={e => { e.currentTarget.style.borderColor = hcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                </div>

                {/* Habit type */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbSt}>Habit type</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {(["binary","measurable"] as HabitType[]).map(t => (
                      <button key={t} onClick={() => setHcType(t)} style={{ padding: "10px 12px", borderRadius: "10px", textAlign: "left", border: `1.5px solid ${hcType === t ? hcColor : "#E8DDD0"}`, backgroundColor: hcType === t ? `${hcColor}10` : "#FFFFFF", cursor: "pointer" }}>
                        <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 2px", color: hcType === t ? hcColor : "#1C1917" }}>{t === "binary" ? "Yes / No" : "Measurable"}</p>
                        <p style={{ fontSize: "10px", color: "#6B7280", margin: 0 }}>{t === "binary" ? "Done or not done" : "Track a daily count"}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target + Unit (measurable only) */}
                {hcType === "measurable" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                    <div>
                      <label style={lbSt}>Daily target</label>
                      <input type="number" min={1} value={hcTarget} onChange={e => setHcTarget(Math.max(1, parseInt(e.target.value) || 1))} style={inSt} onFocus={e => { e.currentTarget.style.borderColor = hcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                    </div>
                    <div>
                      <label style={lbSt}>Unit (e.g. pages, mins)</label>
                      <input value={hcUnit} onChange={e => setHcUnit(e.target.value)} placeholder="pages" style={inSt} onFocus={e => { e.currentTarget.style.borderColor = hcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                    </div>
                  </div>
                )}

                {/* Life area */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbSt}>Life area</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {AREAS.map(a => {
                      const m = HABIT_AREA_META[a];
                      return (
                        <button key={a} onClick={() => setHcArea(a)} style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, border: `1.5px solid ${hcArea === a ? m.color : "#E8DDD0"}`, backgroundColor: hcArea === a ? m.bg : "#FFFFFF", color: hcArea === a ? m.color : "#374151", cursor: "pointer" }}>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Frequency */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={lbSt}>How often?</label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {FREQS.map(f => (
                      <button key={f} onClick={() => setHcFrequency(f)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: `1.5px solid ${hcFrequency === f ? "#F97316" : "#E8DDD0"}`, backgroundColor: hcFrequency === f ? "#FFF7ED" : "#FFFFFF", color: hcFrequency === f ? "#F97316" : "#374151", cursor: "pointer" }}>
                        {FREQ_LABEL[f]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom days */}
                {hcFrequency === "custom" && (
                  <div style={{ marginBottom: "14px" }}>
                    <label style={lbSt}>Which days?</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {DAYS_LBL.map((day, i) => (
                        <button key={i} onClick={() => setHcCustomDays(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i].sort())} style={{ width: 36, height: 36, borderRadius: "50%", fontSize: "10px", fontWeight: 700, border: `1.5px solid ${hcCustomDays.includes(i) ? "#F97316" : "#E8DDD0"}`, backgroundColor: hcCustomDays.includes(i) ? "#F97316" : "#FFFFFF", color: hcCustomDays.includes(i) ? "#FFFFFF" : "#374151", cursor: "pointer" }}>
                          {day[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Habit loop */}
                <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: "#FAFAFA", border: "1px solid #EDE5D8" }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8A29E", marginBottom: "10px" }}>Habit Loop (optional)</p>
                  <div style={{ marginBottom: "10px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>Cue — what triggers this habit?</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#A8A29E", whiteSpace: "nowrap" }}>After I</span>
                      <input value={hcCue} onChange={e => setHcCue(e.target.value)} placeholder="wake up / finish lunch…" style={{ ...inSt, flex: 1 }} onFocus={e => { e.currentTarget.style.borderColor = hcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>Reward — how will you celebrate?</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#A8A29E", whiteSpace: "nowrap" }}>I will</span>
                      <input value={hcReward} onChange={e => setHcReward(e.target.value)} placeholder="enjoy a coffee / feel proud…" style={{ ...inSt, flex: 1 }} onFocus={e => { e.currentTarget.style.borderColor = hcColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid #EDE5D8", display: "flex", gap: "8px", flexShrink: 0 }}>
                <button onClick={closeHabitModal} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleHabitSave} disabled={!canSave} style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: canSave ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0", fontSize: "13px", fontWeight: 700, color: canSave ? "#FFFFFF" : "#A8A29E", cursor: canSave ? "pointer" : "default", boxShadow: canSave ? "0 2px 8px rgba(249,115,22,0.3)" : "none" }}>Add Habit</button>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}

// ── Circular progress ring ────────────────────────────────────────────────────
function CircularProgress({ value, color, onChange }: { value: number; color: string; onChange?: (v: number) => void }) {
  const SIZE = 148;
  const CX = 74, CY = 74, R = 58;
  const circ = 2 * Math.PI * R;
  const offset = circ - (value / 100) * circ;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  // Drag-handle position on arc
  const thumbAngleRad = ((value / 100) * 360 - 90) * (Math.PI / 180);
  const thumbX = CX + R * Math.cos(thumbAngleRad);
  const thumbY = CY + R * Math.sin(thumbAngleRad);

  const getVal = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return value;
    const rect = svg.getBoundingClientRect();
    const dx = clientX - rect.left - (rect.width / 2);
    const dy = clientY - rect.top - (rect.height / 2);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return Math.min(100, Math.max(0, Math.round((angle / 360) * 100)));
  }, [value]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onChange) return;
    e.preventDefault();
    dragging.current = true;
    onChange(getVal(e.clientX, e.clientY));
    const onMove = (ev: MouseEvent) => { ev.preventDefault(); if (dragging.current) onChange(getVal(ev.clientX, ev.clientY)); };
    const onUp   = () => { dragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onChange, getVal]);

  return (
    <div style={{ flexShrink: 0, userSelect: "none" }}>
      <svg ref={svgRef} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
        onMouseDown={handleMouseDown}
        style={{ display: "block", cursor: onChange ? "grab" : "default" }}
      >
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={`${color}18`} strokeWidth="5" />
        {/* Progress arc */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: dragging.current ? "none" : "stroke-dashoffset 0.3s ease" }} />
        {/* Percentage text */}
        <text x={CX} y={CY + 5} textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="800" fill="#1C1917">{value}%</text>
        {/* Drag handle thumb */}
        {onChange && (
          <circle cx={thumbX} cy={thumbY} r={9} fill={color} stroke="#FFFFFF" strokeWidth="2.5"
            style={{ filter: `drop-shadow(0 1px 4px ${color}90)`, cursor: "grab" }} />
        )}
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
  onClose, onUpdateGoal, onUpdateTask, onUpdateHabit, onOpenTaskCreate, onOpenHabitCreate,
}: {
  milestone:            Milestone;
  milestoneIndex:       number;
  goal:                 GoalData;
  mTasks:               TaskData[];
  mHabits:              HabitData[];
  onClose:              () => void;
  onUpdateGoal:         (g: GoalData)  => void;
  onUpdateTask?:        (t: TaskData)  => void;
  onUpdateHabit?:       (h: HabitData) => void;
  onOpenTaskCreate?:    (goalId: string, milestoneId: string) => void;
  onOpenHabitCreate?:   (goalId: string, milestoneId: string) => void;
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
                  <button onClick={() => { onOpenTaskCreate?.(goal.id, milestone.id); }} style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px dashed #C4B5A0", backgroundColor: "transparent", fontSize: "12px", fontWeight: 600, color: "#7C3AED", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7C3AED"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F3FF"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#C4B5A0"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                    <Plus size={12} /> Task
                  </button>
                  <button onClick={() => { onOpenHabitCreate?.(goal.id, milestone.id); }} style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px dashed #C4B5A0", backgroundColor: "transparent", fontSize: "12px", fontWeight: 600, color: "#2563EB", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
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
