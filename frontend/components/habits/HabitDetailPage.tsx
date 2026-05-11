"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, Flame, Clock, Activity, Briefcase, TrendingUp,
  Sparkles, User, Users, Heart, LayoutGrid, Zap, CheckCircle2, Lock, Info,
} from "lucide-react";
import type { HabitData, LifeArea } from "./HabitCard";
import { AREA_META, FREQ_LABEL, toLocalDate, isScheduledDay, isHabitDoneOnDate } from "./HabitCard";

// ── Area icons ────────────────────────────────────────────────────────────────

type LIcon = React.ComponentType<{ size?: number; color?: string }>;
const AREA_ICONS: Record<LifeArea, LIcon> = {
  health:        Activity,
  professional:  Briefcase,
  wealth:        TrendingUp,
  spiritual:     Sparkles,
  personal:      User,
  relationships: Users,
  contribution:  Heart,
};

// ── Habit health ──────────────────────────────────────────────────────────────

type HabitHealth = "Excellent" | "Good" | "Needs Work" | "At Risk" | "New";

const HABIT_HEALTH_COLOR: Record<HabitHealth, string> = {
  "Excellent":  "#16A34A",
  "Good":       "#2563EB",
  "Needs Work": "#F97316",
  "At Risk":    "#DC2626",
  "New":        "#0891B2",
};
const HABIT_HEALTH_BG: Record<HabitHealth, string> = {
  "Excellent":  "#F0FDF4",
  "Good":       "#EFF6FF",
  "Needs Work": "#FFF7ED",
  "At Risk":    "#FEF2F2",
  "New":        "#ECFEFF",
};
const HABIT_HEALTH_DESC: Record<HabitHealth, string> = {
  "Excellent":  "Outstanding consistency. You're building a strong habit!",
  "Good":       "You're progressing well. Stay consistent.",
  "Needs Work": "Consistency is slipping. Recommit this week.",
  "At Risk":    "This habit needs urgent attention. Start small and rebuild.",
  "New":        "You're just getting started — keep showing up every day!",
};

function calcHabitHealth(score: number, scheduledCount: number): HabitHealth {
  if (scheduledCount < 14) return "New";
  if (score >= 75) return "Excellent";
  if (score >= 50) return "Good";
  if (score >= 25) return "Needs Work";
  return "At Risk";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtShort(ds: string) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" });
}

function getFreqParams(habit: HabitData): { num: number; den: number } {
  if (habit.frequency === "daily")    return { num: 1, den: 1 };
  let num: number, den: number;
  if      (habit.frequency === "weekdays") { num = 5; den = 7; }
  else if (habit.frequency === "weekends") { num = 2; den = 7; }
  else { num = Math.max(1, habit.customDays.length); den = 7; }
  // Non-daily binary habits: double num/den to smooth irregular schedules
  if (habit.type === "binary") { num *= 2; den *= 2; }
  return { num, den };
}

function weekCount(habit: HabitData, monday: Date): number {
  let count = 0;
  const todayStr = toLocalDate();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const ds = toLocalDate(d);
    if (ds > todayStr) break;
    if (isHabitDoneOnDate(habit, ds)) count++;
  }
  return count;
}

function calcAllStreaks(habit: HabitData) {
  const today      = new Date();
  const createdDay = new Date(new Date(habit.createdAt).toDateString());
  const allDates   = habit.type === "binary"
    ? habit.completions
    : Object.keys(habit.measurements);
  const earliestLogged = allDates.length > 0 ? allDates.reduce((a, b) => a < b ? a : b) : null;
  const fromDay = earliestLogged && earliestLogged < toLocalDate(createdDay)
    ? new Date(earliestLogged + "T00:00:00")
    : new Date(createdDay);
  const list: { start: string; end: string; len: number }[] = [];
  let start: string | null = null, last: string | null = null, len = 0;
  for (let d = new Date(fromDay); d <= today; d.setDate(d.getDate() + 1)) {
    const isBeforeCreation = d < createdDay;
    if (!isBeforeCreation && !isScheduledDay(habit.frequency, habit.customDays, d.getDay())) continue;
    const ds = toLocalDate(d);
    if (isHabitDoneOnDate(habit, ds)) {
      if (!start) start = ds;
      last = ds; len++;
    } else if (len > 0) {
      list.push({ start: start!, end: last!, len });
      start = null; last = null; len = 0;
    }
  }
  if (len > 0) list.push({ start: start!, end: last!, len });
  return list.filter(s => s.len > 1).sort((a, b) => b.len - a.len).slice(0, 10);
}

function buildCalWeeks(habit: HabitData, minWeeks = 26): Array<Array<{ ds: string; inRange: boolean }>> {
  const todayStr   = toLocalDate();
  const today      = new Date();
  const createdDay = new Date(new Date(habit.createdAt).toDateString());
  const from       = new Date(createdDay);
  const dow        = from.getDay();
  from.setDate(from.getDate() - (dow === 0 ? 6 : dow - 1));
  const weeksSpanned = Math.ceil((today.getTime() - from.getTime()) / (7 * 86400000)) + 1;
  if (weeksSpanned < minWeeks)
    from.setDate(from.getDate() - (minWeeks - weeksSpanned) * 7);

  const weeks: Array<Array<{ ds: string; inRange: boolean }>> = [];
  const cur = new Date(from);
  while (toLocalDate(cur) <= todayStr) {
    const week: Array<{ ds: string; inRange: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      const ds = toLocalDate(cur);
      week.push({ ds, inRange: cur >= createdDay && ds <= todayStr });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const FREQ_MIN_MONTHS = 12;

function buildFreqMatrix(habit: HabitData) {
  const today      = new Date();
  const createdDay = new Date(new Date(habit.createdAt).toDateString());
  const allDates   = habit.type === "binary" ? habit.completions : Object.keys(habit.measurements);
  const earliestLogged = allDates.length > 0 ? allDates.reduce((a, b) => a < b ? a : b) : null;
  const fromDay    = earliestLogged && earliestLogged < toLocalDate(createdDay)
    ? new Date(earliestLogged + "T00:00:00")
    : new Date(createdDay);
  const minStart   = new Date(today.getFullYear(), today.getMonth() - (FREQ_MIN_MONTHS - 1), 1);
  const startM     = fromDay < minStart ? fromDay : minStart;
  const months: string[] = [];
  const d = new Date(startM.getFullYear(), startM.getMonth(), 1);
  while (d <= today) { months.push(toLocalDate(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); }
  const mat: number[][] = Array.from({ length: 7 }, () => new Array(months.length).fill(0));
  for (let day = new Date(fromDay); day <= today; day.setDate(day.getDate() + 1)) {
    const ds = toLocalDate(day);
    if (!isHabitDoneOnDate(habit, ds)) continue;
    const mIdx = months.indexOf(ds.slice(0, 7));
    if (mIdx >= 0) mat[day.getDay()][mIdx]++;
  }
  return { mat, months };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, color, children, action, titleExtra, style, className }: {
  title: string; color: string; children: ReactNode; action?: ReactNode; titleExtra?: ReactNode; style?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={className} style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8DDD0", padding: "20px", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {title}
          </p>
          {titleExtra}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  habit: HabitData | null;
  onClose: () => void;
  onToggleDate: (id: string, date: string) => void;
}

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_JS     = [1, 2, 3, 4, 5, 6, 0];

export default function HabitDetailPage({ habit, onClose, onToggleDate }: Props) {
  const calScrollRef   = useRef<HTMLDivElement>(null);
  const histScrollRef  = useRef<HTMLDivElement>(null);
  const freqScrollRef  = useRef<HTMLDivElement>(null);
  const scoreScrollRef = useRef<HTMLDivElement>(null);

  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [histPeriod,  setHistPeriod]  = useState<"week" | "month">("week");
  type ScorePeriod = "day" | "week" | "month" | "quarter" | "year";
  const [scorePeriod, setScorePeriod] = useState<ScorePeriod>("month");
  const [scoreContainerW, setScoreContainerW] = useState(0);
  useEffect(() => {
    if (scoreScrollRef.current) setScoreContainerW(scoreScrollRef.current.clientWidth);
  }, [habit, scorePeriod]);

  const [freqContainerW, setFreqContainerW] = useState(0);
  useEffect(() => {
    if (freqScrollRef.current) setFreqContainerW(freqScrollRef.current.clientWidth);
  }, [habit]);

  const [calContainerW, setCalContainerW] = useState(0);
  useEffect(() => {
    if (calScrollRef.current) setCalContainerW(calScrollRef.current.clientWidth);
  }, [habit]);

  useEffect(() => {
    if (!habit) return;
    [calScrollRef, histScrollRef, freqScrollRef, scoreScrollRef].forEach(r => {
      if (r.current) r.current.scrollLeft = r.current.scrollWidth;
    });
  }, [habit]);

  const data = useMemo(() => {
    if (!habit) return null;
    const today      = new Date();
    const todayStr   = toLocalDate();
    const createdDay = new Date(new Date(habit.createdAt).toDateString());

    // Frequency-aware EMA — multiplier + rolling window checkmark value
    const allLoggedDates = habit.type === "binary" ? habit.completions : Object.keys(habit.measurements);
    const earliestLogged = allLoggedDates.length > 0 ? allLoggedDates.reduce((a, b) => a < b ? a : b) : null;
    const emaFromDay = earliestLogged && earliestLogged < toLocalDate(createdDay)
      ? new Date(earliestLogged + "T00:00:00")
      : new Date(createdDay);

    const { num: freqNum, den: freqDen } = getFreqParams(habit);
    const freq       = freqNum / freqDen;
    const multiplier = Math.pow(0.5, Math.sqrt(freq) / 13.0);

    const dailyEMA: { ds: string; score: number }[] = [];
    {
      let score = 0;
      for (let d = new Date(emaFromDay); toLocalDate(d) <= todayStr; d.setDate(d.getDate() + 1)) {
        const ds = toLocalDate(d);
        const isBeforeCreation = d < createdDay;

        if (isBeforeCreation) {
          // Pre-creation: full hit if toggled, no update otherwise
          if (isHabitDoneOnDate(habit, ds))
            score = score * multiplier + (1 - multiplier);
        } else if (isScheduledDay(habit.frequency, habit.customDays, d.getDay())) {
          let cv = 0;
          if (habit.type === "binary") {
            let count = 0;
            for (let w = 0; w < freqDen; w++) {
              const wd = new Date(d.getTime() - w * 86400000);
              if (isHabitDoneOnDate(habit, toLocalDate(wd))) count++;
            }
            cv = Math.min(1, count / freqNum);
          } else {
            let sum = 0;
            for (let w = 0; w < freqDen; w++) {
              const wd = new Date(d.getTime() - w * 86400000);
              sum += habit.measurements[toLocalDate(wd)] ?? 0;
            }
            cv = Math.min(1, sum / habit.target);
          }
          score = score * multiplier + cv * (1 - multiplier);
        }

        dailyEMA.push({ ds, score: Math.round(score * 100) });
      }
    }

    // Current streak
    let currentStreak = 0;
    for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
      const ds = toLocalDate(d);
      if (ds < toLocalDate(createdDay)) break;
      if (!isScheduledDay(habit.frequency, habit.customDays, d.getDay())) continue;
      if (!isHabitDoneOnDate(habit, ds)) break;
      currentStreak++;
    }

    // Weekly bars — at least 26 weeks
    type WeekBar = { label: string; count: number; isMonthStart: boolean };
    const wBars: WeekBar[] = [];
    const capStart   = new Date(today); capStart.setDate(today.getDate()  - 52 * 7);
    const minWStart  = new Date(today); minWStart.setDate(today.getDate() - 26 * 7);
    const rawWStart  = createdDay.getTime() < minWStart.getTime() ? new Date(createdDay) : new Date(minWStart);
    const wFrom      = rawWStart.getTime() > capStart.getTime()   ? rawWStart            : new Date(capStart);
    const wDow       = wFrom.getDay();
    wFrom.setDate(wFrom.getDate() - (wDow === 0 ? 6 : wDow - 1));
    let prevWMonth = -1, prevWYear = -1;
    for (let d = new Date(wFrom); d <= today; d.setDate(d.getDate() + 7)) {
      const m = d.getMonth(), y = d.getFullYear();
      const isMonthStart = m !== prevWMonth;
      let label: string;
      if (isMonthStart) {
        const mn = d.toLocaleDateString("en-US", { month: "short" });
        label = y !== prevWYear && prevWYear !== -1 ? `${mn} ${y}` : mn;
      } else {
        label = String(d.getDate());
      }
      wBars.push({ label, count: weekCount(habit, new Date(d)), isMonthStart });
      prevWMonth = m; prevWYear = y;
    }

    // Monthly bars — always 12
    const mBars: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const lastDay = i === 0 ? today.getDate() : new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      let count = 0;
      for (let day = 1; day <= lastDay; day++) {
        const ds = toLocalDate(new Date(d.getFullYear(), d.getMonth(), day));
        if (isHabitDoneOnDate(habit, ds)) count++;
      }
      mBars.push({ label: d.toLocaleDateString("en-US", { month: "short" }), count });
    }

    // Overview stats from dailyEMA
    const scoreNow = dailyEMA.length > 0 ? dailyEMA[dailyEMA.length - 1].score : 0;
    const cy = today.getFullYear(), cm = today.getMonth();
    const prevMonthEndStr = toLocalDate(new Date(cy, cm, 0));
    let scorePrevM = 0;
    for (let i = dailyEMA.length - 1; i >= 0; i--) {
      if (dailyEMA[i].ds <= prevMonthEndStr) { scorePrevM = dailyEMA[i].score; break; }
    }
    const monthDelta = scoreNow - scorePrevM;
    const yearStartStr = `${cy - 1}-12-31`;
    let scoreYearStart = 0;
    for (let i = dailyEMA.length - 1; i >= 0; i--) {
      if (dailyEMA[i].ds <= yearStartStr) { scoreYearStart = dailyEMA[i].score; break; }
    }
    const yearDelta = scoreNow - scoreYearStart;

    const total = habit.type === "binary"
      ? habit.completions.length
      : Object.values(habit.measurements).filter(v => v >= habit.target).length;

    const calMinWeeks = calContainerW > 0 ? Math.max(26, Math.floor(calContainerW / 29)) : 26;

    let scheduledCount = 0;
    for (let d = new Date(createdDay); d <= today; d.setDate(d.getDate() + 1)) {
      if (isScheduledDay(habit.frequency, habit.customDays, d.getDay())) scheduledCount++;
    }

    return {
      scoreNow, monthDelta, yearDelta, total, currentStreak, scheduledCount,
      dailyEMA, wBars, mBars,
      calWeeks: buildCalWeeks(habit, calMinWeeks),
      streaks:  calcAllStreaks(habit),
      freq:     buildFreqMatrix(habit),
    };
  }, [habit, calContainerW]);

  if (!habit || !data) return null;

  const area     = AREA_META[habit.area];
  const AreaIcon = AREA_ICONS[habit.area];
  const todayStr = toLocalDate();

  // Donut ring
  const R = 34, circ = 2 * Math.PI * R;
  const dashOff = circ * (1 - data.scoreNow / 100);

  return createPortal(
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: "#FFFFFF",
      zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Body — two-panel view */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left content column */}
        <div className="hdp-left" style={{ flex: 1, overflowY: "auto", padding: "0 24px 48px", minWidth: 0 }}>

          {/* Back button */}
          <button onClick={onClose} style={{
            display: "flex", alignItems: "center", gap: "6px",
            color: "#1C1917", fontSize: "13px", fontWeight: 600,
            background: "none", border: "none", cursor: "pointer",
            padding: "18px 0 14px",
          }}>
            <ArrowLeft size={15} /> Habits
          </button>

          {/* ── Header card ── */}
          <div style={{
            backgroundColor: area.bg,
            borderRadius: "18px",
            border: `1px solid ${area.color}30`,
            padding: "20px",
            marginBottom: "20px",
          }}>
            {/* Icon + info + score ring row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "18px" }}>

              {/* Area icon circle */}
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                backgroundColor: area.color, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 16px ${area.color}40`,
              }}>
                <AreaIcon size={24} color="#FFFFFF" />
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: area.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {area.label}
                </span>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#1C1917", margin: "3px 0 6px", lineHeight: 1.2 }}>
                  {habit.name}
                </h1>
                {habit.description && (
                  <p style={{ fontSize: "13px", color: "#78716C", margin: "0 0 8px", lineHeight: 1.4 }}>
                    {habit.description}
                  </p>
                )}
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#374151" }}>
                    <Flame size={12} color={area.color} />
                    {FREQ_LABEL[habit.frequency]}
                    {habit.frequency === "custom" && habit.customDays.length > 0 && (
                      <span style={{ color: "#78716C" }}>
                        · {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].filter((_, i) => habit.customDays.includes(i)).join(", ")}
                      </span>
                    )}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#374151" }}>
                    <Clock size={12} color="#6B7280" />
                    Since {fmtShort(toLocalDate(new Date(habit.createdAt)))}
                  </span>
                  {habit.type === "measurable" && (
                    <span style={{ fontSize: "12px", color: "#374151" }}>
                      Target: {habit.target} {habit.unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Score ring */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <svg width={80} height={80}>
                  <circle cx={40} cy={40} r={R} fill="none" stroke={`${area.color}20`} strokeWidth={8} />
                  <circle cx={40} cy={40} r={R} fill="none" stroke={area.color} strokeWidth={8}
                    strokeDasharray={circ} strokeDashoffset={dashOff}
                    strokeLinecap="round" transform="rotate(-90 40 40)" />
                  <text x={40} y={40} textAnchor="middle" dominantBaseline="central"
                    fontSize="13" fontWeight="800" fill={area.color}>
                    {data.scoreNow}%
                  </text>
                </svg>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#78716C" }}>Score</span>
              </div>
            </div>

            {/* Stats chips row */}
            <div className="hdp-chips" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", marginBottom: (habit.cue || habit.reward) ? "12px" : 0 }}>
              {[
                { value: `${data.scoreNow}%`,             label: "Score"       },
                { value: data.monthDelta === null ? "—" : `${data.monthDelta > 0 ? "+" : ""}${data.monthDelta}%`, label: "vs Month" },
                { value: data.yearDelta  === null ? "—" : `${data.yearDelta  > 0 ? "+" : ""}${data.yearDelta}%`,  label: "vs Year"  },
                { value: String(data.total),               label: "Total"       },
                { value: `${data.currentStreak}d`,         label: "Streak"      },
                { value: `${data.streaks[0]?.len ?? 0}d`,  label: "Best Streak" },
              ].map(chip => (
                <div key={chip.label} style={{
                  backgroundColor: "#FFFFFF",
                  border: `1px solid ${area.color}22`,
                  borderRadius: "12px",
                  padding: "10px 4px",
                  textAlign: "center",
                }}>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: area.color, margin: "0 0 2px", lineHeight: 1 }}>
                    {chip.value}
                  </p>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#374151", margin: 0 }}>
                    {chip.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Cue & Reward */}
            {(habit.cue || habit.reward) && (
              <div style={{ display: "flex", gap: "8px" }}>
                {habit.cue && (
                  <div style={{ flex: 1, backgroundColor: "#FFFFFF", border: `1px solid ${area.color}20`, borderRadius: "10px", padding: "10px 12px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: area.color, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cue</p>
                    <p style={{ fontSize: "13px", color: "#374151", margin: 0 }}>{habit.cue}</p>
                  </div>
                )}
                {habit.reward && (
                  <div style={{ flex: 1, backgroundColor: "#FFFFFF", border: `1px solid ${area.color}20`, borderRadius: "10px", padding: "10px 12px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: area.color, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reward</p>
                    <p style={{ fontSize: "13px", color: "#374151", margin: 0 }}>{habit.reward}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Stats cards ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Score trends */}
            <Card title="Score" color={area.color} style={{ border: `1px solid ${area.color}40` }}
              titleExtra={
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowScoreInfo(v => !v)} style={{
                    background: "none", border: "none", cursor: "pointer", padding: "2px",
                    display: "flex", alignItems: "center",
                  }}>
                    <Info size={13} color={showScoreInfo ? "#1C1917" : "#57534E"} />
                  </button>
                  {showScoreInfo && (
                    <>
                      <div onClick={() => setShowScoreInfo(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
                    <div style={{
                      position: "absolute", top: "22px", left: 0, zIndex: 20,
                      width: "240px", backgroundColor: "#FFFFFF",
                      border: `1px solid ${area.color}30`,
                      borderRadius: "12px", padding: "14px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                    }}>
                      <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#1C1917" }}>How score works</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[
                          { label: "EMA", desc: "Score is a weighted average — rises when you complete, slowly decays when you miss." },
                          { label: "Frequency-aware", desc: "Daily habits change faster; weekly or less-frequent habits decay slower." },
                          { label: "Rolling window", desc: "Checks how many completions you hit in the last N days vs. what's expected." },
                          { label: "Pre-history", desc: "Past entries you mark retroactively also contribute to your score." },
                        ].map(r => (
                          <div key={r.label} style={{ display: "flex", gap: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: area.color, whiteSpace: "nowrap", paddingTop: "1px" }}>{r.label}</span>
                            <span style={{ fontSize: "11px", color: "#57534E", lineHeight: 1.4 }}>{r.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              }
              action={
              <div className="hdp-score-btns" style={{ display: "flex", gap: "4px" }}>
                {(["day","week","month","quarter","year"] as const).map(p => (
                  <button key={p} onClick={() => setScorePeriod(p)} style={{
                    padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${area.color}${scorePeriod === p ? "" : "50"}`,
                    backgroundColor: scorePeriod === p ? area.color : `${area.color}12`,
                    color: scorePeriod === p ? "#FFFFFF" : "#78716C",
                  }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            }>
              {/* Chart */}
              {(() => {
                const CHART_H = 160, LABEL_H = 38;
                const COL_W: Record<ScorePeriod, number> = { day: 16, week: 24, month: 28, quarter: 52, year: 72 };
                const ema = data.dailyEMA;

                const getAt = (targetDs: string) => {
                  for (let i = ema.length - 1; i >= 0; i--) {
                    if (ema[i].ds <= targetDs) return ema[i].score;
                  }
                  return 0;
                };

                type SP = { ds: string; score: number };
                const samples: SP[] = [];
                const firstDs = ema.length > 0 ? ema[0].ds : toLocalDate();
                const lastDs  = ema.length > 0 ? ema[ema.length - 1].ds : toLocalDate();

                if (scorePeriod === "day") {
                  ema.forEach(e => samples.push(e));
                } else if (scorePeriod === "week") {
                  const start = new Date(firstDs + "T00:00:00");
                  const sdow  = start.getDay();
                  start.setDate(start.getDate() - (sdow === 0 ? 6 : sdow - 1));
                  for (let d = new Date(start); toLocalDate(d) <= lastDs; d.setDate(d.getDate() + 7)) {
                    const sun = new Date(d); sun.setDate(d.getDate() + 6);
                    const ds  = toLocalDate(sun) <= lastDs ? toLocalDate(sun) : lastDs;
                    samples.push({ ds, score: getAt(ds) });
                  }
                } else if (scorePeriod === "month") {
                  const start = new Date(firstDs.slice(0, 7) + "-01T00:00:00");
                  for (let m = new Date(start); toLocalDate(m) <= lastDs; m.setMonth(m.getMonth() + 1)) {
                    const eom = new Date(m.getFullYear(), m.getMonth() + 1, 0);
                    const ds  = toLocalDate(eom) <= lastDs ? toLocalDate(eom) : lastDs;
                    samples.push({ ds, score: getAt(ds) });
                  }
                } else if (scorePeriod === "quarter") {
                  const sy = parseInt(firstDs.slice(0, 4));
                  const sq = Math.floor((parseInt(firstDs.slice(5, 7)) - 1) / 3);
                  const ey = parseInt(lastDs.slice(0, 4));
                  const eq = Math.floor((parseInt(lastDs.slice(5, 7)) - 1) / 3);
                  let y = sy, q = sq;
                  while (y < ey || (y === ey && q <= eq)) {
                    const eom = new Date(y, (q + 1) * 3, 0);
                    const ds  = toLocalDate(eom) <= lastDs ? toLocalDate(eom) : lastDs;
                    samples.push({ ds, score: getAt(ds) });
                    q++; if (q > 3) { q = 0; y++; }
                  }
                } else {
                  const sy = parseInt(firstDs.slice(0, 4));
                  const ey = parseInt(lastDs.slice(0, 4));
                  for (let y = sy; y <= ey; y++) {
                    const ds = `${y}-12-31` <= lastDs ? `${y}-12-31` : lastDs;
                    samples.push({ ds, score: getAt(ds) });
                  }
                }

                const MIN_PTS: Record<ScorePeriod, number> = { day: 90, week: 26, month: 12, quarter: 8, year: 5 };
                const minPts = MIN_PTS[scorePeriod];
                if (samples.length < minPts) {
                  const padCount = minPts - samples.length;
                  const refD = new Date((samples[0]?.ds ?? toLocalDate()) + "T00:00:00");
                  const padded: SP[] = [];
                  for (let i = padCount; i > 0; i--) {
                    const d = new Date(refD);
                    if      (scorePeriod === "day")     d.setDate(d.getDate() - i);
                    else if (scorePeriod === "week")    d.setDate(d.getDate() - i * 7);
                    else if (scorePeriod === "month")   d.setMonth(d.getMonth() - i);
                    else if (scorePeriod === "quarter") d.setMonth(d.getMonth() - i * 3);
                    else                                d.setFullYear(d.getFullYear() - i);
                    padded.push({ ds: toLocalDate(d), score: 0 });
                  }
                  samples.unshift(...padded);
                }
                if (samples.length === 0) samples.push({ ds: toLocalDate(), score: 0 });

                let prevM2 = -1, prevY2 = -1;
                const pts = samples.map(p => {
                  const d = new Date(p.ds + "T00:00:00");
                  let label = ""; let isBig = false;
                  if (scorePeriod === "day") {
                    const newM = d.getMonth() !== prevM2;
                    const newY = d.getFullYear() !== prevY2 && prevY2 !== -1;
                    if (newM) {
                      label = d.toLocaleDateString("en-US", { month: "short" }) + (newY ? `\n${d.getFullYear()}` : "");
                      isBig = true;
                    } else {
                      label = String(d.getDate());
                    }
                    prevM2 = d.getMonth(); prevY2 = d.getFullYear();
                  } else if (scorePeriod === "week") {
                    // p.ds is end of week; go back 6 days to get the Monday start
                    const wStart = new Date(d); wStart.setDate(d.getDate() - 6);
                    const newM = wStart.getMonth() !== prevM2;
                    const newY = wStart.getFullYear() !== prevY2 && prevY2 !== -1;
                    if (newM) {
                      label = wStart.toLocaleDateString("en-US", { month: "short" }) + (newY ? `\n${wStart.getFullYear()}` : "");
                      isBig = true;
                    } else {
                      label = String(wStart.getDate());
                    }
                    prevM2 = wStart.getMonth(); prevY2 = wStart.getFullYear();
                  } else if (scorePeriod === "month") {
                    const yr = d.getFullYear(); isBig = yr !== prevY2;
                    label = d.toLocaleDateString("en-US", { month: "short" }) + (isBig ? `\n${yr}` : "");
                    prevY2 = yr;
                  } else if (scorePeriod === "quarter") {
                    const yr = d.getFullYear(); isBig = yr !== prevY2;
                    label = d.toLocaleDateString("en-US", { month: "short" }) + (isBig ? `\n${yr}` : "");
                    prevY2 = yr;
                  } else {
                    label = String(d.getFullYear()); isBig = true;
                  }
                  return { label, score: p.score, isBig };
                });

                const minCw  = COL_W[scorePeriod];
                const cw     = scoreContainerW > 0 && pts.length > 0
                  ? Math.max(minCw, Math.floor(scoreContainerW / pts.length))
                  : minCw;
                const totalW = Math.max(pts.length * cw, 20);
                const coords = pts.map((p, i) => ({ x: (i + 0.5) * cw, y: (1 - p.score / 100) * CHART_H }));
                const lineD  = coords.length >= 2 ? coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ") : "";
                const fillD  = lineD ? `${lineD} L${coords[coords.length-1].x},${CHART_H} L${coords[0].x},${CHART_H} Z` : "";

                return (
                  <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0, width: "32px", position: "relative", height: `${CHART_H + LABEL_H}px` }}>
                      {[100, 80, 60, 40, 20, 0].map(pct => (
                        <div key={pct} style={{ position: "absolute", top: `${(1 - pct / 100) * CHART_H - 5}px`,
                          right: "4px", fontSize: "8px", color: "#57534E", fontWeight: 600, lineHeight: 1 }}>
                          {pct}%
                        </div>
                      ))}
                    </div>
                    <div ref={scoreScrollRef} style={{ overflowX: "auto", flex: 1 }} className="lbd-hide-scrollbar">
                      <div style={{ display: "inline-flex", minWidth: "100%", justifyContent: "flex-end" }}>
                        <svg width={totalW} height={CHART_H + LABEL_H} style={{ display: "block", overflow: "visible" }}>
                          {[100, 80, 60, 40, 20, 0].map(pct => (
                            <line key={pct} x1={0} y1={(1 - pct / 100) * CHART_H}
                              x2={totalW} y2={(1 - pct / 100) * CHART_H} stroke="#E8DDD0" strokeWidth="0.8" />
                          ))}
                          {fillD && <path d={fillD} fill={`${area.color}18`} />}
                          {lineD && <path d={lineD} fill="none" stroke={area.color} strokeWidth="1.5"
                            strokeLinejoin="round" strokeLinecap="round" />}
                          {coords.map((c, i) => {
                            const lbl = pts[i].label;
                            const parts = lbl.split("\n");
                            return (
                              <g key={i}>
                                <circle cx={c.x} cy={c.y} r="3" fill={area.color} />
                                {lbl && (
                                  <text x={c.x} y={CHART_H + 14} textAnchor="middle" fontSize="10"
                                    fill="#374151" fontWeight={pts[i].isBig ? "700" : "500"}>
                                    {parts[0]}
                                    {parts[1] && <tspan x={c.x} dy="11" fill="#374151" fontWeight="600">{parts[1]}</tspan>}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Calendar — full width */}
            <Card title="Calendar" color={area.color} style={{ border: `1px solid ${area.color}40` }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <div ref={calScrollRef} style={{ overflowX: "auto", flex: 1 }} className="lbd-hide-scrollbar">
                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100%" }}>
                    <div style={{ display: "flex", gap: "3px", height: "22px", alignItems: "flex-end", marginBottom: "4px" }}>
                      {(() => {
                        const spans: { text: string; cols: number }[] = [];
                        let curM = "", cols = 0;
                        data.calWeeks.forEach(w => {
                          const m = w[0].ds.slice(0, 7);
                          if (m !== curM) {
                            if (curM) spans.push({ text: new Date(curM + "-01").toLocaleDateString("en-US", { month: "short" }), cols });
                            curM = m; cols = 1;
                          } else cols++;
                        });
                        if (curM) spans.push({ text: new Date(curM + "-01").toLocaleDateString("en-US", { month: "short" }), cols });
                        return spans.map((s, i) => (
                          <div key={i} style={{ width: `${s.cols * 29 - 3}px`, flexShrink: 0,
                            fontSize: "10px", fontWeight: 700, color: "#57534E",
                            textAlign: "center", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {s.text}
                          </div>
                        ));
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: "3px" }}>
                      {data.calWeeks.map((week, wi) => (
                        <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px", flexShrink: 0 }}>
                          {week.map((cell, di) => {
                            const isToday       = cell.ds === todayStr;
                            const isFuture      = cell.ds > todayStr;
                            const isBeforeStart = !cell.inRange && !isFuture;
                            const isDone        = cell.inRange && isHabitDoneOnDate(habit, cell.ds);
                            const dtDow         = new Date(cell.ds + "T00:00:00").getDay();
                            const isSched       = cell.inRange && !isFuture
                              && isScheduledDay(habit.frequency, habit.customDays, dtDow);
                            const showNum       = (cell.inRange && !isFuture) || isBeforeStart;
                            const isDoneBeforeStart = isBeforeStart && isHabitDoneOnDate(habit, cell.ds);
                            let bg = "transparent", border = "none";
                            if (isBeforeStart) {
                              bg = isDoneBeforeStart ? area.color : "#F0EDE9";
                            } else if (cell.inRange && !isFuture) {
                              if (isDone)       { bg = area.color; }
                              else if (isSched) { bg = "#FFFFFF"; border = `1px solid ${area.color}60`; }
                              else              { bg = "#EDE8E3"; }
                            }
                            const numColor = isBeforeStart
                              ? (isDoneBeforeStart ? "#FFFFFF" : "#78716C")
                              : isDone ? "#FFFFFF"
                              : isSched ? area.color
                              : "#57534E";
                            return (
                              <div key={di} title={cell.ds}
                                onClick={() => { if (!isFuture) onToggleDate(habit.id, cell.ds); }}
                                style={{
                                  width: 26, height: 26, flexShrink: 0,
                                  borderRadius: isToday && !isDone ? "50%" : "5px",
                                  backgroundColor: bg,
                                  border: isToday && !isDone ? `2px solid ${area.color}` : border,
                                  cursor: !isFuture ? "pointer" : "default",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                {showNum && (
                                  <span style={{ fontSize: "9px", fontWeight: isToday ? 800 : 600, lineHeight: 1,
                                    color: numColor, pointerEvents: "none" }}>
                                    {parseInt(cell.ds.slice(8), 10)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* DOW labels right */}
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", paddingTop: "26px", flexShrink: 0 }}>
                  {DOW_LABELS.map(l => (
                    <div key={l} style={{ height: "26px", display: "flex", alignItems: "center",
                      fontSize: "10px", fontWeight: 600, color: "#57534E", width: "28px" }}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* History + Best Streaks — side by side on desktop, stacked on mobile */}
            <div className="flex flex-col sm:flex-row" style={{ gap: "16px", minWidth: 0 }}>

            {/* History */}
            <Card title="History" color={area.color} className="hdp-history-card" style={{ flex: 1, minWidth: 0, minHeight: "360px", display: "flex", flexDirection: "column", border: `1px solid ${area.color}40` }} action={
              <div style={{ display: "flex", gap: "4px" }}>
                {(["week", "month"] as const).map(p => (
                  <button key={p} onClick={() => setHistPeriod(p)} style={{
                    padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${area.color}${histPeriod === p ? "" : "50"}`,
                    backgroundColor: histPeriod === p ? area.color : `${area.color}12`,
                    color: histPeriod === p ? "#FFFFFF" : "#78716C",
                  }}>
                    {p === "week" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            }>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {histPeriod === "week" ? (() => {
                const maxW = Math.max(...data.wBars.map(b => b.count), 1);
                return (
                  <div ref={histScrollRef} style={{ overflowX: "auto" }} className="lbd-hide-scrollbar">
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100%" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "3px" }}>
                        {data.wBars.map((b, i) => (
                          <div key={i} style={{ width: "28px", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                            <div style={{ height: "260px", width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                              {b.count > 0 && (
                                <span style={{ fontSize: "9px", fontWeight: 700, color: area.color, marginBottom: "3px", lineHeight: 1 }}>{b.count}</span>
                              )}
                              {b.count > 0 && (
                                <div style={{
                                  width: "20px",
                                  height: `${Math.max((b.count / maxW) * 240, 4)}px`,
                                  backgroundColor: area.color,
                                  borderRadius: "4px 4px 0 0",
                                }} />
                              )}
                            </div>
                            <div style={{ width: "100%", height: "1px", backgroundColor: "#E8DDD0" }} />
                            <div style={{ height: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "4px", gap: "1px" }}>
                              {(() => {
                                const parts = b.label.includes(" ") ? b.label.split(" ") : [b.label];
                                return (
                                  <>
                                    <span style={{
                                      fontSize: "10px", lineHeight: 1, textAlign: "center",
                                      fontWeight: b.isMonthStart ? 700 : 500,
                                      color: b.isMonthStart ? "#1C1917" : "#374151",
                                    }}>{parts[0]}</span>
                                    {parts[1] && (
                                      <span style={{ fontSize: "9px", lineHeight: 1, color: "#374151", fontWeight: 600 }}>{parts[1]}</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })() : (() => {
                const maxM  = Math.max(...data.mBars.map(b => b.count), 1);
                const BAR_W = 32;
                return (
                  <div style={{ overflowX: "auto" }} className="lbd-hide-scrollbar">
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100%" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                        {data.mBars.map((b, i) => (
                          <div key={i} style={{ width: `${BAR_W}px`, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ height: "260px", width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                              {b.count > 0 && (
                                <span style={{ fontSize: "9px", fontWeight: 700, color: area.color, marginBottom: "3px" }}>{b.count}</span>
                              )}
                              {b.count > 0 && (
                                <div style={{
                                  width: "100%", height: `${Math.max((b.count / maxM) * 60, 4)}px`,
                                  backgroundColor: area.color, borderRadius: "4px 4px 0 0",
                                }} />
                              )}
                            </div>
                            <div style={{ width: "100%", height: "1px", backgroundColor: "#E8DDD0" }} />
                            <span style={{ fontSize: "9px", color: "#78716C", marginTop: "4px", textAlign: "center" }}>{b.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </Card>

            {/* Best Streaks */}
            <Card title="Best Streaks" color={area.color} className="hdp-streaks-card" style={{ flex: 1, minWidth: 0, height: "360px", display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${area.color}40` }}>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="lbd-hide-scrollbar">
                {data.streaks.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#57534E", textAlign: "center", padding: "12px 0" }}>
                    No streaks yet — complete 2+ consecutive days to start one
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(() => {
                      const sorted = [...data.streaks].sort((a, b) => b.end.localeCompare(a.end));
                      const maxLen = Math.max(...sorted.map(s => s.len));
                      return sorted.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ flex: 1, fontSize: "11px", color: "#57534E", textAlign: "right", minWidth: 0 }}>
                            {fmtShort(s.start)}
                          </span>
                          <div style={{
                            width: `${Math.max((s.len / maxLen) * 65, 8)}%`,
                            height: "30px", borderRadius: "6px",
                            backgroundColor: area.color,
                            flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>{s.len}d</span>
                          </div>
                          <span style={{ flex: 1, fontSize: "11px", color: "#57534E", textAlign: "left", minWidth: 0 }}>
                            {fmtShort(s.end)}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </Card>

            </div>{/* end History + Best Streaks row */}

            {/* Frequency */}
            <Card title="Frequency" color={area.color} style={{ border: `1px solid ${area.color}40` }}>
              {(() => {
                const { mat, months } = data.freq;
                const maxCount = Math.max(...mat.flat(), 1);
                const colW = freqContainerW > 0 && months.length > 0
                  ? Math.max(16, Math.floor(freqContainerW / months.length))
                  : 16;
                return (
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    {/* Scrollable dot grid */}
                    <div ref={freqScrollRef} style={{ overflowX: "auto", flex: 1, minWidth: 0 }} className="lbd-hide-scrollbar">
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "max-content", minWidth: "100%" }}>
                        {DOW_JS.map((jsDay, di) => (
                          <div key={di} style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                            {months.map((_, mi) => {
                              const count = mat[jsDay][mi];
                              const maxDotSize = Math.min(colW - 4, 14);
                              const size = count === 0 ? Math.min(5, maxDotSize) : Math.min(6 + (count / maxCount) * 8, maxDotSize);
                              return (
                                <div key={mi} style={{ width: colW, height: 18, flexShrink: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <div style={{
                                    width: `${size}px`, height: `${size}px`, borderRadius: "50%",
                                    backgroundColor: count === 0 ? "#C4B5A0" : area.color,
                                    opacity: count === 0 ? 1 : 0.3 + (count / maxCount) * 0.7,
                                  }} />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        {/* Month labels row */}
                        <div style={{ display: "flex", gap: "3px" }}>
                          {months.map((m, mi) => (
                            <div key={mi} style={{ width: colW, flexShrink: 0, textAlign: "center",
                              fontSize: "11px", fontWeight: 700, color: "#374151",
                              height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
                              overflow: "hidden" }}>
                              {new Date(m + "-01").toLocaleDateString("en-US", { month: "short" })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Fixed DOW labels — outside scroll so they never move */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", flexShrink: 0, paddingLeft: "6px" }}>
                      {DOW_LABELS.map(l => (
                        <div key={l} style={{ height: 18, width: 30, display: "flex", alignItems: "center",
                          fontSize: "10px", fontWeight: 600, color: "#374151" }}>
                          {l}
                        </div>
                      ))}
                      {/* Spacer matching the month labels row height */}
                      <div style={{ height: 20 }} />
                    </div>
                  </div>
                );
              })()}
            </Card>

          </div>
        </div>
        {/* Right sidebar — hidden on mobile, matches GoalDetailSheet width */}
        {(() => {
          const health     = calcHabitHealth(data.scoreNow, data.scheduledCount);
          const hColor     = HABIT_HEALTH_COLOR[health];
          const hBg        = HABIT_HEALTH_BG[health];
          const emaPoints  = data.dailyEMA;
          // Build sparkline from last 30 EMA values
          const sparkSlice = emaPoints.slice(-30);
          const spMax      = Math.max(...sparkSlice.map(p => p.score), 1);
          const spPath     = sparkSlice.map((p, i) => {
            const x = (i / Math.max(sparkSlice.length - 1, 1)) * 260;
            const y = 40 - (p.score / spMax) * 36;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ");
          const spFill     = sparkSlice.length > 1
            ? spPath + ` L260,44 L0,44 Z`
            : "";

          return (
            <div className="hidden sm:block" style={{ width: 320, borderLeft: "1px solid #EDE5D8", overflowY: "auto", padding: "20px", flexShrink: 0, backgroundColor: "#FAFAF9" }}>

              {/* Habit Health */}
              <div style={{ backgroundColor: hBg, borderRadius: "14px", padding: "16px", border: `1px solid ${hColor}40`, marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <Heart size={14} color={hColor} fill={hColor} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Habit Health</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "30px", fontWeight: 800, color: hColor, lineHeight: 1 }}>{health}</span>
                  <Activity size={20} color={hColor} />
                </div>
                <svg width="100%" height="44" viewBox="0 0 260 44" preserveAspectRatio="none" style={{ display: "block", marginBottom: "10px" }}>
                  <defs>
                    <linearGradient id={`hsg-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={hColor} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={hColor} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {sparkSlice.length > 1 ? (
                    <>
                      <path d={spPath} fill="none" stroke={hColor} strokeWidth="2" strokeLinecap="round" />
                      <path d={spFill} fill={`url(#hsg-${habit.id})`} />
                    </>
                  ) : (
                    <path d="M0,34 C30,30 50,26 80,22 C110,18 130,20 160,15 C190,10 220,12 260,6" fill="none" stroke={hColor} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
                  )}
                </svg>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: hBg, border: `1px solid ${hColor}40`, borderRadius: "8px", padding: "6px 10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: hColor }}>{data.scoreNow}%</span>
                  <span style={{ fontSize: "11px", color: hColor }}>EMA Score</span>
                </div>
                <p style={{ fontSize: "12px", color: "#1C1917", lineHeight: 1.5, margin: 0 }}>{HABIT_HEALTH_DESC[health]}</p>
              </div>

              {/* Habit Summary */}
              <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", padding: "16px", border: "1px solid #F9731640", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
                  <LayoutGrid size={14} color="#2563EB" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Habit Summary</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {([
                    { icon: <Flame size={12} color="#EA580C" />,         label: "Frequency",       value: FREQ_LABEL[habit.frequency] },
                    { icon: <Activity size={12} color="#2563EB" />,      label: "Current Streak",  value: `${data.currentStreak}d` },
                    { icon: <Zap size={12} color="#7C3AED" />,           label: "Best Streak",     value: `${data.streaks[0]?.len ?? 0}d` },
                    { icon: <CheckCircle2 size={12} color="#16A34A" />,  label: "Completions",     value: data.total },
                    { icon: <TrendingUp size={12} color="#F97316" />,    label: "vs Last Month",   value: data.monthDelta === null ? "—" : `${data.monthDelta > 0 ? "+" : ""}${data.monthDelta}%` },
                    { icon: <TrendingUp size={12} color="#2563EB" />,    label: "vs Last Year",    value: data.yearDelta  === null ? "—" : `${data.yearDelta  > 0 ? "+" : ""}${data.yearDelta}%` },
                    ...(habit.type === "measurable" ? [{ icon: <Zap size={12} color="#7C3AED" />, label: "Target", value: `${habit.target} ${habit.unit}` }] : []),
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

              {/* Cue & Reward — only when set */}
              {(habit.cue || habit.reward) && (
                <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", padding: "16px", border: "1px solid #E5E9EE", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                    <Clock size={14} color="#EA580C" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Habit Loop</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {habit.cue && (
                      <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "10px", padding: "10px 12px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#EA580C", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cue</p>
                        <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>{habit.cue}</p>
                      </div>
                    )}
                    {habit.reward && (
                      <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", padding: "10px 12px" }}>
                        <p style={{ fontSize: "10px", fontWeight: 700, color: "#16A34A", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reward</p>
                        <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>{habit.reward}</p>
                      </div>
                    )}
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
                <p style={{ fontSize: "12px", color: "#1C1917", lineHeight: 1.5, margin: "0 0 12px" }}>
                  Personalized habit insights and suggestions coming soon.
                </p>
                <button disabled style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1.5px solid #C4B5FD", backgroundColor: "transparent", fontSize: "12px", fontWeight: 600, color: "#7C3AED", cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: 0.75 }}>
                  <Lock size={12} color="#7C3AED" /> Coming Soon
                </button>
              </div>

            </div>
          );
        })()}
      </div>
    </div>,
    document.body,
  );
}
