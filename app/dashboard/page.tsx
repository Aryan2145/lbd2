"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap, CheckSquare, Flame, TrendingUp, ArrowRight, Target as TargetIcon,
  Video, Check, Plus, Clock, Sun, Moon, Sparkles, Compass,
  Heart, BookOpen, AlertTriangle, ChevronRight, Eye,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { toTaskDate, Q_META } from "@/components/tasks/TaskCard";
import { isScheduledDay, isHabitDoneOnDate, calcStreak } from "@/components/habits/HabitCard";
import type { WeekEvent } from "@/lib/weeklyTypes";
import type { HabitData } from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { GoalData, LifeArea as GoalLifeArea } from "@/components/goals/GoalCard";
import type { EveningReflection, DecisionEntry } from "@/lib/dayTypes";
import type { BucketEntry } from "@/lib/bucketTypes";
import { LIFE_AREA_COLORS } from "@/lib/dayTypes";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toTaskDate(d);
}
function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function daysBetween(iso: string): number {
  return Math.ceil((new Date(iso + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);
}

// ── Computation helpers ───────────────────────────────────────────────────────

function computeMomentumScore(habits: HabitData[], tasks: TaskData[], weekStart: string): number {
  const weekEnd = addDays(weekStart, 7);
  let hTotal = 0, hDone = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    const ds = toTaskDate(d);
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

function computeDailyProgress(habits: HabitData[], tasks: TaskData[], today: string): { done: number; total: number } {
  const dow = new Date(today + "T00:00:00").getDay();
  const todayHabits = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, dow));
  const habitsDone  = todayHabits.filter((h) => isHabitDoneOnDate(h, today)).length;
  const todayTasks  = tasks.filter((t) => t.deadline === today);
  const tasksDone   = todayTasks.filter((t) => t.status !== "open").length;
  return { done: habitsDone + tasksDone, total: todayHabits.length + todayTasks.length };
}

function computeMaxStreak(habits: HabitData[]): { name: string; streak: number } {
  let best = { name: "—", streak: 0 };
  for (const h of habits) {
    const streak = calcStreak(h);
    if (streak > best.streak) best = { name: h.name, streak };
  }
  return best;
}

function computeEnergyTrend(reflections: EveningReflection[], today: string): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const ds = addDays(today, -(6 - i));
    return reflections.find((r) => r.date === ds)?.energyLevel ?? 0;
  });
}

function extractMeetingUrl(description: string): string | null {
  const matches = description.match(/(https?:\/\/[^\s]+)/gi);
  if (!matches) return null;
  for (const url of matches) {
    if (/zoom\.us|meet\.google|teams\.microsoft|whereby|webex|around\.co/i.test(url)) return url;
  }
  return null;
}

function getNextEvents(events: WeekEvent[]): { current: WeekEvent | null; upcoming: WeekEvent[] } {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let current: WeekEvent | null = null;
  const upcoming: WeekEvent[] = [];
  for (const ev of events) {
    const s = toMins(ev.startTime), e = toMins(ev.endTime);
    if (s <= nowMins && nowMins < e) current = ev;
    else if (s > nowMins) upcoming.push(ev);
  }
  return { current, upcoming: upcoming.slice(0, 3) };
}

// ── Vision balance — derived from goals + habits per life area ────────────────

const VISION_AREAS: { key: GoalLifeArea; label: string; color: string }[] = [
  { key: "professional",  label: "Professional",  color: "#2563EB" },
  { key: "contribution",  label: "Contribution",  color: "#7C3AED" },
  { key: "wealth",        label: "Wealth",        color: "#C9A84C" },
  { key: "spiritual",     label: "Spiritual",     color: "#059669" },
  { key: "personal",      label: "Personal",      color: "#DB2777" },
  { key: "relationships", label: "Relationships", color: "#EA580C" },
  { key: "health",        label: "Health",        color: "#DC2626" },
];

const HABIT_TO_VISION: Record<string, GoalLifeArea> = {
  professional: "professional", contribution: "contribution", wealth: "wealth",
  spiritual: "spiritual", personal: "personal", relationships: "relationships", health: "health",
};

function computeVisionScores(goals: GoalData[], habits: HabitData[]): Record<GoalLifeArea, number> {
  const out = {} as Record<GoalLifeArea, number>;
  for (const v of VISION_AREAS) {
    const goalsHere   = goals.filter((g) => g.area === v.key);
    const habitsHere  = habits.filter((h) => HABIT_TO_VISION[h.area] === v.key);
    const goalScore   = goalsHere.length === 0 ? 0 : goalsHere.reduce((s, g) => s + g.progress, 0) / goalsHere.length;
    let scheduled = 0, done = 0;
    for (const h of habitsHere) {
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        if (d.getTime() < h.createdAt) break;
        if (!isScheduledDay(h.frequency, h.customDays, d.getDay())) continue;
        scheduled++;
        if (isHabitDoneOnDate(h, toTaskDate(d))) done++;
      }
    }
    const habitScore = scheduled === 0 ? 0 : (done / scheduled) * 100;
    const score = habitsHere.length > 0 && goalsHere.length > 0
      ? (goalScore * 0.5 + habitScore * 0.5)
      : habitsHere.length > 0 ? habitScore
      : goalsHere.length > 0  ? goalScore : 0;
    out[v.key] = Math.round(score);
  }
  return out;
}

// ── SVG components ────────────────────────────────────────────────────────────

function CircleGauge({ score, size = 84 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#F0EBE3" strokeWidth={6} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={c} y={c - 2} textAnchor="middle" fontSize={size * 0.22} fontWeight={800} fill={color}>
        {score}
      </text>
      <text x={c} y={c + size * 0.16} textAnchor="middle" fontSize={size * 0.11} fill="#A8A29E">
        / 100
      </text>
    </svg>
  );
}

function EnergyBars({ values, big = false }: { values: number[]; big?: boolean }) {
  const maxH = big ? 38 : 28, bW = big ? 9 : 7, gap = big ? 4 : 3;
  return (
    <svg width={values.length * (bW + gap) - gap} height={maxH}>
      {values.map((v, i) => {
        const h  = v === 0 ? 3 : Math.max(4, (v / 10) * maxH);
        const col = v === 0 ? "#E8DDD0" : v >= 7 ? "#10B981" : v >= 5 ? "#F59E0B" : "#EF4444";
        return <rect key={i} x={i * (bW + gap)} y={maxH - h} width={bW} height={h} rx={2} fill={col}
          style={{ transition: "height 0.6s ease, y 0.6s ease" }} />;
      })}
    </svg>
  );
}

function VisionWheel({ scores, size = 240 }: { scores: Record<GoalLifeArea, number>; size?: number }) {
  const c = size / 2;
  const maxR = c - 32;
  const N = VISION_AREAS.length;

  const point = (idx: number, r: number) => {
    const angle = (Math.PI * 2 * idx) / N - Math.PI / 2;
    return { x: c + Math.cos(angle) * r, y: c + Math.sin(angle) * r };
  };

  const ringPath = (radius: number) => {
    return VISION_AREAS.map((_, i) => {
      const p = point(i, radius);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + " Z";
  };

  const valuePath = VISION_AREAS.map((v, i) => {
    const score = scores[v.key] || 0;
    const r = (score / 100) * maxR;
    const p = point(i, r);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((f, idx) => (
        <path key={idx} d={ringPath(maxR * f)} fill="none"
          stroke={f === 1 ? "#E8DDD0" : "#F0EBE3"} strokeWidth={1} />
      ))}
      {VISION_AREAS.map((_, i) => {
        const p = point(i, maxR);
        return <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke="#F0EBE3" strokeWidth={1} />;
      })}
      <path d={valuePath} fill="rgba(249,115,22,0.18)" stroke="#F97316" strokeWidth={2}
        strokeLinejoin="round" style={{ transition: "all 1s cubic-bezier(0.4,0,0.2,1)" }} />
      {VISION_AREAS.map((v, i) => {
        const score = scores[v.key] || 0;
        const r = (score / 100) * maxR;
        const p = point(i, r);
        return <circle key={v.key} cx={p.x} cy={p.y} r={3.5} fill="#F97316" stroke="#FFFFFF" strokeWidth={1.5} />;
      })}
      {VISION_AREAS.map((v, i) => {
        const p = point(i, maxR + 16);
        const score = scores[v.key] || 0;
        return (
          <g key={v.key + "_label"}>
            <text x={p.x} y={p.y} textAnchor="middle" fontSize={9} fontWeight={600} fill="#57534E">
              {v.label}
            </text>
            <text x={p.x} y={p.y + 11} textAnchor="middle" fontSize={9} fontWeight={700} fill={v.color}>
              {score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Daily quotes ──────────────────────────────────────────────────────────────

const DAILY_QUOTES = [
  { text: "Do the hard thing first. The rest of the day gets easier.", author: "Brian Tracy" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "Your habits today are building your identity of tomorrow.", author: "James Clear" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Win the morning, win the day.", author: "" },
  { text: "You are what you repeatedly do.", author: "Aristotle" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Clarity comes from action, not from thought.", author: "" },
  { text: "Small steps forward are still steps forward.", author: "" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    goals, tasks, habits, eventGroups, weekEvents, weekPlans,
    dayPlans, eveningReflections, bucketEntries,
    upsertDayPlan, toggleHabitDay, closeTask,
  } = useAppStore();

  const today    = toTaskDate();
  const yest     = addDays(today, -1);
  const nowHour  = new Date().getHours();
  const weekStart = getWeekStart();
  const dow      = new Date(today + "T00:00:00").getDay();

  const [decisionInput, setDecisionInput] = useState("");

  // ── Computed values ──
  const momentum    = useMemo(() => computeMomentumScore(habits, tasks, weekStart), [habits, tasks, weekStart]);
  const progress    = useMemo(() => computeDailyProgress(habits, tasks, today), [habits, tasks, today]);
  const bestStreak  = useMemo(() => computeMaxStreak(habits), [habits]);
  const energy      = useMemo(() => computeEnergyTrend(eveningReflections, today), [eveningReflections, today]);
  const visionScores = useMemo(() => computeVisionScores(goals, habits), [goals, habits]);

  const goalsOnTrack = goals.filter((g) =>
    g.progress > 0 && g.velocity >= 0 && Math.floor((Date.now() - g.lastMoved) / 86_400_000) < 14).length;
  const goalsAtRisk  = goals.filter((g) =>
    g.velocity < 0 || Math.floor((Date.now() - g.lastMoved) / 86_400_000) >= 14).length;

  const topGoals = useMemo(() => {
    return [...goals]
      .filter((g) => g.progress < 100)
      .sort((a, b) => {
        const aDays = Math.max(0, daysBetween(a.deadline));
        const bDays = Math.max(0, daysBetween(b.deadline));
        return aDays - bDays;
      })
      .slice(0, 3);
  }, [goals]);

  const todayHabits = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, dow));
  const urgentTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "open" && (t.quadrant === "Q1" || (t.quadrant === "Q2" && t.deadline <= today)))
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5);
  }, [tasks, today]);

  const todayEvents = weekEvents
    .filter((e) => e.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const { current: currentEvent, upcoming: upcomingEvents } = getNextEvents(todayEvents);
  const groupMap = Object.fromEntries(eventGroups.map((g) => [g.id, g]));

  const plan        = dayPlans.find((d) => d.date === today);
  const priorities  = [
    plan?.priorities[0] ?? null,
    plan?.priorities[1] ?? null,
    plan?.priorities[2] ?? null,
  ];
  const decisions   = plan?.decisions ?? [];

  const eveningRefl = eveningReflections.find((r) => r.date === today);
  const yestRefl    = eveningReflections.find((r) => r.date === yest);
  const planDone    = priorities.some((p) => p?.text.trim());
  const eveningDone = !!eveningRefl?.highlights;
  const isEvening   = nowHour >= 16;

  const showMorningNudge = !isEvening && !planDone;
  const showEveningNudge = isEvening && !eveningDone;

  // Bucket featured: prefer most recent achievement, then a planning entry
  const recentAchieved = [...bucketEntries]
    .filter((b) => b.status === "achieved")
    .sort((a, b) => (b.achievedAt ?? 0) - (a.achievedAt ?? 0))[0];
  const planning = bucketEntries.find((b) => b.status === "planning");
  const dreaming = bucketEntries.find((b) => b.status === "dreaming");
  const featuredBucket: BucketEntry | undefined = planning ?? recentAchieved ?? dreaming;

  const weekPlan = weekPlans.find((p) => p.weekStart === weekStart);

  // Quote
  const doy   = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = DAILY_QUOTES[doy % DAILY_QUOTES.length];

  // Greeting
  const dayName  = new Date(today + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
  const dateDisp = new Date(today + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const greeting = nowHour < 12 ? "Good morning" : nowHour < 17 ? "Good afternoon" : "Good evening";

  // Derived metrics
  const progressPct   = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
  const progressColor = progressPct >= 80 ? "#10B981" : progressPct >= 50 ? "#F59E0B" : "#EF4444";
  const momentumColor = momentum >= 80 ? "#10B981" : momentum >= 60 ? "#F59E0B" : "#EF4444";
  const avgEnergy     = (() => {
    const valid = energy.filter((v) => v > 0);
    return valid.length === 0 ? 0 : valid.reduce((a, b) => a + b, 0) / valid.length;
  })();

  // ── Handlers ──
  function togglePriority(idx: number) {
    if (!plan) return;
    const updated = [...plan.priorities];
    if (updated[idx]) updated[idx] = { ...updated[idx], completed: !updated[idx].completed };
    upsertDayPlan({ ...plan, priorities: updated });
  }

  function addDecision() {
    const text = decisionInput.trim();
    if (!text) return;
    const entry: DecisionEntry = { id: `dec_${Date.now()}`, text, made: false, createdAt: Date.now() };
    const base = plan ?? { date: today, priorities: [], gratitude: "", decisions: [] };
    upsertDayPlan({ ...base, decisions: [...base.decisions, entry] });
    setDecisionInput("");
  }

  function toggleDecision(id: string) {
    if (!plan) return;
    upsertDayPlan({
      ...plan,
      decisions: plan.decisions.map((d) => d.id === id ? { ...d, made: !d.made } : d),
    });
  }

  return (
    <div style={{ height: "100%", backgroundColor: "#FAF5EE", overflow: "auto" }}>
      <style>{`
        @keyframes dash-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes dash-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          50%      { box-shadow: 0 0 0 6px rgba(249,115,22,0); }
        }
        .dash-card { animation: dash-fade-up 0.4s ease both; }
        .dash-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(28,25,23,0.06); }
        .dash-pulse-dot { animation: dash-pulse 2.4s ease-in-out infinite; }
        .dash-now-glow { animation: dash-glow 2.5s ease-in-out infinite; }
        .dash-bar { transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────────────
          HERO STRIP — Identity + Greeting + Mode
      ───────────────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 28px 18px", borderBottom: "1px solid #EDE5D8",
        background: "linear-gradient(135deg, #FFFAF3 0%, #FAF5EE 60%)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#F97316", margin: 0 }}>
            Command Center · Module 06
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1C1917", margin: "4px 0 0", letterSpacing: "-0.02em" }}>
            {greeting}, Aryan.
          </h1>
          <p style={{ fontSize: 13, color: "#78716C", margin: "3px 0 0", fontWeight: 500 }}>
            {dayName} · {dateDisp}
          </p>
        </div>

        {/* Center — Values pills (placeholder, user will fill later) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#A8A29E", margin: 0 }}>
            Core Values
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 420 }}>
            {["Discipline", "Family", "Growth", "Integrity", "Service"].map((v, i) => (
              <span key={v} style={{
                padding: "4px 12px", borderRadius: 999,
                background: "linear-gradient(135deg, #FFF7ED, #FEF3C7)",
                border: "1px solid #FED7AA",
                fontSize: 11, fontWeight: 700, color: "#92400E",
                animation: `dash-fade-up 0.5s ease ${i * 0.06}s both`,
              }}>
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Right — Mode + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 999,
            backgroundColor: isEvening ? "#1E1B4B" : "#FFF7ED",
            border: `1px solid ${isEvening ? "#312E81" : "#FED7AA"}`,
            fontSize: 11, fontWeight: 700,
            color: isEvening ? "#A5B4FC" : "#F97316",
          }}>
            {isEvening ? <Moon size={12} /> : <Sun size={12} />}
            {isEvening ? "Evening Mode" : "Morning Mode"}
          </span>
          <Link href="/daily" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10,
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: 12, fontWeight: 700, color: "#FFFFFF", textDecoration: "none",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}>
            Open Daily <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Nudge banner */}
      {(showMorningNudge || showEveningNudge) && (
        <div style={{ padding: "14px 28px 0" }}>
          <Link href="/daily" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderRadius: 12, textDecoration: "none",
            backgroundColor: showEveningNudge ? "#F5F3FF" : "#FFF7ED",
            border: `1.5px solid ${showEveningNudge ? "#C4B5FD" : "#FED7AA"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {showEveningNudge ? <Moon size={18} color="#6366F1" /> : <Sun size={18} color="#F97316" />}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700,
                  color: showEveningNudge ? "#4F46E5" : "#EA580C", margin: 0 }}>
                  {showEveningNudge ? "Evening reflection not yet logged" : "Daily plan not set yet"}
                </p>
                <p style={{ fontSize: 11, color: "#78716C", margin: "2px 0 0" }}>
                  {showEveningNudge
                    ? "Take 5 minutes to capture today before it slips away →"
                    : "Set your Top 3 for today in the daily plan →"}
                </p>
              </div>
            </div>
            <ArrowRight size={14} color={showEveningNudge ? "#6366F1" : "#F97316"} />
          </Link>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          VITALS — 5 KPI cards
      ───────────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 28px 0",
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>

        {/* Momentum */}
        <div className="dash-card" style={kpiCard}>
          <KpiHeader icon={<Zap size={12} color="#F97316" />} label="Momentum" />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <CircleGauge score={momentum} size={72} />
            <div>
              <p style={{ fontSize: 11, color: momentumColor, fontWeight: 800, margin: 0 }}>
                {momentum >= 80 ? "Strong" : momentum >= 60 ? "Building" : "Needs focus"}
              </p>
              <p style={{ fontSize: 9, color: "#A8A29E", margin: "3px 0 0", lineHeight: 1.4 }}>
                7-day rolling<br />Habits + Tasks
              </p>
            </div>
          </div>
        </div>

        {/* Today's Progress */}
        <div className="dash-card" style={{ ...kpiCard, animationDelay: "0.05s" }}>
          <KpiHeader icon={<CheckSquare size={12} color="#6366F1" />} label="Today" />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: progressColor, letterSpacing: "-0.02em" }}>
              {progress.done}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#A8A29E" }}>
              / {progress.total}
            </span>
          </div>
          <div style={{ width: "100%", height: 6, backgroundColor: "#F0EBE3", borderRadius: 3, marginTop: 6 }}>
            <div className="dash-bar" style={{
              width: `${progressPct}%`, height: "100%", borderRadius: 3, backgroundColor: progressColor,
            }} />
          </div>
          <p style={{ fontSize: 9, color: "#A8A29E", margin: "5px 0 0" }}>
            {progressPct}% of today's items
          </p>
        </div>

        {/* Top Streak */}
        <div className="dash-card" style={{ ...kpiCard, animationDelay: "0.1s" }}>
          <KpiHeader icon={<Flame size={12} color="#F97316" />} label="Top Streak" />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#F97316", letterSpacing: "-0.02em" }}>
              {bestStreak.streak}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#A8A29E" }}>days</span>
          </div>
          <p style={{ fontSize: 11, color: "#57534E", fontWeight: 600, margin: "5px 0 0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {bestStreak.name}
          </p>
        </div>

        {/* Energy 7d */}
        <div className="dash-card" style={{ ...kpiCard, animationDelay: "0.15s" }}>
          <KpiHeader icon={<TrendingUp size={12} color="#10B981" />} label="Energy · 7d" />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em",
              color: avgEnergy >= 7 ? "#10B981" : avgEnergy >= 5 ? "#F59E0B" : "#EF4444" }}>
              {avgEnergy > 0 ? avgEnergy.toFixed(1) : "—"}
            </span>
            <span style={{ fontSize: 12, color: "#A8A29E", fontWeight: 600 }}>/ 10</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <EnergyBars values={energy} />
          </div>
        </div>

        {/* Goals snapshot */}
        <div className="dash-card" style={{ ...kpiCard, animationDelay: "0.2s" }}>
          <KpiHeader icon={<TargetIcon size={12} color="#7C3AED" />} label="Goals" />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#7C3AED", letterSpacing: "-0.02em" }}>
              {goalsOnTrack}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#A8A29E" }}>/ {goals.length}</span>
          </div>
          <p style={{ fontSize: 11, color: goalsAtRisk > 0 ? "#DC2626" : "#10B981",
            fontWeight: 700, margin: "5px 0 0" }}>
            {goalsAtRisk > 0 ? `${goalsAtRisk} at risk` : "All moving forward"}
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MAIN GRID — Cockpit (left) + Compass (right)
      ───────────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 28px",
        display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)", gap: 16,
      }}>

        {/* ─── LEFT: COCKPIT ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Now / Next event */}
          <Section title="Now & Next" linkHref="/weekly" linkLabel="Open Weekly">
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {currentEvent && (() => {
                const g    = groupMap[currentEvent.groupId];
                const col  = g?.color ?? "#6366F1";
                const meet = extractMeetingUrl(currentEvent.description);
                return (
                  <div className="dash-now-glow" style={{
                    padding: "14px 16px", borderRadius: 12,
                    background: `linear-gradient(135deg, ${col}1f, ${col}0a)`,
                    border: `1.5px solid ${col}50`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div className="dash-pulse-dot" style={{
                      width: 9, height: 9, borderRadius: "50%", backgroundColor: col, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: col,
                        textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                        NOW · {currentEvent.startTime} – {currentEvent.endTime}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", margin: "2px 0 0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {currentEvent.title}
                      </p>
                    </div>
                    {meet && (
                      <a href={meet} target="_blank" rel="noopener noreferrer" style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 8,
                        backgroundColor: "#10B981", border: "none",
                        fontSize: 11, fontWeight: 700, color: "#FFFFFF",
                        textDecoration: "none", flexShrink: 0,
                      }}>
                        <Video size={11} /> Join
                      </a>
                    )}
                  </div>
                );
              })()}

              {upcomingEvents.length === 0 && !currentEvent ? (
                <EmptyHint icon={<Clock size={18} color="#D5C9BC" />} text="No more events today">
                  <Link href="/weekly" style={emptyLink}>Add a time block →</Link>
                </EmptyHint>
              ) : (
                upcomingEvents.map((ev) => {
                  const g    = groupMap[ev.groupId];
                  const col  = g?.color ?? "#6366F1";
                  const meet = extractMeetingUrl(ev.description);
                  return (
                    <div key={ev.id} className="dash-card" style={{
                      padding: "10px 14px", borderRadius: 10,
                      backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{ width: 4, height: 32, borderRadius: 2, backgroundColor: col, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#1C1917", margin: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.title}
                        </p>
                        <p style={{ fontSize: 10, color: "#78716C", margin: "2px 0 0", fontWeight: 600 }}>
                          <Clock size={9} style={{ display: "inline", marginRight: 3 }} />
                          {ev.startTime} – {ev.endTime}
                        </p>
                      </div>
                      {meet && (
                        <a href={meet} target="_blank" rel="noopener noreferrer" style={{
                          padding: "4px 10px", borderRadius: 6, border: "1px solid #BBF7D0",
                          backgroundColor: "#F0FDF4", fontSize: 10, fontWeight: 700,
                          color: "#10B981", textDecoration: "none", flexShrink: 0,
                        }}>
                          <Video size={9} style={{ display: "inline", marginRight: 2 }} />Join
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          {/* Today's Big 3 */}
          <Section title="Today's Big 3"
            linkHref="/daily" linkLabel={planDone ? "Open Daily" : "Set priorities"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {priorities.map((p, idx) => (
                <div key={idx} className="dash-card" style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "11px 13px", borderRadius: 10,
                  backgroundColor: p?.completed ? "#F0FDF4" : "#FFFFFF",
                  border: `1.5px solid ${p?.completed ? "#BBF7D0" : "#EDE5D8"}`,
                  animationDelay: `${idx * 0.05}s`,
                }}>
                  <button onClick={() => p?.text && togglePriority(idx)} disabled={!p?.text}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      border: `2px solid ${p?.completed ? "#16A34A" : p?.text ? "#C8BFB5" : "#E8DDD0"}`,
                      backgroundColor: p?.completed ? "#16A34A" : "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: p?.text ? "pointer" : "default",
                    }}>
                    {p?.completed && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: p?.completed ? "#78716C" : p?.text ? "#1C1917" : "#C4B5A8",
                      textDecoration: p?.completed ? "line-through" : "none",
                      fontStyle: p?.text ? "normal" : "italic",
                    }}>
                      {p?.text || `Priority ${idx + 1} not set`}
                    </span>
                    {p?.lifeArea && p?.text && (
                      <p style={{ fontSize: 10, color: "#A8A29E", margin: "2px 0 0", fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block",
                          backgroundColor: LIFE_AREA_COLORS[p.lifeArea], flexShrink: 0 }} />
                        {p.lifeArea}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: "#A8A29E",
                    backgroundColor: "#F5F0EB", padding: "2px 7px", borderRadius: 6,
                  }}>#{idx + 1}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Today's Habits */}
          <Section title={`Habits Today · ${todayHabits.length}`} linkHref="/habits" linkLabel="Open Habits">
            {todayHabits.length === 0 ? (
              <EmptyHint icon={<Zap size={18} color="#D5C9BC" />} text="No habits scheduled today" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {todayHabits.slice(0, 8).map((h) => {
                  const done   = isHabitDoneOnDate(h, today);
                  const streak = calcStreak(h);
                  return (
                    <button key={h.id} onClick={() => toggleHabitDay(h.id, today)} className="dash-card" style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 10px", borderRadius: 9,
                      border: `1.5px solid ${done ? "#86EFAC" : "#EDE5D8"}`,
                      backgroundColor: done ? "#F0FDF4" : "#FFFFFF",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${done ? "#16A34A" : "#C8BFB5"}`,
                        backgroundColor: done ? "#16A34A" : "#FFFFFF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {done && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600,
                        color: done ? "#15803D" : "#1C1917",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {h.name}
                      </span>
                      {streak > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0,
                          fontSize: 10, fontWeight: 700, color: "#F97316" }}>
                          <Flame size={10} /> {streak}
                        </span>
                      )}
                    </button>
                  );
                })}
                {todayHabits.length > 8 && (
                  <Link href="/habits" style={{
                    gridColumn: "1 / -1", textAlign: "center", padding: "6px",
                    fontSize: 11, color: "#F97316", fontWeight: 700, textDecoration: "none",
                  }}>+{todayHabits.length - 8} more habits →</Link>
                )}
              </div>
            )}
          </Section>

          {/* Urgent Tasks */}
          <Section title={`Urgent Tasks · ${urgentTasks.length}`} linkHref="/tasks" linkLabel="Open Tasks">
            {urgentTasks.length === 0 ? (
              <EmptyHint icon={<CheckSquare size={18} color="#D5C9BC" />} text="No urgent tasks. Breathe." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {urgentTasks.map((t) => {
                  const m       = Q_META[t.quadrant];
                  const days    = daysBetween(t.deadline);
                  const overdue = days < 0;
                  return (
                    <div key={t.id} className="dash-card" style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      border: `1px solid ${overdue ? "#FCA5A5" : "#EDE5D8"}`,
                      borderLeft: `3px solid ${m.color}`,
                    }}>
                      <button onClick={() => closeTask(t.id, "complete")} title="Mark done" style={{
                        width: 20, height: 20, borderRadius: 5, border: "none",
                        backgroundColor: "#F0FDF4", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Check size={11} color="#16A34A" strokeWidth={3} />
                      </button>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: "#1C1917",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {t.title}
                      </span>
                      {t.linkedMilestoneId && (
                        <span title="Milestone-linked" style={{
                          fontSize: 9, fontWeight: 800, color: "#D97706",
                          backgroundColor: "#FFFBEB", padding: "1px 5px", borderRadius: 3,
                          border: "1px solid #FCD34D",
                        }}>◆</span>
                      )}
                      <span style={{
                        fontSize: 9, fontWeight: 700, whiteSpace: "nowrap",
                        color: overdue ? "#DC2626" : "#78716C",
                        backgroundColor: overdue ? "#FEF2F2" : "#F5F5F4",
                        padding: "2px 6px", borderRadius: 4,
                      }}>
                        {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Decision Log */}
          <Section title="Decision Log">
            <div style={{ display: "flex", gap: 8, marginBottom: decisions.length > 0 ? 10 : 0 }}>
              <input
                value={decisionInput}
                onChange={(e) => setDecisionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDecision()}
                placeholder="Capture a decision instantly…"
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 9,
                  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
                  fontSize: 12, color: "#1C1917", outline: "none",
                }}
              />
              <button onClick={addDecision} disabled={!decisionInput.trim()} style={{
                padding: "8px 14px", borderRadius: 9, border: "none",
                background: decisionInput.trim()
                  ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
                color: decisionInput.trim() ? "#FFFFFF" : "#A8A29E",
                cursor: decisionInput.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Plus size={14} /> Log
              </button>
            </div>
            {decisions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {decisions.slice(0, 4).map((dec) => (
                  <div key={dec.id} className="dash-card" style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 8,
                    backgroundColor: dec.made ? "#F0FDF4" : "#FAFAFA",
                    border: `1px solid ${dec.made ? "#BBF7D0" : "#E8DDD0"}`,
                  }}>
                    <button onClick={() => toggleDecision(dec.id)} style={{
                      padding: "2px 8px", borderRadius: 5, border: "none",
                      backgroundColor: dec.made ? "#16A34A" : "#E8DDD0",
                      fontSize: 9, fontWeight: 800,
                      color: dec.made ? "#FFFFFF" : "#78716C",
                      cursor: "pointer", flexShrink: 0,
                    }}>{dec.made ? "✓ Decided" : "? Open"}</button>
                    <span style={{
                      flex: 1, fontSize: 12, color: dec.made ? "#15803D" : "#1C1917",
                      textDecoration: dec.made ? "line-through" : "none",
                    }}>
                      {dec.text}
                    </span>
                  </div>
                ))}
                {decisions.length > 4 && (
                  <Link href="/daily" style={{ fontSize: 11, color: "#F97316",
                    fontWeight: 700, textDecoration: "none", paddingLeft: 4 }}>
                    +{decisions.length - 4} more · Open Daily →
                  </Link>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: "#C4B5A8", fontStyle: "italic", margin: 0 }}>
                No decisions logged today. Capture one above.
              </p>
            )}
          </Section>
        </div>

        {/* ─── RIGHT: COMPASS ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Vision Wheel */}
          <Section title="Vision Balance" linkHref="/vision" linkLabel="Open Canvas">
            <div className="dash-card" style={{
              padding: 16, borderRadius: 12, backgroundColor: "#FFFFFF",
              border: "1px solid #EDE5D8",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <VisionWheel scores={visionScores} size={260} />
              <p style={{ fontSize: 10, color: "#A8A29E", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
                <Compass size={9} style={{ display: "inline", marginRight: 3 }} />
                Real-time balance from goal progress and habit consistency
              </p>
            </div>
          </Section>

          {/* Top Goals */}
          <Section title={`Top Goals · ${goals.length}`} linkHref="/goals" linkLabel="Open Goals">
            {topGoals.length === 0 ? (
              <EmptyHint icon={<TargetIcon size={18} color="#D5C9BC" />} text="No active goals yet">
                <Link href="/goals" style={emptyLink}>Define your first goal →</Link>
              </EmptyHint>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topGoals.map((g, i) => {
                  const days       = daysBetween(g.deadline);
                  const overdue    = days < 0;
                  const milestones = g.milestones ?? [];
                  const nextMs     = milestones.find((m) => !m.completed);
                  const stale      = Math.floor((Date.now() - g.lastMoved) / 86_400_000) >= 14;
                  const barColor   = g.progress >= 80 ? "#10B981" : g.progress >= 40 ? "#F97316" : "#EF4444";
                  return (
                    <Link key={g.id} href="/goals" className="dash-card" style={{
                      padding: "11px 13px", borderRadius: 11,
                      backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8",
                      textDecoration: "none", display: "block",
                      animationDelay: `${i * 0.06}s`,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start",
                        justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <p style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: "#1C1917", margin: 0,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {g.outcome}
                        </p>
                        <span style={{
                          fontSize: 14, fontWeight: 800, color: barColor, flexShrink: 0,
                          letterSpacing: "-0.02em",
                        }}>{g.progress}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, backgroundColor: "#F2EAE0",
                        overflow: "hidden", marginBottom: 7 }}>
                        <div className="dash-bar" style={{
                          height: "100%", width: `${g.progress}%`, borderRadius: 3,
                          background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                        }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8,
                        fontSize: 10, color: "#78716C" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 600,
                          color: overdue ? "#DC2626" : "#78716C" }}>
                          <Clock size={10} />
                          {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                        </span>
                        {nextMs && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 700, color: "#D97706",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                            ◆ Next: <span style={{ color: "#1C1917", fontWeight: 600,
                              overflow: "hidden", textOverflow: "ellipsis" }}>{nextMs.title}</span>
                          </span>
                        )}
                        {stale && (
                          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3,
                            fontSize: 9, fontWeight: 700, color: "#EA580C",
                            backgroundColor: "#FFF7ED", padding: "1px 6px", borderRadius: 4 }}>
                            <AlertTriangle size={9} /> Stale
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Featured Bucket Dream */}
          {featuredBucket && (
            <Section title="On the Horizon" linkHref="/bucket-list" linkLabel="Open Bucket List">
              <div className="dash-card" style={{
                padding: 14, borderRadius: 12,
                background: featuredBucket.status === "achieved"
                  ? "linear-gradient(135deg, #F0FDF4, #ECFDF5)"
                  : featuredBucket.status === "planning"
                  ? "linear-gradient(135deg, #FFF7ED, #FEF3C7)"
                  : "linear-gradient(135deg, #F5F3FF, #FAF5FF)",
                border: `1.5px solid ${featuredBucket.status === "achieved" ? "#BBF7D0"
                  : featuredBucket.status === "planning" ? "#FED7AA" : "#C4B5FD"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                    backgroundColor: LIFE_AREA_COLORS[featuredBucket.lifeArea], flexShrink: 0 }} />
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: featuredBucket.status === "achieved" ? "#15803D"
                      : featuredBucket.status === "planning" ? "#9A3412" : "#5B21B6",
                  }}>
                    {featuredBucket.status === "achieved" ? "✨ Achieved"
                     : featuredBucket.status === "planning" ? "Active Dream" : "Future Dream"}
                  </span>
                  {featuredBucket.targetDate && (
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#78716C", fontWeight: 600 }}>
                      {featuredBucket.targetDate}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", margin: "0 0 4px",
                  lineHeight: 1.35 }}>
                  {featuredBucket.title}
                </p>
                <p style={{ fontSize: 11, color: "#57534E", margin: 0, lineHeight: 1.55,
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {featuredBucket.description}
                </p>
              </div>
            </Section>
          )}

          {/* Yesterday's Reflection */}
          {yestRefl && yestRefl.highlights && (
            <Section title="Yesterday's Echo">
              <div className="dash-card" style={{
                padding: 12, borderRadius: 11, backgroundColor: "#FFFFFF",
                border: "1px solid #EDE5D8",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  {yestRefl.mood && <span style={{ fontSize: 18 }}>{yestRefl.mood}</span>}
                  {yestRefl.energyLevel > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: yestRefl.energyLevel >= 7 ? "#10B981"
                        : yestRefl.energyLevel >= 5 ? "#F59E0B" : "#EF4444",
                      backgroundColor: yestRefl.energyLevel >= 7 ? "#F0FDF4"
                        : yestRefl.energyLevel >= 5 ? "#FFFBEB" : "#FEF2F2",
                      padding: "2px 8px", borderRadius: 4,
                    }}>
                      ⚡ {yestRefl.energyLevel}/10
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "#A8A29E", fontWeight: 600 }}>
                    Yesterday
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#1C1917", margin: 0, lineHeight: 1.55,
                  fontStyle: "italic",
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  &ldquo;{yestRefl.highlights}&rdquo;
                </p>
              </div>
            </Section>
          )}

          {/* Weekly compass */}
          {weekPlan && weekPlan.priorities.length > 0 && (
            <Section title="This Week's Promise" linkHref="/weekly" linkLabel="Open Weekly">
              <div className="dash-card" style={{
                padding: 12, borderRadius: 11, backgroundColor: "#FFFFFF",
                border: "1px solid #EDE5D8",
              }}>
                {weekPlan.priorities.slice(0, 4).map((p, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 0",
                    borderBottom: i < weekPlan.priorities.slice(0, 4).length - 1 ? "1px dashed #F2EAE0" : "none",
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      backgroundColor: "#FFF7ED", color: "#F97316",
                      fontSize: 10, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{i + 1}</span>
                    <p style={{ fontSize: 11, color: "#1C1917", margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      flex: 1, minWidth: 0, fontWeight: 600 }}>
                      {p}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          BOTTOM STRIP — Quote + Quick Access
      ───────────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "8px 28px 28px",
        display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "stretch",
      }}>
        {/* Quote */}
        <div className="dash-card" style={{
          padding: "16px 22px", borderRadius: 14,
          background: "linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)",
          border: "1px solid #FED7AA",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <Sparkles size={22} color="#F97316" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: "#78350F", lineHeight: 1.55,
              fontStyle: "italic", margin: 0, fontWeight: 500 }}>
              &ldquo;{quote.text}&rdquo;
            </p>
            {quote.author && (
              <p style={{ fontSize: 10, color: "#92400E", fontWeight: 800, margin: "5px 0 0",
                letterSpacing: "0.05em", textTransform: "uppercase" }}>
                — {quote.author}
              </p>
            )}
          </div>
        </div>

        {/* Quick access */}
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { href: "/legacy",     icon: Heart,      label: "Legacy",  bg: "#FDF2F8", color: "#DB2777" },
            { href: "/vision",     icon: Eye,        label: "Vision",  bg: "#F0FDF4", color: "#10B981" },
            { href: "/bucket-list",icon: BookOpen,   label: "Bucket",  bg: "#F5F3FF", color: "#7C3AED" },
          ].map(({ href, icon: Icon, label, bg, color }) => (
            <Link key={href} href={href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "12px 18px", borderRadius: 12,
              backgroundColor: bg, border: `1px solid ${color}30`,
              textDecoration: "none", minWidth: 70,
            }}>
              <Icon size={16} color={color} />
              <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {icon}
      <span style={{
        fontSize: 10, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "#78716C",
      }}>{label}</span>
    </div>
  );
}

function Section({ title, children, linkHref, linkLabel }: {
  title: string; children: React.ReactNode;
  linkHref?: string; linkLabel?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 9 }}>
        <p style={{
          fontSize: 11, fontWeight: 800, textTransform: "uppercase",
          letterSpacing: "0.09em", color: "#78716C", margin: 0,
        }}>{title}</p>
        {linkHref && linkLabel && (
          <Link href={linkHref} style={{
            display: "flex", alignItems: "center", gap: 2,
            fontSize: 10, color: "#F97316", fontWeight: 700, textDecoration: "none",
          }}>
            {linkLabel} <ChevronRight size={11} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ icon, text, children }: {
  icon: React.ReactNode; text: string; children?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: 18, borderRadius: 10, textAlign: "center",
      border: "1.5px dashed #E8DDD0", backgroundColor: "#FAFAFA",
    }}>
      <div style={{ display: "inline-block", marginBottom: 4 }}>{icon}</div>
      <p style={{ fontSize: 11, color: "#A8A29E", margin: 0, fontWeight: 600 }}>{text}</p>
      {children && <div style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Style tokens
// ─────────────────────────────────────────────────────────────────────────────

const kpiCard: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  border: "1.5px solid #EDE5D8",
  padding: 14,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

const emptyLink: React.CSSProperties = {
  fontSize: 11, color: "#F97316", fontWeight: 700, textDecoration: "none",
};
