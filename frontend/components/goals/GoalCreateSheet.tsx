"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import {
  X, Target, ChevronDown, ChevronUp,
  Plus, Trash2, Check, ArrowRight, ArrowLeft, Star, Link2, CheckSquare,
  Eye, Circle, Flame, AlertTriangle,
  Briefcase, Globe, DollarSign, Sparkles, BookOpen, Heart, Activity,
  type LucideIcon,
} from "lucide-react";
import type { LifeArea, GoalData, Milestone } from "./GoalCard";
import { AREA_META } from "./GoalCard";
import VisionBanner from "./VisionBanner";
import { useAppStore, visionTextForArea } from "@/lib/AppStore";
import type { TaskData, EisenhowerQ } from "@/components/tasks/TaskCard";
import { Q_META, daysUntil, toTaskDate } from "@/components/tasks/TaskCard";
import type { HabitData, HabitFrequency, HabitType } from "@/components/habits/HabitCard";
import { FREQ_LABEL, AREA_META as HABIT_AREA_META } from "@/components/habits/HabitCard";
import { todayDateStr, validateDate, validateGoalDate, maxGoalDateStr } from "@/lib/dateValidation";
import CalendarPicker from "@/components/ui/CalendarPicker";

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
  onSave: (goal: GoalData, tasks?: TaskData[], habits?: HabitData[], onCreated?: (created: GoalData) => void, onError?: () => void) => void;
  /** Update an already-persisted goal (used after the Step-1 save, and when editing). */
  onUpdate?: (goal: GoalData, tasks?: TaskData[], habits?: HabitData[]) => void;
  onDelete?: (id: string) => void;
  initialData?: GoalData;
}

export default function GoalCreateSheet({ open, onClose, onSave, onUpdate, onDelete, initialData }: Props) {
  const isEditing = !!initialData;
  const [step, setStep] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { visionAreas } = useAppStore();

  // Step 1 — area starts blank; it's a required choice (no silent default).
  const [area,     setArea]     = useState<LifeArea | "">("");
  const [title,    setTitle]    = useState("");
  const [why,      setWhy]      = useState("");
  const [metric,   setMetric]   = useState("");
  const [unit,     setUnit]     = useState("");
  const [deadline, setDeadline] = useState("");
  const [areaOpen, setAreaOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

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

  // ── Save tracking (so Step-1 "Milestones" saves the goal, and Step-2 updates
  //    the SAME goal instead of creating a duplicate) ──────────────────────────
  const clientIdRef        = useRef<string | null>(null);      // client id used at create time
  const [createdId, setCreatedId] = useState<string | null>(null); // real server id once saved
  const [creating,   setCreating] = useState(false);           // a create POST is in flight
  const persistedTasksRef  = useRef<Set<string>>(new Set());   // task/habit ids already sent
  const persistedHabitsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Reset save tracking whenever the sheet opens or closes.
    clientIdRef.current = null;
    persistedTasksRef.current = new Set();
    persistedHabitsRef.current = new Set();
    setCreatedId(null);
    setCreating(false);

    if (!open) {
      setStep(1);
      setConfirmDelete(false);
      setArea(""); setTitle(""); setWhy("");
      setMetric(""); setUnit(""); setDeadline(""); setAreaOpen(false);
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

  // Close the life-area dropdown on outside click.
  useEffect(() => {
    if (!areaOpen) return;
    const onDown = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setAreaOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [areaOpen]);

  const deadlineError  = validateGoalDate(deadline, { required: true });
  const mDeadlineError = deadline && mDeadline && mDeadline > deadline
    ? "Can't be after goal's target date" : null;

  // Theme falls back to neutral stone tokens until an area is chosen.
  const areaColor = area ? AREA_META[area].color : "#78716C";
  const areaBg    = area ? AREA_META[area].bg    : "#FAFAF9";
  const AreaIcon  = area ? AREA_ICONS[area]       : Target;
  const visionText = area ? visionTextForArea(visionAreas, area) : "";

  // Step 1 requires a title, life area, and valid target date before moving on or saving.
  const canProceed = !!title.trim() && !!area && !deadlineError;

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

  // A create POST is in flight and we don't yet have the real id back.
  const saving = creating && !createdId;

  const buildGoal = (id: string): GoalData => {
    const now = Date.now();
    return {
      id,
      statement:  title.trim(),
      outcome:    why.trim() || title.trim(),
      metric:     metric.trim(),
      metricUnit: unit.trim(),
      deadline,
      area:       area as LifeArea,
      progress:   initialData?.progress   ?? 0,
      lastMoved:  initialData?.lastMoved  ?? now,
      velocity:   initialData?.velocity   ?? 0,
      notes:      initialData?.notes      ?? [],
      milestones,
      createdAt:  initialData?.createdAt  ?? now,
    };
  };

  // Tasks/habits not yet sent to the server (so re-saving never duplicates them).
  const collectFresh = () => {
    const allTasks  = Object.values(msTasks).flat();
    const allHabits = Object.values(msHabits).flat();
    return {
      freshTasks:  allTasks.filter(t  => !persistedTasksRef.current.has(t.id)),
      freshHabits: allHabits.filter(h => !persistedHabitsRef.current.has(h.id)),
    };
  };

  /**
   * Single save path. First save (creating) POSTs a new goal and remembers its
   * real id; every save after that (Step-2 finish, top bar) updates the SAME
   * goal — so no duplicate is ever created.
   */
  const commit = ({ advance, close }: { advance?: boolean; close?: boolean }) => {
    if (!title.trim() || !area || deadlineError) return;
    if (saving) return; // create in flight — wait for the id before saving again

    const { freshTasks, freshHabits } = collectFresh();
    const targetId = isEditing ? initialData!.id : createdId;

    if (targetId) {
      // Goal already exists → update it and attach any new tasks/habits.
      const tasksArr  = freshTasks.map(t  => ({ ...t, linkedGoalId: targetId }));
      const habitsArr = freshHabits.map(h => ({ ...h, linkedGoalId: targetId }));
      onUpdate?.(buildGoal(targetId), tasksArr.length ? tasksArr : undefined, habitsArr.length ? habitsArr : undefined);
    } else {
      // First save → create the goal, remembering its real id when it comes back.
      if (!clientIdRef.current) clientIdRef.current = crypto.randomUUID();
      const cid = clientIdRef.current;
      setCreating(true);
      const tasksArr  = freshTasks.map(t  => ({ ...t, linkedGoalId: cid }));
      const habitsArr = freshHabits.map(h => ({ ...h, linkedGoalId: cid }));
      onSave(
        buildGoal(cid),
        tasksArr.length ? tasksArr : undefined,
        habitsArr.length ? habitsArr : undefined,
        (created) => setCreatedId(created.id),
        () => setCreating(false), // create failed → allow a retry
      );
    }

    freshTasks.forEach(t  => persistedTasksRef.current.add(t.id));
    freshHabits.forEach(h => persistedHabitsRef.current.add(h.id));

    if (advance) setStep(2);
    if (close)   onClose();
  };

  // Derived counts for sidebar stats
  const totalTasks  = Object.values(msTasks).reduce((s, a) => s + a.length, 0);
  const totalHabits = Object.values(msHabits).reduce((s, a) => s + a.length, 0);

  if (!open) return null;

  return createPortal(
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "#F9FAFB", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div className="px-5 sm:px-8" style={{ height: 52, borderBottom: "1px solid #E5E9EE", backgroundColor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "6px 0", color: "#1C1917", fontSize: "13px", fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Goals
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isEditing && initialData && onDelete && (
            <button onClick={() => setConfirmDelete(true)} style={{ padding: "8px 12px", borderRadius: "8px",
              border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#DC2626",
              fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
              <Trash2 size={13} /> Delete
            </button>
          )}
          <button
            onClick={() => commit({ close: true })}
            disabled={!canProceed || saving}
            style={{ padding: "9px 22px", borderRadius: "8px", border: "none",
              backgroundColor: canProceed && !saving ? "#F97316" : "#E8DDD0", fontSize: "13px", fontWeight: 700,
              color: canProceed && !saving ? "#FFFFFF" : "#A8A29E", cursor: canProceed && !saving ? "pointer" : "default",
              boxShadow: canProceed && !saving ? "0 2px 8px rgba(249,115,22,0.3)" : "none" }}
          >
            {saving ? "Saving…" : "Save goal"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left form panel */}
        <div className="px-5 sm:px-12" style={{ flex: 1, overflowY: "auto", paddingTop: "28px", paddingBottom: "48px" }}>

          {/* Page heading */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
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
            <div className="p-4 sm:p-7" style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E5E9EE" }}>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: "0 0 4px" }}>1. Goal Basics</p>
              <p style={{ fontSize: "13px", color: "#44403C", margin: "0 0 24px" }}>Start with the foundations of your goal.</p>

              {/* Vision anchor — the life area's vision that this goal serves */}
              {area && <VisionBanner area={area} text={visionText} style={{ marginBottom: "20px" }} />}

              {/* Life Area + Goal Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label style={labelStyle}>Life Area <span style={{ color: "#EF4444" }}>*</span></label>
                  <div ref={areaRef} style={{ position: "relative" }}>
                    {/* Trigger */}
                    <button
                      type="button"
                      onClick={() => setAreaOpen(o => !o)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "8px", border: `1.5px solid ${area ? `${areaColor}55` : "#E8DDD0"}`, backgroundColor: area ? areaBg : "#FFFFFF", cursor: "pointer", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: areaOpen ? `0 0 0 3px ${areaColor}20` : "none" }}
                    >
                      <span style={{ width: 12, height: 12, borderRadius: "50%", flexShrink: 0, backgroundColor: area ? areaColor : "transparent", border: area ? "none" : "2px solid #D6D3D1", boxShadow: area ? `0 0 0 3px ${areaColor}22` : "none" }} />
                      <span style={{ flex: 1, textAlign: "left", fontSize: "13px", fontWeight: 700, color: area ? areaColor : "#A8A29E" }}>
                        {area ? AREA_META[area].label : "Select a life area…"}
                      </span>
                      <ChevronDown size={14} color={area ? areaColor : "#A8A29E"} style={{ flexShrink: 0, transition: "transform 0.15s", transform: areaOpen ? "rotate(180deg)" : "none" }} />
                    </button>

                    {/* Options */}
                    {areaOpen && (
                      <div role="listbox" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30, backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E5E9EE", boxShadow: "0 12px 32px rgba(28,25,23,0.14)", padding: "6px", maxHeight: 300, overflowY: "auto" }}>
                        {AREAS.map(a => {
                          const m = AREA_META[a.value];
                          const selected = area === a.value;
                          return (
                            <button
                              key={a.value}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => { setArea(a.value); setAreaOpen(false); }}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "9px 10px", borderRadius: "8px", border: "none", backgroundColor: selected ? m.bg : "transparent", cursor: "pointer", textAlign: "left", transition: "background-color 0.12s" }}
                              onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = "#FAFAF9"; }}
                              onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                              <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: m.color, flexShrink: 0, boxShadow: selected ? `0 0 0 3px ${m.color}22` : "none" }} />
                              <span style={{ flex: 1, fontSize: "13px", fontWeight: selected ? 700 : 600, color: selected ? m.color : "#44403C" }}>{a.label}</span>
                              {selected && <Check size={14} color={m.color} strokeWidth={3} style={{ flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Goal Title <span style={{ color: "#EF4444" }}>*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={50}
                    placeholder="e.g. Build a profitable second income stream"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = areaColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${areaColor}20`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = `${areaColor}55`; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <p style={{ fontSize: "10px", fontWeight: 600, textAlign: "right", margin: "4px 2px 0",
                    color: title.length >= 50 ? "#DC2626" : "#A8A29E" }}>{title.length}/50</p>
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

              {/* Measure of success */}
              <div style={{ marginBottom: "16px" }}>
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

              {/* Unit + Target Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "16px", marginBottom: "32px" }}>
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
                    Target Date <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <CalendarPicker
                    value={deadline}
                    onChange={setDeadline}
                    onClear={() => setDeadline("")}
                    accentColor={areaColor}
                    max={maxGoalDateStr()}
                  />
                  {deadlineError && <p style={{ fontSize: "11px", color: "#DC2626", margin: "4px 0 0" }}>{deadlineError}</p>}
                </div>
              </div>

              {/* Save the goal and continue to the milestones step */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => commit({ advance: true })}
                  disabled={!canProceed || saving}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "13px", borderRadius: "10px", border: "none",
                    backgroundColor: canProceed && !saving ? "#F97316" : "#E8DDD0",
                    fontSize: "14px", fontWeight: 700,
                    color: canProceed && !saving ? "#FFFFFF" : "#A8A29E",
                    cursor: canProceed && !saving ? "pointer" : "default",
                    boxShadow: canProceed && !saving ? "0 2px 10px rgba(249,115,22,0.35)" : "none",
                  }}
                >
                  {saving ? "Saving…" : <>Milestones <ArrowRight size={16} /></>}
                </button>
                {!area && (
                  <p style={{ fontSize: "12px", color: "#A8A29E", margin: 0 }}>Select a life area and enter a goal title to continue.</p>
                )}
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
                              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ padding: "14px", gap: "12px" }}>

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
                                      onClick={e => { e.stopPropagation(); setHabitCreateMsId(m.id); setHcName(""); setHcDesc(""); setHcArea(area || "health"); setHcFrequency("daily"); setHcCustomDays([1,2,3,4,5]); setHcType("binary"); setHcTarget(1); setHcUnit(""); setHcCue(""); setHcReward(""); }}
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
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: mDeadlineError ? "4px" : "12px", paddingRight: 36 }}>
                            <input
                              type="text"
                              value={mTitle}
                              onChange={e => setMTitle(e.target.value)}
                              placeholder="Milestone title"
                              style={{ ...inputStyle, flex: "1 1 160px" }}
                              onFocus={e => { e.currentTarget.style.borderColor = areaColor; e.currentTarget.style.boxShadow = `0 0 0 3px ${areaColor}18`; }}
                              onBlur={e  => { e.currentTarget.style.borderColor = `${areaColor}55`; e.currentTarget.style.boxShadow = "none"; }}
                              onKeyDown={e => { if (e.key === "Enter") addMilestone(); }}
                              autoFocus
                            />
                            <div style={{ flex: "1 1 160px" }}>
                              <CalendarPicker value={mDeadline} onChange={setMDeadline} onClear={() => setMDeadline("")} accentColor={areaColor} max={deadline || maxGoalDateStr()} placement="center" />
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
              {!canProceed && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", backgroundColor: "#FFFBEB", border: "1.5px solid #FDE68A", marginBottom: "12px" }}>
                  <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#92400E", margin: 0 }}>
                    Go back to <button onClick={() => setStep(1)} style={{ background: "none", border: "none", padding: 0, fontWeight: 700, color: "#D97706", cursor: "pointer", fontSize: "13px" }}>Goal Basics</button> and enter a title, life area, and target date before saving.
                  </p>
                </div>
              )}
              <button
                onClick={() => commit({ close: true })}
                disabled={!canProceed || saving}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px", borderRadius: "10px", border: "none", backgroundColor: canProceed && !saving ? "#F97316" : "#E8DDD0", fontSize: "14px", fontWeight: 700, color: canProceed && !saving ? "#FFFFFF" : "#A8A29E", cursor: canProceed && !saving ? "pointer" : "default", boxShadow: canProceed && !saving ? "0 2px 10px rgba(249,115,22,0.35)" : "none" }}
              >
                {saving ? "Saving…" : <>{isEditing || createdId ? "Save Changes" : "Create Goal"} <ArrowRight size={16} /></>}
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
                {area ? AREA_META[area].label : "Life area"}
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

    {confirmDelete && initialData && onDelete && (
      <>
        <div onClick={() => setConfirmDelete(false)} style={{ position: "fixed", inset: 0,
          zIndex: 250, backgroundColor: "rgba(28,25,23,0.55)" }} />
        <div role="dialog" aria-modal="true" aria-labelledby="delete-goal-title" style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 251, width: "calc(100% - 32px)", maxWidth: "380px", backgroundColor: "#FFFFFF",
          borderRadius: "16px", padding: "22px", boxShadow: "0 24px 80px rgba(0,0,0,0.24)" }}>
          <div style={{ width: 38, height: 38, borderRadius: "10px", backgroundColor: "#FEF2F2",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
            <AlertTriangle size={19} color="#DC2626" />
          </div>
          <h3 id="delete-goal-title" style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 800, color: "#1C1917" }}>
            Delete goal?
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: "13px", lineHeight: 1.55, color: "#57534E" }}>
            Are you sure you want to delete &ldquo;{initialData.statement}&rdquo;? Once done, this cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: "8px 16px", borderRadius: "8px",
              border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF", color: "#57534E",
              fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => { onDelete(initialData.id); setConfirmDelete(false); onClose(); }} style={{
              padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "#DC2626",
              color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Delete goal</button>
          </div>
        </div>
      </>
    )}

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
              <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: "8px", border: "none", backgroundColor: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#FFFFFF" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelSt}>Title *</label>
                <input autoFocus value={tcForm.title} maxLength={50} onChange={e => setTcForm(p => ({ ...p, title: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleTaskSave(); }} placeholder="What needs to be done?" style={inputSt} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
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
                <CalendarPicker value={tcForm.deadline} onChange={v => { if (tcForm.quadrant !== "Q1") setTcForm(p => ({ ...p, deadline: v })); }} accentColor={areaColor} disabled={tcForm.quadrant === "Q1"} placement="up" />
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
              <button onClick={closeHabitModal} style={{ width: 32, height: 32, borderRadius: "8px", border: "none", backgroundColor: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#FFFFFF" />
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
                <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", marginBottom: "10px" }}>Habit Loop (optional)</p>
                <div style={{ marginBottom: "10px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>Cue — what triggers this habit?</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>After I</span>
                    <input value={hcCue} onChange={e => setHcCue(e.target.value)} placeholder="wake up / finish lunch…" style={{ ...inSt, flex: 1 }} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>Reward — how will you celebrate?</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>I will</span>
                    <input value={hcReward} onChange={e => setHcReward(e.target.value)} placeholder="enjoy a coffee / feel proud…" style={{ ...inSt, flex: 1 }} onFocus={e => { e.currentTarget.style.borderColor = areaColor; }} onBlur={e => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid #EDE5D8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button onClick={closeHabitModal} style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleHabitSave} disabled={!canSave} style={{ flex: 2, padding: "11px", borderRadius: "10px", border: "none", background: canSave ? areaColor : "#E8DDD0", fontSize: "13px", fontWeight: 700, color: canSave ? "#FFFFFF" : "#A8A29E", cursor: canSave ? "pointer" : "default", boxShadow: canSave ? `0 2px 8px ${areaColor}50` : "none" }}>Add Habit</button>
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
