"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, LayoutGrid, Calendar, BarChart2,
  Archive, Search, X, ChevronDown,
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
  const [viewDropOpen, setViewDropOpen] = useState(false);
  const searchRef  = useRef<HTMLInputElement>(null);
  const viewDropRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!viewDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (viewDropRef.current && !viewDropRef.current.contains(e.target as Node))
        setViewDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [viewDropOpen]);

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
    <div style={{ height: "100%", backgroundColor: "#FFFFFF",
      display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div className="px-page-md" style={{ paddingTop: "16px", paddingBottom: "12px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
            Tasks
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Task Command Center
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div className="hidden sm:flex" style={{ alignItems: "center", gap: "20px" }}>
            <Stat label="Open"       value={open.length}       color="#1C1917" />
            <Stat label="Due today"  value={dueToday.length}   color="#F97316" />
            {overdue.length > 0 && (
              <Stat label="Overdue"  value={overdue.length}    color="#DC2626" />
            )}
            <Stat label="Success"    value={`${successRate}%`} color="#16A34A" />
          </div>
          <button onClick={() => setCreateOpen(true)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 15px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "12px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)", whiteSpace: "nowrap",
          }}>
            <Plus size={13} /> Add Task
          </button>
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="flex sm:hidden px-page-md" style={{
        paddingTop: "10px", paddingBottom: "10px", borderBottom: "1px solid #EDE5D8",
        gap: "20px", flexShrink: 0,
      }}>
        <Stat label="Open"      value={open.length}       color="#1C1917" />
        <Stat label="Due today" value={dueToday.length}   color="#F97316" />
        {overdue.length > 0 && (
          <Stat label="Overdue" value={overdue.length}    color="#DC2626" />
        )}
        <Stat label="Success"   value={`${successRate}%`} color="#16A34A" />
      </div>

      {/* Toolbar */}
      <div className="px-page-md" style={{ paddingTop: "10px", paddingBottom: "10px", paddingRight: 0, borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>

        {/* Mobile: view dropdown */}
        <div className="flex sm:hidden" ref={viewDropRef} style={{ position: "relative" }}>
          {(() => {
            const active = VIEWS.find((v) => v.value === view)!;
            const ActiveIcon = active.icon;
            const badge = view === "closed" ? closed.length : null;
            return (
              <>
                <button onClick={() => setViewDropOpen((o) => !o)} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 12px", borderRadius: "8px", whiteSpace: "nowrap",
                  border: "1.5px solid #F97316", backgroundColor: "#F97316",
                  color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                }}>
                  <ActiveIcon size={13} />
                  {active.label}
                  {badge !== null && badge > 0 && (
                    <span style={{
                      fontSize: "9px", fontWeight: 700,
                      backgroundColor: "rgba(255,255,255,0.3)",
                      borderRadius: "10px", padding: "1px 5px",
                    }}>{badge}</span>
                  )}
                  <ChevronDown size={12} style={{ marginLeft: "2px" }} />
                </button>
                {viewDropOpen && (
                  <div style={{
                    position: "fixed", top: "auto", zIndex: 500,
                    backgroundColor: "#FFFFFF", borderRadius: "10px",
                    border: "1.5px solid #EDE5D8",
                    boxShadow: "0 8px 24px rgba(28,25,23,0.14)",
                    minWidth: "160px", overflow: "hidden",
                    marginTop: "4px",
                  }}
                  ref={(el) => {
                    if (!el || !viewDropRef.current) return;
                    const trigger = viewDropRef.current.firstElementChild as HTMLElement;
                    const r = trigger.getBoundingClientRect();
                    el.style.top = `${r.bottom + 4}px`;
                    el.style.left = `${r.left}px`;
                  }}>
                    {VIEWS.map(({ value: v, icon: Icon, label }) => {
                      const b = v === "closed" ? closed.length : null;
                      const isActive = view === v;
                      return (
                        <button key={v} onClick={() => { setView(v); setViewDropOpen(false); }} style={{
                          width: "100%", padding: "9px 14px", border: "none",
                          borderBottom: "1px solid #F5F0EB",
                          backgroundColor: isActive ? "#FFF7ED" : "#FFFFFF",
                          display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
                        }}>
                          <Icon size={12} color={isActive ? "#F97316" : "#78716C"} />
                          <span style={{ flex: 1, fontSize: "12px", fontWeight: 600,
                            color: isActive ? "#F97316" : "#1C1917", textAlign: "left" }}>
                            {label}
                          </span>
                          {b !== null && b > 0 && (
                            <span style={{
                              fontSize: "9px", fontWeight: 700,
                              backgroundColor: isActive ? "#F97316" : "#E8DDD0",
                              color: isActive ? "#FFFFFF" : "#78716C",
                              borderRadius: "10px", padding: "1px 6px",
                            }}>{b}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Desktop: flat tab buttons */}
        <div className="hidden sm:flex" style={{ alignItems: "center", gap: "6px" }}>
          {VIEWS.map(({ value, icon: Icon, label }) => {
            const badge = value === "closed" ? closed.length : null;
            return (
              <button key={value} onClick={() => setView(value)} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 12px", borderRadius: "8px", whiteSpace: "nowrap",
                border: "1.5px solid #F97316",
                backgroundColor: view === value ? "#F97316" : "#FFF7ED",
                color: view === value ? "#FFFFFF" : "#EA580C",
                fontSize: "11px", fontWeight: 600, cursor: "pointer",
              }}>
                <Icon size={12} />
                {label}
                {badge !== null && badge > 0 && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700,
                    backgroundColor: view === value ? "rgba(255,255,255,0.3)" : "#E8DDD0",
                    color: view === value ? "#FFFFFF" : "#78716C",
                    borderRadius: "10px", padding: "1px 5px", marginLeft: "1px",
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          {overdue.length > 0 && (
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
        </div>

        <div style={{ flex: 1 }} />

        {/* Fixed-width container keeps layout stable when toggling search */}
        <div style={{ width: "240px", marginRight: "28px", flexShrink: 0, display: "flex" }}>
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={12} color="#78716C" style={{
                  position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="search-input"
                  style={{
                    width: "100%", padding: "7px 10px 7px 28px", borderRadius: "8px",
                    border: "1.5px solid #F97316", backgroundColor: "#FFFFFF",
                    fontSize: "12px", color: "#1C1917", boxSizing: "border-box",
                  }}
                />
              </div>
              <button onClick={clearSearch} style={{
                flexShrink: 0, width: "30px", height: "30px", borderRadius: "8px",
                border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <X size={13} color="#78716C" />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "6px",
              padding: "7px 10px 7px 10px", borderRadius: "8px",
              border: "1.5px solid #F97316", backgroundColor: "#FFFFFF",
              fontSize: "12px", color: "#1C1917", cursor: "pointer",
            }}>
              <Search size={12} color="#F97316" /> <span style={{ color: "#78716C" }}>Search tasks...</span>
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="px-page-md" style={{ paddingTop: "16px", paddingBottom: "16px", flex: 1, overflow: "hidden",
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
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "11px", fontWeight: 500, color: "#1C1917", marginBottom: "1px" }}>{label}</p>
      <p style={{ fontSize: "20px", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
    </div>
  );
}
