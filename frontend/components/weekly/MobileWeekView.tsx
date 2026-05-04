"use client";

import { Plus } from "lucide-react";
import type { WeekEvent, EventGroup } from "@/lib/weeklyTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import { Q_META, toTaskDate } from "@/components/tasks/TaskCard";

interface Props {
  weekStart:     string;
  weekEvents:    WeekEvent[];
  tasks:         TaskData[];
  eventGroups:   EventGroup[];
  onCreateEvent: (date: string, startTime: string) => void;
  onEditEvent:   (e: WeekEvent) => void;
  onTaskClick:   (t: TaskData) => void;
}

const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function MobileWeekView({
  weekStart, weekEvents, tasks, eventGroups,
  onCreateEvent, onEditEvent, onTaskClick,
}: Props) {
  const today    = toTaskDate();
  const groupMap = Object.fromEntries(eventGroups.map((g) => [g.id, g]));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return toTaskDate(d);
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#FAFAF9" }}>
      {days.map((date, i) => {
        const d          = new Date(date + "T00:00:00");
        const isToday    = date === today;
        const isPast     = date < today;
        const dayEvents  = weekEvents
          .filter((e) => e.date === date)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const dayTasks   = tasks.filter((t) => t.deadline === date && t.status === "open");
        const hasContent = dayEvents.length > 0 || dayTasks.length > 0;

        return (
          <div
            key={date}
            style={{
              display: "flex",
              gap: "12px",
              padding: "14px 16px",
              borderBottom: "1px solid #EDE5D8",
              backgroundColor: isToday ? "#FFFCF8" : "#FFFFFF",
            }}
          >
            {/* Left: date column */}
            <div style={{
              width: 46,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "2px",
            }}>
              <span style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: isToday ? "#F97316" : isPast ? "#A8A29E" : "#78716C",
                marginBottom: "3px",
              }}>
                {DAY_NAMES[i]}
              </span>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                backgroundColor: isToday ? "#F97316" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: isToday ? "#FFFFFF" : isPast ? "#A8A29E" : "#1C1917",
                }}>
                  {d.getDate()}
                </span>
              </div>
            </div>

            {/* Right: events & tasks */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              paddingTop: "4px",
            }}>
              {!hasContent && (
                <p style={{
                  fontSize: "12px",
                  color: "#A8A29E",
                  fontStyle: "italic",
                  paddingTop: "4px",
                  margin: 0,
                }}>
                  No events
                </p>
              )}

              {dayEvents.map((ev) => {
                const group = groupMap[ev.groupId];
                const color = group?.color ?? "#6366F1";
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEditEvent(ev)}
                    style={{
                      borderRadius: "10px",
                      borderLeft: `4px solid ${color}`,
                      backgroundColor: color + "18",
                      padding: "9px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#1C1917",
                      margin: 0,
                      lineHeight: 1.25,
                    }}>
                      {ev.title}
                    </p>
                    <p style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color,
                      margin: "3px 0 0",
                      lineHeight: 1,
                    }}>
                      {ev.startTime} – {ev.endTime}
                    </p>
                    {ev.description && (
                      <p style={{
                        fontSize: "11px",
                        color: "#78716C",
                        margin: "3px 0 0",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {ev.description}
                      </p>
                    )}
                  </div>
                );
              })}

              {dayTasks.length > 0 && dayEvents.length > 0 && (
                <div style={{ height: 1, backgroundColor: "#EDE5D8", margin: "1px 0" }} />
              )}

              {dayTasks.map((t) => {
                const m = Q_META[t.quadrant];
                return (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    style={{
                      borderRadius: "10px",
                      border: `1.5px solid ${m.border}`,
                      backgroundColor: m.bg,
                      padding: "9px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1C1917",
                      margin: 0,
                      lineHeight: 1.3,
                    }}>
                      {t.title}
                    </p>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: m.color }}>
                      {t.quadrant}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* Spacer so FAB doesn't cover last row */}
      <div style={{ height: 80 }} />
    </div>
  );
}
