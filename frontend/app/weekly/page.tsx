"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, AlignJustify, CalendarDays, X, Settings2, Link2, Link2Off, CheckCircle } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { api } from "@/lib/api";
import WeekSidebar        from "@/components/weekly/WeekSidebar";
import WeeklyGrid         from "@/components/weekly/WeeklyGrid";
import AgendaView         from "@/components/weekly/AgendaView";
import EventCreateSheet   from "@/components/weekly/EventCreateSheet";
import WeeklyReviewSheet  from "@/components/weekly/WeeklyReviewSheet";
import TaskDetailSheet    from "@/components/tasks/TaskDetailSheet";
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
    weeklyReviews, eveningReflections,
    addEventGroup, updateEventGroup, deleteEventGroup,
    addWeekEvent, updateWeekEvent, deleteWeekEvent,
    upsertWeekPlan, upsertWeeklyReview, upsertEveningReflection,
    closeTask, reopenTask, toggleHabitDay,
  } = useAppStore();

  const [weekStart,    setWeekStart]    = useState(() => getWeekStart());
  const [weekView,     setWeekView]     = useState<WeekView>("grid");
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [editEvent,    setEditEvent]    = useState<WeekEvent | null>(null);
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [reviewOpen,   setReviewOpen]   = useState(false);
  const [gcalOpen,       setGcalOpen]       = useState(false);
  const [gcalUrl,        setGcalUrl]        = useState("");
  const [editingUrl,     setEditingUrl]     = useState(false);
  const [urlDraft,       setUrlDraft]       = useState("");
  const [gcalConnected,  setGcalConnected]  = useState(false);
  const [gcalToast,      setGcalToast]      = useState<"connected" | "error" | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lbd_gcal_embed_url") ?? "";
    setGcalUrl(saved);

    // Check OAuth connection status
    api.get<{ connected: boolean }>("/auth/google/status")
      .then(d => setGcalConnected(d.connected))
      .catch(() => {});

    // Handle redirect back from Google OAuth
    const params = new URLSearchParams(window.location.search);
    const gcalParam = params.get("gcal");
    if (gcalParam === "connected") {
      setGcalConnected(true);
      setGcalToast("connected");
      setTimeout(() => setGcalToast(null), 4000);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gcalParam === "error") {
      setGcalToast("error");
      setTimeout(() => setGcalToast(null), 4000);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const saveGcalUrl = () => {
    const trimmed = urlDraft.trim();
    setGcalUrl(trimmed);
    localStorage.setItem("lbd_gcal_embed_url", trimmed);
    setEditingUrl(false);
  };

  const handleConnectGcal = async () => {
    try {
      const { url } = await api.get<{ url: string }>("/auth/google/url");
      window.location.href = url;
    } catch {}
  };

  const handleDisconnectGcal = async () => {
    try {
      await api.del("/auth/google");
      setGcalConnected(false);
    } catch {}
  };

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
    setEditEvent(ev);
    setNewEventDate("");
    setNewEventTime("");
  }

  const isCurrentWeek = weekStart === getWeekStart();
  const currentReview = weeklyReviews.find((r) => r.weekStart === weekStart) ?? null;

  // ── Full-page review ──────────────────────────────────────────────────────
  if (reviewOpen) {
    return (
      <WeeklyReviewSheet
        open={true}
        onClose={() => setReviewOpen(false)}
        weekStart={weekStart}
        review={currentReview}
        onSave={upsertWeeklyReview}
        tasks={tasks}
        habits={habits}
        eveningReflections={eveningReflections}
        weekPlanOutcomes={plan.outcomes ?? []}
        onCompleteTask={(id) => closeTask(id, "complete")}
        onReopenTask={reopenTask}
        onToggleHabit={toggleHabitDay}
        onAddWin={(date, text) => {
          const existing = eveningReflections.find((r) => r.date === date);
          upsertEveningReflection({
            date,
            energyLevel:  existing?.energyLevel  ?? 5,
            mood:         existing?.mood          ?? "",
            highlights:   existing?.highlights    ?? "",
            keyLearnings: existing?.keyLearnings  ?? "",
            wins:         [...(existing?.wins ?? []), text],
            notes:        existing?.notes         ?? "",
            stuck:        existing?.stuck         ?? [],
          });
        }}
      />
    );
  }

  return (
    <div style={{
      height: "100%", backgroundColor: "#FAF5EE",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* Google Calendar OAuth toast */}
      {gcalToast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 100,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: "12px",
          backgroundColor: gcalToast === "connected" ? "#FFFFFF" : "#FFF1F0",
          border: `1px solid ${gcalToast === "connected" ? "#E8DDD0" : "#FECACA"}`,
          boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
        }}>
          <CheckCircle size={16} color={gcalToast === "connected" ? "#22C55E" : "#EF4444"} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>
            {gcalToast === "connected" ? "Google Calendar connected!" : "Connection failed. Please try again."}
          </span>
        </div>
      )}

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
          {/* Google Calendar embed button */}
          <button
            onClick={() => { setGcalOpen(true); setEditingUrl(false); }}
            title="View Google Calendar"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 13px", borderRadius: "8px",
              border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
              fontSize: "11px", fontWeight: 700, color: "#57534E", cursor: "pointer",
            }}
          >
            <CalendarDays size={13} color="#F97316" /> Google Calendar
          </button>

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
          hasReview={currentReview !== null}
          onOpenReview={() => setReviewOpen(true)}
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

      {/* ── Google Calendar Modal ── */}
      {gcalOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setGcalOpen(false); setEditingUrl(false); }}
            style={{
              position: "fixed", inset: 0, zIndex: 40,
              backgroundColor: "rgba(28,25,23,0.4)", backdropFilter: "blur(3px)",
            }}
          />
          {/* Panel */}
          <div style={{
            position: "fixed", top: "5vh", left: "5vw",
            width: "90vw", height: "90vh", zIndex: 50,
            backgroundColor: "#FFFFFF", borderRadius: "16px",
            border: "1px solid #E8DDD0",
            boxShadow: "0 24px 80px rgba(28,25,23,0.18)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Modal header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: "1px solid #F2EAE0", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CalendarDays size={16} color="#F97316" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917" }}>
                  Google Calendar
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Sync connect/disconnect */}
                {gcalConnected ? (
                  <button
                    onClick={handleDisconnectGcal}
                    title="Disconnect Google Calendar sync"
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "4px 10px", borderRadius: "7px",
                      border: "1px solid #BBF7D0", backgroundColor: "#F0FDF4",
                      fontSize: "11px", color: "#16A34A", cursor: "pointer",
                    }}
                  >
                    <Link2 size={11} /> Sync On
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGcal}
                    title="Connect Google Calendar to auto-sync events"
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "4px 10px", borderRadius: "7px",
                      border: "1px solid #FED7AA", backgroundColor: "#FFF7ED",
                      fontSize: "11px", color: "#EA580C", cursor: "pointer",
                    }}
                  >
                    <Link2Off size={11} /> Connect Sync
                  </button>
                )}
                <button
                  onClick={() => {
                    setUrlDraft(gcalUrl);
                    setEditingUrl(v => !v);
                    setTimeout(() => urlInputRef.current?.focus(), 50);
                  }}
                  title="Set embed URL"
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "4px 10px", borderRadius: "7px",
                    border: "1px solid #E8DDD0", backgroundColor: "#F5F0EB",
                    fontSize: "11px", color: "#78716C", cursor: "pointer",
                  }}
                >
                  <Settings2 size={11} /> Set URL
                </button>
                <button
                  onClick={() => { setGcalOpen(false); setEditingUrl(false); }}
                  style={{
                    width: "28px", height: "28px", borderRadius: "7px",
                    backgroundColor: "#F5F0EB", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} color="#78716C" />
                </button>
              </div>
            </div>

            {/* URL input (shown when editing) */}
            {editingUrl && (
              <div style={{
                padding: "10px 20px", borderBottom: "1px solid #F2EAE0",
                display: "flex", gap: "8px", alignItems: "center", flexShrink: 0,
                backgroundColor: "#FDFAF7",
              }}>
                <input
                  ref={urlInputRef}
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  placeholder="Paste your Google Calendar embed URL…"
                  onKeyDown={e => { if (e.key === "Enter") saveGcalUrl(); if (e.key === "Escape") setEditingUrl(false); }}
                  style={{
                    flex: 1, fontSize: "12px", color: "#1C1917",
                    padding: "7px 10px", borderRadius: "8px",
                    border: "1.5px solid #F97316", outline: "none",
                    backgroundColor: "#FFFFFF", fontFamily: "inherit",
                  }}
                />
                <button onClick={saveGcalUrl} style={{
                  padding: "7px 14px", borderRadius: "8px", border: "none",
                  background: "linear-gradient(135deg,#F97316,#EA580C)",
                  color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                }}>
                  Save
                </button>
              </div>
            )}

            {/* How to get URL hint */}
            {editingUrl && (
              <div style={{
                padding: "8px 20px", backgroundColor: "#FFF7ED",
                borderBottom: "1px solid #FED7AA", flexShrink: 0,
              }}>
                <p style={{ fontSize: "11px", color: "#78716C", margin: 0 }}>
                  In Google Calendar → Settings → <strong>your calendar</strong> → Integrate calendar → copy <strong>Embeddable link</strong>
                </p>
              </div>
            )}

            {/* Iframe or empty state */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {gcalUrl ? (
                <iframe
                  src={gcalUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Google Calendar"
                />
              ) : (
                <div style={{
                  height: "100%", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "12px",
                }}>
                  <CalendarDays size={40} color="#E8DDD0" />
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#1C1917" }}>
                    No calendar linked yet
                  </p>
                  <p style={{ fontSize: "12px", color: "#78716C", maxWidth: 360, textAlign: "center" }}>
                    Click <strong>Set URL</strong> above and paste your Google Calendar embed link.
                    In Google Calendar → Settings → your calendar → Integrate calendar → Embeddable link.
                  </p>
                  <button
                    onClick={() => { setUrlDraft(""); setEditingUrl(true); setTimeout(() => urlInputRef.current?.focus(), 50); }}
                    style={{
                      padding: "8px 20px", borderRadius: "9px", border: "none",
                      background: "linear-gradient(135deg,#F97316,#EA580C)",
                      color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Set embed URL
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: "34px", height: "34px", borderRadius: "8px",
  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};
