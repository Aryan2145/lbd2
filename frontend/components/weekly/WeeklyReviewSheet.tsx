"use client";

import { useState, useEffect } from "react";
import {
  X, Trophy, Target, CheckSquare, TrendingUp,
  BookOpen, Lightbulb, Star, Plus, Trash2, Check,
} from "lucide-react";
import type {
  WeeklyReview, EveningReflection, LifeArea,
  LifeLessonEntry, CoreValueEntry,
} from "@/lib/dayTypes";
import { LIFE_AREAS, LIFE_AREA_LABELS, LIFE_AREA_COLORS } from "@/lib/dayTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { HabitData } from "@/components/habits/HabitCard";
import { isScheduledDay } from "@/components/habits/HabitCard";
import { toTaskDate } from "@/components/tasks/TaskCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const CORE_VALUES = [
  "Integrity","Courage","Discipline","Gratitude","Growth",
  "Service","Excellence","Compassion","Focus","Humility",
  "Consistency","Love","Resilience","Learning","Family",
  "Leadership","Creativity","Health","Balance","Joy",
  "Honesty","Patience","Wisdom","Purpose","Kindness",
];

const DAY_SHORTS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Day-of-week palette (Mon=0 … Sun=6) — distinct from life-area colors
const DAY_PALETTE = [
  { bg:"#EFF6FF", border:"#BFDBFE", head:"#1D4ED8" }, // Mon — blue
  { bg:"#F0FDF4", border:"#BBF7D0", head:"#15803D" }, // Tue — green
  { bg:"#FFFBEB", border:"#FDE68A", head:"#B45309" }, // Wed — amber
  { bg:"#FFF1F2", border:"#FECDD3", head:"#BE123C" }, // Thu — rose
  { bg:"#FAF5FF", border:"#E9D5FF", head:"#7C3AED" }, // Fri — purple
  { bg:"#F0FDFA", border:"#99F6E4", head:"#0F766E" }, // Sat — teal
  { bg:"#FFF7ED", border:"#FED7AA", head:"#C2410C" }, // Sun — orange
] as const;


// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:               boolean;
  onClose:            () => void;
  weekStart:          string;
  review:             WeeklyReview | null;
  onSave:             (r: WeeklyReview) => void;
  tasks:              TaskData[];
  habits:             HabitData[];
  eveningReflections: EveningReflection[];
  weekPlanOutcomes:   string[];
  onCompleteTask:     (id: string) => void;
  onReopenTask:       (id: string) => void;
  onToggleHabit:      (habitId: string, date: string) => void;
  onAddWin:           (date: string, text: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return toTaskDate(d);
  });
}

function weekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end   = new Date(weekStart + "T00:00:00");
  end.setDate(start.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  return `${f(start)} – ${f(end)}`;
}

function getISOWeekNum(iso: string): number {
  const d = new Date(iso + "T00:00:00");
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function computeHabitRate(habits: HabitData[], weekStart: string): number {
  const dates = weekDates(weekStart);
  let total = 0, done = 0;
  for (let i = 0; i < 7; i++) {
    const ds  = dates[i];
    const dow = new Date(ds + "T00:00:00").getDay();
    for (const h of habits) {
      if (!isScheduledDay(h.frequency, h.customDays, dow)) continue;
      total++;
      const completed = h.type === "binary"
        ? h.completions.includes(ds)
        : (h.measurements[ds] ?? 0) >= h.target;
      if (completed) done++;
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function ordinal(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function wordDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${ordinal(d.getDate())} ${d.toLocaleDateString("en-US", { month:"long" })}, ${d.getFullYear()}`;
}

const emptyReview = (weekStart: string): WeeklyReview => ({
  weekStart,
  topWins:         [],
  outcomeNotes:    "",
  outcomeChecked:  [],
  taskReflection:  "",
  habitReflection: "",
  overallRating:   0,
  journalDate:     "",
  journalText:     "",
  journalSections: [],
  lifeLessons:     [],
  coreValuesLived: [],
});

// ── Shared styles ─────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width:"100%", padding:"9px 12px", borderRadius:"10px",
  border:"1.5px solid #C8BFB5", backgroundColor:"#FFFFFF",
  fontSize:"13px", color:"#1C1917", outline:"none", boxSizing:"border-box",
};

const lbl: React.CSSProperties = {
  display:"block", fontSize:"10px", fontWeight:700, color:"#44403C",
  textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px",
};

const ta: React.CSSProperties = {
  ...inp, resize:"none", fontFamily:"inherit", lineHeight:1.6,
};

const ratingColor = (n: number) =>
  n <= 3 ? "#EF4444" : n <= 6 ? "#F59E0B" : "#10B981";


const thStyle: React.CSSProperties = {
  padding:"8px 10px", fontSize:"9px", fontWeight:700,
  color:"#57534E", textTransform:"uppercase", letterSpacing:"0.06em",
  textAlign:"center" as const,
};

const tdStyle: React.CSSProperties = {
  padding:"7px 4px", textAlign:"center" as const, borderTop:"1px solid #F0EBE4",
};

const delBtn: React.CSSProperties = {
  width:28, height:28, borderRadius:"7px",
  border:"1px solid #EDE5D8", backgroundColor:"#FAFAFA",
  cursor:"pointer", display:"flex", alignItems:"center",
  justifyContent:"center", flexShrink:0,
};

function addDashedBtn(
  borderColor: string, bgColor: string, textColor: string,
): React.CSSProperties {
  return {
    display:"flex", alignItems:"center", gap:"6px",
    padding:"8px 14px", borderRadius:"9px",
    border:`1.5px dashed ${borderColor}`,
    backgroundColor:bgColor, color:textColor,
    fontSize:"12px", fontWeight:600, cursor:"pointer",
  };
}

// ── ReviewCard ────────────────────────────────────────────────────────────────
// Defined at module scope so React doesn't see a new component type on every
// parent re-render (which would unmount/remount and lose textarea focus).

function ReviewCard({
  title, icon, color, maxH, children,
}: {
  title: string; icon: React.ReactNode; color: string;
  maxH?: number | string; children: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor:"#FFFFFF", borderRadius:"14px",
      border:"1px solid #EDE5D8", boxShadow:"0 2px 8px rgba(0,0,0,0.05)",
      display:"flex", flexDirection:"column",
      maxHeight: maxH,
      overflow:"hidden",
    }}>
      <div style={{
        padding:"10px 16px", borderBottom:"1px solid #F0EBE4",
        display:"flex", alignItems:"center", gap:"8px", flexShrink:0,
        backgroundColor:"#FAF5EE",
      }}>
        <div style={{
          width:26, height:26, borderRadius:"7px",
          backgroundColor: color + "20",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {icon}
        </div>
        <span style={{ fontSize:"12px", fontWeight:700, color:"#1C1917",
          textTransform:"uppercase", letterSpacing:"0.06em" }}>
          {title}
        </span>
      </div>
      <div style={{
        flex:1, minHeight:0,
        overflowY:"auto",
        padding:"16px",
        display:"flex", flexDirection:"column",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WeeklyReviewSheet({
  open, onClose, weekStart, review, onSave,
  tasks, habits, eveningReflections, weekPlanOutcomes,
  onCompleteTask, onReopenTask, onToggleHabit, onAddWin,
}: Props) {
  const [draft,  setDraft]  = useState<WeeklyReview>(emptyReview(weekStart));
  const [tab, setTab] = useState<"success" | "reflections">("success");
  const [winPage, setWinPage] = useState(0); // 0=Mon-Wed, 1=Thu-Sat, 2=Sun
  // Wins section: inline "add win" form
  const [addWin, setAddWin] = useState<{ date: string; text: string } | null>(null);
  // Journal: which entry's date picker is open ("main" | section id | null)
  const [openDateFor, setOpenDateFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(review ? { ...emptyReview(weekStart), ...review } : emptyReview(weekStart));
    setTab("success");
    setAddWin(null);
    setOpenDateFor(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const today   = toTaskDate();
  const dates   = weekDates(weekStart);
  const weekEnd = (() => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    return toTaskDate(d);
  })();
  const weekNum   = getISOWeekNum(weekStart);
  const habitRate = computeHabitRate(habits, weekStart);

  function ud<K extends keyof WeeklyReview>(k: K, v: WeeklyReview[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function handleSave() { onSave(draft); onClose(); }

  // ── Section: Top Wins ─────────────────────────────────────────────────────

  function renderWins() {
    // Groups: Mon-Wed | Thu-Sat | Sun
    const WIN_GROUPS = [[0,1,2],[3,4,5],[6]] as const;
    const GROUP_LABELS = ["Mon – Wed", "Thu – Sat", "Sun"];
    const groupIndices = WIN_GROUPS[winPage as 0|1|2];
    const groupDates   = groupIndices.map((i) => dates[i]);

    function getDayWins(date: string) {
      return (eveningReflections.find((r) => r.date === date)?.wins ?? []).filter((w) => w.trim());
    }

    function saveWin() {
      if (!addWin || !addWin.text.trim()) return;
      ud("topWins", [...(draft.topWins ?? []), { id: crypto.randomUUID(), date: addWin.date, text: addWin.text.trim() }]);
      onAddWin(addWin.date, addWin.text.trim());
      setAddWin(null);
    }

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

        {/* Group tabs + Add Win button */}
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          {GROUP_LABELS.map((label, i) => {
            const on = winPage === i;
            return (
              <button key={i} onClick={() => setWinPage(i)} style={{
                padding:"5px 12px", borderRadius:"8px",
                border:`1.5px solid ${on ? "#F97316" : "#C8BFB5"}`,
                backgroundColor: on ? "#F97316" : "#FFFFFF",
                color: on ? "#FFFFFF" : "#44403C",
                fontSize:"11px", fontWeight:700, cursor:"pointer",
              }}>
                {label}
              </button>
            );
          })}
          <div style={{ flex:1 }} />
          {!addWin && (
            <button
              onClick={() => setAddWin({ date: groupDates[0], text: "" })}
              style={addDashedBtn("#FED7AA", "#FFF7ED", "#C2410C")}
            >
              <Plus size={13} /> Add Win
            </button>
          )}
        </div>

        {/* Day cards — 3 at a time */}
        <div className={`grid gap-2.5 grid-cols-1${groupDates.length > 1 ? " lg:grid-cols-3" : ""}`}>
          {groupDates.map((date, idx) => {
            const col  = DAY_PALETTE[groupIndices[idx]];
            const d    = new Date(date + "T00:00:00");
            const wins = getDayWins(date);
            return (
              <div key={date} style={{
                borderRadius:"12px", padding:"12px 14px",
                backgroundColor:col.bg, border:`1.5px solid ${col.border}`,
                minHeight:"80px",
              }}>
                <p style={{
                  fontSize:"10px", fontWeight:700, color:col.head,
                  textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 8px",
                }}>
                  {d.toLocaleDateString("en-US", { weekday:"short" })} ·{" "}
                  {d.toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                </p>
                {wins.length === 0 ? (
                  <p style={{ fontSize:"11px", color:"#78716C", fontStyle:"italic", margin:0 }}>
                    No wins logged
                  </p>
                ) : (
                  <ul style={{ margin:0, padding:"0 0 0 14px" }}>
                    {wins.map((w, j) => (
                      <li key={j} style={{ fontSize:"12px", color:"#1C1917", lineHeight:1.55,
                        marginBottom: j < wins.length - 1 ? "5px" : 0 }}>
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Inline add form */}
        {addWin !== null && (
          <div style={{
            padding:"14px", borderRadius:"12px",
            border:"1.5px solid #FED7AA", backgroundColor:"#FFFBEB",
          }}>
            <p style={{ fontSize:"10px", fontWeight:700, color:"#B45309",
              textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 10px" }}>
              Which day?
            </p>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
              {dates.map((date) => {
                const on = addWin.date === date;
                const d  = new Date(date + "T00:00:00");
                return (
                  <button key={date} onClick={() => setAddWin({ ...addWin, date })} style={{
                    padding:"4px 10px", borderRadius:"7px",
                    border:`1.5px solid ${on ? "#F97316" : "#C8BFB5"}`,
                    backgroundColor: on ? "#F97316" : "#FFFFFF",
                    color: on ? "#FFFFFF" : "#44403C",
                    fontSize:"11px", fontWeight:700, cursor:"pointer",
                  }}>
                    {d.toLocaleDateString("en-US", { weekday:"short", day:"numeric" })}
                  </button>
                );
              })}
            </div>
            <input
              value={addWin.text}
              onChange={(e) => setAddWin({ ...addWin, text: e.target.value })}
              placeholder="Describe this win…"
              autoFocus
              style={{ ...inp, marginBottom:"10px" }}
              onKeyDown={(e) => { if (e.key === "Enter") saveWin(); if (e.key === "Escape") setAddWin(null); }}
            />
            <div style={{ display:"flex", gap:"8px" }}>
              <button onClick={saveWin} style={{
                padding:"7px 16px", borderRadius:"8px", border:"none",
                backgroundColor:"#F97316", color:"#FFFFFF",
                fontSize:"12px", fontWeight:700, cursor:"pointer",
              }}>
                Save Win
              </button>
              <button onClick={() => setAddWin(null)} style={{
                padding:"7px 14px", borderRadius:"8px",
                border:"1px solid #E8DDD0", backgroundColor:"#FFFFFF",
                fontSize:"12px", fontWeight:600, color:"#44403C", cursor:"pointer",
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ── Section: Outcome Review ───────────────────────────────────────────────

  function renderOutcomes() {
    const outcomes = weekPlanOutcomes;
    return (
      <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
        {outcomes.length === 0 ? (
          <p style={{ color:"#78716C", fontSize:"13px", fontStyle:"italic" }}>
            No outcomes were planned for this week.
          </p>
        ) : (
          <div style={{ marginBottom:"16px" }}>
            <label style={lbl}>Planned outcomes</label>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {outcomes.map((outcome, i) => {
                const checked = (draft.outcomeChecked ?? [])[i] ?? false;
                return (
                  <div key={i}
                    onClick={() => {
                      const c = [...(draft.outcomeChecked ?? [])];
                      c[i] = !checked;
                      ud("outcomeChecked", c);
                    }}
                    style={{
                      display:"flex", alignItems:"flex-start", gap:"10px",
                      padding:"12px 14px", borderRadius:"10px", cursor:"pointer",
                      backgroundColor: checked ? "#F0FDF4" : "#FAFAFA",
                      border:`1.5px solid ${checked ? "#86EFAC" : "#E8DDD0"}`,
                    }}
                  >
                    <div style={{
                      width:20, height:20, borderRadius:"6px", flexShrink:0, marginTop:"1px",
                      border:`2px solid ${checked ? "#16A34A" : "#A8A29E"}`,
                      backgroundColor: checked ? "#16A34A" : "#FFFFFF",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      {checked && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                    <span style={{
                      fontSize:"13px", color: checked ? "#15803D" : "#1C1917",
                      fontWeight: checked ? 600 : 400, lineHeight:1.5,
                    }}>
                      {outcome}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ flex:1 }} />
        <div>
          <label style={lbl}>Reflection on outcomes</label>
          <textarea
            value={draft.outcomeNotes}
            onChange={(e) => ud("outcomeNotes", e.target.value)}
            placeholder="What outcomes did you achieve? What fell short and why?"
            rows={4}
            style={ta}
          />
        </div>
      </div>
    );
  }

  // ── Section: Task Review ──────────────────────────────────────────────────

  function renderTasks() {
    const weekTasks = tasks.filter((t) => t.deadline >= weekStart && t.deadline < weekEnd);
    const complete  = weekTasks.filter((t) => t.status === "complete");
    const missed    = weekTasks.filter((t) => t.status === "incomplete");
    const open      = weekTasks.filter((t) => t.status === "open");

    function daysOverdue(t: TaskData): number {
      return Math.max(0, Math.floor(
        (new Date(today + "T00:00:00").getTime() - new Date(t.deadline + "T00:00:00").getTime())
        / 86400000
      ));
    }

    function taskRow(t: TaskData) {
      const isComplete  = t.status === "complete";
      const isOverdue   = t.status === "open" && t.deadline < today;
      const overdueDays = isOverdue ? daysOverdue(t) : 0;

      const rowBg     = isComplete ? "#F0FDF4" : isOverdue ? "#FEF2F2" : "#FAFAFA";
      const rowBorder = isComplete ? "#86EFAC"  : isOverdue ? "#FECACA"  : "#EDE5D8";
      const titleColor = isComplete ? "#15803D"  : isOverdue ? "#991B1B"  : "#1C1917";

      return (
        <div key={t.id} style={{
          display:"flex", alignItems:"center", gap:"10px",
          padding:"10px 12px", borderRadius:"10px",
          backgroundColor: rowBg, border:`1.5px solid ${rowBorder}`,
        }}>
          {/* Toggle checkbox */}
          <button
            onClick={() => isComplete ? onReopenTask(t.id) : onCompleteTask(t.id)}
            style={{
              width:22, height:22, borderRadius:"6px", flexShrink:0,
              border:`2px solid ${isComplete ? "#16A34A" : isOverdue ? "#DC2626" : "#A8A29E"}`,
              backgroundColor: isComplete ? "#16A34A" : "#FFFFFF",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", padding:0,
            }}
          >
            {isComplete && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
          </button>

          <div style={{ flex:1, minWidth:0 }}>
            <p style={{
              margin:0, fontSize:"13px", color: titleColor,
              fontWeight: isComplete ? 600 : 500,
              textDecoration: isComplete ? "line-through" : "none",
            }}>
              {t.title}
            </p>
            {isOverdue && (
              <p style={{ margin:"2px 0 0", fontSize:"11px", color:"#DC2626", fontWeight:600 }}>
                {overdueDays === 0 ? "Due today" : `${overdueDays} day${overdueDays > 1 ? "s" : ""} overdue`}
                {" · "}
                <span style={{ fontWeight:400 }}>
                  due {new Date(t.deadline + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                </span>
              </p>
            )}
            {t.status === "incomplete" && (
              <p style={{ margin:"2px 0 0", fontSize:"11px", color:"#B45309", fontWeight:600 }}>
                Marked as missed
              </p>
            )}
          </div>

          {/* Status badge */}
          {(() => {
            const cfg = {
              complete:   { bg:"#D1FAE5", color:"#065F46", label:"Done"   },
              incomplete: { bg:"#FEF3C7", color:"#92400E", label:"Missed" },
              open:       isOverdue
                ? { bg:"#FEE2E2", color:"#991B1B", label:"Overdue" }
                : { bg:"#F3F4F6", color:"#374151", label:"Open"    },
            }[t.status] ?? { bg:"#F3F4F6", color:"#374151", label:"Open" };
            return (
              <span style={{
                padding:"2px 8px", borderRadius:"5px", fontSize:"9px", fontWeight:700,
                backgroundColor:cfg.bg, color:cfg.color,
                letterSpacing:"0.04em", textTransform:"uppercase" as const, flexShrink:0,
              }}>
                {cfg.label}
              </span>
            );
          })()}
        </div>
      );
    }

    return (
      <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
        {/* Stats */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"16px" }}>
          {[
            { label:"Completed",  val:complete.length, color:"#065F46", bg:"#D1FAE5", border:"#6EE7B7" },
            { label:"Missed",     val:missed.length,   color:"#92400E", bg:"#FEF3C7", border:"#FCD34D" },
            { label:"Still Open", val:open.length,     color:"#374151", bg:"#F3F4F6", border:"#D1D5DB" },
          ].map(({ label, val, color, bg, border }) => (
            <div key={label} style={{
              flex:1, padding:"12px", borderRadius:"10px",
              backgroundColor:bg, border:`1px solid ${border}`, textAlign:"center",
            }}>
              <div style={{ fontSize:"26px", fontWeight:700, color }}>{val}</div>
              <div style={{ fontSize:"10px", fontWeight:700, color,
                textTransform:"uppercase", letterSpacing:"0.07em", marginTop:"2px" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {weekTasks.length === 0 ? (
          <p style={{ color:"#78716C", fontSize:"13px", fontStyle:"italic" }}>
            No tasks had a deadline this week.
          </p>
        ) : (
          <div style={{ marginBottom:"16px" }}>
            <label style={lbl}>Tasks this week</label>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {[...complete, ...open, ...missed].map((t) => taskRow(t))}
            </div>
          </div>
        )}

        <div style={{ flex:1 }} />
        <div>
          <label style={lbl}>Reflection on tasks</label>
          <textarea
            value={draft.taskReflection}
            onChange={(e) => ud("taskReflection", e.target.value)}
            placeholder="What drove your task completion? What got in the way?"
            rows={3}
            style={ta}
          />
        </div>
      </div>
    );
  }

  // ── Section: Habits Review ────────────────────────────────────────────────

  function renderHabits() {
    const scheduled = habits.filter((h) =>
      dates.some((date) => {
        const dow = new Date(date + "T00:00:00").getDay();
        return isScheduledDay(h.frequency, h.customDays, dow);
      })
    );

    return (
      <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
        {/* Habit Rate stat */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"16px" }}>
          <div style={{
            width:120, padding:"12px", borderRadius:"10px",
            backgroundColor:"#D1FAE5", border:"1px solid #6EE7B7",
            textAlign:"center", flexShrink:0,
          }}>
            <div style={{ fontSize:"28px", fontWeight:700, color:"#065F46" }}>{habitRate}%</div>
            <div style={{ fontSize:"10px", fontWeight:700, color:"#065F46",
              textTransform:"uppercase", letterSpacing:"0.07em", marginTop:"2px" }}>
              Habit Rate
            </div>
          </div>
        </div>

        {scheduled.length > 0 && (
          <div style={{ marginBottom:"16px" }}>
            <label style={{ ...lbl, marginBottom:"4px" }}>Completion grid</label>
            <p style={{ fontSize:"11px", color:"#78716C", marginBottom:"10px" }}>
              Click a cell to toggle binary habits.
            </p>
            <div style={{ overflowX:"auto", border:"1px solid #EDE5D8", borderRadius:"10px" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
                <thead>
                  <tr style={{ backgroundColor:"#FAF5EE" }}>
                    <th style={{ ...thStyle, textAlign:"left" as const, paddingLeft:12 }}>Habit</th>
                    {DAY_SHORTS.map((d) => <th key={d} style={thStyle}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {scheduled.map((h, idx) => (
                    <tr key={h.id} style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA" }}>
                      <td style={{
                        padding:"8px 12px", fontSize:"12px", color:"#1C1917",
                        fontWeight:500, borderTop:"1px solid #F0EBE4",
                      }}>
                        {h.name}
                      </td>
                      {dates.map((date, di) => {
                        const dow = new Date(date + "T00:00:00").getDay();
                        if (!isScheduledDay(h.frequency, h.customDays, dow)) {
                          return (
                            <td key={di} style={{ ...tdStyle, color:"#A8A29E", fontSize:"14px" }}>–</td>
                          );
                        }
                        const done = h.type === "binary"
                          ? h.completions.includes(date)
                          : (h.measurements[date] ?? 0) >= h.target;
                        const canToggle = h.type === "binary";
                        return (
                          <td key={di} style={tdStyle}>
                            <span
                              onClick={() => canToggle && onToggleHabit(h.id, date)}
                              style={{
                                width:22, height:22, borderRadius:"6px",
                                backgroundColor: done ? "#D1FAE5" : "#FEE2E2",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                margin:"0 auto", fontSize:"12px", fontWeight:700,
                                color: done ? "#065F46" : "#991B1B",
                                cursor: canToggle ? "pointer" : "default",
                                border: done ? "1.5px solid #6EE7B7" : "1.5px solid #FECACA",
                                userSelect:"none",
                              }}
                            >
                              {done ? "✓" : "×"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ flex:1 }} />
        <div>
          <label style={lbl}>Reflection on habits</label>
          <textarea
            value={draft.habitReflection}
            onChange={(e) => ud("habitReflection", e.target.value)}
            placeholder="Which habits served you well? What needs adjusting?"
            rows={3}
            style={ta}
          />
        </div>
      </div>
    );
  }

  // ── Section: Weekly Journal (diary style) ─────────────────────────────────

  function renderJournal() {
    const entries = draft.journalSections; // repurposed: heading=date, body=text

    // Renders one date-line row inside the diary page
    function dateLine(
      dateVal: string,
      entryId: string,
      onSelect: (d: string) => void,
      onClear: () => void,
      onDelete?: () => void,
    ) {
      const isOpen = openDateFor === entryId;
      return (
        <>
          <div style={{
            height:32, display:"flex", alignItems:"center",
            padding:"0 14px 0 16px", gap:6,
          }}>
            {dateVal ? (
              <>
                <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
                  {/* Clickable date text — opens picker to change */}
                  <button
                    onClick={() => setOpenDateFor(isOpen ? null : entryId)}
                    style={{
                      fontFamily:"cursive", fontSize:"15px", color:"#44403C",
                      background:"none", border:"none", cursor:"pointer", padding:0,
                    }}
                  >
                    {wordDate(dateVal)}
                  </button>
                  {/* Clear badge — sits at top-right corner of the date text */}
                  <button
                    onClick={onClear}
                    style={{
                      position:"absolute", top:-7, right:-14,
                      width:14, height:14, borderRadius:"50%",
                      backgroundColor:"#D6C9B8", border:"none",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      cursor:"pointer", padding:0, lineHeight:1,
                    }}
                  >
                    <X size={8} color="#78716C" />
                  </button>
                </div>
                <div style={{ flex:1 }} />
              </>
            ) : (
              <button
                onClick={() => setOpenDateFor(isOpen ? null : entryId)}
                style={{
                  fontFamily:"cursive", fontSize:"15px", color:"#A8A29E",
                  background:"none", border:"none", cursor:"pointer",
                  padding:0, flex:1, textAlign:"left" as const,
                }}
              >
                — tap to add date —
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                style={{ background:"none", border:"none", cursor:"pointer", padding:2, lineHeight:1 }}
              >
                <X size={12} color="#C8BFB5" />
              </button>
            )}
          </div>
          {/* Date chips — show when open, regardless of whether a date is already set */}
          {isOpen && (
            <div style={{
              padding:"6px 16px 10px",
              backgroundColor:"rgba(253,250,246,0.96)",
            }}>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {dates.map((d) => (
                  <button key={d}
                    onClick={() => { onSelect(d); setOpenDateFor(null); }}
                    style={{
                      padding:"4px 10px", borderRadius:"8px",
                      border:"1.5px solid #C8BFB5", backgroundColor:"#FFFFFF",
                      color:"#44403C", fontSize:"11px", fontWeight:600, cursor:"pointer",
                    }}
                  >
                    {new Date(d + "T00:00:00")
                      .toLocaleDateString("en-US", { weekday:"short", day:"numeric", month:"short" })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    const RULED = "repeating-linear-gradient(transparent, transparent 31px, #D6C9B8 31px, #D6C9B8 32px)";
    const taStyle = (minH: number): React.CSSProperties => ({
      width:"100%", minHeight: minH,
      paddingTop:"10px", paddingBottom:"6px", paddingLeft:"16px", paddingRight:"16px",
      fontFamily:"cursive", fontSize:"15px", lineHeight:"32px",
      color:"#1C1917",
      background: RULED,
      border:"none", outline:"none",
      resize:"none", boxSizing:"border-box",
      display:"block",
    });

    function autoResize(e: React.FormEvent<HTMLTextAreaElement>) {
      const t = e.currentTarget;
      t.style.height = "auto";
      // snap to next 32px multiple to keep lines in phase
      const rows = Math.max(1, Math.ceil((t.scrollHeight - 16) / 32));
      t.style.height = (rows * 32 + 16) + "px";
    }

    return (
      <div style={{
        borderRadius:"12px", overflow:"hidden",
        border:"1px solid #E8DDD0",
        boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display:"flex", background:"#FDFAF6" }}>
          {/* Red margin */}
          <div style={{
            width:3, flexShrink:0,
            background:"linear-gradient(to bottom, #FCA5A5, #F87171)",
          }} />

          <div style={{ flex:1 }}>
            {/* ── Main entry ── */}
            {dateLine(
              draft.journalDate, "main",
              (d) => ud("journalDate", d),
              () => ud("journalDate", ""),
            )}
            <textarea
              value={draft.journalText}
              onChange={(e) => ud("journalText", e.target.value)}
              onInput={autoResize}
              placeholder="Write freely here…"
              style={taStyle(128)}
            />

            {/* ── Additional entries ── */}
            {entries.map((sec, i) => (
              <div key={sec.id}>
                {dateLine(
                  sec.heading, sec.id,
                  (d) => {
                    const secs = [...entries]; secs[i] = { ...sec, heading: d };
                    ud("journalSections", secs);
                  },
                  () => {
                    const secs = [...entries]; secs[i] = { ...sec, heading: "" };
                    ud("journalSections", secs);
                  },
                  () => ud("journalSections", entries.filter((_, j) => j !== i)),
                )}
                <textarea
                  value={sec.body}
                  onChange={(e) => {
                    const secs = [...entries]; secs[i] = { ...sec, body: e.target.value };
                    ud("journalSections", secs);
                  }}
                  onInput={autoResize}
                  placeholder="Continue writing…"
                  style={taStyle(96)}
                />
              </div>
            ))}

            {/* ── Permanent "new entry" line — always visible ── */}
            <div style={{
              height:32, display:"flex", alignItems:"center", padding:"0 16px",
              background: RULED,
            }}>
              <button
                onClick={() => ud("journalSections", [
                  ...entries,
                  { id: crypto.randomUUID(), heading:"", body:"" },
                ])}
                style={{
                  fontFamily:"cursive", fontSize:"15px", color:"#A8A29E",
                  background:"none", border:"none", cursor:"pointer", padding:0,
                }}
              >
                — new entry —
              </button>
            </div>

            {/* Trailing blank ruled space */}
            <div style={{ height:64, background: RULED }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Section: Life Lessons ─────────────────────────────────────────────────

  function renderLessons() {
    return (
      <div>
        <p style={{ fontSize:"13px", color:"#78716C", marginBottom:"16px" }}>
          What did life teach you this week? Link each lesson to a life area.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {draft.lifeLessons.map((lesson, i) => (
            <div key={lesson.id} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{
                width:22, height:22, borderRadius:"50%", flexShrink:0,
                backgroundColor: LIFE_AREA_COLORS[lesson.lifeArea] + "20",
                border:`1.5px solid ${LIFE_AREA_COLORS[lesson.lifeArea]}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"10px", fontWeight:700, color:LIFE_AREA_COLORS[lesson.lifeArea],
              }}>
                {i + 1}
              </span>
              <select
                value={lesson.lifeArea}
                onChange={(e) => {
                  const ls = [...draft.lifeLessons];
                  ls[i] = { ...lesson, lifeArea: e.target.value as LifeArea };
                  ud("lifeLessons", ls);
                }}
                style={{
                  padding:"7px 10px", borderRadius:"8px",
                  border:`1.5px solid ${LIFE_AREA_COLORS[lesson.lifeArea]}`,
                  backgroundColor: LIFE_AREA_COLORS[lesson.lifeArea] + "15",
                  color: LIFE_AREA_COLORS[lesson.lifeArea],
                  fontSize:"11px", fontWeight:700, cursor:"pointer",
                  outline:"none", flexShrink:0,
                }}
              >
                {LIFE_AREAS.map((a) => (
                  <option key={a} value={a}>{LIFE_AREA_LABELS[a]}</option>
                ))}
              </select>
              <input
                value={lesson.text}
                onChange={(e) => {
                  const ls = [...draft.lifeLessons];
                  ls[i] = { ...lesson, text: e.target.value };
                  ud("lifeLessons", ls);
                }}
                placeholder="What did you learn?"
                style={{ ...inp, flex:1 }}
              />
              <button
                onClick={() => ud("lifeLessons", draft.lifeLessons.filter((_, j) => j !== i))}
                style={delBtn}
              >
                <Trash2 size={12} color="#78716C" />
              </button>
            </div>
          ))}
          <button
            onClick={() => ud("lifeLessons", [
              ...draft.lifeLessons,
              { id: crypto.randomUUID(), text:"", lifeArea:"personal" },
            ])}
            style={{ ...addDashedBtn("#E8DDD0", "#FAF5EE", "#44403C"), alignSelf:"flex-start" }}
          >
            <Plus size={13} /> Add lesson
          </button>
        </div>
      </div>
    );
  }

  // ── Section: Core Values ──────────────────────────────────────────────────

  function renderValues() {
    const lived       = draft.coreValuesLived;
    const livedValues = lived.map((c) => c.value);

    function toggle(val: string) {
      if (livedValues.includes(val)) {
        ud("coreValuesLived", lived.filter((c) => c.value !== val));
      } else {
        ud("coreValuesLived", [...lived, { id: crypto.randomUUID(), value: val, note:"" }]);
      }
    }

    return (
      <div>
        <p style={{ fontSize:"13px", color:"#78716C", marginBottom:"16px" }}>
          Which core values did you live this week? Select all that apply.
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"24px" }}>
          {CORE_VALUES.map((val) => {
            const on = livedValues.includes(val);
            return (
              <button key={val} onClick={() => toggle(val)} style={{
                padding:"6px 14px", borderRadius:"20px",
                border:`1.5px solid ${on ? "#7C3AED" : "#C8BFB5"}`,
                backgroundColor: on ? "#7C3AED" : "#FFFFFF",
                color: on ? "#FFFFFF" : "#44403C",
                fontSize:"12px", fontWeight:600, cursor:"pointer",
              }}>
                {val}
              </button>
            );
          })}
        </div>
        {lived.length > 0 && (
          <div>
            <label style={lbl}>How did you live these values?</label>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {lived.map((entry, i) => (
                <div key={entry.id} style={{
                  padding:"12px 14px", borderRadius:"10px",
                  border:"1.5px solid #D8B4FE", backgroundColor:"#FAF5FF",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
                    <span style={{
                      padding:"3px 10px", borderRadius:"12px",
                      backgroundColor:"#7C3AED", color:"#FFFFFF",
                      fontSize:"11px", fontWeight:700,
                    }}>
                      {entry.value}
                    </span>
                    <div style={{ flex:1 }} />
                    <button
                      onClick={() => toggle(entry.value)}
                      style={{
                        width:24, height:24, borderRadius:"6px", border:"none",
                        backgroundColor:"transparent", cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}
                    >
                      <X size={12} color="#78716C" />
                    </button>
                  </div>
                  <textarea
                    value={entry.note}
                    onChange={(e) => {
                      const vals = [...lived];
                      vals[i] = { ...entry, note: e.target.value };
                      ud("coreValuesLived", vals);
                    }}
                    placeholder={`How did you live "${entry.value}" this week?`}
                    rows={2}
                    style={{ ...ta, border:"1px solid #D8B4FE" }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      height:"100%", backgroundColor:"#FAF5EE",
      display:"flex", flexDirection:"column", overflow:"hidden",
    }}>

      {/* ── Header ── */}
      <div style={{ borderBottom:"1px solid #EDE5D8", flexShrink:0, backgroundColor:"#FAF5EE" }}>

        {/* Mobile header — two rows */}
        <div className="lg:hidden">
          <div style={{ padding:"12px 16px 8px", display:"flex", alignItems:"center", gap:"10px" }}>
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:9, border:"1px solid #EDE5D8",
              backgroundColor:"#FFFFFF", display:"flex", alignItems:"center",
              justifyContent:"center", cursor:"pointer", flexShrink:0,
            }}>
              <X size={15} color="#44403C" />
            </button>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.07em", color:"#C2410C", margin:0 }}>
                Week {weekNum} Review
              </p>
              <h2 style={{ fontSize:"15px", fontWeight:700, color:"#1C1917", margin:0,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {weekLabel(weekStart)}
              </h2>
            </div>
            <button onClick={handleSave} style={{
              padding:"8px 14px", borderRadius:"10px", border:"none",
              background:"linear-gradient(135deg, #F97316, #EA580C)",
              fontSize:"12px", fontWeight:700, color:"#FFFFFF", cursor:"pointer", flexShrink:0,
            }}>
              Save ✓
            </button>
          </div>
          <div style={{ padding:"0 16px 12px", display:"flex",
            borderRadius:"10px", overflow:"hidden", gap:0 }}>
            <div style={{ display:"flex", borderRadius:"10px", border:"1.5px solid #C8BFB5",
              overflow:"hidden", backgroundColor:"#FFFFFF", width:"100%" }}>
              {([
                ["success",     "Success Story", "#F97316", "#FFF7ED"],
                ["reflections", "Reflections",   "#7C3AED", "#FAF5FF"],
              ] as const).map(([id, label, activeColor, activeBg]) => {
                const on = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)} style={{
                    flex:1, padding:"8px", border:"none",
                    backgroundColor: on ? activeBg : "#FFFFFF",
                    color: on ? activeColor : "#57534E",
                    fontSize:"12px", fontWeight:700, cursor:"pointer",
                    borderLeft: id === "reflections" ? "1.5px solid #C8BFB5" : "none",
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop header — single row */}
        <div className="hidden lg:flex" style={{
          padding:"12px 24px", alignItems:"center", gap:"14px",
        }}>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:9, border:"1px solid #EDE5D8",
            backgroundColor:"#FFFFFF", display:"flex", alignItems:"center",
            justifyContent:"center", cursor:"pointer", flexShrink:0,
          }}>
            <X size={15} color="#44403C" />
          </button>
          <div>
            <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.07em", color:"#C2410C", marginBottom:"1px", margin:0 }}>
              Week {weekNum} Review
            </p>
            <h2 style={{ fontSize:"16px", fontWeight:700, color:"#1C1917", margin:0 }}>
              {weekLabel(weekStart)}
            </h2>
          </div>
          <div style={{ flex:1 }} />
          <div style={{ display:"flex", borderRadius:"10px",
            border:"1.5px solid #C8BFB5", overflow:"hidden", backgroundColor:"#FFFFFF" }}>
            {([
              ["success",     "My Success Story", "#F97316", "#FFF7ED"],
              ["reflections", "Reflections",      "#7C3AED", "#FAF5FF"],
            ] as const).map(([id, label, activeColor, activeBg]) => {
              const on = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} style={{
                  padding:"7px 18px", border:"none",
                  backgroundColor: on ? activeBg : "#FFFFFF",
                  color: on ? activeColor : "#57534E",
                  fontSize:"12px", fontWeight:700, cursor:"pointer",
                  borderLeft: id === "reflections" ? "1.5px solid #C8BFB5" : "none",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
          <button onClick={handleSave} style={{
            padding:"8px 20px", borderRadius:"10px", border:"none",
            background:"linear-gradient(135deg, #F97316, #EA580C)",
            fontSize:"12px", fontWeight:700, color:"#FFFFFF", cursor:"pointer", flexShrink:0,
          }}>
            Save Review ✓
          </button>
        </div>

      </div>

      {/* ── Scrollable content ── */}
      <div className="px-4 lg:px-6 py-5" style={{ flex:1, overflowY:"auto" }}>

        {tab === "success" ? (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

            {/* Top Wins — auto-sizes to content */}
            <ReviewCard title="Top Wins" color="#F97316"
              icon={<Trophy size={13} color="#F97316" />}>
              {renderWins()}
            </ReviewCard>

            {/* Outcome · Task · Habits — 3 columns */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <ReviewCard title="Outcome Review" color="#F97316" maxH={400}
                icon={<Target size={13} color="#F97316" />}>
                {renderOutcomes()}
              </ReviewCard>
              <ReviewCard title="Task Review" color="#F97316" maxH={400}
                icon={<CheckSquare size={13} color="#F97316" />}>
                {renderTasks()}
              </ReviewCard>
              <ReviewCard title="Habits Review" color="#F97316" maxH={400}
                icon={<TrendingUp size={13} color="#F97316" />}>
                {renderHabits()}
              </ReviewCard>
            </div>

            {/* Overall week rating — standalone */}
            <ReviewCard title="Overall Week Rating" color="#F97316"
              icon={<Star size={13} color="#F97316" />}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
                <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                  {Array.from({ length:10 }, (_, i) => i + 1).map((n) => {
                    const sel = draft.overallRating === n;
                    const col = ratingColor(n);
                    return (
                      <button key={n} onClick={() => ud("overallRating", n)} style={{
                        width:36, height:36, borderRadius:"8px",
                        border:`2px solid ${sel ? col : "#C8BFB5"}`,
                        backgroundColor: sel ? col : "#FFFFFF",
                        fontSize:"13px", fontWeight:700,
                        color: sel ? "#FFFFFF" : "#44403C", cursor:"pointer",
                      }}>
                        {n}
                      </button>
                    );
                  })}
                </div>
                {draft.overallRating > 0 && (
                  <span style={{
                    fontSize:"13px", fontWeight:700,
                    color: ratingColor(draft.overallRating),
                  }}>
                    {draft.overallRating}/10
                  </span>
                )}
              </div>
            </ReviewCard>

          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

            {/* Weekly Journal — full width */}
            <ReviewCard title="Weekly Journal" color="#7C3AED" maxH={460}
              icon={<BookOpen size={13} color="#7C3AED" />}>
              {renderJournal()}
            </ReviewCard>

            {/* Life Lessons · Core Values — 2 columns */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <ReviewCard title="Life Lessons" color="#7C3AED" maxH={400}
                icon={<Lightbulb size={13} color="#7C3AED" />}>
                {renderLessons()}
              </ReviewCard>
              <ReviewCard title="Core Values Lived" color="#7C3AED" maxH={400}
                icon={<Star size={13} color="#7C3AED" />}>
                {renderValues()}
              </ReviewCard>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
