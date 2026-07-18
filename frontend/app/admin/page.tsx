"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield, LayoutDashboard, Ticket,
  ArrowLeft, ChevronRight, Send, X, RefreshCw,
  Users, Activity, CheckSquare, Target, Flame,
  Calendar, BookOpen, Star, ShoppingBag,
  Eye, EyeOff, LogOut, Phone, UserCircle,
  Briefcase, Venus, Clock, AlertCircle, Download,
  KeyRound, UserPlus, Trash2, Mail, Check, Loader2,
  Trophy, Medal, Tag, Info, Minus, Plus, Pencil,
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

type AdminTab = "overview" | "users" | "leaderboard" | "tickets" | "admins";

// ── Admin API access (bearer token issued by POST /admin/login) ────────────────
const API_BASE  = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100") + "/api";
const TOKEN_KEY = "lbd_admin_token";

function getToken(): string | null {
  return typeof window === "undefined" ? null : sessionStorage.getItem(TOKEN_KEY);
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token   ? { Authorization: `Bearer ${token}` }      : {}),
      ...(init.headers ?? {}),
    },
  });

  // Session expired or revoked — drop the token and bounce back to the login screen.
  if (res.status === 401) {
    if (token) { sessionStorage.removeItem(TOKEN_KEY); window.location.reload(); }
    throw new Error("Your admin session has expired. Please sign in again.");
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
    } catch { /* non-JSON error body */ }
    throw new Error(msg);
  }

  // 204 / empty bodies (e.g. DELETE) return nothing to parse.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── User shape returned by /admin/users ───────────────────────────────────────
interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  gender: string | null;
  group: { id: string; name: string; color: string } | null;
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

// ── CSV export of user signup details ─────────────────────────────────────────
function csvCell(value: string | null | undefined): string {
  const s = value ?? "";
  // Quote if the value contains comma, quote, or newline; escape inner quotes.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtSignupDate(iso: string): string {
  // Readable date + time in IST, e.g. "09 May 2026, 10:02 PM"
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function exportUsersCsv(users: AdminUser[]) {
  const headers = ["Name", "Email", "Phone", "Gender", "Role", "Signed Up (IST)", "User ID"];
  const rows = users.map(u => [
    csvCell(u.name),
    csvCell(u.email),
    csvCell(u.phone),
    csvCell(u.gender),
    csvCell(u.role),
    csvCell(fmtSignupDate(u.createdAt)),
    csvCell(u.id),
  ].join(","));

  // Prepend BOM so Excel reads UTF-8 (names with accents/emoji) correctly.
  const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `lbd-users-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab }: { tab: AdminTab; setTab: (t: AdminTab) => void }) {
  const navItems: { id: AdminTab; icon: React.ReactNode; label: string }[] = [
    { id: "overview",    icon: <LayoutDashboard size={15} />, label: "Overview"        },
    { id: "users",       icon: <Users           size={15} />, label: "Users"           },
    { id: "leaderboard", icon: <Trophy          size={15} />, label: "Leaderboard"     },
    { id: "tickets",     icon: <Ticket          size={15} />, label: "Support Tickets" },
    { id: "admins",      icon: <KeyRound        size={15} />, label: "Admins"          },
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
interface GroupLite { id: string; name: string; color: string }

function UsersTab() {
  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [groups,   setGroups]   = useState<GroupLite[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [search,   setSearch]   = useState("");
  const [sel,      setSel]      = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [us, gs] = await Promise.all([
        adminFetch<AdminUser[]>("/admin/users"),
        adminFetch<GroupLite[]>("/admin/groups"),
      ]);
      setUsers(us); setGroups(gs);
    }
    catch (e: any) { setError(e.message ?? "Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep the open detail panel in sync after a reload (e.g. a group change).
  useEffect(() => {
    setSelected(prev => (prev ? users.find(u => u.id === prev.id) ?? null : null));
  }, [users]);

  function toggleSel(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  async function assignUsers(userIds: string[], groupId: string | null) {
    if (userIds.length === 0) return;
    setAssigning(true); setError(null);
    try {
      await adminFetch("/admin/groups/assign", { method: "PATCH", body: JSON.stringify({ userIds, groupId }) });
      setSel(new Set());
      await load();
    } catch (e: any) { setError(e.message ?? "Could not assign group"); }
    finally { setAssigning(false); }
  }

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => exportUsersCsv(filtered)}
                disabled={filtered.length === 0}
                title="Export signup details to CSV"
                style={{
                  display: "flex", alignItems: "center", gap: 6, height: 30,
                  padding: "0 12px", borderRadius: 8, border: "1px solid #E2E8F0",
                  backgroundColor: filtered.length === 0 ? "#F8FAFC" : "#FFF7ED",
                  color: filtered.length === 0 ? "#94A3B8" : "#EA580C",
                  fontSize: 12, fontWeight: 600,
                  cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                }}>
                <Download size={13} /> Export CSV
              </button>
              <button onClick={load} title="Refresh" style={{
                width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E8F0",
                backgroundColor: "transparent", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer",
              }}>
                <RefreshCw size={12} color="#64748B" />
              </button>
            </div>
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

          {/* Bulk group assignment */}
          {sel.size > 0 && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, backgroundColor: "#FFF7ED", border: "1px solid #FED7AA" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#9A3412" }}>{sel.size} selected</span>
              <select disabled={assigning} value=""
                onChange={e => { const v = e.target.value; if (!v) return; assignUsers([...sel], v === "__none__" ? null : v); }}
                style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 8, border: "1.5px solid #FED7AA", backgroundColor: "#FFFFFF", fontSize: 12, fontWeight: 600, color: "#0F172A", cursor: "pointer", outline: "none" }}>
                <option value="">Assign to group…</option>
                <option value="__none__">Ungrouped</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={() => setSel(new Set())} style={{ fontSize: 12, color: "#64748B", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear</button>
            </div>
          )}
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
                  {/* Bulk-select checkbox */}
                  <input type="checkbox" checked={sel.has(u.id)}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleSel(u.id)}
                    style={{ width: 15, height: 15, flexShrink: 0, cursor: "pointer", accentColor: "#EA580C" }} />
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
                      {u.group && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: u.group.color, backgroundColor: u.group.color + "18", padding: "1px 6px", borderRadius: 20 }}>
                          {u.group.name}
                        </span>
                      )}
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

                    {/* Group assignment */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Tag size={12} color="#7C3AED" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Group</span>
                      <select value={u.group?.id ?? ""} disabled={assigning}
                        onChange={e => assignUsers([u.id], e.target.value || null)}
                        style={{ padding: "5px 9px", borderRadius: 8, border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC", fontSize: 12, fontWeight: 600, color: "#0F172A", cursor: "pointer", outline: "none" }}>
                        <option value="">Ungrouped</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>

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

// ── Leaderboard Tab ───────────────────────────────────────────────────────────
interface LbSetupHead { points: number; max: number; done?: boolean; areas?: number; }
interface LbConsHead  { periods: number; points: number; }
interface LbUser {
  id: string; name: string; email: string;
  group: { id: string; name: string; color: string } | null;
  rank: number; total: number; setupTotal: number; consistencyTotal: number; isNewJoiner: boolean;
  setup: { legacy: LbSetupHead; vision: LbSetupHead; values: LbSetupHead; bucket: LbSetupHead; goals: LbSetupHead; habits: LbSetupHead };
  consistency: Record<string, LbConsHead>;
}
interface LbGroupCard {
  key: string; id?: string; name: string; color: string;
  count: number; avgScore: number; top3: { id: string; name: string; total: number }[]; system: boolean;
}
interface LbResponse { groups: LbGroupCard[]; selected: string; users: LbUser[]; }

const SETUP_HEADS = [
  { key: "legacy", label: "Legacy + Purpose" },
  { key: "vision", label: "Vision board" },
  { key: "values", label: "Values" },
  { key: "bucket", label: "Bucket list" },
  { key: "goals",  label: "Goals" },
  { key: "habits", label: "Habits" },
] as const;
const CONS_HEADS = [
  { key: "weekly_plan",   label: "Weekly plan",   unit: "wk", pts: 10 },
  { key: "weekly_review", label: "Weekly review", unit: "wk", pts: 10 },
  { key: "daily_review",  label: "Daily review",  unit: "d",  pts: 5 },
  { key: "daily_plan",    label: "Daily plan",    unit: "d",  pts: 5 },
  { key: "tasks",         label: "Tasks",         unit: "d",  pts: 3 },
  { key: "habits",        label: "Habits",        unit: "d",  pts: 3 },
] as const;
const GROUP_COLORS = ["#EA580C", "#7C3AED", "#2563EB", "#059669", "#DB2777", "#D97706", "#0891B2", "#DC2626"];
const LB_SELECT_KEY = "lbd_admin_lb_group";

// ── Create / edit group modal ───────────────────────────────────────────────────
function GroupModal({ edit, onClose, onSaved }: {
  edit: LbGroupCard | null; onClose: () => void; onSaved: (nextSelected?: string) => void;
}) {
  const [name, setName]   = useState(edit?.name ?? "");
  const [color, setColor] = useState(edit?.color ?? GROUP_COLORS[0]);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("Give the group a name."); return; }
    setBusy(true); setErr(null);
    try {
      if (edit?.id) {
        await adminFetch(`/admin/groups/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim(), color }) });
        onSaved();
      } else {
        const g = await adminFetch<{ id: string }>("/admin/groups", { method: "POST", body: JSON.stringify({ name: name.trim(), color }) });
        onSaved(g.id);
      }
    } catch (e: any) { setErr(e.message ?? "Could not save group"); setBusy(false); }
  }

  async function remove() {
    if (!edit?.id) return;
    if (!window.confirm(`Delete "${edit.name}"? Its members become Ungrouped.`)) return;
    setBusy(true); setErr(null);
    try { await adminFetch(`/admin/groups/${edit.id}`, { method: "DELETE" }); onSaved("overall"); }
    catch (e: any) { setErr(e.message ?? "Could not delete group"); setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 20px 50px rgba(15,23,42,0.3)", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: 0 }}>{edit ? "Edit group" : "New group"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={17} color="#94A3B8" /></button>
        </div>

        <label style={fieldLabel}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cohort A" autoFocus style={{ ...fieldStyle, marginBottom: 14 }} />

        <label style={fieldLabel}>Colour</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {GROUP_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 28, height: 28, borderRadius: "50%", backgroundColor: c, cursor: "pointer",
              border: color === c ? "3px solid #0F172A" : "3px solid transparent",
            }} />
          ))}
        </div>

        {err && <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 12px", fontWeight: 600 }}>{err}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} disabled={busy} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
            background: busy ? "#E8C8A8" : "linear-gradient(135deg, #F97316, #EA580C)",
            color: "#FFFFFF", fontSize: 13, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {edit ? "Save" : "Create"}
          </button>
          {edit && (
            <button onClick={remove} disabled={busy} title="Delete group" style={{
              width: 44, borderRadius: 10, border: "1px solid #FEE2E2", backgroundColor: "#FEF2F2",
              cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Trash2 size={15} color="#EF4444" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Group grid card ─────────────────────────────────────────────────────────────
function GroupGridCard({ g, active, onSelect, onEdit }: {
  g: LbGroupCard; active: boolean; onSelect: () => void; onEdit?: () => void;
}) {
  return (
    <div onClick={onSelect} style={{
      position: "relative", cursor: "pointer", flexShrink: 0, width: 190,
      backgroundColor: active ? "#FFF7ED" : "#FFFFFF",
      border: active ? "2px solid #F97316" : "1px solid #E2E8F0",
      borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: g.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
        {onEdit && (
          <button onClick={e => { e.stopPropagation(); onEdit(); }} title="Edit group" style={{
            marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 2, color: "#94A3B8",
          }}><Pencil size={12} /></button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{g.count}</span>
        <span style={{ fontSize: 11, color: "#64748B" }}>member{g.count !== 1 ? "s" : ""}</span>
        {g.count > 0 && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#64748B" }}>avg {g.avgScore}</span>}
      </div>
      {/* podium */}
      <div style={{ display: "flex", gap: -6, marginTop: 10, minHeight: 24, alignItems: "center" }}>
        {g.top3.length === 0 ? (
          <span style={{ fontSize: 11, color: "#CBD5E1", fontStyle: "italic" }}>no members</span>
        ) : g.top3.map((t, i) => (
          <div key={t.id} title={`${t.name} · ${t.total}`} style={{
            width: 24, height: 24, borderRadius: "50%", marginLeft: i === 0 ? 0 : -6,
            backgroundColor: avatarColor(t.id) + "22", border: `2px solid #FFFFFF`,
            boxShadow: `0 0 0 1.5px ${avatarColor(t.id)}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: avatarColor(t.id), zIndex: 3 - i,
          }}>{initials(t.name)}</div>
        ))}
      </div>
    </div>
  );
}

// ── Leaderboard row ─────────────────────────────────────────────────────────────
function LbRow({ u, active, onClick, showGroup }: {
  u: LbUser; active: boolean; onClick: () => void; showGroup: boolean;
}) {
  const color = avatarColor(u.id);
  const medal = u.rank === 1 ? "#EAB308" : u.rank === 2 ? "#94A3B8" : u.rank === 3 ? "#B45309" : null;
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", cursor: "pointer",
      borderBottom: "1px solid #F1F5F9",
      backgroundColor: active ? "#FFF7ED" : "transparent",
      borderLeft: active ? "3px solid #F97316" : "3px solid transparent",
    }}>
      <div style={{ width: 24, flexShrink: 0, textAlign: "center" }}>
        {medal ? <Medal size={17} color={medal} /> : <span style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8" }}>{u.rank}</span>}
      </div>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        backgroundColor: color + "22", border: `2px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color,
      }}>{initials(u.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
          {u.isNewJoiner && <span style={{ fontSize: 9, fontWeight: 700, color: "#0891B2", backgroundColor: "#ECFEFF", padding: "1px 6px", borderRadius: 20, flexShrink: 0 }}>NEW</span>}
          {showGroup && u.group && (
            <span style={{ fontSize: 10, fontWeight: 600, color: u.group.color, backgroundColor: u.group.color + "18", padding: "1px 7px", borderRadius: 20, flexShrink: 0 }}>{u.group.name}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>{u.setupTotal} setup · {u.consistencyTotal} rhythm</span>
      </div>
      <div style={{ minWidth: 54, textAlign: "right", flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>{u.total}</span>
        <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}> pts</span>
      </div>
    </div>
  );
}

function LeaderboardTab() {
  const [data,    setData]    = useState<LbResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [group,   setGroup]   = useState<string>(() => {
    if (typeof window === "undefined") return "overall";
    return sessionStorage.getItem(LB_SELECT_KEY) || "overall";
  });
  const [selected, setSelected] = useState<LbUser | null>(null);
  const [modal, setModal] = useState<{ edit: LbGroupCard | null } | null>(null);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async (g: string) => {
    setLoading(true); setError(null);
    try { setData(await adminFetch<LbResponse>(`/admin/leaderboard?group=${encodeURIComponent(g)}`)); }
    catch (e: any) { setError(e.message ?? "Failed to load leaderboard"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(group); sessionStorage.setItem(LB_SELECT_KEY, group); }, [load, group]);

  // Keep an open drill-down in sync after a reload.
  useEffect(() => {
    if (!selected || !data) return;
    setSelected(data.users.find(u => u.id === selected.id) ?? null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const realGroups = (data?.groups ?? []).filter(g => !g.system);

  async function assign(userId: string, groupId: string | null) {
    setAssigning(true);
    try { await adminFetch("/admin/groups/assign", { method: "PATCH", body: JSON.stringify({ userIds: [userId], groupId }) }); await load(group); }
    catch (e: any) { setError(e.message ?? "Could not assign group"); }
    finally { setAssigning(false); }
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Left: grid + list ── */}
      <div style={{ width: selected ? "56%" : "100%", flexShrink: 0, borderRight: selected ? "1px solid #E2E8F0" : undefined, display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.2s" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 12px", borderBottom: "1px solid #F1F5F9", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 3px" }}>Leaderboard</h1>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>Cumulative points — setup earned once, consistency every day. Pick a group to scope the board.</p>
          </div>
          <button onClick={() => load(group)} title="Refresh" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <RefreshCw size={13} color="#64748B" />
          </button>
        </div>

        {/* Group grid (persistent switcher) */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #F1F5F9", flexShrink: 0, display: "flex", gap: 10, overflowX: "auto" }}>
          {(data?.groups ?? []).map(g => (
            <GroupGridCard key={g.key} g={g} active={group === g.key}
              onSelect={() => { setGroup(g.key); setSelected(null); }}
              onEdit={g.system ? undefined : () => setModal({ edit: g })} />
          ))}
          <button onClick={() => setModal({ edit: null })} style={{
            flexShrink: 0, width: 130, borderRadius: 14, border: "1.5px dashed #CBD5E1", backgroundColor: "transparent",
            cursor: "pointer", color: "#64748B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 600,
          }}>
            <Plus size={18} /> New group
          </button>
        </div>

        {/* Ranked list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, gap: 10 }}>
              <Loader2 size={16} color="#F97316" className="animate-spin" /><span style={{ fontSize: 13, color: "#94A3B8" }}>Scoring…</span>
            </div>
          )}
          {error && (
            <div style={{ margin: 24, padding: "12px 14px", borderRadius: 10, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#DC2626" /><span style={{ fontSize: 12, color: "#DC2626" }}>{error}</span>
            </div>
          )}
          {!loading && !error && data && (
            data.users.length === 0
              ? <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "40px 20px" }}>No users in this group yet.</p>
              : data.users.map(u => <LbRow key={u.id} u={u} active={selected?.id === u.id} onClick={() => setSelected(u)} showGroup={group === "overall"} />)
          )}
        </div>
      </div>

      {/* ── Right: drill-down / breakdown ── */}
      {selected && (
        <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F8FAFC" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px 0" }}>
            <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={13} color="#64748B" />
            </button>
          </div>
          <div style={{ padding: "8px 24px 32px" }}>
            {/* header */}
            <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid #E2E8F0", padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0, backgroundColor: avatarColor(selected.id) + "18", border: `2.5px solid ${avatarColor(selected.id)}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: avatarColor(selected.id) }}>{initials(selected.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: "0 0 2px" }}>{selected.name}</h2>
                  <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>{selected.email}</p>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{selected.total}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>points</div>
                </div>
              </div>
              {/* group assign */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                <Tag size={13} color="#7C3AED" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Group</span>
                <select value={selected.group?.id ?? ""} disabled={assigning}
                  onChange={e => assign(selected.id, e.target.value || null)}
                  style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC", fontSize: 12, fontWeight: 600, color: "#0F172A", cursor: "pointer", outline: "none" }}>
                  <option value="">Ungrouped</option>
                  {realGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {/* Setup breakdown */}
            <SectionCard title="Setup" subtitle="earned once" total={selected.setupTotal}>
              {SETUP_HEADS.map(h => {
                const s = (selected.setup as any)[h.key] as LbSetupHead;
                const detail = h.key === "goals" || h.key === "habits"
                  ? `${s.areas ?? 0}/7 life areas`
                  : s.done ? "complete" : "not yet";
                return <BreakdownRow key={h.key} label={h.label} detail={detail} points={s.points} max={s.max} done={h.key === "goals" || h.key === "habits" ? (s.points >= s.max) : s.done} />;
              })}
            </SectionCard>

            {/* Consistency breakdown */}
            <SectionCard title="Consistency" subtitle="accrues over time" total={selected.consistencyTotal}>
              {CONS_HEADS.map(h => {
                const c = selected.consistency[h.key] ?? { periods: 0, points: 0 };
                return <BreakdownRow key={h.key} label={h.label}
                  detail={`${c.periods} ${h.unit === "wk" ? (c.periods === 1 ? "week" : "weeks") : (c.periods === 1 ? "day" : "days")} × ${h.pts}`}
                  points={c.points} done={c.points > 0} />;
              })}
            </SectionCard>
          </div>
        </div>
      )}

      {modal && (
        <GroupModal edit={modal.edit} onClose={() => setModal(null)}
          onSaved={(next) => { setModal(null); if (next) setGroup(next); else load(group); }} />
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, total, children }: { title: string; subtitle: string; total: number; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{title}</span>
          <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: 6 }}>{subtitle}</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#EA580C" }}>{total}<span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}> pts</span></span>
      </div>
      {children}
    </div>
  );
}

function BreakdownRow({ label, detail, points, max, done }: { label: string; detail: string; points: number; max?: number; done?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #F8FAFC" }}>
      <div style={{ width: 15, flexShrink: 0 }}>
        {done ? <Check size={13} color="#15803D" /> : <Minus size={12} color="#CBD5E1" />}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155", width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: "#94A3B8", flex: 1 }}>{detail}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: points > 0 ? "#0F172A" : "#CBD5E1", flexShrink: 0 }}>
        {points}{max ? <span style={{ color: "#CBD5E1", fontWeight: 400 }}>/{max}</span> : ""}
      </span>
    </div>
  );
}

// ── Admins Tab ────────────────────────────────────────────────────────────────
interface AdminAccount {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC",
  fontSize: 13, color: "#0F172A", outline: "none", boxSizing: "border-box",
};
const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#57534E",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
};

function AdminsTab({ currentAdminId }: { currentAdminId: string | null }) {
  const [admins,  setAdmins]  = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Add-admin form
  const [nEmail, setNEmail] = useState("");
  const [nName,  setNName]  = useState("");
  const [nPwd,   setNPwd]   = useState("");
  const [nShow,  setNShow]  = useState(false);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addOk,  setAddOk]  = useState<string | null>(null);

  // Change-my-password form
  const [cur,     setCur]     = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [pShow,   setPShow]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [pErr,    setPErr]    = useState<string | null>(null);
  const [pOk,     setPOk]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAdmins(await adminFetch<AdminAccount[]>("/admin/admins")); }
    catch (e: any) { setError(e.message ?? "Failed to load admins"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddErr(null); setAddOk(null);
    if (nPwd.length < 8) { setAddErr("Password must be at least 8 characters."); return; }
    setAdding(true);
    try {
      const created = await adminFetch<AdminAccount>("/admin/admins", {
        method: "POST",
        body: JSON.stringify({ email: nEmail.trim(), password: nPwd, name: nName.trim() || undefined }),
      });
      setAddOk(`${created.email} can now sign in to the admin portal.`);
      setNEmail(""); setNName(""); setNPwd("");
      await load();
    } catch (e: any) { setAddErr(e.message ?? "Could not add admin."); }
    finally { setAdding(false); }
  }

  async function removeAdmin(a: AdminAccount) {
    if (!window.confirm(`Remove admin access for ${a.email}? This cannot be undone.`)) return;
    setError(null);
    try { await adminFetch(`/admin/admins/${a.id}`, { method: "DELETE" }); await load(); }
    catch (e: any) { setError(e.message ?? "Could not remove admin."); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPErr(null); setPOk(false);
    if (next.length < 8)  { setPErr("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setPErr("New password and confirmation do not match.");  return; }
    setSaving(true);
    try {
      await adminFetch("/admin/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      setPOk(true); setCur(""); setNext(""); setConfirm("");
    } catch (e: any) { setPErr(e.message ?? "Could not update password."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 36px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>Admins & Security</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
          Manage who can sign in to this admin portal and update your own password.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 380px)", gap: 20, alignItems: "start" }}>

        {/* ── Left: admin accounts list ── */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(15,23,42,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #F1F5F9" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>
              Admin Accounts <span style={{ fontWeight: 400, color: "#94A3B8" }}>({admins.length})</span>
            </h2>
            <button onClick={load} title="Refresh" style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E8F0",
              backgroundColor: "transparent", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}>
              <RefreshCw size={12} color="#64748B" />
            </button>
          </div>

          {error && (
            <div style={{ margin: "16px 22px 0", padding: "10px 12px", borderRadius: 10, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#DC2626" />
              <span style={{ fontSize: 12, color: "#DC2626" }}>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", gap: 10 }}>
              <Loader2 size={16} color="#F97316" className="animate-spin" />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Loading admins…</span>
            </div>
          ) : (
            <div>
              {admins.map(a => {
                const isSelf = a.id === currentAdminId;
                const color = avatarColor(a.id);
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 22px", borderBottom: "1px solid #F1F5F9",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: color + "22", border: `2px solid ${color}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color,
                    }}>
                      {initials(a.name || a.email)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.name || a.email}
                        </span>
                        {isSelf && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#EA580C", backgroundColor: "#FFF7ED", padding: "1px 7px", borderRadius: 20 }}>
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <Mail size={11} color="#94A3B8" />
                        <span style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.email}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: "#94A3B8", flexShrink: 0 }}>Added {fmtIso(a.createdAt)}</span>
                    <button
                      onClick={() => removeAdmin(a)}
                      disabled={isSelf || admins.length <= 1}
                      title={isSelf ? "You cannot remove your own account" : admins.length <= 1 ? "At least one admin must remain" : "Remove admin"}
                      style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        border: "1px solid " + (isSelf || admins.length <= 1 ? "#F1F5F9" : "#FEE2E2"),
                        backgroundColor: isSelf || admins.length <= 1 ? "#F8FAFC" : "#FEF2F2",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: isSelf || admins.length <= 1 ? "not-allowed" : "pointer",
                      }}>
                      <Trash2 size={13} color={isSelf || admins.length <= 1 ? "#CBD5E1" : "#EF4444"} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add-admin form */}
          <form onSubmit={addAdmin} style={{ padding: "18px 22px", backgroundColor: "#F8FAFC", borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <UserPlus size={15} color="#EA580C" />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: 0 }}>Add an admin</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={fieldLabel}>Email</label>
                <input type="email" required value={nEmail} onChange={e => setNEmail(e.target.value)} placeholder="person@example.com" style={fieldStyle} />
              </div>
              <div>
                <label style={fieldLabel}>Name <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</span></label>
                <input type="text" value={nName} onChange={e => setNName(e.target.value)} placeholder="Full name" style={fieldStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={fieldLabel}>Temporary password</label>
              <div style={{ position: "relative" }}>
                <input type={nShow ? "text" : "password"} required value={nPwd} onChange={e => setNPwd(e.target.value)} placeholder="At least 8 characters" style={{ ...fieldStyle, paddingRight: 40 }} />
                <button type="button" onClick={() => setNShow(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, color: "#78716C", display: "flex" }}>
                  {nShow ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {addErr && (
              <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 10px", padding: "8px 10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, fontWeight: 600 }}>{addErr}</p>
            )}
            {addOk && (
              <p style={{ fontSize: 12, color: "#15803D", margin: "0 0 10px", padding: "8px 10px", backgroundColor: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={13} /> {addOk}
              </p>
            )}

            <button type="submit" disabled={adding} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: adding ? "#E8C8A8" : "linear-gradient(135deg, #F97316, #EA580C)",
              color: "#FFFFFF", fontSize: 13, fontWeight: 700,
              cursor: adding ? "not-allowed" : "pointer",
            }}>
              {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {adding ? "Adding…" : "Add admin"}
            </button>
          </form>
        </div>

        {/* ── Right: change my password ── */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "22px", boxShadow: "0 1px 3px rgba(15,23,42,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <KeyRound size={15} color="#EA580C" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>Change my password</h2>
          </div>
          <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 18px" }}>Update the password for your admin account.</p>

          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Current password</label>
              <input type={pShow ? "text" : "password"} required value={cur} onChange={e => setCur(e.target.value)} placeholder="••••••••" style={fieldStyle} />
            </div>
            <div>
              <label style={fieldLabel}>New password</label>
              <div style={{ position: "relative" }}>
                <input type={pShow ? "text" : "password"} required value={next} onChange={e => setNext(e.target.value)} placeholder="At least 8 characters" style={{ ...fieldStyle, paddingRight: 40 }} />
                <button type="button" onClick={() => setPShow(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, color: "#78716C", display: "flex" }}>
                  {pShow ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Confirm new password</label>
              <input type={pShow ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter new password" style={fieldStyle} />
            </div>

            {pErr && (
              <p style={{ fontSize: 12, color: "#DC2626", margin: 0, padding: "8px 10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, fontWeight: 600 }}>{pErr}</p>
            )}
            {pOk && (
              <p style={{ fontSize: 12, color: "#15803D", margin: 0, padding: "8px 10px", backgroundColor: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={13} /> Password updated successfully.
              </p>
            )}

            <button type="submit" disabled={saving} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              marginTop: 4, padding: "11px 16px", borderRadius: 10, border: "none",
              background: saving ? "#E8C8A8" : "linear-gradient(135deg, #F97316, #EA580C)",
              color: "#FFFFFF", fontSize: 13, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {saving ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Admin session ─────────────────────────────────────────────────────────────

// ── Admin login screen ────────────────────────────────────────────────────────
function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        let msg = "Invalid admin credentials.";
        try { const j = await res.json(); if (res.status !== 401 && j?.message) msg = Array.isArray(j.message) ? j.message.join(", ") : j.message; } catch { /* ignore */ }
        setError(msg);
        return;
      }
      const data = await res.json();
      sessionStorage.setItem(TOKEN_KEY, data.token);
      onAuth();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
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
  const [adminId,   setAdminId]   = useState<string | null>(null);

  // Resolve the signed-in admin (also validates the stored token on load).
  const loadMe = useCallback(async () => {
    if (!getToken()) { setAuthed(false); setChecked(true); return; }
    try {
      const me = await adminFetch<AdminAccount>("/admin/me");
      setAdminId(me.id);
      setAuthed(true);
    } catch {
      // adminFetch clears an expired token; treat any failure as logged-out.
      setAuthed(false);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setAdminId(null);
    setAuthed(false);
  }

  if (!checked) return null;
  if (!authed)  return <AdminLogin onAuth={loadMe} />;

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
            {tab === "overview" ? "Overview" : tab === "users" ? "Users" : tab === "leaderboard" ? "Leaderboard" : tab === "tickets" ? "Support Tickets" : "Admins"}
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
          {tab === "overview"    && <div style={{ height: "100%", overflowY: "auto" }}><OverviewTab /></div>}
          {tab === "users"       && <UsersTab />}
          {tab === "leaderboard" && <LeaderboardTab />}
          {tab === "tickets"     && <TicketsTab />}
          {tab === "admins"      && <AdminsTab currentAdminId={adminId} />}
        </div>
      </div>
    </div>
  );
}
