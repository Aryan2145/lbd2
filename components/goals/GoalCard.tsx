"use client";

import { useRef, useCallback } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HabitData } from "@/components/habits/HabitCard";
import { AREA_META as HABIT_AREA_META, calcStreak, isHabitDoneOnDate, toLocalDate } from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";

export type LifeArea =
  | "professional" | "contribution" | "wealth"
  | "spiritual"    | "personal"     | "relationships" | "health";

export interface GoalNote {
  id: string;
  text: string;
  timestamp: number;
}

export interface Milestone {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  completed: boolean;
  createdAt: number;
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
  milestones?: Milestone[];
}

export const AREA_META: Record<LifeArea, { label: string; color: string; bg: string }> = {
  professional:  { label: "Professional",   color: "#2563EB", bg: "#EFF6FF" },
  contribution:  { label: "Contribution",   color: "#16A34A", bg: "#F0FDF4" },
  wealth:        { label: "Wealth",          color: "#CA8A04", bg: "#FEFCE8" },
  spiritual:     { label: "Spiritual",       color: "#7C3AED", bg: "#F5F0FF" },
  personal:      { label: "Personal Growth", color: "#F97316", bg: "#FFF7ED" },
  relationships: { label: "Relationships",   color: "#DB2777", bg: "#FDF2F8" },
  health:        { label: "Health",          color: "#DC2626", bg: "#FEF2F2" },
};

const STALE_DAYS = 14;

interface GoalCardProps {
  goal:         GoalData;
  linkedHabits: HabitData[];
  linkedTasks:  TaskData[];
  onUpdate:     (g: GoalData) => void;
  onClick:      () => void;
}

function daysUntil(isoDate: string) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysSinceMoved(ts: number) {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function fmtMilestoneDate(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function GoalCard({ goal, linkedHabits, linkedTasks, onUpdate, onClick }: GoalCardProps) {
  const area      = AREA_META[goal.area];
  const daysLeft  = daysUntil(goal.deadline);
  const stale     = daysSinceMoved(goal.lastMoved) >= STALE_DAYS;
  const overdue   = daysLeft < 0;
  const today     = toLocalDate();
  const milestones = [...(goal.milestones ?? [])].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const barRef         = useRef<HTMLDivElement>(null);
  const suppressClick  = useRef(false);

  const handleBarMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    suppressClick.current = true;          // block the card's onClick
    const bar = barRef.current;
    if (!bar) return;
    const initialProgress = goal.progress;
    document.body.style.cursor     = "grabbing";
    document.body.style.userSelect = "none";
    const update = (clientX: number) => {
      const rect = bar.getBoundingClientRect();
      const val = Math.min(100, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * 100)));
      onUpdate({ ...goal, progress: val, lastMoved: Date.now(), velocity: val - initialProgress });
    };
    update(e.clientX);
    const onMove = (ev: MouseEvent) => { ev.preventDefault(); update(ev.clientX); };
    const onUp   = () => {
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      // clear flag AFTER the click event (if any) has had a chance to fire
      setTimeout(() => { suppressClick.current = false; }, 0);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, [goal, onUpdate]);

  return (
    <div
      onClick={() => {
        if (suppressClick.current) return;
        onClick();
      }}
      style={{
        backgroundColor: area.bg, borderRadius: "12px",
        border: `1px solid ${stale ? "#FED7AA" : area.color + "35"}`,
        padding: "18px 18px 14px", cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 24px ${area.color}20`;
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
          color: area.color, backgroundColor: "#FFFFFF",
          border: `1px solid ${area.color}40`,
          padding: "3px 8px", borderRadius: "20px" }}>
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
      <p style={{ fontSize: "13px", fontWeight: 600, color: area.color,
        lineHeight: 1.45, marginBottom: "10px",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {goal.statement}
      </p>

      {/* Progress bar — draggable */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "10px", color: "#A8A29E", fontWeight: 500 }}>Progress</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: area.color }}>{goal.progress}%</span>
        </div>
        {/* Expanded hit area so the 6px bar is easy to grab */}
        <div
          onMouseDown={handleBarMouseDown}
          style={{ padding: "6px 0", cursor: "default", userSelect: "none" }}
        >
          <div
            ref={barRef}
            style={{ height: "6px", borderRadius: "3px", backgroundColor: `${area.color}20`, position: "relative" }}
          >
            <div style={{
              height: "100%", borderRadius: "3px", width: `${goal.progress}%`,
              background: goal.progress >= 80
                ? `linear-gradient(90deg, ${area.color}CC, ${area.color})`
                : `linear-gradient(90deg, ${area.color}99, ${area.color})`,
              position: "relative",
            }}>
              <div style={{
                position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)",
                width: 14, height: 14, borderRadius: "50%",
                backgroundColor: area.color,
                border: "2.5px solid #FFFFFF",
                boxShadow: `0 1px 6px ${area.color}80`,
                cursor: "grab",
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Deadline */}
      <p style={{ fontSize: "10px", fontWeight: 500, color: overdue ? "#DC2626" : "#78716C",
        marginBottom: milestones.length > 0 || linkedHabits.length > 0 ? "10px" : "0" }}>
        {overdue ? `${Math.abs(daysLeft)} days overdue`
          : daysLeft === 0 ? "Due today"
          : `${daysLeft} days remaining`}
      </p>

      {/* Milestones section */}
      {milestones.length > 0 && (
        <div style={{ borderTop: `1px solid ${area.color}20`, paddingTop: "8px",
          marginBottom: linkedHabits.length > 0 ? "10px" : "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", color: "#D97706" }}>
              Milestones
            </span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#D97706",
              backgroundColor: "#FFFBEB", border: "1px solid #FCD34D",
              padding: "0px 5px", borderRadius: "20px" }}>
              {milestones.length}
            </span>
          </div>
          <div style={{ maxHeight: "88px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" }}>
            {milestones.map((m) => {
              const hCount = linkedHabits.filter((h) => h.linkedMilestoneId === m.id).length;
              const tCount = linkedTasks.filter((t) => t.linkedMilestoneId === m.id).length;
              return (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  minHeight: "28px", padding: "2px 4px",
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = milestones.map((ms) =>
                        ms.id === m.id ? { ...ms, completed: !ms.completed } : ms
                      );
                      onUpdate({ ...goal, milestones: updated });
                    }}
                    style={{
                      width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                      border: `1.5px solid ${m.completed ? "#D97706" : "#D5C9BC"}`,
                      backgroundColor: m.completed ? "#D97706" : "#FFFFFF",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {m.completed && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span style={{
                    flex: 1, fontSize: "10px", fontWeight: 500,
                    color: m.completed ? "#A8A29E" : "#1C1917",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    textDecoration: m.completed ? "line-through" : "none",
                  }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: "9px", color: "#A8A29E", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {fmtMilestoneDate(m.deadline)}
                  </span>
                  {hCount > 0 && (
                    <span style={{
                      fontSize: "8px", fontWeight: 700, color: "#2563EB",
                      backgroundColor: "#EFF6FF", padding: "1px 4px", borderRadius: "3px",
                      flexShrink: 0,
                    }}>
                      H {hCount}
                    </span>
                  )}
                  {tCount > 0 && (
                    <span style={{
                      fontSize: "8px", fontWeight: 700, color: "#7C3AED",
                      backgroundColor: "#F5F3FF", padding: "1px 4px", borderRadius: "3px",
                      flexShrink: 0,
                    }}>
                      T {tCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked habits */}
      {linkedHabits.length > 0 && (
        <div style={{ borderTop: `1px solid ${area.color}20`, paddingTop: "10px",
          display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {linkedHabits.slice(0, 5).map((h) => {
            const hMeta   = HABIT_AREA_META[h.area];
            const hDone   = isHabitDoneOnDate(h, today);
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
