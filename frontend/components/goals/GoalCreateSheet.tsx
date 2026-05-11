"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import {
  X, Target, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CalendarDays,
  Plus, Trash2, Check, ArrowRight, ArrowLeft, Star, Link2, CheckSquare,
  Eye, Circle, Flame, AlertTriangle,
  Briefcase, Globe, DollarSign, Sparkles, BookOpen, Heart, Activity,
  type LucideIcon,
} from "lucide-react";
import type { LifeArea, GoalData, Milestone } from "./GoalCard";
import { AREA_META } from "./GoalCard";
import type { TaskData, EisenhowerQ } from "@/components/tasks/TaskCard";
import { Q_META, daysUntil, toTaskDate } from "@/components/tasks/TaskCard";
import type { HabitData, HabitFrequency, HabitType } from "@/components/habits/HabitCard";
import { FREQ_LABEL, AREA_META as HABIT_AREA_META } from "@/components/habits/HabitCard";
import { MAX_DATE_STR, todayDateStr, validateDate } from "@/lib/dateValidation";

const AREA_ICONS: Record<LifeArea, LucideIcon> = {
  professional:  Briefcase,
  contribution:  Globe,
  wealth:        DollarSign,
  spiritual:     Sparkles,
  personal:      BookOpen,
  relationships: Heart,
  health:        Activity,
};

const AREAS: { value: LifeArea; label: string }[] = [
  { value: "professional",  label: "Professional"   },
  { value: "contribution",  label: "Contribution"   },
  { value: "wealth",        label: "Wealth"         },
  { value: "spiritual",     label: "Spiritual"      },
  { value: "personal",      label: "Personal Growth"},
  { value: "relationships", label: "Relationships"  },
  { value: "health",        label: "Health"         },
];

const STEPS = [
  { num: 1, label: "Goal Basics",   sub: "Name, area & target date" },
  { num: 2, label: "Build Roadmap", sub: "Milestones, tasks & habits" },
];

function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (goal: GoalData) => void;
  onSaveTask?:  (t: TaskData)  => void;
  onSaveHabit?: (h: HabitData) => void;
  initialData?: GoalData;
}

export default function GoalCreateSheet({ open, onClose, onSave, onSaveTask, onSaveHabit, initialData }: Props) {
  const isEditing = !!initialData;
  const [step, setStep] = useState(1);

  // Step 1
  const [area,     setArea]     = useState<LifeArea>("professional");
  const [title,    setTitle]    = useState("");
  const [why,      setWhy]      = useState("");
  const [metric,   setMetric]   = useState("");
  const [unit,     setUnit]     = useState("");
  const [deadline, setDeadline] = useState("");

  // Step 2 — milestones
  const [milestones,  setMilestones]  = useState<Milestone[]>([]);
  const [mTitle,      setMTitle]      = useState("");
  const [mDeadline,   setMDeadline]   = useState("");
  const [showMsForm,  setShowMsForm]  = useState(false);
  const [expandedMsId, setExpandedMsId] = useState<string | null>(null);

  // Step 2 — local tasks/habits keyed by milestoneId
  const [msTasks,  setMsTasks]  = useState<Record<string, TaskData[]>>({});
  const [msHabits, setMsHabits] = useState<Record<string, HabitData[]>>({});

  // Task create
  const [taskCreateMsId,  setTaskCreateMsId]  = useState<string | null>(null);
  const [tcForm,          setTcForm]           = useState({ title: "", description: "", quadrant: "Q2" as EisenhowerQ, deadline: "" });
  const [tcDelegateTo,    setTcDelegateTo]     = useState("");
  const [tcDelegateNudge, setTcDelegateNudge]  = useState(false);
  const [tcQ4Bang,        setTcQ4Bang]         = useState(false);

  // Habit create
  const [habitCreateMsId, setHabitCreateMsId] = useState<string | null>(null);
  const [hcName,          setHcName]           = useState("");
  const [hcDesc,          setHcDesc]           = useState("");
  const [hcArea,          setHcArea]           = useState<LifeArea>("health");
  const [hcFrequency,     setHcFrequency]      = useState<HabitFrequency>("daily");
  const [hcCustomDays,    setHcCustomDays]     = useState<number[]>([1,2,3,4,5]);
  const [hcType,          setHcType]           = useState<HabitType>("binary");
  const [hcTarget,        setHcTarget]         = useState(1);
  const [hcUnit,          setHcUnit]           = useState("");
  const [hcCue,           setHcCue]            = useState("");
  const [hcReward,        setHcReward]         = useState("");

  useEffect(() => {
    if (!open) {
      setStep(1);
      setArea("professional"); setTitle(""); setWhy("");
      setMetric(""); setUnit(""); setDeadline("");
      setMilestones([]); setMTitle(""); setMDeadline(""); setShowMsForm(false);
      setExpandedMsId(null); setMsTasks({}); setMsHabits({});
      setTaskCreateMsId(null); setTcForm({ title: "", description: "", quadrant: "Q2", deadline: "" }); setTcDelegateTo(""); setTcDelegateNudge(false); setTcQ4Bang(false);
      setHabitCreateMsId(null); setHcName(""); setHcDesc(""); setHcArea("health"); setHcFrequency("daily"); setHcCustomDays([1,2,3,4,5]); setHcType("binary"); setHcTarget(1); setHcUnit(""); setHcCue(""); setHcReward("");
    } else if (initialData) {
      setArea(initialData.area);
      setTitle(initialData.statement);
      setWhy(initialData.outcome !== initialData.statement ? initialData.outcome : "");
      setMetric(initialData.metric);
      setUnit(initialData.metricUnit);
      setDeadline(initialData.deadline === "2099-12-31" ? "" : initialData.deadline);
      setMilestones([...(initialData.milestones ?? [])]);
      setMsTasks({}); setMsHabits({});
      setStep(1);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const deadlineError  = deadline ? validateDate(deadline, { required: false }) : null;
  const mDeadlineError = deadline && mDeadline && mDeadline > deadline
    ? "Can't be after goal's target date" : null;

  const areaColor = AREA_META[area].color;
  const areaBg    = AREA_META[area].bg;
  const AreaIcon  = AREA_ICONS[area];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    border: `1.5px solid ${areaColor}55`,
    backgroundColor: "#FFFFFF",
    fontSize: "13px", color: "#1C1917", outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const addMilestone = () => {
    if (!mTitle.trim() || !mDeadline || mDeadlineError) return;
    const m: Milestone = {
      id: crypto.randomUUID(), title: mTitle.trim(),
      deadline: mDeadline, completed: false, createdAt: Date.now(),
    };
    setMilestones(p => [...p, m].sort((a, b) => a.deadline.localeCompare(b.deadline)));
    setMTitle(""); setMDeadline(""); setShowMsForm(false);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const now    = Date.now();
    const goalId = initialData?.id ?? crypto.randomUUID();
    const goal: GoalData = {
      id:         goalId,
      statement:  title.trim(),
      outcome:    why.trim() || title.trim(),
      metric:     metric.trim(),
      metricUnit: unit.trim(),
      deadline:   deadline || "2099-12-31",
      area,
      progress:   initialData?.progress   ?? 0,
      lastMoved:  initialData?.lastMoved  ?? now,
      velocity:   initialData?.velocity   ?? 0,
      notes:      initialData?.notes      ?? [],
      milestones,
      createdAt:  initialData?.createdAt  ?? now,
    };
    onSave(goal);
    // Flush locally-staged tasks and habits (only new ones added during this session)
    Object.entries(msTasks).forEach(([, arr]) =>
      arr.forEach(t => onSaveTask?.({ ...t, linkedGoalId: goalId }))
    );
    Object.entries(msHabits).forEach(([, arr]) =>
      arr.forEach(h => onSaveHabit?.({ ...h, linkedGoalId: goalId }))
    );
    onClose();
  };

  // Derived counts for sidebar stats
  const totalTasks  = Object.values(msTasks).reduce((s, a) => s + a.length, 0);
  const totalHabits = Object.values(msHabits).reduce((s, a) => s + a.length, 0);

  if (!open) return null;

  return createPortal(
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "#F9FAFB", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div style={{ height: 52, padding: "0 32px", borderBottom: "1px solid #E5E9EE", backgroundColor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "6px 0", color: "#1C1917", fontSize: "13px", fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Goals
        </button>
        <button
          onClick={onClose}
          style={{ padding: "9px 22px", borderRadius: "8px", border: "none", backgroundColor: "#F97316", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer", boxShadow: "0 2px 8px rgba(249,115,22,0.3)" }}
        >
          Save goal
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left form panel */}
        <div className="px-5 sm:px-12" style={{ flex: 1, overflowY: "auto", paddingTop: "28px", paddingBottom: "48px" }}>

          {/* Page heading */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#FFF7ED", border: "1.5px solid #FED7AA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Target size={18} color="#F97316" />
            </div>
            <div>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "#1C1917", margin: 0, lineHeight: 1.2 }}>{isEditing ? "Edit Goal" : "Create New Goal"}</p>
              <p style={{ fontSize: "12px", color: "#44403C", margin: "2px 0 0" }}>{isEditing ? "Update your goal details and roadmap." : "Define your goal and build a roadmap to achieve it."}</p>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
            {STEPS.map((s, i) => {
              const isActive    = step === s.num;
              const isCompleted = step > s.num;
              const isClickable = s.num !== step;
              return (
                <Fragment key={s.num}>
                  <div
                    onClick={() => { if (isClickable) setStep(s.num); }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isClickable ? "pointer" : "default" }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: isActive ? "#F97316" : isCompleted ? "#22C55E" : "#FFFFFF",
                      border: isActive || isCompleted ? "none" : "2px solid #78716C",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isCompleted
                        ? <Check size={15} color="#FFFFFF" strokeWidth={3} />
                        : <span style={{ fontSize: "13px", fontWeight: 700, color: isActive ? "#FFFFFF" : "#1C1917" }}>{s.num}</span>
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: isActive ? "#F97316" : isCompleted ? "#16A34A" : "#44403C", margin: 0 }}>{s.label}</p>
                      <p style={{ fontSize: "11px", fontWeight: 500, color: isActive ? "#D97706" : "#44403C", margin: 0 }}>{s.sub}</p>
                    </div>
                  </div>
                  {i < 1 && (
                    <div style={{ flex: 1, height: 2, backgroundColor: isCompleted ? "#22C55E" : "#E5E7EB", margin: "0 16px" }} />
                  )}
                </Fragment>
              );
            })}
          </div>

          {/* ── Step 1: Goal Basics ── */}
          {step === 1 && (
            <div style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E5E9EE", padding: "28px" }}>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: "0 0 4px" }}>1. Goal Basics</p>
              <p style={{ fontSize: "13px", color: "#44403C", margin: "0 0 24px" }}>Start with the foundations of your goal.</p>

              {/* Life Area + Goal Title */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label style={labelStyle}>Life Area</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", borderRadius: "8px", border: `1.5px solid ${areaColor}50`, backgroundColor: areaBg }}>
                    <AreaIcon size={15} color={areaColor} style={{ flexShrink: 0 }} />
                    <select
                      value={area}
                      onChange={e => setArea(e.target.value as LifeArea)}
                      style={{ flex: 1, border: "none", background: "transparent", fontSize: "13px", fontWeight: 700, color: areaColor, cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none" }}
                    >
                      {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                    <ChevronDown size={13} color={areaColor} style={{ flexShrink: 0, pointerEvents: "none" }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Goal Title <span style={{ color: "#EF4444" }}>*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Build a profitable second income stream"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = areaColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${areaColor}20`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = `${areaColor}55`; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              {/* Why textarea */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>
                  Why does this matter to you?{" "}
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280" }}>(optional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <textarea
                    value={why}
                    onChange={e => { if (e.target.value.length <= 200) setWhy(e.target.value); }}
                    placeholder="To create financial freedom and more time for the things that matter."
                    rows={3}
                    style={{ ...inputStyle, resize: "none", lineHeight: "1.6", paddingBottom: "26px" } as React.CSSProperties}
                    onFocus={e => { e.currentTarget.style.borderColor = areaColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${areaColor}20`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = `${areaColor}55`; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <span style={{ position: "absolute", bottom: "8px", right: "12px", fontSize: "11px", color: why.length > 180 ? "#F97316" : "#9CA3AF", transition: "color 0.15s", pointerEvents: "none" }}>
                    {why.length}/200
                  </span>
                </div>
              </div>

              {/* Metric + Unit + Target Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 190px", gap: "16px", marginBottom: "32px" }}>
                <div>
                  <label style={labelStyle}>
                    How will you measure success?{" "}
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={metric}
                    onChange={e => setMetric(e.target.value)}
                    placeholder="e.g. ₹2,00,000 per month"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = areaColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${areaColor}20`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = `${areaColor}55`; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Unit{" "}
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="e.g. Income"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = areaColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${areaColor}20`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = `${areaColor}55`; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Target Date{" "}
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280" }}>(optional)</span>
                  </label>
                  <CalendarPicker
                    value={deadline}
                    onChange={setDeadline}
                    onClear={() => setDeadline("")}
                    accentColor={areaColor}
                  />
                  {deadlineError && <p style={{ fontSize: "11px", color: "#DC2626", margin: "4px 0 0" }}>{deadlineError}</p>}
                </div>
              </div>

              {/* Next */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => { if (title.trim()) setStep(2); }}
                  disabled={!title.trim()}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "12px 36px", borderRadius: "10px", border: "none",
                    background: title.trim() ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
                    fontSize: "14px", fontWeight: 700,
                    color: title.trim() ? "#FFFFFF" : "#A8A29E",
                    cursor: title.trim() ? "pointer" : "default",
                  }}
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Build Roadmap ── */}
          {step === 2 && (
            <div>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0 }}>2. Build Roadmap</p>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#9CA3AF" }}>(optional)</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#78716C", margin: "4px 0 0" }}>Add milestones, then attach tasks and habits to each.</p>
                </div>
                {(milestones.length > 0 || showMsForm) && (
                  <button
                    onClick={() => { if (!title.trim()) return; setShowMsForm(true); setMTitle(""); setMDeadline(""); }}
                    disabled={!title.trim()}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", border: "none", background: title.trim() ? areaColor : "#E8DDD0", color: title.trim() ? "#FFFFFF" : "#A8A29E", fontSize: "13px", fontWeight: 700, cursor: title.trim() ? "pointer" : "not-allowed", flexShrink: 0, boxShadow: title.trim() ? `0 2px 8px ${areaColor}50` : "none" }}
                  >
                    <Plus size={14} /> Add Milestone
                  </button>
                )}
              </div>

              {/* Title missing warning */}
              {!title.trim() && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", backgroundColor: "#FFFBEB", border: "1.5px solid #FDE68A", marginBottom: "20px" }}>
                  <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#92400E", margin: 0 }}>
                    Go back to <button onClick={() => setStep(1)} style={{ background: "none", border: "none", padding: 0, fontWeight: 700, color: "#D97706", cursor: "pointer", fontSize: "13px" }}>Goal Basics</button> and enter a goal title before adding milestones.
                  </p>
                </div>
              )}

              {/* Empty state */}
              {milestones.length === 0 && !showMsForm && (
                <div
                  onClick={() => { if (title.trim()) setShowMsForm(true); }}
                  style={{ border: `2px dashed ${title.trim() ? "#E5E7EB" : "#E5E7EB"}`, borderRadius: "16px", padding: "52px 24px", textAlign: "center", cursor: title.trim() ? "pointer" : "default", backgroundColor: "#FAFAFA", marginBottom: "28px", transition: "border-color 0.15s, background-color 0.15s", opacity: title.trim() ? 1 : 0.5 }}
                  onMouseEnter={e => { if (title.trim()) { (e.currentTarget as HTMLDivElement).style.borderColor = areaColor; (e.currentTarget as HTMLDivElement).style.backgroundColor = `${areaBg}`; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E5E7EB"; (e.currentTarget as HTMLDivElement).style.backgroundColor = "#FAFAFA"; }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: areaBg, border: `2px solid ${areaColor}50`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Target size={24} color={areaColor} />
                  </div>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917", margin: "0 0 6px" }}>No milestones yet</p>
                  <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 20px" }}>Milestones help you break your goal into meaningful steps.</p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 22px", borderRadius: "10px", background: title.trim() ? areaColor : "#E8DDD0", color: title.trim() ? "#FFFFFF" : "#A8A29E", fontSize: "13px", fontWeight: 700 }}>
                    <Plus size={14} /> Create First Milestone
                  </div>
                </div>
              )}

              {/* Vertical timeline */}
              {(milestones.length > 0 || showMsForm) && (
                <div style={{ marginBottom: "28px" }}>
                  {milestones.map((m, idx) => {
                    const isExpanded  = true;
                    const mTasksArr   = msTasks[m.id]  ?? [];
                    const mHabitsArr  = msHabits[m.id] ?? [];
                    const isLastMs    = idx === milestones.length - 1 && !showMsForm;
                    return (
                      <div key={m.id} style={{ display: "flex" }}>
                        {/* Circle + vertical line */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 52, flexShrink: 0 }}>
                          <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: areaColor, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 3px 10px ${areaColor}50`, marginTop: 2, flexShrink: 0 }}>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: "#FFFFFF" }}>{idx + 1}</span>
                          </div>
                          {!isLastMs && (
                            <div style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: `${areaColor}40`, marginTop: 4 }} />
                          )}
                        </div>

                        {/* Accordion card */}
                        <div style={{ flex: 1, paddingLeft: 14, paddingBottom: isLastMs ? 0 : 20 }}>
                          <div style={{ borderRadius: "12px", border: `1.5px solid ${areaColor}`, backgroundColor: areaBg, overflow: "hidden", boxShadow: `0 4px 16px ${areaColor}20`, transition: "border-color 0.15s, box-shadow 0.15s" }}>

                            {/* Header row */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderBottom: `1px solid ${areaColor}30` }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: "1.4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</p>
                                <p style={{ fontSize: "12px", color: areaColor, fontWeight: 500, margin: "2px 0 0" }}>{fmtDate(m.deadline)} · {mTasksArr.length} task{mTasksArr.length !== 1 ? "s" : ""} · {mHabitsArr.length} habit{mHabitsArr.length !== 1 ? "s" : ""}</p>
                              </div>
                              <button
                                onClick={() => { setMilestones(p => p.filter(ms => ms.id !== m.id)); setMsTasks(p => { const n = {...p}; delete n[m.id]; return n; }); setMsHabits(p => { const n = {...p}; delete n[m.id]; return n; }); }}
                                style={{ width: 28, height: 28, borderRadius: "8px", border: "none", backgroundColor: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                              >
                                <Trash2 size={13} color="#DC2626" />
                              </button>
                            </div>

                            {/* Body */}
                            <div>
                              <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

                                {/* Tasks column */}
                                <div style={{ backgroundColor: "#FFFFFF", borderRadius: "10px", border: `1px solid ${areaColor}35`, overflow: "hidden" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${areaColor}20` }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917" }}>Tasks ({mTasksArr.length})</span>
                                    <button
                                      onClick={e => { e.stopPropagation(); setTaskCreateMsId(m.id); setTcForm({ title: "", description: "", quadrant: "Q2", deadline: "" }); setTcDelegateTo(""); setTcDelegateNudge(false); setTcQ4Bang(false); }}
                                      style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, color: areaColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                    >
                                      <Plus size={12} /> Add
                                    </button>
                                  </div>
                                  <div style={{ padding: "4px 0", maxHeight: 180, overflowY: "auto" }}>
                                    {mTasksArr.length === 0 ? (
                                      <p style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic", margin: 0, padding: "10px 12px" }}>No tasks yet</p>
                                    ) : mTasksArr.map((t, tIdx) => {
                                      const qm = Q_META[t.quadrant];
                                      return (
                                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderBottom: `1px solid ${areaColor}10` }}>
                                          <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: `${areaColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <span style={{ fontSize: "9px", fontWeight: 800, color: areaColor, lineHeight: 1 }}>{tIdx + 1}</span>
                                          </div>
                                          <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "1.4" }}>{t.title}</span>
                                          <span style={{ fontSize: "10px", fontWeight: 600, color: "#374151", backgroundColor: "#E5E7EB", padding: "2px 6px", borderRadius: "4px", flexShrink: 0, whiteSpace: "nowrap" }}>{fmtDate(t.deadline)}</span>
                                          <span style={{ fontSize: "10px", fontWeight: 700, color: qm.color, backgroundColor: `${qm.color}15`, padding: "2px 6px", borderRadius: "8px", flexShrink: 0 }}>{qm.label.split(" ")[0]}</span>
                                          <button onClick={() => setMsTasks(p => ({ ...p, [m.id]: (p[m.id] ?? []).filter(tt => tt.id !== t.id) }))} style={{ width: 18, height: 18, borderRadius: "4px", border: "none", backgroundColor: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Trash2 size={10} color="#DC2626" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Habits column */}
                                <div style={{ backgroundColor: "#FFFFFF", borderRadius: "10px", border: `1px solid ${areaColor}35`, overflow: "hidden" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${areaColor}20` }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917" }}>Habits ({mHabitsArr.length})</span>
                                    <button
                                      onClick={e => { e.stopPropagation(); setHabitCreateMsId(m.id); setHcName(""); setHcDesc(""); setHcArea(area); setHcFrequency("daily"); setHcCustomDays([1,2,3,4,5]); setHcType("binary"); setHcTarget(1); setHcUnit(""); setHcCue(""); setHcReward(""); }}
                                      style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, color: areaColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                    >
                                      <Plus size={12} /> Add
                                    </button>
                                  </div>
                                  <div style={{ padding: "4px 0", maxHeight: 180, overflowY: "auto" }}>
                                    {mHabitsArr.length === 0 ? (
                                      <p style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic", margin: 0, padding: "10px 12px" }}>No habits yet</p>
                                    ) : mHabitsArr.map((h, hIdx) => (
                                      <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderBottom: `1px solid ${areaColor}10` }}>
                                        <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: `${areaColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                          <span style={{ fontSize: "9px", fontWeight: 800, color: areaColor, lineHeight: 1 }}>{hIdx + 1}</span>
                                        </div>
                                        <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "1.4" }}>{h.name}</span>
                                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#6B7280", backgroundColor: "#F3F4F6", padding: "2px 6px", borderRadius: "8px", flexShrink: 0 }}>{FREQ_LABEL[h.frequency]}</span>
                                        <button onClick={() => setMsHabits(p => ({ ...p, [m.id]: (p[m.id] ?? []).filter(hh => hh.id !== h.id) }))} style={{ width: 18, height: 18, borderRadius: "4px", border: "none", backgroundColor: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                          <Trash2 size={10} color="#DC2626" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* New milestone form as the next timeline node */}
                  {showMsForm && (
                    <div style={{ display: "flex" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 52, flexShrink: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", border: `2.5px dashed ${areaColor}`, backgroundColor: areaBg, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0 }}>
                          <Plus size={16} color={areaColor} />
                        </div>
                      </div>
                      <div style={{ flex: 1, paddingLeft: 14 }}>
                        <div style={{ position: "relative", border: `1.5px solid ${areaColor}40`, borderRadius: "12px", padding: "16px", backgroundColor: areaBg }}>
                          <button
                            onClick={() => { setShowMsForm(false); setMTitle(""); setMDeadline(""); }}
                            style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: "6px", border: "none", backgroundColor: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <X size={13} color="#DC2626" />
                          </button>
                          <div style={{ display: "flex", gap: "10px", marginBottom: mDeadlineError ? "4px" : "12px", paddingRight: 36 }}>
                            <input
                              type="text"
                              value={mTitle}
                              onChange={e => setMTitle(e.target.value)}
                              placeholder="Milestone title"
                              style={{ ...inputStyle, flex: 1 }}
                              onFocus={e => { e.currentTarget.style.borderColor = areaColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${areaColor}18`; }}
                              onBlur={e  => { e.currentTarget.style.borderColor = `${areaColor}55`; e.currentTarget.style.boxShadow = "none"; }}
                              onKeyDown={e => { if (e.key === "Enter") addMilestone(); }}
                              autoFocus
                            />
                            <div style={{ width: 190, flexShrink: 0 }}>
                              <CalendarPicker value={mDeadline} onChange={setMDeadline} onClear={() => setMDeadline("")} accentColor={areaColor} max={deadline || undefined} />
                            </div>
                          </div>
                          {mDeadlineError && <p style={{ fontSize: "11px", color: "#DC2626", margin: "0 0 10px" }}>{mDeadlineError}</p>}
                          <button
                            onClick={addMilestone}
                            disabled={!mTitle.trim() || !mDeadline || !!mDeadlineError}
                            style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "none", backgroundColor: mTitle.trim() && mDeadline && !mDeadlineError ? areaColor : "#E8DDD0", fontSize: "13px", fontWeight: 700, color: mTitle.trim() && mDeadline && !mDeadlineError ? "#FFFFFF" : "#A8A29E", cursor: mTitle.trim() && mDeadline && !mDeadlineError ? "pointer" : "default", boxShadow: mTitle.trim() && mDeadline && !mDeadlineError ? `0 2px 8px ${areaColor}50` : "none" }}
                          >
                            Add Milestone
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* "Add another" row */}
                  {!showMsForm && milestones.length > 0 && (
                    <button
                      onClick={() => { setShowMsForm(true); setMTitle(""); setMDeadline(""); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", marginTop: 12, padding: "11px", borderRadius: "10px", border: "none", backgroundColor: areaBg, fontSize: "13px", fontWeight: 700, color: areaColor, cursor: "pointer", boxShadow: `0 0 0 1.5px ${areaColor}50` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1.5px ${areaColor}`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1.5px ${areaColor}50`; }}
                    >
                      <Plus size={14} /> Add another milestone
                    </button>
                  )}
                </div>
              )}

              {/* Navigation */}
              <button
                onClick={handleSave}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px", borderRadius: "10px", border: "none", backgroundColor: "#F97316", fontSize: "14px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer", boxShadow: "0 2px 10px rgba(249,115,22,0.35)" }}
              >
                {isEditing ? "Save Changes" : "Create Goal"} <ArrowRight size={16} />
              </button>
            </div>
          )}

        </div>

        {/* ── Right sidebar ── */}
        <div className="hidden sm:block" style={{ width: 360, borderLeft: "1px solid #E5E9EE", overflowY: "auto", padding: "28px 24px", flexShrink: 0, backgroundColor: "#FAFAF9" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Eye size={15} color="#6B7280" />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917" }}>Goal Preview</span>
            </div>
          </div>

          {/* Preview card */}
          <div style={{ backgroundColor: areaBg, borderRadius: "14px", border: `1px solid ${areaColor}25`, padding: "16px", marginBottom: "20px" }}>
            {/* Area badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: areaColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AreaIcon size={16} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: areaColor, backgroundColor: "#FFFFFF", padding: "3px 10px", borderRadius: "20px", border: `1px solid ${areaColor}30` }}>
                {AREA_META[area].label}
              </span>
            </div>

            {/* Title */}
            <p style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.35, margin: "0 0 6px", color: title ? "#1C1917" : "#D1D5DB" }}>
              {title || "Your goal title will appear here"}
            </p>

            {/* Why */}
            {why && (
              <p style={{ fontSize: "12px", color: "#57534E", margin: "0 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {why}
              </p>
            )}

            {/* Measure of success + target date mini cards */}
            {(metric || deadline) && (
              <div style={{ display: "grid", gridTemplateColumns: metric && deadline ? "1fr 1fr" : "1fr", gap: "8px", marginBottom: "14px" }}>
                {metric && (
                  <div style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", padding: "8px 10px", border: `1px solid ${areaColor}15` }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#78716C", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Measure of Success</p>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{metric}{unit ? ` ${unit}` : ""}</p>
                  </div>
                )}
                {deadline && (
                  <div style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", padding: "8px 10px", border: `1px solid ${areaColor}15` }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#78716C", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Target Date</p>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", margin: 0 }}>{fmtDate(deadline)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", borderTop: `1px solid ${areaColor}20`, paddingTop: "12px" }}>
              {([
                { icon: <Target size={14} color={areaColor} />,       value: milestones.length, label: "Milestones" },
                { icon: <CheckSquare size={14} color="#2563EB" />,    value: totalTasks,        label: "Tasks"      },
                { icon: <Activity size={14} color="#7C3AED" />,       value: totalHabits,       label: "Habits"     },
                { icon: <Circle size={14} color="#D1D5DB" />,         value: "0%",              label: "Progress"   },
              ] as { icon: React.ReactNode; value: number | string; label: string }[]).map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>{s.icon}</div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#57534E", margin: 0, lineHeight: 1.3 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What happens next */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E5E9EE", padding: "16px", marginBottom: "14px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917", margin: "0 0 14px" }}>What happens next?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { icon: <Target size={16} color="#F97316" />,      bg: "#FFF7ED", label: "Add milestones",       sub: "Break your goal into key milestones."           },
                { icon: <CheckSquare size={16} color="#2563EB" />, bg: "#EFF6FF", label: "Add tasks",            sub: "List the actions you need to take."              },
                { icon: <Link2 size={16} color="#7C3AED" />,       bg: "#F5F3FF", label: "Link habits (optional)", sub: "Attach habits that will support your progress." },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "9px", backgroundColor: item.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", margin: "0 0 2px" }}>{item.label}</p>
                    <p style={{ fontSize: "11px", color: "#78716C", margin: 0, lineHeight: 1.4 }}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div style={{ backgroundColor: "#FFFBEB", borderRadius: "12px", border: "1px solid #FDE68A", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#92400E" }}>Tip</span>
            </div>
            <p style={{ fontSize: "12px", color: "#78716C", margin: 0, lineHeight: 1.6 }}>
              A clear goal + small consistent actions = big results.<br />You&apos;ve got this! 👍
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* ── Task Create Modal ── */}
    {taskCreateMsId && (() => {
      const tcToday            = toTaskDate();
      const deadlineTodayNudge = tcForm.deadline === tcToday && tcForm.quadrant !== "Q1";
      const dateError          = validateDate(tcForm.deadline, { required: true });
      const canSave            = tcForm.quadrant === "Q4" || (tcForm.title.trim().length > 0 && !dateError);
      const Q_LABELS: Record<EisenhowerQ, { main: string; hint: string }> = {
        Q1: { main: "Urgent + Important",        hint: "Do it today, no excuses."       },
        Q2: { main: "Important, Not Urgent",     hint: "Plan it and schedule it."       },
        Q3: { main: "Urgent, Not Important",     hint: "Hand it off to someone."        },
        Q4: { main: "Not Urgent, Not Important", hint: "Hmm… do you really need this?" },
      };
      const msId = taskCreateMsId;
      function selectQuadrant(q: EisenhowerQ) {
        setTcForm(p => ({ ...p, quadrant: q, deadline: q === "Q1" ? tcToday : (p.quadrant === "Q1" ? "" : p.deadline) }));
        setTcDelegateNudge(false);
      }
      function closeModal() { setTaskCreateMsId(null); setTcDelegateTo(""); setTcDelegateNudge(false); setTcQ4Bang(false); }
      function handleTaskSave() {
        if (tcForm.quadrant === "Q4") { setTcQ4Bang(true); setTimeout(() => closeModal(), 2400); return; }
        if (!canSave) return;
        if (tcForm.quadrant === "Q3" && !tcDelegateTo.trim()) { setTcDelegateNudge(true); return; }
        const description = tcForm.quadrant === "Q3" && tcDelegateTo.trim()
          ? `Delegated to: ${tcDelegateTo.trim()}${tcForm.description.trim() ? "\n" + tcForm.description.trim() : ""}`
          : tcForm.description.trim();
        const newTask: TaskData = {
          id: crypto.randomUUID(), kind: "one-time",
          title: tcForm.title.trim(), description,
          deadline: tcForm.deadline, quadrant: tcForm.quadrant,
          status: "open", createdAt: Date.now(),
          linkedGoalId: "", linkedMilestoneId: msId,
        };
        setMsTasks(p => ({ ...p, [msId]: [...(p[msId] ?? []), newTask] }));
        closeModal();
      }
      const inputSt: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #E8DDD0", fontSize: "13px", color: "#1C1917", outline: "none", fontFamily: "inherit", backgroundColor: "#FFFFFF" };
      const labelSt: React.CSSProperties = { fontSize: "11px", fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "6px", display: "block" };
      return (
        <>
          <div onClick={closeModal} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)", zIndex: 200, backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, maxWidth: "calc(100vw - 32px)", backgroundColor: "#FFFFFF", borderRadius: "18px", zIndex: 201, boxShadow: "0 24px 64px rgba(28,25,23,0.18)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            {tcQ4Bang && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10, backgroundColor: "#F9FAFB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px", padding: "48px", textAlign: "center" }}>
                <span style={{ fontSize: "60px", lineHeight: 1 }}>🗑️</span>
                <p style={{ fontSize: "21px", fontWeight: 800, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>Not urgent AND<br />not important?</p>
                <p style={{ fontSize: "14px", color: "#57534E", lineHeight: 1.7, margin: 0 }}>Seriously, just forget about it.<br />Not everything deserves space on your list.</p>
                <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0 }}>Closing in a moment... ✌️</p>
              </div>
            )}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #EDE5D8", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: areaColor, margin: "0 0 3px" }}>New Task</p>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>Add Task</h2>
              </div>
              <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: "8px", border: "none", backgroundColor: "#F5F0EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#78716C" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelSt}>Title *</label>
                <input autoFocus value={tcForm.title} onChange={e => setTcForm(p => ({ ...p, title: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleTaskSave(); }} placeholder="What needs to be done?" style={inputSt} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelSt}>Description</label>
                <textarea value={tcForm.description} onChange={e => setTcForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes…" rows={2} style={{ ...inputSt, resize: "none", lineHeight: 1.5 } as React.CSSProperties} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelSt}>Priority</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {(["Q1","Q2","Q3","Q4"] as EisenhowerQ[]).map(q => {
                    const qm = Q_META[q]; const selected = tcForm.quadrant === q;
                    return (
                      <button key={q} onClick={() => selectQuadrant(q)} style={{ padding: "9px 11px", borderRadius: "10px", cursor: "pointer", textAlign: "left", border: `2px solid ${selected ? "#FFFFFF" : "transparent"}`, backgroundColor: qm.color, boxShadow: selected ? `0 0 0 2px ${qm.color}` : "none", transition: "box-shadow 0.15s" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 2px" }}>{Q_LABELS[q].main}</p>
                        <p style={{ fontSize: "10px", fontWeight: 500, color: "#FFFFFF", margin: 0, lineHeight: 1.3 }}>{Q_LABELS[q].hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {tcForm.quadrant === "Q3" && (
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelSt}>Delegate to *</label>
                  <input value={tcDelegateTo} onChange={e => { setTcDelegateTo(e.target.value); if (tcDelegateNudge) setTcDelegateNudge(false); }} placeholder="Who will handle this?" style={{ ...inputSt, borderColor: tcDelegateNudge ? "#DC2626" : "#E8DDD0", backgroundColor: tcDelegateNudge ? "#FEF2F2" : "#FFFFFF" }} onFocus={e => { e.currentTarget.style.borderColor = tcDelegateNudge ? "#DC2626" : areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = tcDelegateNudge ? "#DC2626" : "#E8DDD0"; }} />
                  {tcDelegateNudge && <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, margin: "5px 0 0" }}>👆 You&apos;re delegating — someone has to own this!</p>}
                </div>
              )}
              <div style={{ marginBottom: "8px" }}>
                <label style={labelSt}>{tcForm.quadrant === "Q1" ? "Deadline — locked to today 🔒" : "Deadline *"}</label>
                <input type="date" value={tcForm.deadline} disabled={tcForm.quadrant === "Q1"} min={todayDateStr()} max={MAX_DATE_STR} onChange={e => { if (tcForm.quadrant !== "Q1") setTcForm(p => ({ ...p, deadline: e.target.value })); }} style={{ ...inputSt, opacity: tcForm.quadrant === "Q1" ? 0.7 : 1, cursor: tcForm.quadrant === "Q1" ? "not-allowed" : "default", backgroundColor: tcForm.quadrant === "Q1" ? "#FEF3F2" : "#FFFFFF", colorScheme: "light" as const }} onFocus={e => { if (tcForm.quadrant !== "Q1") e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
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
            <div style={{ padding: "14px 24px", borderTop: "1px solid #EDE5D8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleTaskSave} disabled={!canSave} style={{ flex: 2, padding: "10px", borderRadius: "10px", border: "none", background: canSave ? `linear-gradient(135deg, ${areaColor}, ${areaColor}CC)` : "#E8DDD0", fontSize: "13px", fontWeight: 700, color: canSave ? "#FFFFFF" : "#A8A29E", cursor: canSave ? "pointer" : "default", boxShadow: canSave ? `0 2px 8px ${areaColor}40` : "none" }}>Add Task</button>
            </div>
          </div>
        </>
      );
    })()}

    {/* ── Habit Create Modal ── */}
    {habitCreateMsId && (() => {
      const canSave  = hcName.trim().length > 0 && (hcType === "binary" || hcTarget >= 1);
      const DAYS_LBL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const FREQS    = Object.keys(FREQ_LABEL) as HabitFrequency[];
      const HC_AREAS = Object.keys(HABIT_AREA_META) as LifeArea[];
      const msId     = habitCreateMsId;
      function closeHabitModal() { setHabitCreateMsId(null); }
      function handleHabitSave() {
        if (!canSave) return;
        const newHabit: HabitData = {
          id: crypto.randomUUID(), name: hcName.trim(), description: hcDesc.trim(),
          area: hcArea, frequency: hcFrequency,
          customDays: hcFrequency === "custom" ? hcCustomDays : [],
          cue: hcCue.trim(), reward: hcReward.trim(),
          type: hcType, target: hcType === "binary" ? 1 : hcTarget,
          unit: hcType === "binary" ? "" : hcUnit.trim(),
          completions: [], measurements: {},
          linkedGoalId: "", linkedMilestoneId: msId,
          createdAt: Date.now(),
        };
        setMsHabits(p => ({ ...p, [msId]: [...(p[msId] ?? []), newHabit] }));
        closeHabitModal();
      }
      const inSt: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", color: "#1C1917", outline: "none", fontFamily: "inherit" };
      const lbSt: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" };
      return (
        <>
          <div onClick={closeHabitModal} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)", zIndex: 200, backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, maxWidth: "calc(100vw - 32px)", backgroundColor: "#FFFFFF", borderRadius: "18px", zIndex: 201, boxShadow: "0 24px 64px rgba(28,25,23,0.18)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #EDE5D8", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: areaColor, margin: "0 0 3px" }}>New Habit</p>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>Build a new habit</h2>
              </div>
              <button onClick={closeHabitModal} style={{ width: 32, height: 32, borderRadius: "8px", border: "none", backgroundColor: "#F5F0EB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#78716C" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={lbSt}>Habit name *</label>
                <input autoFocus value={hcName} onChange={e => setHcName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && canSave) handleHabitSave(); }} placeholder="e.g. Morning meditation" style={inSt} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={lbSt}>Description (optional)</label>
                <input value={hcDesc} onChange={e => setHcDesc(e.target.value)} placeholder="e.g. 10 mins of breath-focused meditation" style={inSt} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={lbSt}>Habit type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {(["binary","measurable"] as HabitType[]).map(t => (
                    <button key={t} onClick={() => setHcType(t)} style={{ padding: "10px 12px", borderRadius: "10px", textAlign: "left", border: `1.5px solid ${hcType === t ? areaColor : "#E8DDD0"}`, backgroundColor: hcType === t ? `${areaColor}10` : "#FFFFFF", cursor: "pointer" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 2px", color: hcType === t ? areaColor : "#1C1917" }}>{t === "binary" ? "Yes / No" : "Measurable"}</p>
                      <p style={{ fontSize: "10px", color: "#6B7280", margin: 0 }}>{t === "binary" ? "Done or not done" : "Track a daily count"}</p>
                    </button>
                  ))}
                </div>
              </div>
              {hcType === "measurable" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <label style={lbSt}>Daily target</label>
                    <input type="number" min={1} value={hcTarget} onChange={e => setHcTarget(Math.max(1, parseInt(e.target.value) || 1))} style={inSt} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </div>
                  <div>
                    <label style={lbSt}>Unit (e.g. pages, mins)</label>
                    <input value={hcUnit} onChange={e => setHcUnit(e.target.value)} placeholder="pages" style={inSt} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: "14px" }}>
                <label style={lbSt}>Life area</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {HC_AREAS.map(a => {
                    const m = HABIT_AREA_META[a];
                    return (
                      <button key={a} onClick={() => setHcArea(a)} style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, border: `1.5px solid ${hcArea === a ? m.color : "#E8DDD0"}`, backgroundColor: hcArea === a ? m.bg : "#FFFFFF", color: hcArea === a ? m.color : "#374151", cursor: "pointer" }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: "#FAFAFA", border: "1px solid #EDE5D8" }}>
                <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8A29E", marginBottom: "10px" }}>Habit Loop (optional)</p>
                <div style={{ marginBottom: "10px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>Cue — what triggers this habit?</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#A8A29E", whiteSpace: "nowrap" }}>After I</span>
                    <input value={hcCue} onChange={e => setHcCue(e.target.value)} placeholder="wake up / finish lunch…" style={{ ...inSt, flex: 1 }} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>Reward — how will you celebrate?</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#A8A29E", whiteSpace: "nowrap" }}>I will</span>
                    <input value={hcReward} onChange={e => setHcReward(e.target.value)} placeholder="enjoy a coffee / feel proud…" style={{ ...inSt, flex: 1 }} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid #EDE5D8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button onClick={closeHabitModal} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleHabitSave} disabled={!canSave} style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: canSave ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0", fontSize: "13px", fontWeight: 700, color: canSave ? "#FFFFFF" : "#A8A29E", cursor: canSave ? "pointer" : "default", boxShadow: canSave ? "0 2px 8px rgba(249,115,22,0.3)" : "none" }}>Add Habit</button>
            </div>
          </div>
        </>
      );
    })()}
    </>,
    document.body
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 700,
  color: "#374151", marginBottom: "6px",
};

// ── CalendarPicker ────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarPicker({ value, onChange, onClear, accentColor = "#F97316", min, max }: {
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  accentColor?: string;
  min?: string;
  max?: string;
}) {
  const today = todayDateStr();
  const minDate = min ?? today;
  const maxDate = max ?? MAX_DATE_STR;

  const initial = value ? new Date(value + "T00:00:00") : new Date();
  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [mode,      setMode]      = useState<"cal" | "year">("cal");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setMode("cal");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
    }
  }, [value]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build day grid
  const firstWeekday  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells    = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(viewYear, viewMonth, i - firstWeekday + 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth && d.getFullYear() === viewYear,
      disabled: iso < minDate || iso > maxDate,
    };
  });

  // Year range: today's year to +15 years
  const baseYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => baseYear + i);

  const displayText = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <div
        onClick={() => { setOpen(o => !o); if (!open) setMode("cal"); }}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "9px 12px", borderRadius: "8px",
          border: `1.5px solid ${open ? accentColor : `${accentColor}55`}`,
          backgroundColor: "#FFFFFF", cursor: "pointer",
          boxShadow: open ? `0 0 0 3px ${accentColor}18` : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          userSelect: "none",
        }}
      >
        <CalendarDays size={14} color={open ? accentColor : `${accentColor}99`} style={{ flexShrink: 0, transition: "color 0.15s" }} />
        <span style={{ flex: 1, fontSize: "13px", fontFamily: "inherit", color: value ? "#1C1917" : "#9CA3AF" }}>
          {displayText || "Pick a date"}
        </span>
        {value && onClear && (
          <button
            onClick={e => { e.stopPropagation(); onClear(); }}
            style={{ width: 18, height: 18, borderRadius: "50%", border: "none", backgroundColor: "#D1D5DB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
          >
            <X size={10} color="#FFFFFF" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          backgroundColor: "#FFFFFF", borderRadius: "14px",
          border: "1px solid #E5E9EE",
          boxShadow: "0 8px 32px rgba(28,25,23,0.14)",
          width: 288, overflow: "hidden",
        }}>
          {mode === "cal" ? (
            <>
              {/* Month nav header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #F5F0EB" }}>
                <button
                  onClick={prevMonth}
                  style={{ width: 30, height: 30, borderRadius: "8px", border: "none", backgroundColor: "#F5F5F4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#EDE5D8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F5F4"; }}
                >
                  <ChevronLeft size={15} color="#6B7280" />
                </button>
                <button
                  onClick={() => setMode("year")}
                  style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: "7px", transition: "background-color 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFF7ED"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                >
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </button>
                <button
                  onClick={nextMonth}
                  style={{ width: 30, height: 30, borderRadius: "8px", border: "none", backgroundColor: "#F5F5F4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#EDE5D8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F5F4"; }}
                >
                  <ChevronRight size={15} color="#6B7280" />
                </button>
              </div>

              {/* Grid */}
              <div style={{ padding: "10px 12px 14px" }}>
                {/* Day-of-week headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" }}>
                  {DAY_HEADERS.map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#9CA3AF", padding: "3px 0" }}>{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                  {cells.map((cell, i) => {
                    const isSelected = cell.iso === value;
                    const isToday    = cell.iso === today;
                    return (
                      <button
                        key={i}
                        onClick={() => { if (!cell.disabled) { onChange(cell.iso); setOpen(false); } }}
                        disabled={cell.disabled}
                        style={{
                          width: "100%", aspectRatio: "1", borderRadius: "8px", border: "none",
                          backgroundColor: isSelected ? accentColor : "transparent",
                          color: isSelected ? "#FFFFFF"
                            : cell.disabled ? "#D1D5DB"
                            : !cell.inMonth ? "#C4B5A0"
                            : isToday ? accentColor
                            : "#1C1917",
                          fontSize: "12px", fontWeight: isSelected || isToday ? 700 : 400,
                          cursor: cell.disabled ? "default" : "pointer",
                          outline: isToday && !isSelected ? `2px solid ${accentColor}40` : "none",
                          outlineOffset: "-2px",
                          transition: "background-color 0.1s",
                        }}
                        onMouseEnter={e => { if (!cell.disabled && !isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accentColor}18`; }}
                        onMouseLeave={e => { if (!cell.disabled && !isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Year picker */
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <button
                  onClick={() => setMode("cal")}
                  style={{ width: 28, height: 28, borderRadius: "7px", border: "none", backgroundColor: "#F5F5F4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronLeft size={14} color="#6B7280" />
                </button>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Select Year</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", maxHeight: 200, overflowY: "auto" }}>
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => { setViewYear(y); setMode("cal"); }}
                    style={{
                      padding: "8px 4px", borderRadius: "8px", border: "none",
                      backgroundColor: y === viewYear ? accentColor : "#F5F5F4",
                      color: y === viewYear ? "#FFFFFF" : "#374151",
                      fontSize: "12px", fontWeight: y === viewYear ? 700 : 500,
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => { if (y !== viewYear) (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accentColor}18`; }}
                    onMouseLeave={e => { if (y !== viewYear) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F5F4"; }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
