"use client";

import Link from "next/link";
import {
  Compass, Zap, CheckSquare, Flame, Target as TargetIcon,
  ChevronRight, Star, Heart, Sparkles, Eye, Sun,
  ChevronDown, Info, Check, Calendar, ListChecks,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════════════════
// DATA INTERFACES — every value in JSX below flows from props; nothing is
// hardcoded. Connect the data layer in the parent page/layout.
// ══════════════════════════════════════════════════════════════════════════════

export interface GoalItem {
  id:        string;
  title:     string;         // e.g. "BUILD A 6-FIG ONLINE BUSINESS"
  percent:   number;         // 0–100
  status:    "ON TRACK" | "AT RISK" | "OVERDUE";
  dueInDays: number;         // negative = overdue
  color:     string;         // hex, e.g. "#3B82F6"
}

export interface TodayPlanItem {
  id:        string;
  title:     string;         // e.g. "Morning Routine"
  startTime: string;         // e.g. "5:00 AM"
  endTime?:  string;         // e.g. "12:00 PM"
  subItems:  string[];       // e.g. ["Workout", "Meditation", "Journal"]
  done:      boolean;
}

export interface CalendarEvent {
  id:    string;
  date:  string;   // "yyyy-mm-dd"
  time:  string;   // "10:00 AM"
  title: string;
}

export interface HabitItem {
  id:     string;
  name:   string;
  done:   boolean;
  streak: number;
}

export interface TaskItem {
  id:       string;
  title:    string;
  dueLabel: string;   // "Due in 1d", "Due in 2d", etc.
  urgent:   boolean;  // true → render label in orange
}

export interface DashboardShellProps {
  // ── Left sidebar ──────────────────────────────────────────────────────────
  momentumScore:     number | null;
  momentumLabel:     string | null;   // "Strong" | "Keep Building" | "Needs Focus"
  todayFocus:        { completed: number; total: number } | null;
  currentStreak:     number | null;
  weeklyProgress:    { percent: number; bars: number[]; label: string } | null;
  level:             { current: number; max: number; label: string } | null;

  // ── Middle column ─────────────────────────────────────────────────────────
  vision:            { imageUrl: string; caption: string } | null;
  mission:           { imageUrl: string; caption: string } | null;
  goals:             GoalItem[];
  todayPlan:         TodayPlanItem[];
  calendarWeekStart: string;   // ISO "yyyy-mm-dd" of the Monday
  calendarEvents:    CalendarEvent[];
  todayIso:          string;   // ISO "yyyy-mm-dd" of today, for calendar highlight

  // ── Right sidebar ─────────────────────────────────────────────────────────
  dailyAffirmation:  string | null;
  coreValues:        string[];
  habits:            HabitItem[];
  habitStats:        { total: number; completed: number; streak: number; score: number } | null;
  tasks:             TaskItem[];
  taskStats:         { total: number; pending: number; done: number; overdue: number } | null;

  // ── Top nav ───────────────────────────────────────────────────────────────
  userName:          string;   // avatar initials, e.g. "AS"
  currentDate:       string;   // formatted, e.g. "Fri, May 9"
  navLinks:          { label: string; href: string; active?: boolean }[];

  // ── Callbacks — shell only, connect in the parent page ───────────────────
  onNewAffirmation?: () => void;             // TODO: POST /api/affirmations/new
  onToggleHabit?:    (id: string) => void;   // TODO: PATCH /api/habits/:id/toggle
  onTogglePlanItem?: (id: string) => void;   // TODO: PATCH /api/plan/:id/toggle
  onViewVision?:     () => void;             // TODO: navigate to /vision
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function dayNumber(iso: string): number {
  return new Date(iso + "T00:00:00").getDate();
}

function Card({
  children,
  style,
  className = "",
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#EBEBEB] p-3 ${className}`}
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)", ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <p className="text-[10px] font-extrabold text-[#57534E] uppercase tracking-[0.08em] m-0">
        {title}
      </p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[9px] font-extrabold text-[#EA580C] uppercase tracking-wider"
      style={{
        background: "rgba(249,115,22,0.10)",
        border: "1px solid rgba(249,115,22,0.22)",
        padding: "3px 9px",
        borderRadius: 20,
      }}
    >
      {children}
    </span>
  );
}

function StatTile({
  label,
  value,
  color = "#1C1917",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex-1 text-center rounded-lg py-1.5 px-1 bg-[#FAFAF9] border border-[#F0EBE3]">
      <p className="text-[8px] font-extrabold text-[#57534E] uppercase tracking-wider leading-none">
        {label}
      </p>
      <p
        className="text-[15px] font-extrabold leading-tight mt-0.5"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

function MomentumGauge({ score }: { score: number }) {
  const size   = 80;
  const r      = 30;
  const c      = size / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="#F0EBE3" strokeWidth={6} />
      <circle
        cx={c} cy={c} r={r} fill="none" stroke="#f97316" strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x={c} y={c} textAnchor="middle" dominantBaseline="middle"
        fontSize={15} fontWeight={800} fill="#1C1917"
      >
        {score}%
      </text>
    </svg>
  );
}

function WeekBars({ bars }: { bars: number[] }) {
  const maxVal = Math.max(...bars, 1);
  const maxH   = 30;
  return (
    <div className="flex items-end gap-[3px]">
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-[10px] rounded-sm bg-green-500"
          style={{ height: Math.max(4, Math.round((v / maxVal) * maxH)) }}
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const WEEK_DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export default function DashboardShell({
  momentumScore, momentumLabel,
  todayFocus, currentStreak, weeklyProgress, level,
  vision, mission, goals, todayPlan,
  calendarWeekStart, calendarEvents, todayIso,
  dailyAffirmation, coreValues,
  habits, habitStats, tasks, taskStats,
  userName, currentDate, navLinks,
  onNewAffirmation, onToggleHabit, onTogglePlanItem, onViewVision,
}: DashboardShellProps) {

  const weekDates = WEEK_DAY_NAMES.map((_, i) => addDays(calendarWeekStart, i));

  return (
    <div
      className="flex flex-col h-screen overflow-hidden bg-[#FAF5EE]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP NAV
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav
        className="flex items-center gap-4 px-5 shrink-0 z-20"
        style={{ height: 56, backgroundColor: "#f97316" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 34, height: 34, background: "rgba(255,255,255,0.2)" }}
          >
            <Compass size={19} color="white" />
          </div>
          <span className="text-white font-bold text-[15px] whitespace-nowrap">
            Life By Design
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded text-[13px] font-semibold
                ${link.active
                  ? "text-white underline underline-offset-[5px] decoration-2"
                  : "text-white/80 hover:text-white"}
              `}
            >
              {link.label}
            </Link>
          ))}
          {/* TODO: onClick → open "More" dropdown menu */}
          <button className="flex items-center gap-0.5 px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:text-white whitespace-nowrap">
            More <ChevronDown size={13} />
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2.5 ml-auto shrink-0">
          <div
            className="flex items-center gap-1.5 text-white text-[12px] font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <Calendar size={12} />
            {currentDate}
          </div>
          {/* TODO: onClick → toggle dark/light mode */}
          <button
            className="flex items-center justify-center rounded-full text-white hover:bg-white/25 transition-colors"
            style={{ width: 32, height: 32, background: "rgba(255,255,255,0.15)" }}
          >
            <Sun size={15} />
          </button>
          {/* TODO: onClick → open user profile/settings menu */}
          <div
            className="flex items-center justify-center rounded-full font-bold text-[#f97316] text-[13px] shrink-0 select-none cursor-pointer"
            style={{ width: 32, height: 32, backgroundColor: "#FFFFFF" }}
          >
            {userName}
          </div>
        </div>
      </nav>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BODY — 3 columns
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-1 min-h-0 gap-3 p-3 overflow-hidden">

        {/* ──────────────────────────────────────────────────────────────────
            LEFT SIDEBAR
        ────────────────────────────────────────────────────────────────── */}
        <aside className="w-[220px] shrink-0 flex flex-col gap-3 overflow-y-auto pb-2">

          {/* MY MOMENTUM */}
          <Card>
            <SectionLabel icon={<Zap size={12} color="#f97316" />} title="My Momentum" />
            <div className="flex items-center gap-3 mt-3">
              {momentumScore === null ? (
                <Skeleton className="w-[80px] h-[80px] rounded-full" />
              ) : (
                <MomentumGauge score={momentumScore} />
              )}
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#f97316] leading-tight">
                  Momentum Score
                </p>
                {momentumLabel === null ? (
                  <Skeleton className="mt-1 h-3 w-16" />
                ) : (
                  <p className="text-[11px] text-[#57534E] font-semibold mt-1">
                    {momentumLabel}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* TODAY FOCUS */}
          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel icon={<CheckSquare size={12} color="#7C3AED" />} title="Today Focus" />
              {/* TODO: onClick → show calculation info tooltip */}
              <button className="text-[#78716C] hover:text-[#1C1917] transition-colors">
                <Info size={12} />
              </button>
            </div>
            {todayFocus === null ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-2 w-full" />
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border-[2.5px] border-[#7C3AED] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-extrabold text-[#1C1917] leading-none">
                      {todayFocus.completed}
                    </span>
                    <span className="text-[14px] font-bold text-[#57534E]">
                      / {todayFocus.total}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#57534E] font-medium mt-1.5">
                  Tasks completed
                </p>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-[#EDE9FE]">
                  <div
                    className="h-full rounded-full bg-[#7C3AED] transition-all duration-700"
                    style={{
                      width: `${todayFocus.total === 0 ? 0 : Math.round((todayFocus.completed / todayFocus.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {/* TODO: onClick → navigate to /tasks?filter=today */}
            <Link
              href="/tasks"
              className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#7C3AED] hover:text-[#5B21B6]"
            >
              View Today&apos;s Tasks <ChevronRight size={11} />
            </Link>
          </Card>

          {/* CURRENT STREAK */}
          <Card>
            <SectionLabel icon={<Flame size={12} color="#f97316" />} title="Current Streak" />
            {currentStreak === null ? (
              <Skeleton className="mt-2 h-10 w-16" />
            ) : (
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[36px] font-extrabold text-[#f97316] leading-none">
                    {currentStreak}
                  </span>
                  <span className="text-[14px] font-bold text-[#57534E]">
                    {currentStreak === 1 ? "day" : "days"}
                  </span>
                </div>
                <p className="text-[10px] text-[#57534E] font-semibold mt-1">
                  {currentStreak > 0 ? "Keep it going!" : "Start a streak today"}
                </p>
              </div>
            )}
          </Card>

          {/* WEEKLY PROGRESS */}
          <Card>
            <SectionLabel title="Weekly Progress" />
            {weeklyProgress === null ? (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-[32px] font-extrabold text-green-600 leading-none">
                  {weeklyProgress.percent}%
                </p>
                <div className="mt-2.5">
                  <WeekBars bars={weeklyProgress.bars} />
                </div>
                <p className="text-[10px] text-[#57534E] font-semibold mt-2">
                  {weeklyProgress.label}
                </p>
              </div>
            )}
          </Card>

          {/* LEVEL */}
          <Card>
            <SectionLabel title="Level" />
            {level === null ? (
              <Skeleton className="mt-2 h-10 w-24" />
            ) : (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <Star size={22} fill="#f97316" color="#f97316" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-extrabold text-[#1C1917] leading-none">
                      {level.current}
                    </span>
                    <span className="text-[14px] font-bold text-[#57534E]">
                      / {level.max}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#57534E] font-semibold mt-1.5">
                  {level.label}
                </p>
              </div>
            )}
          </Card>

          {/* Encryption pills */}
          <div className="px-1 pb-1">
            <div className="flex gap-2 mb-1.5">
              <Chip>AES-256</Chip>
              <Chip>END-TO-END</Chip>
            </div>
            <p className="text-[10px] text-[#78716C]">Only you can read this.</p>
          </div>
        </aside>

        {/* ──────────────────────────────────────────────────────────────────
            MIDDLE COLUMN
        ────────────────────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-3 overflow-y-auto pb-2">

          {/* VISION & MISSION */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel
                icon={<Sparkles size={12} color="#f97316" />}
                title="Vision &amp; Mission"
              />
              {/* TODO: onClick → navigate to /vision */}
              <button
                onClick={onViewVision}
                className="text-[11px] font-bold text-[#f97316] hover:underline"
              >
                View all Vision
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">

              {/* Vision card */}
              <div className="relative rounded-xl overflow-hidden bg-[#1C1917]" style={{ aspectRatio: "4/3" }}>
                {vision?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vision.imageUrl} alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#78716C] text-[11px] font-semibold">
                    No vision image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {/* TODO: onClick → open vision full-screen preview */}
                <button className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
                  <Eye size={13} color="white" />
                </button>
                <div className="absolute bottom-2.5 left-3 right-8 z-10">
                  <p className="text-[8.5px] font-bold text-[#FCD9B6] uppercase tracking-wider">
                    Vision
                  </p>
                  <p className="text-[13px] font-bold text-white leading-tight mt-0.5 truncate">
                    {vision?.caption ?? "—"}
                  </p>
                </div>
              </div>

              {/* Mission card */}
              <div className="relative rounded-xl overflow-hidden bg-[#1C1917]" style={{ aspectRatio: "4/3" }}>
                {mission?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mission.imageUrl} alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#78716C] text-[11px] font-semibold">
                    No mission image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 z-10">
                  <p className="text-[8.5px] font-bold text-[#FCD9B6] uppercase tracking-wider">
                    Mission
                  </p>
                  <p className="text-[13px] font-bold text-white leading-tight mt-0.5 truncate">
                    {mission?.caption ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* GOALS TRACKER */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel
                icon={<TargetIcon size={12} color="#7C3AED" />}
                title="Goals Tracker"
              />
              {/* TODO: onClick → navigate to /goals */}
              <Link href="/goals" className="text-[11px] font-bold text-[#f97316] hover:underline">
                View all Goals
              </Link>
            </div>
            {goals.length === 0 ? (
              <p className="text-[11px] text-[#78716C] italic py-2">No goals yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {goals.map((g) => (
                  <div key={g.id} style={{ paddingLeft: 12, borderLeft: `4px solid ${g.color}` }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="flex-1 min-w-0 text-[11px] font-extrabold text-[#1C1917] uppercase tracking-wide truncate">
                        {g.title}
                      </p>
                      <span
                        className="text-[15px] font-extrabold shrink-0"
                        style={{ color: g.color }}
                      >
                        {g.percent}%
                      </span>
                      <span className={`
                        text-[9px] font-bold shrink-0 px-2 py-0.5 rounded-sm
                        ${g.status === "ON TRACK"
                          ? "text-blue-700 bg-blue-50 border border-blue-200"
                          : g.status === "AT RISK"
                          ? "text-amber-700 bg-amber-50 border border-amber-200"
                          : "text-red-700 bg-red-50 border border-red-200"}
                      `}>
                        {g.status}
                      </span>
                      <span className="text-[10px] text-[#57534E] font-medium shrink-0 whitespace-nowrap">
                        {g.dueInDays < 0
                          ? `${-g.dueInDays}d overdue`
                          : `Due in ${g.dueInDays} days`}
                      </span>
                      {/* TODO: onClick → expand goal detail / navigate to /goals/:id */}
                      <ChevronRight size={13} color="#A8A29E" className="shrink-0" />
                    </div>
                    <div className="mt-1.5 h-[5px] rounded-full overflow-hidden bg-[#F0EBE3]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${g.percent}%`, backgroundColor: g.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* MY PLAN (TODAY) */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel
                icon={<ListChecks size={12} color="#0D9488" />}
                title="My Plan (Today)"
              />
              {/* TODO: onClick → navigate to /weekly or /calendar */}
              <Link href="/weekly" className="text-[11px] font-bold text-[#f97316] hover:underline">
                View Calendar
              </Link>
            </div>
            {todayPlan.length === 0 ? (
              <p className="text-[11px] text-[#78716C] italic py-2">No plan for today.</p>
            ) : (
              <div className="flex flex-col">
                {todayPlan.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 py-2.5 ${
                      idx < todayPlan.length - 1 ? "border-b border-[#F0EBE3]" : ""
                    }`}
                  >
                    {/* TODO: onClick → PATCH /api/plan/:id/toggle */}
                    <button
                      onClick={() => onTogglePlanItem?.(item.id)}
                      className="mt-0.5 shrink-0"
                    >
                      {item.done ? (
                        <div className="w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center">
                          <Check size={11} color="white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-[#C4B5A8]" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      {/* Title row — append startTime inline when subItems present */}
                      <p className={`text-[12px] font-semibold leading-tight ${
                        item.done
                          ? "text-[#16A34A]"
                          : item.subItems.length > 0
                          ? "text-[#f97316]"
                          : "text-[#1C1917]"
                      }`}>
                        {item.title}
                        {item.subItems.length > 0 && item.startTime && (
                          <span className={item.done ? "" : "text-[#16A34A]"}>
                            {" "}- {item.startTime}
                          </span>
                        )}
                      </p>
                      {/* Sub-items as bullet row */}
                      {item.subItems.length > 0 && (
                        <p className="text-[10px] text-[#78716C] mt-0.5">
                          {item.subItems.join(" • ")}
                        </p>
                      )}
                      {/* Time range when no sub-items */}
                      {item.subItems.length === 0 && (item.startTime || item.endTime) && (
                        <p className="text-[10px] text-[#78716C] mt-0.5">
                          {item.startTime}
                          {item.endTime && ` – ${item.endTime}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* CALENDAR · THIS WEEK */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel
                icon={<Calendar size={12} color="#0D9488" />}
                title="Calendar · This Week"
              />
              {/* TODO: onClick → navigate to /calendar */}
              <Link href="/weekly" className="text-[11px] font-bold text-[#0D9488] hover:underline">
                View Calendar
              </Link>
            </div>
            <div
              className="flex border border-[#E5E7EB] rounded-xl overflow-hidden"
              style={{ minHeight: 120 }}
            >
              {weekDates.map((date, i) => {
                const isToday   = date === todayIso;
                const dayEvents = calendarEvents.filter(e => e.date === date);
                return (
                  <div
                    key={date}
                    className={`flex-1 min-w-0 flex flex-col ${
                      i < 6 ? "border-r border-[#E5E7EB]" : ""
                    } ${isToday ? "bg-[#FFF7ED]" : ""}`}
                  >
                    {/* Day header */}
                    <div
                      className={`py-1.5 px-1 text-center border-b border-[#E5E7EB] ${
                        isToday ? "bg-[#f97316]" : ""
                      }`}
                    >
                      <p className={`text-[8px] font-extrabold uppercase tracking-wider leading-none ${
                        isToday ? "text-white" : "text-[#57534E]"
                      }`}>
                        {WEEK_DAY_NAMES[i]}
                      </p>
                      <p className={`text-[14px] font-extrabold leading-tight mt-0.5 ${
                        isToday ? "text-white" : "text-[#1C1917]"
                      }`}>
                        {dayNumber(date)}
                      </p>
                    </div>
                    {/* Events */}
                    <div className="flex-1 p-1 flex flex-col gap-1 overflow-hidden">
                      {dayEvents.map(ev => (
                        <div key={ev.id} className="min-w-0">
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] shrink-0" />
                            <p className="text-[8px] font-bold text-[#f97316] truncate leading-none">
                              {ev.time}
                            </p>
                          </div>
                          <p className="text-[9px] font-semibold text-[#1C1917] truncate leading-tight mt-0.5">
                            {ev.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </main>

        {/* ──────────────────────────────────────────────────────────────────
            RIGHT SIDEBAR
        ────────────────────────────────────────────────────────────────── */}
        <aside className="w-[270px] shrink-0 flex flex-col gap-3 overflow-y-auto pb-2">

          {/* DAILY AFFIRMATION */}
          <Card style={{ backgroundColor: "#FFFCF7", borderColor: "#FED7AA" }}>
            <SectionLabel
              icon={
                <span className="text-[20px] leading-none font-serif font-bold text-[#f97316]">
                  &ldquo;
                </span>
              }
              title="Daily Affirmation"
            />
            <div className="mt-3 mb-4" style={{ minHeight: 52 }}>
              {dailyAffirmation === null ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ) : (
                <p className="text-[12.5px] font-medium text-[#1C1917] leading-[1.6] italic">
                  &ldquo;{dailyAffirmation}&rdquo;
                </p>
              )}
            </div>
            {/* TODO: onClick → POST /api/affirmations/new */}
            <button
              onClick={onNewAffirmation}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold hover:bg-orange-600 transition-colors"
              style={{ backgroundColor: "#f97316" }}
            >
              <Sparkles size={13} />
              New Affirmation
            </button>
          </Card>

          {/* CORE VALUES */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel icon={<Heart size={12} color="#DB2777" />} title="Core Values" />
              {/* TODO: onClick → navigate to /values */}
              <Link href="/values" className="text-[11px] font-bold text-[#f97316] hover:underline">
                View all
              </Link>
            </div>
            {coreValues.length === 0 ? (
              <p className="text-[11px] text-[#78716C] italic">No values set yet.</p>
            ) : (
              <p className="text-[11px] text-[#44403C] font-semibold leading-relaxed">
                {coreValues.join(" • ")}
              </p>
            )}
          </Card>

          {/* HABIT TRACKER */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel icon={<Flame size={12} color="#EA580C" />} title="Habit Tracker" />
              {/* TODO: onClick → navigate to /habits */}
              <Link href="/habits" className="text-[11px] font-bold text-[#7C3AED] hover:underline">
                Details
              </Link>
            </div>
            {/* Stats row */}
            {habitStats === null ? (
              <div className="flex gap-1.5 mb-3">
                {[0, 1, 2, 3].map(i => <Skeleton key={i} className="flex-1 h-10 rounded-lg" />)}
              </div>
            ) : (
              <div className="flex gap-1.5 mb-3">
                <StatTile label="Total"     value={habitStats.total}          />
                <StatTile label="Completed" value={habitStats.completed}      color="#16A34A" />
                <StatTile label="Streak"    value={habitStats.streak}         color="#f97316" />
                <StatTile label="Score"     value={`${habitStats.score}%`}    color="#7C3AED" />
              </div>
            )}
            {/* Habit list */}
            <div className="flex flex-col gap-1.5">
              {habits.length === 0 && (
                <p className="text-[11px] text-[#78716C] italic">No habits yet.</p>
              )}
              {habits.map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  {/* TODO: onClick → PATCH /api/habits/:id/toggle */}
                  <button onClick={() => onToggleHabit?.(h.id)} className="shrink-0">
                    {h.done ? (
                      <div className="w-5 h-5 rounded-full bg-[#16A34A] flex items-center justify-center">
                        <Check size={11} color="white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#C4B5A8]" />
                    )}
                  </button>
                  <span className={`flex-1 min-w-0 text-[11px] font-semibold truncate ${
                    h.done ? "text-[#15803D] line-through" : "text-[#1C1917]"
                  }`}>
                    {h.name}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {h.streak > 0 && <Flame size={10} color="#f97316" />}
                    <span className={`text-[11px] font-bold ${
                      h.streak > 0 ? "text-[#EA580C]" : "text-[#78716C]"
                    }`}>
                      {h.streak}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* TASK TRACKER */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel icon={<CheckSquare size={12} color="#EA580C" />} title="Task Tracker" />
              {/* TODO: onClick → navigate to /tasks */}
              <Link href="/tasks" className="text-[11px] font-bold text-[#DC2626] hover:underline">
                View all
              </Link>
            </div>
            {/* Stats row */}
            {taskStats === null ? (
              <div className="flex gap-1.5 mb-3">
                {[0, 1, 2, 3].map(i => <Skeleton key={i} className="flex-1 h-10 rounded-lg" />)}
              </div>
            ) : (
              <div className="flex gap-1.5 mb-3">
                <StatTile label="Total"   value={taskStats.total}              />
                <StatTile label="Pending" value={taskStats.pending}  color="#EA580C" />
                <StatTile label="Done"    value={taskStats.done}     color="#16A34A" />
                <StatTile label="Overdue" value={taskStats.overdue}  color="#DC2626" />
              </div>
            )}
            {/* Top pending tasks */}
            <p className="text-[9px] font-extrabold text-[#EA580C] uppercase tracking-wider mb-2">
              Top 3 pending tasks
            </p>
            <div className="flex flex-col gap-2">
              {tasks.length === 0 && (
                <p className="text-[11px] text-[#78716C] italic">No pending tasks.</p>
              )}
              {tasks.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  {/* TODO: onClick → PATCH /api/tasks/:id/complete */}
                  <div className="w-4 h-4 rounded-full border-[1.5px] border-[#C4B5A8] shrink-0" />
                  <span className="flex-1 min-w-0 text-[11px] font-semibold text-[#1C1917] truncate">
                    {t.title}
                  </span>
                  <span className={`text-[10px] font-bold shrink-0 whitespace-nowrap ${
                    t.urgent ? "text-[#EA580C]" : "text-[#78716C]"
                  }`}>
                    {t.dueLabel}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
