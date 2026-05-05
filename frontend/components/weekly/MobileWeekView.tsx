"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, SlidersHorizontal, Settings2, Check, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import type { WeekEvent, EventGroup } from "@/lib/weeklyTypes";
import type { TaskData } from "@/components/tasks/TaskCard";
import { Q_META, toTaskDate } from "@/components/tasks/TaskCard";

interface Props {
  weekStart:        string;
  weekEvents:       WeekEvent[];
  tasks:            TaskData[];
  eventGroups:      EventGroup[];
  overdueTasks:     TaskData[];
  onCreateEvent:    (date: string, startTime: string) => void;
  onEditEvent:      (e: WeekEvent) => void;
  onTaskClick:      (t: TaskData) => void;
  onCompleteTask?:  (id: string) => void;
  onMissTask?:      (id: string) => void;
}

const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function MobileWeekView({
  weekStart, weekEvents, tasks, eventGroups, overdueTasks,
  onCreateEvent, onEditEvent, onTaskClick, onCompleteTask, onMissTask,
}: Props) {
  const router   = useRouter();
  const today    = toTaskDate();
  const groupMap = Object.fromEntries(eventGroups.map((g) => [g.id, g]));

  const [overdueOpen,      setOverdueOpen]      = useState(false);
  const [overdueDetail,    setOverdueDetail]    = useState<TaskData | null>(null);
  const [filterOpen,       setFilterOpen]       = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const activeGroups = eventGroups.filter((g) => !g.archived);

  const groupEventCounts = activeGroups.reduce<Record<string, number>>((acc, g) => {
    acc[g.id] = weekEvents.filter((e) => e.groupId === g.id).length;
    return acc;
  }, {});

  const visibleEvents = selectedGroupIds.length > 0
    ? weekEvents.filter((e) => selectedGroupIds.includes(e.groupId))
    : weekEvents;

  const toggleGroup = (id: string) =>
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return toTaskDate(d);
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

      {/* Heading row — position:relative anchors the filter dropdown */}
      <div style={{
        position: "relative",
        flexShrink: 0,
        padding: "8px 16px",
        borderBottom: filterOpen ? "none" : "1px solid #EDE5D8",
        backgroundColor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 26,
      }}>
        <p style={{
          fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "#78716C", margin: 0,
        }}>
          Week Schedule
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {overdueTasks.length > 0 && (
            <button
              onClick={() => { setOverdueOpen((v) => !v); setFilterOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "3px 8px", borderRadius: "20px",
                border: "1px solid #FECACA", backgroundColor: "#FEF2F2",
                fontSize: "10px", fontWeight: 700, color: "#DC2626",
                cursor: "pointer",
              }}
            >
              <AlertCircle size={10} color="#DC2626" />
              {overdueTasks.length} overdue
            </button>
          )}
          <button
            onClick={() => { setFilterOpen((v) => !v); setOverdueOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "3px",
              padding: "4px 8px", borderRadius: "7px",
              border: selectedGroupIds.length > 0 || filterOpen
                ? "1.5px solid #F97316" : "1px solid #C8BFB5",
              backgroundColor: selectedGroupIds.length > 0 || filterOpen
                ? "#FFF7ED" : "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <SlidersHorizontal
              size={12}
              color={selectedGroupIds.length > 0 || filterOpen ? "#F97316" : "#78716C"}
            />
            {selectedGroupIds.length > 0 && (
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#F97316" }}>
                {selectedGroupIds.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Overdue dropdown ── */}
        {overdueOpen && (
          <>
            <div
              onClick={() => setOverdueOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 24 }}
            />
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              width: "260px",
              zIndex: 25,
              backgroundColor: "#FFFFFF",
              border: "1px solid #EDE5D8",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}>
              {overdueDetail ? (
                /* ── Detail view ── */
                <>
                  <div style={{
                    padding: "8px 12px",
                    display: "flex", alignItems: "center", gap: "6px",
                    borderBottom: "1px solid #F2EAE0",
                  }}>
                    <button
                      onClick={() => setOverdueDetail(null)}
                      style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <ChevronLeft size={16} color="#78716C" />
                    </button>
                    <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#78716C" }}>
                      Overdue Task
                    </span>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    {(() => {
                      const m = Q_META[overdueDetail.quadrant];
                      return (
                        <>
                          <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: "0 0 6px", lineHeight: 1.35 }}>
                            {overdueDetail.title}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
                            <span style={{
                              fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px",
                              backgroundColor: m.bg, color: m.color, border: `1px solid ${m.border}`,
                            }}>
                              {overdueDetail.quadrant}
                            </span>
                            <span style={{ fontSize: "11px", color: "#A8A29E" }}>Due {overdueDetail.deadline}</span>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => { onCompleteTask?.(overdueDetail.id); setOverdueDetail(null); setOverdueOpen(false); }}
                              style={{
                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                                padding: "8px", borderRadius: "8px", border: "1px solid #BBF7D0",
                                backgroundColor: "#F0FDF4", fontSize: "11px", fontWeight: 700,
                                color: "#16A34A", cursor: "pointer",
                              }}
                            >
                              <CheckCircle2 size={13} /> Done
                            </button>
                            <button
                              onClick={() => { onMissTask?.(overdueDetail.id); setOverdueDetail(null); setOverdueOpen(false); }}
                              style={{
                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                                padding: "8px", borderRadius: "8px", border: "1px solid #FECACA",
                                backgroundColor: "#FEF2F2", fontSize: "11px", fontWeight: 700,
                                color: "#DC2626", cursor: "pointer",
                              }}
                            >
                              <XCircle size={13} /> Skip
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                /* ── List view ── */
                <>
                  <div style={{
                    padding: "8px 16px",
                    display: "flex", alignItems: "center", gap: "6px",
                    borderBottom: "1px solid #F2EAE0",
                  }}>
                    <AlertCircle size={11} color="#DC2626" />
                    <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#DC2626" }}>
                      Overdue · {overdueTasks.length}
                    </span>
                  </div>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {overdueTasks.map((t) => {
                      const m = Q_META[t.quadrant];
                      return (
                        <div
                          key={t.id}
                          onClick={() => setOverdueDetail(t)}
                          style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "10px 16px", borderBottom: "1px solid #F8F4EF",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: "13px", fontWeight: 600, color: "#1C1917",
                              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {t.title}
                            </p>
                            <p style={{ fontSize: "11px", color: "#A8A29E", margin: "2px 0 0" }}>
                              Due {t.deadline}
                            </p>
                          </div>
                          <span style={{
                            fontSize: "9px", fontWeight: 700, padding: "2px 7px",
                            borderRadius: "5px", backgroundColor: m.bg,
                            color: m.color, border: `1px solid ${m.border}`,
                            flexShrink: 0,
                          }}>
                            {t.quadrant}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Filter dropdown ── */}
        {filterOpen && (
          <>
            {/* Transparent click-away backdrop */}
            <div
              onClick={() => setFilterOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 24 }}
            />
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              width: "220px",
              zIndex: 25,
              backgroundColor: "#FFFFFF",
              border: "1px solid #EDE5D8",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}>
              {/* Dropdown header */}
              <div style={{
                padding: "8px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid #F2EAE0",
              }}>
                <span style={{
                  fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.07em", color: "#78716C",
                }}>
                  Filter by Group
                </span>
                <button
                  onClick={() => router.push("/settings")}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "3px 8px", borderRadius: "6px",
                    border: "1px solid #E8DDD0", backgroundColor: "#F5F0EB",
                    fontSize: "10px", fontWeight: 600, color: "#78716C", cursor: "pointer",
                  }}
                >
                  <Settings2 size={10} color="#78716C" /> Manage
                </button>
              </div>

              {/* Group list — 5 rows visible, then scrolls */}
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {activeGroups.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#A8A29E", fontStyle: "italic", margin: 0, padding: "12px 16px" }}>
                    No groups yet — add one while creating an event.
                  </p>
                ) : (
                  activeGroups.map((g) => {
                    const selected = selectedGroupIds.includes(g.id);
                    const count    = groupEventCounts[g.id] ?? 0;
                    return (
                      <div
                        key={g.id}
                        onClick={() => toggleGroup(g.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "10px 16px",
                          backgroundColor: selected ? g.color + "0D" : "#FFFFFF",
                          borderBottom: "1px solid #F8F4EF",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          backgroundColor: g.color, flexShrink: 0,
                        }} />
                        <span style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: selected ? g.color : "#1C1917" }}>
                            {g.name}
                          </span>
                          <span style={{
                            minWidth: 18, height: 18, borderRadius: "50%",
                            backgroundColor: g.color + "22",
                            color: g.color,
                            fontSize: "10px", fontWeight: 700,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            padding: "0 4px",
                          }}>
                            {count}
                          </span>
                        </span>
                        {selected && <Check size={13} color={g.color} />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Clear footer */}
              {selectedGroupIds.length > 0 && (
                <div style={{ padding: "8px 16px", borderTop: "1px solid #F2EAE0" }}>
                  <button
                    onClick={() => { setSelectedGroupIds([]); setFilterOpen(false); }}
                    style={{
                      fontSize: "11px", fontWeight: 600, color: "#78716C",
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                    }}
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Scrollable days */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#FAFAF9" }}>
        {days.map((date, i) => {
          const d          = new Date(date + "T00:00:00");
          const isToday    = date === today;
          const isPast     = date < today;
          const dayEvents  = visibleEvents
            .filter((e) => e.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const dayTasks   = tasks.filter((t) => t.deadline === date && t.status === "open");
          const hasContent = dayEvents.length > 0 || dayTasks.length > 0;

          return (
            <div
              key={date}
              style={{
                display: "flex", gap: "12px", padding: "14px 16px",
                borderBottom: "1px solid #EDE5D8",
                backgroundColor: isToday ? "#FFFCF8" : "#FFFFFF",
              }}
            >
              {/* Date column */}
              <div style={{
                width: 46, flexShrink: 0, display: "flex",
                flexDirection: "column", alignItems: "center", paddingTop: "2px",
              }}>
                <span style={{
                  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: isToday ? "#F97316" : isPast ? "#A8A29E" : "#78716C",
                  marginBottom: "3px",
                }}>
                  {DAY_NAMES[i]}
                </span>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  backgroundColor: isToday ? "#F97316" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontSize: "20px", fontWeight: 700, lineHeight: 1,
                    color: isToday ? "#FFFFFF" : isPast ? "#A8A29E" : "#1C1917",
                  }}>
                    {d.getDate()}
                  </span>
                </div>
              </div>

              {/* Events & tasks */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
                {!hasContent && (
                  <p style={{ fontSize: "12px", color: "#A8A29E", fontStyle: "italic", paddingTop: "4px", margin: 0 }}>
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
                        borderRadius: "10px", borderLeft: `4px solid ${color}`,
                        backgroundColor: color + "18", padding: "9px 12px", cursor: "pointer",
                      }}
                    >
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: 1.25 }}>
                        {ev.title}
                      </p>
                      <p style={{ fontSize: "12px", fontWeight: 600, color, margin: "3px 0 0", lineHeight: 1 }}>
                        {ev.startTime} – {ev.endTime}
                      </p>
                      {ev.description && (
                        <p style={{
                          fontSize: "11px", color: "#78716C", margin: "3px 0 0", lineHeight: 1.3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
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
                        borderRadius: "10px", border: `1.5px solid ${m.border}`,
                        backgroundColor: m.bg, padding: "9px 12px", cursor: "pointer",
                      }}
                    >
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>
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
        <div style={{ height: 80 }} />
      </div>


    </div>
  );
}
