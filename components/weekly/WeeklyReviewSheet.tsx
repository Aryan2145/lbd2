"use client";

import { useState, useEffect } from "react";
import { X, Star, Trophy, ArrowRight, TrendingUp, CheckSquare, Calendar } from "lucide-react";
import type { WeeklyReview } from "@/lib/dayTypes";
import type { WeekEvent } from "@/lib/weeklyTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { HabitData } from "@/components/habits/HabitCard";
import { isScheduledDay } from "@/components/habits/HabitCard";
import { toTaskDate } from "@/components/tasks/TaskCard";

interface Props {
  open:       boolean;
  onClose:    () => void;
  weekStart:  string;
  review:     WeeklyReview | null;
  onSave:     (r: WeeklyReview) => void;
  weekEvents: WeekEvent[];
  tasks:      TaskData[];
  habits:     HabitData[];
}

function weekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end   = new Date(weekStart + "T00:00:00");
  end.setDate(start.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  let total = 0, done = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    const ds  = toTaskDate(d);
    const dow = d.getDay();
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

const ratingColor = (n: number) =>
  n <= 3 ? "#EF4444" : n <= 6 ? "#F59E0B" : "#10B981";

const emptyReview = (weekStart: string): WeeklyReview => ({
  weekStart,
  overallRating: 0,
  highlights:    "",
  keyLearnings:  "",
  wins:          ["", "", ""],
  improvements:  "",
  nextWeekFocus: "",
});

export default function WeeklyReviewSheet({
  open, onClose, weekStart, review, onSave, weekEvents, tasks, habits,
}: Props) {
  const [draft, setDraft] = useState<WeeklyReview>(emptyReview(weekStart));

  useEffect(() => {
    if (!open) return;
    setDraft(review ?? emptyReview(weekStart));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const weekEnd    = (() => { const d = new Date(weekStart + "T00:00:00"); d.setDate(d.getDate() + 7); return toTaskDate(d); })();
  const eventCount = weekEvents.length;
  const tasksClosedCount = tasks.filter(
    (t) => t.deadline >= weekStart && t.deadline < weekEnd && t.status !== "open"
  ).length;
  const habitRate  = computeHabitRate(habits, weekStart);
  const weekNum    = getISOWeekNum(weekStart);

  function updateWin(idx: number, val: string) {
    const wins = [...draft.wins] as [string, string, string];
    wins[idx] = val;
    setDraft({ ...draft, wins });
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50,
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "640px",
        backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0",
        zIndex: 51, boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", maxHeight: "90vh",
      }}>
        {/* Drag handle */}
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E8DDD0" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 28px 16px", borderBottom: "1px solid #EDE5D8", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.07em", color: "#F97316", marginBottom: "3px" }}>
                Week {weekNum} Review
              </p>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
                {weekLabel(weekStart)}
              </h2>
            </div>
            <button onClick={onClose} style={iconBtn}><X size={14} color="#57534E" /></button>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            {[
              { icon: <Calendar size={11} />, label: "Time blocks", val: eventCount },
              { icon: <CheckSquare size={11} />, label: "Tasks done", val: tasksClosedCount },
              { icon: <TrendingUp size={11} />, label: "Habit rate", val: `${habitRate}%` },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{
                flex: 1, padding: "8px 12px", borderRadius: "10px",
                backgroundColor: "#FAF5EE", border: "1px solid #EDE5D8",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#78716C" }}>
                  {icon}
                  <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.06em" }}>{label}</span>
                </div>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>

          {/* Rating */}
          <div style={{ marginBottom: "22px" }}>
            <label style={lbl}>How was this week overall?</label>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const selected = draft.overallRating === n;
                const col = ratingColor(n);
                return (
                  <button key={n} onClick={() => setDraft({ ...draft, overallRating: n })} style={{
                    width: 38, height: 38, borderRadius: "9px", border: `2px solid ${selected ? col : "#E8DDD0"}`,
                    backgroundColor: selected ? col : "#FFFFFF",
                    fontSize: "13px", fontWeight: 700,
                    color: selected ? "#FFFFFF" : "#57534E",
                    cursor: "pointer",
                  }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Highlights */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>What went well this week?</label>
            <textarea
              value={draft.highlights}
              onChange={(e) => setDraft({ ...draft, highlights: e.target.value })}
              placeholder="Key moments, wins, proud outcomes…"
              rows={3}
              className="weekly-textarea"
              style={{ ...inp, resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {/* Key learnings */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>Key learnings</label>
            <textarea
              value={draft.keyLearnings}
              onChange={(e) => setDraft({ ...draft, keyLearnings: e.target.value })}
              placeholder="What did this week teach you?"
              rows={2}
              className="weekly-textarea"
              style={{ ...inp, resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {/* Three wins */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>
              <Trophy size={9} style={{ display: "inline", marginRight: 3 }} />
              Three wins this week
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {([0, 1, 2] as const).map((idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: "#FFF7ED", border: "1.5px solid #FED7AA",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: 700, color: "#F97316",
                  }}>
                    {idx + 1}
                  </span>
                  <input
                    value={draft.wins[idx]}
                    onChange={(e) => updateWin(idx, e.target.value)}
                    placeholder={`Win ${idx + 1}…`}
                    className="weekly-input"
                    style={{ ...inp, flex: 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>What to improve next week?</label>
            <textarea
              value={draft.improvements}
              onChange={(e) => setDraft({ ...draft, improvements: e.target.value })}
              placeholder="Patterns to break, habits to adjust…"
              rows={2}
              className="weekly-textarea"
              style={{ ...inp, resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {/* Next week focus */}
          <div style={{ marginBottom: "8px" }}>
            <label style={lbl}>
              <ArrowRight size={9} style={{ display: "inline", marginRight: 3 }} />
              Intention for next week
            </label>
            <textarea
              value={draft.nextWeekFocus}
              onChange={(e) => setDraft({ ...draft, nextWeekFocus: e.target.value })}
              placeholder="One sentence: what does a great week ahead look like?"
              rows={2}
              className="weekly-textarea"
              style={{ ...inp, resize: "none", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 28px 24px", borderTop: "1px solid #EDE5D8", flexShrink: 0,
          display: "flex", justifyContent: "flex-end", gap: "8px",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: "10px",
            border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
            fontSize: "12px", fontWeight: 600, color: "#57534E", cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{
            padding: "9px 24px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "12px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
          }}>
            {review ? "Update Review" : "Save Review"} ✓
          </button>
        </div>
      </div>
    </>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700, color: "#44403C",
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "10px",
  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
};

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "1px solid #EDE5D8",
  backgroundColor: "#FAFAFA", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};
