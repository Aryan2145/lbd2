"use client";

import React, { useRef, useCallback } from "react";
import {
  Check, Lock, Calendar, BookOpen, Clock,
  Briefcase, Globe, DollarSign, Sparkles, Heart, Activity,
  type LucideIcon,
} from "lucide-react";
import type { HabitData } from "@/components/habits/HabitCard";
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

const AREA_ICONS: Record<LifeArea, LucideIcon> = {
  professional:  Briefcase,
  contribution:  Globe,
  wealth:        DollarSign,
  spiritual:     Sparkles,
  personal:      BookOpen,
  relationships: Heart,
  health:        Activity,
};

interface GoalCardProps {
  goal:         GoalData;
  linkedHabits: HabitData[];
  linkedTasks:  TaskData[];
  onUpdate:     (g: GoalData) => void;
  onClick:      () => void;
}

export default function GoalCard({ goal, linkedHabits, linkedTasks, onUpdate, onClick }: GoalCardProps) {
  const area       = AREA_META[goal.area];
  const Icon       = AREA_ICONS[goal.area];
  const milestones = [...(goal.milestones ?? [])].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const completedCount     = milestones.filter(m => m.completed).length;
  const firstIncompleteIdx = milestones.findIndex(m => !m.completed);
  const visibleMilestones  = milestones.slice(0, 4);

  const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const cardRef       = useRef<HTMLDivElement>(null);
  const barRef        = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);

  function onHover(enter: boolean) {
    const el = cardRef.current;
    if (!el) return;
    if (enter) {
      el.style.transform   = "translateY(-4px)";
      el.style.boxShadow   = `0 16px 40px ${area.color}40, 0 4px 12px rgba(28,25,23,0.08)`;
      el.style.borderColor = area.color;
    } else {
      el.style.transform   = "translateY(0)";
      el.style.boxShadow   = `0 2px 10px ${area.color}18`;
      el.style.borderColor = `${area.color}45`;
    }
  }

  const handleBarMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    suppressClick.current = true;
    const bar = barRef.current;
    if (!bar) return;
    const initialProgress = goal.progress;
    document.body.style.cursor     = "grabbing";
    document.body.style.userSelect = "none";
    const update = (clientX: number) => {
      const rect = bar.getBoundingClientRect();
      const val  = Math.min(100, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * 100)));
      onUpdate({ ...goal, progress: val, lastMoved: Date.now(), velocity: val - initialProgress });
    };
    update(e.clientX);
    const onMove = (ev: MouseEvent) => { ev.preventDefault(); update(ev.clientX); };
    const onUp   = () => {
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      setTimeout(() => { suppressClick.current = false; }, 0);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, [goal, onUpdate]);

  return (
    <div
      ref={cardRef}
      onClick={() => { if (suppressClick.current) return; onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        backgroundColor: area.bg,
        borderRadius: "16px",
        border: `1.5px solid ${area.color}45`,
        cursor: "pointer",
        boxShadow: `0 2px 10px ${area.color}18`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Colored top accent bar */}
      <div style={{ height: 4, backgroundColor: area.color, flexShrink: 0 }} />

      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "11px", flexShrink: 0,
            background: `linear-gradient(135deg, ${area.color}, ${area.color}cc)`,
            boxShadow: `0 3px 10px ${area.color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={18} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: area.color, flex: 1, lineHeight: 1.35 }}>
            {goal.statement}
          </span>
          {daysLeft <= 7 && daysLeft > 0 && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#DC2626", backgroundColor: "#FEF2F2", padding: "2px 7px", borderRadius: "20px", border: "1px solid #FECACA" }}>
              {daysLeft}d left
            </span>
          )}
          {daysLeft === 0 && (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#DC2626", backgroundColor: "#FEF2F2", padding: "2px 7px", borderRadius: "20px", border: "1px solid #FECACA" }}>
              Due today
            </span>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: area.color, lineHeight: 1 }}>
              {goal.progress}%
            </span>
            {milestones.length > 0 && (
              <span style={{ fontSize: "11px", fontWeight: 600, color: area.color }}>
                {completedCount}/{milestones.length} milestones
              </span>
            )}
          </div>
          <div onMouseDown={handleBarMouseDown} style={{ cursor: "default", userSelect: "none" }}>
            <div ref={barRef} style={{ height: "7px", borderRadius: "4px", backgroundColor: `${area.color}20`, position: "relative" }}>
              <div style={{ height: "100%", borderRadius: "4px", width: `${goal.progress}%`, background: `linear-gradient(90deg, ${area.color}cc, ${area.color})`, position: "relative" }}>
                {goal.progress > 0 && (
                  <div style={{
                    position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)",
                    width: 13, height: 13, borderRadius: "50%",
                    backgroundColor: area.color,
                    border: "2.5px solid #FFFFFF",
                    boxShadow: `0 1px 6px ${area.color}80`,
                    cursor: "grab",
                  }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Milestone stepper */}
        <div style={{ height: 42, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
          {visibleMilestones.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
              {visibleMilestones.map((m, idx) => {
                const isCompleted = m.completed;
                const isCurrent   = idx === firstIncompleteIdx;
                const isLocked    = !isCompleted && !isCurrent;
                const size        = isLocked ? 22 : 28;
                return (
                  <React.Fragment key={m.id}>
                    <div style={{
                      width: size, height: size, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: isCompleted ? area.color : isCurrent ? area.color : `${area.color}18`,
                      border: isLocked ? `1.5px solid ${area.color}45` : "none",
                      boxShadow: isCurrent ? `0 2px 8px ${area.color}55` : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background-color 0.2s",
                    }}>
                      {isCompleted && <Check size={13} color="#fff" strokeWidth={3} />}
                      {isCurrent   && <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#fff" }} />}
                      {isLocked    && <Lock size={10} color={`${area.color}80`} />}
                    </div>
                    {idx < visibleMilestones.length - 1 && (
                      <div style={{
                        flex: 1, height: "2px", flexShrink: 0,
                        background: m.completed
                          ? `linear-gradient(90deg, ${area.color}, ${area.color}cc)`
                          : `${area.color}25`,
                        borderRadius: "1px",
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: "11px", fontWeight: 600, color: `${area.color}80`, fontStyle: "italic", margin: 0 }}>
              No milestones yet
            </p>
          )}
        </div>

        {/* Stats footer */}
        <div style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${area.color}25`, paddingTop: "12px", marginTop: "auto" }}>
          <FooterStat icon={<Calendar size={13} color={area.color} />} value={linkedTasks.length}  label="Tasks"     color={area.color} />
          <div style={{ width: 1, height: 24, backgroundColor: `${area.color}20`, margin: "0 8px" }} />
          <FooterStat icon={<BookOpen size={13} color={area.color} />} value={linkedHabits.length} label="Habits"    color={area.color} />
          <div style={{ width: 1, height: 24, backgroundColor: `${area.color}20`, margin: "0 8px" }} />
          <FooterStat icon={<Clock    size={13} color={area.color} />} value={daysLeft}             label="Days Left" color={area.color} />
        </div>
      </div>
    </div>
  );
}

function FooterStat({ icon, value, label, color }: {
  icon: React.ReactNode; value: number; label: string; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
      {icon}
      <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917" }}>{value}</span>
      <span style={{ fontSize: "11px", fontWeight: 500, color: "#78716C" }}>{label}</span>
    </div>
  );
}
