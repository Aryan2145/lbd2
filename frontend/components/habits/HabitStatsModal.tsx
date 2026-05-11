"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { HabitData } from "./HabitCard";
import { AREA_META, FREQ_LABEL, toLocalDate, isScheduledDay, isHabitDoneOnDate } from "./HabitCard";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtShort(ds: string) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" });
}

// score_{n} = score_{n-1} × (1-α) + result_{n} × α  (only on scheduled days)
const EMA_ALPHA = 0.1;

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
  const today = new Date();
  const createdDay = new Date(new Date(habit.createdAt).toDateString());
  const list: { start: string; end: string; len: number }[] = [];
  let start: string | null = null, last: string | null = null, len = 0;
  for (let d = new Date(createdDay); d <= today; d.setDate(d.getDate() + 1)) {
    if (!isScheduledDay(habit.frequency, habit.customDays, d.getDay())) continue;
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

const CAL_MIN_WEEKS = 26;

function buildCalWeeks(habit: HabitData): Array<Array<{ ds: string; inRange: boolean }>> {
  const todayStr = toLocalDate();
  const today    = new Date();
  const createdDay = new Date(new Date(habit.createdAt).toDateString());
  const from = new Date(createdDay);
  // align to Monday of creation week
  const dow = from.getDay();
  from.setDate(from.getDate() - (dow === 0 ? 6 : dow - 1));
  // ensure at least CAL_MIN_WEEKS total so the card is always full
  const weeksSpanned = Math.ceil((today.getTime() - from.getTime()) / (7 * 86400000)) + 1;
  if (weeksSpanned < CAL_MIN_WEEKS) {
    from.setDate(from.getDate() - (CAL_MIN_WEEKS - weeksSpanned) * 7);
  }

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
  const today = new Date();
  const createdDay = new Date(new Date(habit.createdAt).toDateString());
  // Always show at least FREQ_MIN_MONTHS months
  const minStart = new Date(today.getFullYear(), today.getMonth() - (FREQ_MIN_MONTHS - 1), 1);
  const startM   = createdDay < minStart ? createdDay : minStart;
  const months: string[] = [];
  const d = new Date(startM.getFullYear(), startM.getMonth(), 1);
  while (d <= today) {
    months.push(toLocalDate(d).slice(0, 7));
    d.setMonth(d.getMonth() + 1);
  }
  // mat[jsDay 0-6][monthIdx]
  const mat: number[][] = Array.from({ length: 7 }, () => new Array(months.length).fill(0));
  for (let day = new Date(createdDay); day <= today; day.setDate(day.getDate() + 1)) {
    const ds = toLocalDate(day);
    if (!isHabitDoneOnDate(habit, ds)) continue;
    const mIdx = months.indexOf(ds.slice(0, 7));
    if (mIdx >= 0) mat[day.getDay()][mIdx]++;
  }
  return { mat, months };
}

// ── sub-components ────────────────────────────────────────────────────────────

function LineChart({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const W = 300, H = 90, PX = 6, PY = 8;
  const coords = points.map((v, i) => ({
    x: PX + (i / (points.length - 1)) * (W - PX * 2),
    y: H - PY - (v / 100) * (H - PY * 2),
  }));
  const lineD = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const fillD = `${lineD} L${coords[coords.length - 1].x},${H - PY} L${coords[0].x},${H - PY} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="90" preserveAspectRatio="none">
      {[25, 50, 75].map(pct => {
        const y = H - PY - (pct / 100) * (H - PY * 2);
        return <line key={pct} x1={PX} y1={y} x2={W - PX} y2={y} stroke="#E8DDD0" strokeWidth="0.8" />;
      })}
      <path d={fillD} fill={`${color}18`} />
      <path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
    </svg>
  );
}

function Card({ title, color, children, action }: { title: string; color: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E8DDD0", padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  habit: HabitData | null;
  onClose: () => void;
  onToggleDate: (id: string, date: string) => void;
}

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_JS     = [1, 2, 3, 4, 5, 6, 0]; // JS getDay() values for Mon…Sun

export default function HabitStatsModal({ habit, onClose, onToggleDate }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const calScrollRef   = useRef<HTMLDivElement>(null);
  const histScrollRef  = useRef<HTMLDivElement>(null);
  const freqScrollRef  = useRef<HTMLDivElement>(null);
  const scoreScrollRef = useRef<HTMLDivElement>(null);
  const [histPeriod,  setHistPeriod]  = useState<"week" | "month">("week");
  type ScorePeriod = "day" | "week" | "month" | "quarter" | "year";
  const [scorePeriod, setScorePeriod] = useState<ScorePeriod>("month");

  // scroll lock
  useEffect(() => {
    if (!habit) return;
    const y = window.scrollY;
    document.body.style.cssText = `position:fixed;top:-${y}px;width:100%;overflow:hidden`;
    document.documentElement.style.overflow = "hidden";
    const prevent = (e: Event) => {
      if (modalRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.addEventListener("wheel", prevent, { passive: false });
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      document.body.style.cssText = "";
      document.documentElement.style.overflow = "";
      window.scrollTo(0, y);
      document.removeEventListener("wheel", prevent);
      document.removeEventListener("touchmove", prevent);
    };
  }, [habit]);

  // auto-scroll timeline sections to the right (most recent) on open
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

    // Single-pass EMA: one entry per day from creation → today
    const dailyEMA: { ds: string; score: number }[] = [];
    {
      let s = 0;
      for (let d = new Date(createdDay); toLocalDate(d) <= todayStr; d.setDate(d.getDate() + 1)) {
        const ds = toLocalDate(d);
        if (isScheduledDay(habit.frequency, habit.customDays, d.getDay())) {
          const result = isHabitDoneOnDate(habit, ds) ? 1 : 0;
          s = s * (1 - EMA_ALPHA) + result * EMA_ALPHA;
        }
        dailyEMA.push({ ds, score: Math.round(s * 100) });
      }
    }

    // weekly bars — always at least 26 weeks, capped at 52 weeks back
    type WeekBar = { label: string; count: number; isMonthStart: boolean };
    const wBars: WeekBar[] = [];
    const capStart  = new Date(today); capStart.setDate(today.getDate()  - 52 * 7);
    const minWStart = new Date(today); minWStart.setDate(today.getDate() - 26 * 7);
    // pick the earlier of createdDay vs 26-weeks-ago, capped at 52-weeks-ago
    const rawWStart  = createdDay.getTime() < minWStart.getTime() ? new Date(createdDay) : new Date(minWStart);
    const wFrom      = rawWStart.getTime() > capStart.getTime()   ? rawWStart            : new Date(capStart);
    const wDow = wFrom.getDay();
    wFrom.setDate(wFrom.getDate() - (wDow === 0 ? 6 : wDow - 1));
    let prevWMonth = -1, prevWYear = -1;
    for (let d = new Date(wFrom); d <= today; d.setDate(d.getDate() + 7)) {
      const m = d.getMonth(), y = d.getFullYear();
      const isMonthStart = m !== prevWMonth;
      let label: string;
      if (isMonthStart) {
        const monthName = d.toLocaleDateString("en-US", { month: "short" });
        label = y !== prevWYear && prevWYear !== -1 ? `${monthName} ${y}` : monthName;
      } else {
        label = String(d.getDate());
      }
      wBars.push({ label, count: weekCount(habit, new Date(d)), isMonthStart });
      prevWMonth = m; prevWYear = y;
    }

    // monthly bars — always 12 months (pre-creation months show count=0 naturally)
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

    // Overview stats — looked up from dailyEMA (no extra iteration needed)
    const scoreNow = dailyEMA.length > 0 ? dailyEMA[dailyEMA.length - 1].score : 0;
    const cy = today.getFullYear(), cm = today.getMonth();
    const prevMonthEndStr = toLocalDate(new Date(cy, cm, 0)); // day-0 = last day of prev month
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

    return {
      scoreNow, monthDelta, yearDelta, total,
      dailyEMA, wBars, mBars,
      calWeeks: buildCalWeeks(habit),
      streaks:  calcAllStreaks(habit),
      freq:     buildFreqMatrix(habit),
    };
  }, [habit]);

  if (!habit || !data) return null;

  const area     = AREA_META[habit.area];
  const todayStr = toLocalDate();

  // donut ring
  const R = 30, circ = 2 * Math.PI * R;
  const dashOff = circ * (1 - data.scoreNow / 100);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(28,25,23,0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: "#FAF5EE",
          width: "100%", maxWidth: "620px",
          minHeight: "100%",
        }}
      >
        {/* ── Sticky header ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          backgroundColor: "#FFFFFF", borderBottom: "1px solid #E8DDD0",
          padding: "14px 16px",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: area.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1C1917",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {habit.name}
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "#78716C" }}>
              {area.label} · {FREQ_LABEL[habit.frequency]}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}>
            <X size={15} color="#78716C" />
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Overview */}
          <Card title="Overview" color={area.color}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {/* Donut */}
              <svg width={72} height={72} style={{ flexShrink: 0 }}>
                <circle cx={36} cy={36} r={R} fill="none" stroke="#E8DDD0" strokeWidth={6} />
                <circle cx={36} cy={36} r={R} fill="none" stroke={area.color} strokeWidth={6}
                  strokeDasharray={circ} strokeDashoffset={dashOff}
                  strokeLinecap="round" transform="rotate(-90 36 36)" />
                <text x={36} y={36} textAnchor="middle" dominantBaseline="central"
                  fontSize="11" fontWeight="700" fill={area.color}>
                  {data.scoreNow}%
                </text>
              </svg>
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", flex: 1 }}>
                {[
                  { label: "Score",  val: `${data.scoreNow}%`,  delta: null },
                  { label: "Month",  val: `${data.monthDelta >= 0 ? "+" : ""}${data.monthDelta}%`, delta: data.monthDelta },
                  { label: "Year",   val: `${data.yearDelta  >= 0 ? "+" : ""}${data.yearDelta}%`,  delta: data.yearDelta  },
                  { label: "Total",  val: String(data.total),   delta: null },
                ].map(({ label, val, delta }) => (
                  <div key={label}>
                    <p style={{ margin: 0, fontSize: "17px", fontWeight: 800,
                      color: delta != null
                        ? (delta > 0 ? "#16A34A" : delta < 0 ? "#DC2626" : "#1C1917")
                        : area.color }}>
                      {val}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#78716C", fontWeight: 500, marginTop: "2px" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Score line chart */}
          <Card title="Score" color={area.color} action={
            <select value={scorePeriod} onChange={e => setScorePeriod(e.target.value as ScorePeriod)}
              style={{ padding: "3px 6px", borderRadius: "6px", border: "1px solid #E8DDD0",
                backgroundColor: "#FAFAF9", color: "#78716C", fontSize: "11px",
                fontWeight: 600, cursor: "pointer", outline: "none" }}>
              {(["day","week","month","quarter","year"] as const).map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          }>
            {(() => {
              const CHART_H = 140, LABEL_H = 28;
              // ~320px card ÷ COL_W ≈ 15-20 dots visible at once
              const COL_W: Record<ScorePeriod, number> = { day: 16, week: 24, month: 28, quarter: 52, year: 72 };
              const ema = data.dailyEMA;

              // Find score at last entry on or before targetDs
              const getAt = (targetDs: string) => {
                for (let i = ema.length - 1; i >= 0; i--) {
                  if (ema[i].ds <= targetDs) return ema[i].score;
                }
                return 0;
              };

              // Build sample points keyed to period boundaries
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
                  const ds = toLocalDate(sun) <= lastDs ? toLocalDate(sun) : lastDs;
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

              // Pad left so the chart always fills the card (min periods per view)
              const MIN_PTS: Record<ScorePeriod, number> = { day: 90, week: 26, month: 12, quarter: 8, year: 5 };
              const minPts = MIN_PTS[scorePeriod];
              if (samples.length < minPts) {
                const padCount = minPts - samples.length;
                const refD = new Date((samples[0]?.ds ?? toLocalDate()) + "T00:00:00");
                const padded: { ds: string; score: number }[] = [];
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
              // Ensure at least one point
              if (samples.length === 0) samples.push({ ds: toLocalDate(), score: 0 });

              // Build labels
              let prevM = -1, prevY = -1;
              const pts = samples.map(p => {
                const d = new Date(p.ds + "T00:00:00");
                let label = ""; let isBig = false;
                if (scorePeriod === "day" || scorePeriod === "week") {
                  const newM = d.getMonth() !== prevM;
                  const newY = d.getFullYear() !== prevY && prevY !== -1;
                  if (newM) { label = d.toLocaleDateString("en-US", { month: "short" }) + (newY ? `\n${d.getFullYear()}` : ""); isBig = true; }
                  else label = ""; // no crowded day numbers — only month markers
                  prevM = d.getMonth(); prevY = d.getFullYear();
                } else if (scorePeriod === "month") {
                  const yr = d.getFullYear(); isBig = yr !== prevY;
                  label = d.toLocaleDateString("en-US", { month: "short" }) + (isBig ? `\n${yr}` : "");
                  prevY = yr;
                } else if (scorePeriod === "quarter") {
                  const yr = d.getFullYear(); isBig = yr !== prevY;
                  label = `Q${Math.floor(d.getMonth() / 3) + 1}` + (isBig ? `\n${yr}` : "");
                  prevY = yr;
                } else {
                  label = String(d.getFullYear()); isBig = true;
                }
                return { label, score: p.score, isBig };
              });

              const cw     = COL_W[scorePeriod];
              const totalW = Math.max(pts.length * cw, 20);
              const coords = pts.map((p, i) => ({ x: (i + 0.5) * cw, y: (1 - p.score / 100) * CHART_H }));
              const lineD  = coords.length >= 2 ? coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ") : "";
              const fillD  = lineD ? `${lineD} L${coords[coords.length-1].x},${CHART_H} L${coords[0].x},${CHART_H} Z` : "";

              return (
                <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
                  {/* Y-axis */}
                  <div style={{ flexShrink: 0, width: "30px", position: "relative", height: `${CHART_H + LABEL_H}px` }}>
                    {[100, 80, 60, 40, 20, 0].map(pct => (
                      <div key={pct} style={{ position: "absolute", top: `${(1 - pct / 100) * CHART_H - 5}px`,
                        right: "4px", fontSize: "7px", color: "#A8A29E", fontWeight: 600, lineHeight: 1 }}>
                        {pct}%
                      </div>
                    ))}
                  </div>
                  {/* Scrollable chart area */}
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
                              <circle cx={c.x} cy={c.y} r="2.5" fill={area.color} />
                              {lbl && (
                                <text x={c.x} y={CHART_H + 11} textAnchor="middle" fontSize="7"
                                  fill={pts[i].isBig ? "#1C1917" : "#A8A29E"} fontWeight={pts[i].isBig ? "700" : "500"}>
                                  {parts[0]}
                                  {parts[1] && <tspan x={c.x} dy="8" fill="#A8A29E" fontWeight="500">{parts[1]}</tspan>}
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

          {/* History bar chart */}
          <Card title="History" color={area.color}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px", marginTop: "-8px", marginBottom: "14px" }}>
              {(["week", "month"] as const).map(p => (
                <button key={p} onClick={() => setHistPeriod(p)} style={{
                  padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${histPeriod === p ? area.color : "#E8DDD0"}`,
                  backgroundColor: histPeriod === p ? area.color : "#FFFFFF",
                  color: histPeriod === p ? "#FFFFFF" : "#78716C",
                }}>
                  {p === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>
            {histPeriod === "week" ? (() => {
              const maxW = Math.max(...data.wBars.map(b => b.count), 1);
              return (
                <div ref={histScrollRef} style={{ overflowX: "auto" }} className="lbd-hide-scrollbar">
                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100%" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }}>
                    {data.wBars.map((b, i) => (
                      <div key={i} style={{ width: "26px", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        {/* bar area — fixed 72px height */}
                        <div style={{ height: "72px", width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                          {b.count > 0 && (
                            <span style={{ fontSize: "8px", fontWeight: 700, color: area.color, marginBottom: "2px", lineHeight: 1 }}>{b.count}</span>
                          )}
                          {b.count > 0 && (
                            <div style={{
                              width: "18px",
                              height: `${Math.max((b.count / maxW) * 56, 4)}px`,
                              backgroundColor: area.color,
                              borderRadius: "3px 3px 0 0",
                            }} />
                          )}
                        </div>
                        {/* baseline */}
                        <div style={{ width: "100%", height: "1px", backgroundColor: "#E8DDD0" }} />
                        {/* label */}
                        <span style={{
                          fontSize: "8px", marginTop: "4px", lineHeight: 1, textAlign: "center",
                          fontWeight: b.isMonthStart ? 700 : 400,
                          color: b.isMonthStart ? "#1C1917" : "#A8A29E",
                          whiteSpace: "pre",
                        }}>
                          {b.label.includes(" ") ? b.label.replace(" ", "\n") : b.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
              );
            })() : (() => {
              const maxM = Math.max(...data.mBars.map(b => b.count), 1);
              const BAR_W = 30;
              return (
                <div style={{ overflowX: "auto" }} className="lbd-hide-scrollbar">
                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100%" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "3px" }}>
                    {data.mBars.map((b, i) => (
                      <div key={i} style={{ width: `${BAR_W}px`, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ height: "72px", width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                          {b.count > 0 && (
                            <span style={{ fontSize: "8px", fontWeight: 700, color: area.color, marginBottom: "2px" }}>{b.count}</span>
                          )}
                          {b.count > 0 && (
                            <div style={{
                              width: "100%", height: `${Math.max((b.count / maxM) * 56, 4)}px`,
                              backgroundColor: area.color, borderRadius: "3px 3px 0 0",
                            }} />
                          )}
                        </div>
                        <div style={{ width: "100%", height: "1px", backgroundColor: "#E8DDD0" }} />
                        <span style={{ fontSize: "8px", color: "#78716C", marginTop: "4px", textAlign: "center" }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Calendar timeline */}
          <Card title="Calendar" color={area.color}>
            <div style={{ display: "flex", gap: "6px" }}>
              {/* Scrollable week columns */}
              <div ref={calScrollRef} style={{ overflowX: "auto", flex: 1 }} className="lbd-hide-scrollbar">
                {/* inner wrapper: right-aligns content when few weeks; overflows left when many */}
                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100%" }}>
                {/* Month label row */}
                <div style={{ display: "flex", gap: "2px", height: "18px", alignItems: "flex-end", marginBottom: "2px" }}>
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
                      <div key={i} style={{ width: `${s.cols * 20}px`, flexShrink: 0,
                        fontSize: "8px", fontWeight: 700, color: "#78716C",
                        overflow: "hidden", whiteSpace: "nowrap" }}>
                        {s.text}
                      </div>
                    ));
                  })()}
                </div>
                {/* Columns = weeks (built Mon-first, so week[0]=Mon…week[6]=Sun) */}
                <div style={{ display: "flex", gap: "2px" }}>
                  {data.calWeeks.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                      {week.map((cell, di) => {
                        const isToday       = cell.ds === todayStr;
                        const isFuture      = cell.ds > todayStr;
                        const isBeforeStart = !cell.inRange && !isFuture;
                        const isDone        = cell.inRange && isHabitDoneOnDate(habit, cell.ds);
                        const dtDow         = new Date(cell.ds + "T00:00:00").getDay();
                        const isSched       = cell.inRange && !isFuture
                          && isScheduledDay(habit.frequency, habit.customDays, dtDow);
                        const showNum       = (cell.inRange && !isFuture) || isBeforeStart;

                        let bg = "transparent", border = "none";
                        if (isBeforeStart) {
                          bg = "#F0EDE9";
                        } else if (cell.inRange && !isFuture) {
                          if (isDone)       { bg = area.color; }
                          else if (isSched) { bg = "#FFFFFF"; border = `1px solid ${area.color}60`; }
                          else              { bg = "#EDE8E3"; }
                        }

                        const numColor = isBeforeStart ? "#D1CBC4"
                          : isDone      ? "#FFFFFF"
                          : isSched     ? area.color
                          : "#A8A29E";

                        return (
                          <div
                            key={di}
                            title={cell.ds}
                            onClick={() => { if (cell.inRange && !isFuture) onToggleDate(habit.id, cell.ds); }}
                            style={{
                              width: 18, height: 18, flexShrink: 0,
                              borderRadius: isToday ? "50%" : "3px",
                              backgroundColor: bg,
                              border: isToday ? `2px solid ${area.color}` : border,
                              cursor: cell.inRange && !isFuture ? "pointer" : "default",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {showNum && (
                              <span style={{
                                fontSize: "7px",
                                fontWeight: isToday ? 800 : 600,
                                lineHeight: 1,
                                color: numColor,
                                pointerEvents: "none",
                              }}>
                                {parseInt(cell.ds.slice(8), 10)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                </div>{/* end inner right-align wrapper */}
              </div>
              {/* DOW labels — right side */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingTop: "20px", flexShrink: 0 }}>
                {DOW_LABELS.map(l => (
                  <div key={l} style={{ height: "18px", display: "flex", alignItems: "center",
                    fontSize: "8px", fontWeight: 600, color: "#A8A29E", width: "24px" }}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Best Streaks */}
          {data.streaks.length > 0 && (
            <Card title="Best Streaks" color={area.color}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {(() => {
                  const maxLen = data.streaks[0].len;
                  return data.streaks.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#78716C", width: "74px",
                        textAlign: "right", flexShrink: 0 }}>
                        {fmtShort(s.start)}
                      </span>
                      <div style={{ flex: 1, height: "22px", backgroundColor: "#F5F0EB",
                        borderRadius: "5px", overflow: "hidden" }}>
                        <div style={{
                          width: `${(s.len / maxLen) * 100}%`, height: "100%",
                          backgroundColor: i === 0 ? area.color : `${area.color}75`,
                          borderRadius: "5px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          minWidth: "28px",
                        }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF" }}>
                            {s.len}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: "10px", color: "#78716C", width: "74px", flexShrink: 0 }}>
                        {fmtShort(s.end)}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          )}

          {/* Frequency dot matrix */}
          <Card title="Frequency" color={area.color}>
            {(() => {
              const { mat, months } = data.freq;
              const maxCount = Math.max(...mat.flat(), 1);
              return (
                <div style={{ display: "flex", gap: "6px" }}>
                  {/* Matrix */}
                  <div ref={freqScrollRef} style={{ overflowX: "auto", flex: 1 }} className="lbd-hide-scrollbar">
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", minWidth: "100%" }}>
                    {/* Month initials */}
                    <div style={{ display: "flex", gap: "2px", marginBottom: "4px" }}>
                      {months.map((m, mi) => (
                        <div key={mi} style={{ width: "14px", flexShrink: 0, textAlign: "center",
                          fontSize: "7px", fontWeight: 700, color: "#A8A29E" }}>
                          {new Date(m + "-01").toLocaleDateString("en-US", { month: "short" }).charAt(0)}
                        </div>
                      ))}
                    </div>
                    {/* Dot rows (Mon–Sun) */}
                    {DOW_JS.map((jsDay, di) => (
                      <div key={di} style={{ display: "flex", gap: "2px", marginBottom: "4px", alignItems: "center" }}>
                        {months.map((_, mi) => {
                          const count = mat[jsDay][mi];
                          const size  = count === 0 ? 4 : 5 + (count / maxCount) * 7;
                          return (
                            <div key={mi} style={{ width: "14px", height: "14px", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{
                                width: `${size}px`, height: `${size}px`, borderRadius: "50%",
                                backgroundColor: count === 0 ? "#DDD6CE" : area.color,
                                opacity: count === 0 ? 0.5 : 0.25 + (count / maxCount) * 0.75,
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    </div>
                  </div>
                  {/* DOW labels — right side */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "20px", flexShrink: 0 }}>
                    {DOW_LABELS.map(l => (
                      <div key={l} style={{ height: "14px", display: "flex", alignItems: "center",
                        fontSize: "8px", fontWeight: 600, color: "#A8A29E", width: "24px" }}>
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>

          <div style={{ height: "16px" }} />
        </div>
      </div>
    </div>
  );
}
