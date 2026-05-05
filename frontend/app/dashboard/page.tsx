"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Zap, CheckSquare, Flame, TrendingUp, Target as TargetIcon,
  Info, ChevronLeft, ChevronRight, CalendarRange, Sparkles, Lock,
  ArrowRight, AlertTriangle, Image as ImageIcon, Plus, Check,
  Heart, Clock, ListChecks,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { toTaskDate, Q_META } from "@/components/tasks/TaskCard";
import TaskCreateSheet from "@/components/tasks/TaskCreateSheet";
import { isScheduledDay, isHabitDoneOnDate, calcStreak } from "@/components/habits/HabitCard";
import { AREA_META as GOAL_AREA_META } from "@/components/goals/GoalCard";
import { toDriveImgUrl } from "@/components/bucket/BucketEntrySheet";
import { api } from "@/lib/api";
import type { AreaData } from "@/components/vision/PolaroidCard";
import type { HabitData } from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { GoalData } from "@/components/goals/GoalCard";
import type { EveningReflection, DayPlan } from "@/lib/dayTypes";
import type { WeekPlan } from "@/lib/weeklyTypes";

// ── Date helpers ──────────────────────────────────────────────────────────────
function getWeekStart(date: Date = new Date()): string {
  const d   = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toTaskDate(d);
}
function fmtToday(today: string): string {
  return new Date(today + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

// ── KPI computations (logic preserved from previous dashboard) ────────────────
function computeMomentumScore(habits: HabitData[], tasks: TaskData[], weekStart: string): number {
  const weekEnd = addDays(weekStart, 7);
  let hTotal = 0, hDone = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    const ds  = toTaskDate(d);
    const dow = d.getDay();
    for (const h of habits) {
      if (!isScheduledDay(h.frequency, h.customDays, dow)) continue;
      hTotal++;
      if (isHabitDoneOnDate(h, ds)) hDone++;
    }
  }
  const habitRate = hTotal === 0 ? 100 : (hDone / hTotal) * 100;
  const weekTasks = tasks.filter((t) => t.deadline >= weekStart && t.deadline < weekEnd);
  const taskRate  = weekTasks.length === 0 ? 100 : (weekTasks.filter((t) => t.status !== "open").length / weekTasks.length) * 100;
  return Math.round(habitRate * 0.6 + taskRate * 0.4);
}
function computeDailyProgress(habits: HabitData[], tasks: TaskData[], today: string) {
  const dow         = new Date(today + "T00:00:00").getDay();
  const todayHabits = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, dow));
  const habitsDone  = todayHabits.filter((h) => isHabitDoneOnDate(h, today)).length;
  const todayTasks  = tasks.filter((t) => t.deadline === today);
  const tasksDone   = todayTasks.filter((t) => t.status !== "open").length;
  return { done: habitsDone + tasksDone, total: todayHabits.length + todayTasks.length };
}
function computeMaxStreak(habits: HabitData[]): { name: string; streak: number } {
  let best = { name: "—", streak: 0 };
  for (const h of habits) {
    const s = calcStreak(h);
    if (s > best.streak) best = { name: h.name, streak: s };
  }
  return best;
}
function computeEnergyTrend(reflections: EveningReflection[], today: string): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const ds = addDays(today, -(6 - i));
    return reflections.find((r) => r.date === ds)?.energyLevel ?? 0;
  });
}
const GOAL_STALE_DAYS = 14;
function isGoalStale(g: GoalData): boolean {
  return Math.floor((Date.now() - g.lastMoved) / 86_400_000) >= GOAL_STALE_DAYS;
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const cardBase: React.CSSProperties = {
  backgroundColor: "#FFFCF7",
  borderRadius: 14,
  border: "1.5px solid #EDE5D8",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, textTransform: "uppercase",
  letterSpacing: "0.09em", color: "#57534E", margin: 0,
};
const linkLook: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 2,
  fontSize: 10, color: "#EA580C", fontWeight: 700, textDecoration: "none",
};

// ── KPI Tile (with info popover) ──────────────────────────────────────────────
function KpiTile({ icon, label, infoText, children }: {
  icon: React.ReactNode; label: string; infoText: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return; // button toggles via its own onClick
      if (popRef.current?.contains(t)) return; // clicks inside popover stay open
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div style={{ ...cardBase, padding: 12, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {icon}
          <p style={{
            fontSize: 10, fontWeight: 800, color: "#57534E",
            textTransform: "uppercase", letterSpacing: "0.08em", margin: 0,
          }}>{label}</p>
        </div>
        <button
          ref={btnRef}
          onClick={() => setOpen(o => !o)}
          aria-label="How is this calculated?"
          style={{
            width: 18, height: 18, borderRadius: "50%",
            border: "1px solid #E8DDD0", backgroundColor: open ? "#FFF7ED" : "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, flexShrink: 0,
          }}
        >
          <Info size={10} color={open ? "#EA580C" : "#57534E"} />
        </button>
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
      {open && (
        <>
          {/* arrow pointing left toward the i button */}
          <div style={{
            position: "absolute", top: 16, left: "calc(100% + 3px)", zIndex: 41,
            width: 0, height: 0,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderRight: "5px solid #1C1917",
          }} />
          <div ref={popRef} style={{
            position: "absolute", top: 8, left: "calc(100% + 8px)", zIndex: 40,
            backgroundColor: "#1C1917", color: "#F5F5F4",
            padding: "10px 12px", borderRadius: 10,
            fontSize: 11, lineHeight: 1.5, fontWeight: 500,
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            maxWidth: 240, minWidth: 180,
          }}>
            {infoText}
          </div>
        </>
      )}
    </div>
  );
}

// ── Circle Gauge (compact) ────────────────────────────────────────────────────
function CircleGauge({ score, size = 64 }: { score: number; size?: number }) {
  const r      = size / 2 - 6;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color  = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  const c      = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#F0EBE3" strokeWidth={5} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={c} y={c - 1} textAnchor="middle" fontSize={size * 0.26} fontWeight={800} fill={color}>
        {score}
      </text>
      <text x={c} y={c + size * 0.18} textAnchor="middle" fontSize={size * 0.12} fontWeight={600} fill="#57534E">
        / 100
      </text>
    </svg>
  );
}
function EnergyBars({ values }: { values: number[] }) {
  const maxH = 26, bW = 7, gap = 3;
  return (
    <svg width={values.length * (bW + gap) - gap} height={maxH}>
      {values.map((v, i) => {
        const h   = v === 0 ? 3 : Math.max(4, (v / 10) * maxH);
        const col = v === 0 ? "#E8DDD0" : v >= 7 ? "#10B981" : v >= 5 ? "#F59E0B" : "#EF4444";
        return <rect key={i} x={i * (bW + gap)} y={maxH - h} width={bW} height={h} rx={2} fill={col}
          style={{ transition: "height 0.6s ease, y 0.6s ease" }} />;
      })}
    </svg>
  );
}

function navBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    width: 28, height: 28, borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0, zIndex: 3,
    backdropFilter: "blur(4px)",
  };
}

// ── Image rotator (auto-scrolling, cross-fade) ────────────────────────────────
function ImageRotator({ items, kind, intervalMs = 6000, emptyHref, emptyLabel }: {
  items:      { imageUrl: string; caption: string }[];
  kind:       "Vision" | "Dream";
  intervalMs?: number;
  emptyHref:  string;
  emptyLabel: string;
}) {
  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % items.length), intervalMs);
    return () => window.clearInterval(t);
  }, [paused, items.length, intervalMs]);

  // Reset index if items list shrinks
  useEffect(() => {
    if (idx >= items.length) setIdx(0);
  }, [items.length, idx]);

  if (items.length === 0) {
    return (
      <Link href={emptyHref} style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, height: "100%", borderRadius: 12,
        backgroundColor: "#F5F0EB", border: "1.5px dashed #D8CDB8",
        textDecoration: "none", color: "#57534E",
      }}>
        <ImageIcon size={20} color="#78716C" />
        <p style={{ fontSize: 11, fontWeight: 600, color: "#57534E", margin: 0 }}>{emptyLabel}</p>
      </Link>
    );
  }

  const current = items[Math.min(idx, items.length - 1)];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative", overflow: "hidden",
        borderRadius: 12, height: "100%",
        backgroundColor: "#1C1917",
      }}
    >
      {items.map((it, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${i}-${it.imageUrl}`}
          src={toDriveImgUrl(it.imageUrl)}
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: i === idx ? 1 : 0,
            transform: i === idx ? "scale(1.04)" : "scale(1.0)",
            transition: "opacity 1.2s ease, transform 6.5s ease",
            display: "block",
          }}
        />
      ))}
      {/* Top gradient for the progress dots */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0,
        height: "32%",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))",
        pointerEvents: "none",
      }} />
      {/* Bottom gradient for caption legibility */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: "55%",
        background: "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))",
        pointerEvents: "none",
      }} />
      {/* Caption */}
      <div style={{
        position: "absolute", left: 12, right: 12, bottom: 10,
        zIndex: 2, color: "#FFFFFF",
      }}>
        <p style={{
          fontSize: 9, fontWeight: 700, color: "#FCD9B6",
          textTransform: "uppercase", letterSpacing: "0.08em", margin: 0,
        }}>
          {kind} · {items.length} {items.length === 1 ? "item" : "items"}
        </p>
        <p style={{
          fontSize: 13, fontWeight: 700, color: "#FFFFFF", margin: "2px 0 0",
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {current.caption}
        </p>
      </div>
      {/* Progress dots — click to jump */}
      {items.length > 1 && (
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 3,
          display: "flex", gap: 4,
        }}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to ${kind.toLowerCase()} ${i + 1}`}
              style={{
                width: i === idx ? 16 : 7, height: 7, borderRadius: 4,
                border: "none", padding: 0, cursor: "pointer",
                backgroundColor: i === idx ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                transition: "width 0.3s, background-color 0.3s",
              }}
            />
          ))}
        </div>
      )}
      {/* Prev / Next nav arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}
            aria-label={`Previous ${kind.toLowerCase()}`}
            style={navBtnStyle("left")}
          >
            <ChevronLeft size={15} color="#FFFFFF" />
          </button>
          <button
            onClick={() => setIdx(i => (i + 1) % items.length)}
            aria-label={`Next ${kind.toLowerCase()}`}
            style={navBtnStyle("right")}
          >
            <ChevronRight size={15} color="#FFFFFF" />
          </button>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const {
    goals, tasks, habits,
    weekEvents, weekPlans, dayPlans, eventGroups,
    eveningReflections, bucketEntries,
    toggleHabitDay, closeTask, reopenTask, updateGoal, addTask, upsertWeekPlan,
  } = useAppStore();

  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const goalsCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expandedGoalId) return;
    function onDoc(e: MouseEvent) {
      if (goalsCardRef.current && !goalsCardRef.current.contains(e.target as Node)) {
        setExpandedGoalId(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [expandedGoalId]);

  // ── Core Values (read from localStorage written by /values page) ──
  const [coreValues, setCoreValues] = useState<{ area: string; value: string }[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lbd_values_v1");
      if (raw) {
        const d = JSON.parse(raw) as { selected?: { area: string; value: string }[] };
        setCoreValues(d.selected ?? []);
      }
    } catch {}
  }, []);

  // ── Top-row column-height sync: middle & right columns mirror Numbers' height ─
  // (only on desktop ≥ 1024px; on mobile cards stack and grow naturally)
  const numbersRef = useRef<HTMLDivElement>(null);
  const [numHeight, setNumHeight] = useState<number | null>(null);
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = (m: { matches: boolean }) => setIsLg(m.matches);
    apply(mq);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    if (!numbersRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      if (h > 0) setNumHeight(h);
    });
    ro.observe(numbersRef.current);
    return () => ro.disconnect();
  }, []);
  const colHeightStyle: React.CSSProperties = isLg && numHeight
    ? { height: numHeight }
    : {};

  const today     = toTaskDate();
  const weekStart = getWeekStart();
  const todayDow  = new Date(today + "T00:00:00").getDay();

  // ── KPIs ──
  const momentum     = useMemo(() => computeMomentumScore(habits, tasks, weekStart), [habits, tasks, weekStart]);
  const progress     = useMemo(() => computeDailyProgress(habits, tasks, today),     [habits, tasks, today]);
  const bestStreak   = useMemo(() => computeMaxStreak(habits),                       [habits]);
  const energy       = useMemo(() => computeEnergyTrend(eveningReflections, today),  [eveningReflections, today]);
  const avgEnergy    = useMemo(() => {
    const nz = energy.filter(v => v > 0);
    return nz.length === 0 ? 0 : nz.reduce((s, v) => s + v, 0) / nz.length;
  }, [energy]);
  const goalsAtRisk  = useMemo(() => goals.filter(isGoalStale).length, [goals]);
  const goalsOnTrack = goals.length - goalsAtRisk;

  const progressPct  = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
  const progressColor = progressPct === 100 ? "#16A34A" : progressPct >= 50 ? "#F59E0B" : "#EA580C";
  const energyColor   = avgEnergy >= 7 ? "#10B981" : avgEnergy >= 5 ? "#F59E0B" : avgEnergy > 0 ? "#EF4444" : "#78716C";

  // ── North Star (legacy) ──
  const [northStar, setNorthStar] = useState<{ purposeText: string; isSealed: boolean }>({ purposeText: "", isSealed: false });
  useEffect(() => {
    api.get<{ purposeText: string; isSealed: boolean }>("/legacy")
      .then(d => setNorthStar({ purposeText: d.purposeText ?? "", isSealed: d.isSealed ?? false }))
      .catch(() => {});
  }, []);

  // ── Vision / Dream image rotator data ──
  const [visionAreas, setVisionAreas] = useState<AreaData[]>([]);
  useEffect(() => {
    api.get<{ areas: AreaData[] }>("/vision")
      .then(d => setVisionAreas(d.areas ?? []))
      .catch(() => {});
  }, []);
  const visionItems = useMemo(() =>
    visionAreas.filter(a => a.imageUrl).map(a => ({ imageUrl: a.imageUrl, caption: a.name })),
    [visionAreas]
  );
  const dreamItems = useMemo(() =>
    bucketEntries.filter(e => e.imageUrl && e.status !== "achieved")
      .map(e => ({ imageUrl: e.imageUrl, caption: e.title })),
    [bucketEntries]
  );

  // ── Tasks panel data ──
  const overdueTasks = useMemo(() =>
    tasks.filter(t => t.status === "open" && t.deadline < today).length,
    [tasks, today]
  );
  const todayTasksOpen = useMemo(() =>
    tasks.filter(t => t.status === "open" && t.deadline === today),
    [tasks, today]
  );
  const upcomingTasks = useMemo(() =>
    tasks.filter(t => {
      if (t.status !== "open" || t.deadline <= today) return false;
      const days = Math.ceil((new Date(t.deadline + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000);
      return days <= 7;
    }),
    [tasks, today]
  );

  // ── Habits panel data ──
  const todayHabits = useMemo(() =>
    habits.filter(h => isScheduledDay(h.frequency, h.customDays, todayDow)),
    [habits, todayDow]
  );
  const habitsDone = todayHabits.filter(h => isHabitDoneOnDate(h, today)).length;

  // Stat-tile data
  const activeHabits   = habits.length;
  const topHabitStreak = useMemo(() => Math.max(0, ...habits.map(calcStreak)), [habits]);
  const onStreakCount  = useMemo(() => habits.filter(h => calcStreak(h) > 0).length, [habits]);
  // "At risk": habits currently on a streak, scheduled today, not yet completed today.
  // Their streak will break if today's slot isn't filled.
  const atRiskCount = useMemo(() => habits.filter(h => {
    if (calcStreak(h) === 0) return false;
    if (!isScheduledDay(h.frequency, h.customDays, todayDow)) return false;
    return !isHabitDoneOnDate(h, today);
  }).length, [habits, today, todayDow]);

  // ── Goals (full list, sorted by closest deadline) ──
  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [goals]
  );

  // ── Tasks filter ──
  const [taskFilter, setTaskFilter] = useState<"overdue" | "today" | "week" | "all">("today");
  const filteredTasks = useMemo(() => {
    let list: TaskData[];
    if (taskFilter === "overdue")     list = tasks.filter(t => t.status === "open" && t.deadline < today);
    else if (taskFilter === "today")  list = tasks.filter(t => t.status === "open" && t.deadline === today);
    else if (taskFilter === "week")   list = upcomingTasks;
    else                              list = [...tasks];
    // Open first, then done; within each bucket sort by deadline asc
    // (most overdue rises to top; soonest upcoming next).
    return list.sort((a, b) => {
      const aOpen = a.status === "open" ? 0 : 1;
      const bOpen = b.status === "open" ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return a.deadline.localeCompare(b.deadline);
    });
  }, [tasks, taskFilter, today, upcomingTasks]);

  // ── Plan (week only) ──
  const weekPlan = weekPlans.find(p => p.weekStart === weekStart) ?? null;
  const agendaEvents = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return days.map(date => ({
      date,
      events: weekEvents.filter(e => e.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  }, [weekEvents, weekStart]);

  function toggleOutcome(text: string) {
    const current = weekPlans.find((p) => p.weekStart === weekStart);
    const base    = current ?? {
      weekStart, priorities: [], outcomes: [], doneOutcomes: [],
      dayNotes: {} as Record<string, string>, dayThemes: {} as Record<string, string>,
    };
    const isDone   = base.doneOutcomes.includes(text);
    const nextDone = isDone
      ? base.doneOutcomes.filter((t) => t !== text)
      : [...base.doneOutcomes, text];
    upsertWeekPlan({ ...base, doneOutcomes: nextDone });
  }

  // ── Tasks card (rendered in the top-right column, below North Star) ─────
  const tasksCard = (
    <div style={{
      ...cardBase, padding: 0,
      display: "flex", flexDirection: "column",
      flex: 1, minHeight: 0,
      background: "linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 70px)",
      borderColor: "#C7D2FE",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px 8px", borderBottom: "1px solid #E0E7FF",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckSquare size={13} color="#4F46E5" />
          <p style={sectionLabel}>Task Tracker</p>
          <button
            onClick={() => setTaskCreateOpen(true)}
            title="New task"
            style={{
              width: 20, height: 20, borderRadius: 6, padding: 0, cursor: "pointer",
              border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(249,115,22,0.35)",
            }}
          >
            <Plus size={12} color="#FFFFFF" strokeWidth={3} />
          </button>
        </div>
        <Link href="/tasks" style={linkLook}>Open <ChevronRight size={11} /></Link>
      </div>

      {/* 4 mini stat tiles in one line — clickable filter */}
      <div style={{
        padding: "8px 10px 6px",
        display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 5,
      }}>
        <FilterTile label="Overdue" value={overdueTasks}
          color="#DC2626" bg="#FEF2F2"
          active={taskFilter === "overdue"} onClick={() => setTaskFilter("overdue")} />
        <FilterTile label="Today" value={todayTasksOpen.length}
          color="#EA580C" bg="#FFF7ED"
          active={taskFilter === "today"} onClick={() => setTaskFilter("today")} />
        <FilterTile label="Week" value={upcomingTasks.length}
          color="#7C3AED" bg="#F5F0FF"
          active={taskFilter === "week"} onClick={() => setTaskFilter("week")} />
        <FilterTile label="Total" value={tasks.length}
          color="#0F766E" bg="#F0FDFA"
          active={taskFilter === "all"} onClick={() => setTaskFilter("all")} />
      </div>

      {/* Filtered task list — scrollable */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "4px 10px 10px",
        display: "flex", flexDirection: "column", gap: 5,
      }}>
        {filteredTasks.length === 0 ? (
          <EmptyHint
            icon={<CheckSquare size={14} color="#78716C" />}
            text={
              taskFilter === "overdue" ? "Nothing overdue 🎉" :
              taskFilter === "today"   ? "Nothing due today" :
              taskFilter === "week"    ? "Nothing due this week" :
              "No tasks yet"
            }
          />
        ) : filteredTasks.map((t) => {
          const m         = Q_META[t.quadrant];
          const done      = t.status !== "open";
          const overdue   = !done && t.deadline < today;
          const dueToday  = !done && t.deadline === today;
          const delegated = !done && !overdue && !dueToday && t.quadrant === "Q3";
          const daysDelta = !done
            ? Math.ceil((new Date(t.deadline + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000)
            : 0;

          let bg: string, borderCol: string, titleCol: string, checkCol: string;
          let badge: { text: string; bg: string; color: string; bold?: boolean } | null = null;

          if (done) {
            bg = "#F0FDF4"; borderCol = "#86EFAC"; titleCol = "#15803D"; checkCol = "#16A34A";
            badge = { text: "Done", bg: "#16A34A", color: "#FFFFFF" };
          } else if (overdue) {
            bg = "#FEF2F2"; borderCol = "#FCA5A5"; titleCol = "#B91C1C"; checkCol = "#DC2626";
            badge = { text: `${-daysDelta}d late`, bg: "#DC2626", color: "#FFFFFF", bold: true };
          } else if (dueToday) {
            bg = "#FEF2F2"; borderCol = "#FCA5A5"; titleCol = "#B91C1C"; checkCol = "#DC2626";
            badge = { text: "Today", bg: "#DC2626", color: "#FFFFFF", bold: true };
          } else if (delegated) {
            bg = "#FEFCE8"; borderCol = "#FDE68A"; titleCol = "#A16207"; checkCol = "#CA8A04";
            badge = { text: `${daysDelta}d`, bg: "#CA8A04", color: "#FFFFFF" };
          } else {
            bg = m.bg; borderCol = m.color + "25"; titleCol = m.color; checkCol = m.color;
            badge = { text: `${daysDelta}d`, bg: m.color, color: "#FFFFFF" };
          }

          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "6px 9px", borderRadius: 8,
              backgroundColor: bg,
              border: `1px solid ${borderCol}`,
            }}>
              <button
                onClick={() => done ? reopenTask(t.id) : closeTask(t.id, "complete")}
                title={done ? "Reopen task" : "Mark complete"}
                style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, padding: 0,
                  border: done ? "none" : `2px solid ${checkCol}`,
                  backgroundColor: done ? "#16A34A" : "#FFFFFF",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {done && <Check size={9} color="#FFFFFF" strokeWidth={3} />}
              </button>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600,
                color: titleCol,
                textDecoration: done ? "line-through" : "none",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {t.title}
              </span>
              {badge && (
                <span style={{
                  flexShrink: 0,
                  fontSize: 9, fontWeight: badge.bold ? 800 : 700,
                  color: badge.color, backgroundColor: badge.bg,
                  padding: "2px 7px", borderRadius: 10,
                  letterSpacing: "0.02em",
                }}>
                  {badge.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="px-page" style={{
        paddingTop: 18, paddingBottom: 14, borderBottom: "1px solid #EDE5D8",
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#EA580C", marginBottom: 3,
        }}>Dashboard</p>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: "#1C1917", margin: 0 }}>
          {fmtToday(today)}
        </h1>
      </div>

      {/* ── Body grid ─────────────────────────────────────────────────── */}
      <div className="px-page-md" style={{ paddingTop: 14, paddingBottom: 22,
        display: "flex", flexDirection: "column", gap: 14 }}>

        {/* TOP ROW: Numbers | Vision+Goals | NorthStar+Tasks */}
        <div
          className="grid gap-4 lg:[grid-template-columns:230px_minmax(0,1fr)_290px] lg:items-start"
        >
            {/* ── NUMBERS (left) ── */}
            <div ref={numbersRef} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <KpiTile
                icon={<Zap size={12} color="#F97316" />}
                label="Momentum"
                infoText="7-day rolling score: 60% × habit completion rate (scheduled days only) + 40% × week-task completion. 80+ = Strong, 60–79 = Building, <60 = Needs focus."
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CircleGauge score={momentum} size={64} />
                  <div>
                    <p style={{
                      fontSize: 11, fontWeight: 800, margin: 0,
                      color: momentum >= 80 ? "#10B981" : momentum >= 60 ? "#D97706" : "#DC2626",
                    }}>
                      {momentum >= 80 ? "Strong" : momentum >= 60 ? "Building" : "Needs focus"}
                    </p>
                    <p style={{ fontSize: 10, color: "#57534E", margin: "3px 0 0", fontWeight: 500 }}>
                      Habits + Tasks
                    </p>
                  </div>
                </div>
              </KpiTile>

              <KpiTile
                icon={<CheckSquare size={12} color="#6366F1" />}
                label="Today"
                infoText="Items done today (habits scheduled today + tasks due today) divided by total. Counts both habit completions and task closures."
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: progressColor, letterSpacing: "-0.02em" }}>
                    {progress.done}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#57534E" }}>
                    / {progress.total}
                  </span>
                </div>
                <div style={{ width: "100%", height: 6, backgroundColor: "#F0EBE3", borderRadius: 3, marginTop: 6 }}>
                  <div style={{
                    width: `${progressPct}%`, height: "100%", borderRadius: 3,
                    backgroundColor: progressColor, transition: "width 0.6s ease",
                  }} />
                </div>
                <p style={{ fontSize: 10, color: "#57534E", margin: "5px 0 0", fontWeight: 500 }}>
                  {progressPct}% of today&apos;s items
                </p>
              </KpiTile>

              <KpiTile
                icon={<Flame size={12} color="#F97316" />}
                label="Top Streak"
                infoText="The longest current streak across all your habits. Streak = consecutive scheduled days the habit has been completed up to today (skips off-schedule days)."
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#F97316", letterSpacing: "-0.02em" }}>
                    {bestStreak.streak}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#57534E" }}>days</span>
                </div>
                <p style={{
                  fontSize: 11, color: "#44403C", fontWeight: 600, margin: "5px 0 0",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {bestStreak.name}
                </p>
              </KpiTile>

              <KpiTile
                icon={<TrendingUp size={12} color="#10B981" />}
                label="Energy · 7d"
                infoText="Average energy level (1–10) from your last 7 evening reflections. Days without a reflection are excluded from the average and shown as gaps."
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: energyColor, letterSpacing: "-0.02em" }}>
                    {avgEnergy > 0 ? avgEnergy.toFixed(1) : "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "#57534E", fontWeight: 600 }}>/ 10</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <EnergyBars values={energy} />
                </div>
              </KpiTile>

              <KpiTile
                icon={<TargetIcon size={12} color="#7C3AED" />}
                label="Goals"
                infoText="Goals on track (no stall) vs total. A goal is 'at risk' if its progress hasn't moved in the last 14 days."
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#7C3AED", letterSpacing: "-0.02em" }}>
                    {goalsOnTrack}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#57534E" }}>/ {goals.length}</span>
                </div>
                <p style={{
                  fontSize: 11, color: goalsAtRisk > 0 ? "#DC2626" : "#16A34A",
                  fontWeight: 700, margin: "5px 0 0",
                }}>
                  {goalsAtRisk > 0 ? `${goalsAtRisk} at risk` : "All moving forward"}
                </p>
              </KpiTile>
            </div>

            {/* ── VISION + GOAL TRACKER (middle) ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0, ...colHeightStyle }}>

              {/* Vision panel: vision strip + dreams strip */}
              <div style={{
                ...cardBase, padding: 12, flexShrink: 0,
                display: "flex", flexDirection: "column", gap: 10,
                background: "linear-gradient(135deg, #FFFCF7, #FFF7ED)",
                borderColor: "#F4D9B6",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={13} color="#EA580C" />
                    <p style={sectionLabel}>Vision &amp; Dreams</p>
                  </div>
                  <Link href="/vision" style={linkLook}>Open Vision <ChevronRight size={11} /></Link>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2"
                  style={{ height: 200 }}>
                  <ImageRotator
                    items={visionItems}
                    kind="Vision"
                    emptyHref="/vision"
                    emptyLabel="Add a Vision photo →"
                  />
                  <ImageRotator
                    items={dreamItems}
                    kind="Dream"
                    emptyHref="/bucket-list"
                    emptyLabel="Add a Dream →"
                  />
                </div>
              </div>

              {/* Goal Tracker */}
              <div ref={goalsCardRef} style={{
                ...cardBase, padding: 0,
                display: "flex", flexDirection: "column",
                flex: 1, minHeight: 0,
                background: "linear-gradient(180deg, #FFFCF7 0%, #FFFFFF 80px)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px 8px", borderBottom: "1px solid #F0EBE3",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <TargetIcon size={13} color="#7C3AED" />
                    <p style={sectionLabel}>Goal Tracker</p>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "#7C3AED",
                      backgroundColor: "#F5F0FF", padding: "1px 7px", borderRadius: 10,
                      border: "1px solid #DDD6FE",
                    }}>
                      {goals.length}
                    </span>
                  </div>
                  <Link href="/goals" style={linkLook}>Open Goals <ChevronRight size={11} /></Link>
                </div>
                <div style={{
                  flex: 1, minHeight: 0, overflowY: "auto",
                  padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7,
                }}>
                  {sortedGoals.length === 0 ? (
                    <EmptyHint icon={<TargetIcon size={16} color="#78716C" />} text="No goals yet — add one to start tracking">
                      <Link href="/goals" style={{ ...linkLook, marginTop: 6 }}>Go to Goals</Link>
                    </EmptyHint>
                  ) : (
                    sortedGoals.map((g) => (
                      <GoalRow
                        key={g.id}
                        goal={g}
                        today={today}
                        onUpdate={updateGoal}
                        expanded={expandedGoalId === g.id}
                        onToggleExpand={() =>
                          setExpandedGoalId((cur) => (cur === g.id ? null : g.id))
                        }
                        linkedHabits={habits.filter((h) => h.linkedGoalId === g.id)}
                        linkedTasks={tasks.filter((t) => t.linkedGoalId === g.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── NORTH STAR + CORE VALUES + TASKS (right) ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, ...colHeightStyle }}>
              <NorthStarCard data={northStar} />
              <CoreValuesCard values={coreValues} />
              {tasksCard}
            </div>
        </div>

        {/* BOTTOM ROW: Weekly Plan | Habits */}
        <div className="grid gap-4 lg:[grid-template-columns:minmax(0,1fr)_290px] lg:h-[440px]">

          {/* ── WEEKLY PLAN: Key Outcomes (top, scroll) + Agenda mini ── */}
          <div style={{
            ...cardBase, padding: 0,
            display: "flex", flexDirection: "column", minHeight: 0,
            background: "linear-gradient(180deg, #F0FDFA 0%, #FFFFFF 60px)",
            borderColor: "#A7F3D0",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px 8px", borderBottom: "1px solid #DCFCE7",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarRange size={13} color="#0D9488" />
                <p style={sectionLabel}>This Week</p>
              </div>
              <Link href="/weekly" style={linkLook}>Open Weekly <ChevronRight size={11} /></Link>
            </div>

            <WeekPlanContent plan={weekPlan} weekStart={weekStart} agenda={agendaEvents} eventGroups={eventGroups} onToggleOutcome={toggleOutcome} />
          </div>

          {/* ── HABIT TRACKER ── */}
          <div style={{
            ...cardBase, padding: 0,
            display: "flex", flexDirection: "column", minHeight: 0,
            background: "linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 80px)",
            borderColor: "#FED7AA",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px 8px", borderBottom: "1px solid #FFEDD5", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Flame size={13} color="#EA580C" />
                <p style={sectionLabel}>Habit Tracker</p>
              </div>
              <Link href="/habits" style={linkLook}>Open <ChevronRight size={11} /></Link>
            </div>

            {/* 4 stat tiles */}
            <div style={{
              padding: "8px 10px 6px", flexShrink: 0,
              display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 5,
            }}>
              <HabitStat label="Active" value={String(activeHabits)} unit="" color="#1C1917" bg="#FFF7ED" />
              <HabitStat label="Top streak" value={String(topHabitStreak)} unit={topHabitStreak === 1 ? "day" : "days"} color="#EA580C" bg="#FFF7ED" />
              <HabitStat label="On streak" value={String(onStreakCount)} unit="" color="#16A34A" bg="#F0FDF4" />
              <HabitStat label="At risk" value={String(atRiskCount)} unit="" color={atRiskCount > 0 ? "#DC2626" : "#57534E"} bg={atRiskCount > 0 ? "#FEF2F2" : "#F5F0EB"} />
            </div>

            {/* Today's progress */}
            <div style={{
              padding: "4px 12px 10px", flexShrink: 0,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{
                  fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em",
                  color: habitsDone === todayHabits.length && todayHabits.length > 0 ? "#16A34A" : "#F97316",
                }}>
                  {habitsDone}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#57534E" }}>
                  / {todayHabits.length} habits done
                </span>
              </div>
              <div style={{ height: 5, backgroundColor: "#FFEDD5", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: todayHabits.length === 0 ? "0%" : `${(habitsDone / todayHabits.length) * 100}%`,
                  height: "100%",
                  backgroundColor: habitsDone === todayHabits.length && todayHabits.length > 0 ? "#16A34A" : "#F97316",
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>

            <div style={{
              flex: 1, minHeight: 0, overflowY: "auto",
              padding: "8px 12px 10px",
              display: "flex", flexDirection: "column", gap: 5,
            }}>
              {todayHabits.length === 0 ? (
                <EmptyHint icon={<Sparkles size={16} color="#78716C" />} text="No habits scheduled today">
                  <Link href="/habits" style={{ ...linkLook, marginTop: 6 }}>Add a habit</Link>
                </EmptyHint>
              ) : (
                todayHabits.map((h) => {
                  const meta   = GOAL_AREA_META[h.area];
                  const done   = isHabitDoneOnDate(h, today);
                  const streak = calcStreak(h);
                  return (
                    <div key={h.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 9px", borderRadius: 8,
                      backgroundColor: done ? "#F0FDF4" : meta.bg,
                      border: `1px solid ${done ? "#86EFAC" : meta.color + "30"}`,
                      borderLeft: `3px solid ${done ? "#16A34A" : meta.color}`,
                    }}>
                      <button
                        onClick={() => toggleHabitDay(h.id, today)}
                        style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: done ? "none" : `1.5px solid ${meta.color}`,
                          backgroundColor: done ? "#16A34A" : "#FFFFFF",
                          cursor: "pointer", flexShrink: 0, padding: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {done && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                      </button>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600,
                        color: done ? "#15803D" : meta.color,
                        textDecoration: done ? "line-through" : "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {h.name}
                      </span>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 2,
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                        color: streak > 0 ? "#EA580C" : "#78716C",
                      }}>
                        <Flame size={9} color="#F97316" />
                        {streak}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline create-task modal — opened by + button on Task Tracker */}
      <TaskCreateSheet
        open={taskCreateOpen}
        onClose={() => setTaskCreateOpen(false)}
        onSaveTask={addTask}
        onSaveTemplate={() => { /* RECURRING_DISABLED */ }}
        goals={goals}
      />
    </div>
  );
}

// ── Goal Row (with progress slider) ───────────────────────────────────────────
function GoalRow({ goal, today, onUpdate, expanded, onToggleExpand, linkedHabits, linkedTasks }: {
  goal:           GoalData;
  today:          string;
  onUpdate:       (g: GoalData) => void;
  expanded:       boolean;
  onToggleExpand: () => void;
  linkedHabits:   HabitData[];
  linkedTasks:    TaskData[];
}) {
  const meta       = GOAL_AREA_META[goal.area];
  const stale      = isGoalStale(goal);
  const days       = Math.ceil((new Date(goal.deadline + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000);
  const milestones = goal.milestones ?? [];
  const [draftPct, setDraftPct] = useState<number | null>(null);
  const pct = draftPct ?? goal.progress;

  function stop(e: React.SyntheticEvent) { e.stopPropagation(); }

  return (
    <div style={{
      borderRadius: 10,
      backgroundColor: expanded ? "#FFFFFF" : meta.bg,
      border: `1px solid ${expanded ? meta.color + "60" : meta.color + "30"}`,
      boxShadow: expanded ? `0 4px 14px ${meta.color}22` : "none",
      transition: "box-shadow 0.15s, background-color 0.15s",
    }}>
      {/* Row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: "flex", gap: 10,
          padding: "9px 11px",
          cursor: "pointer",
        }}
      >
        <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: meta.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{
              flex: 1, minWidth: 0,
              fontSize: 12, fontWeight: 700, color: "#1C1917", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {goal.statement || "(untitled goal)"}
            </p>
            <span style={{
              fontSize: 9, fontWeight: 700, flexShrink: 0,
              color: stale || days < 0 ? "#DC2626" : "#57534E",
            }}>
              {stale && <AlertTriangle size={9} style={{ display: "inline", marginRight: 2, verticalAlign: -1 }} />}
              {days < 0 ? `${-days}d overdue` : `${days}d left`}
            </span>
            <ChevronRight
              size={11}
              color={meta.color}
              style={{
                flexShrink: 0,
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
              }}
            />
            {/* Milestone count circle — at end */}
            <span
              title={`${milestones.length} milestone${milestones.length === 1 ? "" : "s"}`}
              style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                backgroundColor: meta.color, color: "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, lineHeight: 1,
                boxShadow: `0 1px 3px ${meta.color}55`,
              }}
            >
              {milestones.length}
            </span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}
            onClick={stop}
          >
            <input
              type="range"
              min={0} max={100} step={5}
              value={pct}
              onChange={(e) => setDraftPct(parseInt(e.target.value, 10))}
              onMouseDown={stop}
              onMouseUp={(e) => {
                stop(e);
                if (draftPct !== null && draftPct !== goal.progress) {
                  onUpdate({ ...goal, progress: draftPct, lastMoved: Date.now() });
                }
                setDraftPct(null);
              }}
              onTouchEnd={(e) => {
                stop(e);
                if (draftPct !== null && draftPct !== goal.progress) {
                  onUpdate({ ...goal, progress: draftPct, lastMoved: Date.now() });
                }
                setDraftPct(null);
              }}
              style={{
                flex: 1, height: 4, padding: 0, cursor: "pointer",
                accentColor: meta.color,
              }}
            />
            <span style={{
              fontSize: 11, fontWeight: 800, color: meta.color, flexShrink: 0,
              minWidth: 32, textAlign: "right",
            }}>
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Drill-down detail panel */}
      {expanded && (
        <div style={{
          padding: "8px 12px 12px",
          borderTop: `1px solid ${meta.color}25`,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <DetailSection
            title={`Milestones (${milestones.length})`}
            color={meta.color}
            empty="No milestones yet."
            isEmpty={milestones.length === 0}
          >
            {milestones.map((m) => (
              <DetailRow
                key={m.id}
                title={m.title}
                meta={m.deadline ? new Date(m.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                done={!!m.completed}
                color={meta.color}
              />
            ))}
          </DetailSection>

          <DetailSection
            title={`Habits (${linkedHabits.length})`}
            color={meta.color}
            empty="No habits linked."
            isEmpty={linkedHabits.length === 0}
          >
            {linkedHabits.map((h) => {
              const streak = calcStreak(h);
              return (
                <DetailRow
                  key={h.id}
                  title={h.name}
                  meta={streak > 0 ? `🔥 ${streak}d` : ""}
                  done={isHabitDoneOnDate(h, today)}
                  color={meta.color}
                />
              );
            })}
          </DetailSection>

          <DetailSection
            title={`Tasks (${linkedTasks.length})`}
            color={meta.color}
            empty="No tasks linked."
            isEmpty={linkedTasks.length === 0}
          >
            {linkedTasks.map((t) => {
              const overdue = t.status === "open" && t.deadline < today;
              const days    = Math.ceil((new Date(t.deadline + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86_400_000);
              const metaText = t.status !== "open"
                ? "Done"
                : overdue ? `${-days}d late`
                : days === 0 ? "Today"
                : `${days}d`;
              return (
                <DetailRow
                  key={t.id}
                  title={t.title}
                  meta={metaText}
                  done={t.status !== "open"}
                  color={meta.color}
                />
              );
            })}
          </DetailSection>

          <Link href="/goals" style={{ ...linkLook, alignSelf: "flex-end" }}>
            Open in Goals <ChevronRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Goal drill-down helpers ───────────────────────────────────────────────────
function DetailSection({ title, color, empty, isEmpty, children }: {
  title:    string;
  color:    string;
  empty:    string;
  isEmpty:  boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p style={{
        fontSize: 9, fontWeight: 800, color, margin: "0 0 4px",
        textTransform: "uppercase", letterSpacing: "0.07em",
      }}>
        {title}
      </p>
      {isEmpty ? (
        <p style={{ fontSize: 10.5, color: "#78716C", fontStyle: "italic", margin: 0 }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DetailRow({ title, meta, done, color }: {
  title: string; meta: string; done: boolean; color: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "4px 8px", borderRadius: 6,
      backgroundColor: done ? "#F0FDF4" : "#FAFAF9",
      border: `1px solid ${done ? "#86EFAC" : "#E8DDD0"}`,
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
        backgroundColor: done ? "#16A34A" : "transparent",
        border: done ? "none" : `1.5px solid ${color}55`,
      }} />
      <span style={{
        flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 600,
        color: done ? "#15803D" : "#1C1917",
        textDecoration: done ? "line-through" : "none",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {title}
      </span>
      {meta && (
        <span style={{
          flexShrink: 0, fontSize: 9, fontWeight: 700, color: "#57534E",
        }}>
          {meta}
        </span>
      )}
    </div>
  );
}

// ── North Star Card ───────────────────────────────────────────────────────────
function NorthStarCard({ data }: { data: { purposeText: string; isSealed: boolean } }) {
  const has    = data.purposeText.trim().length > 0;
  const sealed = data.isSealed;

  return (
    <div style={{
      ...cardBase,
      padding: "12px 14px",
      background: "linear-gradient(165deg, #FFFBF5, #FFF7ED)",
      border: "1.5px solid #FED7AA",
      display: "flex", flexDirection: "column", gap: 8,
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} color="#EA580C" />
          <p style={sectionLabel}>North Star</p>
        </div>
        {has && sealed && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 9, fontWeight: 700, color: "#15803D",
            backgroundColor: "#DCFCE7", padding: "2px 7px", borderRadius: 10,
            border: "1px solid #86EFAC",
          }}>
            <Lock size={9} /> Sealed
          </span>
        )}
        {has && !sealed && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: "#B45309",
            backgroundColor: "#FEF3C7", padding: "2px 7px", borderRadius: 10,
            border: "1px solid #FDE68A",
          }}>
            Draft
          </span>
        )}
      </div>

      {has ? (
        <>
          <p style={{
            fontSize: 12.5, fontWeight: 600, color: "#1C1917",
            lineHeight: 1.5, margin: 0, fontStyle: "italic",
            display: "-webkit-box", WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical" as const, overflow: "hidden",
          }}>
            &ldquo;{data.purposeText}&rdquo;
          </p>
          <Link href="/legacy" style={{ ...linkLook, alignSelf: "flex-start" }}>
            {sealed ? "View on Legacy" : "Finalize on Legacy"} <ChevronRight size={11} />
          </Link>
        </>
      ) : (
        <>
          <p style={{
            fontSize: 11.5, color: "#57534E", lineHeight: 1.5, margin: 0,
          }}>
            Your purpose statement — the single sentence that points where you&apos;re headed.
          </p>
          <Link href="/legacy" style={{
            alignSelf: "flex-start",
            padding: "7px 12px", borderRadius: 8,
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            color: "#FFFFFF", fontSize: 11, fontWeight: 700,
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}>
            Set North Star <ArrowRight size={11} />
          </Link>
        </>
      )}
    </div>
  );
}

// ── Core Values Card ──────────────────────────────────────────────────────────
const VALUE_AREA_COLORS: Record<string, string> = {
  professional:  "#2563EB",
  contribution:  "#16A34A",
  wealth:        "#CA8A04",
  spiritual:     "#7C3AED",
  personal:      "#F97316",
  relationships: "#DB2777",
  health:        "#DC2626",
};

function CoreValuesCard({ values }: { values: { area: string; value: string }[] }) {
  return (
    <div style={{
      ...cardBase, padding: "10px 12px",
      flexShrink: 0,
      display: "flex", flexDirection: "column", gap: 8,
      background: "linear-gradient(160deg, #FFFFFF 0%, #FDF2F8 100%)",
      borderColor: "#FBCFE8",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Heart size={12} color="#DB2777" />
          <p style={sectionLabel}>Core Values</p>
        </div>
        <Link href="/values" style={linkLook}>
          {values.length === 0 ? "Set values" : "Edit"} <ChevronRight size={11} />
        </Link>
      </div>
      {values.length === 0 ? (
        <EmptyHint
          icon={<Heart size={16} color="#78716C" />}
          text="Choose up to 5 values that define how you live"
        />
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignContent: "flex-start" }}>
          {values.map((v, i) => {
            const color = VALUE_AREA_COLORS[v.area] ?? "#78716C";
            return (
              <span key={i} style={{
                fontSize: 11, fontWeight: 700, color: "#FFFFFF",
                backgroundColor: color, padding: "4px 9px", borderRadius: 16,
                boxShadow: `0 1px 4px ${color}55`,
              }}>
                {v.value}
              </span>
            );
          })}
          {values.length < 5 && (
            <Link href="/values" style={{
              fontSize: 10, fontWeight: 700, color: "#78716C",
              padding: "4px 9px", borderRadius: 16,
              border: "1.5px dashed #C4B5A8", textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 3,
            }}>
              <Plus size={9} /> {5 - values.length} more
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Habit stat tile (display-only, mirrors task tile sizing) ──────────────────
function HabitStat({ label, value, unit, color, bg }: {
  label: string; value: string; unit: string; color: string; bg: string;
}) {
  return (
    <div style={{
      backgroundColor: bg, borderRadius: 9,
      padding: "7px 6px",
      border: `1.5px solid ${color}30`,
      textAlign: "center",
    }}>
      <p style={{
        fontSize: 8.5, fontWeight: 700, color: "#57534E",
        textTransform: "uppercase", letterSpacing: "0.05em", margin: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 18, fontWeight: 800, color, margin: "1px 0 0",
        lineHeight: 1, letterSpacing: "-0.02em",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {value}
        {unit && <span style={{ fontSize: 9, fontWeight: 600, color: "#57534E", marginLeft: 2 }}>{unit}</span>}
      </p>
    </div>
  );
}

// ── Filter tile (small, clickable) ────────────────────────────────────────────
function FilterTile({ label, value, color, bg, active, onClick }: {
  label: string; value: number; color: string; bg: string;
  active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: active ? color : bg,
        borderRadius: 9,
        padding: "7px 6px",
        border: `1.5px solid ${active ? color : color + "30"}`,
        cursor: "pointer", textAlign: "center",
        boxShadow: active ? `0 2px 8px ${color}55` : "none",
        transition: "all 0.15s",
      }}
    >
      <p style={{
        fontSize: 8.5, fontWeight: 700,
        color: active ? "#FFFFFF" : "#57534E",
        textTransform: "uppercase", letterSpacing: "0.05em", margin: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 18, fontWeight: 800,
        color: active ? "#FFFFFF" : color,
        margin: "1px 0 0", lineHeight: 1, letterSpacing: "-0.02em",
      }}>
        {value}
      </p>
    </button>
  );
}

// ── Week plan content (Key Outcomes + Agenda mini) ────────────────────────────
const AGENDA_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function WeekPlanContent({ plan, weekStart, agenda, eventGroups, onToggleOutcome }: {
  plan:             WeekPlan | null;
  weekStart:        string;
  agenda:           { date: string; events: { id: string; title: string; startTime: string; endTime: string; groupId: string }[] }[];
  eventGroups:      { id: string; color: string; name: string }[];
  onToggleOutcome:  (text: string) => void;
}) {
  const outcomes     = plan?.outcomes     ?? [];
  const doneOutcomes = plan?.doneOutcomes ?? [];
  const priorities   = plan?.priorities   ?? [];
  const todayStr     = toTaskDate();
  const groupColorMap = useMemo(
    () => Object.fromEntries(eventGroups.map((g) => [g.id, g.color])) as Record<string, string>,
    [eventGroups]
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* Key Outcomes (top, scroll) */}
      <div style={{
        flex: "0 1 38%", minHeight: 0,
        padding: "10px 14px",
        borderBottom: "1px solid #F0F8F5",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <ListChecks size={11} color="#0D9488" />
          <p style={{
            fontSize: 9, fontWeight: 800, color: "#0F766E",
            textTransform: "uppercase", letterSpacing: "0.07em", margin: 0,
          }}>
            Key Outcomes
          </p>
          {outcomes.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#0F766E",
              backgroundColor: "#CCFBF1", padding: "1px 6px", borderRadius: 8,
            }}>
              {doneOutcomes.length}/{outcomes.length}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {outcomes.length === 0 && priorities.length === 0 ? (
            <EmptyHint
              icon={<CalendarRange size={14} color="#78716C" />}
              text={`No plan for week of ${new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            >
              <Link href="/weekly" style={{ ...linkLook, marginTop: 4 }}>Plan this week</Link>
            </EmptyHint>
          ) : outcomes.length === 0 ? (
            <p style={{ fontSize: 11, color: "#57534E", fontStyle: "italic", margin: 0 }}>
              No outcomes set this week.
            </p>
          ) : (
            outcomes.map((text, i) => {
              const done = doneOutcomes.includes(text);
              return (
                <button
                  key={i}
                  onClick={() => onToggleOutcome(text)}
                  title={done ? "Mark as not done" : "Mark as done"}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 7,
                    padding: "6px 9px", borderRadius: 7,
                    backgroundColor: done ? "#F0FDF4" : "#FFFFFF",
                    border: `1px solid ${done ? "#86EFAC" : "#E5E7EB"}`,
                    cursor: "pointer", textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{
                    width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                    backgroundColor: done ? "#16A34A" : "#FFFFFF",
                    border: done ? "none" : "1.5px solid #C4B5A8",
                    display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                  }}>
                    {done && <Check size={8} color="#FFFFFF" strokeWidth={3} />}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 11, fontWeight: 600, lineHeight: 1.4,
                    color: done ? "#15803D" : "#1C1917",
                    textDecoration: done ? "line-through" : "none",
                  }}>
                    {text}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Agenda mini — 7 columns, week-style */}
      <div style={{
        flex: "1 1 0", minHeight: 0,
        padding: "10px 12px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Clock size={11} color="#0D9488" />
          <p style={{
            fontSize: 9, fontWeight: 800, color: "#0F766E",
            textTransform: "uppercase", letterSpacing: "0.07em", margin: 0,
          }}>
            Agenda · This Week
          </p>
        </div>
        <div style={{
          flex: 1, minHeight: 0, display: "flex",
          border: "1px solid #DCFCE7", borderRadius: 8,
          backgroundColor: "#FFFFFF", overflow: "hidden",
        }}>
          {agenda.map(({ date, events }, i) => {
            const d       = new Date(date + "T00:00:00");
            const isToday = date === todayStr;
            const isPast  = date < todayStr;
            return (
              <div key={date} style={{
                flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
                borderRight: i < 6 ? "1px solid #DCFCE7" : "none",
                backgroundColor: isToday ? "#F0FDFA" : isPast ? "#FAFAF9" : "#FFFFFF",
                overflow: "hidden",
              }}>
                {/* Day header — date number on top */}
                <div style={{
                  padding: "5px 4px 4px",
                  borderBottom: "1px solid #DCFCE7",
                  textAlign: "center",
                  backgroundColor: isToday ? "#CCFBF1" : "transparent",
                  flexShrink: 0,
                }}>
                  <p style={{
                    fontSize: 14, fontWeight: 800, lineHeight: 1, margin: 0,
                    color: isToday ? "#0F766E" : isPast ? "#78716C" : "#1C1917",
                  }}>
                    {d.getDate()}
                  </p>
                  <p style={{
                    fontSize: 8, fontWeight: 700, lineHeight: 1, margin: "2px 0 0",
                    color: isToday ? "#0F766E" : "#57534E",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {AGENDA_DAY_NAMES[i]}
                  </p>
                </div>
                {/* Events list */}
                <div style={{
                  flex: 1, minHeight: 0, overflowY: "auto",
                  padding: "4px 3px",
                  display: "flex", flexDirection: "column", gap: 2,
                }}>
                  {events.length === 0 ? null : events.map((ev) => {
                    const color = groupColorMap[ev.groupId] ?? "#6366F1";
                    return (
                      <div key={ev.id} style={{
                        padding: "3px 4px", borderRadius: 4,
                        borderLeft: `2px solid ${color}`,
                        backgroundColor: color + "14",
                      }}>
                        <p style={{
                          fontSize: 8, fontWeight: 700, color,
                          margin: 0, lineHeight: 1,
                        }}>
                          {ev.startTime}
                        </p>
                        <p style={{
                          fontSize: 9.5, fontWeight: 600, color: "#1C1917",
                          margin: "1px 0 0", lineHeight: 1.2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {ev.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ── Empty hint ────────────────────────────────────────────────────────────────
function EmptyHint({ icon, text, children }: {
  icon: React.ReactNode; text: string; children?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: "14px 12px", borderRadius: 10, textAlign: "center",
      border: "1.5px dashed #E8DDD0", backgroundColor: "#FAFAFA",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    }}>
      {icon}
      <p style={{ fontSize: 11, color: "#57534E", margin: 0, fontWeight: 600 }}>{text}</p>
      {children}
    </div>
  );
}
