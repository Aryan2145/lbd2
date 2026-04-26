"use client";

import { useState, useRef, useEffect } from "react";
import type { WeekEvent, EventGroup, WeekPlan } from "@/lib/weeklyTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import { Q_META, toTaskDate } from "@/components/tasks/TaskCard";
import type { HabitData } from "@/components/habits/HabitCard";
import { isScheduledDay, isHabitDoneOnDate, toLocalDate } from "@/components/habits/HabitCard";

const PX_PER_HOUR  = 64;
const START_HOUR   = 0;
const END_HOUR     = 24;
const TOTAL_HOURS  = END_HOUR - START_HOUR;          // 24
const TOTAL_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;      // 1536px
const DEFAULT_SCROLL_HOUR = 6;                        // scroll to 6am on mount

const DAY_NAMES  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function timeToY(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR + m / 60) * PX_PER_HOUR;
}

function durationPx(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = Math.max((eh * 60 + em) - (sh * 60 + sm), 15);
  return (mins / 60) * PX_PER_HOUR;
}

function fmtHour(h: number): string {
  if (h === 0  || h === 24) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

interface Props {
  weekStart:   string;
  weekEvents:  WeekEvent[];
  tasks:       TaskData[];
  habits:      HabitData[];
  eventGroups: EventGroup[];
  plan:        WeekPlan;
  onCreateEvent: (date: string, startTime: string) => void;
  onEditEvent:   (e: WeekEvent) => void;
  onUpdatePlan:  (p: WeekPlan)  => void;
  onTaskClick?:  (t: TaskData)  => void;
}

export default function WeeklyGrid({
  weekStart, weekEvents, tasks, habits, eventGroups, plan,
  onCreateEvent, onEditEvent, onUpdatePlan, onTaskClick,
}: Props) {
  const today     = toTaskDate();
  const now       = new Date();
  const groupMap  = Object.fromEntries(eventGroups.map((g) => [g.id, g]));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = DEFAULT_SCROLL_HOUR * PX_PER_HOUR;
    }
  // Only on mount — intentionally empty deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build 7 ISO date strings Mon→Sun
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return toTaskDate(d);
  });

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  // Current-time indicator position (only if today is in this week)
  const currentTimeY = days.includes(today)
    ? timeToY(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`)
    : null;

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, date: string) {
    if ((e.target as HTMLElement).closest("[data-event]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMins = (y / PX_PER_HOUR) * 60;
    const snapped   = Math.round(totalMins / 15) * 15;
    const h = START_HOUR + Math.floor(snapped / 60);
    const m = snapped % 60;
    const clamped = Math.min(Math.max(h, START_HOUR), END_HOUR - 1);
    onCreateEvent(date, `${String(clamped).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "#FFFFFF" }}>

      {/* ── Day header row ── */}
      <div style={{ display: "flex", flexShrink: 0, borderBottom: "2px solid #EDE5D8" }}>
        {/* Spacer for time col */}
        <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid #EDE5D8" }} />

        {days.map((date, i) => {
          const isToday = date === today;
          const d       = new Date(date + "T00:00:00");
          const openTaskCount = tasks.filter((t) => t.deadline === date && t.status === "open").length;
          const dayHabits     = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, d.getDay()));
          const openTasks     = tasks.filter((t) => t.deadline === date && t.status === "open").slice(0, 4);

          return (
            <div key={date} style={{
              flex: 1, padding: "10px 8px 8px", textAlign: "center",
              borderRight: i < 6 ? "1px solid #EDE5D8" : "none",
              backgroundColor: isToday ? "#FFF7ED" : "#FFFFFF",
            }}>
              {/* Day name */}
              <p style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.07em", color: isToday ? "#F97316" : "#57534E",
                marginBottom: "3px" }}>
                {DAY_NAMES[i]}
              </p>

              {/* Date circle */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                margin: "0 auto 2px",
                backgroundColor: isToday ? "#F97316" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "14px", fontWeight: 700,
                  color: isToday ? "#FFFFFF" : "#1C1917" }}>
                  {d.getDate()}
                </span>
              </div>

              <p style={{ fontSize: "10px", color: "#57534E", marginBottom: "5px" }}>
                {MONTH_ABBR[d.getMonth()]}
              </p>

              {/* Task quadrant dots */}
              {openTasks.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "2px", marginBottom: "3px" }}>
                  {openTasks.map((t) => (
                    <div key={t.id} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      backgroundColor: Q_META[t.quadrant].color,
                    }} />
                  ))}
                  {openTaskCount > 4 && (
                    <span style={{ fontSize: "8px", color: "#A8A29E", lineHeight: "6px" }}>
                      +{openTaskCount - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Habit completion dots */}
              {dayHabits.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "2px" }}>
                  {dayHabits.slice(0, 6).map((h) => {
                    const done = isHabitDoneOnDate(h, toLocalDate(d));
                    return (
                      <div key={h.id} style={{
                        width: 4, height: 4, borderRadius: "50%",
                        backgroundColor: done ? "#16A34A" : "#E5E7EB",
                      }} />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Task chips row ── */}
      <div style={{ display: "flex", flexShrink: 0, borderBottom: "2px solid #EDE5D8", backgroundColor: "#FAF9F7" }}>
        {/* Label */}
        <div style={{
          width: 56, flexShrink: 0, borderRight: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0",
        }}>
          <span style={{
            fontSize: "8px", fontWeight: 700, color: "#78716C",
            textTransform: "uppercase", letterSpacing: "0.07em",
            writingMode: "vertical-rl", transform: "rotate(180deg)",
          }}>
            Tasks
          </span>
        </div>
        {/* Per-day task chips */}
        {days.map((date, i) => {
          const dayTasks = tasks.filter((t) => t.deadline === date && t.status === "open");
          return (
            <div key={date} style={{
              flex: 1, borderRight: i < 6 ? "1px solid #EDE5D8" : "none",
              padding: "5px 5px", display: "flex", flexWrap: "wrap",
              gap: "3px", minHeight: 34, alignContent: "flex-start",
            }}>
              {dayTasks.slice(0, 4).map((t) => {
                const m = Q_META[t.quadrant];
                return (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick?.(t)}
                    title={t.title}
                    style={{
                      display: "flex", alignItems: "center", gap: "3px",
                      padding: "2px 6px", borderRadius: "4px",
                      backgroundColor: m.bg, border: `1px solid ${m.border}`,
                      cursor: onTaskClick ? "pointer" : "default",
                    }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: m.color, flexShrink: 0 }} />
                    <span style={{
                      fontSize: "9px", fontWeight: 600, color: m.color,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      maxWidth: 72,
                    }}>
                      {t.title}
                    </span>
                  </div>
                );
              })}
              {dayTasks.length > 4 && (
                <span style={{ fontSize: "9px", color: "#78716C", fontWeight: 600, alignSelf: "center" }}>
                  +{dayTasks.length - 4}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Scrollable time grid ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", height: TOTAL_HEIGHT }}>

          {/* Time labels */}
          <div style={{ width: 56, flexShrink: 0, position: "relative", borderRight: "1px solid #EDE5D8" }}>
            {hours.map((h) => (
              <div key={h} style={{
                position: "absolute",
                top: (h - START_HOUR) * PX_PER_HOUR - 7,
                right: 8, left: 0,
                textAlign: "right",
              }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#57534E" }}>
                  {fmtHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((date, i) => {
            const isToday   = date === today;
            const dayEvents = weekEvents.filter((e) => e.date === date)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={date}
                onClick={(e) => handleColumnClick(e, date)}
                style={{
                  flex: 1, position: "relative", height: "100%",
                  borderRight: i < 6 ? "1px solid #EDE5D8" : "none",
                  backgroundColor: isToday ? "#FFFCF8" : "#FFFFFF",
                  cursor: "crosshair",
                }}
              >
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <div key={h} style={{
                    position: "absolute",
                    top: (h - START_HOUR) * PX_PER_HOUR,
                    left: 0, right: 0, height: 1,
                    backgroundColor: "#F0EBE3", pointerEvents: "none",
                  }} />
                ))}

                {/* Half-hour dashed lines */}
                {hours.map((h) => (
                  <div key={`${h}h`} style={{
                    position: "absolute",
                    top: (h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2,
                    left: 0, right: 0, height: 1,
                    backgroundColor: "#F7F3EE", pointerEvents: "none",
                  }} />
                ))}

                {/* Current time indicator */}
                {isToday && currentTimeY !== null && currentTimeY >= 0 && currentTimeY <= TOTAL_HEIGHT && (
                  <>
                    <div style={{
                      position: "absolute", top: currentTimeY - 1, left: 0, right: 0,
                      height: 2, backgroundColor: "#F97316", zIndex: 10, pointerEvents: "none",
                    }} />
                    <div style={{
                      position: "absolute", top: currentTimeY - 4, left: -4,
                      width: 8, height: 8, borderRadius: "50%",
                      backgroundColor: "#F97316", zIndex: 11, pointerEvents: "none",
                    }} />
                  </>
                )}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const group = groupMap[ev.groupId];
                  const color = group?.color ?? "#6366F1";
                  const top    = timeToY(ev.startTime);
                  const height = Math.max(durationPx(ev.startTime, ev.endTime), 20);
                  const short  = height < 38;

                  return (
                    <div
                      key={ev.id}
                      data-event="true"
                      onClick={(e) => { e.stopPropagation(); onEditEvent(ev); }}
                      title={`${ev.title} · ${ev.startTime}–${ev.endTime}`}
                      style={{
                        position: "absolute", top, height,
                        left: 3, right: 3,
                        backgroundColor: color + "1A",
                        borderLeft: `3px solid ${color}`,
                        borderRadius: "0 6px 6px 0",
                        padding: short ? "2px 5px" : "5px 7px",
                        overflow: "hidden", cursor: "pointer", zIndex: 5,
                        boxSizing: "border-box",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <p style={{
                        fontSize: short ? "9px" : "11px", fontWeight: 700,
                        color, margin: 0, lineHeight: 1.2,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {ev.title}
                      </p>
                      {!short && (
                        <p style={{ fontSize: "9px", color, fontWeight: 600, margin: "1px 0 0", lineHeight: 1 }}>
                          {ev.startTime} – {ev.endTime}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day notes row ── */}
      <div style={{ flexShrink: 0, borderTop: "1px solid #EDE5D8", display: "flex" }}>
        {/* Spacer */}
        <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "8px", color: "#78716C", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.07em",
            writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            Notes
          </span>
        </div>
        {days.map((date, i) => (
          <textarea
            key={date}
            value={plan.dayNotes[date] ?? ""}
            onChange={(e) => onUpdatePlan({
              ...plan,
              dayNotes: { ...plan.dayNotes, [date]: e.target.value },
            })}
            placeholder="Day notes…"
            className="weekly-textarea"
            style={{
              flex: 1, 
              resize: "none", 
              border: "none", 
              outline: "none",
              borderRight: i < 6 ? "1px solid #EDE5D8" : "none",
              padding: "6px 8px", 
              fontSize: "11px", 
              color: "#1C1917",
              backgroundColor: "transparent", 
              fontFamily: "inherit",
              height: 56,
            }}
          />
        ))}
      </div>
    </div>
  );
}
