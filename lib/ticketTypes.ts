export type TicketStatus   = "open" | "in-progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "bug" | "feature" | "question" | "account" | "other";

export interface TicketMessage {
  id:         string;
  authorType: "user" | "admin";
  body:       string;
  createdAt:  number;
}

export interface SupportTicket {
  id:          string;   // "LEG-00001"
  title:       string;
  category:    TicketCategory;
  priority:    TicketPriority;
  status:      TicketStatus;
  messages:    TicketMessage[];
  createdAt:   number;
  updatedAt:   number;
  resolvedAt?: number;
}

export const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  "open":        { label: "Open",        color: "#3B82F6", bg: "#EFF6FF" },
  "in-progress": { label: "In Progress", color: "#F97316", bg: "#FFF7ED" },
  "resolved":    { label: "Resolved",    color: "#10B981", bg: "#F0FDF4" },
  "closed":      { label: "Closed",      color: "#9CA3AF", bg: "#F1F5F9" },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#9CA3AF" },
  medium: { label: "Medium", color: "#F59E0B" },
  high:   { label: "High",   color: "#F97316" },
  urgent: { label: "Urgent", color: "#EF4444" },
};

export const CATEGORY_META: Record<TicketCategory, { label: string; emoji: string }> = {
  bug:      { label: "Bug",      emoji: "🐛" },
  feature:  { label: "Feature",  emoji: "✨" },
  question: { label: "Question", emoji: "❓" },
  account:  { label: "Account",  emoji: "👤" },
  other:    { label: "Other",    emoji: "📋" },
};

export function nextTicketId(tickets: SupportTicket[]): string {
  const max = tickets.reduce((m, t) => {
    const n = parseInt(t.id.replace("LEG-", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `LEG-${String(max + 1).padStart(5, "0")}`;
}
