"use client";

import { useState, useRef } from "react";
import { X, Plus, Trash2, AlertTriangle, Pencil, Check, Flame, CheckCircle2, Circle } from "lucide-react";
import DualSlider from "./DualSlider";
import type { GoalData, GoalNote, LifeArea } from "./GoalCard";
import type { HabitData } from "@/components/habits/HabitCard";
import { AREA_META as HABIT_AREA_META, calcStreak, isHabitDoneOnDate, toLocalDate } from "@/components/habits/HabitCard";

// ── Constants ────────────────────────────────────────────────────────────────
const AREA_COLOR: Record<LifeArea, string> = {
  professional:  "#2563EB",
  contribution:  "#7C3AED",
  wealth:        "#C9A84C",
  spiritual:     "#059669",
  personal:      "#DB2777",
  relationships: "#EA580C",
  health:        "#DC2626",
};

const AREA_LABEL: Record<LifeArea, string> = {
  professional:  "Professional",
  contribution:  "Contribution",
  wealth:        "Wealth",
  spiritual:     "Spiritual",
  personal:      "Personal Growth",
  relationships: "Relationships",
  health:        "Health",
};

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

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTs(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function daysUntil(isoDate: string) {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysSinceMoved(ts: number) {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function buildStatement(outcome: string, metric: string, unit: string, date: string, connector: string) {
  return [outcome.trim(), connector, metric.trim(), unit.trim(), "by", fmtDate(date)]
    .filter(Boolean).join(" ");
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  goal:         GoalData | null;
  linkedHabits: HabitData[];
  onClose: () => void;
  onUpdate: (updated: GoalData) => void;
  onDelete: (id: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GoalDetailSheet({ goal, linkedHabits, onClose, onUpdate, onDelete }: Props) {
  const [mode,     setMode]     = useState<"view" | "edit">("view");
  const [noteText, setNoteText] = useState("");

  // Edit form state — seeded from goal when entering edit mode
  const [eOutcome,   setEOutcome]   = useState("");
  const [eMetric,    setEMetric]    = useState("");
  const [eUnit,      setEUnit]      = useState("");
  const [eConnector, setEConnector] = useState(CONNECTORS[0]);
  const [eDeadline,  setEDeadline]  = useState("");
  const [eArea,      setEArea]      = useState<LifeArea>("professional");

  const noteRef = useRef<HTMLTextAreaElement>(null);

  if (!goal) return null;

  const daysLeft = daysUntil(goal.deadline);
  const stale    = daysSinceMoved(goal.lastMoved) >= 14;
  const color    = AREA_COLOR[goal.area];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const enterEdit = () => {
    setEOutcome(goal.outcome);
    setEMetric(goal.metric);
    setEUnit(goal.metricUnit);
    setEConnector(goal.statement.includes("by achieving") ? "by achieving"
      : CONNECTORS.find((c) => goal.statement.includes(c)) ?? CONNECTORS[0]);
    setEDeadline(goal.deadline);
    setEArea(goal.area);
    setMode("edit");
  };

  const saveEdit = () => {
    const statement = buildStatement(eOutcome, eMetric, eUnit, eDeadline, eConnector);
    onUpdate({
      ...goal,
      outcome:    eOutcome.trim(),
      metric:     eMetric.trim(),
      metricUnit: eUnit.trim(),
      deadline:   eDeadline,
      area:       eArea,
      statement,
    });
    setMode("view");
  };

  const handleProgress = (v: number) => {
    onUpdate({ ...goal, progress: v, lastMoved: Date.now(), velocity: v - goal.progress });
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const note: GoalNote = { id: crypto.randomUUID(), text: noteText.trim(), timestamp: Date.now() };
    onUpdate({ ...goal, notes: [note, ...goal.notes] });
    setNoteText("");
  };

  const deleteNote = (id: string) =>
    onUpdate({ ...goal, notes: goal.notes.filter((n) => n.id !== id) });

  const editStatement = buildStatement(eOutcome, eMetric, eUnit, eDeadline, eConnector);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { setMode("view"); onClose(); }}
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
        width: "min(480px, 100vw)",
        backgroundColor: "#FAF5EE",
        borderLeft: "1px solid #EDE5D8",
        zIndex: 50,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(28,25,23,0.12)",
      }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "flex-start", gap: "10px",
        }}>
          <div style={{ flex: 1 }}>
            {mode === "view" ? (
              <>
                <span style={{
                  display: "inline-block",
                  fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color,
                  backgroundColor: `${color}18`,
                  padding: "3px 8px", borderRadius: "20px", marginBottom: "6px",
                }}>
                  {AREA_LABEL[goal.area]}
                </span>
                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917",
                  margin: 0, lineHeight: 1.45 }}>
                  {goal.statement}
                </h2>
              </>
            ) : (
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#F97316", margin: 0 }}>
                Editing goal
              </p>
            )}
          </div>

          {/* Edit / Close buttons */}
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {mode === "view" && (
              <button
                onClick={enterEdit}
                title="Edit goal"
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Pencil size={13} color="#F97316" />
              </button>
            )}
            <button
              onClick={() => { setMode("view"); onClose(); }}
              style={{
                width: "32px", height: "32px", borderRadius: "8px",
                backgroundColor: "#F5F0EB", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <X size={15} color="#78716C" />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── EDIT MODE ─────────────────────────────────────────── */}
          {mode === "edit" && (
            <>
              {/* Life Area */}
              <EditField label="Life Area">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {AREAS.map((a) => (
                    <button key={a.value} onClick={() => setEArea(a.value)} style={{
                      padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                      border: `1.5px solid ${eArea === a.value ? "#F97316" : "#E8DDD0"}`,
                      backgroundColor: eArea === a.value ? "#FFF7ED" : "#FFFFFF",
                      color: eArea === a.value ? "#F97316" : "#78716C",
                      cursor: "pointer",
                    }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </EditField>

              {/* Outcome */}
              <EditField label="What do you want to achieve?">
                <textarea
                  value={eOutcome}
                  onChange={(e) => setEOutcome(e.target.value)}
                  rows={2}
                  style={taStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
                />
              </EditField>

              {/* Metric + Unit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <EditField label="Measurable target">
                  <input type="text" value={eMetric} onChange={(e) => setEMetric(e.target.value)}
                    style={inStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                </EditField>
                <EditField label="Unit (optional)">
                  <input type="text" value={eUnit} onChange={(e) => setEUnit(e.target.value)}
                    style={inStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
                </EditField>
              </div>

              {/* Connector */}
              <EditField label="Statement connector">
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {CONNECTORS.map((c) => (
                    <button key={c} onClick={() => setEConnector(c)} style={{
                      padding: "4px 10px", borderRadius: "20px", fontSize: "11px",
                      border: `1.5px solid ${eConnector === c ? "#F97316" : "#E8DDD0"}`,
                      backgroundColor: eConnector === c ? "#FFF7ED" : "#FFFFFF",
                      color: eConnector === c ? "#F97316" : "#78716C",
                      cursor: "pointer", fontWeight: eConnector === c ? 600 : 400,
                    }}>
                      {c}
                    </button>
                  ))}
                </div>
              </EditField>

              {/* Deadline */}
              <EditField label="Target date">
                <input type="date" value={eDeadline} onChange={(e) => setEDeadline(e.target.value)}
                  style={{ ...inStyle, colorScheme: "light" as React.CSSProperties["colorScheme"] }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }} />
              </EditField>

              {/* Statement preview */}
              {editStatement.length > 10 && (
                <div style={{
                  padding: "12px 14px", borderRadius: "10px",
                  background: "linear-gradient(135deg, #FFF7ED, #FEFCE8)",
                  border: "1px solid #FED7AA", marginBottom: "8px",
                }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#F97316", marginBottom: "5px" }}>
                    New statement
                  </p>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#1C1917",
                    lineHeight: 1.5, margin: 0 }}>
                    {editStatement}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── VIEW MODE ─────────────────────────────────────────── */}
          {mode === "view" && (
            <>
              {/* Stale alert */}
              {stale && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 12px", borderRadius: "8px",
                  backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
                  marginBottom: "18px",
                }}>
                  <AlertTriangle size={14} color="#F97316" />
                  <p style={{ fontSize: "12px", color: "#9A3412", margin: 0, lineHeight: 1.4 }}>
                    <strong>No progress logged in {daysSinceMoved(goal.lastMoved)} days.</strong>{" "}
                    Update your slider to reflect where you are today.
                  </p>
                </div>
              )}

              {/* Progress number */}
              <div style={{
                textAlign: "center", padding: "20px 0 18px",
                borderBottom: "1px solid #EDE5D8", marginBottom: "20px",
              }}>
                <div style={{ lineHeight: 1 }}>
                  <span style={{
                    fontSize: "72px", fontWeight: 800,
                    color: goal.progress >= 80 ? "#C9A84C" : "#F97316",
                  }}>
                    {goal.progress}
                  </span>
                  <span style={{ fontSize: "30px", fontWeight: 600, color: "#A8A29E" }}>%</span>
                </div>
                <p style={{ fontSize: "12px", color: "#78716C", marginTop: "6px" }}>
                  {daysLeft > 0
                    ? `${daysLeft} days remaining`
                    : daysLeft === 0 ? "Due today"
                    : `${Math.abs(daysLeft)} days overdue`}
                </p>
              </div>

              {/* Slider */}
              <Section title="Update progress">
                <DualSlider
                  value={goal.progress}
                  onChange={handleProgress}
                  startLabel="Not started"
                  endLabel="Complete"
                />
              </Section>

              {/* Timeline */}
              <Section title="Timeline">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <InfoPill label="Target date"
                    value={new Date(goal.deadline).toLocaleDateString("en-US",
                      { year: "numeric", month: "short", day: "numeric" })} />
                  <InfoPill label="Created"
                    value={new Date(goal.createdAt).toLocaleDateString("en-US",
                      { year: "numeric", month: "short", day: "numeric" })} />
                </div>
              </Section>

              {/* Linked habits */}
              {linkedHabits.length > 0 && (
                <Section title={`Linked habits (${linkedHabits.length})`}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {linkedHabits.map((h) => {
                      const hMeta   = HABIT_AREA_META[h.area];
                      const hDone   = isHabitDoneOnDate(h, toLocalDate());
                      const hStreak = calcStreak(h);
                      const isMeasure = h.type === "measurable";
                      const todayVal  = isMeasure ? (h.measurements[toLocalDate()] ?? 0) : 0;
                      return (
                        <div key={h.id} style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "10px 12px", borderRadius: "8px",
                          backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8",
                        }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%",
                            backgroundColor: hMeta.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917",
                              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {h.name}
                            </p>
                            <p style={{ fontSize: "10px", color: "#A8A29E", margin: "2px 0 0" }}>
                              {isMeasure ? `${todayVal}/${h.target} ${h.unit} today` : ""}
                            </p>
                          </div>
                          {hStreak > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "3px",
                              fontSize: "10px", fontWeight: 700, color: "#F97316" }}>
                              <Flame size={11} color="#F97316" /> {hStreak}d
                            </div>
                          )}
                          <div style={{
                            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                            backgroundColor: hDone ? "#16A34A" : "#F5F0EB",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {hDone
                              ? <CheckCircle2 size={16} color="#FFFFFF" />
                              : <Circle size={14} color="#A8A29E" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Notes */}
              <Section title="Progress notes">
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <textarea
                    ref={noteRef}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Log an update, obstacle, or win…"
                    rows={2}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
                    style={{
                      flex: 1, padding: "8px 10px", borderRadius: "8px",
                      border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
                      fontSize: "12px", color: "#1C1917", resize: "none",
                      outline: "none", lineHeight: 1.5, fontFamily: "inherit",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#F97316"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "#E8DDD0"; }}
                  />
                  <button
                    onClick={addNote}
                    disabled={!noteText.trim()}
                    style={{
                      alignSelf: "flex-end", width: "34px", height: "34px",
                      borderRadius: "8px", border: "none", flexShrink: 0,
                      background: noteText.trim() ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
                      cursor: noteText.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    <Plus size={14} color={noteText.trim() ? "#FFFFFF" : "#A8A29E"} />
                  </button>
                </div>

                {goal.notes.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#A8A29E", textAlign: "center", padding: "16px 0" }}>
                    No notes yet. Log your first update above.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {goal.notes.map((note) => (
                      <div key={note.id} style={{
                        backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8",
                        borderRadius: "8px", padding: "10px 12px", position: "relative",
                      }}>
                        <p style={{ fontSize: "12px", color: "#1C1917", lineHeight: 1.5,
                          margin: 0, paddingRight: "20px" }}>
                          {note.text}
                        </p>
                        <p style={{ fontSize: "9px", color: "#A8A29E", marginTop: "4px" }}>
                          {fmtTs(note.timestamp)}
                        </p>
                        <button
                          onClick={() => deleteNote(note.id)}
                          style={{
                            position: "absolute", top: "8px", right: "8px",
                            width: "20px", height: "20px", borderRadius: "4px",
                            border: "none", backgroundColor: "transparent",
                            cursor: "pointer", display: "flex",
                            alignItems: "center", justifyContent: "center", opacity: 0.4,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.4"; }}
                        >
                          <Trash2 size={11} color="#DC2626" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid #EDE5D8",
          display: "flex", gap: "10px",
          justifyContent: mode === "edit" ? "stretch" : "flex-end",
        }}>
          {mode === "edit" ? (
            <>
              <button
                onClick={() => setMode("view")}
                style={{
                  flex: 1, padding: "10px", borderRadius: "10px",
                  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
                  fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
                }}>
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!eOutcome.trim() || !eMetric.trim() || !eDeadline}
                style={{
                  flex: 2, padding: "10px", borderRadius: "10px", border: "none",
                  background: eOutcome.trim() && eMetric.trim() && eDeadline
                    ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
                  fontSize: "13px", fontWeight: 700,
                  color: eOutcome.trim() && eMetric.trim() && eDeadline ? "#FFFFFF" : "#A8A29E",
                  cursor: eOutcome.trim() && eMetric.trim() && eDeadline ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}>
                <Check size={14} /> Save changes
              </button>
            </>
          ) : (
            <button
              onClick={() => { onDelete(goal.id); onClose(); }}
              style={{
                padding: "8px 16px", borderRadius: "8px",
                border: "1.5px solid #FCA5A5", backgroundColor: "#FEF2F2",
                fontSize: "11px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
              }}>
              Delete goal
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
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

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600,
        color: "#78716C", marginBottom: "6px", letterSpacing: "0.03em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "8px",
      backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8" }}>
      <p style={{ fontSize: "9px", fontWeight: 600, color: "#A8A29E",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
        {label}
      </p>
      <p style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917", margin: 0 }}>
        {value}
      </p>
    </div>
  );
}

const inStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "8px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s",
};

const taStyle: React.CSSProperties = {
  ...inStyle, resize: "none", lineHeight: 1.5,
};
