"use client";

import { useState } from "react";
import { X, Pencil, Check, Flame, Target, Zap, Link2, CheckCircle2, Circle } from "lucide-react";
import {
  AREA_META, FREQ_LABEL, calcStreak, calcBestStreak, calcConsistency,
  isScheduledDay, isHabitDoneOnDate, toLocalDate,
  type HabitData, type HabitFrequency, type HabitType, type LifeArea,
} from "./HabitCard";
import type { GoalData } from "@/components/goals/GoalCard";

const AREAS = Object.keys(AREA_META) as LifeArea[];
const FREQS = Object.keys(FREQ_LABEL) as HabitFrequency[];
const DAYS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  habit:    HabitData | null;
  onClose:  () => void;
  onUpdate: (h: HabitData) => void;
  onDelete: (id: string) => void;
  goals:    GoalData[];
}

export default function HabitDetailSheet({ habit, onClose, onUpdate, onDelete, goals }: Props) {
  const [mode,      setMode]      = useState<"view" | "edit">("view");
  const [selDate,   setSelDate]   = useState<string | null>(null);   // selected history dot
  const [histInput, setHistInput] = useState<number>(0);             // measurable history input

  // Edit form state
  const [eName,      setEName]      = useState("");
  const [eDesc,      setEDesc]      = useState("");
  const [eArea,      setEArea]      = useState<LifeArea>("health");
  const [eFreq,      setEFreq]      = useState<HabitFrequency>("daily");
  const [eDays,      setEDays]      = useState<number[]>([]);
  const [eType,      setEType]      = useState<HabitType>("binary");
  const [eTarget,    setETarget]    = useState(1);
  const [eUnit,      setEUnit]      = useState("");
  const [eCue,       setECue]       = useState("");
  const [eReward,    setEReward]    = useState("");
  const [eLinked,    setELinked]    = useState("");

  if (!habit) return null;

  const area        = AREA_META[habit.area];
  const streak      = calcStreak(habit);
  const bestStreak  = calcBestStreak(habit);
  const consistency = calcConsistency(habit);
  const isMeasure   = habit.type === "measurable";

  // 8-week grid (56 days)
  const gridDots = Array.from({ length: 56 }, (_, i) => {
    const d   = new Date();
    d.setDate(d.getDate() - (55 - i));
    const ds  = toLocalDate(d);
    const sch = isScheduledDay(habit.frequency, habit.customDays, d.getDay())
                && d.getTime() >= habit.createdAt - 86_400_000;
    const done = isHabitDoneOnDate(habit, ds);
    const ratio = isMeasure
      ? Math.min(1, (habit.measurements[ds] ?? 0) / habit.target)
      : done ? 1 : 0;
    return { ds, sch, done, ratio };
  });

  const handleDotClick = (ds: string, sch: boolean) => {
    if (!sch) return;
    if (selDate === ds) { setSelDate(null); return; }
    setSelDate(ds);
    setHistInput(isMeasure ? (habit.measurements[ds] ?? 0) : 0);
  };

  const commitHistory = () => {
    if (!selDate) return;
    if (isMeasure) {
      onUpdate({ ...habit, measurements: { ...habit.measurements, [selDate]: histInput } });
    } else {
      const has = habit.completions.includes(selDate);
      onUpdate({
        ...habit,
        completions: has
          ? habit.completions.filter((d) => d !== selDate)
          : [...habit.completions, selDate],
      });
    }
    setSelDate(null);
  };

  const enterEdit = () => {
    setEName(habit.name); setEDesc(habit.description); setEArea(habit.area);
    setEFreq(habit.frequency); setEDays(habit.customDays);
    setEType(habit.type); setETarget(habit.target); setEUnit(habit.unit);
    setECue(habit.cue); setEReward(habit.reward); setELinked(habit.linkedGoalId);
    setMode("edit");
  };

  const saveEdit = () => {
    onUpdate({
      ...habit,
      name: eName.trim(), description: eDesc.trim(), area: eArea,
      frequency: eFreq, customDays: eFreq === "custom" ? eDays : [],
      type: eType, target: eType === "binary" ? 1 : eTarget,
      unit: eType === "binary" ? "" : eUnit.trim(),
      cue: eCue.trim(), reward: eReward.trim(), linkedGoalId: eLinked,
    });
    setMode("view");
  };

  const toggleEDay = (d: number) =>
    setEDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort());

  const close = () => { setMode("view"); setSelDate(null); onClose(); };
  const linkedGoal = goals.find((g) => g.id === habit.linkedGoalId);

  const fmtHistDate = (ds: string) => new Date(ds + "T00:00:00").toLocaleDateString("en-US",
    { weekday: "short", month: "short", day: "numeric" });

  return (
    <>
      <div onClick={close} style={backdrop} />
      <div style={sheetStyle}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            {mode === "view" ? (
              <>
                <span style={{
                  display: "inline-block", fontSize: "9px", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: area.color, backgroundColor: area.bg,
                  padding: "3px 8px", borderRadius: "20px", marginBottom: "6px",
                }}>
                  {area.label}
                </span>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917",
                  margin: 0, lineHeight: 1.4 }}>
                  {habit.name}
                </h2>
                {habit.description && (
                  <p style={{ fontSize: "12px", color: "#78716C", marginTop: "3px" }}>{habit.description}</p>
                )}
              </>
            ) : (
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#F97316", margin: 0 }}>Editing habit</p>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {mode === "view" && (
              <button onClick={enterEdit} title="Edit" style={iconBtnOrange}>
                <Pencil size={13} color="#F97316" />
              </button>
            )}
            <button onClick={close} style={iconBtn}><X size={15} color="#78716C" /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── EDIT MODE ───────────────────────────────────────── */}
          {mode === "edit" && (
            <>
              <EField label="Habit name">
                <input type="text" value={eName} onChange={(e) => setEName(e.target.value)}
                  style={inStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </EField>
              <EField label="Description">
                <input type="text" value={eDesc} onChange={(e) => setEDesc(e.target.value)}
                  style={inStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </EField>

              <EField label="Habit type">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {(["binary", "measurable"] as HabitType[]).map((t) => (
                    <button key={t} onClick={() => setEType(t)} style={{
                      padding: "10px 12px", borderRadius: "10px", textAlign: "left",
                      border: `1.5px solid ${eType === t ? "#F97316" : "#E8DDD0"}`,
                      backgroundColor: eType === t ? "#FFF7ED" : "#FFFFFF", cursor: "pointer",
                    }}>
                      <p style={{ fontSize: "12px", fontWeight: 700,
                        color: eType === t ? "#F97316" : "#1C1917", margin: 0 }}>
                        {t === "binary" ? "Yes / No" : "Measurable"}
                      </p>
                    </button>
                  ))}
                </div>
              </EField>

              {eType === "measurable" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <EField label="Daily target">
                    <input type="number" min={1} value={eTarget}
                      onChange={(e) => setETarget(Math.max(1, parseInt(e.target.value) || 1))}
                      style={inStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </EField>
                  <EField label="Unit">
                    <input type="text" value={eUnit} onChange={(e) => setEUnit(e.target.value)}
                      style={inStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                  </EField>
                </div>
              )}

              <EField label="Life area">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {AREAS.map((a) => {
                    const m = AREA_META[a];
                    return (
                      <button key={a} onClick={() => setEArea(a)} style={{
                        padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                        border: `1.5px solid ${eArea === a ? m.color : "#E8DDD0"}`,
                        backgroundColor: eArea === a ? m.bg : "#FFFFFF",
                        color: eArea === a ? m.color : "#78716C", cursor: "pointer",
                      }}>{m.label}</button>
                    );
                  })}
                </div>
              </EField>

              <EField label="How often?">
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {FREQS.map((f) => (
                    <button key={f} onClick={() => setEFreq(f)} style={{
                      padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                      border: `1.5px solid ${eFreq === f ? "#F97316" : "#E8DDD0"}`,
                      backgroundColor: eFreq === f ? "#FFF7ED" : "#FFFFFF",
                      color: eFreq === f ? "#F97316" : "#78716C", cursor: "pointer",
                    }}>{FREQ_LABEL[f]}</button>
                  ))}
                </div>
              </EField>

              {eFreq === "custom" && (
                <EField label="Which days?">
                  <div style={{ display: "flex", gap: "6px" }}>
                    {DAYS.map((day, i) => (
                      <button key={i} onClick={() => toggleEDay(i)} style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        fontSize: "10px", fontWeight: 700,
                        border: `1.5px solid ${eDays.includes(i) ? "#F97316" : "#E8DDD0"}`,
                        backgroundColor: eDays.includes(i) ? "#F97316" : "#FFFFFF",
                        color: eDays.includes(i) ? "#FFFFFF" : "#78716C", cursor: "pointer",
                      }}>{day[0]}</button>
                    ))}
                  </div>
                </EField>
              )}

              {goals.length > 0 && (
                <EField label="Link to goal">
                  <select value={eLinked} onChange={(e) => setELinked(e.target.value)}
                    style={{ ...inStyle, backgroundColor: "#FFFFFF" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}>
                    <option value="">— No goal —</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.outcome || g.statement}</option>
                    ))}
                  </select>
                </EField>
              )}

              <EField label="Cue — after I">
                <input type="text" value={eCue} onChange={(e) => setECue(e.target.value)}
                  style={inStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </EField>
              <EField label="Reward — I will">
                <input type="text" value={eReward} onChange={(e) => setEReward(e.target.value)}
                  style={inStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </EField>
            </>
          )}

          {/* ── VIEW MODE ───────────────────────────────────────── */}
          {mode === "view" && (
            <>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "6px" }}>
                <StatTile icon={<Flame size={16} color="#F97316" />}
                  label="Streak" value={`${streak}`} unit="days" accent="#F97316" />
                <StatTile icon={<Target size={16} color="#C9A84C" />}
                  label="Consistency" value={`${consistency}`} unit="%" accent="#C9A84C" />
                <StatTile icon={<Zap size={16} color="#7C3AED" />}
                  label="Best" value={`${bestStreak}`} unit="days" accent="#7C3AED" />
              </div>
              {isMeasure && (
                <p style={{ fontSize: "10px", color: "#A8A29E", marginBottom: "18px" }}>
                  Target: {habit.target} {habit.unit} / day
                </p>
              )}

              {/* Linked goal */}
              {linkedGoal && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "9px 12px", borderRadius: "8px",
                  backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
                  marginBottom: "20px",
                }}>
                  <Link2 size={13} color="#F97316" />
                  <p style={{ fontSize: "12px", color: "#9A3412", margin: 0, flex: 1,
                    fontWeight: 500, lineHeight: 1.4 }}>
                    Linked to: <strong>{linkedGoal.outcome || linkedGoal.statement}</strong>
                  </p>
                </div>
              )}

              {/* 8-week grid */}
              <Section title="History — click any day to edit">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} style={{ fontSize: "9px", fontWeight: 600,
                      color: "#A8A29E", textAlign: "center", marginBottom: "2px" }}>
                      {d}
                    </div>
                  ))}
                  {gridDots.map((dot, idx) => {
                    const isSelected = selDate === dot.ds;
                    const opacity = isMeasure
                      ? dot.ratio >= 1 ? 1 : dot.ratio > 0 ? 0.25 + dot.ratio * 0.75 : dot.sch ? 0.4 : 0.15
                      : dot.done ? 1 : dot.sch ? 0.4 : 0.15;
                    return (
                      <div
                        key={idx}
                        title={dot.ds}
                        onClick={() => handleDotClick(dot.ds, dot.sch)}
                        style={{
                          width: "100%", aspectRatio: "1", borderRadius: "3px",
                          backgroundColor: (isMeasure ? dot.ratio > 0 : dot.done)
                            ? area.color : dot.sch ? "#EDE5D8" : "#F7F4F0",
                          opacity,
                          cursor: dot.sch ? "pointer" : "default",
                          outline: isSelected ? `2px solid ${area.color}` : "none",
                          outlineOffset: "2px",
                          transition: "opacity 0.15s",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px", justifyContent: "flex-end" }}>
                  <Legend color={area.color} label={isMeasure ? "Full" : "Done"} />
                  {isMeasure && <Legend color={area.color} label="Partial" opacity={0.5} />}
                  <Legend color="#EDE5D8" label="Missed" opacity={0.8} />
                </div>
              </Section>

              {/* History inline editor */}
              {selDate && (
                <div style={{
                  padding: "14px 16px", borderRadius: "10px",
                  backgroundColor: "#FFFFFF", border: `1.5px solid ${area.color}`,
                  marginTop: "-12px", marginBottom: "20px",
                }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#1C1917", marginBottom: "10px" }}>
                    {fmtHistDate(selDate)}
                  </p>
                  {isMeasure ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button onClick={() => setHistInput((v) => Math.max(0, v - 1))} style={stepBtn}>−</button>
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <span style={{ fontSize: "24px", fontWeight: 800, color: area.color }}>{histInput}</span>
                        <span style={{ fontSize: "13px", color: "#78716C" }}> / {habit.target} {habit.unit}</span>
                      </div>
                      <button onClick={() => setHistInput((v) => v + 1)} style={{ ...stepBtn, backgroundColor: area.color, color: "#FFFFFF", border: "none" }}>+</button>
                      <button onClick={commitHistory} style={{
                        padding: "8px 14px", borderRadius: "8px", border: "none",
                        background: "linear-gradient(135deg, #F97316, #EA580C)",
                        fontSize: "12px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
                      }}>Save</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={commitHistory}
                        style={{
                          flex: 1, padding: "9px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                          border: `1.5px solid ${habit.completions.includes(selDate) ? "#FCA5A5" : "#86EFAC"}`,
                          backgroundColor: habit.completions.includes(selDate) ? "#FEF2F2" : "#F0FDF4",
                          color: habit.completions.includes(selDate) ? "#DC2626" : "#16A34A",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        }}>
                        {habit.completions.includes(selDate)
                          ? <><CheckCircle2 size={13} /> Mark as not done</>
                          : <><Circle size={13} /> Mark as done</>}
                      </button>
                      <button onClick={() => setSelDate(null)} style={{
                        padding: "9px 12px", borderRadius: "8px",
                        border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
                        fontSize: "12px", color: "#78716C", cursor: "pointer",
                      }}>Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {/* Habit loop */}
              {(habit.cue || habit.reward) && (
                <Section title="Habit loop">
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {habit.cue && <LoopRow label="Cue" value={`After I ${habit.cue}`} color="#2563EB" bg="#EFF6FF" />}
                    <LoopRow label="Routine" value={habit.name} color={area.color} bg={area.bg} />
                    {habit.reward && <LoopRow label="Reward" value={`I will ${habit.reward}`} color="#059669" bg="#ECFDF5" />}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #EDE5D8",
          display: "flex", gap: "10px",
          justifyContent: mode === "edit" ? "stretch" : "flex-end" }}>
          {mode === "edit" ? (
            <>
              <button onClick={() => setMode("view")} style={cancelBtn}>Cancel</button>
              <button onClick={saveEdit} disabled={!eName.trim()} style={{
                flex: 2, padding: "10px", borderRadius: "10px", border: "none",
                background: eName.trim() ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
                fontSize: "13px", fontWeight: 700,
                color: eName.trim() ? "#FFFFFF" : "#A8A29E",
                cursor: eName.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                <Check size={14} /> Save changes
              </button>
            </>
          ) : (
            <button onClick={() => { onDelete(habit.id); close(); }} style={deleteBtn}>
              Delete habit
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#A8A29E", marginBottom: "10px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#78716C", marginBottom: "6px" }}>{label}</p>
      {children}
    </div>
  );
}

function StatTile({ icon, label, value, unit, accent }: {
  icon: React.ReactNode; label: string; value: string; unit: string; accent: string;
}) {
  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: "10px",
      border: "1px solid #EDE5D8", padding: "12px 12px 10px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>{icon}</div>
      <p style={{ fontSize: "22px", fontWeight: 800, color: accent, lineHeight: 1, margin: 0 }}>
        {value}<span style={{ fontSize: "12px", fontWeight: 500, color: "#A8A29E" }}>{unit}</span>
      </p>
      <p style={{ fontSize: "9px", fontWeight: 600, color: "#A8A29E",
        textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "3px" }}>
        {label}
      </p>
    </div>
  );
}

function LoopRow({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 12px", borderRadius: "8px", backgroundColor: bg, border: `1px solid ${color}22` }}>
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color, minWidth: "52px" }}>
        {label}
      </span>
      <span style={{ fontSize: "12px", color: "#1C1917", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Legend({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: color, opacity }} />
      <span style={{ fontSize: "9px", color: "#A8A29E", fontWeight: 500 }}>{label}</span>
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
const iconBtnOrange: React.CSSProperties = { ...iconBtn, backgroundColor: "#FFF7ED", border: "1px solid #FED7AA" };
const cancelBtn: React.CSSProperties = {
  flex: 1, padding: "10px", borderRadius: "10px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
};
const deleteBtn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: "8px",
  border: "1.5px solid #FCA5A5", backgroundColor: "#FEF2F2",
  fontSize: "11px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
};
const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.3)",
  backdropFilter: "blur(2px)", zIndex: 40,
};
const sheetStyle: React.CSSProperties = {
  position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px,100vw)",
  backgroundColor: "#FAF5EE", borderLeft: "1px solid #EDE5D8",
  zIndex: 50, display: "flex", flexDirection: "column",
  boxShadow: "-8px 0 32px rgba(28,25,23,0.12)",
};
const stepBtn: React.CSSProperties = {
  width: "36px", height: "36px", borderRadius: "8px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "18px", fontWeight: 700, color: "#78716C",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
