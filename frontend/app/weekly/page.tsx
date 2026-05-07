"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, AlignJustify, CalendarDays, X, Settings2, Link2, Link2Off, CheckCircle, Plus, Check, Pencil, CalendarRange, ClipboardList } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { api } from "@/lib/api";
import WeekSidebar        from "@/components/weekly/WeekSidebar";
import WeeklyGrid         from "@/components/weekly/WeeklyGrid";
import AgendaView         from "@/components/weekly/AgendaView";
import MobileWeekView     from "@/components/weekly/MobileWeekView";
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
  const [mobileOutcomeDraft,   setMobileOutcomeDraft]   = useState("");
  const [mobileAddingOutcome,  setMobileAddingOutcome]  = useState(false);
  const [mobileEditIdx,        setMobileEditIdx]        = useState<number | null>(null);
  const [mobileEditDraft,      setMobileEditDraft]      = useState("");
  const [mobileExpandedIdx,    setMobileExpandedIdx]    = useState<number | null>(null);
  const mobileOutcomeInputRef = useRef<HTMLInputElement>(null);
  const [editEvent,    setEditEvent]    = useState<WeekEvent | null>(null);
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [reviewOpen,   setReviewOpen]   = useState(false);
  const [mobileTab,    setMobileTab]    = useState<"plan" | "calendar" | "review">("plan");
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
    weekStart, outcomes: [], doneOutcomes: [], dayNotes: {},
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

  function saveMobileOutcome() {
    const val = mobileOutcomeDraft.trim();
    if (val) upsertWeekPlan({ ...plan, outcomes: [...plan.outcomes, val] });
    setMobileOutcomeDraft("");
    setMobileAddingOutcome(false);
  }

  function saveMobileOutcomeEdit(idx: number) {
    const trimmed = mobileEditDraft.trim();
    if (trimmed) {
      const updated = [...plan.outcomes];
      // also update doneOutcomes if the text changed
      const old = updated[idx];
      updated[idx] = trimmed;
      const done = (plan.doneOutcomes ?? []).map(t => t === old ? trimmed : t);
      upsertWeekPlan({ ...plan, outcomes: updated, doneOutcomes: done });
    }
    setMobileEditIdx(null);
    setMobileEditDraft("");
  }

  function toggleOutcomeDone(text: string) {
    const done = plan.doneOutcomes ?? [];
    const next = done.includes(text) ? done.filter(t => t !== text) : [...done, text];
    upsertWeekPlan({ ...plan, doneOutcomes: next });
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

      {/* ══════════════════════════════════════════════════
           MOBILE LAYOUT  (hidden on lg+)
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:hidden" style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Content area — switches per tab */}
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>

          {/* ── PLAN TAB ── */}
          {mobileTab === "plan" && <>
            {/* Mobile header */}
            <div style={{
              padding: "12px 16px 10px",
              borderBottom: "1px solid #EDE5D8",
              backgroundColor: "#FFFFFF",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: "#F97316", marginBottom: "1px" }}>
                  Weekly Plan
                </p>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
                  Week {weekNum} · {dateRange}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {!isCurrentWeek && (
                  <button onClick={() => setWeekStart(getWeekStart())} style={{
                    padding: "5px 10px", borderRadius: "8px",
                    border: "1px solid #FED7AA", backgroundColor: "#FFF7ED",
                    fontSize: "11px", fontWeight: 700, color: "#F97316", cursor: "pointer",
                  }}>
                    Today
                  </button>
                )}
                <button onClick={() => setWeekStart((w) => addWeeks(w, -1))} style={navBtn}>
                  <ChevronLeft size={16} color="#44403C" />
                </button>
                <button onClick={() => setWeekStart((w) => addWeeks(w, 1))} style={navBtn}>
                  <ChevronRight size={16} color="#44403C" />
                </button>
              </div>
            </div>

            {/* Key Outcomes strip */}
            <div style={{
              backgroundColor: "#FFFFFF",
              borderBottom: "1px solid #EDE5D8",
              flexShrink: 0,
            }}>
              <div style={{
                padding: "8px 16px 6px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <p style={{
                    fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#78716C", margin: 0,
                  }}>
                    Key Outcomes
                  </p>
                  {plan.outcomes.length > 0 && (
                    <span style={{
                      fontSize: "9px", fontWeight: 700,
                      backgroundColor: "#EDE5D8", color: "#78716C",
                      borderRadius: "10px", padding: "1px 5px",
                    }}>
                      {plan.outcomes.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setMobileAddingOutcome(true);
                    setTimeout(() => mobileOutcomeInputRef.current?.focus(), 30);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "3px",
                    padding: "3px 8px", borderRadius: "6px",
                    border: "1px solid #FED7AA", backgroundColor: "#FFF7ED",
                    fontSize: "10px", fontWeight: 600, color: "#F97316", cursor: "pointer",
                  }}
                >
                  <Plus size={11} color="#F97316" /> Add
                </button>
              </div>

              <div style={{ maxHeight: "75px", overflowY: "auto", padding: "0 16px 8px" }}>
                {plan.outcomes.length === 0 && !mobileAddingOutcome && (
                  <p style={{ fontSize: "11px", color: "#A8A29E", fontStyle: "italic", margin: 0 }}>
                    No outcomes set for this week
                  </p>
                )}
                {plan.outcomes.map((out, idx) => {
                  const done     = (plan.doneOutcomes ?? []).includes(out);
                  const expanded = mobileExpandedIdx === idx;
                  const editing  = mobileEditIdx === idx;
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px", minHeight: "20px" }}>
                      <button
                        onClick={() => toggleOutcomeDone(out)}
                        style={{
                          flexShrink: 0, width: 16, height: 16, borderRadius: "50%",
                          border: `2px solid ${done ? "#16A34A" : "#C4B5A8"}`,
                          backgroundColor: done ? "#16A34A" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", padding: 0,
                        }}
                      >
                        {done && <Check size={9} color="#FFFFFF" />}
                      </button>

                      {editing ? (
                        <input
                          autoFocus
                          value={mobileEditDraft}
                          onChange={(e) => setMobileEditDraft(e.target.value)}
                          onBlur={() => saveMobileOutcomeEdit(idx)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveMobileOutcomeEdit(idx);
                            if (e.key === "Escape") { setMobileEditIdx(null); setMobileEditDraft(""); }
                          }}
                          style={{
                            flex: 1, padding: "3px 7px", borderRadius: 6,
                            border: "1.5px solid #F97316", backgroundColor: "#FFFFFF",
                            fontSize: "13px", color: "#1C1917", outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => setMobileExpandedIdx(expanded ? null : idx)}
                          title={expanded ? undefined : out}
                          style={{
                            flex: 1, fontSize: "13px",
                            color: done ? "#A8A29E" : "#1C1917",
                            lineHeight: 1.4,
                            textDecoration: done ? "line-through" : "none",
                            cursor: "pointer", overflow: "hidden",
                            textOverflow: expanded ? "unset" : "ellipsis",
                            whiteSpace: expanded ? "normal" : "nowrap",
                            wordBreak: expanded ? "break-word" : undefined,
                          }}
                        >
                          {out}
                        </span>
                      )}

                      {editing ? (
                        <button
                          onClick={() => saveMobileOutcomeEdit(idx)}
                          style={{
                            flexShrink: 0, width: 20, height: 20, border: "none",
                            backgroundColor: "transparent", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                          }}
                        >
                          <Check size={12} color="#16A34A" />
                        </button>
                      ) : (
                        <button
                          onClick={() => { setMobileEditIdx(idx); setMobileEditDraft(out); setMobileExpandedIdx(null); }}
                          style={{
                            flexShrink: 0, width: 20, height: 20, border: "none",
                            backgroundColor: "transparent", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                          }}
                        >
                          <Pencil size={10} color="#A8A29E" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {mobileAddingOutcome && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                    <div style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", border: "2px solid #C4B5A8" }} />
                    <input
                      ref={mobileOutcomeInputRef}
                      value={mobileOutcomeDraft}
                      onChange={(e) => setMobileOutcomeDraft(e.target.value)}
                      onBlur={saveMobileOutcome}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveMobileOutcome();
                        if (e.key === "Escape") { setMobileAddingOutcome(false); setMobileOutcomeDraft(""); }
                      }}
                      placeholder="Enter outcome…"
                      style={{
                        flex: 1, padding: "3px 7px", borderRadius: 6,
                        border: "1.5px solid #F97316", backgroundColor: "#FFFFFF",
                        fontSize: "13px", color: "#1C1917", outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mobile week list */}
            <MobileWeekView
              weekStart={weekStart}
              weekEvents={thisWeekEvents}
              tasks={tasks}
              eventGroups={eventGroups}
              overdueTasks={overdueTasks}
              onCreateEvent={openCreateSheet}
              onEditEvent={openEditSheet}
              onTaskClick={setSelectedTask}
              onCompleteTask={(id) => closeTask(id, "complete")}
              onMissTask={(id) => closeTask(id, "incomplete")}
            />

            {/* FAB — sits above bottom nav */}
            <button
              onClick={() => {
                const t   = toTaskDate();
                const end = addWeeks(weekStart, 1);
                openCreateSheet(t >= weekStart && t < end ? t : weekStart, "09:00");
              }}
              style={{
                position: "fixed",
                bottom: "80px",
                right: "20px",
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                border: "none",
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(249,115,22,0.45)",
                zIndex: 20,
              }}
            >
              <Plus size={24} color="#FFFFFF" />
            </button>
          </>}

          {/* ── CALENDAR TAB ── */}
          {mobileTab === "calendar" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
              {/* Header */}
              <div style={{
                padding: "12px 16px 10px",
                borderBottom: "1px solid #EDE5D8",
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CalendarDays size={16} color="#F97316" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917" }}>Google Calendar</span>
                </div>
                <div style={{ display: "flex", gap: "7px" }}>
                  {gcalConnected ? (
                    <button onClick={handleDisconnectGcal} style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "4px 10px", borderRadius: "7px",
                      border: "1px solid #BBF7D0", backgroundColor: "#F0FDF4",
                      fontSize: "11px", color: "#16A34A", cursor: "pointer",
                    }}>
                      <Link2 size={11} /> Sync On
                    </button>
                  ) : (
                    <button onClick={handleConnectGcal} style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "4px 10px", borderRadius: "7px",
                      border: "1px solid #FED7AA", backgroundColor: "#FFF7ED",
                      fontSize: "11px", color: "#EA580C", cursor: "pointer",
                    }}>
                      <Link2Off size={11} /> Connect
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUrlDraft(gcalUrl);
                      setEditingUrl((v) => !v);
                      setTimeout(() => urlInputRef.current?.focus(), 50);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "4px 10px", borderRadius: "7px",
                      border: "1px solid #E8DDD0", backgroundColor: "#F5F0EB",
                      fontSize: "11px", color: "#78716C", cursor: "pointer",
                    }}
                  >
                    <Settings2 size={11} /> URL
                  </button>
                </div>
              </div>

              {/* URL input */}
              {editingUrl && (
                <div style={{
                  padding: "10px 16px", borderBottom: "1px solid #F2EAE0",
                  display: "flex", gap: "8px", alignItems: "center", flexShrink: 0,
                  backgroundColor: "#FDFAF7",
                }}>
                  <input
                    ref={urlInputRef}
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    placeholder="Paste Google Calendar embed URL…"
                    onKeyDown={(e) => { if (e.key === "Enter") saveGcalUrl(); if (e.key === "Escape") setEditingUrl(false); }}
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

              {/* Content */}
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
                    alignItems: "center", justifyContent: "center", gap: "12px", padding: "24px",
                  }}>
                    <CalendarDays size={40} color="#E8DDD0" />
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#1C1917", textAlign: "center", margin: 0 }}>
                      No calendar linked yet
                    </p>
                    <p style={{ fontSize: "12px", color: "#78716C", maxWidth: 300, textAlign: "center", margin: 0 }}>
                      Tap <strong>URL</strong> above and paste your Google Calendar embed link.
                    </p>
                    <button
                      onClick={() => { setUrlDraft(""); setEditingUrl(true); setTimeout(() => urlInputRef.current?.focus(), 50); }}
                      style={{
                        padding: "9px 22px", borderRadius: "9px", border: "none",
                        background: "linear-gradient(135deg,#F97316,#EA580C)",
                        color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Set embed URL
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── REVIEW TAB ── */}
          {mobileTab === "review" && (
            <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#FAFAF9", padding: "20px 16px" }}>
              <div style={{
                backgroundColor: "#FFFFFF", borderRadius: "16px",
                border: "1px solid #EDE5D8", overflow: "hidden",
              }}>
                <div style={{ padding: "20px" }}>
                  <p style={{
                    fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.1em", color: "#F97316", margin: "0 0 4px",
                  }}>
                    Weekly Review
                  </p>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: "0 0 16px" }}>
                    Week {weekNum} · {dateRange}
                  </p>
                  {currentReview && (
                    <div style={{
                      padding: "10px 12px", borderRadius: "8px",
                      backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0",
                      marginBottom: "14px",
                    }}>
                      <p style={{ fontSize: "12px", color: "#16A34A", fontWeight: 600, margin: 0 }}>
                        Review written ✓
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => setReviewOpen(true)}
                    style={{
                      width: "100%", padding: "13px", borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #F97316, #EA580C)",
                      color: "#FFFFFF", fontSize: "14px", fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {currentReview ? "Edit Weekly Review" : "Write Weekly Review"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Bottom navigation ── */}
        <div style={{
          flexShrink: 0,
          height: "64px",
          borderTop: "1px solid #EDE5D8",
          backgroundColor: "#FFFFFF",
          display: "flex",
          alignItems: "center",
        }}>
          {(["plan", "calendar", "review"] as const).map((id) => {
            const active = mobileTab === id;
            const color  = active ? "#F97316" : "#A8A29E";
            const label  = id === "plan" ? "Plan" : id === "calendar" ? "Calendar" : "Review";
            return (
              <button
                key={id}
                onClick={() => setMobileTab(id)}
                style={{
                  flex: 1, height: "100%", border: "none", backgroundColor: "transparent",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: "3px", cursor: "pointer",
                }}
              >
                {id === "plan"     && <CalendarRange size={20} color={color} />}
                {id === "calendar" && <CalendarDays  size={20} color={color} />}
                {id === "review"   && <ClipboardList size={20} color={color} />}
                <span style={{ fontSize: "10px", fontWeight: 700, color }}>{label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════
           DESKTOP LAYOUT  (hidden below lg)
      ══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ flex: 1, flexDirection: "column", overflow: "hidden" }}>

        {/* ── Desktop Header ── */}
        <div className="px-page-md" style={{
          paddingTop: "16px", paddingBottom: "12px", borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, backgroundColor: "#FAF5EE", flexWrap: "wrap", gap: "8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
                Weekly Plan
              </p>
              <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
                Week {weekNum} · {dateRange}
              </h1>
            </div>
            <button onClick={() => setWeekStart((w) => addWeeks(w, -1))} style={navBtn}>
              <ChevronLeft size={16} color="#44403C" />
            </button>
            <button onClick={() => setWeekStart((w) => addWeeks(w, 1))} style={navBtn}>
              <ChevronRight size={16} color="#44403C" />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekStart(getWeekStart())} style={{
                padding: "5px 14px", borderRadius: "8px",
                border: "1.5px solid #FED7AA", backgroundColor: "#FFF7ED",
                fontSize: "12px", fontWeight: 700, color: "#F97316", cursor: "pointer",
              }}>
                Today
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Weekly Review button */}
            <button
              onClick={() => setReviewOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "5px 13px", borderRadius: "8px",
                border: `1.5px solid ${currentReview ? "#BBF7D0" : "#FED7AA"}`,
                backgroundColor: currentReview ? "#F0FDF4" : "#FFF7ED",
                fontSize: "11px", fontWeight: 700,
                color: currentReview ? "#15803D" : "#F97316",
                cursor: "pointer",
              }}
            >
              <ClipboardList size={13} color={currentReview ? "#15803D" : "#F97316"} />
              {currentReview ? "✓ Review Done · Edit" : "Write Week Review"}
            </button>

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

          </div>
        </div>

        {/* ── Desktop Content ── */}
        <div className="flex-col md:flex-row" style={{ flex: 1, display: "flex", overflow: "auto" }}>

          <WeekSidebar
            weekStart={weekStart}
            plan={plan}
            eventGroups={eventGroups}
            weekEvents={weekEvents}
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
        onAddGroup={addEventGroup}
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
