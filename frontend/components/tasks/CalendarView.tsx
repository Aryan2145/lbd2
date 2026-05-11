"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronRight as Caret } from "lucide-react";
import { toTaskDate, Q_META, fmtDeadline, type TaskData } from "@/components/tasks/TaskCard";
import TaskDetailSheet from "@/components/tasks/TaskDetailSheet";
import type { GoalData } from "@/components/goals/GoalCard";

interface Props {
  tasks:      TaskData[];
  goals:      GoalData[];
  onComplete: (id: string) => void;
  onMiss:     (id: string) => void;
  onReopen?:  (id: string) => void;
}

const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarView({ tasks, goals, onComplete, onMiss, onReopen }: Props) {
  const today = new Date();
  const [year,         setYear]         = useState(today.getFullYear());
  const [month,        setMonth]        = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toTaskDate(today));
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);

  const todayISO       = toTaskDate(today);
  const taskSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    taskSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedDate]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const tasksByDate = new Map<string, TaskData[]>();
  for (const t of tasks) {
    if (!tasksByDate.has(t.deadline)) tasksByDate.set(t.deadline, []);
    tasksByDate.get(t.deadline)!.push(t);
  }

  const cells          = getCalendarCells(year, month);
  const selectedTasks  = tasksByDate.get(selectedDate) ?? [];
  const openSelected   = selectedTasks.filter((t) => t.status === "open");
  const closedSelected = selectedTasks.filter((t) => t.status !== "open");

  function renderGrid() {
    return (
      <>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <button onClick={prevMonth} style={navBtn}>
            <ChevronLeft size={16} color="#78716C" />
          </button>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}>
            <ChevronRight size={16} color="#78716C" />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" }}>
          {DAY_LABELS.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700,
              color: "#A8A29E", paddingBottom: "6px" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const iso        = isoFor(year, month, day);
            const isToday    = iso === todayISO;
            const isSelected = iso === selectedDate;
            const dayTasks   = tasksByDate.get(iso) ?? [];
            const hasOverdue = dayTasks.some((t) => t.status === "open") && iso < todayISO;

            return (
              <button key={iso} onClick={() => setSelectedDate(iso)} style={{
                aspectRatio: "1", borderRadius: "8px", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "flex-start",
                padding: "6px 4px",
                backgroundColor: isSelected ? "#F97316" : isToday ? "#FFF7ED" : "#FFFFFF",
                outline: isToday && !isSelected ? "1.5px solid #FED7AA" : undefined,
              }}>
                <span style={{
                  fontSize: "12px", fontWeight: isToday || isSelected ? 700 : 400,
                  color: isSelected ? "#FFFFFF" : isToday ? "#F97316" : hasOverdue ? "#DC2626" : "#1C1917",
                  lineHeight: 1, marginBottom: "4px",
                }}>
                  {day}
                </span>
                {dayTasks.length > 0 && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700, lineHeight: 1,
                    color: isSelected ? "rgba(255,255,255,0.9)" : hasOverdue ? "#DC2626" : "#F97316",
                    backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : hasOverdue ? "#FEF2F2" : "#FFF7ED",
                    padding: "1px 5px", borderRadius: "20px",
                  }}>
                    {dayTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {(["Q1","Q2","Q3","Q4"] as const).map((q) => (
            <div key={q} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: Q_META[q].color }} />
              <span style={{ fontSize: "10px", color: "#78716C" }}>{Q_META[q].label}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderTasks() {
    return (
      <>
        <div style={{ marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid #EDE5D8" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917" }}>
            {selectedDate === todayISO ? "Today · " : ""}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US",
              { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <p style={{ fontSize: "11px", color: "#A8A29E", marginTop: "2px" }}>
            {selectedTasks.length === 0
              ? "No tasks"
              : `${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""} — tap any task for details`}
          </p>
        </div>

        {selectedTasks.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            padding: "32px 0" }}>
            <p style={{ fontSize: "12px", color: "#A8A29E" }}>No tasks on this day</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {openSelected.length > 0 && (
              <>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#A8A29E",
                  textTransform: "uppercase", letterSpacing: "0.05em" }}>Open</p>
                {openSelected.map((t) => (
                  <TaskRow key={t.id} task={t} onClick={() => setSelectedTask(t)} />
                ))}
              </>
            )}
            {closedSelected.length > 0 && (
              <>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#A8A29E",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "8px" }}>Closed</p>
                {closedSelected.map((t) => (
                  <TaskRow key={t.id} task={t} onClick={() => setSelectedTask(t)} />
                ))}
              </>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Mobile: calendar stacked above task list */}
      <div className="flex flex-col lg:hidden no-scrollbar" style={{ height: "100%", overflowY: "auto", gap: "0", scrollbarWidth: "none" }}>
        <div style={{ flexShrink: 0 }}>
          {renderGrid()}
        </div>
        <div ref={taskSectionRef} style={{ marginTop: "20px", paddingTop: "16px", borderTop: "2px solid #EDE5D8" }}>
          {renderTasks()}
        </div>
      </div>

      {/* Desktop: original side-by-side layout — untouched */}
      <div className="hidden lg:flex" style={{ gap: "16px", height: "100%" }}>
        <div style={{ flex: "0 0 420px", display: "flex", flexDirection: "column" }}>
          {renderGrid()}
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {renderTasks()}
        </div>
      </div>

      <TaskDetailSheet
        task={selectedTask}
        goals={goals}
        onClose={() => setSelectedTask(null)}
        onComplete={onComplete}
        onMiss={onMiss}
        onReopen={onReopen}
      />
    </>
  );
}

function TaskRow({ task, onClick }: { task: TaskData; onClick: () => void }) {
  const m          = Q_META[task.quadrant];
  const isComplete = task.status === "complete";

  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "9px 12px", borderRadius: "10px", cursor: "pointer",
      border: `1.5px solid ${m.border}`,
      backgroundColor: m.bg,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: m.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "13px", fontWeight: 600, color: isComplete ? "#9CA3AF" : "#1C1917",
          textDecoration: isComplete ? "line-through" : "none",
          margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {task.title}
        </p>
        <p style={{ fontSize: "10px", color: "#A8A29E", margin: "2px 0 0" }}>
          {m.label} · {fmtDeadline(task.deadline)}
        </p>
      </div>
      <span style={{
        fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", flexShrink: 0,
        color: isComplete ? "#16A34A" : task.status === "incomplete" ? "#9CA3AF" : m.color,
        backgroundColor: isComplete ? "#F0FDF4" : task.status === "incomplete" ? "#F9FAFB" : m.bg,
        border: `1px solid ${isComplete ? "#BBF7D0" : task.status === "incomplete" ? "#E5E7EB" : m.border}`,
      }}>
        {isComplete ? "Done" : task.status === "incomplete" ? "Missed" : "Open"}
      </span>
      <Caret size={13} color="#C4B5A8" style={{ flexShrink: 0 }} />
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: "30px", height: "30px", borderRadius: "8px",
  border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
