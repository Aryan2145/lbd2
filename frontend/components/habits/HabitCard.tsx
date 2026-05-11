"use client";

import { useRef, useState, useEffect } from "react";
import {
  CheckCircle2, Circle, Flame, Link2, Pencil, ChevronDown, ChevronUp,
  Briefcase, Globe, DollarSign, Sparkles, BookOpen, Heart, Activity,
  type LucideIcon,
} from "lucide-react";

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

export const AREA_ICONS: Record<LifeArea, LucideIcon> = {
  professional:  Briefcase,
  contribution:  Globe,
  wealth:        DollarSign,
  spiritual:     Sparkles,
  personal:      BookOpen,
  relationships: Heart,
  health:        Activity,
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
  onEdit?:         () => void;
  onToggleToday:   (id: string) => void;
  onStep?:         (id: string, delta: number) => void;
  onToggleDate?:   (id: string, date: string) => void;
}

export default function HabitCard({ habit, onClick, onEdit, onToggleToday, onStep, onToggleDate }: Props) {
  const today      = toLocalDate();
  const area       = AREA_META[habit.area];
  const AreaIcon   = AREA_ICONS[habit.area];
  const streak     = calcStreak(habit);
  const isMeasure  = habit.type === "measurable";
  const todayVal   = isMeasure ? (habit.measurements[today] ?? 0) : 0;
  const doneToday  = isMeasure ? todayVal >= habit.target : habit.completions.includes(today);
  const cardRef    = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
      setIsMobile(mobile);
      if (mobile) setExpanded(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function onHover(enter: boolean) {
    const el = cardRef.current;
    if (!el) return;
    if (enter) {
      el.style.transform   = "translateY(-3px)";
      el.style.boxShadow   = `0 12px 32px ${area.color}33, 0 4px 12px rgba(28,25,23,0.08)`;
      el.style.borderColor = area.color;
    } else {
      el.style.transform   = "translateY(0)";
      el.style.boxShadow   = "0 2px 8px rgba(28,25,23,0.06)";
      el.style.borderColor = `${area.color}45`;
    }
  }

  // Sliding 4×7 window: anchored to createdAt for first 28 days, then slides with today
  const todayMs    = new Date(today + "T00:00:00").getTime();
  const createdDay = new Date(new Date(habit.createdAt).toDateString()).getTime();
  const daysSince  = Math.floor((todayMs - createdDay) / 86_400_000);
  const windowStart = new Date(daysSince <= 27 ? createdDay : todayMs - 27 * 86_400_000);

  const DOW_SHORT  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const colHeaders = Array.from({ length: 7 }, (_, j) =>
    DOW_SHORT[(windowStart.getDay() + j) % 7]
  );

  const dots = Array.from({ length: 28 }, (_, i) => {
    const d       = new Date(windowStart);
    d.setDate(d.getDate() + i);
    const ds      = toLocalDate(d);
    const dMs     = d.getTime();
    const isFuture = dMs > todayMs;
    const sch     = !isFuture
                    && isScheduledDay(habit.frequency, habit.customDays, d.getDay())
                    && dMs >= createdDay;
    if (isFuture) return { ds, scheduled: false, ratio: 0, done: false, isFuture: true };
    if (isMeasure) {
      const val   = habit.measurements[ds] ?? 0;
      const ratio = habit.target > 0 ? Math.min(1, val / habit.target) : 0;
      return { ds, scheduled: sch, ratio, done: ratio >= 1, isFuture: false };
    }
    return { ds, scheduled: sch, ratio: habit.completions.includes(ds) ? 1 : 0,
      done: habit.completions.includes(ds), isFuture: false };
  });

  const dotGrid = (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "3px" }}>
        {colHeaders.map((label, j) => (
          <div key={j} style={{
            textAlign: "center", fontSize: "8px", fontWeight: 700,
            color: area.color, lineHeight: 1, opacity: 0.7,
          }}>
            {label}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "10px" }}>
        {dots.map((dot, idx) => {
          const isFilled = !dot.isFuture && (isMeasure ? dot.ratio > 0 : dot.done);
          const dateNum = parseInt(dot.ds.slice(8), 10);
          let bg: string;
          let textColor: string;
          let border: string;
          const cellOpacity = isMeasure && isFilled && !dot.done
            ? 0.35 + dot.ratio * 0.65 : 1;

          if (dot.isFuture) {
            bg = "#EDE8E2"; textColor = "#B8B0A8"; border = "none";
          } else if (isFilled) {
            bg = area.color; textColor = "#FFFFFF"; border = "none";
          } else if (dot.scheduled) {
            bg = "#FFFFFF"; textColor = area.color; border = `1.5px solid ${area.color}`;
          } else {
            bg = "#D8D2CB"; textColor = "#7A736B"; border = "none";
          }

          return (
            <div
              key={idx}
              title={dot.ds}
              onClick={(e) => {
                if (dot.isFuture) return;
                e.stopPropagation();
                onToggleDate?.(habit.id, dot.ds);
              }}
              style={{
                width: "100%", aspectRatio: "1", borderRadius: "3px",
                backgroundColor: bg, border, opacity: cellOpacity,
                boxSizing: "border-box",
                cursor: dot.isFuture || !dot.scheduled ? "default" : onToggleDate ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "opacity 0.15s",
              }}
            >
              {dot.ds === today ? (
                <span style={{
                  width: "18px", height: "18px", borderRadius: "50%",
                  backgroundColor: isFilled ? "rgba(255,255,255,0.35)" : area.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none", flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: "7px", fontWeight: 700,
                    color: isFilled ? textColor : "#FFFFFF",
                    userSelect: "none", lineHeight: 1, pointerEvents: "none",
                  }}>{dateNum}</span>
                </span>
              ) : (
                <span style={{
                  fontSize: "7px", fontWeight: 700, color: textColor,
                  userSelect: "none", lineHeight: 1, pointerEvents: "none",
                }}>
                  {dateNum}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        backgroundColor: area.bg,
        borderRadius: "16px",
        border: `1.5px solid ${area.color}45`,
        boxShadow: "0 2px 8px rgba(28,25,23,0.06)",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        display: "flex", flexDirection: "column", overflow: "hidden",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      {/* Colored top accent bar */}
      <div style={{ height: 4, backgroundColor: area.color, flexShrink: 0 }} />

      {isMobile ? (
        <>
          {/* Collapsed row — tap anywhere outside buttons to open stats */}
          <div
            onClick={onClick}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px" }}
          >
            {/* Today toggle */}
            {isMeasure ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}
              >
                <button onClick={() => onStep?.(habit.id, -1)} style={stepperBtnSm("#E8DDD0", "#78716C")} disabled={todayVal <= 0}>−</button>
                <div style={{ textAlign: "center", minWidth: "30px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: doneToday ? "#16A34A" : area.color }}>{todayVal}</span>
                  <span style={{ fontSize: "9px", color: "#A8A29E" }}>/{habit.target}</span>
                </div>
                <button onClick={() => onStep?.(habit.id, +1)} style={stepperBtnSm(area.color, "#FFFFFF")} disabled={todayVal >= habit.target * 2}>+</button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleToday(habit.id); }}
                title={doneToday ? "Unmark today" : "Mark done today"}
                style={{
                  flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
                  border: doneToday ? "none" : `2px solid ${area.color}`,
                  backgroundColor: doneToday ? "#16A34A" : "#FFFFFF",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                {doneToday ? <CheckCircle2 size={18} color="#FFFFFF" /> : <Circle size={16} color={area.color} />}
              </button>
            )}

            {/* Name + meta — tap to open stats */}
            <div
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            >
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917",
                margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {habit.name}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.05em",
                  color: area.color, textTransform: "uppercase" as const }}>{area.label}</span>
                {streak > 0 && (
                  <>
                    <span style={{ color: "#D5C9BC", fontSize: "9px" }}>·</span>
                    <Flame size={9} color="#F97316" />
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#F97316" }}>{streak}d</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <button
                onClick={(e) => { e.stopPropagation(); (onEdit ?? onClick)(); }}
                title="Edit habit"
                style={{
                  width: 24, height: 24, borderRadius: 6, border: `1px solid ${area.color}40`,
                  backgroundColor: "#FFFFFF", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer",
                }}
              >
                <Pencil size={10} color={area.color} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                title={expanded ? "Collapse" : "Expand"}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: `1px solid ${area.color}40`,
                  backgroundColor: "#FFFFFF", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer",
                }}
              >
                {expanded ? <ChevronUp size={12} color={area.color} /> : <ChevronDown size={12} color={area.color} />}
              </button>
            </div>
          </div>

          {/* Expandable dot grid */}
          {expanded && (
            <div style={{ padding: "0 12px 12px" }}>
              {dotGrid}
            </div>
          )}
        </>
      ) : (
        /* Desktop: full layout */
        <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "8px" }}>
            <div
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              style={{ flex: 1, minWidth: 0, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px" }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: "11px", flexShrink: 0,
                background: `linear-gradient(135deg, ${area.color}, ${area.color}cc)`,
                boxShadow: `0 3px 10px ${area.color}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AreaIcon size={18} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: area.color, lineHeight: 1.35 }}>
                {habit.name}
              </span>
            </div>

            {isMeasure ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button onClick={() => onStep?.(habit.id, -1)} style={stepperBtn("#E8DDD0", "#78716C")} disabled={todayVal <= 0}>−</button>
                  <div style={{ textAlign: "center", minWidth: "28px" }}>
                    <span style={{ fontSize: "17px", fontWeight: 800, color: doneToday ? "#16A34A" : area.color }}>{todayVal}</span>
                    <span style={{ fontSize: "10px", color: "#A8A29E" }}>/{habit.target}</span>
                  </div>
                  <button onClick={() => onStep?.(habit.id, +1)} style={stepperBtn(area.color, "#FFFFFF")} disabled={todayVal >= habit.target * 2}>+</button>
                </div>
                {habit.unit && (
                  <span style={{ fontSize: "9px", color: "#A8A29E", fontWeight: 500 }}>{habit.unit}</span>
                )}
              </div>
            ) : (
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
                {doneToday ? <CheckCircle2 size={20} color="#FFFFFF" /> : <Circle size={18} color={area.color} />}
              </button>
            )}
          </div>

          {dotGrid}

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Flame size={13} color={streak > 0 ? "#F97316" : "#C4B8AC"} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: streak > 0 ? "#F97316" : "#1C1917" }}>
                  {streak > 0 ? `${streak} day streak` : "Start your streak"}
                </span>
              </div>
              {habit.linkedGoalId && <Link2 size={11} color="#78716C" />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                fontSize: "9px", fontWeight: 600, color: area.color,
                backgroundColor: "#FFFFFF", border: `1px solid ${area.color}35`,
                padding: "2px 7px", borderRadius: "20px",
              }}>
                {FREQ_LABEL[habit.frequency]}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); (onEdit ?? onClick)(); }}
                title="Edit habit"
                style={{
                  width: 24, height: 24, borderRadius: 6, border: `1px solid ${area.color}40`,
                  backgroundColor: "#FFFFFF", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", flexShrink: 0,
                }}
              >
                <Pencil size={10} color={area.color} />
              </button>
            </div>
          </div>
        </div>
      )}
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

function stepperBtnSm(bg: string, color: string): React.CSSProperties {
  return {
    width: "20px", height: "20px", borderRadius: "5px", border: "none",
    backgroundColor: bg, color, fontSize: "13px", fontWeight: 700,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0,
  };
}
