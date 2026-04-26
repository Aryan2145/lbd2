"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap, CheckSquare, Flame, TrendingUp, ArrowRight,
  Video, Check, Plus, X, Clock, Sun, Moon,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import { toTaskDate, Q_META } from "@/components/tasks/TaskCard";
import { isScheduledDay } from "@/components/habits/HabitCard";
import type { WeekEvent } from "@/lib/weeklyTypes";
import type { HabitData } from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { GoalData } from "@/components/goals/GoalCard";
import type { EveningReflection, DecisionEntry } from "@/lib/dayTypes";
import { LIFE_AREAS, LIFE_AREA_COLORS } from "@/lib/dayTypes";
import { LIFE_AREA_EMOJI } from "@/lib/bucketTypes";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toTaskDate(d);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toTaskDate(d);
}

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ── Computation helpers ───────────────────────────────────────────────────────

function computeMomentumScore(habits: HabitData[], tasks: TaskData[], weekStart: string): number {
  const weekEnd = addDays(weekStart, 7);
  let hTotal = 0, hDone = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    const ds = toTaskDate(d);
    const dow = d.getDay();
    for (const h of habits) {
      if (!isScheduledDay(h.frequency, h.customDays, dow)) continue;
      hTotal++;
      const done = h.type === "binary"
        ? h.completions.includes(ds)
        : (h.measurements[ds] ?? 0) >= h.target;
      if (done) hDone++;
    }
  }
  const habitRate = hTotal === 0 ? 100 : (hDone / hTotal) * 100;
  const weekTasks = tasks.filter((t) => t.deadline >= weekStart && t.deadline < weekEnd);
  const taskRate  = weekTasks.length === 0 ? 100 : (weekTasks.filter((t) => t.status !== "open").length / weekTasks.length) * 100;
  return Math.round(habitRate * 0.6 + taskRate * 0.4);
}

function computeDailyProgress(habits: HabitData[], tasks: TaskData[], today: string): { done: number; total: number } {
  const dow = new Date(today + "T00:00:00").getDay();
  const todayHabits = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, dow));
  const habitsDone  = todayHabits.filter((h) =>
    h.type === "binary" ? h.completions.includes(today) : (h.measurements[today] ?? 0) >= h.target
  ).length;
  const todayTasks = tasks.filter((t) => t.deadline === today);
  const tasksDone  = todayTasks.filter((t) => t.status !== "open").length;
  return { done: habitsDone + tasksDone, total: todayHabits.length + todayTasks.length };
}

function computeMaxStreak(habits: HabitData[], today: string): { name: string; streak: number } {
  let best = { name: "—", streak: 0 };
  for (const h of habits) {
    let streak = 0;
    const d = new Date(today + "T00:00:00");
    for (let i = 0; i < 365; i++) {
      const ds  = toTaskDate(d);
      const dow = d.getDay();
      if (isScheduledDay(h.frequency, h.customDays, dow)) {
        const done = h.type === "binary"
          ? h.completions.includes(ds)
          : (h.measurements[ds] ?? 0) >= h.target;
        if (!done) break;
        streak++;
      }
      d.setDate(d.getDate() - 1);
    }
    if (streak > best.streak) best = { name: h.name, streak };
  }
  return best;
}

function computeEnergyTrend(reflections: EveningReflection[], today: string): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const ds = addDays(today, -(6 - i));
    return reflections.find((r) => r.date === ds)?.energyLevel ?? 0;
  });
}

const AREA_MAP: Record<string, string> = {
  health: "Health", wealth: "Finance", finance: "Finance",
  spiritual: "Spiritual", personal: "Personal", relationships: "Relationships",
  contribution: "Work", work: "Work", family: "Family", learning: "Learning",
};

function getActiveLifeAreas(
  habits: HabitData[], tasks: TaskData[], goals: GoalData[], today: string
): Set<string> {
  const active = new Set<string>();
  const dow = new Date(today + "T00:00:00").getDay();
  for (const h of habits) {
    if (!isScheduledDay(h.frequency, h.customDays, dow)) continue;
    const done = h.type === "binary" ? h.completions.includes(today) : (h.measurements[today] ?? 0) >= h.target;
    if (done) { const a = AREA_MAP[h.area?.toLowerCase()] ?? h.area; if (a) active.add(a); }
  }
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));
  for (const t of tasks) {
    if (t.status === "open" || !t.closedAt) continue;
    if (toTaskDate(new Date(t.closedAt)) !== today) continue;
    if (t.linkedGoalId) {
      const g = goalMap[t.linkedGoalId];
      if (g) { const a = AREA_MAP[g.area?.toLowerCase()] ?? g.area; if (a) active.add(a); }
    }
  }
  return active;
}

function extractMeetingUrl(description: string): string | null {
  const matches = description.match(/(https?:\/\/[^\s]+)/gi);
  if (!matches) return null;
  for (const url of matches) {
    if (/zoom\.us|meet\.google|teams\.microsoft|whereby|webex|around\.co/i.test(url)) return url;
  }
  return null;
}

function getNextEvents(events: WeekEvent[]): { current: WeekEvent | null; upcoming: WeekEvent[] } {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let current: WeekEvent | null = null;
  const upcoming: WeekEvent[] = [];
  for (const ev of events) {
    const s = toMins(ev.startTime), e = toMins(ev.endTime);
    if (s <= nowMins && nowMins < e) { current = ev; }
    else if (s > nowMins) upcoming.push(ev);
  }
  return { current, upcoming: upcoming.slice(0, 2) };
}

const DAILY_QUOTES = [
  { text: "Do the hard thing first. The rest of the day gets easier.", author: "Brian Tracy" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "Clarity comes from action, not from thought.", author: "" },
  { text: "Small steps forward are still steps forward.", author: "" },
  { text: "Your habits today are building your identity of tomorrow.", author: "James Clear" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Win the morning, win the day.", author: "" },
  { text: "You are what you repeatedly do.", author: "Aristotle" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
];

// ── SVG components ────────────────────────────────────────────────────────────

function CircleGauge({ score }: { score: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <svg width={84} height={84} viewBox="0 0 84 84">
      <circle cx={42} cy={42} r={r} fill="none" stroke="#F0EBE3" strokeWidth={6} />
      <circle cx={42} cy={42} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 42 42)" />
      <text x={42} y={39} textAnchor="middle" fontSize={18} fontWeight={800} fill={color}>{score}</text>
      <text x={42} y={53} textAnchor="middle" fontSize={9} fill="#A8A29E">/ 100</text>
    </svg>
  );
}

function EnergyBars({ values }: { values: number[] }) {
  const maxH = 28, bW = 7, gap = 3;
  return (
    <svg width={values.length * (bW + gap) - gap} height={maxH}>
      {values.map((v, i) => {
        const h  = v === 0 ? 3 : Math.max(4, (v / 10) * maxH);
        const col = v === 0 ? "#E8DDD0" : v >= 7 ? "#10B981" : v >= 5 ? "#F59E0B" : "#EF4444";
        return <rect key={i} x={i * (bW + gap)} y={maxH - h} width={bW} height={h} rx={2} fill={col} />;
      })}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    goals, tasks, habits, eventGroups, weekEvents,
    dayIntentions, eveningReflections, upsertDayIntention,
  } = useAppStore();

  const today    = toTaskDate();
  const nowHour  = new Date().getHours();
  const weekStart = getWeekStart();

  const [decisionInput, setDecisionInput] = useState("");

  // ── Computations ──
  const momentum  = computeMomentumScore(habits, tasks, weekStart);
  const progress  = computeDailyProgress(habits, tasks, today);
  const bestStreak = computeMaxStreak(habits, today);
  const energy    = computeEnergyTrend(eveningReflections, today);
  const activeAreas = getActiveLifeAreas(habits, tasks, goals, today);

  const todayEvents = weekEvents
    .filter((e) => e.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const { current: currentEvent, upcoming: upcomingEvents } = getNextEvents(todayEvents);
  const groupMap = Object.fromEntries(eventGroups.map((g) => [g.id, g]));

  const intention   = dayIntentions.find((d) => d.date === today);
  const priorities  = [
    intention?.priorities[0] ?? null,
    intention?.priorities[1] ?? null,
    intention?.priorities[2] ?? null,
  ];
  const decisions   = intention?.decisions ?? [];

  const eveningRefl = eveningReflections.find((r) => r.date === today);
  const morningDone = priorities.some((p) => p?.text.trim());
  const eveningDone = !!eveningRefl?.highlights;
  const isEvening   = nowHour >= 16;

  const showMorningNudge = !isEvening && !morningDone;
  const showEveningNudge = isEvening && !eveningDone;

  // Quote
  const doy   = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = DAILY_QUOTES[doy % DAILY_QUOTES.length];

  // Day display
  const dayName = new Date(today + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
  const dateDisp = new Date(today + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });

  function togglePriority(idx: number) {
    if (!intention) return;
    const updated = [...intention.priorities];
    if (updated[idx]) updated[idx] = { ...updated[idx], completed: !updated[idx].completed };
    upsertDayIntention({ ...intention, priorities: updated });
  }

  function addDecision() {
    const text = decisionInput.trim();
    if (!text) return;
    const entry: DecisionEntry = { id: `dec_${Date.now()}`, text, made: false, createdAt: Date.now() };
    const base = intention ?? { date: today, priorities: [], gratitude: "", decisions: [] };
    upsertDayIntention({ ...base, decisions: [...base.decisions, entry] });
    setDecisionInput("");
  }

  function toggleDecision(id: string) {
    if (!intention) return;
    upsertDayIntention({
      ...intention,
      decisions: intention.decisions.map((d) => d.id === id ? { ...d, made: !d.made } : d),
    });
  }

  const progressPct = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
  const progressColor = progressPct >= 80 ? "#10B981" : progressPct >= 50 ? "#F59E0B" : "#EF4444";
  const momentumColor = momentum >= 80 ? "#10B981" : momentum >= 60 ? "#F59E0B" : "#EF4444";
  const avgEnergy = energy.filter((v) => v > 0).reduce((a, b) => a + b, 0) / (energy.filter((v) => v > 0).length || 1);

  return (
    <div style={{ height: "100%", backgroundColor: "#FAF5EE", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "14px 28px 12px", borderBottom: "1px solid #EDE5D8", flexShrink: 0,
        backgroundColor: "#FAF5EE", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
            Module 06 · Dashboard
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            {dayName}, {dateDisp}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "5px 12px", borderRadius: "20px",
            backgroundColor: isEvening ? "#1E1B4B" : "#FFF7ED",
            border: `1px solid ${isEvening ? "#312E81" : "#FED7AA"}`,
            fontSize: "11px", fontWeight: 700,
            color: isEvening ? "#A5B4FC" : "#F97316",
          }}>
            {isEvening ? <Moon size={11} /> : <Sun size={11} />}
            {isEvening ? "Evening Mode" : "Morning Mode"}
          </span>
          <Link href="/daily" style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "6px 14px", borderRadius: "9px",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "11px", fontWeight: 700, color: "#FFFFFF", textDecoration: "none",
          }}>
            Open Daily <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Main column ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Contextual banner */}
          {(showMorningNudge || showEveningNudge) && (
            <Link href="/daily" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderRadius: "12px", textDecoration: "none", marginBottom: "20px",
              backgroundColor: showEveningNudge ? "#F5F3FF" : "#FFF7ED",
              border: `1.5px solid ${showEveningNudge ? "#C4B5FD" : "#FED7AA"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {showEveningNudge ? <Moon size={16} color="#6366F1" /> : <Sun size={16} color="#F97316" />}
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 700,
                    color: showEveningNudge ? "#4F46E5" : "#EA580C", margin: 0 }}>
                    {showEveningNudge ? "Evening reflection not yet logged" : "Morning intention not set yet"}
                  </p>
                  <p style={{ fontSize: "10px", color: "#78716C", margin: "1px 0 0" }}>
                    {showEveningNudge
                      ? "Take 5 minutes to capture your day before it slips away →"
                      : "Set your Top 3 for today and start with intention →"}
                  </p>
                </div>
              </div>
              <ArrowRight size={14} color={showEveningNudge ? "#6366F1" : "#F97316"} />
            </Link>
          )}

          {/* ── Pulse Zone — 4 KPI cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "22px" }}>

            {/* Momentum Score */}
            <div style={kpiCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Zap size={12} color="#F97316" />
                <span style={kpiLabel}>Momentum</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CircleGauge score={momentum} />
                <div>
                  <p style={{ fontSize: "11px", color: momentumColor, fontWeight: 700, margin: 0 }}>
                    {momentum >= 80 ? "Strong" : momentum >= 60 ? "Building" : "Needs focus"}
                  </p>
                  <p style={{ fontSize: "9px", color: "#A8A29E", margin: "2px 0 0", lineHeight: 1.4 }}>
                    Habits × 60%<br />Tasks × 40%
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Progress */}
            <div style={kpiCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <CheckSquare size={12} color="#6366F1" />
                <span style={kpiLabel}>Today's Progress</span>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, color: progressColor }}>
                  {progress.done}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#A8A29E" }}>
                  /{progress.total}
                </span>
              </div>
              <div style={{ width: "100%", height: 6, backgroundColor: "#F0EBE3", borderRadius: 3 }}>
                <div style={{
                  width: `${progressPct}%`, height: "100%", borderRadius: 3,
                  backgroundColor: progressColor, transition: "width 0.5s ease",
                }} />
              </div>
              <p style={{ fontSize: "9px", color: "#A8A29E", margin: "5px 0 0" }}>
                Items completed today
              </p>
            </div>

            {/* Active Streak */}
            <div style={kpiCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Flame size={12} color="#F97316" />
                <span style={kpiLabel}>Top Streak</span>
              </div>
              <div style={{ marginBottom: "4px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, color: "#F97316" }}>
                  {bestStreak.streak}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#A8A29E", marginLeft: 4 }}>
                  days
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#57534E", fontWeight: 600, margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {bestStreak.name}
              </p>
              <p style={{ fontSize: "9px", color: "#A8A29E", margin: "2px 0 0" }}>
                Current active streak
              </p>
            </div>

            {/* Energy Trend */}
            <div style={kpiCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <TrendingUp size={12} color="#10B981" />
                <span style={kpiLabel}>Energy (7 days)</span>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800,
                  color: avgEnergy >= 7 ? "#10B981" : avgEnergy >= 5 ? "#F59E0B" : "#EF4444" }}>
                  {energy.some((v) => v > 0) ? avgEnergy.toFixed(1) : "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#A8A29E", marginLeft: 4 }}>/10 avg</span>
              </div>
              <EnergyBars values={energy} />
              <p style={{ fontSize: "9px", color: "#A8A29E", margin: "5px 0 0" }}>
                From evening reflections
              </p>
            </div>
          </div>

          {/* ── Execution Zone ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* Next Up Calendar */}
            <div>
              <p style={sectionTitle}>Next Up</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {currentEvent && (() => {
                  const g    = groupMap[currentEvent.groupId];
                  const col  = g?.color ?? "#6366F1";
                  const meet = extractMeetingUrl(currentEvent.description);
                  return (
                    <div style={{
                      padding: "12px 14px", borderRadius: "12px",
                      background: `linear-gradient(135deg, ${col}18, ${col}08)`,
                      border: `1.5px solid ${col}40`, position: "relative",
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: col }} />
                            <span style={{ fontSize: "9px", fontWeight: 700, color: col,
                              textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              NOW · {currentEvent.startTime} – {currentEvent.endTime}
                            </span>
                          </div>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
                            {currentEvent.title}
                          </p>
                        </div>
                        {meet && (
                          <a href={meet} target="_blank" rel="noopener noreferrer" style={{
                            display: "flex", alignItems: "center", gap: "4px",
                            padding: "5px 10px", borderRadius: "7px",
                            backgroundColor: "#10B981", border: "none",
                            fontSize: "10px", fontWeight: 700, color: "#FFFFFF",
                            textDecoration: "none", flexShrink: 0,
                          }}>
                            <Video size={10} /> Join
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {upcomingEvents.map((ev) => {
                  const g   = groupMap[ev.groupId];
                  const col = g?.color ?? "#6366F1";
                  const meet = extractMeetingUrl(ev.description);
                  return (
                    <div key={ev.id} style={{
                      padding: "10px 14px", borderRadius: "10px",
                      backgroundColor: "#FFFFFF", border: "1.5px solid #EDE5D8",
                      display: "flex", alignItems: "center", gap: "10px",
                    }}>
                      <div style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: col, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#1C1917", margin: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.title}
                        </p>
                        <p style={{ fontSize: "9px", color: "#78716C", margin: "2px 0 0", fontWeight: 600 }}>
                          <Clock size={8} style={{ display: "inline", marginRight: 3 }} />
                          {ev.startTime} – {ev.endTime}
                        </p>
                      </div>
                      {meet && (
                        <a href={meet} target="_blank" rel="noopener noreferrer" style={{
                          padding: "3px 8px", borderRadius: "6px", border: "1px solid #BBF7D0",
                          backgroundColor: "#F0FDF4", fontSize: "9px", fontWeight: 700,
                          color: "#10B981", textDecoration: "none", flexShrink: 0,
                        }}>
                          <Video size={8} style={{ display: "inline", marginRight: 2 }} />Join
                        </a>
                      )}
                    </div>
                  );
                })}

                {!currentEvent && upcomingEvents.length === 0 && (
                  <div style={{
                    padding: "16px", borderRadius: "10px", textAlign: "center",
                    border: "1.5px dashed #E8DDD0", backgroundColor: "#FAFAFA",
                  }}>
                    <Clock size={20} color="#D5C9BC" style={{ margin: "0 auto 5px" }} />
                    <p style={{ fontSize: "11px", color: "#C4B5A8", margin: 0 }}>
                      No more events today
                    </p>
                    <Link href="/weekly" style={{ fontSize: "10px", color: "#F97316",
                      fontWeight: 600, textDecoration: "none" }}>
                      Add a time block →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Big 3 */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p style={sectionTitle}>Today&apos;s Big 3</p>
                {!morningDone && (
                  <Link href="/daily" style={{ fontSize: "10px", color: "#F97316",
                    fontWeight: 600, textDecoration: "none" }}>
                    Set priorities →
                  </Link>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {priorities.map((p, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "10px",
                    backgroundColor: p?.completed ? "#F0FDF4" : "#FFFFFF",
                    border: `1.5px solid ${p?.completed ? "#BBF7D0" : "#EDE5D8"}`,
                    minHeight: 44,
                  }}>
                    <button
                      onClick={() => p?.text && togglePriority(idx)}
                      disabled={!p?.text}
                      style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${p?.completed ? "#16A34A" : p?.text ? "#C8BFB5" : "#E8DDD0"}`,
                        backgroundColor: p?.completed ? "#16A34A" : "#FFFFFF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: p?.text ? "pointer" : "default",
                      }}
                    >
                      {p?.completed && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </button>
                    <span style={{
                      flex: 1, fontSize: "12px", fontWeight: 600,
                      color: p?.completed ? "#78716C" : p?.text ? "#1C1917" : "#C4B5A8",
                      textDecoration: p?.completed ? "line-through" : "none",
                      fontStyle: p?.text ? "normal" : "italic",
                    }}>
                      {p?.text || `Priority ${idx + 1} not set`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Log Quick Capture */}
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={sectionTitle}>Decision Log</p>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input
                  value={decisionInput}
                  onChange={(e) => setDecisionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDecision()}
                  placeholder="Capture a decision or open question instantly…"
                  className="weekly-input"
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: "9px",
                    border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
                    fontSize: "12px", color: "#1C1917", outline: "none",
                  }}
                />
                <button onClick={addDecision} style={{
                  padding: "8px 14px", borderRadius: "9px", border: "none",
                  background: "linear-gradient(135deg, #F97316, #EA580C)",
                  color: "#FFFFFF", cursor: "pointer",
                }}>
                  <Plus size={14} />
                </button>
              </div>
              {decisions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {decisions.slice(0, 4).map((dec) => (
                    <div key={dec.id} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "7px 10px", borderRadius: "8px",
                      backgroundColor: dec.made ? "#F0FDF4" : "#FAFAFA",
                      border: `1px solid ${dec.made ? "#BBF7D0" : "#E8DDD0"}`,
                    }}>
                      <button onClick={() => toggleDecision(dec.id)} style={{
                        padding: "2px 7px", borderRadius: "5px", border: "none",
                        backgroundColor: dec.made ? "#16A34A" : "#E8DDD0",
                        fontSize: "9px", fontWeight: 700,
                        color: dec.made ? "#FFFFFF" : "#78716C",
                        cursor: "pointer", flexShrink: 0,
                      }}>
                        {dec.made ? "✓" : "?"}
                      </button>
                      <span style={{ flex: 1, fontSize: "12px", color: dec.made ? "#15803D" : "#1C1917",
                        textDecoration: dec.made ? "line-through" : "none" }}>
                        {dec.text}
                      </span>
                    </div>
                  ))}
                  {decisions.length > 4 && (
                    <Link href="/daily" style={{ fontSize: "10px", color: "#F97316",
                      fontWeight: 600, textDecoration: "none", paddingLeft: 4 }}>
                      +{decisions.length - 4} more · Open Daily →
                    </Link>
                  )}
                </div>
              )}
              {decisions.length === 0 && (
                <p style={{ fontSize: "11px", color: "#C4B5A8", fontStyle: "italic" }}>
                  No decisions logged today. Use the field above to capture one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Sidebar — Alignment ── */}
        <div style={{
          width: 264, flexShrink: 0, overflowY: "auto",
          borderLeft: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
          padding: "20px 16px", display: "flex", flexDirection: "column", gap: "24px",
        }}>

          {/* Life Area Balance */}
          <section>
            <p style={sectionTitle}>Life Balance</p>
            <p style={{ fontSize: "10px", color: "#A8A29E", margin: "0 0 10px", lineHeight: 1.4 }}>
              Orange = active today via habits or tasks.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {LIFE_AREAS.filter((a) => a !== "Other").map((area) => {
                const active = activeAreas.has(area);
                const color  = LIFE_AREA_COLORS[area];
                const emoji  = LIFE_AREA_EMOJI[area];
                return (
                  <div key={area} style={{
                    padding: "8px 9px", borderRadius: "9px",
                    border: `1.5px solid ${active ? color + "60" : "#E8DDD0"}`,
                    backgroundColor: active ? color + "10" : "#FAFAFA",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    <span style={{ fontSize: "15px" }}>{emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "10px", fontWeight: 700,
                        color: active ? color : "#A8A29E", margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {area}
                      </p>
                    </div>
                    {active && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%",
                        backgroundColor: color, flexShrink: 0,
                        boxShadow: `0 0 6px ${color}`, animation: "orangeGlow 2s infinite" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quote of the Day */}
          <section>
            <p style={sectionTitle}>Today&apos;s Thought</p>
            <div style={{
              padding: "14px", borderRadius: "12px",
              background: "linear-gradient(135deg, #FFF7ED, #FEF3C7)",
              border: "1px solid #FED7AA",
            }}>
              <p style={{ fontSize: "12px", color: "#78350F", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
                &ldquo;{quote.text}&rdquo;
              </p>
              {quote.author && (
                <p style={{ fontSize: "10px", color: "#92400E", fontWeight: 700, margin: "8px 0 0" }}>
                  — {quote.author}
                </p>
              )}
            </div>
          </section>

          {/* Quick links */}
          <section>
            <p style={sectionTitle}>Quick Access</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {[
                { href: "/daily",    label: "Daily Journal",    emoji: "☀️" },
                { href: "/weekly",   label: "Weekly Plan",      emoji: "📅" },
                { href: "/habits",   label: "Habit Tracker",    emoji: "⚡" },
                { href: "/goals",    label: "Goals",            emoji: "🎯" },
                { href: "/tasks",    label: "Task Board",       emoji: "✅" },
                { href: "/bucket-list", label: "Bucket List",  emoji: "🌟" },
              ].map(({ href, label, emoji }) => (
                <Link key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "7px 10px", borderRadius: "8px",
                  backgroundColor: "transparent", border: "1px solid transparent",
                  fontSize: "12px", fontWeight: 500, color: "#57534E",
                  textDecoration: "none", transition: "all 0.15s",
                }}>
                  <span>{emoji}</span>
                  {label}
                  <ArrowRight size={10} color="#C4B5A8" style={{ marginLeft: "auto" }} />
                </Link>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const kpiCard: React.CSSProperties = {
  backgroundColor: "#FFFFFF", borderRadius: "14px",
  border: "1.5px solid #EDE5D8", padding: "16px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

const kpiLabel: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "#78716C",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "#78716C", margin: "0 0 10px",
};
