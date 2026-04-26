"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import GoalCard, { type GoalData, type LifeArea } from "@/components/goals/GoalCard";
import GoalCreateSheet from "@/components/goals/GoalCreateSheet";
import GoalDetailSheet from "@/components/goals/GoalDetailSheet";
import { useAppStore } from "@/lib/AppStore";

const FILTERS = [
  { value: "all",           label: "All goals"      },
  { value: "active",        label: "In progress"    },
  { value: "at-risk",       label: "At risk"        },
  { value: "professional",  label: "Professional"   },
  { value: "wealth",        label: "Wealth"         },
  { value: "health",        label: "Health"         },
  { value: "contribution",  label: "Contribution"   },
  { value: "personal",      label: "Personal Growth"},
  { value: "relationships", label: "Relationships"  },
  { value: "spiritual",     label: "Spiritual"      },
] as const;

type FilterValue = typeof FILTERS[number]["value"];

function isStale(g: GoalData) {
  return Math.floor((Date.now() - g.lastMoved) / (1000 * 60 * 60 * 24)) >= 14;
}

function applyFilter(goals: GoalData[], f: FilterValue): GoalData[] {
  if (f === "all")     return goals;
  if (f === "active")  return goals.filter((g) => g.progress > 0 && g.progress < 100);
  if (f === "at-risk") return goals.filter((g) => isStale(g) || g.velocity < 0);
  return goals.filter((g) => g.area === f);
}

export default function GoalsPage() {
  const { goals, habits, addGoal, updateGoal, deleteGoal } = useAppStore();

  const [filter,     setFilter]     = useState<FilterValue>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState<GoalData | null>(null);

  const filtered    = applyFilter(goals, filter);
  const staleCount  = goals.filter(isStale).length;
  const avgProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  const linkedHabitsFor = (goalId: string) =>
    habits.filter((h) => h.linkedGoalId === goalId);

  const handleUpdate = (updated: GoalData) => {
    updateGoal(updated);
    setDetailGoal(updated);
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* Header */}
      <div style={{ padding: "18px 36px 14px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Module 03 · Goals
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

      {/* Filter tabs */}
      <div style={{ padding: "12px 36px", borderBottom: "1px solid #EDE5D8",
        display: "flex", gap: "6px", overflowX: "auto" }}>
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding: "5px 13px", borderRadius: "20px", whiteSpace: "nowrap",
            fontSize: "11px", fontWeight: 600,
            border: `1.5px solid ${filter === f.value ? "#F97316" : "#E8DDD0"}`,
            backgroundColor: filter === f.value ? "#FFF7ED" : "#FFFFFF",
            color: filter === f.value ? "#F97316" : "#78716C",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {f.label}
            {f.value === "at-risk" && staleCount > 0 && (
              <span style={{
                marginLeft: "5px", display: "inline-block",
                width: "15px", height: "15px", lineHeight: "15px",
                borderRadius: "50%", backgroundColor: "#F97316",
                color: "#FFFFFF", fontSize: "9px", fontWeight: 700, textAlign: "center",
              }}>
                {staleCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Goal grid */}
      <div style={{ padding: "24px 36px" }}>
        {filtered.length === 0 ? (
          <EmptyState onAdd={() => setCreateOpen(true)} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {filtered.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                linkedHabits={linkedHabitsFor(g.id)}
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
        onClose={() => setDetailGoal(null)}
        onUpdate={handleUpdate}
        onDelete={(id) => { deleteGoal(id); setDetailGoal(null); }}
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
