"use client";

import { useState } from "react";
import { Plus, Target, Check } from "lucide-react";
import GoalCard, { type GoalData, type LifeArea, AREA_META } from "@/components/goals/GoalCard";
import GoalCreateSheet from "@/components/goals/GoalCreateSheet";
import GoalDetailSheet from "@/components/goals/GoalDetailSheet";
import TaskCreateSheet from "@/components/tasks/TaskCreateSheet";
import HabitCreateSheet from "@/components/habits/HabitCreateSheet";
import { useAppStore } from "@/lib/AppStore";

const ALL_AREAS: LifeArea[] = [
  "professional", "wealth", "health", "contribution", "personal", "relationships", "spiritual",
];

type StatusFilter = "all" | "active" | "at-risk";

const STATUS_OPTIONS = [
  { value: "all"      as StatusFilter, label: "All Goals"   },
  { value: "active"   as StatusFilter, label: "In Progress" },
  { value: "at-risk"  as StatusFilter, label: "At Risk"     },
];

function isStale(g: GoalData) {
  return Math.floor((Date.now() - g.lastMoved) / (1000 * 60 * 60 * 24)) >= 14;
}

function applyFilter(goals: GoalData[], areas: Set<LifeArea>, status: StatusFilter): GoalData[] {
  let result = areas.size === 0 || areas.size === ALL_AREAS.length ? goals : goals.filter((g) => areas.has(g.area as LifeArea));
  if (status === "active")  return result.filter((g) => g.progress > 0 && g.progress < 100);
  if (status === "at-risk") return result.filter((g) => isStale(g) || g.velocity < 0);
  return result;
}

export default function GoalsPage() {
  const { goals, habits, tasks, addGoal, updateGoal, deleteGoal, addTask, addHabit, updateTask, updateHabit } = useAppStore();

  const [selectedAreas, setSelectedAreas] = useState<Set<LifeArea>>(new Set(ALL_AREAS));
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState<GoalData | null>(null);
  const [taskPrefill,  setTaskPrefill]  = useState<{ goalId: string; milestoneId: string } | null>(null);
  const [habitPrefill, setHabitPrefill] = useState<{ goalId: string; milestoneId: string } | null>(null);

  const filtered    = applyFilter(goals, selectedAreas, statusFilter);

  function toggleArea(area: LifeArea) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area); else next.add(area);
      return next;
    });
  }
  const staleCount  = goals.filter(isStale).length;
  const avgProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  const linkedHabitsFor = (goalId: string) =>
    habits.filter((h) => h.linkedGoalId === goalId);

  const linkedTasksFor = (goalId: string) =>
    tasks.filter((t) => t.linkedGoalId === goalId);

  const handleUpdate = (updated: GoalData) => {
    updateGoal(updated);
    // Only keep the detail sheet in sync if it's already open for this goal
    setDetailGoal((prev) => prev?.id === updated.id ? updated : prev);
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* Header */}
      <div className="px-page" style={{ paddingTop: "18px", paddingBottom: "14px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Goals
          </p>
          <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Goal Tracker
          </h1>
          <p style={{ fontSize: "12px", color: "#78716C", marginTop: "3px" }}>
            Track meaningful goals tied to your life vision.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Stat label="Goals defined"   value={`${goals.length}`} unit=""  color="#1C1917" />
          <Stat label="Avg. progress"   value={`${avgProgress}`}  unit="%" color="#F97316" />
          {staleCount > 0 && (
            <Stat label="Need attention" value={`${staleCount}`}  unit=""  color="#EA580C" />
          )}
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 16px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
            }}>
            <Plus size={14} /> Add Goal
          </button>
        </div>
      </div>

      {/* Filter panel — desktop */}
      <div className="hidden lg:block px-page" style={{ paddingTop: "10px", paddingBottom: "10px", borderBottom: "1px solid #EDE5D8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#78716C" }}>Life Areas</span>
          <button
            onClick={() => setSelectedAreas(selectedAreas.size === ALL_AREAS.length ? new Set() : new Set(ALL_AREAS))}
            style={{ fontSize: "11px", fontWeight: 600, color: "#F97316",
              background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
            {selectedAreas.size === ALL_AREAS.length ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "5px", marginBottom: "9px" }}>
          {ALL_AREAS.map((area) => {
            const sel = selectedAreas.has(area); const meta = AREA_META[area];
            return (
              <button key={area} onClick={() => toggleArea(area)} style={{
                display: "flex", alignItems: "center", gap: "7px", padding: "6px 10px",
                borderRadius: "10px", backgroundColor: sel ? "#FFF7ED" : "#FAFAFA",
                border: `1.5px solid ${sel ? "#FED7AA" : "#E8DDD0"}`, cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ width: 16, height: 16, borderRadius: "4px", flexShrink: 0,
                  border: `2px solid ${sel ? meta.color : "#C8BFB5"}`,
                  backgroundColor: sel ? meta.color : "#FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sel && <Check size={9} color="#FFFFFF" strokeWidth={3} />}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: sel ? "#EA580C" : "#78716C" }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button key={value} onClick={() => setStatusFilter(value)} style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "5px 13px", borderRadius: "20px", whiteSpace: "nowrap",
              fontSize: "11px", fontWeight: 600,
              border: `1.5px solid ${statusFilter === value ? "#F97316" : "#E8DDD0"}`,
              backgroundColor: statusFilter === value ? "#FFF7ED" : "#FFFFFF",
              color: statusFilter === value ? "#F97316" : "#78716C", cursor: "pointer",
            }}>
              {label}
              {value === "at-risk" && staleCount > 0 && (
                <span style={{ width: "15px", height: "15px", lineHeight: "15px", borderRadius: "50%",
                  backgroundColor: "#F97316", color: "#FFFFFF", fontSize: "9px", fontWeight: 700,
                  textAlign: "center", display: "inline-block", flexShrink: 0 }}>{staleCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel — mobile */}
      <div className="lg:hidden" style={{ borderBottom: "1px solid #EDE5D8" }}>
        {/* Area chips row */}
        <div className="px-page" style={{ paddingTop: "8px", paddingBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "#78716C" }}>Life Areas</span>
            <button
              onClick={() => setSelectedAreas(selectedAreas.size === ALL_AREAS.length ? new Set() : new Set(ALL_AREAS))}
              style={{ fontSize: "11px", fontWeight: 600, color: "#F97316",
                background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {selectedAreas.size === ALL_AREAS.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "5px", overflowX: "auto", paddingBottom: "2px" }}>
            {ALL_AREAS.map((area) => {
              const sel = selectedAreas.has(area); const meta = AREA_META[area];
              return (
                <button key={area} onClick={() => toggleArea(area)} style={{
                  display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
                  padding: "5px 9px", borderRadius: "20px",
                  backgroundColor: sel ? "#FFF7ED" : "#FAFAFA",
                  border: `1.5px solid ${sel ? "#FED7AA" : "#E8DDD0"}`, cursor: "pointer",
                }}>
                  <span style={{ width: 13, height: 13, borderRadius: "3px", flexShrink: 0,
                    border: `2px solid ${sel ? meta.color : "#C8BFB5"}`,
                    backgroundColor: sel ? meta.color : "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {sel && <Check size={7} color="#FFFFFF" strokeWidth={3} />}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap",
                    color: sel ? "#EA580C" : "#78716C" }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Status row */}
        <div className="px-page" style={{ paddingBottom: "8px", display: "flex", gap: "5px" }}>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button key={value} onClick={() => setStatusFilter(value)} style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 11px", borderRadius: "20px", whiteSpace: "nowrap",
              fontSize: "11px", fontWeight: 600,
              border: `1.5px solid ${statusFilter === value ? "#F97316" : "#E8DDD0"}`,
              backgroundColor: statusFilter === value ? "#FFF7ED" : "#FFFFFF",
              color: statusFilter === value ? "#F97316" : "#78716C", cursor: "pointer",
            }}>
              {label}
              {value === "at-risk" && staleCount > 0 && (
                <span style={{ width: "14px", height: "14px", lineHeight: "14px", borderRadius: "50%",
                  backgroundColor: "#F97316", color: "#FFFFFF", fontSize: "9px", fontWeight: 700,
                  textAlign: "center", display: "inline-block", flexShrink: 0 }}>{staleCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Goal grid */}
      <div className="px-page" style={{ paddingTop: "24px", paddingBottom: "24px" }}>
        {selectedAreas.size === 0 ? (
          <NoAreaState />
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setCreateOpen(true)} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {filtered.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                linkedHabits={linkedHabitsFor(g.id)}
                linkedTasks={linkedTasksFor(g.id)}
                onUpdate={handleUpdate}
                onClick={() => setDetailGoal(g)}
              />
            ))}
            <button
              onClick={() => setCreateOpen(true)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "8px",
                backgroundColor: "#FFFFFF", border: "2px dashed #E8DDD0",
                borderRadius: "12px", padding: "32px 16px",
                cursor: "pointer", color: "#A8A29E",
                transition: "border-color 0.2s, color 0.2s", minHeight: "160px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#F97316";
                (e.currentTarget as HTMLButtonElement).style.color = "#F97316";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#E8DDD0";
                (e.currentTarget as HTMLButtonElement).style.color = "#A8A29E";
              }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%",
                border: "2px dashed currentColor",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={16} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>New goal</span>
            </button>
          </div>
        )}
      </div>

      <GoalCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={addGoal}
      />
      <GoalDetailSheet
        goal={detailGoal}
        linkedHabits={detailGoal ? linkedHabitsFor(detailGoal.id) : []}
        tasks={tasks}
        onClose={() => setDetailGoal(null)}
        onUpdate={handleUpdate}
        onDelete={(id) => { deleteGoal(id); setDetailGoal(null); }}
        onUpdateTask={updateTask}
        onUpdateHabit={updateHabit}
        onAddTask={(goalId, milestoneId) => setTaskPrefill({ goalId, milestoneId })}
        onAddHabit={(goalId, milestoneId) => setHabitPrefill({ goalId, milestoneId })}
      />
      <TaskCreateSheet
        open={!!taskPrefill}
        onClose={() => setTaskPrefill(null)}
        onSaveTask={(t) => { addTask(t); setTaskPrefill(null); }}
        onSaveTemplate={() => {}}
        goals={goals}
        initialGoalId={taskPrefill?.goalId}
        initialMilestoneId={taskPrefill?.milestoneId}
      />
      <HabitCreateSheet
        open={!!habitPrefill}
        onClose={() => setHabitPrefill(null)}
        onSave={(h) => { addHabit(h); setHabitPrefill(null); }}
        goals={goals}
        initialGoalId={habitPrefill?.goalId}
        initialMilestoneId={habitPrefill?.milestoneId}
      />
    </div>
  );
}

function Stat({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: "12px", fontWeight: 500, color: "#78716C", marginBottom: "2px" }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: 700, color, lineHeight: 1 }}>
        {value}<span style={{ fontSize: "13px", fontWeight: 500, color: "#78716C" }}>{unit}</span>
      </p>
    </div>
  );
}

function NoAreaState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "10px", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "50%",
        backgroundColor: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Target size={24} color="#F97316" />
      </div>
      <p style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
        No life area selected
      </p>
      <p style={{ fontSize: "13px", color: "#78716C", maxWidth: "280px", lineHeight: 1.5, margin: 0 }}>
        Select at least one life area above to view your goals.
      </p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "12px", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "50%",
        backgroundColor: "#FFF7ED",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Target size={28} color="#F97316" />
      </div>
      <p style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>No goals yet</p>
      <p style={{ fontSize: "13px", color: "#78716C", maxWidth: "320px", lineHeight: 1.5 }}>
        Goals bridge your 10-year vision and daily actions.
      </p>
      <button onClick={onAdd} style={{
        marginTop: "4px", padding: "10px 20px", borderRadius: "10px",
        border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)",
        fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
      }}>
        Add your first goal
      </button>
    </div>
  );
}
