"use client";

import { useState, useEffect } from "react";
import {
  X, Trophy, Target, CheckSquare, TrendingUp,
  BookOpen, Lightbulb, Star, Plus, Trash2, Check,
  CalendarDays,
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

type SectionId = "wins"|"outcomes"|"tasks"|"habits"|"journal"|"lessons"|"values";

const NAV: { id: SectionId; label: string; group: "success"|"reflections"; Icon: React.ElementType }[] = [
  { id:"wins",     label:"Top Wins",       group:"success",     Icon:Trophy      },
  { id:"outcomes", label:"Outcome Review", group:"success",     Icon:Target      },
  { id:"tasks",    label:"Task Review",    group:"success",     Icon:CheckSquare },
  { id:"habits",   label:"Habits Review",  group:"success",     Icon:TrendingUp  },
  { id:"journal",  label:"Weekly Journal", group:"reflections", Icon:BookOpen    },
  { id:"lessons",  label:"Life Lessons",   group:"reflections", Icon:Lightbulb   },
  { id:"values",   label:"Core Values",    group:"reflections", Icon:Star        },
];

const GROUP_COLOR: Record<string, string> = {
  success:     "#F97316",
  reflections: "#7C3AED",
};

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

const navBtnStyle: React.CSSProperties = {
  padding:"7px 14px", borderRadius:"9px",
  border:"1.5px solid #C8BFB5", backgroundColor:"#FFFFFF",
  color:"#44403C", fontSize:"11px", fontWeight:600, cursor:"pointer",
};

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

// ── Main component ────────────────────────────────────────────────────────────

export default function WeeklyReviewSheet({
  open, onClose, weekStart, review, onSave,
  tasks, habits, eveningReflections, weekPlanOutcomes,
  onCompleteTask, onReopenTask, onToggleHabit,
}: Props) {
  const [draft,  setDraft]  = useState<WeeklyReview>(emptyReview(weekStart));
  const [active, setActive] = useState<SectionId>("wins");
  // Wins section: inline "add win" form
  const [addWin, setAddWin] = useState<{ date: string; text: string } | null>(null);
  // Journal section: date-picker toggle
  const [showJournalDates, setShowJournalDates] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(review ? { ...emptyReview(weekStart), ...review } : emptyReview(weekStart));
    setActive("wins");
    setAddWin(null);
    setShowJournalDates(false);
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
    // Per-day wins: merge reflection wins + user-added topWins
    function getDayWins(date: string) {
      const fromReflection = (eveningReflections.find((r) => r.date === date)?.wins ?? [])
        .filter((w) => w.trim())
        .map((w) => ({ text: w, source: "reflection" as const }));
      const fromAdded = (draft.topWins ?? [])
        .filter((w) => w.date === date)
        .map((w) => ({ text: w.text, source: "added" as const, id: w.id }));
      return [...fromReflection, ...fromAdded];
    }

    const allAdded = draft.topWins ?? [];

    return (
      <div>
        {/* ── TOP WIN OF THE WEEK (curated, editable) ── */}
        <div style={{ marginBottom:"28px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
            <label style={lbl}>Top Win of the Week</label>
            {!addWin && (
              <button
                onClick={() => setAddWin({ date: weekStart, text: "" })}
                style={addDashedBtn("#FED7AA", "#FFF7ED", "#C2410C")}
              >
                <Plus size={13} /> Add Win
              </button>
            )}
          </div>

          {/* Existing curated wins */}
          {allAdded.length === 0 && !addWin && (
            <p style={{ fontSize:"13px", color:"#78716C", fontStyle:"italic" }}>
              No wins added yet — click "Add Win" to record one.
            </p>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {allAdded.map((w, i) => {
              const dateIdx = dates.indexOf(w.date);
              const col     = DAY_PALETTE[dateIdx >= 0 ? dateIdx : 0];
              const d       = new Date(w.date + "T00:00:00");
              const dayLabel = d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
              return (
                <div key={w.id} style={{
                  display:"flex", alignItems:"center", gap:"10px",
                  padding:"10px 14px", borderRadius:"10px",
                  backgroundColor: col.bg, border:`1.5px solid ${col.border}`,
                }}>
                  <span style={{
                    fontSize:"10px", fontWeight:700, color: col.head,
                    whiteSpace:"nowrap", flexShrink:0,
                  }}>
                    {dayLabel}
                  </span>
                  <input
                    value={w.text}
                    onChange={(e) => {
                      const wins = [...allAdded];
                      wins[i] = { ...w, text: e.target.value };
                      ud("topWins", wins);
                    }}
                    placeholder="Describe this win…"
                    style={{
                      flex:1, border:"none", backgroundColor:"transparent",
                      fontSize:"13px", color:"#1C1917", outline:"none",
                    }}
                  />
                  <button
                    onClick={() => ud("topWins", allAdded.filter((_, j) => j !== i))}
                    style={{ ...delBtn, backgroundColor:"transparent", border:"none" }}
                  >
                    <Trash2 size={12} color="#78716C" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Inline "add win" form */}
          {addWin !== null && (
            <div style={{
              marginTop:"10px", padding:"14px", borderRadius:"12px",
              border:"1.5px solid #FED7AA", backgroundColor:"#FFFBEB",
            }}>
              <p style={{ fontSize:"11px", fontWeight:700, color:"#B45309",
                textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"10px" }}>
                Select a date
              </p>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
                {dates.map((date, i) => {
                  const on = addWin.date === date;
                  const d  = new Date(date + "T00:00:00");
                  return (
                    <button key={date} onClick={() => setAddWin({ ...addWin, date })} style={{
                      padding:"5px 10px", borderRadius:"8px",
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addWin.text.trim()) {
                    ud("topWins", [...allAdded, { id: crypto.randomUUID(), ...addWin }]);
                    setAddWin(null);
                  }
                  if (e.key === "Escape") setAddWin(null);
                }}
              />
              <div style={{ display:"flex", gap:"8px" }}>
                <button
                  onClick={() => {
                    if (!addWin.text.trim()) return;
                    ud("topWins", [...allAdded, { id: crypto.randomUUID(), ...addWin }]);
                    setAddWin(null);
                  }}
                  style={{
                    padding:"7px 16px", borderRadius:"8px", border:"none",
                    backgroundColor:"#F97316", color:"#FFFFFF",
                    fontSize:"12px", fontWeight:700, cursor:"pointer",
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => setAddWin(null)}
                  style={{
                    padding:"7px 14px", borderRadius:"8px",
                    border:"1px solid #E8DDD0", backgroundColor:"#FFFFFF",
                    fontSize:"12px", fontWeight:600, color:"#44403C", cursor:"pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 7-day grid (reflections + added) ── */}
        <div>
          <label style={lbl}>From this week's reflections</label>
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px",
          }}>
            {dates.map((date, i) => {
              const col  = DAY_PALETTE[i];
              const d    = new Date(date + "T00:00:00");
              const wins = getDayWins(date);
              return (
                <div key={date} style={{
                  borderRadius:"12px", padding:"12px 14px",
                  backgroundColor: col.bg, border:`1.5px solid ${col.border}`,
                  minHeight:"80px",
                }}>
                  <p style={{
                    fontSize:"10px", fontWeight:700, color: col.head,
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
                        <li key={j} style={{
                          fontSize:"12px", color:"#1C1917", lineHeight:1.55,
                          marginBottom: j < wins.length - 1 ? "5px" : 0,
                        }}>
                          {w.text}
                          {w.source === "added" && (
                            <span style={{ marginLeft:4, fontSize:"9px", color: col.head, fontWeight:700 }}>
                              ★
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Section: Outcome Review ───────────────────────────────────────────────

  function renderOutcomes() {
    const outcomes = weekPlanOutcomes;
    return (
      <div>
        {outcomes.length === 0 ? (
          <p style={{ color:"#78716C", fontSize:"13px", fontStyle:"italic", marginBottom:"24px" }}>
            No outcomes were planned for this week.
          </p>
        ) : (
          <div style={{ marginBottom:"24px" }}>
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
      <div>
        {/* Stats */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"24px" }}>
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
          <p style={{ color:"#78716C", fontSize:"13px", fontStyle:"italic", marginBottom:"24px" }}>
            No tasks had a deadline this week.
          </p>
        ) : (
          <div style={{ marginBottom:"24px" }}>
            <label style={lbl}>Tasks this week</label>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {[...complete, ...open, ...missed].map((t) => taskRow(t))}
            </div>
          </div>
        )}

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
      <div>
        {/* Stats + Rating */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"24px" }}>
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
          <div style={{
            flex:1, padding:"12px 16px", borderRadius:"10px",
            backgroundColor:"#FAF5EE", border:"1px solid #EDE5D8",
          }}>
            <label style={{ ...lbl, marginBottom:"8px" }}>Overall week rating</label>
            <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
              {Array.from({ length:10 }, (_, i) => i + 1).map((n) => {
                const sel = draft.overallRating === n;
                const col = ratingColor(n);
                return (
                  <button key={n} onClick={() => ud("overallRating", n)} style={{
                    width:32, height:32, borderRadius:"8px",
                    border:`2px solid ${sel ? col : "#C8BFB5"}`,
                    backgroundColor: sel ? col : "#FFFFFF",
                    fontSize:"12px", fontWeight:700,
                    color: sel ? "#FFFFFF" : "#44403C", cursor:"pointer",
                  }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {scheduled.length > 0 && (
          <div style={{ marginBottom:"24px" }}>
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
    const hasDate = Boolean(draft.journalDate);
    const displayDate = hasDate ? wordDate(draft.journalDate) : "";

    return (
      <div>
        {/* Optional date — subtle, not compulsory */}
        <div style={{ marginBottom:"16px" }}>
          {hasDate ? (
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <p style={{
                fontFamily:"cursive", fontSize:"17px", color:"#44403C",
                margin:0, flex:1,
              }}>
                {displayDate}
              </p>
              <button
                onClick={() => { ud("journalDate", ""); setShowJournalDates(false); }}
                style={{
                  fontSize:"11px", color:"#A8A29E", background:"none",
                  border:"none", cursor:"pointer", padding:"2px 6px",
                  textDecoration:"underline",
                }}
              >
                clear
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowJournalDates((v) => !v)}
                style={{
                  display:"flex", alignItems:"center", gap:"5px",
                  background:"none", border:"none", cursor:"pointer",
                  color:"#A8A29E", fontSize:"12px", padding:0,
                }}
              >
                <CalendarDays size={13} color="#A8A29E" />
                {showJournalDates ? "Hide dates" : "Set a date (optional)"}
              </button>
              {showJournalDates && (
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginTop:"8px" }}>
                  {dates.map((date) => {
                    const d = new Date(date + "T00:00:00");
                    return (
                      <button key={date}
                        onClick={() => { ud("journalDate", date); setShowJournalDates(false); }}
                        style={{
                          padding:"5px 10px", borderRadius:"8px",
                          border:"1.5px solid #C8BFB5", backgroundColor:"#FFFFFF",
                          color:"#44403C", fontSize:"11px", fontWeight:600, cursor:"pointer",
                        }}
                      >
                        {d.toLocaleDateString("en-US", { weekday:"short", day:"numeric", month:"short" })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Diary-style textarea */}
        <div style={{
          borderRadius:"12px", overflow:"hidden",
          border:"1px solid #E8DDD0",
          boxShadow:"inset 0 2px 6px rgba(0,0,0,0.04)",
        }}>
          {/* Red margin line (diary aesthetic) */}
          <div style={{ display:"flex", height:"100%" }}>
            <div style={{
              width:3, flexShrink:0,
              background:"linear-gradient(to bottom, #FCA5A5, #F87171)",
            }} />
            <textarea
              value={draft.journalText}
              onChange={(e) => ud("journalText", e.target.value)}
              placeholder="Write freely…"
              rows={14}
              style={{
                flex:1, padding:"10px 16px",
                fontFamily:"cursive",
                fontSize:"15px",
                lineHeight:"32px",
                color:"#1C1917",
                background:"repeating-linear-gradient(#FDFAF6, #FDFAF6 31px, #D6C9B8 31px, #D6C9B8 32px)",
                border:"none", outline:"none",
                resize:"vertical", boxSizing:"border-box" as const,
                width:"100%",
              }}
            />
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

  // ── Layout ────────────────────────────────────────────────────────────────

  const activeNav = NAV.find((n) => n.id === active)!;
  const activeIdx = NAV.findIndex((n) => n.id === active);
  const successSections = NAV.filter((n) => n.group === "success");
  const reflSections    = NAV.filter((n) => n.group === "reflections");

  const sectionMap: Record<SectionId, () => React.ReactNode> = {
    wins: renderWins, outcomes: renderOutcomes, tasks: renderTasks,
    habits: renderHabits, journal: renderJournal, lessons: renderLessons, values: renderValues,
  };

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:50,
      }} />

      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        width:"min(1080px, 95vw)", height:"90vh",
        backgroundColor:"#FFFFFF", borderRadius:"20px",
        zIndex:51, boxShadow:"0 20px 60px rgba(0,0,0,0.28)",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          padding:"14px 24px", borderBottom:"1px solid #EDE5D8",
          display:"flex", alignItems:"center", gap:"16px",
          flexShrink:0, backgroundColor:"#FAF5EE",
        }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:"10px", fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.07em", color:"#C2410C", marginBottom:"2px" }}>
              Week {weekNum} Review
            </p>
            <h2 style={{ fontSize:"17px", fontWeight:700, color:"#1C1917", margin:0 }}>
              {weekLabel(weekStart)}
            </h2>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:9, border:"1px solid #EDE5D8",
            backgroundColor:"#FFFFFF", display:"flex", alignItems:"center",
            justifyContent:"center", cursor:"pointer", flexShrink:0,
          }}>
            <X size={15} color="#44403C" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* Sidebar */}
          <div style={{
            width:210, backgroundColor:"#FAF5EE",
            borderRight:"1px solid #EDE5D8",
            display:"flex", flexDirection:"column",
            padding:"14px 0", overflowY:"auto", flexShrink:0,
          }}>
            <p style={{
              fontSize:"9px", fontWeight:700, color:"#C2410C",
              textTransform:"uppercase", letterSpacing:"0.1em",
              padding:"0 14px", marginBottom:"4px",
            }}>
              My Success Story
            </p>
            {successSections.map((sec) => {
              const on = active === sec.id;
              return (
                <button key={sec.id} onClick={() => setActive(sec.id)} style={{
                  width:"100%", display:"flex", alignItems:"center", gap:"9px",
                  padding:"9px 14px", border:"none",
                  backgroundColor: on ? "#FFF7ED" : "transparent",
                  borderLeft: on ? "3px solid #F97316" : "3px solid transparent",
                  color: on ? "#C2410C" : "#44403C",
                  fontSize:"13px", fontWeight: on ? 700 : 500,
                  cursor:"pointer", textAlign:"left",
                }}>
                  <sec.Icon size={14} />
                  {sec.label}
                </button>
              );
            })}

            <div style={{ height:1, backgroundColor:"#EDE5D8", margin:"10px 0" }} />

            <p style={{
              fontSize:"9px", fontWeight:700, color:"#7C3AED",
              textTransform:"uppercase", letterSpacing:"0.1em",
              padding:"0 14px", marginBottom:"4px",
            }}>
              Reflections
            </p>
            {reflSections.map((sec) => {
              const on = active === sec.id;
              return (
                <button key={sec.id} onClick={() => setActive(sec.id)} style={{
                  width:"100%", display:"flex", alignItems:"center", gap:"9px",
                  padding:"9px 14px", border:"none",
                  backgroundColor: on ? "#FAF5FF" : "transparent",
                  borderLeft: on ? "3px solid #7C3AED" : "3px solid transparent",
                  color: on ? "#7C3AED" : "#44403C",
                  fontSize:"13px", fontWeight: on ? 700 : 500,
                  cursor:"pointer", textAlign:"left",
                }}>
                  <sec.Icon size={14} />
                  {sec.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"24px" }}>
              <div style={{
                width:38, height:38, borderRadius:"11px",
                backgroundColor: GROUP_COLOR[activeNav.group] + "18",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>
                <activeNav.Icon size={18} color={GROUP_COLOR[activeNav.group]} />
              </div>
              <div>
                <p style={{ fontSize:"9px", fontWeight:700,
                  color:GROUP_COLOR[activeNav.group],
                  textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>
                  {activeNav.group === "success" ? "My Success Story" : "Reflections"}
                </p>
                <h3 style={{ fontSize:"16px", fontWeight:700, color:"#1C1917", margin:0 }}>
                  {activeNav.label}
                </h3>
              </div>
            </div>
            {sectionMap[active]()}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:"12px 24px", borderTop:"1px solid #EDE5D8",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0, backgroundColor:"#FAF5EE",
        }}>
          <div style={{ display:"flex", gap:"6px" }}>
            {activeIdx > 0 && (
              <button onClick={() => setActive(NAV[activeIdx - 1].id)} style={navBtnStyle}>
                ‹ {NAV[activeIdx - 1].label}
              </button>
            )}
            {activeIdx < NAV.length - 1 && (
              <button
                onClick={() => setActive(NAV[activeIdx + 1].id)}
                style={{ ...navBtnStyle, border:"none", backgroundColor:"#F97316", color:"#FFFFFF" }}
              >
                {NAV[activeIdx + 1].label} ›
              </button>
            )}
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={onClose} style={{
              padding:"9px 20px", borderRadius:"10px",
              border:"1px solid #E8DDD0", backgroundColor:"#FFFFFF",
              fontSize:"12px", fontWeight:600, color:"#44403C", cursor:"pointer",
            }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{
              padding:"9px 24px", borderRadius:"10px", border:"none",
              background:"linear-gradient(135deg, #F97316, #EA580C)",
              fontSize:"12px", fontWeight:700, color:"#FFFFFF", cursor:"pointer",
            }}>
              Save Review ✓
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
