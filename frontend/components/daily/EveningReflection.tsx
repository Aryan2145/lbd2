"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, Smile, Minus, CloudRain, Flame, X, CheckCircle2, Circle, Save, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EveningReflection, MoodEmoji, DecisionEntry, StuckEntry } from "@/lib/dayTypes";
import type { HabitData } from "@/components/habits/HabitCard";
import { AREA_META, isHabitDoneOnDate, calcStreak } from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { WeekEvent, EventGroup } from "@/lib/weeklyTypes";

interface Props {
  date:           string;
  reflection:     EveningReflection;
  onUpdate:       (r: EveningReflection) => void;
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
  { emoji: "😤", label: "Rough",   color: "#F87171", tint: "#FEE2E2", Icon: Flame     },
  { emoji: "😔", label: "Low",     color: "#FBBF24", tint: "#FEF3C7", Icon: CloudRain },
  { emoji: "😐", label: "Okay",    color: "#FB923C", tint: "#FFF3EA", Icon: Minus     },
  { emoji: "😊", label: "Good",    color: "#34D399", tint: "#DCFCE7", Icon: Smile     },
  { emoji: "🤩", label: "Amazing", color: "#A3E635", tint: "#ECFCCB", Icon: Zap       },
];

const A = {
  tasks:      "#C084FC",
  habits:     "#97C459",
  grateful:   "#AFA9EC",
  wins:       "#5DCAA5",
  highlights: "#EF9F27",
  decisions:  "#85B7EB",
  stuck:      "#F87171",
  action:     "#6C5DD3",
} as const;

const B = {
  pageBg:    "#FFFFFF",
  cardBg:    "#FFFFFF",
  fieldBg:   "#FFFFFF",
  border:    "#EADFD3",
  text:      "#1F2933",
  secondary: "#374151",
  muted:     "#6B7280",
  label:     "#374151",
} as const;

const CARD_H = "260px";

// ── Arc gauge constants (square 200×200 viewBox) ──────────────────────────────

const CX = 100, CY = 100, ARC_R = 82;
const ARC_START = 225;
const ARC_SWEEP = 270;

function arcPt(deg: number, r = ARC_R): [number, number] {
  const rad = deg * Math.PI / 180;
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
}

function buildArc(startDeg: number, sweepDeg: number): string {
  if (sweepDeg < 0.3) return "";
  const endNorm = ((startDeg + sweepDeg) % 360 + 360) % 360;
  const [x1, y1] = arcPt(startDeg);
  const [x2, y2] = arcPt(endNorm);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${ARC_R} ${ARC_R} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function compassToEnergy(compassDeg: number): number {
  let rel = ((compassDeg - ARC_START) + 360) % 360;
  if (rel > ARC_SWEEP) rel = rel > ARC_SWEEP + (360 - ARC_SWEEP) / 2 ? 0 : ARC_SWEEP;
  return Math.round(Math.max(1, Math.min(10, 1 + (rel / ARC_SWEEP) * 9)));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EveningReflectionComponent({
  date, reflection, onUpdate,
  habits, onToggleHabit, onStepHabit,
  tasks, onCompleteTask,
  events, eventGroups,
}: Props) {
  const [newDecision, setNewDecision] = useState("");
  const [evIdx,       setEvIdx]       = useState(0);
  const arcDragging = useRef(false);

  // ── Per-card local states (text-heavy cards only) ──
  const [localWins,      setLocalWins]      = useState<string[]>(reflection.wins.length > 0 ? reflection.wins : [""]);
  const [localGratitude, setLocalGratitude] = useState(reflection.gratitude ?? "");
  const [localHighlights,setLocalHighlights]= useState(reflection.highlights ?? "");
  const [localStuck,     setLocalStuck]     = useState<StuckEntry[]>(reflection.stuck ?? []);

  // ── Per-card locked (saved) state ──
  const [winsLocked,       setWinsLocked]       = useState(false);
  const [gratitudeLocked,  setGratitudeLocked]  = useState(false);
  const [highlightsLocked, setHighlightsLocked] = useState(false);
  const [stuckLocked,      setStuckLocked]      = useState(false);

  // Reset local states when navigating to a different date
  useEffect(() => {
    setLocalWins(reflection.wins.length > 0 ? reflection.wins : [""]);
    setLocalGratitude(reflection.gratitude ?? "");
    setLocalHighlights(reflection.highlights ?? "");
    setLocalStuck(reflection.stuck ?? []);
    setWinsLocked(false);
    setGratitudeLocked(false);
    setHighlightsLocked(false);
    setStuckLocked(false);
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-card save handlers ──
  function saveWins()       { onUpdate({ ...reflection, wins: localWins.filter(w => w.trim()) }); setWinsLocked(true); }
  function saveGratitude()  { onUpdate({ ...reflection, gratitude: localGratitude }); setGratitudeLocked(true); }
  function saveHighlights() { onUpdate({ ...reflection, highlights: localHighlights }); setHighlightsLocked(true); }
  function saveStuck()      { onUpdate({ ...reflection, stuck: localStuck }); setStuckLocked(true); }

  // ── Win helpers (local only) ──
  function updateWin(idx: number, val: string) {
    const next = [...localWins]; next[idx] = val; setLocalWins(next);
  }
  function addWin()          { setLocalWins([...localWins, ""]); }
  function deleteWin(idx: number) {
    if (localWins.length <= 1) return;
    setLocalWins(localWins.filter((_, i) => i !== idx));
  }

  // ── Stuck helpers (local only) ──
  function addStuck() {
    setLocalStuck([...localStuck, { id: crypto.randomUUID(), text: "", resolved: false, createdAt: Date.now() }]);
  }
  function updateStuck(id: string, text: string) {
    setLocalStuck(localStuck.map((s) => s.id === id ? { ...s, text } : s));
  }
  function deleteStuck(id: string) {
    setLocalStuck(localStuck.filter((s) => s.id !== id));
  }

  // ── Decision helpers (immediate — discrete actions, not keystrokes) ──
  function addDecision() {
    const text = newDecision.trim();
    if (!text) return;
    const entry: DecisionEntry = { id: crypto.randomUUID(), text, made: false, createdAt: Date.now() };
    onUpdate({ ...reflection, decisions: [...(reflection.decisions ?? []), entry] });
    setNewDecision("");
  }
  function toggleDecision(id: string) {
    onUpdate({ ...reflection, decisions: (reflection.decisions ?? []).map((d) => d.id === id ? { ...d, made: !d.made } : d) });
  }
  function deleteDecision(id: string) {
    onUpdate({ ...reflection, decisions: (reflection.decisions ?? []).filter((d) => d.id !== id) });
  }

  // ── Arc pointer handler (immediate — discrete drag action) ──
  function handleArcPtr(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const mathDeg = Math.atan2(-(p.y - CY), p.x - CX) * 180 / Math.PI;
    onUpdate({ ...reflection, energyLevel: compassToEnergy(((90 - mathDeg) + 360) % 360) });
  }

  // ── Derived values ──
  const { color: energyCol, label: energyLbl } = getEnergyAccent(reflection.energyLevel);
  const doneCount = habits.filter((h) => isHabitDoneOnDate(h, date)).length;
  const habitPct  = habits.length > 0 ? (doneCount / habits.length) * 100 : 0;
  const doneTasks = tasks.filter((t) => t.status !== "open").length;

  const energySweep      = ((reflection.energyLevel - 1) / 9) * ARC_SWEEP;
  const trackPath        = buildArc(ARC_START, ARC_SWEEP);
  const filledPath       = buildArc(ARC_START, energySweep);
  const thumbDeg         = ((ARC_START + energySweep) % 360 + 360) % 360;
  const [thumbX, thumbY] = arcPt(thumbDeg);
  const [lx, ly]         = arcPt(ARC_START, ARC_R + 14);
  const [rx, ry]         = arcPt(((ARC_START + ARC_SWEEP) % 360 + 360) % 360, ARC_R + 14);

  return (
    <>
      <style>{`
        .ev-ta::placeholder { color: #6B7280; font-size: 14px; line-height: 1.6; }
        .ev-ta:focus        { outline: none; }
        .ev-in::placeholder { color: #6B7280; }
        .ev-in:focus        { outline: none; }
        .ev-dec::placeholder { color: #6B7280; }
        .ev-dec:focus        { outline: none; }
      `}</style>

      <div style={{ flex: 1, overflowY: "auto", backgroundColor: B.pageBg }}>
        <div style={{ padding: "16px", boxSizing: "border-box" }}>

          {/* ════════ SINGLE 3-col grid — all 8 cards ════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[14px]">

            {/* ── Row 1 ── */}

            {/* Three Wins Today */}
            <div className="lg:h-[260px]" style={card(A.wins)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.wins }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1F2933" }}>Three Wins Today</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {!winsLocked && <button onClick={addWin} style={plusBtn(A.wins)}>+</button>}
                  <button onClick={winsLocked ? () => setWinsLocked(false) : saveWins} style={lockSaveBtn(A.wins, winsLocked)}>
                    {winsLocked ? <Lock size={10} /> : <Save size={10} />}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {localWins.map((win, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", backgroundColor: B.fieldBg, borderRadius: "8px", padding: "8px 10px", border: `0.5px solid ${B.border}`, flexShrink: 0 }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, backgroundColor: A.wins + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: A.wins, marginTop: "2px" }}>
                      {idx + 1}
                    </span>
                    <textarea
                      value={win}
                      readOnly={winsLocked}
                      onChange={(e) => updateWin(idx, e.target.value)}
                      onInput={(e) => { const t = e.currentTarget; t.style.height = ""; t.style.height = t.scrollHeight + "px"; }}
                      placeholder={`Win ${idx + 1}…`}
                      rows={1}
                      className="ev-in"
                      style={{ flex: 1, background: "none", border: "none", fontSize: "13px", color: winsLocked ? B.secondary : B.text, fontFamily: "inherit", resize: "none", overflow: "hidden", lineHeight: 1.5, padding: 0, minHeight: "20px", display: "block", cursor: winsLocked ? "default" : "text" }}
                    />
                    {!winsLocked && localWins.length > 1 && (
                      <button onClick={() => deleteWin(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: "3px" }}>
                        <X size={10} color={B.muted} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* I Am Grateful For */}
            <div className="lg:h-[260px]" style={card(A.grateful)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.grateful }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1F2933" }}>I Am Grateful For…</span>
                </div>
                <button onClick={gratitudeLocked ? () => setGratitudeLocked(false) : saveGratitude} style={lockSaveBtn(A.grateful, gratitudeLocked)}>
                  {gratitudeLocked ? <Lock size={10} /> : <Save size={10} />}
                </button>
              </div>
              <textarea
                value={localGratitude}
                readOnly={gratitudeLocked}
                onChange={(e) => setLocalGratitude(e.target.value)}
                placeholder="What are you grateful for today?"
                className="ev-ta"
                style={{ ...taStyle, color: gratitudeLocked ? B.secondary : B.text, cursor: gratitudeLocked ? "default" : "text" }}
              />
            </div>

            {/* Highlights of the Day */}
            <div className="lg:h-[260px]" style={card(A.highlights)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.highlights }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1F2933" }}>Highlights of the Day</span>
                </div>
                <button onClick={highlightsLocked ? () => setHighlightsLocked(false) : saveHighlights} style={lockSaveBtn(A.highlights, highlightsLocked)}>
                  {highlightsLocked ? <Lock size={10} /> : <Save size={10} />}
                </button>
              </div>
              {(() => {
                const clamp = Math.max(0, Math.min(evIdx, events.length - 1));
                const ev = events[clamp];
                const grpColor = ev ? (eventGroups.find((g) => g.id === ev.groupId)?.color ?? B.label) : B.label;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: B.fieldBg, borderRadius: "10px", padding: "8px 10px", marginBottom: "10px", flexShrink: 0 }}>
                    <button onClick={() => setEvIdx((i) => Math.max(0, i - 1))} disabled={events.length === 0 || clamp === 0} style={{ ...evNavBtn, opacity: (events.length === 0 || clamp === 0) ? 0.3 : 1 }}>‹</button>
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
                    {events.length > 0 && <span style={{ fontSize: "10px", color: B.muted, flexShrink: 0 }}>{clamp + 1}/{events.length}</span>}
                    <button onClick={() => setEvIdx((i) => Math.min(events.length - 1, i + 1))} disabled={events.length === 0 || clamp === events.length - 1} style={{ ...evNavBtn, opacity: (events.length === 0 || clamp === events.length - 1) ? 0.3 : 1 }}>›</button>
                  </div>
                );
              })()}
              <textarea
                value={localHighlights}
                readOnly={highlightsLocked}
                onChange={(e) => setLocalHighlights(e.target.value)}
                placeholder="What stood out today? Moments, conversations, breakthroughs…"
                className="ev-ta"
                style={{ ...taStyle, color: highlightsLocked ? B.secondary : B.text, cursor: highlightsLocked ? "default" : "text" }}
              />
            </div>

            {/* ── Row 2 ── */}

            {/* Today's Tasks */}
            <div className="lg:h-[260px]" style={card(A.tasks)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.tasks }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1F2933" }}>Today&apos;s Tasks</span>
                </div>
                {tasks.length > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: 500, color: A.tasks, backgroundColor: A.tasks + "18", borderRadius: "10px", padding: "3px 8px" }}>
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

            {/* Today's Habits */}
            <div className="lg:h-[260px]" style={card(A.habits)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.habits }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1F2933" }}>Today&apos;s Habits</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 500, color: A.habits, backgroundColor: A.habits + "20", borderRadius: "10px", padding: "3px 8px" }}>{doneCount}/{habits.length}</span>
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
                      const streak = calcStreak(h);
                      const streakEl = (
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
                          <span style={{ fontSize: "10px", fontWeight: 600, color: streak > 0 ? "#F97316" : B.muted }}>{streak}</span>
                          <Flame size={11} color={streak > 0 ? "#F97316" : B.muted} />
                        </div>
                      );
                      if (h.type === "measurable") {
                        const current = h.measurements[date] ?? 0;
                        const pct     = Math.min(1, h.target > 0 ? current / h.target : 0);
                        return (
                          <div key={h.id} style={{ padding: "9px 11px", borderRadius: "9px", border: `0.5px solid ${done ? aColor + "50" : B.border}`, backgroundColor: done ? aColor + "15" : B.fieldBg, flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: done ? B.text : B.secondary, flex: 1, marginRight: "8px" }}>{h.name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <button onClick={() => onStepHabit(h.id, -1)} style={stepBtn}>−</button>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: done ? B.text : B.secondary, minWidth: "44px", textAlign: "center" }}>{current}/{h.target}{h.unit ? ` ${h.unit}` : ""}</span>
                                <button onClick={() => onStepHabit(h.id, +1)} style={stepBtn}>+</button>
                                {streakEl}
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
                          <span style={{ fontSize: "12px", fontWeight: 600, color: done ? B.text : B.secondary, flex: 1 }}>{h.name}</span>
                          {streakEl}
                        </button>
                      );
                    })
                }
              </div>
            </div>

            {/* Decision Log */}
            <div className="lg:h-[260px]" style={card(A.decisions)}>
              <CardHeader color={A.decisions} label="Decision Log" />
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexShrink: 0 }}>
                <input
                  value={newDecision}
                  onChange={(e) => setNewDecision(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addDecision(); }}
                  placeholder="Add a decision…"
                  className="ev-dec"
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: `0.5px solid ${B.border}`, backgroundColor: B.fieldBg, fontSize: "13px", color: B.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
                <button onClick={addDecision} style={{ width: 34, height: 34, borderRadius: "8px", border: "none", backgroundColor: A.action, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#FFFFFF", lineHeight: 1 }}>+</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
                {(reflection.decisions ?? []).length === 0
                  ? <p style={{ fontSize: "12px", color: B.muted, margin: 0, fontStyle: "italic" }}>No decisions yet…</p>
                  : (reflection.decisions ?? []).map((dec) => (
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

            {/* ── Row 3 ── */}

            {/* Energy & Mood */}
            <div className="lg:h-[260px]" style={card(energyCol)}>
              <CardHeader color={energyCol} label="Energy & Mood" />

              {/* Square arc container — prevents letterboxing */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ aspectRatio: "1 / 1", height: "100%", position: "relative" }}>
                  <svg
                    viewBox="0 0 200 200"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", userSelect: "none", touchAction: "none" }}
                    onPointerDown={(e) => { arcDragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); handleArcPtr(e); }}
                    onPointerMove={(e) => { if (arcDragging.current) handleArcPtr(e); }}
                    onPointerUp={() => { arcDragging.current = false; }}
                    onPointerLeave={() => { arcDragging.current = false; }}
                  >
                    <path d={trackPath} fill="none" stroke="#EADFD3" strokeWidth="13" strokeLinecap="round" />
                    {filledPath && <path d={filledPath} fill="none" stroke={energyCol} strokeWidth="13" strokeLinecap="round" />}
                    <circle cx={thumbX.toFixed(1)} cy={thumbY.toFixed(1)} r="9" fill={energyCol} stroke="#FFFFFF" strokeWidth="2.5" />
                    <text x={CX} y="92" textAnchor="middle" fontSize="32" fontWeight="700" fill={energyCol} fontFamily="inherit">{reflection.energyLevel}</text>
                    <text x={CX} y="116" textAnchor="middle" fontSize="12" fill="#6B7280" fontFamily="inherit">{energyLbl}</text>
                    <text x={lx.toFixed(0)} y={(ly + 4).toFixed(0)} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="inherit">1</text>
                    <text x={rx.toFixed(0)} y={(ry + 4).toFixed(0)} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="inherit">10</text>
                  </svg>
                </div>
              </div>

              {/* Compact mood tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", flexShrink: 0, marginTop: "8px" }}>
                {MOOD_CONFIG.map((m) => {
                  const selected = reflection.mood === m.emoji;
                  return (
                    <button key={m.emoji} onClick={() => onUpdate({ ...reflection, mood: selected ? "" : m.emoji })} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: "3px", padding: "6px 3px", borderRadius: "7px",
                      border: `${selected ? "1px" : "0.5px"} solid ${selected ? m.color : B.border}`,
                      backgroundColor: selected ? m.tint : B.fieldBg, cursor: "pointer",
                    }}>
                      <m.Icon size={13} color={selected ? m.color : B.label} />
                      <span style={{ fontSize: "9px", fontWeight: selected ? 500 : 400, color: selected ? m.color : B.label, lineHeight: 1 }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Where I Was Stuck */}
            <div className="lg:h-[260px]" style={card(A.stuck)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: A.stuck }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1F2933" }}>Where I Was Stuck</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {!stuckLocked && <button onClick={addStuck} style={plusBtn(A.stuck)}>+</button>}
                  <button onClick={stuckLocked ? () => setStuckLocked(false) : saveStuck} style={lockSaveBtn(A.stuck, stuckLocked)}>
                    {stuckLocked ? <Lock size={10} /> : <Save size={10} />}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {localStuck.length === 0
                  ? <p style={{ fontSize: "12px", color: B.muted, margin: 0, fontStyle: "italic" }}>Nothing blocked you today…</p>
                  : localStuck.map((s, idx) => (
                      <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", backgroundColor: B.fieldBg, borderRadius: "8px", padding: "8px 10px", border: `0.5px solid ${B.border}`, flexShrink: 0 }}>
                        <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, backgroundColor: A.stuck + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: A.stuck, marginTop: "2px" }}>
                          {idx + 1}
                        </span>
                        <textarea
                          value={s.text}
                          readOnly={stuckLocked}
                          onChange={(e) => updateStuck(s.id, e.target.value)}
                          onInput={(e) => { const t = e.currentTarget; t.style.height = ""; t.style.height = t.scrollHeight + "px"; }}
                          placeholder={`Blocker ${idx + 1}…`}
                          rows={1}
                          className="ev-in"
                          style={{ flex: 1, background: "none", border: "none", fontSize: "13px", color: stuckLocked ? B.secondary : B.text, fontFamily: "inherit", resize: "none", overflow: "hidden", lineHeight: 1.5, padding: 0, minHeight: "20px", display: "block", cursor: stuckLocked ? "default" : "text" }}
                        />
                        {!stuckLocked && (
                          <button onClick={() => deleteStuck(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: "3px" }}>
                            <X size={10} color={B.muted} />
                          </button>
                        )}
                      </div>
                    ))
                }
              </div>
            </div>

            {/* 3rd slot in row 3 — intentionally empty */}

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
      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1F2933" }}>
        {label}
      </span>
    </div>
  );
}

function card(accentColor: string): React.CSSProperties {
  return {
    backgroundColor: accentColor + "28",
    borderRadius: "14px",
    padding: "18px",
    border: `1px solid ${accentColor}60`,
    borderTop: `3px solid ${accentColor}`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
}

function plusBtn(color: string): React.CSSProperties {
  return {
    width: 22, height: 22, borderRadius: "6px", border: "none",
    backgroundColor: color + "28", color, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "16px", lineHeight: 1, flexShrink: 0,
  };
}

function lockSaveBtn(color: string, locked: boolean): React.CSSProperties {
  return {
    width: 22, height: 22, borderRadius: "6px", border: "none",
    backgroundColor: locked ? color + "40" : color + "28",
    color, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    boxShadow: locked ? `0 0 0 1px ${color}60` : "none",
  };
}

const taStyle: React.CSSProperties = {
  flex: 1, minHeight: 0, width: "100%",
  backgroundColor: "#FFFFFF", borderRadius: "10px",
  padding: "14px", border: "1px solid #EADFD3",
  fontSize: "14px", color: "#1F2933", lineHeight: 1.6,
  resize: "none", fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};

const stepBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "6px",
  border: "1px solid #EADFD3", backgroundColor: "#FFFFFF",
  color: "#374151", cursor: "pointer", fontSize: "13px",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, fontWeight: 700, lineHeight: 1,
};

const evNavBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "6px",
  border: "1px solid #EADFD3", backgroundColor: "#FFFFFF",
  color: "#374151", cursor: "pointer", fontSize: "15px",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, lineHeight: 1, padding: 0,
};
