"use client";

import { useState } from "react";
import { Plus, X, Send, ChevronDown, MessageSquare, ExternalLink } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import type { SupportTicket, TicketCategory, TicketPriority } from "@/lib/ticketTypes";
import {
  STATUS_META, PRIORITY_META, CATEGORY_META, nextTicketId,
} from "@/lib/ticketTypes";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const CATEGORIES: TicketCategory[] = ["bug", "feature", "question", "account", "other"];
const PRIORITIES: TicketPriority[]  = ["low", "medium", "high", "urgent"];

// ── sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "20px",
      fontSize: "11px", fontWeight: 600,
      color: m.color, backgroundColor: m.bg,
    }}>
      {m.label}
    </span>
  );
}

// ── NewTicketSheet ────────────────────────────────────────────────────────────
function NewTicketSheet({ onClose, onSave }: { onClose: () => void; onSave: (t: SupportTicket) => void }) {
  const [title,    setTitle]    = useState("");
  const [category, setCategory] = useState<TicketCategory>("question");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [body,     setBody]     = useState("");
  const { tickets } = useAppStore();

  function handleSave() {
    if (!title.trim() || !body.trim()) return;
    const now = Date.now();
    const ticket: SupportTicket = {
      id:        nextTicketId(tickets),
      title:     title.trim(),
      category,
      priority,
      status:    "open",
      messages:  [{ id: crypto.randomUUID(), authorType: "user", body: body.trim(), createdAt: now }],
      createdAt: now,
      updatedAt: now,
    };
    onSave(ticket);
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      backgroundColor: "rgba(28,25,23,0.6)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: "640px",
        backgroundColor: "#FFFFFF",
        borderRadius: "20px 20px 0 0",
        padding: "28px 28px 32px",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>New Support Ticket</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color="#78716C" />
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "16px" }}>
          <label style={lbl}>Title</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your issue or request…"
            style={inputStyle}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: "16px" }}>
          <label style={lbl}>Category</label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => {
              const m = CATEGORY_META[c];
              return (
                <button key={c} onClick={() => setCategory(c)} style={{
                  padding: "5px 12px", borderRadius: "20px",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  border: category === c ? "1.5px solid #F97316" : "1.5px solid #E8DDD0",
                  backgroundColor: category === c ? "#FFF7ED" : "#FAFAFA",
                  color: category === c ? "#EA580C" : "#78716C",
                }}>
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority */}
        <div style={{ marginBottom: "16px" }}>
          <label style={lbl}>Priority</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {PRIORITIES.map((p) => {
              const m = PRIORITY_META[p];
              return (
                <button key={p} onClick={() => setPriority(p)} style={{
                  padding: "5px 12px", borderRadius: "20px",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  border: priority === p ? `1.5px solid ${m.color}` : "1.5px solid #E8DDD0",
                  backgroundColor: priority === p ? `${m.color}15` : "#FAFAFA",
                  color: priority === p ? m.color : "#78716C",
                }}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: "24px" }}>
          <label style={lbl}>Describe your issue</label>
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            rows={5} placeholder="Provide as much detail as possible…"
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px", borderRadius: "10px",
            border: "1px solid #E8DDD0", backgroundColor: "#FAFAFA",
            fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!title.trim() || !body.trim()} style={{
            flex: 2, padding: "11px", borderRadius: "10px", border: "none",
            background: (!title.trim() || !body.trim()) ? "#E8DDD0" : "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
          }}>
            Submit Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TicketDetail ──────────────────────────────────────────────────────────────
function TicketDetail({ ticket, onClose, onUpdate }: {
  ticket: SupportTicket;
  onClose: () => void;
  onUpdate: (t: SupportTicket) => void;
}) {
  const [reply, setReply] = useState("");

  function sendReply() {
    if (!reply.trim()) return;
    const now = Date.now();
    const updated: SupportTicket = {
      ...ticket,
      messages:  [...ticket.messages, { id: crypto.randomUUID(), authorType: "user", body: reply.trim(), createdAt: now }],
      updatedAt: now,
      status:    ticket.status === "closed" || ticket.status === "resolved" ? "open" : ticket.status,
    };
    onUpdate(updated);
    setReply("");
  }

  const sm = STATUS_META[ticket.status];
  const pm = PRIORITY_META[ticket.priority];
  const cm = CATEGORY_META[ticket.category];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      backgroundColor: "rgba(28,25,23,0.6)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: "640px", backgroundColor: "#FFFFFF",
        borderRadius: "20px 20px 0 0",
        display: "flex", flexDirection: "column",
        maxHeight: "88vh",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F0EAE3", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#F97316", margin: "0 0 4px", letterSpacing: "0.08em" }}>
                {ticket.id}
              </p>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>
                {ticket.title}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
              <X size={18} color="#78716C" />
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <StatusBadge status={ticket.status} />
            <span style={{ fontSize: "11px", fontWeight: 600, color: pm.color, backgroundColor: `${pm.color}15`,
              padding: "2px 8px", borderRadius: "20px" }}>
              {pm.label}
            </span>
            <span style={{ fontSize: "11px", color: "#78716C" }}>{cm.emoji} {cm.label}</span>
            <span style={{ fontSize: "11px", color: "#A8A29E" }}>{fmtDate(ticket.createdAt)}</span>
          </div>
        </div>

        {/* Message thread */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {ticket.messages.map((msg) => {
            const isUser = msg.authorType === "user";
            return (
              <div key={msg.id} style={{
                display: "flex", flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px", borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  backgroundColor: isUser ? "#FFF7ED" : "#F1F5F9",
                  border: isUser ? "1px solid #FED7AA" : "1px solid #E2E8F0",
                }}>
                  <p style={{ fontSize: "13px", color: "#1C1917", margin: 0, lineHeight: 1.6 }}>{msg.body}</p>
                </div>
                <span style={{ fontSize: "10px", color: "#A8A29E", marginTop: "3px" }}>
                  {isUser ? "You" : "Support"} · {fmtTime(msg.createdAt)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        {ticket.status !== "closed" && (
          <div style={{ padding: "12px 24px 20px", borderTop: "1px solid #F0EAE3", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={reply} onChange={(e) => setReply(e.target.value)}
                rows={2} placeholder="Write a reply…"
                style={{ ...inputStyle, flex: 1, resize: "none", lineHeight: 1.5, marginBottom: 0 }}
              />
              <button onClick={sendReply} disabled={!reply.trim()} style={{
                width: "38px", height: "38px", borderRadius: "10px", border: "none", flexShrink: 0,
                background: reply.trim() ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <Send size={15} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SupportPage() {
  const { tickets, addTicket, updateTicket } = useAppStore();
  const [showNew,    setShowNew]    = useState(false);
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | SupportTicket["status"]>("all");

  const filtered = tickets.filter((t) => statusFilter === "all" || t.status === statusFilter);
  const sorted   = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  const active   = activeId ? tickets.find((t) => t.id === activeId) ?? null : null;

  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: "32px 40px", maxWidth: "860px", margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#1C1917", margin: "0 0 6px" }}>Support</h1>
          <p style={{ fontSize: "13px", color: "#78716C", margin: 0 }}>
            Submit a ticket and we&apos;ll get back to you.
            <a href="/admin" style={{ color: "#F97316", marginLeft: "8px", fontSize: "12px", textDecoration: "none" }}>
              Admin panel <ExternalLink size={10} style={{ display: "inline", verticalAlign: "middle" }} />
            </a>
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "9px 16px", borderRadius: "10px", border: "none",
          background: "linear-gradient(135deg, #F97316, #EA580C)",
          fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
        }}>
          <Plus size={15} /> New Ticket
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {(["open", "in-progress", "resolved", "closed"] as const).map((s) => {
          const m = STATUS_META[s];
          return (
            <div key={s} style={{
              padding: "10px 16px", borderRadius: "10px", backgroundColor: m.bg,
              border: `1px solid ${m.color}25`,
            }}>
              <p style={{ fontSize: "18px", fontWeight: 800, color: m.color, margin: "0 0 2px" }}>
                {statusCounts[s] ?? 0}
              </p>
              <p style={{ fontSize: "11px", fontWeight: 600, color: m.color, margin: 0, opacity: 0.8 }}>{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {(["all", "open", "in-progress", "resolved", "closed"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: "5px 12px", borderRadius: "20px", border: "1px solid",
            borderColor: statusFilter === s ? "#F97316" : "#E8DDD0",
            backgroundColor: statusFilter === s ? "#FFF7ED" : "transparent",
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
            color: statusFilter === s ? "#EA580C" : "#78716C",
          }}>
            {s === "all" ? "All" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <MessageSquare size={32} color="#D6C5B4" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: "14px", color: "#A8A29E" }}>No tickets yet. Submit one if you need help.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sorted.map((t) => {
            const pm = PRIORITY_META[t.priority];
            const cm = CATEGORY_META[t.category];
            return (
              <div key={t.id} onClick={() => setActiveId(t.id)} style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E8DDD0",
                borderRadius: "12px",
                padding: "14px 18px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "14px",
                transition: "box-shadow 0.15s",
              }}>
                {/* Priority dot */}
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: pm.color, flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#F97316" }}>{t.id}</span>
                    <span style={{ fontSize: "11px", color: "#A8A29E" }}>{cm.emoji} {cm.label}</span>
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#1C1917", margin: "0 0 4px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.title}
                  </p>
                  <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0 }}>
                    {t.messages.length} message{t.messages.length !== 1 ? "s" : ""} · {fmtDate(t.updatedAt)}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <StatusBadge status={t.status} />
                  <ChevronDown size={14} color="#A8A29E" style={{ transform: "rotate(-90deg)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <NewTicketSheet onClose={() => setShowNew(false)} onSave={addTicket} />}
      {active && (
        <TicketDetail
          ticket={active}
          onClose={() => setActiveId(null)}
          onUpdate={(t) => { updateTicket(t); }}
        />
      )}
    </div>
  );
}

// ── style helpers ─────────────────────────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.07em",
  color: "#78716C", marginBottom: "7px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "10px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FAFAFA",
  fontSize: "13px", color: "#1C1917", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
