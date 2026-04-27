"use client";

import { useState } from "react";
import { Zap, Smile, Minus, CloudRain, Flame, X, CheckCircle2, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EveningReflection, MoodEmoji, DayPlan, DecisionEntry } from "@/lib/dayTypes";
import type { HabitData } from "@/components/habits/HabitCard";
import { AREA_META, isHabitDoneOnDate } from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { WeekEvent, EventGroup } from "@/lib/weeklyTypes";

interface Props {
  date:           string;
  reflection:     EveningReflection;
  onUpdate:       (r: EveningReflection) => void;
  plan:           DayPlan;
  onUpdatePlan:   (d: DayPlan) => void;
  habits:         HabitData[];
  onToggleHabit:  (id: string) => void;
  onStepHabit:    (id: string, delta: number) => void;
  tasks:          TaskData[];
  onCompleteTask: (id: string) => void;
  events:         WeekEvent[];
  eventGroups:    EventGroup[];
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function getEnergyAccent(n: number): { color: string; label: string } {
  if (n <= 2) return { color: "#E24B4A", label: "Rough" };
  if (n <= 4) return { color: "#EF9F27", label: "Low" };
  if (n <= 6) return { color: "#F0997B", label: "Okay" };
  if (n <= 8) return { color: "#5DCAA5", label: "Good" };
  return { color: "#97C459", label: "Peak" };
}

const MOOD_CONFIG: { emoji: MoodEmoji; label: string; color: string; tint: string; Icon: LucideIcon }[] = [
  { emoji: "😤", label: "Rough",   color: "#E24B4A", tint: "#3A1818", Icon: Flame     },
  { emoji: "😔", label: "Low",     color: "#EF9F27", tint: "#3A2A10", Icon: CloudRain },
  { emoji: "😐", label: "Okay",    color: "#F0997B", tint: "#3A1F18", Icon: Minus     },
  { emoji: "😊", label: "Good",    color: "#5DCAA5", tint: "#0F2E25", Icon: Smile     },
  { emoji: "🤩", label: "Amazing", color: "#97C459", tint: "#1F2E15", Icon: Zap       },
];

const A = {
  tasks:      "#C084FC",
  habits:     "#97C459",
  grateful:   "#AFA9EC",
  wins:       "#5DCAA5",
  highlights: "#EF9F27",
  decisions:  "#85B7EB",
  action:     "#6C5DD3",
} as const;

const B = {
  pageBg:    "#E8E6F5",
  cardBg:    "#0F0E1A",
  fieldBg:   "#1A1830",
  border:    "#2A2740",
  text:      "#F5F4FB",
  secondary: "#9893B8",
  muted:     "#5A5577",
  label:     "#7C75B5",
} as const;

// All 6 big cards share this height
const CARD_H = "260px";

// ── Component ─────────────────────────────────────────────────────────────────

export default function EveningReflectionComponent({
  date, reflection, onUpdate,
  plan, onUpdatePlan,
  habits, onToggleHabit, onStepHabit,
  tasks, onCompleteTask,
  events, eventGroups,
}: Props) {
  const [newDecision, setNewDecision] = useState("");
  const [evIdx, setEvIdx] = useState(0);

  function updateWin(idx: number, val: string) {
    const wins = [...reflection.wins] as [string, string, string];
    wins[idx] = val;
    onUpdate({ ...reflection, wins });
  }
  function addDecision() {
    const text = newDecision.trim();
    if (!text) return;
    const entry: DecisionEntry = { id: crypto.randomUUID(), text, made: false, createdAt: Date.now() };
    onUpdatePlan({ ...plan, decisions: [...plan.decisions, entry] });
    setNewDecision("");
  }
  function toggleDecision(id: string) {
    onUpdatePlan({ ...plan, decisions: plan.decisions.map((d) => d.id === id ? { ...d, made: !d.made } : d) });
  }
  function deleteDecision(id: string) {
    onUpdatePlan({ ...plan, decisions: plan.decisions.filter((d) => d.id !== id) });
  }

  const { color: energyCol, label: energyLbl } = getEnergyAccent(reflection.energyLevel);
  const energyPct  = ((reflection.energyLevel - 1) / 9) * 100;
  const moodAccent = MOOD_CONFIG.find((m) => m.emoji === reflection.mood)?.color ?? B.label;
  const doneCount  = habits.filter((h) => isHabitDoneOnDate(h, date)).length;
  const habitPct   = habits.length > 0 ? (doneCount / habits.length) * 100 : 0;
  const doneTasks  = tasks.filter((t) => t.status !== "open").length;

  return (
    <>
      <style>{`
        .ev-slider {
          -webkit-appearance: none; appearance: none;
          height: 6px; border-radius: 3px;
          outline: none; cursor: pointer; width: 100%; border: none; display: block;
        }
        .ev-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--ec); border: 2px solid #0F0E1A; cursor: pointer; margin-top: -5px;
        }
        .ev-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; }
        .ev-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--ec); border: 2px solid #0F0E1A; cursor: pointer;
        }
        .ev-ta::placeholder  { color: #5A5577; font-size: 14px; line-height: 1.6; }
        .ev-ta:focus  { outline: none; }
        .ev-in::placeholder  { color: #5A5577; }
        .ev-in:focus  { outline: none; }
        .ev-dec::placeholder { color: #5A5577; }
        .ev-dec:focus { outline: none; }
      `}</style>

      <div style={{ flex: 1, overflowY: "auto", backgroundColor: B.pageBg }}>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px", boxSizing: "border-box" }}>

          {/* ════════ TOP ROW: Energy + Mood ════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* Energy Level */}
            <div style={card(energyCol)}>
              <CardHeader color={energyCol} label="Energy Level" />
              <div style={{ backgroundColor: B.fieldBg, borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, border: `2px solid ${energyCol}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "18px", fontWeight: 500, color: "#F5F4FB", lineHeight: 1 }}>{reflection.energyLevel}</span>
                    <span style={{ fontSize: "8px", color: "#7C75B5", lineHeight: 1.4 }}>/10</span>
                  </div>
                  <div>
                    <p style={{ fontSize: "16px", fontWeight: 500, color: energyCol, margin: 0 }}>{energyLbl}</p>
                    <p style={{ fontSize: "12px", color: "#7C75B5", margin: "3px 0 0" }}>Mid-day energy</p>
                  </div>
                </div>
              </div>
              <input
                type="range" min={1} max={10}
                value={reflection.energyLevel}
                onChange={(e) => onUpdate({ ...reflection, energyLevel: Number(e.target.value) })}
                className="ev-slider"
                style={{ "--ec": energyCol, background: `linear-gradient(to right, ${energyCol} ${energyPct}%, ${B.fieldBg} ${energyPct}%)` } as React.CSSProperties}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span style={{ fontSize: "10px", color: B.muted }}>1 — Exhausted</span>
                <span style={{ fontSize: "10px", color: B.muted }}>10 — Peak</span>
              </div>
            </div>

            {/* Mood */}
            <div style={card(moodAccent)}>
              <CardHeader color={moodAccent} label="Mood" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                {MOOD_CONFIG.map((m) => {
                  const selected = reflection.mood === m.emoji;
                  return (
                    <button key={m.emoji} onClick={() => onUpdate({ ...reflection, mood: selected ? "" : m.emoji })} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: "5px", padding: "10px 4px", borderRadius: "8px",
                      border: `${selected ? "1px" : "0.5px"} solid ${selected ? m.color : B.border}`,
                      backgroundColor: selected ? m.tint : B.fieldBg, cursor: "pointer",
                    }}>
                      <m.Icon size={16} color={selected ? m.color : B.label} />
                      <span style={{ fontSize: "10px", fontWeight: selected ? 500 : 400, color: selected ? m.color : B.label, lineHeight: 1 }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ════════ 3×2 GRID: 6 equal cards ════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>

            {/* Row 1 — Grateful · Highlights · Tasks */}

            {/* I Am Grateful For */}
            <div style={{ ...card(A.grateful), height: CARD_H }}>
              <CardHeader color={A.grateful} label="I Am Grateful For…" />
              <textarea
                value={plan.gratitude}
                onChange={(e) => onUpdatePlan({ ...plan, gratitude: e.target.value })}
                placeholder="What are you grateful for today?"
                className="ev-ta"
                style={taStyle}
              />
            </div>

            {/* Highlights of the Day */}
            <div style={{ ...card(A.highlights), height: CARD_H }}>
              <CardHeader color={A.highlights} label="Highlights of the Day" />

              {/* Event navigator */}
              {(() => {
                const clamp = Math.max(0, Math.min(evIdx, events.length - 1));
                const ev    = events[clamp];
                const grpColor = ev ? (eventGroups.find((g) => g.id === ev.groupId)?.color ?? B.label) : B.label;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: B.fieldBg, borderRadius: "10px", padding: "8px 10px", marginBottom: "10px", flexShrink: 0 }}>
                    <button
                      onClick={() => setEvIdx((i) => Math.max(0, i - 1))}
                      disabled={events.length === 0 || clamp === 0}
                      style={{ ...evNavBtn, opacity: (events.length === 0 || clamp === 0) ? 0.3 : 1 }}
                    >‹</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {ev ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: grpColor, flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", fontWeight: 600, color: B.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                          </div>
                          <p style={{ fontSize: "10px", color: B.secondary, margin: "3px 0 0", paddingLeft: "12px" }}>{ev.startTime} – {ev.endTime}</p>
                        </>
                      ) : (
                        <span style={{ fontSize: "12px", color: B.muted, fontStyle: "italic" }}>No events today</span>
                      )}
                    </div>
                    {events.length > 0 && (
                      <span style={{ fontSize: "10px", color: B.muted, flexShrink: 0 }}>{clamp + 1}/{events.length}</span>
                    )}
                    <button
                      onClick={() => setEvIdx((i) => Math.min(events.length - 1, i + 1))}
                      disabled={events.length === 0 || clamp === events.length - 1}
                      style={{ ...evNavBtn, opacity: (events.length === 0 || clamp === events.length - 1) ? 0.3 : 1 }}
                    >›</button>
                  </div>
                );
              })()}

              <textarea
                value={reflection.highlights}
                onChange={(e) => onUpdate({ ...reflection, highlights: e.target.value })}
                placeholder="What stood out today? Moments, conversations, breakthroughs…"
                className="ev-ta"
                style={taStyle}
              />
            </div>

            {/* Today's Tasks */}
            <div style={{ ...card(A.tasks), height: CARD_H }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.tasks }} />
                  <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color: A.tasks }}>Today&apos;s Tasks</span>
                </div>
                {tasks.length > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: 500, color: A.tasks, backgroundColor: "#2A1A3A", borderRadius: "10px", padding: "3px 8px" }}>
                    {doneTasks}/{tasks.length}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
                {tasks.length === 0
                  ? <p style={{ fontSize: "12px", color: B.muted, margin: 0, fontStyle: "italic" }}>No tasks for today…</p>
                  : tasks.map((t) => {
                      const done = t.status !== "open";
                      return (
                        <button key={t.id} onClick={() => { if (!done) onCompleteTask(t.id); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 11px", borderRadius: "9px", border: `0.5px solid ${done ? A.tasks + "50" : B.border}`, backgroundColor: done ? A.tasks + "15" : B.fieldBg, cursor: done ? "default" : "pointer", textAlign: "left", flexShrink: 0 }}>
                          {done ? <CheckCircle2 size={15} color={A.tasks} style={{ flexShrink: 0 }} /> : <Circle size={15} color={B.secondary} style={{ flexShrink: 0 }} />}
                          <span style={{ fontSize: "12px", fontWeight: 600, color: done ? B.secondary : B.text, textDecoration: done ? "line-through" : "none" }}>{t.title}</span>
                        </button>
                      );
                    })
                }
              </div>
            </div>

            {/* Row 2 — Habits · Wins · Decisions */}

            {/* Today's Habits */}
            <div style={{ ...card(A.habits), height: CARD_H }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.habits }} />
                  <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color: A.habits }}>Today&apos;s Habits</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 500, color: A.habits, backgroundColor: "#1F2E15", borderRadius: "10px", padding: "3px 8px" }}>
                  {doneCount}/{habits.length}
                </span>
              </div>
              <div style={{ height: 4, backgroundColor: B.fieldBg, borderRadius: "2px", overflow: "hidden", marginBottom: "10px", flexShrink: 0 }}>
                <div style={{ height: "100%", width: `${habitPct}%`, backgroundColor: A.habits, borderRadius: "2px", transition: "width 0.3s" }} />
              </div>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
                {habits.length === 0
                  ? <p style={{ fontSize: "12px", color: B.muted, margin: 0, fontStyle: "italic" }}>No habits scheduled…</p>
                  : habits.map((h) => {
                      const done   = isHabitDoneOnDate(h, date);
                      const aColor = AREA_META[h.area]?.color ?? A.habits;
                      if (h.type === "measurable") {
                        const current = h.measurements[date] ?? 0;
                        const pct     = Math.min(1, h.target > 0 ? current / h.target : 0);
                        return (
                          <div key={h.id} style={{ padding: "9px 11px", borderRadius: "9px", border: `0.5px solid ${done ? aColor + "50" : B.border}`, backgroundColor: done ? aColor + "15" : B.fieldBg, flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: done ? B.text : B.secondary, flex: 1, marginRight: "8px" }}>{h.name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <button onClick={() => onStepHabit(h.id, -1)} style={stepBtn}>−</button>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: done ? B.text : B.secondary, minWidth: "44px", textAlign: "center" }}>{current}/{h.target}{h.unit ? ` ${h.unit}` : ""}</span>
                                <button onClick={() => onStepHabit(h.id, +1)} style={stepBtn}>+</button>
                              </div>
                            </div>
                            <div style={{ height: 3, borderRadius: "2px", backgroundColor: B.border, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: aColor, borderRadius: "2px", transition: "width 0.2s" }} />
                            </div>
                          </div>
                        );
                      }
                      return (
                        <button key={h.id} onClick={() => onToggleHabit(h.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 11px", borderRadius: "9px", border: `0.5px solid ${done ? aColor + "50" : B.border}`, backgroundColor: done ? aColor + "18" : B.fieldBg, cursor: "pointer", textAlign: "left", flexShrink: 0 }}>
                          {done ? <CheckCircle2 size={15} color={aColor} style={{ flexShrink: 0 }} /> : <Circle size={15} color={B.secondary} style={{ flexShrink: 0 }} />}
                          <span style={{ fontSize: "12px", fontWeight: 600, color: done ? B.text : B.secondary }}>{h.name}</span>
                        </button>
                      );
                    })
                }
              </div>
            </div>

            {/* Three Wins Today */}
            <div style={{ ...card(A.wins), height: CARD_H }}>
              <CardHeader color={A.wins} label="Three Wins Today" />
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
                {([0, 1, 2] as const).map((idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: B.fieldBg, borderRadius: "8px", padding: "10px 12px", border: `0.5px solid ${B.border}`, flexShrink: 0 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, backgroundColor: "#0F2E25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 500, color: "#5DCAA5" }}>
                      {idx + 1}
                    </span>
                    <input
                      value={reflection.wins[idx]}
                      onChange={(e) => updateWin(idx, e.target.value)}
                      placeholder={`Win ${idx + 1}…`}
                      className="ev-in"
                      style={{ flex: 1, background: "none", border: "none", fontSize: "13px", color: B.text, outline: "none", fontFamily: "inherit" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Log */}
            <div style={{ ...card(A.decisions), height: CARD_H }}>
              <CardHeader color={A.decisions} label="Decision Log" />
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexShrink: 0 }}>
                <input
                  value={newDecision}
                  onChange={(e) => setNewDecision(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addDecision(); }}
                  placeholder="Add a decision…"
                  className="ev-dec"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: `0.5px solid ${B.border}`, backgroundColor: B.fieldBg, fontSize: "13px", color: B.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
                <button onClick={addDecision} style={{ width: 36, height: 36, borderRadius: "8px", border: "none", backgroundColor: A.action, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1 }}>+</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
                {plan.decisions.length === 0
                  ? <p style={{ fontSize: "12px", color: B.muted, margin: 0, fontStyle: "italic" }}>No decisions yet…</p>
                  : plan.decisions.map((dec) => (
                      <div key={dec.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px 10px", borderRadius: "8px", border: `0.5px solid ${dec.made ? A.decisions + "40" : B.border}`, backgroundColor: dec.made ? A.decisions + "0D" : B.fieldBg, flexShrink: 0 }}>
                        <button onClick={() => toggleDecision(dec.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: "1px" }}>
                          {dec.made ? <CheckCircle2 size={14} color={A.decisions} /> : <Circle size={14} color={B.secondary} />}
                        </button>
                        <span style={{ flex: 1, fontSize: "12px", lineHeight: 1.4, color: dec.made ? B.secondary : B.text, textDecoration: dec.made ? "line-through" : "none" }}>{dec.text}</span>
                        <button onClick={() => deleteDecision(dec.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: "2px" }}>
                          <X size={11} color={B.muted} />
                        </button>
                      </div>
                    ))
                }
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CardHeader({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexShrink: 0 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", color }}>
        {label}
      </span>
    </div>
  );
}

function card(accentColor: string): React.CSSProperties {
  return {
    backgroundColor: "#0F0E1A",
    borderRadius: "14px",
    padding: "18px",
    border: "0.5px solid #2A2740",
    borderTop: `2px solid ${accentColor}`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
}

const taStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: "100%",
  backgroundColor: "#1A1830",
  borderRadius: "10px",
  padding: "14px",
  border: "0.5px solid #2A2740",
  fontSize: "14px",
  color: "#F5F4FB",
  lineHeight: 1.6,
  resize: "none",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const stepBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "6px",
  border: "0.5px solid #2A2740", backgroundColor: "#2A2740",
  color: "#9893B8", cursor: "pointer", fontSize: "13px",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, fontWeight: 700, lineHeight: 1,
};

const evNavBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "6px",
  border: "0.5px solid #2A2740", backgroundColor: "#2A2740",
  color: "#9893B8", cursor: "pointer", fontSize: "15px",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, lineHeight: 1, padding: 0,
};
