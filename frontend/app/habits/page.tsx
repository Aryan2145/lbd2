"use client";

import { useState } from "react";
import { Plus, Flame, Repeat2, CheckCheck } from "lucide-react";
import HabitCard, { toLocalDate, isScheduledDay, calcStreak, isHabitDoneOnDate, type HabitData, type LifeArea } from "@/components/habits/HabitCard";
import HabitCreateSheet from "@/components/habits/HabitCreateSheet";
import HabitDetailSheet from "@/components/habits/HabitDetailSheet";
import { useAppStore } from "@/lib/AppStore";

const FILTERS = [
  { value: "today",         label: "Today"          },
  { value: "all",           label: "All habits"     },
  { value: "professional",  label: "Professional"   },
  { value: "wealth",        label: "Wealth"         },
  { value: "health",        label: "Health"         },
  { value: "spiritual",     label: "Spiritual"      },
  { value: "personal",      label: "Personal Growth"},
  { value: "relationships", label: "Relationships"  },
  { value: "contribution",  label: "Contribution"   },
] as const;

type FilterValue = typeof FILTERS[number]["value"];

function applyFilter(habits: HabitData[], f: FilterValue): HabitData[] {
  if (f === "all")   return habits;
  if (f === "today") {
    const dow = new Date().getDay();
    return habits.filter((h) => isScheduledDay(h.frequency, h.customDays, dow));
  }
  return habits.filter((h) => h.area === f);
}

export default function HabitsPage() {
  const {
    goals, habits,
    addHabit, updateHabit, deleteHabit,
    toggleHabitDay, setHabitMeasurement, stepHabitToday,
  } = useAppStore();

  const [filter,      setFilter]      = useState<FilterValue>("today");
  const [createOpen,  setCreateOpen]  = useState(false);
  const [detailHabit, setDetailHabit] = useState<HabitData | null>(null);

  const todayDow   = new Date().getDay();
  const todayStr   = toLocalDate();
  const dueToday   = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, todayDow));
  const doneToday  = dueToday.filter((h) => isHabitDoneOnDate(h, todayStr));
  const todayPct   = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;
  const topStreak  = Math.max(0, ...habits.map(calcStreak));
  const activeCount = habits.filter((h) => calcStreak(h) > 0).length;

  const filtered = applyFilter(habits, filter);

  const handleToggle = (id: string) => {
    toggleHabitDay(id, todayStr);
    setDetailHabit((prev) => {
      if (!prev || prev.id !== id) return prev;
      const has = prev.completions.includes(todayStr);
      return { ...prev, completions: has ? prev.completions.filter((d) => d !== todayStr) : [...prev.completions, todayStr] };
    });
  };

  const handleToggleDate = (id: string, date: string) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    if (habit.type === "measurable") {
      const cur  = habit.measurements[date] ?? 0;
      const next = cur >= habit.target ? 0 : habit.target;
      setHabitMeasurement(id, date, next);
    } else {
      toggleHabitDay(id, date);
    }
  };

  const handleStep = (id: string, delta: number) => {
    stepHabitToday(id, delta);
    setDetailHabit((prev) => {
      if (!prev || prev.id !== id) return prev;
      const cur = prev.measurements[todayStr] ?? 0;
      return { ...prev, measurements: { ...prev.measurements, [todayStr]: Math.max(0, cur + delta) } };
    });
  };

  const handleUpdate = (updated: HabitData) => {
    updateHabit(updated);
    setDetailHabit(updated);
  };

  const handleDelete = (id: string) => {
    deleteHabit(id);
    setDetailHabit(null);
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* Header */}
      <div style={{ padding: "18px 36px 14px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Habits
          </p>
          <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Habit Tracker
          </h1>
          <p style={{ fontSize: "12px", color: "#78716C", marginTop: "3px" }}>
            Small actions, done daily, compound into extraordinary results.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <HeaderStat icon={<Repeat2 size={14} color="#F97316" />} label="Active habits" value={`${habits.length}`} color="#1C1917" />
          <HeaderStat icon={<Flame size={14} color="#F97316" />} label="Top streak" value={`${topStreak} days`} color="#F97316" />
          <HeaderStat icon={<CheckCheck size={14} color="#16A34A" />} label="On streak" value={`${activeCount}`} color="#16A34A" />
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 16px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
            }}>
            <Plus size={14} /> Add Habit
          </button>
        </div>
      </div>

      {/* Today's progress banner */}
      <div style={{
        padding: "14px 36px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", gap: "20px",
        backgroundColor: todayPct === 100 ? "#F0FDF4" : "#FFFFFF",
        transition: "background-color 0.4s",
      }}>
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#78716C", marginBottom: "2px" }}>
            Today&apos;s progress
          </p>
          <p style={{ fontSize: "22px", fontWeight: 800,
            color: todayPct === 100 ? "#16A34A" : "#F97316", lineHeight: 1 }}>
            {doneToday.length}
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#78716C" }}>
              /{dueToday.length} habits
            </span>
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: "10px", color: "#A8A29E", fontWeight: 500, marginBottom: "5px" }}>
            <span>{todayPct === 100 ? "All done! Great work." : `${todayPct}% complete`}</span>
            <span>{dueToday.length - doneToday.length} remaining</span>
          </div>
          <div style={{ height: "8px", borderRadius: "4px", backgroundColor: "#EDE5D8" }}>
            <div style={{
              height: "100%", borderRadius: "4px", width: `${todayPct}%`,
              background: todayPct === 100
                ? "linear-gradient(90deg, #16A34A, #22C55E)"
                : "linear-gradient(90deg, #F97316, #EA580C)",
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
        {todayPct === 100 && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "20px",
            backgroundColor: "#DCFCE7", border: "1px solid #86EFAC" }}>
            <CheckCheck size={14} color="#16A34A" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#16A34A" }}>Perfect day!</span>
          </div>
        )}
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
            {f.value === "today" && (
              <span style={{
                marginLeft: "5px", display: "inline-block",
                width: "16px", height: "16px", lineHeight: "16px",
                borderRadius: "50%",
                backgroundColor: filter === "today" ? "#F97316" : "#E8DDD0",
                color: filter === "today" ? "#FFFFFF" : "#A8A29E",
                fontSize: "9px", fontWeight: 700, textAlign: "center",
              }}>
                {dueToday.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Habit grid */}
      <div style={{ padding: "24px 36px" }}>
        {filtered.length === 0 ? (
          <EmptyState area={filter !== "today" && filter !== "all" ? filter as LifeArea : null}
            onAdd={() => setCreateOpen(true)} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
            {filtered.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                onClick={() => setDetailHabit(habits.find((x) => x.id === h.id) ?? h)}
                onToggleToday={handleToggle}
                onStep={handleStep}
                onToggleDate={handleToggleDate}
              />
            ))}
            <button
              onClick={() => setCreateOpen(true)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "8px",
                backgroundColor: "#FFFFFF", border: "2px dashed #E8DDD0",
                borderRadius: "12px", padding: "28px 16px",
                cursor: "pointer", color: "#A8A29E",
                transition: "border-color 0.2s, color 0.2s", minHeight: "140px",
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
              <span style={{ fontSize: "12px", fontWeight: 600 }}>New habit</span>
            </button>
          </div>
        )}
      </div>

      <HabitCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={addHabit}
        goals={goals}
      />
      <HabitDetailSheet
        habit={detailHabit}
        onClose={() => setDetailHabit(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        goals={goals}
      />
    </div>
  );
}

function HeaderStat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px",
        justifyContent: "flex-end", marginBottom: "2px" }}>
        {icon}
        <p style={{ fontSize: "12px", fontWeight: 500, color: "#78716C", margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: "20px", fontWeight: 700, color, lineHeight: 1, margin: 0 }}>{value}</p>
    </div>
  );
}

function EmptyState({ area, onAdd }: { area: LifeArea | null; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "12px", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "50%",
        backgroundColor: "#FFF7ED",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Flame size={28} color="#F97316" />
      </div>
      <p style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
        {area ? `No ${area} habits yet` : "No habits here"}
      </p>
      <p style={{ fontSize: "13px", color: "#78716C", maxWidth: "320px", lineHeight: 1.5 }}>
        Habits are the bridge between your goals and daily actions. Start small and stay consistent.
      </p>
      <button onClick={onAdd} style={{
        marginTop: "4px", padding: "10px 20px", borderRadius: "10px",
        border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)",
        fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
      }}>
        Add your first habit
      </button>
    </div>
  );
}
