"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield, LayoutDashboard, Ticket, Database,
  ArrowLeft, ChevronRight, Send, X, RefreshCw,
  Users, Activity, CheckSquare, Target, Flame,
  Calendar, BookOpen, Star, ShoppingBag,
  Eye, EyeOff, LogOut, Phone, UserCircle,
  Briefcase, Venus, Clock, AlertCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/lib/ticketTypes";
import { STATUS_META, PRIORITY_META, CATEGORY_META } from "@/lib/ticketTypes";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(ts: number) { return `${fmtDate(ts)}, ${fmtTime(ts)}`; }

type AdminTab = "overview" | "users" | "tickets" | "data";
type DataStore = "goals" | "habits" | "tasks" | "events" | "bucketEntries" | "tickets" | "weeklyReviews" | "weekPlans" | "eveningReflections";

// ── Admin API secret (same security level as hardcoded credentials) ───────────
const ADMIN_SECRET = "LBD-Admin-Secret-2025";
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api";

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-admin-secret": ADMIN_SECRET },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ── User shape returned by /admin/users ───────────────────────────────────────
interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  gender: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    goals: number; habits: number; tasks: number;
    weekEvents: number; weekPlans: number;
    eveningReflections: number; weeklyReviews: number;
    bucketEntries: number; tickets: number;
  };
  hasVisionCanvas: boolean;
  hasLegacyCanvas: boolean;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_PALETTE = ["#6366F1","#F97316","#3B82F6","#10B981","#EC4899","#8B5CF6","#F59E0B","#EF4444","#06B6D4"];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}
function fmtIso(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab }: { tab: AdminTab; setTab: (t: AdminTab) => void }) {
  const navItems: { id: AdminTab; icon: React.ReactNode; label: string }[] = [
    { id: "overview", icon: <LayoutDashboard size={15} />, label: "Overview"        },
    { id: "users",    icon: <Users           size={15} />, label: "Users"           },
    { id: "tickets",  icon: <Ticket          size={15} />, label: "Support Tickets" },
    { id: "data",     icon: <Database        size={15} />, label: "Data Browser"    },
  ];

  return (
    <div style={{
      width: "230px", backgroundColor: "#0F172A",
      display: "flex", flexDirection: "column", flexShrink: 0,
      height: "100%",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "10px",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={15} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>LBD Admin</p>
            <p style={{ fontSize: "10px", color: "#64748B", margin: 0 }}>Control Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, color: "#475569", letterSpacing: "0.1em",
          textTransform: "uppercase", padding: "0 8px", marginBottom: "6px" }}>
          Navigation
        </p>
        {navItems.map((item) => {
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              display: "flex", alignItems: "center", gap: "10px",
              width: "100%", padding: "9px 10px", borderRadius: "8px",
              border: "none", cursor: "pointer", textAlign: "left",
              backgroundColor: active ? "rgba(249,115,22,0.15)" : "transparent",
              color: active ? "#FB923C" : "#94A3B8",
              fontSize: "13px", fontWeight: active ? 600 : 400,
              marginBottom: "2px",
              transition: "all 0.15s",
            }}>
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Back to app */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <Link href="/dashboard" style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 10px", borderRadius: "8px", textDecoration: "none",
          color: "#64748B", fontSize: "12px",
        }}>
          <ArrowLeft size={13} />
          Back to App
        </Link>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    adminFetch<AdminUser[]>("/admin/users")
      .then(setUsers)
      .catch(e => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate counts across all users
  const sum = (key: keyof AdminUser["counts"]) => users.reduce((a, u) => a + u.counts[key], 0);
  const totalTickets   = sum("tickets");
  const totalGoals     = sum("goals");
  const totalHabits    = sum("habits");
  const totalTasks     = sum("tasks");
  const totalEvents    = sum("weekEvents");
  const totalPlans     = sum("weekPlans");
  const totalReflect   = sum("eveningReflections");
  const totalReviews   = sum("weeklyReviews");
  const totalBucket    = sum("bucketEntries");
  const withVision     = users.filter(u => u.hasVisionCanvas).length;
  const withLegacy     = users.filter(u => u.hasLegacyCanvas).length;

  const statCards: { icon: React.ReactNode; label: string; value: number; color: string }[] = [
    { icon: <Users        size={16} />, label: "Total Users",          value: users.length,   color: "#0F172A" },
    { icon: <Target       size={16} />, label: "Goals",                value: totalGoals,     color: "#6366F1" },
    { icon: <Flame        size={16} />, label: "Habits",               value: totalHabits,    color: "#F97316" },
    { icon: <CheckSquare  size={16} />, label: "Tasks",                value: totalTasks,     color: "#3B82F6" },
    { icon: <Calendar     size={16} />, label: "Week Events",          value: totalEvents,    color: "#EC4899" },
    { icon: <ShoppingBag  size={16} />, label: "Bucket Items",         value: totalBucket,    color: "#8B5CF6" },
    { icon: <BookOpen     size={16} />, label: "Week Plans",           value: totalPlans,     color: "#06B6D4" },
    { icon: <Star         size={16} />, label: "Weekly Reviews",       value: totalReviews,   color: "#F59E0B" },
    { icon: <Activity     size={16} />, label: "Evening Reflections",  value: totalReflect,   color: "#EF4444" },
    { icon: <Ticket       size={16} />, label: "Support Tickets",      value: totalTickets,   color: "#64748B" },
    { icon: <UserCircle   size={16} />, label: "Vision Canvas Set Up", value: withVision,     color: "#8B5CF6" },
    { icon: <UserCircle   size={16} />, label: "Legacy Canvas Set Up", value: withLegacy,     color: "#EC4899" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
      <div className="animate-spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #E2E8F0", borderTopColor: "#F97316" }} />
      <span style={{ fontSize: 13, color: "#94A3B8" }}>Loading platform data…</span>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 8 }}>
      <AlertCircle size={20} color="#EF4444" />
      <span style={{ fontSize: 13, color: "#94A3B8" }}>{error}</span>
    </div>
  );

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>Platform Overview</h1>
        <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
          Aggregate totals across all {users.length} registered user{users.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {statCards.map((card, i) => (
          <div key={i} style={{
            backgroundColor: "#FFFFFF", borderRadius: "12px",
            border: "1px solid #E2E8F0", padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px",
                backgroundColor: `${card.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: card.color,
              }}>
                {card.icon}
              </div>
            </div>
            <p style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: "0 0 2px" }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: "#64748B", margin: 0 }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Per-user activity breakdown */}
      {users.length > 0 && (
        <div style={{ marginTop: "28px", backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "20px 24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: "0 0 16px" }}>User Activity Breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.map(u => {
              const total = Object.values(u.counts).reduce((a, b) => a + b, 0);
              const allTotal = users.reduce((a, uu) => a + Object.values(uu.counts).reduce((x, y) => x + y, 0), 0);
              const pct = allTotal > 0 ? Math.round((total / allTotal) * 100) : 0;
              const color = avatarColor(u.id);
              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: color + "20", border: `1.5px solid ${color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color,
                  }}>
                    {initials(u.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                        {u.name}
                      </span>
                      <span style={{ fontSize: 11, color: "#64748B", flexShrink: 0 }}>{total} items · {pct}%</span>
                    </div>
                    <div style={{ height: 5, backgroundColor: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 999,
                        backgroundColor: color,
                        width: `${pct}%`, transition: "width 0.4s ease",
                        minWidth: total > 0 ? 4 : 0,
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tickets Tab ───────────────────────────────────────────────────────────────
function TicketsTab() {
  const { tickets, updateTicket, deleteTicket } = useAppStore();
  const [statusFilter,   setStatusFilter]   = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all");
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [replyBody,      setReplyBody]      = useState("");

  const filtered = tickets
    .filter((t) => statusFilter   === "all" || t.status   === statusFilter)
    .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const active = activeId ? tickets.find((t) => t.id === activeId) ?? null : null;

  function sendAdminReply() {
    if (!active || !replyBody.trim()) return;
    const now = Date.now();
    updateTicket({
      ...active,
      messages:  [...active.messages, { id: crypto.randomUUID(), authorType: "admin", body: replyBody.trim(), createdAt: now }],
      updatedAt: now,
    });
    setReplyBody("");
  }

  function changeStatus(status: TicketStatus) {
    if (!active) return;
    const now = Date.now();
    updateTicket({
      ...active, status, updatedAt: now,
      resolvedAt: (status === "resolved" || status === "closed") ? now : active.resolvedAt,
    });
  }

  function changePriority(priority: TicketPriority) {
    if (!active) return;
    updateTicket({ ...active, priority, updatedAt: Date.now() });
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: list */}
      <div style={{
        width: active ? "360px" : "100%", flexShrink: 0,
        borderRight: active ? "1px solid #E2E8F0" : undefined,
        display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "width 0.2s",
      }}>
        {/* Filters */}
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
              All Tickets <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: "13px" }}>({tickets.length})</span>
            </h2>
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {(["all", "open", "in-progress", "resolved", "closed"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: "3px 10px", borderRadius: "20px", border: "1px solid",
                borderColor: statusFilter === s ? "#F97316" : "#E2E8F0",
                backgroundColor: statusFilter === s ? "#FFF7ED" : "transparent",
                fontSize: "11px", fontWeight: 600, cursor: "pointer",
                color: statusFilter === s ? "#EA580C" : "#64748B",
              }}>
                {s === "all" ? "All" : STATUS_META[s].label}
              </button>
            ))}
            {(["all", "low", "medium", "high", "urgent"] as const).map((p) => (
              <button key={p} onClick={() => setPriorityFilter(p)} style={{
                padding: "3px 10px", borderRadius: "20px", border: "1px solid",
                borderColor: priorityFilter === p ? (p === "all" ? "#0F172A" : PRIORITY_META[p].color) : "#E2E8F0",
                backgroundColor: priorityFilter === p ? (p === "all" ? "#0F172A" : `${PRIORITY_META[p].color}15`) : "transparent",
                fontSize: "11px", fontWeight: 600, cursor: "pointer",
                color: priorityFilter === p ? (p === "all" ? "#F1F5F9" : PRIORITY_META[p].color) : "#64748B",
              }}>
                {p === "all" ? "All Priority" : PRIORITY_META[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#94A3B8" }}>No tickets match your filters.</p>
            </div>
          ) : (
            filtered.map((t) => {
              const pm = PRIORITY_META[t.priority];
              const cm = CATEGORY_META[t.category];
              const sm = STATUS_META[t.status];
              const isActive = activeId === t.id;
              return (
                <div key={t.id} onClick={() => { setActiveId(t.id); setReplyBody(""); }} style={{
                  padding: "14px 20px", cursor: "pointer",
                  borderBottom: "1px solid #F1F5F9",
                  backgroundColor: isActive ? "#FFF7ED" : "transparent",
                  borderLeft: isActive ? "3px solid #F97316" : "3px solid transparent",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: pm.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#F97316" }}>{t.id}</span>
                      <span style={{ fontSize: "10px", color: "#94A3B8" }}>{cm.emoji}</span>
                    </div>
                    <span style={{
                      fontSize: "10px", fontWeight: 600, color: sm.color,
                      backgroundColor: sm.bg, padding: "1px 7px", borderRadius: "20px",
                    }}>
                      {sm.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", margin: "0 0 4px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.title}
                  </p>
                  <p style={{ fontSize: "10px", color: "#94A3B8", margin: 0 }}>
                    {t.messages.length} msg · {fmtDate(t.updatedAt)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: detail */}
      {active && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Detail header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9", flexShrink: 0, backgroundColor: "#FFFFFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#F97316" }}>{active.id}</span>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>{CATEGORY_META[active.category].emoji} {CATEGORY_META[active.category].label}</span>
                  <span style={{ fontSize: "10px", color: "#94A3B8" }}>Created {fmtDateTime(active.createdAt)}</span>
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: 0, lineHeight: 1.3 }}>
                  {active.title}
                </h3>
              </div>
              <button onClick={() => setActiveId(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={16} color="#94A3B8" />
              </button>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status:</span>
                <select value={active.status} onChange={(e) => changeStatus(e.target.value as TicketStatus)} style={{
                  padding: "3px 8px", borderRadius: "6px", border: "1px solid #E2E8F0",
                  fontSize: "11px", fontWeight: 600, color: STATUS_META[active.status].color,
                  backgroundColor: STATUS_META[active.status].bg, cursor: "pointer", outline: "none",
                }}>
                  {(["open", "in-progress", "resolved", "closed"] as const).map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Priority:</span>
                <select value={active.priority} onChange={(e) => changePriority(e.target.value as TicketPriority)} style={{
                  padding: "3px 8px", borderRadius: "6px", border: "1px solid #E2E8F0",
                  fontSize: "11px", fontWeight: 600, color: PRIORITY_META[active.priority].color,
                  backgroundColor: `${PRIORITY_META[active.priority].color}15`, cursor: "pointer", outline: "none",
                }}>
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => deleteTicket(active.id)} style={{
                marginLeft: "auto", padding: "3px 10px", borderRadius: "6px",
                border: "1px solid #FEE2E2", backgroundColor: "#FEF2F2",
                fontSize: "11px", fontWeight: 600, color: "#EF4444", cursor: "pointer",
              }}>
                Delete
              </button>
            </div>
          </div>

          {/* Thread */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {active.messages.map((msg) => {
              const isAdmin = msg.authorType === "admin";
              return (
                <div key={msg.id} style={{
                  display: "flex", flexDirection: "column",
                  alignItems: isAdmin ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "78%", padding: "10px 14px",
                    borderRadius: isAdmin ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    backgroundColor: isAdmin ? "#0F172A" : "#F8FAFC",
                    border: isAdmin ? "none" : "1px solid #E2E8F0",
                  }}>
                    <p style={{ fontSize: "12px", color: isAdmin ? "#E2E8F0" : "#1E293B", margin: 0, lineHeight: 1.6 }}>
                      {msg.body}
                    </p>
                  </div>
                  <span style={{ fontSize: "10px", color: "#94A3B8", marginTop: "3px" }}>
                    {isAdmin ? "Admin" : "User"} · {fmtDateTime(msg.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reply */}
          {active.status !== "closed" && (
            <div style={{ padding: "12px 24px 16px", borderTop: "1px solid #F1F5F9", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3} placeholder="Write an admin reply…"
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: "10px",
                    border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC",
                    fontSize: "12px", color: "#0F172A", outline: "none",
                    resize: "none", fontFamily: "inherit", lineHeight: 1.5,
                    boxSizing: "border-box",
                  }}
                />
                <button onClick={sendAdminReply} disabled={!replyBody.trim()} style={{
                  width: "38px", height: "38px", borderRadius: "10px", border: "none", flexShrink: 0,
                  background: replyBody.trim() ? "#0F172A" : "#E2E8F0",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <Send size={14} color="#F1F5F9" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [search,   setSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setUsers(await adminFetch<AdminUser[]>("/admin/users")); }
    catch (e: any) { setError(e.message ?? "Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function totalItems(u: AdminUser) {
    return Object.values(u.counts).reduce((a, b) => a + b, 0);
  }

  // ── stat modules shown in detail panel ──
  const MODULE_STATS = (u: AdminUser) => [
    { label: "Goals",        value: u.counts.goals,              color: "#6366F1", icon: <Target      size={14}/> },
    { label: "Habits",       value: u.counts.habits,             color: "#F97316", icon: <Flame       size={14}/> },
    { label: "Tasks",        value: u.counts.tasks,              color: "#3B82F6", icon: <CheckSquare size={14}/> },
    { label: "Week Events",  value: u.counts.weekEvents,         color: "#EC4899", icon: <Calendar    size={14}/> },
    { label: "Week Plans",   value: u.counts.weekPlans,          color: "#06B6D4", icon: <BookOpen    size={14}/> },
    { label: "Reflections",  value: u.counts.eveningReflections, color: "#EF4444", icon: <Activity    size={14}/> },
    { label: "Reviews",      value: u.counts.weeklyReviews,      color: "#F59E0B", icon: <Star        size={14}/> },
    { label: "Bucket Items", value: u.counts.bucketEntries,      color: "#8B5CF6", icon: <ShoppingBag size={14}/> },
    { label: "Tickets",      value: u.counts.tickets,            color: "#64748B", icon: <Ticket      size={14}/> },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Left: user list ── */}
      <div style={{
        width: selected ? "320px" : "100%", flexShrink: 0,
        borderRight: selected ? "1px solid #E2E8F0" : undefined,
        display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "width 0.2s",
      }}>
        {/* Header + search */}
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
              All Users
              <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: "13px", marginLeft: 6 }}>
                ({users.length})
              </span>
            </h2>
            <button onClick={load} title="Refresh" style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E8F0",
              backgroundColor: "transparent", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}>
              <RefreshCw size={12} color="#64748B" />
            </button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC",
              fontSize: 12, color: "#0F172A", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: 10 }}>
              <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #E2E8F0", borderTopColor: "#F97316" }} />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Loading users…</span>
            </div>
          )}
          {error && (
            <div style={{ margin: "20px", padding: "12px 14px", borderRadius: 10, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#EF4444" />
              <span style={{ fontSize: 12, color: "#DC2626" }}>{error}</span>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "48px 20px" }}>
              {search ? "No users match your search." : "No users found."}
            </p>
          )}
          {!loading && !error && filtered.map(u => {
            const color   = avatarColor(u.id);
            const isActive = selected?.id === u.id;
            const total    = totalItems(u);
            return (
              <div key={u.id} onClick={() => setSelected(isActive ? null : u)} style={{
                padding: "13px 20px", cursor: "pointer",
                borderBottom: "1px solid #F1F5F9",
                backgroundColor: isActive ? "#FFF7ED" : "transparent",
                borderLeft: isActive ? "3px solid #F97316" : "3px solid transparent",
                transition: "background 0.12s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: color + "22",
                    border: `2px solid ${color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color,
                  }}>
                    {initials(u.name)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", margin: "0 0 2px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.name}
                    </p>
                    <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 6px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.email}
                    </p>
                    {/* Quick stat pills */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {u.counts.goals > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#6366F1", backgroundColor: "#EEF2FF", padding: "1px 6px", borderRadius: 20 }}>
                          {u.counts.goals} goals
                        </span>
                      )}
                      {u.counts.habits > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#EA580C", backgroundColor: "#FFF7ED", padding: "1px 6px", borderRadius: 20 }}>
                          {u.counts.habits} habits
                        </span>
                      )}
                      {u.counts.tasks > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "1px 6px", borderRadius: 20 }}>
                          {u.counts.tasks} tasks
                        </span>
                      )}
                      {u.counts.eveningReflections > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#DC2626", backgroundColor: "#FEF2F2", padding: "1px 6px", borderRadius: 20 }}>
                          {u.counts.eveningReflections} reflections
                        </span>
                      )}
                      {total === 0 && (
                        <span style={{ fontSize: 10, color: "#CBD5E1", fontStyle: "italic" }}>no data yet</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8", flexShrink: 0, textAlign: "right" }}>
                    <div>{fmtIso(u.createdAt)}</div>
                    <div style={{ marginTop: 2, fontWeight: 600, color: total > 0 ? "#0F172A" : "#CBD5E1" }}>
                      {total} items
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      {selected && (() => {
        const u     = selected;
        const color = avatarColor(u.id);
        const total = totalItems(u);
        const stats = MODULE_STATS(u);
        return (
          <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F8FAFC" }}>
            {/* Close bar */}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px 0" }}>
              <button onClick={() => setSelected(null)} style={{
                width: 28, height: 28, borderRadius: 8, border: "1px solid #E2E8F0",
                backgroundColor: "#FFFFFF", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer",
              }}>
                <X size={13} color="#64748B" />
              </button>
            </div>

            <div style={{ padding: "8px 24px 32px" }}>

              {/* ── User header card ── */}
              <div style={{
                backgroundColor: "#FFFFFF", borderRadius: 16,
                border: "1px solid #E2E8F0", padding: "24px",
                marginBottom: 16,
                boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  {/* Large avatar */}
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: color + "18",
                    border: `2.5px solid ${color}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 800, color,
                  }}>
                    {initials(u.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 3px" }}>
                      {u.name}
                    </h2>
                    <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 12px" }}>{u.email}</p>

                    {/* Meta chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {u.role && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
                          color: "#374151", backgroundColor: "#F1F5F9", padding: "3px 9px", borderRadius: 20 }}>
                          <Briefcase size={10} /> {u.role}
                        </span>
                      )}
                      {u.gender && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
                          color: "#374151", backgroundColor: "#F1F5F9", padding: "3px 9px", borderRadius: 20 }}>
                          <Venus size={10} /> {u.gender}
                        </span>
                      )}
                      {u.phone && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
                          color: "#374151", backgroundColor: "#F1F5F9", padding: "3px 9px", borderRadius: 20 }}>
                          <Phone size={10} /> {u.phone}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
                        color: "#374151", backgroundColor: "#F1F5F9", padding: "3px 9px", borderRadius: 20 }}>
                        <Clock size={10} /> Joined {fmtIso(u.createdAt)}
                      </span>
                    </div>
                  </div>
                  {/* Total badge */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{
                      fontSize: 28, fontWeight: 800,
                      color: total > 0 ? color : "#CBD5E1",
                    }}>{total}</div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      total items
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Module counts grid ── */}
              <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.1em",
                textTransform: "uppercase", margin: "0 0 8px" }}>
                Module Activity
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                {stats.map(s => (
                  <div key={s.label} style={{
                    backgroundColor: "#FFFFFF", borderRadius: 12,
                    border: "1px solid #E2E8F0", padding: "14px 16px",
                    boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8,
                        backgroundColor: s.color + "15",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: s.color,
                      }}>
                        {s.icon}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800,
                      color: s.value > 0 ? "#0F172A" : "#CBD5E1" }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Canvas setup status ── */}
              <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.1em",
                textTransform: "uppercase", margin: "0 0 8px" }}>
                One-Time Setup
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Vision Canvas", done: u.hasVisionCanvas, color: "#8B5CF6" },
                  { label: "Legacy Canvas", done: u.hasLegacyCanvas, color: "#EC4899" },
                ].map(item => (
                  <div key={item.label} style={{
                    backgroundColor: "#FFFFFF", borderRadius: 12,
                    border: `1px solid ${item.done ? item.color + "30" : "#E2E8F0"}`,
                    padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
                    boxShadow: item.done ? `0 0 0 0 transparent` : "none",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      backgroundColor: item.done ? item.color + "15" : "#F1F5F9",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <UserCircle size={16} color={item.done ? item.color : "#CBD5E1"} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600,
                        color: item.done ? "#0F172A" : "#94A3B8" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 10, marginTop: 1,
                        color: item.done ? item.color : "#CBD5E1",
                        fontWeight: 600 }}>
                        {item.done ? "Set up" : "Not filled"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Data Tab ──────────────────────────────────────────────────────────────────
function DataTab() {
  const store = useAppStore();
  const [selectedStore, setSelectedStore] = useState<DataStore>("goals");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const storeMap: Record<DataStore, { label: string; data: unknown[] }> = {
    goals:              { label: "Goals",              data: store.goals              },
    habits:             { label: "Habits",             data: store.habits             },
    tasks:              { label: "Tasks",              data: store.tasks              },
    events:             { label: "Week Events",        data: store.weekEvents         },
    bucketEntries:      { label: "Bucket Entries",     data: store.bucketEntries      },
    tickets:            { label: "Support Tickets",    data: store.tickets            },
    weeklyReviews:      { label: "Weekly Reviews",     data: store.weeklyReviews      },
    weekPlans:          { label: "Week Plans",           data: store.weekPlans          },
    eveningReflections: { label: "Evening Reflections",data: store.eveningReflections },
  };

  const current = storeMap[selectedStore];

  function toggleRow(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Store selector */}
      <div style={{ width: "180px", borderRight: "1px solid #E2E8F0", padding: "16px 0", flexShrink: 0, overflowY: "auto" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.1em",
          textTransform: "uppercase", padding: "0 16px 8px" }}>
          Stores
        </p>
        {(Object.keys(storeMap) as DataStore[]).map((key) => {
          const s = storeMap[key];
          return (
            <button key={key} onClick={() => { setSelectedStore(key); setExpanded(new Set()); }} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "8px 16px", border: "none", cursor: "pointer", textAlign: "left",
              backgroundColor: selectedStore === key ? "#FFF7ED" : "transparent",
              borderLeft: selectedStore === key ? "2px solid #F97316" : "2px solid transparent",
            }}>
              <span style={{ fontSize: "12px", fontWeight: selectedStore === key ? 600 : 400,
                color: selectedStore === key ? "#EA580C" : "#374151" }}>
                {s.label}
              </span>
              <span style={{ fontSize: "10px", color: "#94A3B8",
                backgroundColor: "#F1F5F9", padding: "1px 5px", borderRadius: "10px" }}>
                {s.data.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Records */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            {current.label} <span style={{ fontWeight: 400, color: "#94A3B8" }}>({current.data.length} records)</span>
          </h2>
          <button onClick={() => setExpanded(new Set())} style={{
            display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
            borderRadius: "6px", border: "1px solid #E2E8F0", backgroundColor: "transparent",
            fontSize: "11px", color: "#64748B", cursor: "pointer",
          }}>
            <RefreshCw size={11} /> Collapse All
          </button>
        </div>

        {current.data.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#94A3B8", textAlign: "center", padding: "40px 0" }}>
            No records in this store.
          </p>
        ) : (
          current.data.map((record, i) => {
            const obj = record as Record<string, unknown>;
            const key = (obj.id ?? obj.date ?? obj.weekStart ?? i) as string;
            const preview = Object.entries(obj).slice(0, 3).map(([k, v]) => {
              const val = typeof v === "string" ? (v.length > 30 ? v.slice(0, 30) + "…" : v)
                : typeof v === "number" ? String(v)
                : Array.isArray(v) ? `[${v.length}]`
                : typeof v === "boolean" ? String(v)
                : "…";
              return `${k}: ${val}`;
            }).join(" · ");

            return (
              <div key={i} style={{
                marginBottom: "6px", borderRadius: "8px",
                border: "1px solid #E2E8F0", overflow: "hidden",
              }}>
                <button onClick={() => toggleRow(i)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", padding: "10px 14px", border: "none",
                  backgroundColor: expanded.has(i) ? "#F8FAFC" : "#FFFFFF",
                  cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#F97316", marginRight: "6px" }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontSize: "11px", color: "#374151" }}>{String(key)}</span>
                    {!expanded.has(i) && (
                      <span style={{ fontSize: "10px", color: "#94A3B8", marginLeft: "8px" }}>{preview}</span>
                    )}
                  </div>
                  <ChevronRight size={13} color="#94A3B8"
                    style={{ transform: expanded.has(i) ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
                </button>
                {expanded.has(i) && (
                  <pre style={{
                    margin: 0, padding: "12px 14px",
                    backgroundColor: "#F8FAFC", borderTop: "1px solid #F1F5F9",
                    fontSize: "11px", color: "#334155", overflowX: "auto",
                    lineHeight: 1.7, fontFamily: "monospace",
                  }}>
                    {JSON.stringify(record, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Admin credentials ─────────────────────────────────────────────────────────
const ADMIN_EMAIL    = "admin@lbd.in";
const ADMIN_PASSWORD = "LBD#Admin@2025";
const SESSION_KEY    = "lbd_admin_auth";

// ── Admin login screen ────────────────────────────────────────────────────────
function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, "1");
        onAuth();
      } else {
        setError("Invalid admin credentials.");
      }
      setLoading(false);
    }, 400);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    borderRadius: 12, border: "1.5px solid #D6C9BC",
    backgroundColor: "#FFFFFF", color: "#1C1917",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "relative", height: "100dvh",
      display: "flex", overflow: "hidden", backgroundColor: "#FAF5EE",
    }}>
      {/* Mobile bg */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/login-bg-mobile.png" alt="" aria-hidden className="lg:hidden"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
      <div aria-hidden className="lg:hidden" style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(160deg, rgba(249,115,22,0.10) 0%, rgba(234,88,12,0.10) 100%)",
        mixBlendMode: "multiply",
      }} />

      {/* Left — mountain */}
      <div className="hidden lg:block" style={{
        flex: 1, backgroundImage: "url(/login-bg.png)",
        backgroundSize: "cover", backgroundPosition: "center", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(28,25,23,0.35) 0%, rgba(28,25,23,0) 35%, rgba(28,25,23,0) 60%, rgba(28,25,23,0.45) 100%)",
        }} />
        <div style={{ position: "absolute", top: 28, left: 28, zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-orange.png" alt="Life By Design" style={{ width: 44, height: 44, borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }} />
          <span style={{
            fontFamily: `Calibri, sans-serif`, fontStyle: "italic",
            fontSize: 24, fontWeight: 700, color: "#FFFFFF",
            padding: "6px 14px", backgroundColor: "rgba(0,0,0,0.30)",
            backdropFilter: "blur(12px)", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
          }}>
            Life By <span style={{ color: "#fd9266" }}>Design</span>
          </span>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-col px-6 lg:px-16 lg:bg-white lbd-hide-scrollbar" style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 560, marginLeft: "auto",
        height: "100dvh", overflowY: "auto", paddingTop: "9vh", paddingBottom: 32,
      }}>
        <div style={{ width: "100%", maxWidth: 380, marginInline: "auto" }}>

          {/* Mobile logo */}
          <div className="flex lg:hidden" style={{ alignItems: "center", gap: 12, marginTop: "-5vh", marginBottom: "calc(5vh + 18px)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-orange.png" alt="Life By Design" style={{ width: 44, height: 44, borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }} />
            <span style={{
              fontStyle: "italic", fontSize: 24, fontWeight: 700, color: "#FFFFFF",
              padding: "6px 14px", backgroundColor: "rgba(0,0,0,0.30)",
              backdropFilter: "blur(12px)", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
            }}>
              Life By <span style={{ color: "#fd9266" }}>Design</span>
            </span>
          </div>

          {/* Desktop logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="hidden lg:block" style={{ width: 56, height: 56, marginBottom: 18 }} />

          {/* Card */}
          <div className="rounded-2xl bg-white/30 lg:bg-transparent lg:rounded-none lg:p-0" style={{
            padding: "20px 18px", border: "1px solid rgba(255,255,255,0.30)",
            boxShadow: "0 4px 16px rgba(28,25,23,0.08)", backdropFilter: "blur(2px)",
          }}>
            {/* Admin badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Shield size={13} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#EA580C", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Admin Panel
              </span>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1C1917", letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 6px" }}>
              Sign in to continue
            </h1>
            <p style={{ fontSize: 13, color: "#78716C", margin: "0 0 28px" }}>
              Restricted access. Authorised personnel only.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, color: "#57534E" }}>
                  Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="admin@lbd.in" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, color: "#57534E" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input type={showPwd ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 2,
                    display: "flex", alignItems: "center", color: "#78716C",
                  }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p style={{
                  fontSize: 13, color: "#DC2626", margin: 0,
                  padding: "9px 12px", backgroundColor: "#FEF2F2",
                  border: "1px solid #FCA5A5", borderRadius: 8, fontWeight: 600,
                }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} style={{
                marginTop: 4, padding: "13px 0", borderRadius: 12, border: "none",
                background: loading ? "#E8C8A8" : "linear-gradient(135deg, #F97316, #EA580C)",
                color: "#FFFFFF", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 14px rgba(234,88,12,0.32)",
              }}>
                {loading ? "Verifying…" : "Sign in to Admin"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab,       setTab]       = useState<AdminTab>("overview");
  const [authed,    setAuthed]    = useState(false);
  const [checked,   setChecked]   = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
    setChecked(true);
  }, []);

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }

  if (!checked) return null;
  if (!authed)  return <AdminLogin onAuth={() => setAuthed(true)} />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar tab={tab} setTab={setTab} />
      <div style={{ flex: 1, overflow: "hidden", backgroundColor: "#F8FAFC", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{
          height: "48px", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", paddingLeft: "24px", paddingRight: "24px",
          gap: "6px", flexShrink: 0,
        }}>
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>Admin</span>
          <ChevronRight size={12} color="#CBD5E1" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>
            {tab === "overview" ? "Overview" : tab === "users" ? "Users" : tab === "tickets" ? "Support Tickets" : "Data Browser"}
          </span>
          <button onClick={handleLogout} style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0",
            backgroundColor: "transparent", fontSize: "11px", color: "#64748B",
            cursor: "pointer", fontWeight: 600,
          }}>
            <LogOut size={11} /> Sign out
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          {tab === "overview" && <div style={{ height: "100%", overflowY: "auto" }}><OverviewTab /></div>}
          {tab === "users"    && <UsersTab />}
          {tab === "tickets"  && <TicketsTab />}
          {tab === "data"     && <DataTab />}
        </div>
      </div>
    </div>
  );
}
