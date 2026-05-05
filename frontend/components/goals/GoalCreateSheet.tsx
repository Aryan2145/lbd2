"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Plus, Trash2, CalendarDays } from "lucide-react";
import type { LifeArea, GoalData, Milestone } from "./GoalCard";
import { AREA_META } from "./GoalCard";
import { MAX_DATE_STR, todayDateStr, validateDate } from "@/lib/dateValidation";

const AREAS: { value: LifeArea; label: string }[] = [
  { value: "professional",  label: "Professional"   },
  { value: "contribution",  label: "Contribution"   },
  { value: "wealth",        label: "Wealth"         },
  { value: "spiritual",     label: "Spiritual"      },
  { value: "personal",      label: "Personal Growth"},
  { value: "relationships", label: "Relationships"  },
  { value: "health",        label: "Health"         },
];

const CONNECTORS = [
  "by achieving", "measured by", "reaching", "growing to",
  "reducing to", "completing", "earning", "building",
];

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtMilestoneDate(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildStatement(outcome: string, metric: string, unit: string, date: string, connector: string) {
  const parts = [outcome.trim(), connector, metric.trim(), unit.trim(), "by", fmtDate(date)];
  return parts.filter(Boolean).join(" ");
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (goal: GoalData) => void;
}

export default function GoalCreateSheet({ open, onClose, onSave }: Props) {
  const [outcome,   setOutcome]   = useState("");
  const [metric,    setMetric]    = useState("");
  const [unit,      setUnit]      = useState("");
  const [connector, setConnector] = useState(CONNECTORS[0]);
  const [deadline,  setDeadline]  = useState("");
  const [area,      setArea]      = useState<LifeArea>("professional");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [mTitle,    setMTitle]    = useState("");
  const [mDeadline, setMDeadline] = useState("");

  useEffect(() => {
    if (!open) {
      setOutcome(""); setMetric(""); setUnit("");
      setConnector(CONNECTORS[0]); setDeadline(""); setArea("professional");
      setMilestones([]); setMTitle(""); setMDeadline("");
    }
  }, [open]);

  const deadlineError      = validateDate(deadline, { required: true });
  const mDateError         = mDeadline ? validateDate(mDeadline, { required: false }) : null;
  const mDeadlineError     = deadline && mDeadline && mDeadline > deadline
    ? "Milestone date can't be after the goal's target date."
    : null;
  const goalDeadlineWarning = deadline ? milestones.filter((m) => m.deadline > deadline) : [];

  const statement = buildStatement(outcome, metric, unit, deadline, connector);
  const canSave   = outcome.trim() && metric.trim() && !deadlineError && goalDeadlineWarning.length === 0;

  const addMilestone = () => {
    if (!mTitle.trim() || !mDeadline || mDeadlineError) return;
    const m: Milestone = {
      id: crypto.randomUUID(),
      title: mTitle.trim(),
      deadline: mDeadline,
      completed: false,
      createdAt: Date.now(),
    };
    setMilestones((p) => [...p, m].sort((a, b) => a.deadline.localeCompare(b.deadline)));
    setMTitle("");
    setMDeadline("");
  };

  const removeMilestone = (id: string) =>
    setMilestones((p) => p.filter((m) => m.id !== id));

  const handleSave = () => {
    if (!canSave) return;
    const now = Date.now();
    const goal: GoalData = {
      id:        crypto.randomUUID(),
      statement,
      outcome:   outcome.trim(),
      metric:    metric.trim(),
      metricUnit: unit.trim(),
      deadline,
      area,
      progress:  0,
      lastMoved: now,
      velocity:  0,
      notes:     [],
      milestones,
      createdAt: now,
    };
    onSave(goal);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(28,25,23,0.3)",
          backdropFilter: "blur(2px)",
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(440px, 100vw)",
        backgroundColor: "#FAF5EE",
        borderLeft: "1px solid #EDE5D8",
        zIndex: 50,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(28,25,23,0.12)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
              New Goal
            </p>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
              Define your goal
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ width: "32px", height: "32px", borderRadius: "8px",
              backgroundColor: "#F5F0EB", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} color="#78716C" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Life Area */}
          <Field label="Life Area">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {AREAS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setArea(a.value)}
                  style={{
                    padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                    border: `1.5px solid ${area === a.value ? AREA_META[a.value].color : "#E8DDD0"}`,
                    backgroundColor: area === a.value ? AREA_META[a.value].bg : "#FFFFFF",
                    color: area === a.value ? AREA_META[a.value].color : "#78716C",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Outcome */}
          <Field label="What do you want to achieve?">
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Build a profitable second income stream"
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "8px",
                border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
                fontSize: "13px", color: "#1C1917", resize: "none",
                outline: "none", lineHeight: 1.5, fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
            />
          </Field>

          {/* Metric */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Measurable target">
              <input
                type="text"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="e.g. ₹2 lakhs / month"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
              />
            </Field>
            <Field label="Unit (optional)">
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. revenue"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
              />
            </Field>
          </div>

                  {/* Deadline */}
                  <Field label="Target date">
                    <DateInput
                      value={deadline}
                      onChange={setDeadline}
                      error={!!deadlineError || goalDeadlineWarning.length > 0}
                    />
                    {deadlineError && (
                      <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginTop: "5px" }}>
                        {deadlineError}
                      </p>
                    )}
                    {!deadlineError && goalDeadlineWarning.length > 0 && (
                      <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, marginTop: "5px" }}>
                        ⚠ {goalDeadlineWarning.length} milestone{goalDeadlineWarning.length > 1 ? "s are" : " is"} scheduled after this date — please remove or reschedule them.
                      </p>
                    )}
                  </Field>

          {/* Connector */}
          <Field label="Statement connector">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {CONNECTORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setConnector(c)}
                  style={{
                    padding: "4px 10px", borderRadius: "20px", fontSize: "11px",
                    border: `1.5px solid ${connector === c ? "#F97316" : "#E8DDD0"}`,
                    backgroundColor: connector === c ? "#FFF7ED" : "#FFFFFF",
                    color: connector === c ? "#F97316" : "#78716C",
                    cursor: "pointer", fontWeight: connector === c ? 600 : 400,
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </Field>


          {/* Milestones */}
          <Field label="Milestones (optional)">
            <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
              <input
                type="text"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="Milestone title"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#D97706"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
                onKeyDown={(e) => { if (e.key === "Enter") addMilestone(); }}
              />
              <div style={{ width: "148px", flexShrink: 0 }}>
                <DateInput
                  value={mDeadline}
                  onChange={setMDeadline}
                  error={!!mDeadlineError || !!mDateError}
                  accentColor="#D97706"
                  max={deadline || undefined}
                />
              </div>
              <button
                onClick={addMilestone}
                disabled={!mTitle.trim() || !mDeadline || !!mDeadlineError || !!mDateError}
                style={{
                  flexShrink: 0, width: "34px", height: "36px", borderRadius: "8px", border: "none",
                  background: mTitle.trim() && mDeadline && !mDeadlineError && !mDateError
                    ? "linear-gradient(135deg, #D97706, #B45309)" : "#E8DDD0",
                  cursor: mTitle.trim() && mDeadline && !mDeadlineError && !mDateError ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Plus size={14} color={mTitle.trim() && mDeadline && !mDeadlineError && !mDateError ? "#FFFFFF" : "#A8A29E"} />
              </button>
            </div>
            {mDateError && (
              <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginBottom: "6px" }}>
                {mDateError}
              </p>
            )}
            {!mDateError && mDeadlineError && (
              <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 500, marginBottom: "6px" }}>
                {mDeadlineError}
              </p>
            )}
            {milestones.length > 0 && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {milestones.map((m, idx) => (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "7px 10px", borderRadius: "8px",
                      backgroundColor: "#FFFBEB", border: "1px solid #FCD34D",
                    }}>
                      <div style={{
                        flexShrink: 0, width: "20px", height: "20px", borderRadius: "6px",
                        background: "linear-gradient(135deg, #D97706, #B45309)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, color: "#FFFFFF",
                      }}>
                        {idx + 1}
                      </div>
                      <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#1C1917",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.title}
                      </span>
                      <span style={{ fontSize: "10px", color: "#D97706", fontWeight: 500, flexShrink: 0 }}>
                        {fmtMilestoneDate(m.deadline)}
                      </span>
                      <button
                        onClick={() => removeMilestone(m.id)}
                        style={{
                          flexShrink: 0, width: "20px", height: "20px", borderRadius: "4px",
                          border: "none", backgroundColor: "transparent",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          opacity: 0.5,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; }}
                      >
                        <Trash2 size={11} color="#DC2626" />
                      </button>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: "#B8AEA4", marginTop: "8px",
                  textAlign: "center", fontStyle: "italic" }}>
                  After saving, you can link tasks & habits to each milestone
                </p>
              </>
            )}
          </Field>

          {/* Auto-generated statement preview */}
          {statement.length > 10 && (
            <div style={{
              marginTop: "4px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #FFF7ED 0%, #FEFCE8 100%)",
              border: "1px solid #FED7AA",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
                <Sparkles size={11} color="#F97316" />
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "#F97316" }}>
                  Goal Statement
                </span>
              </div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#1C1917",
                lineHeight: 1.5, margin: 0 }}>
                {statement}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #EDE5D8",
          display: "flex", gap: "10px",
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px", borderRadius: "10px",
              border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
              fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
            }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              flex: 2, padding: "11px", borderRadius: "10px",
              border: "none",
              background: canSave ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
              fontSize: "13px", fontWeight: 700,
              color: canSave ? "#FFFFFF" : "#A8A29E",
              cursor: canSave ? "pointer" : "default",
              transition: "opacity 0.2s",
            }}>
            Add Goal
          </button>
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "8px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
  transition: "border-color 0.15s",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600,
        color: "#78716C", marginBottom: "6px", letterSpacing: "0.03em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function DateInput({ value, onChange, error, accentColor = "#F97316", min, max }: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  accentColor?: string;
  min?: string;
  max?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#DC2626" : focused ? accentColor : "#E8DDD0";
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <div style={{
        position: "absolute", left: "10px", pointerEvents: "none", display: "flex",
        alignItems: "center", zIndex: 1,
      }}>
        <CalendarDays size={13} color={focused ? accentColor : "#A8A29E"} style={{ transition: "color 0.15s" }} />
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        min={min ?? todayDateStr()}
        max={max ?? MAX_DATE_STR}
        style={{
          ...inputStyle,
          paddingLeft: "30px",
          borderColor,
          boxShadow: focused ? `0 0 0 3px ${accentColor}18` : "none",
          colorScheme: "light" as React.CSSProperties["colorScheme"],
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      />
    </div>
  );
}
