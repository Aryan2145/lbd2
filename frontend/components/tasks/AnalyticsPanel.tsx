"use client";

import { CheckCircle2, XCircle, AlertTriangle, TrendingUp } from "lucide-react";
// RECURRING_DISABLED: import { RefreshCw } from "lucide-react";
import { Q_META, type TaskData, type EisenhowerQ } from "@/components/tasks/TaskCard";
// RECURRING_DISABLED: import type { RecurringTemplate } from "@/components/tasks/TaskCard";

interface Props {
  tasks: TaskData[];
  // RECURRING_DISABLED: templates: RecurringTemplate[];
}

function generateInsight(
  tasks: TaskData[],
  successRate: number,
  overdueCount: number,
): string {
  const open   = tasks.filter((t) => t.status === "open");
  const q1Open = open.filter((t) => t.quadrant === "Q1").length;
  const q2Open = open.filter((t) => t.quadrant === "Q2").length;

  if (q1Open >= 4)
    return `You have ${q1Open} open Q1 tasks — operating in firefighting mode. Block time for Q2 planning this week to reduce future crises.`;
  if (overdueCount >= 3)
    return `${overdueCount} tasks are overdue. Batch-close the smallest ones first, then reassess deadlines on the rest.`;
  if (successRate < 50 && tasks.filter((t) => t.status !== "open").length >= 4)
    return "Completion rate is below 50%. Before adding more, review whether existing tasks are still worth doing.";
  if (q2Open > q1Open * 2 && q2Open >= 3)
    return `Strong Q2 focus — ${q2Open} proactive tasks underway. Protect deep-work blocks to keep this momentum.`;
  return "Review your Q3 and Q4 tasks. Delegate what you can, eliminate what you shouldn't have taken on, and free up bandwidth for Q2.";
}

export default function AnalyticsPanel({ tasks }: Props) {
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const open     = tasks.filter((t) => t.status === "open");
  const closed   = tasks.filter((t) => t.status !== "open");
  const complete = tasks.filter((t) => t.status === "complete");
  const overdue  = open.filter((t) => t.deadline < today);

  /* RECURRING_DISABLED — recurring instance stats
  const instances  = tasks.filter((t) => t.kind === "instance");
  const closedInst = instances.filter((t) => t.status !== "open");
  const doneInst   = instances.filter((t) => t.status === "complete");
  const schedReliability = closedInst.length > 0
    ? Math.round((doneInst.length / closedInst.length) * 100) : null;
  RECURRING_DISABLED */

  const successRate = closed.length > 0 ? Math.round((complete.length / closed.length) * 100) : 0;
  const insight     = generateInsight(tasks, successRate, overdue.length);

  const variances   = complete.filter((t) => t.variance !== undefined).map((t) => t.variance!);
  const avgVariance = variances.length > 0
    ? (variances.reduce((a, b) => a + b, 0) / variances.length).toFixed(1) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", overflowY: "auto" }}>

      {/* AI insight banner */}
      <div style={{
        padding: "14px 16px", borderRadius: "12px",
        background: "linear-gradient(135deg, #FFF7ED, #FFFBF5)",
        border: "1px solid #FED7AA",
        display: "flex", gap: "12px", alignItems: "flex-start",
      }}>
        <div style={{ flexShrink: 0, marginTop: "1px" }}>
          <TrendingUp size={16} color="#F97316" />
        </div>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#F97316",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
            Smart Insight
          </p>
          <p style={{ fontSize: "13px", color: "#1C1917", lineHeight: 1.5 }}>{insight}</p>
        </div>
      </div>

      {/* Summary stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        <StatCard label="Total tasks"     value={tasks.length}      valueColor="#1C1917" bg="#FFFFFF" border="#E8DDD0" />
        <StatCard label="Completion rate" value={`${successRate}%`} valueColor="#16A34A" bg="#F0FDF4" border="#86EFAC" />
        <StatCard label="Overdue"         value={overdue.length}    valueColor={overdue.length > 0 ? "#DC2626" : "#57534E"} bg={overdue.length > 0 ? "#FEF2F2" : "#F9FAFB"} border={overdue.length > 0 ? "#FCA5A5" : "#E5E7EB"} />
        <StatCard label="Open"            value={open.length}       valueColor="#EA580C" bg="#FFF7ED" border="#FED7AA" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

        {/* Quadrant distribution */}
        <div style={{ padding: "16px", borderRadius: "12px",
          border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", marginBottom: "12px" }}>
            Quadrant audit (open tasks)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(["Q1","Q2","Q3","Q4"] as EisenhowerQ[]).map((q) => {
              const m     = Q_META[q];
              const count = open.filter((t) => t.quadrant === q).length;
              const pct   = open.length > 0 ? Math.round((count / open.length) * 100) : 0;
              return (
                <div key={q}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, color: m.color }}>{q} · {m.label}</span>
                    <span style={{ color: "#1C1917", fontWeight: 600 }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "#F2EAE0" }}>
                    <div style={{
                      height: "100%", borderRadius: "3px",
                      width: `${pct}%`, backgroundColor: m.color,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task outcomes */}
        <div style={{ padding: "16px", borderRadius: "12px",
          border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", marginBottom: "12px" }}>
            Task outcomes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <OutcomeRow icon={<CheckCircle2 size={13} color="#16A34A" />}
              label="Completed" count={complete.length} total={tasks.length} color="#16A34A" />
            <OutcomeRow icon={<XCircle size={13} color="#374151" />}
              label="Closed / missed" count={closed.length - complete.length}
              total={tasks.length} color="#374151" />
            <OutcomeRow icon={<AlertTriangle size={13} color="#DC2626" />}
              label="Overdue open" count={overdue.length} total={tasks.length} color="#DC2626" />
          </div>
          {avgVariance !== null && (
            <p style={{ fontSize: "10px", color: "#A8A29E", marginTop: "10px" }}>
              Avg. close timing: <span style={{ fontWeight: 600,
                color: Number(avgVariance) <= 0 ? "#16A34A" : "#DC2626" }}>
                {Number(avgVariance) <= 0
                  ? `${Math.abs(Number(avgVariance))} days early`
                  : `${avgVariance} days late`}
              </span>
            </p>
          )}

          {/* RECURRING_DISABLED — schedule reliability panel removed */}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor, bg, border }: { label: string; value: number | string; valueColor: string; bg: string; border: string }) {
  return (
    <div style={{ padding: "14px", borderRadius: "12px",
      border: `1px solid ${border}`, backgroundColor: bg, textAlign: "center" }}>
      <p style={{ fontSize: "10px", fontWeight: 600, color: "#1C1917",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
        {label}
      </p>
      <p style={{ fontSize: "26px", fontWeight: 800, color: valueColor, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function OutcomeRow({ icon, label, count, total, color }: {
  icon: React.ReactNode; label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {icon}
      <span style={{ fontSize: "11px", color: "#1C1917", flex: 1 }}>{label}</span>
      <span style={{ fontSize: "11px", fontWeight: 700, color }}>{count}</span>
      <span style={{ fontSize: "10px", fontWeight: 600, color, width: "30px", textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}
