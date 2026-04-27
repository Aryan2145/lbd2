"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { toTaskDate } from "@/components/tasks/TaskCard";
import { isScheduledDay } from "@/components/habits/HabitCard";
import MorningPlan from "@/components/daily/MorningPlan";
import EveningReflectionComponent from "@/components/daily/EveningReflection";
import TaskDetailSheet from "@/components/tasks/TaskDetailSheet";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { DayPlan, EveningReflection } from "@/lib/dayTypes";

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
    dayPlans, eveningReflections,
    upsertDayPlan, upsertEveningReflection,
    toggleHabitDay, stepHabitToday,
    closeTask, reopenTask, addTask, updateTask,
    addWeekEvent, updateWeekEvent, deleteWeekEvent,
  } = useAppStore();

  const today = toTaskDate();

  const [tab,          setTab]          = useState<"plan" | "reflection">("plan");
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

  const defaultPlan: DayPlan = {
    date: viewDate, priorities: [], gratitude: "", decisions: [],
  };
  const plan = dayPlans.find((d) => d.date === viewDate) ?? defaultPlan;

  const defaultReflection: EveningReflection = {
    date: viewDate, energyLevel: 5, mood: "",
    highlights: "", keyLearnings: "",
    wins: ["", "", ""], notes: "",
  };
  const reflection = eveningReflections.find((r) => r.date === viewDate) ?? defaultReflection;

  const dateObj  = new Date(viewDate + "T00:00:00");
  const dayName  = DAY_NAMES[dateObj.getDay()];
  const dateDisp = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const planDone       = plan.priorities.some((p) => p.text.trim());
  const reflectionDone = reflection.highlights.trim().length > 0;

  const isNight    = tab === "reflection";
  const hBg        = isNight ? "#E8E6F5" : "#FAF5EE";
  const hBorder    = isNight ? "#D0CBEC" : "#EDE5D8";
  const labelColor = isNight ? "#6C5DD3" : "#F97316";
  const titleColor = isNight ? "#13111F" : "#1C1917";
  const accent     = isNight ? "#6C5DD3" : "#F97316";
  const navBg      = "#FFFFFF";
  const navBorder  = isNight ? "#C8BEE8" : "#C8BFB5";
  const navText    = isNight ? "#4A4575" : "#57534E";

  return (
    <div style={{
      height: "100%", backgroundColor: isNight ? "#E8E6F5" : "#FAF5EE",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "12px 28px 10px", borderBottom: `1px solid ${hBorder}`,
        display: "flex", alignItems: "center", gap: "16px",
        flexShrink: 0, backgroundColor: hBg,
      }}>
        {/* Title */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: labelColor, marginBottom: "2px" }}>
            Daily
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: titleColor, margin: 0 }}>
            {dayName} · {dateDisp}
          </h1>
        </div>

        {/* Day navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={() => navigateDay(-1)} style={{
            ...navBtnStyle,
            border: `1.5px solid ${navBorder}`,
            backgroundColor: navBg, color: navText,
          }}>‹</button>
          <button
            onClick={() => setViewDate(today)}
            style={{
              padding: "4px 10px", borderRadius: "7px",
              border: `1.5px solid ${viewDate === today ? accent : navBorder}`,
              backgroundColor: viewDate === today ? accent : navBg,
              fontSize: "11px", fontWeight: 600,
              color: viewDate === today ? "#FFFFFF" : navText,
              cursor: "pointer",
            }}
          >
            Today
          </button>
          <button onClick={() => navigateDay(+1)} style={{
            ...navBtnStyle,
            border: `1.5px solid ${navBorder}`,
            backgroundColor: navBg, color: navText,
          }}>›</button>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", borderRadius: "9px", border: `1.5px solid ${navBorder}`,
          overflow: "hidden", backgroundColor: navBg }}>
          {(["plan", "reflection"] as const).map((t) => {
            const active = tab === t;
            const done   = t === "plan" ? planDone : reflectionDone;
            const Icon   = t === "plan" ? Sun : Moon;
            const label  = t === "plan" ? "Plan" : "Reflection";
            const doneColor = t === "plan" ? "#F97316" : "#FBBF24";
            const iconColor = active ? "#FFFFFF" : (done ? doneColor : navText);
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 16px", border: "none",
                backgroundColor: active ? accent : "transparent",
                color: active ? "#FFFFFF" : navText,
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
              }}>
                <Icon size={13} color={iconColor} style={{ fill: (!active && done) ? iconColor : "none" }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {tab === "plan" ? (
          <MorningPlan
            date={viewDate}
            plan={plan}
            onUpdate={upsertDayPlan}
            weekPlan={weekPlan}
            todayEvents={todayEvents}
            eventGroups={eventGroups}
            tasks={tasks}
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
            plan={plan}
            onUpdatePlan={upsertDayPlan}
            habits={todayHabits}
            onToggleHabit={(id) => toggleHabitDay(id, viewDate)}
            onStepHabit={stepHabitToday}
            tasks={tasks.filter((t) => t.deadline === viewDate)}
            onCompleteTask={(id) => closeTask(id, "complete")}
            events={todayEvents}
            eventGroups={eventGroups}
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
