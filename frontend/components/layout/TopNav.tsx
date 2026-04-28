"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Crown, Search } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { toTaskDate } from "@/components/tasks/TaskCard";
import { isScheduledDay } from "@/components/habits/HabitCard";
import NotificationPanel from "@/components/layout/NotificationPanel";
import ProfilePanel      from "@/components/layout/ProfilePanel";
import SearchPanel       from "@/components/layout/SearchPanel";

type Panel = "search" | "notifications" | "profile" | null;

const NAV = [
  { href: "/dashboard",   label: "Dashboard"     },
  { href: "/legacy",      label: "My Legacy"     },
  { href: "/vision",      label: "Vision Canvas" },
  { href: "/value",       label: "Value"         },
  { href: "/goals",       label: "Goals"         },
  { href: "/habits",      label: "Habits"        },
  { href: "/bucket-list", label: "Bucket List"   },
  { href: "/tasks",       label: "Tasks"         },
  { href: "/weekly",      label: "Weekly Plan"   },
  { href: "/daily",       label: "Daily"         },
  { href: "/support",     label: "Support"       },
];

function getWeekStart(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}

export default function TopNav() {
  const pathname = usePathname();
  const [panel, setPanel] = useState<Panel>(null);

  const {
    tasks, habits, weekPlans, dayPlans,
    goals, bucketEntries,
    userProfile, updateUserProfile,
  } = useAppStore();

  // ── Notification count ────────────────────────────────────────────────────
  const today     = toTaskDate();
  const todayDow  = new Date().getDay();
  const weekStart = getWeekStart();

  const overdueCount   = tasks.filter((t) => t.status === "open" && t.deadline < today).length;
  const dueTodayCount  = tasks.filter((t) => t.status === "open" && t.deadline === today).length;
  const scheduled      = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, todayDow));
  const completedToday = scheduled.filter((h) =>
    h.type === "binary" ? h.completions.includes(today) : (h.measurements[today] ?? 0) >= h.target
  );
  const pendingHabits = scheduled.length - completedToday.length;
  const wPlan         = weekPlans.find((p) => p.weekStart === weekStart);
  const hasWeekly     = wPlan && ((wPlan.priorities?.length ?? 0) > 0 || (wPlan.outcomes?.length ?? 0) > 0);
  const hasDaily      = dayPlans.some((p) => p.date === today && (p.priorities?.length ?? 0) > 0);
  const notifCount    = overdueCount + dueTodayCount + (pendingHabits > 0 ? 1 : 0) + (!hasWeekly ? 1 : 0) + (!hasDaily ? 1 : 0);

  const initials = (userProfile.name || "?")
    .split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);

  function toggle(p: Panel) { setPanel((cur) => (cur === p ? null : p)); }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Search is a fixed full-screen modal */}
      {panel === "search" && (
        <SearchPanel
          onClose={() => setPanel(null)}
          goals={goals}
          tasks={tasks}
          habits={habits}
          bucketEntries={bucketEntries}
        />
      )}

      <header style={{
        height: "56px", backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E8DDD0",
        display: "flex", alignItems: "center",
        paddingLeft: "24px", paddingRight: "24px",
        flexShrink: 0, zIndex: 30, position: "sticky", top: 0,
      }}>
        {/* Logo */}
        <Link href="/legacy" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", marginRight: "32px", flexShrink: 0 }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Crown size={13} color="#fff" />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", letterSpacing: "-0.01em" }}>
            Life By Design
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}>
          {NAV.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{
                padding: "5px 13px", borderRadius: "20px",
                fontSize: "13px", fontWeight: active ? 600 : 400,
                color: active ? "#EA580C" : "#78716C",
                backgroundColor: active ? "#FFF7ED" : "transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
                border: active ? "1px solid #FED7AA" : "1px solid transparent",
              }}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side — relative container for dropdown positioning */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "32px", flexShrink: 0, position: "relative" }}>

          {/* Search */}
          <button
            onClick={() => toggle("search")}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "20px",
              border: `1px solid ${panel === "search" ? "#FED7AA" : "#E8DDD0"}`,
              backgroundColor: panel === "search" ? "#FFF7ED" : "#FAF5EE",
              fontSize: "12px", color: panel === "search" ? "#EA580C" : "#A8A29E",
              cursor: "pointer",
            }}
          >
            <Search size={12} />
            <span>Search</span>
          </button>

          {/* Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => toggle("notifications")}
              style={{
                width: "34px", height: "34px", borderRadius: "50%",
                border: `1px solid ${panel === "notifications" ? "#FED7AA" : "#E8DDD0"}`,
                backgroundColor: panel === "notifications" ? "#FFF7ED" : "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative",
              }}
            >
              <Bell size={14} color={panel === "notifications" ? "#EA580C" : "#78716C"} />
              {notifCount > 0 && (
                <span style={{
                  position: "absolute", top: "4px", right: "4px",
                  width: notifCount > 9 ? "14px" : "8px", height: "8px",
                  borderRadius: "4px", backgroundColor: "#F97316",
                  border: "1.5px solid #FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "7px", fontWeight: 700, color: "#FFFFFF",
                }}>
                  {notifCount > 9 ? "9+" : ""}
                </span>
              )}
            </button>

            {panel === "notifications" && (
              <NotificationPanel
                onClose={() => setPanel(null)}
                tasks={tasks}
                habits={habits}
                weekPlans={weekPlans}
                dayPlans={dayPlans}
              />
            )}
          </div>

          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => toggle("profile")}
              style={{
                width: "34px", height: "34px", borderRadius: "50%",
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 700, color: "#FFFFFF",
                cursor: "pointer", border: panel === "profile" ? "2px solid #EA580C" : "2px solid transparent",
                boxSizing: "border-box", flexShrink: 0,
              }}
            >
              {initials}
            </button>

            {panel === "profile" && (
              <ProfilePanel
                onClose={() => setPanel(null)}
                profile={userProfile}
                onSave={updateUserProfile}
              />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
