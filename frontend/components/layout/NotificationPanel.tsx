"use client";

import { X, AlertCircle, Clock, Calendar, Flame, BookOpen } from "lucide-react";
import type { TaskData } from "@/components/tasks/TaskCard";
import { toTaskDate } from "@/components/tasks/TaskCard";
import type { HabitData } from "@/components/habits/HabitCard";
import { isScheduledDay } from "@/components/habits/HabitCard";
import type { WeekPlan } from "@/lib/weeklyTypes";

interface Props {
  onClose:   () => void;
  tasks:     TaskData[];
  habits:    HabitData[];
  weekPlans: WeekPlan[];
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getWeekStart(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}

export default function NotificationPanel({ onClose, tasks, habits, weekPlans }: Props) {
  const today     = toTaskDate();
  const todayDow  = new Date().getDay();
  const weekStart = getWeekStart();

  const inDays = (n: number) => {
    const d = new Date(); d.setDate(d.getDate() + n); return toTaskDate(d);
  };
  const weekFromNow = inDays(7);

  // Tasks
  const overdue    = tasks.filter((t) => t.status === "open" && t.deadline < today);
  const dueToday   = tasks.filter((t) => t.status === "open" && t.deadline === today);
  const dueWeek    = tasks.filter((t) => t.status === "open" && t.deadline > today && t.deadline <= weekFromNow);

  // Habits
  const scheduled  = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, todayDow));
  const completed  = scheduled.filter((h) =>
    h.type === "binary" ? h.completions.includes(today) : (h.measurements[today] ?? 0) >= h.target
  );
  const pending    = scheduled.length - completed.length;

  // Weekly plan
  const plan       = weekPlans.find((p) => p.weekStart === weekStart);
  const hasWeekly  = plan && ((plan.priorities?.length ?? 0) > 0 || (plan.outcomes?.length ?? 0) > 0);

  const total = overdue.length + dueToday.length + (pending > 0 ? 1 : 0) + (!hasWeekly ? 1 : 0);

  type Notif = { id: string; icon: React.ReactNode; bg: string; border: string; text: string; sub: string; subColor: string };

  const notifs: Notif[] = [
    ...overdue.map((t) => ({
      id: "ov-" + t.id, icon: <AlertCircle size={14} color="#DC2626" />,
      bg: "#FEF2F2", border: "#FECACA",
      text: t.title, sub: `Overdue · due ${fmtDate(t.deadline)}`, subColor: "#DC2626",
    })),
    ...dueToday.map((t) => ({
      id: "dt-" + t.id, icon: <Clock size={14} color="#EA580C" />,
      bg: "#FFF7ED", border: "#FED7AA",
      text: t.title, sub: "Due today", subColor: "#EA580C",
    })),
    ...dueWeek.map((t) => ({
      id: "dw-" + t.id, icon: <Calendar size={14} color="#B45309" />,
      bg: "#FFFBEB", border: "#FDE68A",
      text: t.title, sub: `Due ${fmtDate(t.deadline)}`, subColor: "#B45309",
    })),
    ...(pending > 0 ? [{
      id: "habits", icon: <Flame size={14} color="#7C3AED" />,
      bg: "#FAF5FF", border: "#E9D5FF",
      text: `${pending} habit${pending > 1 ? "s" : ""} pending today`,
      sub: "Don't forget to log your habits", subColor: "#7C3AED",
    }] : []),
    ...(!hasWeekly ? [{
      id: "weekly", icon: <BookOpen size={14} color="#0F766E" />,
      bg: "#F0FDFA", border: "#99F6E4",
      text: "Set up your weekly plan",
      sub: "No priorities set for this week", subColor: "#0F766E",
    }] : []),
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div style={{
        position: "absolute", top: "46px", right: 0,
        width: "min(340px, calc(100vw - 16px))", maxHeight: "460px",
        backgroundColor: "#FFFFFF", borderRadius: "16px",
        border: "1px solid #E8DDD0", boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 14px", borderBottom: "1px solid #F0EBE4",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "#FAF5EE", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Notifications</span>
            {total > 0 && (
              <span style={{
                padding: "1px 7px", borderRadius: "10px",
                backgroundColor: "#F97316", color: "#FFFFFF",
                fontSize: "10px", fontWeight: 700,
              }}>{total}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={13} color="#78716C" />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {notifs.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "22px", margin: "0 0 6px" }}>✅</p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#1C1917", margin: "0 0 4px" }}>All caught up!</p>
              <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0 }}>No pending notifications</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {notifs.map((n) => (
                <div key={n.id} style={{
                  padding: "10px 12px", borderRadius: "10px",
                  backgroundColor: n.bg, border: `1px solid ${n.border}`,
                  display: "flex", alignItems: "flex-start", gap: "10px",
                }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: "12px", fontWeight: 600, color: "#1C1917",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{n.text}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: n.subColor }}>{n.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
