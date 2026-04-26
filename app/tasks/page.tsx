"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, LayoutGrid, Calendar, BarChart2,
  Archive, Search, X,
  // RECURRING_DISABLED: RefreshCw, CheckSquare,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import EisenhowerMatrix from "@/components/tasks/EisenhowerMatrix";
import ScheduleView     from "@/components/tasks/ScheduleView";
import CalendarView     from "@/components/tasks/CalendarView";
import ClosedView       from "@/components/tasks/ClosedView";
// RECURRING_DISABLED: import TemplatesView from "@/components/tasks/TemplatesView";
import AnalyticsPanel   from "@/components/tasks/AnalyticsPanel";
import TaskCreateSheet  from "@/components/tasks/TaskCreateSheet";
import TaskDetailSheet  from "@/components/tasks/TaskDetailSheet";
import TaskCard, { toTaskDate } from "@/components/tasks/TaskCard";
import type { TaskData } from "@/components/tasks/TaskCard";
// RECURRING_DISABLED: import type { RecurringTemplate } from "@/components/tasks/TaskCard";

type View = "matrix" | "schedule" | "calendar" | "closed" | "analytics"; // RECURRING_DISABLED: | "templates"

const VIEWS: { value: View; icon: React.ElementType; label: string }[] = [
  { value: "matrix",    icon: LayoutGrid,  label: "Matrix"    },
  { value: "schedule",  icon: Calendar,    label: "Schedule"  },
  { value: "calendar",  icon: Calendar,    label: "Calendar"  },
  { value: "closed",    icon: Archive,     label: "Closed"    },
  // RECURRING_DISABLED: { value: "templates", icon: RefreshCw, label: "Templates" },
  { value: "analytics", icon: BarChart2,   label: "Analytics" },
];

export default function TasksPage() {
  const {
    goals, tasks,
    // RECURRING_DISABLED: templates, addTemplate, updateTemplate, deleteTemplate, spawnInstances,
    addTask, updateTask, closeTask, reopenTask,
  } = useAppStore();

  const [view,         setView]         = useState<View>("matrix");
  const [createOpen,   setCreateOpen]   = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // RECURRING_DISABLED: useEffect(() => { spawnInstances(30); }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Keep selectedTask in sync with store updates
  useEffect(() => {
    if (!selectedTask) return;
    const updated = tasks.find((t) => t.id === selectedTask.id);
    if (updated) setSelectedTask(updated);
    else setSelectedTask(null);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const today       = toTaskDate();
  const open        = tasks.filter((t) => t.status === "open");
  const overdue     = open.filter((t) => t.deadline < today);
  const dueToday    = open.filter((t) => t.deadline === today);
  const closed      = tasks.filter((t) => t.status !== "open");
  const complete    = tasks.filter((t) => t.status === "complete");
  const successRate = closed.length > 0
    ? Math.round((complete.length / closed.length) * 100) : 0;

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    : [];

  /* RECURRING_DISABLED — template save handler
  function handleSaveTemplate(tpl: RecurringTemplate) {
    addTemplate(tpl);
    spawnInstances(30);
  }
  RECURRING_DISABLED */

  function clearSearch() {
    setSearchQuery("");
    setSearchOpen(false);
  }

  const showSearch = q.length > 0;

  return (
    <div style={{ height: "100%", backgroundColor: "#FAF5EE",
      display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "16px 28px 12px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
            Module 05 · Tasks
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Task Command Center
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Stat label="Open"       value={open.length}       color="#1C1917" />
          <Stat label="Due today"  value={dueToday.length}   color="#F97316" />
          {overdue.length > 0 && (
            <Stat label="Overdue"  value={overdue.length}    color="#DC2626" />
          )}
          <Stat label="Success"    value={`${successRate}%`} color="#16A34A" />
          <button onClick={() => setCreateOpen(true)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 15px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "12px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}>
            <Plus size={13} /> Add Task
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "10px 28px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "nowrap" }}>

        {!searchOpen && VIEWS.map(({ value, icon: Icon, label }) => {
          // RECURRING_DISABLED: const badge = value === "closed" ? closed.length : value === "templates" ? templates.length : null;
          const badge = value === "closed" ? closed.length : null;
          return (
            <button key={value} onClick={() => setView(value)} style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "5px 12px", borderRadius: "8px", whiteSpace: "nowrap",
              border: `1.5px solid ${view === value ? "#F97316" : "#E8DDD0"}`,
              backgroundColor: view === value ? "#FFF7ED" : "#FFFFFF",
              color: view === value ? "#F97316" : "#78716C",
              fontSize: "11px", fontWeight: 600, cursor: "pointer",
            }}>
              <Icon size={12} />
              {label}
              {badge !== null && badge > 0 && (
                <span style={{
                  fontSize: "9px", fontWeight: 700,
                  backgroundColor: view === value ? "#F97316" : "#E8DDD0",
                  color: view === value ? "#FFFFFF" : "#78716C",
                  borderRadius: "10px", padding: "1px 5px", marginLeft: "1px",
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        {!searchOpen && overdue.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px",
            padding: "4px 10px", borderRadius: "20px",
            backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%",
              backgroundColor: "#DC2626" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#DC2626" }}>
              {overdue.length} overdue
            </span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {searchOpen ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px",
            flex: 1, maxWidth: "360px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={12} color="#A8A29E" style={{
                position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                style={{
                  width: "100%", padding: "7px 10px 7px 28px", borderRadius: "8px",
                  border: "1.5px solid #F97316", backgroundColor: "#FFFFFF",
                  fontSize: "12px", color: "#1C1917", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button onClick={clearSearch} style={{
              width: "28px", height: "28px", borderRadius: "8px",
              border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <X size={13} color="#78716C" />
            </button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "5px 12px", borderRadius: "8px",
            border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
            fontSize: "11px", color: "#78716C", cursor: "pointer",
          }}>
            <Search size={12} /> Search
          </button>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "16px 28px", overflow: "hidden",
        display: "flex", flexDirection: "column" }}>

        {showSearch ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <p style={{ fontSize: "12px", color: "#78716C", marginBottom: "12px", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, color: "#1C1917" }}>{searchResults.length}</span>{" "}
              result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
            </p>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {searchResults.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
                  <p style={{ fontSize: "13px", color: "#A8A29E" }}>No tasks match your search</p>
                </div>
              ) : (
                searchResults.map((t) => (
                  <TaskCard key={t.id} task={t}
                    onClick={() => setSelectedTask(t)}
                    onComplete={(id) => closeTask(id, "complete")}
                    onMiss={(id) => closeTask(id, "incomplete")}
                  />
                ))
              )}
            </div>
          </div>
        ) : view === "matrix" ? (
          <EisenhowerMatrix
            tasks={tasks}
            onComplete={(id) => closeTask(id, "complete")}
            onMiss={(id) => closeTask(id, "incomplete")}
            onSelect={(t) => setSelectedTask(t)}
          />
        ) : view === "schedule" ? (
          <ScheduleView tasks={tasks}
            onComplete={(id) => closeTask(id, "complete")}
            onMiss={(id) => closeTask(id, "incomplete")}
          />
        ) : view === "calendar" ? (
          <CalendarView tasks={tasks} goals={goals}
            onComplete={(id) => closeTask(id, "complete")}
            onMiss={(id) => closeTask(id, "incomplete")}
            onReopen={reopenTask}
          />
        ) : view === "closed" ? (
          <ClosedView tasks={tasks} onReopen={reopenTask} />
        ) : /* RECURRING_DISABLED: view === "templates" — TemplatesView removed */ (
          <AnalyticsPanel tasks={tasks} />
        )}
      </div>

      <TaskCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaveTask={addTask}
        onSaveTemplate={() => { /* RECURRING_DISABLED */ }}
        goals={goals}
      />

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

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: "11px", fontWeight: 500, color: "#78716C", marginBottom: "1px" }}>{label}</p>
      <p style={{ fontSize: "20px", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
    </div>
  );
}
