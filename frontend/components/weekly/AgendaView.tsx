"use client";



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

const DAY_NAMES  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AgendaView({
  weekStart, weekEvents, tasks, eventGroups,
  onEditEvent, onTaskClick,
}: Props) {
  const today    = toTaskDate();
  const groupMap = Object.fromEntries(eventGroups.map((g) => [g.id, g]));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return toTaskDate(d);
  });

  return (
    <div style={{
      flex: 1, display: "flex", overflow: "hidden",
      borderLeft: "1px solid #EDE5D8",
    }}>
      {days.map((date, i) => {
        const isToday  = date === today;
        const isPast   = date < today;
        const d        = new Date(date + "T00:00:00");
        const dayEvents = weekEvents
          .filter((e) => e.date === date)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const dayTasks = tasks.filter((t) => t.deadline === date && t.status === "open");
        const empty    = dayEvents.length === 0 && dayTasks.length === 0;

        return (
          <div key={date} style={{
            flex: 1, display: "flex", flexDirection: "column",
            borderRight: i < 6 ? "1px solid #EDE5D8" : "none",
            backgroundColor: isToday ? "#FFFCF8" : "#FFFFFF",
            overflow: "hidden",
          }}>
            {/* Day header */}
            <div style={{
              padding: "12px 10px 10px", flexShrink: 0,
              borderBottom: "1px solid #EDE5D8",
              backgroundColor: isToday ? "#FFF7ED" : isPast ? "#FAFAF9" : "#FFFFFF",
            }}>
              <p style={{
                fontSize: "9px", fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: isToday ? "#F97316" : isPast ? "#57534E" : "#57534E",
                marginBottom: "3px",
              }}>
                {DAY_NAMES[i]}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{
                  fontSize: "22px", fontWeight: 700, lineHeight: 1,
                  color: isToday ? "#F97316" : isPast ? "#57534e" : "#57534e",
                }}>
                  {d.getDate()}
                </span>
                <span style={{ fontSize: "11px", color: "#57534e" }}>
                  {MONTH_ABBR[d.getMonth()]}
                </span>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 10px", display: "flex", flexDirection: "column", gap: "5px" }}>

              {/* Empty state */}
              {empty && (
                <p style={{
                  fontSize: "10px", color: "#C4B5A8", textAlign: "center",
                  paddingTop: "20px", fontStyle: "italic",
                }}>
                  Nothing yet
                </p>
              )}

              {/* Events */}
              {dayEvents.map((ev) => {
                const group = groupMap[ev.groupId];
                const color = group?.color ?? "#6366F1";
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEditEvent(ev)}
                    style={{
                      borderRadius: "7px",
                      borderLeft: `3px solid ${color}`,
                      backgroundColor: color + "12",
                      padding: "6px 9px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: "9px", fontWeight: 700, color, marginBottom: "2px", lineHeight: 1 }}>
                      {ev.startTime} – {ev.endTime}
                    </p>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>
                      {ev.title}
                    </p>
                    {ev.description && (
                      <p style={{
                        fontSize: "10px", color: "#78716C", marginTop: "2px",
                        lineHeight: 1.3, margin: "2px 0 0",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {ev.description}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Tasks divider + task cards */}
              {dayTasks.length > 0 && (
                <>
                  <div style={{ height: 1, backgroundColor: "#EDE5D8", margin: "2px 0" }} />
                  {dayTasks.map((t) => {
                    const m = Q_META[t.quadrant];
                    return (
                      <div
                        key={t.id}
                        onClick={() => onTaskClick(t)}
                        title="Click for details"
                        style={{
                          borderRadius: "7px",
                          border: `1.5px solid ${m.border}`,
                          backgroundColor: m.bg,
                          padding: "6px 9px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            backgroundColor: m.color, flexShrink: 0,
                          }} />
                          <span style={{ fontSize: "8px", fontWeight: 700, color: m.color }}>
                            {t.quadrant}
                          </span>
                        </div>
                        <p style={{
                          fontSize: "11px", fontWeight: 600, color: "#1C1917",
                          margin: 0, lineHeight: 1.3,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {t.title}
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
