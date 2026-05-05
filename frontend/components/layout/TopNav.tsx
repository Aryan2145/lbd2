"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Menu, X as XIcon } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
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
  { href: "/values",      label: "Values"        },
  { href: "/goals",       label: "Goals"         },
  { href: "/habits",      label: "Habits"        },
  { href: "/bucket-list", label: "Bucket List"   },
  { href: "/tasks",       label: "Tasks"         },
  { href: "/weekly",      label: "Weekly Plan"   },
  { href: "/daily",       label: "Daily"         },
];

function getWeekStart(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}

export default function TopNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { logout } = useAuth();
  const [panel, setPanel]           = useState<Panel>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleChangePassword(currentPw: string, newPw: string): Promise<string | null> {
    try {
      await api.patch("/users/me/password", { currentPassword: currentPw, newPassword: newPw });
      return null;
    } catch (err: unknown) {
      return err instanceof Error ? err.message : "Password change failed";
    }
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

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

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: 0,
              backgroundColor: "rgba(28,25,23,0.35)",
              backdropFilter: "blur(2px)",
              zIndex: 40,
            }}
          />
          <div
            className="animate-fade-in"
            style={{
              position: "fixed",
              top: 0, left: 0, bottom: 0,
              width: "272px",
              backgroundColor: "#FFFFFF",
              borderRight: "1px solid #E8DDD0",
              boxShadow: "4px 0 32px rgba(28,25,23,0.12)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Drawer header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid #EDE5D8",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <Link
                href="/legacy"
                onClick={() => setMobileOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt=""
                  style={{ width: 28, height: 28, display: "block" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", letterSpacing: "-0.01em" }}>
                  Life By Design
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  width: "30px", height: "30px", borderRadius: "8px",
                  border: "none", backgroundColor: "#F5F0EB",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <XIcon size={14} color="#78716C" />
              </button>
            </div>

            {/* Drawer nav links */}
            <nav style={{ padding: "10px 8px", flex: 1 }}>
              {NAV.map(({ href, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: "block",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: active ? 600 : 400,
                      color: active ? "#EA580C" : "#1C1917",
                      backgroundColor: active ? "#FFF7ED" : "transparent",
                      textDecoration: "none",
                      marginBottom: "2px",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer search */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #EDE5D8", flexShrink: 0 }}>
              <button
                onClick={() => { setMobileOpen(false); toggle("search"); }}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "9px 12px", borderRadius: "10px",
                  border: "1px solid #E8DDD0", backgroundColor: "#FAF5EE",
                  fontSize: "13px", color: "#78716C",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <Search size={13} color="#A8A29E" />
                Search anything…
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <header style={{
        height: "56px",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E8DDD0",
        display: "flex",
        alignItems: "center",
        paddingLeft: "16px",
        paddingRight: "16px",
        flexShrink: 0,
        zIndex: 30,
        position: "sticky",
        top: 0,
        gap: "8px",
      }}>

        {/* Hamburger — mobile only */}
        <button
          className="flex md:hidden items-center justify-center flex-shrink-0"
          onClick={() => setMobileOpen(true)}
          style={{
            width: "34px", height: "34px", borderRadius: "8px",
            border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          <Menu size={16} color="#78716C" />
        </button>

        {/* Logo */}
        <Link
          href="/legacy"
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            textDecoration: "none", flexShrink: 0,
            marginRight: "8px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            style={{ width: 28, height: 28, display: "block" }}
          />
          <span
            className="hidden sm:inline"
            style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", letterSpacing: "-0.01em" }}
          >
            Life By Design
          </span>
        </Link>

        {/* Nav links — desktop only */}
        <nav
          className="hidden md:flex"
          style={{ alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}
        >
          {NAV.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{
                padding: "5px 11px", borderRadius: "20px",
                fontSize: "12px", fontWeight: active ? 600 : 400,
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

        {/* Spacer on mobile so right icons push to far right */}
        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, position: "relative" }}>

          {/* Search — desktop only */}
          <button
            className="hidden md:flex"
            onClick={() => toggle("search")}
            style={{
              alignItems: "center", gap: "6px",
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
                cursor: "pointer",
                border: panel === "profile" ? "2px solid #EA580C" : "2px solid transparent",
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
                onChangePassword={handleChangePassword}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
