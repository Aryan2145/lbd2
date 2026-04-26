"use client";

import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HabitData } from "@/components/habits/HabitCard";
import { AREA_META as HABIT_AREA_META, calcStreak, isHabitDoneOnDate, toLocalDate } from "@/components/habits/HabitCard";

export type LifeArea =
  | "professional" | "contribution" | "wealth"
  | "spiritual"    | "personal"     | "relationships" | "health";

export interface GoalNote {
  id: string;
  text: string;
  timestamp: number;
}

export interface GoalData {
  id: string;
  statement: string;
  outcome: string;
  metric: string;
  metricUnit: string;
  deadline: string;
  area: LifeArea;
  progress: number;
  lastMoved: number;
  velocity: number;
  notes: GoalNote[];
  createdAt: number;
}

const AREA_META: Record<LifeArea, { label: string; color: string; bg: string }> = {
  professional:  { label: "Professional",   color: "#2563EB", bg: "#EFF6FF" },
  contribution:  { label: "Contribution",   color: "#7C3AED", bg: "#F5F3FF" },
  wealth:        { label: "Wealth",          color: "#C9A84C", bg: "#FEFCE8" },
  spiritual:     { label: "Spiritual",       color: "#059669", bg: "#ECFDF5" },
  personal:      { label: "Personal Growth", color: "#DB2777", bg: "#FDF2F8" },
  relationships: { label: "Relationships",   color: "#EA580C", bg: "#FFF7ED" },
  health:        { label: "Health",          color: "#DC2626", bg: "#FEF2F2" },
};

const STALE_DAYS = 14;

interface GoalCardProps {
  goal:         GoalData;
  linkedHabits: HabitData[];
  onClick:      () => void;
}

function daysUntil(isoDate: string) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysSinceMoved(ts: number) {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

export default function GoalCard({ goal, linkedHabits, onClick }: GoalCardProps) {
  const area     = AREA_META[goal.area];
  const daysLeft = daysUntil(goal.deadline);
  const stale    = daysSinceMoved(goal.lastMoved) >= STALE_DAYS;
  const overdue  = daysLeft < 0;
  const today    = toLocalDate();

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#FFFFFF", borderRadius: "12px",
        border: `1px solid ${stale ? "#FED7AA" : "#EDE5D8"}`,
        padding: "18px 18px 14px", cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(28,25,23,0.09)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {stale && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px",
          background: "linear-gradient(90deg, #F97316, #FED7AA)" }} />
      )}

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em",
          color: area.color, backgroundColor: area.bg, padding: "3px 8px", borderRadius: "20px" }}>
          {area.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {stale && (
            <div style={{ display: "flex", alignItems: "center", gap: "3px",
              fontSize: "9px", fontWeight: 600, color: "#F97316",
              backgroundColor: "#FFF7ED", padding: "3px 7px", borderRadius: "20px" }}>
              <AlertTriangle size={9} /> Stagnant
            </div>
          )}
          <VelocityBadge velocity={goal.velocity} />
        </div>
      </div>

      {/* Statement */}
      <p style={{ fontSize: "13px", fontWeight: 600, color: "#1C1917",
        lineHeight: 1.45, marginBottom: "10px",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {goal.statement}
      </p>

      {/* Progress */}
      <div style={{ marginBottom: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "10px", color: "#A8A29E", fontWeight: 500 }}>Progress</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#F97316" }}>{goal.progress}%</span>
        </div>
        <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "#F2EAE0" }}>
          <div style={{
            height: "100%", borderRadius: "3px", width: `${goal.progress}%`,
            background: goal.progress >= 80
              ? "linear-gradient(90deg, #C9A84C, #F59E0B)"
              : "linear-gradient(90deg, #F97316, #EA580C)",
            transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Deadline */}
      <p style={{ fontSize: "10px", fontWeight: 500, color: overdue ? "#DC2626" : "#78716C",
        marginBottom: linkedHabits.length > 0 ? "10px" : "0" }}>
        {overdue ? `${Math.abs(daysLeft)} days overdue`
          : daysLeft === 0 ? "Due today"
          : `${daysLeft} days remaining`}
      </p>

      {/* Linked habits */}
      {linkedHabits.length > 0 && (
        <div style={{ borderTop: "1px solid #F2EAE0", paddingTop: "10px",
          display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {linkedHabits.slice(0, 5).map((h) => {
            const hMeta  = HABIT_AREA_META[h.area];
            const hDone  = isHabitDoneOnDate(h, today);
            const hStreak = calcStreak(h);
            return (
              <div key={h.id} style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "3px 8px", borderRadius: "20px",
                backgroundColor: hDone ? "#F0FDF4" : "#F5F0EB",
                border: `1px solid ${hDone ? "#86EFAC" : "#E8DDD0"}`,
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%",
                  backgroundColor: hMeta.color, flexShrink: 0 }} />
                <span style={{ fontSize: "10px", fontWeight: 600,
                  color: hDone ? "#16A34A" : "#78716C", whiteSpace: "nowrap" }}>
                  {h.name}
                </span>
                {hStreak > 0 && (
                  <span style={{ fontSize: "9px", color: "#F97316", fontWeight: 700 }}>
                    🔥{hStreak}
                  </span>
                )}
              </div>
            );
          })}
          {linkedHabits.length > 5 && (
            <span style={{ fontSize: "10px", color: "#A8A29E" }}>+{linkedHabits.length - 5} more</span>
          )}
        </div>
      )}
    </div>
  );
}

function VelocityBadge({ velocity }: { velocity: number }) {
  if (velocity === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px",
      fontSize: "9px", color: "#A8A29E", backgroundColor: "#F5F0EB",
      padding: "3px 7px", borderRadius: "20px", fontWeight: 500 }}>
      <Minus size={9} /> No change
    </div>
  );
  if (velocity > 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px",
      fontSize: "9px", color: "#059669", backgroundColor: "#ECFDF5",
      padding: "3px 7px", borderRadius: "20px", fontWeight: 600 }}>
      <TrendingUp size={9} /> +{velocity}%
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px",
      fontSize: "9px", color: "#DC2626", backgroundColor: "#FEF2F2",
      padding: "3px 7px", borderRadius: "20px", fontWeight: 600 }}>
      <TrendingDown size={9} /> {velocity}%
    </div>
  );
}
