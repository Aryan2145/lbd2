"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AREA_META, FREQ_LABEL, type HabitData, type HabitFrequency, type HabitType, type LifeArea } from "./HabitCard";
import type { GoalData } from "@/components/goals/GoalCard";

const AREAS = Object.keys(AREA_META) as LifeArea[];
const FREQS = Object.keys(FREQ_LABEL) as HabitFrequency[];
const DAYS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  open:    boolean;
  onClose: () => void;
  onSave:  (h: HabitData) => void;
  goals:   GoalData[];
}

export default function HabitCreateSheet({ open, onClose, onSave, goals }: Props) {
  const [name,        setName]        = useState("");
  const [desc,        setDesc]        = useState("");
  const [area,        setArea]        = useState<LifeArea>("health");
  const [frequency,   setFrequency]   = useState<HabitFrequency>("daily");
  const [customDays,  setCustomDays]  = useState<number[]>([1, 2, 3, 4, 5]);
  const [type,        setType]        = useState<HabitType>("binary");
  const [target,      setTarget]      = useState(1);
  const [unit,        setUnit]        = useState("");
  const [cue,         setCue]         = useState("");
  const [reward,      setReward]      = useState("");
  const [linkedGoalId, setLinkedGoalId] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(""); setDesc(""); setArea("health"); setFrequency("daily");
      setCustomDays([1, 2, 3, 4, 5]); setType("binary"); setTarget(1); setUnit("");
      setCue(""); setReward(""); setLinkedGoalId("");
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [open]);

  const toggleDay = (d: number) =>
    setCustomDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort());

  const canSave = name.trim().length > 0 && (type === "binary" || target >= 1);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(), name: name.trim(), description: desc.trim(),
      area, frequency, customDays: frequency === "custom" ? customDays : [],
      cue: cue.trim(), reward: reward.trim(),
      type, target: type === "binary" ? 1 : target, unit: type === "binary" ? "" : unit.trim(),
      completions: [], measurements: {}, linkedGoalId,
      createdAt: Date.now(),
    });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={backdrop} />
      <div style={sheet}>
        {/* Header */}
        <div style={header}>
          <div>
            <p style={label}>New Habit</p>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
              Build a new habit
            </h2>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={15} color="#78716C" /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          <Field label="Habit name">
            <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning meditation" style={inStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && canSave) handleSave(); }} />
          </Field>

          <Field label="Description (optional)">
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. 10 mins of breath-focused meditation" style={inStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
          </Field>

          {/* Habit type */}
          <Field label="Habit type">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(["binary", "measurable"] as HabitType[]).map((t) => (
                <button key={t} onClick={() => setType(t)} style={{
                  padding: "10px 12px", borderRadius: "10px", textAlign: "left",
                  border: `1.5px solid ${type === t ? "#F97316" : "#E8DDD0"}`,
                  backgroundColor: type === t ? "#FFF7ED" : "#FFFFFF",
                  cursor: "pointer",
                }}>
                  <p style={{ fontSize: "12px", fontWeight: 700,
                    color: type === t ? "#F97316" : "#1C1917", margin: 0 }}>
                    {t === "binary" ? "Yes / No" : "Measurable"}
                  </p>
                  <p style={{ fontSize: "10px", color: "#78716C", margin: "2px 0 0" }}>
                    {t === "binary" ? "Done or not done" : "Track a daily count"}
                  </p>
                </button>
              ))}
            </div>
          </Field>

          {/* Target + unit for measurable */}
          {type === "measurable" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Daily target">
                <input type="number" min={1} value={target}
                  onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  style={inStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </Field>
              <Field label="Unit (e.g. pages, mins)">
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
                  placeholder="pages" style={inStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </Field>
            </div>
          )}

          {/* Life area */}
          <Field label="Life area">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {AREAS.map((a) => {
                const m = AREA_META[a];
                return (
                  <button key={a} onClick={() => setArea(a)} style={{
                    padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                    border: `1.5px solid ${area === a ? m.color : "#E8DDD0"}`,
                    backgroundColor: area === a ? m.bg : "#FFFFFF",
                    color: area === a ? m.color : "#78716C", cursor: "pointer",
                  }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Frequency */}
          <Field label="How often?">
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {FREQS.map((f) => (
                <button key={f} onClick={() => setFrequency(f)} style={{
                  padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                  border: `1.5px solid ${frequency === f ? "#F97316" : "#E8DDD0"}`,
                  backgroundColor: frequency === f ? "#FFF7ED" : "#FFFFFF",
                  color: frequency === f ? "#F97316" : "#78716C", cursor: "pointer",
                }}>
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
          </Field>

          {frequency === "custom" && (
            <Field label="Which days?">
              <div style={{ display: "flex", gap: "6px" }}>
                {DAYS.map((day, i) => (
                  <button key={i} onClick={() => toggleDay(i)} style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    fontSize: "10px", fontWeight: 700,
                    border: `1.5px solid ${customDays.includes(i) ? "#F97316" : "#E8DDD0"}`,
                    backgroundColor: customDays.includes(i) ? "#F97316" : "#FFFFFF",
                    color: customDays.includes(i) ? "#FFFFFF" : "#78716C", cursor: "pointer",
                  }}>
                    {day[0]}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* Link to goal */}
          {goals.length > 0 && (
            <Field label="Link to a goal (optional)">
              <select
                value={linkedGoalId}
                onChange={(e) => setLinkedGoalId(e.target.value)}
                style={{ ...inStyle, backgroundColor: "#FFFFFF" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
              >
                <option value="">— No goal —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.outcome || g.statement}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Habit loop */}
          <div style={{
            padding: "14px", borderRadius: "10px",
            backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8", marginBottom: "16px",
          }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#A8A29E", marginBottom: "10px" }}>
              Habit Loop (optional)
            </p>
            <div style={{ marginBottom: "10px" }}>
              <p style={labelSm}>Cue — what triggers this habit?</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#A8A29E", whiteSpace: "nowrap" }}>After I</span>
                <input type="text" value={cue} onChange={(e) => setCue(e.target.value)}
                  placeholder="wake up / finish lunch…" style={{ ...inStyle, flex: 1 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </div>
            </div>
            <div>
              <p style={labelSm}>Reward — how will you celebrate?</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#A8A29E", whiteSpace: "nowrap" }}>I will</span>
                <input type="text" value={reward} onChange={(e) => setReward(e.target.value)}
                  placeholder="enjoy a coffee / feel proud…" style={{ ...inStyle, flex: 1 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #EDE5D8", display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave} style={{
            flex: 2, padding: "11px", borderRadius: "10px", border: "none",
            fontSize: "13px", fontWeight: 700,
            background: canSave ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
            color: canSave ? "#FFFFFF" : "#A8A29E",
            cursor: canSave ? "pointer" : "default",
          }}>
            Add Habit
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#78716C", marginBottom: "6px" }}>{lbl}</p>
      {children}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "8px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s",
};
const iconBtn: React.CSSProperties = {
  width: "32px", height: "32px", borderRadius: "8px",
  backgroundColor: "#F5F0EB", border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const cancelBtn: React.CSSProperties = {
  flex: 1, padding: "11px", borderRadius: "10px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
};
const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.3)",
  backdropFilter: "blur(2px)", zIndex: 40,
};
const sheet: React.CSSProperties = {
  position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px,100vw)",
  backgroundColor: "#FAF5EE", borderLeft: "1px solid #EDE5D8",
  zIndex: 50, display: "flex", flexDirection: "column",
  boxShadow: "-8px 0 32px rgba(28,25,23,0.12)",
};
const header: React.CSSProperties = {
  padding: "20px 24px 16px", borderBottom: "1px solid #EDE5D8",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};
const label: React.CSSProperties = {
  fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "#F97316", marginBottom: "2px",
};
const labelSm: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "#78716C", marginBottom: "5px",
};
