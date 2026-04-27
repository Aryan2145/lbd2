"use client";

import { CheckCircle2, Circle, Flame, Link2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type LifeArea =
  | "professional" | "contribution" | "wealth"
  | "spiritual"    | "personal"     | "relationships" | "health";

export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";
export type HabitType      = "binary" | "measurable";

export interface HabitData {
  id:                string;
  name:              string;
  description:       string;
  area:              LifeArea;
  frequency:         HabitFrequency;
  customDays:        number[];       // 0=Sun…6=Sat
  cue:               string;
  reward:            string;
  type:              HabitType;
  target:            number;         // 1 for binary, N for measurable
  unit:              string;         // "" for binary
  completions:       string[];       // YYYY-MM-DD (binary done-days)
  measurements:      Record<string, number>; // date → value (measurable)
  linkedGoalId:      string;         // "" = no link
  linkedMilestoneId: string;         // "" = no link
  createdAt:         number;
}

// ── Shared meta ───────────────────────────────────────────────────────────────
export const AREA_META: Record<LifeArea, { label: string; color: string; bg: string }> = {
  professional:  { label: "Professional",   color: "#2563EB", bg: "#EFF6FF" },
  contribution:  { label: "Contribution",   color: "#16A34A", bg: "#F0FDF4" },
  wealth:        { label: "Wealth",          color: "#CA8A04", bg: "#FEFCE8" },
  spiritual:     { label: "Spiritual",       color: "#7C3AED", bg: "#F5F0FF" },
  personal:      { label: "Personal Growth", color: "#F97316", bg: "#FFF7ED" },
  relationships: { label: "Relationships",   color: "#DB2777", bg: "#FDF2F8" },
  health:        { label: "Health",          color: "#DC2626", bg: "#FEF2F2" },
};

export const FREQ_LABEL: Record<HabitFrequency, string> = {
  daily: "Daily", weekdays: "Mon–Fri", weekends: "Weekends", custom: "Custom",
};

// ── Utilities ─────────────────────────────────────────────────────────────────
export function toLocalDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isScheduledDay(freq: HabitFrequency, customDays: number[], dow: number): boolean {
  if (freq === "daily")    return true;
  if (freq === "weekdays") return dow >= 1 && dow <= 5;
  if (freq === "weekends") return dow === 0 || dow === 6;
  return customDays.includes(dow);
}

export function isHabitDoneOnDate(habit: HabitData, date: string): boolean {
  if (habit.type === "measurable") {
    return (habit.measurements[date] ?? 0) >= habit.target;
  }
  return habit.completions.includes(date);
}

export function calcStreak(habit: HabitData): number {
  const today    = new Date();
  const todayStr = toLocalDate(today);
  const d        = new Date(today);
  if (!isHabitDoneOnDate(habit, todayStr)) d.setDate(d.getDate() - 1);

  let streak = 0;
  for (let i = 0; i < 366; i++) {
    if (d.getTime() < habit.createdAt - 86_400_000) break;
    const dow = d.getDay();
    const ds  = toLocalDate(d);
    if (isScheduledDay(habit.frequency, habit.customDays, dow)) {
      if (isHabitDoneOnDate(habit, ds)) streak++;
      else break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function calcBestStreak(habit: HabitData): number {
  let best = 0, cur = 0;
  const end = new Date();
  for (let d = new Date(habit.createdAt); d <= end; d.setDate(d.getDate() + 1)) {
    if (!isScheduledDay(habit.frequency, habit.customDays, d.getDay())) continue;
    isHabitDoneOnDate(habit, toLocalDate(d)) ? (cur++, best = Math.max(best, cur)) : (cur = 0);
  }
  return best;
}

export function calcConsistency(habit: HabitData, days = 30): number {
  let scheduled = 0, done = 0;
  const today   = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getTime() < habit.createdAt) break;
    if (!isScheduledDay(habit.frequency, habit.customDays, d.getDay())) continue;
    scheduled++;
    if (isHabitDoneOnDate(habit, toLocalDate(d))) done++;
  }
  return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  habit:           HabitData;
  onClick:         () => void;
  onToggleToday:   (id: string) => void;
  onStep?:         (id: string, delta: number) => void;
  onToggleDate?:   (id: string, date: string) => void;
}

export default function HabitCard({ habit, onClick, onToggleToday, onStep, onToggleDate }: Props) {
  const today      = toLocalDate();
  const area       = AREA_META[habit.area];
  const streak     = calcStreak(habit);
  const isMeasure  = habit.type === "measurable";
  const todayVal   = isMeasure ? (habit.measurements[today] ?? 0) : 0;
  const doneToday  = isMeasure ? todayVal >= habit.target : habit.completions.includes(today);

  // 4×7 dot grid (last 28 days, oldest → newest)
  const dots = Array.from({ length: 28 }, (_, i) => {
    const d   = new Date();
    d.setDate(d.getDate() - (27 - i));
    const ds  = toLocalDate(d);
    const sch = isScheduledDay(habit.frequency, habit.customDays, d.getDay())
                && d.getTime() >= habit.createdAt - 86_400_000;
    if (isMeasure) {
      const val   = habit.measurements[ds] ?? 0;
      const ratio = habit.target > 0 ? Math.min(1, val / habit.target) : 0;
      return { ds, scheduled: sch, ratio, done: ratio >= 1 };
    }
    return { ds, scheduled: sch, ratio: habit.completions.includes(ds) ? 1 : 0,
      done: habit.completions.includes(ds) };
  });

  const DOW_SHORT   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const todayDow    = new Date().getDay();
  const colHeaders  = Array.from({ length: 7 }, (_, j) =>
    DOW_SHORT[(todayDow - (27 - j) + 700) % 7]
  );

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#FFFFFF", borderRadius: "12px",
        border: "1px solid #EDE5D8", borderLeft: `3px solid ${area.color}`,
        padding: "14px 16px", cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(28,25,23,0.08)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: area.color, backgroundColor: area.bg,
            padding: "2px 7px", borderRadius: "20px", display: "inline-block", marginBottom: "5px",
          }}>
            {area.label}
          </span>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917",
            lineHeight: 1.3, margin: 0, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>
            {habit.name}
          </p>
        </div>

        {/* Action area */}
        {isMeasure ? (
          /* Measurable stepper */
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => onStep?.(habit.id, -1)}
                style={stepperBtn("#E8DDD0", "#78716C")}
                disabled={todayVal <= 0}
              >
                −
              </button>
              <div style={{ textAlign: "center", minWidth: "28px" }}>
                <span style={{ fontSize: "17px", fontWeight: 800,
                  color: doneToday ? "#16A34A" : "#F97316" }}>
                  {todayVal}
                </span>
                <span style={{ fontSize: "10px", color: "#A8A29E" }}>/{habit.target}</span>
              </div>
              <button
                onClick={() => onStep?.(habit.id, +1)}
                style={stepperBtn(area.color, "#FFFFFF")}
                disabled={todayVal >= habit.target * 2}
              >
                +
              </button>
            </div>
            {habit.unit && (
              <span style={{ fontSize: "9px", color: "#A8A29E", fontWeight: 500 }}>
                {habit.unit}
              </span>
            )}
          </div>
        ) : (
          /* Binary toggle */
          <button
            onClick={(e) => { e.stopPropagation(); onToggleToday(habit.id); }}
            title={doneToday ? "Unmark today" : "Mark done today"}
            style={{
              flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%",
              border: doneToday ? "none" : `2px solid ${area.color}`,
              backgroundColor: doneToday ? "#16A34A" : "#FFFFFF",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            {doneToday
              ? <CheckCircle2 size={20} color="#FFFFFF" />
              : <Circle size={18} color={area.color} />}
          </button>
        )}
      </div>

      {/* Day-of-week column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "3px" }}>
        {colHeaders.map((label, j) => (
          <div key={j} style={{
            textAlign: "center", fontSize: "8px", fontWeight: 600,
            color: "#B8AEA4", lineHeight: 1,
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* 4×7 dot grid — clickable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "10px" }}>
        {dots.map((dot, idx) => {
          const isFilled = isMeasure ? dot.ratio > 0 : dot.done;
          const bg = isFilled
            ? area.color
            : dot.scheduled ? "#EDE5D8" : "#C8C2BC";
          const cellOpacity = isMeasure && isFilled && !dot.done
            ? 0.3 + dot.ratio * 0.7 : 1;
          const dateNum = parseInt(dot.ds.slice(8), 10);
          const textColor = isFilled ? "rgba(255,255,255,0.55)" : "rgba(100,75,50,0.38)";
          return (
            <div
              key={idx}
              title={dot.ds}
              onClick={(e) => { e.stopPropagation(); onToggleDate?.(habit.id, dot.ds); }}
              style={{
                width: "100%", aspectRatio: "1", borderRadius: "3px",
                backgroundColor: bg, opacity: cellOpacity,
                cursor: onToggleDate ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "opacity 0.15s",
              }}
            >
              <span style={{
                fontSize: "7px", fontWeight: 500, color: textColor,
                userSelect: "none", lineHeight: 1, pointerEvents: "none",
              }}>
                {dateNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Flame size={13} color={streak > 0 ? "#F97316" : "#D5C9BC"} />
            <span style={{ fontSize: "11px", fontWeight: 700,
              color: streak > 0 ? "#F97316" : "#A8A29E" }}>
              {streak > 0 ? `${streak} day streak` : "Start your streak"}
            </span>
          </div>
          {habit.linkedGoalId && (
            <Link2 size={11} color="#A8A29E" />
          )}
        </div>
        <span style={{
          fontSize: "9px", fontWeight: 600, color: "#A8A29E",
          backgroundColor: "#F5F0EB", padding: "2px 7px", borderRadius: "20px",
        }}>
          {FREQ_LABEL[habit.frequency]}
        </span>
      </div>
    </div>
  );
}

function stepperBtn(bg: string, color: string): React.CSSProperties {
  return {
    width: "24px", height: "24px", borderRadius: "6px", border: "none",
    backgroundColor: bg, color, fontSize: "14px", fontWeight: 700,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0,
  };
}
