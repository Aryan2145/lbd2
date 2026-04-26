"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, AlignJustify } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import WeekSidebar      from "@/components/weekly/WeekSidebar";
import WeeklyGrid       from "@/components/weekly/WeeklyGrid";
import AgendaView       from "@/components/weekly/AgendaView";
import EventCreateSheet from "@/components/weekly/EventCreateSheet";
import TaskDetailSheet  from "@/components/tasks/TaskDetailSheet";
import type { WeekEvent } from "@/lib/weeklyTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import { toTaskDate } from "@/components/tasks/TaskCard";

type WeekView = "grid" | "agenda";

// ── Date helpers ──────────────────────────────────────────────────────────────
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}

function addWeeks(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n * 7);
  return toTaskDate(d);
}

function getISOWeekNum(iso: string): number {
  const d = new Date(iso + "T00:00:00");
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end   = new Date(weekStart + "T00:00:00");
  end.setDate(start.getDate() + 6);
  const f = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f(start)} – ${f(end)}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WeeklyPage() {
  const {
    goals, tasks, habits,
    eventGroups, weekEvents, weekPlans,
    addEventGroup, updateEventGroup, deleteEventGroup,
    addWeekEvent, updateWeekEvent, deleteWeekEvent,
    upsertWeekPlan, closeTask, reopenTask,
  } = useAppStore();

  const [weekStart,    setWeekStart]    = useState(() => getWeekStart());
  const [weekView,     setWeekView]     = useState<WeekView>("grid");
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [editEvent,    setEditEvent]    = useState<WeekEvent | null>(null);
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);

  const weekNum   = getISOWeekNum(weekStart);
  const dateRange = formatDateRange(weekStart);
  const weekEnd   = addWeeks(weekStart, 1);

  const plan = weekPlans.find((p) => p.weekStart === weekStart) ?? {
    weekStart, priorities: [], outcomes: [], dayNotes: {}, dayThemes: {},
  };

  const thisWeekEvents = weekEvents.filter((e) => e.date >= weekStart && e.date < weekEnd);
  const overdueTasks   = tasks.filter((t) => t.status === "open" && t.deadline < weekStart);

  function openCreateSheet(date: string, startTime: string) {
    setNewEventDate(date);
    setNewEventTime(startTime);
    setEditEvent(null);
    setSheetOpen(true);
  }

  function openEditSheet(ev: WeekEvent) {
    setEditEvent(ev);
    setNewEventDate("");
    setNewEventTime("");
    setSheetOpen(true);
  }

  function handleSaveEvent(ev: WeekEvent) {
    if (editEvent) { updateWeekEvent(ev); } else { addWeekEvent(ev); }
  }

  function handleEditConflict(ev: WeekEvent) {
    // Switch the open sheet to edit the conflicting event directly
    setEditEvent(ev);
    setNewEventDate("");
    setNewEventTime("");
  }

  const isCurrentWeek = weekStart === getWeekStart();

  return (
    <div style={{
      height: "100%", backgroundColor: "#FAF5EE",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 28px 12px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, backgroundColor: "#FAF5EE",
      }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
            Module 06 · Weekly Plan
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Week {weekNum} · {dateRange}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* View toggle */}
          <div style={{ display: "flex", borderRadius: "9px", border: "1.5px solid #C8BFB5",
            overflow: "hidden", backgroundColor: "#FFFFFF" }}>
            {([
              ["grid",   <LayoutGrid   size={14} />, "Time Grid"],
              ["agenda", <AlignJustify size={14} />, "Agenda"],
            ] as [WeekView, React.ReactNode, string][]).map(([v, icon, label]) => (
              <button key={v} onClick={() => setWeekView(v)} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 12px", border: "none",
                backgroundColor: weekView === v ? "#F97316" : "#FFFFFF",
                color: weekView === v ? "#FFFFFF" : "#57534E",
                fontSize: "11px", fontWeight: 700, cursor: "pointer",
              }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Week navigation */}
          <button onClick={() => setWeekStart((w) => addWeeks(w, -1))} style={navBtn}>
            <ChevronLeft size={16} color="#44403C" />
          </button>
          <button onClick={() => setWeekStart(getWeekStart())} style={{
            ...navBtn, width: "auto", padding: "6px 16px",
            fontSize: "12px", fontWeight: 700,
            color: isCurrentWeek ? "#57534E" : "#F97316",
            borderColor: isCurrentWeek ? "#C8BFB5" : "#FED7AA",
            backgroundColor: isCurrentWeek ? "#FFFFFF" : "#FFF7ED",
          }}>
            Today
          </button>
          <button onClick={() => setWeekStart((w) => addWeeks(w, 1))} style={navBtn}>
            <ChevronRight size={16} color="#44403C" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        <WeekSidebar
          weekStart={weekStart}
          plan={plan}
          eventGroups={eventGroups}
          overdueTasks={overdueTasks}
          onUpdatePlan={upsertWeekPlan}
          onAddGroup={addEventGroup}
          onUpdateGroup={updateEventGroup}
          onDeleteGroup={deleteEventGroup}
        />

        {weekView === "grid" ? (
          <WeeklyGrid
            weekStart={weekStart}
            weekEvents={thisWeekEvents}
            tasks={tasks}
            habits={habits}
            eventGroups={eventGroups}
            plan={plan}
            onCreateEvent={openCreateSheet}
            onEditEvent={openEditSheet}
            onUpdatePlan={upsertWeekPlan}
            onTaskClick={setSelectedTask}
          />
        ) : (
          <AgendaView
            weekStart={weekStart}
            weekEvents={thisWeekEvents}
            tasks={tasks}
            eventGroups={eventGroups}
            onCreateEvent={openCreateSheet}
            onEditEvent={openEditSheet}
            onTaskClick={setSelectedTask}
          />
        )}
      </div>

      <EventCreateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSaveEvent}
        onDelete={deleteWeekEvent}
        eventGroups={eventGroups}
        existingEvents={weekEvents}
        editEvent={editEvent}
        initialDate={newEventDate}
        initialTime={newEventTime}
        onEditConflict={handleEditConflict}
      />

      <TaskDetailSheet
        task={selectedTask}
        goals={goals}
        onClose={() => setSelectedTask(null)}
        onComplete={(id) => { closeTask(id, "complete"); }}
        onMiss={(id) => { closeTask(id, "incomplete"); }}
        onReopen={reopenTask}
      />
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: "34px", height: "34px", borderRadius: "8px",
  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};
