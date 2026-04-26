"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/AppStore";
import { toTaskDate } from "@/components/tasks/TaskCard";
import { isScheduledDay } from "@/components/habits/HabitCard";
import MorningIntention from "@/components/daily/MorningIntention";
import EveningReflectionComponent from "@/components/daily/EveningReflection";
import TaskDetailSheet from "@/components/tasks/TaskDetailSheet";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { DayIntention, EveningReflection } from "@/lib/dayTypes";

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "7px",
  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontSize: "15px", color: "#57534E", lineHeight: 1,
};

export default function DailyPage() {
  const {
    goals, tasks, habits, eventGroups, weekEvents, weekPlans,
    dayIntentions, eveningReflections,
    upsertDayIntention, upsertEveningReflection,
    toggleHabitDay, stepHabitToday,
    closeTask, reopenTask, addTask, updateTask,
    addWeekEvent, updateWeekEvent, deleteWeekEvent,
  } = useAppStore();

  const today   = toTaskDate();
  const nowHour = new Date().getHours();

  const [tab,          setTab]          = useState<"morning" | "evening">(() => nowHour >= 16 ? "evening" : "morning");
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [viewDate,     setViewDate]     = useState(today);

  function navigateDay(delta: number) {
    setViewDate((prev) => {
      const d = new Date(prev + "T00:00:00");
      d.setDate(d.getDate() + delta);
      return toTaskDate(d);
    });
  }

  const weekStart = getWeekStart(new Date(viewDate + "T00:00:00"));
  const weekPlan  = weekPlans.find((p) => p.weekStart === weekStart) ?? null;

  const todayEvents = weekEvents
    .filter((e) => e.date === viewDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dow         = new Date(viewDate + "T00:00:00").getDay();
  const todayHabits = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, dow));

  const defaultIntention: DayIntention = {
    date: viewDate, priorities: [], gratitude: "", decisions: [],
  };
  const intention = dayIntentions.find((d) => d.date === viewDate) ?? defaultIntention;

  const defaultReflection: EveningReflection = {
    date: viewDate, energyLevel: 5, mood: "",
    highlights: "", keyLearnings: "",
    wins: ["", "", ""], notes: "",
  };
  const reflection = eveningReflections.find((r) => r.date === viewDate) ?? defaultReflection;

  const dateObj  = new Date(viewDate + "T00:00:00");
  const dayName  = DAY_NAMES[dateObj.getDay()];
  const dateDisp = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const morningDone = intention.priorities.some((p) => p.text.trim());
  const eveningDone = reflection.highlights.trim().length > 0;

  return (
    <div style={{
      height: "100%", backgroundColor: "#FAF5EE",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "12px 28px 10px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", gap: "16px",
        flexShrink: 0, backgroundColor: "#FAF5EE",
      }}>
        {/* Title */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
            Module 07 · Daily
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            {dayName} · {dateDisp}
          </h1>
        </div>

        {/* Day navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={() => navigateDay(-1)} style={navBtnStyle}>‹</button>
          {viewDate !== today && (
            <button
              onClick={() => setViewDate(today)}
              style={{
                padding: "4px 10px", borderRadius: "7px",
                border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
                fontSize: "11px", fontWeight: 600, color: "#57534E", cursor: "pointer",
              }}
            >
              Today
            </button>
          )}
          <button onClick={() => navigateDay(+1)} style={navBtnStyle}>›</button>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", borderRadius: "9px", border: "1.5px solid #C8BFB5",
          overflow: "hidden", backgroundColor: "#FFFFFF" }}>
          {([
            ["morning", "☀️  Intention",  morningDone],
            ["evening", "🌙  Reflection", eveningDone],
          ] as [string, string, boolean][]).map(([t, label, done]) => (
            <button key={t} onClick={() => setTab(t as "morning" | "evening")} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 16px", border: "none",
              backgroundColor: tab === t ? "#F97316" : "#FFFFFF",
              color: tab === t ? "#FFFFFF" : "#57534E",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
            }}>
              {label}
              {done && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  backgroundColor: tab === t ? "rgba(255,255,255,0.6)" : "#16A34A",
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {tab === "morning" ? (
          <MorningIntention
            date={viewDate}
            intention={intention}
            onUpdate={upsertDayIntention}
            weekPlan={weekPlan}
            todayEvents={todayEvents}
            eventGroups={eventGroups}
            tasks={tasks}
            habits={todayHabits}
            onToggleHabit={(id) => toggleHabitDay(id, viewDate)}
            onStepHabit={stepHabitToday}
            onTaskClick={setSelectedTask}
            onAddEvent={addWeekEvent}
            onUpdateEvent={updateWeekEvent}
            onDeleteEvent={deleteWeekEvent}
            onAddTask={addTask}
            onCompleteTask={(id) => closeTask(id, "complete")}
            onUpdateTask={updateTask}
          />
        ) : (
          <EveningReflectionComponent
            date={viewDate}
            reflection={reflection}
            onUpdate={upsertEveningReflection}
          />
        )}
      </div>

      <TaskDetailSheet
        task={selectedTask}
        goals={goals}
        onClose={() => setSelectedTask(null)}
        onComplete={(id) => closeTask(id, "complete")}
        onMiss={(id) => closeTask(id, "incomplete")}
        onReopen={reopenTask}
        onUpdate={updateTask}
      />
    </div>
  );
}
