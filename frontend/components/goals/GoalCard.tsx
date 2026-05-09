"use client";

import React, { useRef, useCallback } from "react";
import {
  MoreHorizontal, Check, Lock, Calendar, BookOpen, Clock,
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

  const barRef        = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);

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
      onClick={() => { if (suppressClick.current) return; onClick(); }}
      style={{
        backgroundColor: area.bg,
        borderRadius: "16px",
        border: `1px solid ${area.color}30`,
        padding: "16px",
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${area.color}22`;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 10px ${area.color}18`;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            backgroundColor: area.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon size={18} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: area.color }}>
            {area.label}
          </span>
        </div>
        <button
          onClick={e => e.stopPropagation()}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#A8A29E" }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Goal statement */}
      <p style={{
        fontSize: "16px", fontWeight: 700, color: "#1C1917",
        lineHeight: 1.4, marginBottom: "14px",
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {goal.statement}
      </p>

      {/* Progress */}
      <div style={{ marginBottom: "12px" }}>
        <span style={{ fontSize: "22px", fontWeight: 800, color: area.color, lineHeight: 1 }}>
          {goal.progress}%
        </span>
        <div onMouseDown={handleBarMouseDown} style={{ padding: "8px 0 4px", cursor: "default", userSelect: "none" }}>
          <div ref={barRef} style={{ height: "6px", borderRadius: "3px", backgroundColor: `${area.color}20`, position: "relative" }}>
            <div style={{ height: "100%", borderRadius: "3px", width: `${goal.progress}%`, backgroundColor: area.color, position: "relative" }}>
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
        <p style={{ fontSize: "11px", fontWeight: 600, color: area.color, margin: 0, minHeight: "16px" }}>
          {milestones.length > 0 ? `${completedCount} of ${milestones.length} milestones` : ""}
        </p>
      </div>

      {/* Milestone stepper — fixed height so footer stays aligned across all cards */}
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
                  backgroundColor: isCompleted || isCurrent ? area.color : `${area.color}22`,
                  border: isLocked ? `1.5px solid ${area.color}55` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isCompleted && <Check size={13} color="#fff" strokeWidth={3} />}
                  {isCurrent   && <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#fff" }} />}
                  {isLocked    && <Lock size={11} color={area.color} />}
                </div>
                {idx < visibleMilestones.length - 1 && (
                  <div style={{
                    width: 40, height: "1.5px", flexShrink: 0,
                    backgroundColor: m.completed ? area.color : `${area.color}30`,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: "11px", fontWeight: 600, color: area.color, fontStyle: "italic", margin: 0 }}>
          No milestones
        </p>
      )}
      </div>

      {/* Stats footer */}
      <div style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${area.color}25`, paddingTop: "12px" }}>
        <FooterStat icon={<Calendar size={13} color={area.color} />} value={linkedTasks.length}  label="Tasks"       color={area.color} />
        <div style={{ width: 1, height: 24, backgroundColor: `${area.color}25`, margin: "0 8px" }} />
        <FooterStat icon={<BookOpen size={13} color={area.color} />} value={linkedHabits.length} label="Habits"      color={area.color} />
        <div style={{ width: 1, height: 24, backgroundColor: `${area.color}25`, margin: "0 8px" }} />
        <FooterStat icon={<Clock    size={13} color={area.color} />} value={daysLeft}             label="Days Left"   color={area.color} />
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
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#1C1917" }}>{label}</span>
    </div>
  );
}
