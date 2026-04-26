"use client";

import { useState } from "react";
import { RefreshCw, Pause, Play, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Q_META, type TaskData } from "@/components/tasks/TaskCard";
import type { RecurringTemplate } from "@/components/tasks/TaskCard";

interface Props {
  templates:      RecurringTemplate[];
  tasks:          TaskData[];
  onUpdate:       (t: RecurringTemplate) => void;
  onDelete:       (id: string, mode: "stop" | "delete-future" | "delete-all") => void;
  onAddRecurring: () => void;
}

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ordinal(n: number) {
  if (n === 1 || n === 21 || n === 31) return "st";
  if (n === 2 || n === 22) return "nd";
  if (n === 3 || n === 23) return "rd";
  return "th";
}

function scheduleLabel(tpl: RecurringTemplate): string {
  switch (tpl.scheduleType) {
    case "daily":
      return tpl.every === 1 ? "Every day" : `Every ${tpl.every} days`;
    case "weekly": {
      const dStr = tpl.days.map((d) => DAY_NAMES[d]).join(", ") || "—";
      return tpl.every === 1 ? `Weekly · ${dStr}` : `Every ${tpl.every} weeks · ${dStr}`;
    }
    case "monthly":
      return `Monthly on the ${tpl.monthDay}${ordinal(tpl.monthDay)}`;
    case "yearly":
      return `Yearly · ${MONTH_NAMES[tpl.month]} ${tpl.monthDay}`;
  }
}

function endLabel(tpl: RecurringTemplate): string {
  if (tpl.endCondition === "never") return "No end";
  if (tpl.endCondition === "on-date") return `Until ${tpl.endDate}`;
  return `After ${tpl.endAfter} occurrences`;
}

export default function TemplatesView({ templates, tasks, onUpdate, onDelete, onAddRecurring }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  if (templates.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "12px", height: "300px", textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%",
          backgroundColor: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RefreshCw size={24} color="#F97316" />
        </div>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917" }}>No recurring tasks</p>
        <p style={{ fontSize: "12px", color: "#78716C", maxWidth: "280px", lineHeight: 1.5 }}>
          Recurring tasks auto-spawn instances on schedule — daily standups, weekly reviews, monthly reports.
        </p>
        <button onClick={onAddRecurring} style={{
          padding: "9px 18px", borderRadius: "10px", border: "none",
          background: "linear-gradient(135deg, #F97316, #EA580C)",
          fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
        }}>
          Create recurring task
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", height: "100%" }}>
      {templates.map((tpl) => {
        const m = Q_META[tpl.quadrant];
        const allInstances = tasks.filter((t) => t.parentId === tpl.id);
        const openCount    = allInstances.filter((t) => t.status === "open").length;
        const doneCount    = allInstances.filter((t) => t.status === "complete").length;
        const missCount    = allInstances.filter((t) => t.status === "incomplete").length;
        const isExpanded   = expandedId === tpl.id;
        const isConfirming = confirmDelete === tpl.id;

        return (
          <div key={tpl.id} style={{
            borderRadius: "12px", border: "1px solid #EDE5D8",
            backgroundColor: tpl.active ? "#FFFFFF" : "#FAFAFA",
            overflow: "hidden",
            opacity: tpl.active ? 1 : 0.7,
          }}>
            {/* Main row */}
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Recurring icon */}
              <div style={{ width: "36px", height: "36px", borderRadius: "10px",
                backgroundColor: m.bg, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={15} color={m.color} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tpl.title}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700,
                    padding: "2px 6px", borderRadius: "20px",
                    color: m.color, backgroundColor: m.bg }}>
                    {tpl.quadrant}
                  </span>
                  {!tpl.active && (
                    <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700,
                      padding: "2px 6px", borderRadius: "20px",
                      color: "#9CA3AF", backgroundColor: "#F3F4F6" }}>
                      Paused
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: "#A8A29E" }}>
                  <span>{scheduleLabel(tpl)}</span>
                  <span>·</span>
                  <span>{endLabel(tpl)}</span>
                  {tpl.time && <><span>·</span><span>{tpl.time}</span></>}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <StatPill label="Open"  value={openCount} color="#F97316" />
                <StatPill label="Done"  value={doneCount} color="#16A34A" />
                <StatPill label="Missed" value={missCount} color="#9CA3AF" />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  onClick={() => onUpdate({ ...tpl, active: !tpl.active })}
                  title={tpl.active ? "Pause" : "Resume"}
                  style={actionBtn}>
                  {tpl.active ? <Pause size={13} color="#78716C" /> : <Play size={13} color="#16A34A" />}
                </button>
                <button
                  onClick={() => setConfirmDelete(isConfirming ? null : tpl.id)}
                  title="Delete template"
                  style={actionBtn}>
                  <Trash2 size={13} color="#EF4444" />
                </button>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                  style={actionBtn}>
                  {isExpanded ? <ChevronUp size={13} color="#78716C" /> : <ChevronDown size={13} color="#78716C" />}
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            {isConfirming && (
              <div style={{ padding: "12px 16px", backgroundColor: "#FEF2F2",
                borderTop: "1px solid #FECACA" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#DC2626", marginBottom: "8px" }}>
                  Delete recurring task — choose what happens to its instances:
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {([
                    ["stop",          "Stop scheduling (keep all)",    "#6B7280"],
                    ["delete-future", "Delete future open instances",   "#D97706"],
                    ["delete-all",    "Delete template + all instances","#DC2626"],
                  ] as ["stop"|"delete-future"|"delete-all", string, string][]).map(([mode, label, color]) => (
                    <button key={mode} onClick={() => { onDelete(tpl.id, mode); setConfirmDelete(null); }}
                      style={{
                        padding: "6px 12px", borderRadius: "8px", border: `1px solid ${color}`,
                        backgroundColor: "#FFFFFF", fontSize: "11px", fontWeight: 600,
                        color, cursor: "pointer",
                      }}>
                      {label}
                    </button>
                  ))}
                  <button onClick={() => setConfirmDelete(null)} style={{
                    padding: "6px 12px", borderRadius: "8px", border: "1px solid #E8DDD0",
                    backgroundColor: "#FFFFFF", fontSize: "11px", color: "#78716C", cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expanded: recent instances */}
            {isExpanded && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #EDE5D8",
                backgroundColor: "#FAF5EE" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#A8A29E",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  Recent instances ({allInstances.length} total)
                </p>
                {allInstances.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#A8A29E" }}>No instances spawned yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {[...allInstances]
                      .sort((a, b) => b.deadline.localeCompare(a.deadline))
                      .slice(0, 6)
                      .map((inst) => (
                        <div key={inst.id} style={{ display: "flex", alignItems: "center",
                          justifyContent: "space-between", fontSize: "11px", color: "#78716C",
                          padding: "4px 8px", borderRadius: "6px",
                          backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8" }}>
                          <span>{inst.deadline}</span>
                          <span style={{
                            fontWeight: 700,
                            color: inst.status === "complete" ? "#16A34A"
                              : inst.status === "incomplete" ? "#9CA3AF" : "#F97316",
                          }}>
                            {inst.status === "complete" ? "Done"
                              : inst.status === "incomplete" ? "Missed" : "Open"}
                          </span>
                        </div>
                      ))
                    }
                    {allInstances.length > 6 && (
                      <p style={{ fontSize: "10px", color: "#A8A29E", textAlign: "center" }}>
                        +{allInstances.length - 6} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null;
  return (
    <div style={{ textAlign: "center", minWidth: "36px" }}>
      <p style={{ fontSize: "14px", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: "9px", color: "#A8A29E", marginTop: "1px" }}>{label}</p>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  width: "30px", height: "30px", borderRadius: "8px",
  border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
