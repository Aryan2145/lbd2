"use client";

import { useRef, useEffect } from "react";
import type { WeekEvent, EventGroup, WeekPlan } from "@/lib/weeklyTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import { toTaskDate } from "@/components/tasks/TaskCard";
import type { HabitData } from "@/components/habits/HabitCard";

const PX_PER_HOUR  = 64;
const START_HOUR   = 0;
const END_HOUR     = 24;
const TOTAL_HOURS  = END_HOUR - START_HOUR;
const TOTAL_HEIGHT = TOTAL_HOURS * PX_PER_HOUR;
const DEFAULT_SCROLL_HOUR = 6;

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
  const today    = toTaskDate();
  const now      = new Date();
  const groupMap = Object.fromEntries(eventGroups.map((g) => [g.id, g]));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = DEFAULT_SCROLL_HOUR * PX_PER_HOUR;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return toTaskDate(d);
  });

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

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

      {/* ── Single scroll container: sticky header + time grid + notes ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", scrollbarGutter: "stable" }}>

        {/* ── Day header row (sticky) ── */}
        <div style={{
          display: "flex", flexShrink: 0,
          borderBottom: "2px solid #FED7AA",
          position: "sticky", top: 0, zIndex: 20,
        }}>
          {/* Spacer for time col */}
          <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.3)", backgroundColor: "#C2410C" }} />

          {days.map((date, i) => {
            const isToday = date === today;
            const d       = new Date(date + "T00:00:00");

            return (
              <div key={date} style={{
                flex: 1, padding: "10px 8px 8px", textAlign: "center",
                borderRight: i < 6 ? "1px solid rgba(255,255,255,0.3)" : "none",
                backgroundColor: isToday ? "#9A3412" : "#C2410C",
              }}>
                <p style={{
                  fontSize: "9px", fontWeight: 800, textTransform: "uppercase",
                  letterSpacing: "0.07em", color: "#FFFFFF", marginBottom: "3px",
                }}>
                  {DAY_NAMES[i]}
                </p>

                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  margin: "0 auto 2px",
                  backgroundColor: isToday ? "#FFFFFF" : "rgba(0,0,0,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: isToday ? "#9A3412" : "#FFFFFF" }}>
                    {d.getDate()}
                  </span>
                </div>

                <p style={{ fontSize: "10px", color: "#FFFFFF", marginBottom: "5px" }}>
                  {MONTH_ABBR[d.getMonth()]}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Time grid ── */}
        <div style={{ display: "flex", height: TOTAL_HEIGHT }}>

          {/* Time labels */}
          <div style={{ width: 56, flexShrink: 0, position: "relative", borderRight: "1px solid #FED7AA" }}>
            {hours.map((h) => (
              <div key={h} style={{
                position: "absolute",
                top: (h - START_HOUR) * PX_PER_HOUR - 7,
                right: 8, left: 0,
                textAlign: "right",
              }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#C2410C" }}>
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
                  borderRight: i < 6 ? "1px solid #FED7AA" : "none",
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
                    backgroundColor: "#FED7AA", pointerEvents: "none",
                  }} />
                ))}

                {/* Half-hour lines */}
                {hours.map((h) => (
                  <div key={`${h}h`} style={{
                    position: "absolute",
                    top: (h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2,
                    left: 0, right: 0, height: 1,
                    backgroundColor: "#FEE6C4", pointerEvents: "none",
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
                  const group  = groupMap[ev.groupId];
                  const color  = group?.color ?? "#6366F1";
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

        {/* ── Day notes row ── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #FED7AA", display: "flex", backgroundColor: "#FFFFFF" }}>
          <div style={{
            width: 56, flexShrink: 0, borderRight: "1px solid #FED7AA",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: "8px", color: "#78716C", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em",
              writingMode: "vertical-rl", transform: "rotate(180deg)",
            }}>
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
                borderRight: i < 6 ? "1px solid #FED7AA" : "none",
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
    </div>
  );
}
