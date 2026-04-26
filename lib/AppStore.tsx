"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { GoalData, GoalNote } from "@/components/goals/GoalCard";
import type { HabitData } from "@/components/habits/HabitCard";
import type { TaskData, RecurringTemplate } from "@/components/tasks/TaskCard";
import { toTaskDate } from "@/components/tasks/TaskCard";
import type { EventGroup, WeekEvent, WeekPlan } from "@/lib/weeklyTypes";
import { GENERAL_GROUP_ID } from "@/lib/weeklyTypes";

// ── localStorage helpers ──────────────────────────────────────────────────────
function fromStorage<T>(key: string, fallback: () => T): T {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback();
  } catch {
    return fallback();
  }
}

// ── Seed helpers ──────────────────────────────────────────────────────────────
function ld(daysAgo: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function td(daysOffset: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysOffset);
  return toTaskDate(dt);
}

function run(days: number, skipIdx?: number): string[] {
  return Array.from({ length: days + 4 }, (_, i) => i)
    .filter((i) => i !== skipIdx)
    .map((i) => ld(i));
}

function makeMeasure(target: number, days: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const ds = ld(i);
    if (i % 7 === 6) continue;
    out[ds] = i % 5 === 0 ? Math.floor(target * 0.5) : target;
  }
  return out;
}

// ── Schedule helper (used for recurring instance spawning) ────────────────────
function isScheduledDate(tpl: RecurringTemplate, dt: Date): boolean {
  const startDt = new Date(tpl.startDate + "T00:00:00");
  if (dt < startDt) return false;

  const dow = dt.getDay();
  const dom = dt.getDate();
  const mon = dt.getMonth();

  switch (tpl.scheduleType) {
    case "daily": {
      const diff = Math.round((dt.getTime() - startDt.getTime()) / 86_400_000);
      return diff % tpl.every === 0;
    }
    case "weekly": {
      if (!tpl.days.includes(dow)) return false;
      const startSun = new Date(startDt);
      startSun.setDate(startDt.getDate() - startDt.getDay());
      startSun.setHours(0, 0, 0, 0);
      const dtSun = new Date(dt);
      dtSun.setDate(dt.getDate() - dow);
      dtSun.setHours(0, 0, 0, 0);
      const weeks = Math.round((dtSun.getTime() - startSun.getTime()) / (7 * 86_400_000));
      return weeks >= 0 && weeks % tpl.every === 0;
    }
    case "monthly":
      return dom === tpl.monthDay;
    case "yearly":
      return mon === tpl.month && dom === tpl.monthDay;
  }
}

function computeNewInstances(
  templates: RecurringTemplate[],
  existing: TaskData[],
  daysAhead: number,
): TaskData[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const existingKeys = new Set(
    existing
      .filter((t) => t.kind === "instance")
      .map((t) => `${t.parentId}_${t.deadline}`),
  );

  const result: TaskData[] = [];

  for (const tpl of templates) {
    if (!tpl.active) continue;
    const priorCount = existing.filter((t) => t.parentId === tpl.id).length;
    let spawned = 0;

    for (let d = 0; d <= daysAhead; d++) {
      const dt = new Date(now);
      dt.setDate(now.getDate() + d);
      const dateStr = toTaskDate(dt);

      if (tpl.endCondition === "on-date" && dateStr > tpl.endDate) break;
      if (tpl.endCondition === "after-n" && priorCount + spawned >= tpl.endAfter) break;
      if (!isScheduledDate(tpl, dt)) continue;

      const key = `${tpl.id}_${dateStr}`;
      if (existingKeys.has(key)) continue;

      result.push({
        id: `inst_${tpl.id}_${d}_${Date.now()}`,
        kind: "instance",
        parentId: tpl.id,
        title: tpl.title,
        description: tpl.description,
        deadline: dateStr,
        quadrant: tpl.quadrant,
        status: "open",
        createdAt: Date.now(),
        linkedGoalId: tpl.linkedGoalId,
      });
      spawned++;
    }
  }

  return result;
}

// ── Seed goals ────────────────────────────────────────────────────────────────
function seedGoals(): GoalData[] {
  const now = Date.now();
  const note = (text: string, daysAgo: number): GoalNote =>
    ({ id: crypto.randomUUID(), text, timestamp: now - daysAgo * 86_400_000 });

  return [
    {
      id: "g1",
      statement: "Build a profitable second income stream by reaching ₹2 lakhs / month revenue by December 2025",
      outcome: "Build a profitable second income stream", metric: "₹2 lakhs / month",
      metricUnit: "revenue", deadline: "2025-12-31", area: "wealth",
      progress: 34, lastMoved: now - 20 * 86_400_000, velocity: -5,
      notes: [note("Closed first consulting client — ₹40k/mo retainer.", 5)],
      createdAt: now - 60 * 86_400_000,
    },
    {
      id: "g2",
      statement: "Compete in a half-marathon by completing 21 km under 2 hours by June 2026",
      outcome: "Compete in a half-marathon", metric: "21 km under 2 hours",
      metricUnit: "", deadline: "2026-06-15", area: "health",
      progress: 62, lastMoved: now - 2 * 86_400_000, velocity: 8,
      notes: [], createdAt: now - 90 * 86_400_000,
    },
    {
      id: "g3",
      statement: "Launch RGB Academy by achieving 100 paying students by March 2027",
      outcome: "Launch RGB Academy", metric: "100 paying students",
      metricUnit: "", deadline: "2027-03-31", area: "contribution",
      progress: 12, lastMoved: now - 3 * 86_400_000, velocity: 3,
      notes: [], createdAt: now - 30 * 86_400_000,
    },
    {
      id: "g4",
      statement: "Read 24 books by reaching 2 books per month by December 2026",
      outcome: "Read 24 books", metric: "2 books per month",
      metricUnit: "", deadline: "2026-12-31", area: "personal",
      progress: 50, lastMoved: now - 1 * 86_400_000, velocity: 0,
      notes: [], createdAt: now - 120 * 86_400_000,
    },
  ];
}

// ── Seed habits ───────────────────────────────────────────────────────────────
function seedHabits(): HabitData[] {
  const now = Date.now();
  return [
    {
      id: "h1", name: "Morning meditation", description: "10 mins breath-focused",
      area: "spiritual", frequency: "daily", customDays: [],
      cue: "wake up", reward: "enjoy a quiet coffee",
      type: "binary", target: 1, unit: "", linkedGoalId: "",
      completions: run(22), measurements: {}, createdAt: now - 30 * 86_400_000,
    },
    {
      id: "h2", name: "Read for 30 mins", description: "Non-fiction / biographies",
      area: "personal", frequency: "daily", customDays: [],
      cue: "finish dinner", reward: "sense of progress",
      type: "binary", target: 1, unit: "", linkedGoalId: "g4",
      completions: run(8, 3), measurements: {}, createdAt: now - 20 * 86_400_000,
    },
    {
      id: "h3", name: "Strength training", description: "45-min session",
      area: "health", frequency: "weekdays", customDays: [],
      cue: "gym bag by the door", reward: "protein shake",
      type: "binary", target: 1, unit: "", linkedGoalId: "g2",
      completions: run(12).filter((ds) => {
        const dow = new Date(ds + "T00:00:00").getDay();
        return dow >= 1 && dow <= 5;
      }),
      measurements: {}, createdAt: now - 25 * 86_400_000,
    },
    {
      id: "h4", name: "Cold shower", description: "2 minutes minimum",
      area: "health", frequency: "daily", customDays: [],
      cue: "finish morning workout", reward: "mental clarity",
      type: "binary", target: 1, unit: "", linkedGoalId: "g2",
      completions: run(35), measurements: {}, createdAt: now - 40 * 86_400_000,
    },
    {
      id: "h5", name: "Revenue review", description: "Check P&L and pipeline",
      area: "wealth", frequency: "weekdays", customDays: [],
      cue: "open laptop in the morning", reward: "clear decision making",
      type: "binary", target: 1, unit: "", linkedGoalId: "g1",
      completions: run(5).filter((ds) => {
        const dow = new Date(ds + "T00:00:00").getDay();
        return dow >= 1 && dow <= 5;
      }),
      measurements: {}, createdAt: now - 10 * 86_400_000,
    },
    {
      id: "h6", name: "Gratitude journal", description: "3 things I'm grateful for",
      area: "spiritual", frequency: "daily", customDays: [],
      cue: "before bed", reward: "peaceful sleep",
      type: "binary", target: 1, unit: "", linkedGoalId: "",
      completions: run(14, 4), measurements: {}, createdAt: now - 20 * 86_400_000,
    },
    {
      id: "h7", name: "Weekly family call", description: "30 min call with parents",
      area: "relationships", frequency: "custom", customDays: [0],
      cue: "Sunday evening", reward: "feeling connected",
      type: "binary", target: 1, unit: "", linkedGoalId: "",
      completions: [ld(7), ld(14), ld(21)],
      measurements: {}, createdAt: now - 28 * 86_400_000,
    },
    {
      id: "h8", name: "Read daily pages", description: "Deliberate reading practice",
      area: "personal", frequency: "daily", customDays: [],
      cue: "after breakfast", reward: "intellectual satisfaction",
      type: "measurable", target: 4, unit: "pages", linkedGoalId: "g4",
      completions: [], measurements: makeMeasure(4, 20),
      createdAt: now - 20 * 86_400_000,
    },
  ];
}

// ── Seed tasks ────────────────────────────────────────────────────────────────
function seedTasks(): TaskData[] {
  const now = Date.now();
  return [
    { id: "t1", kind: "one-time", title: "Submit quarterly tax returns",
      description: "File GST + advance tax for Q4", deadline: td(-3),
      quadrant: "Q1", status: "open", createdAt: now - 10 * 86_400_000, linkedGoalId: "g1" },
    { id: "t2", kind: "one-time", title: "Fix production bug #247",
      description: "Auth token expiry causing user logouts", deadline: td(0),
      quadrant: "Q1", status: "open", createdAt: now - 2 * 86_400_000, linkedGoalId: "" },
    { id: "t3", kind: "one-time", title: "Review lawyer's contract draft",
      description: "Client NDA and service agreement for new retainer", deadline: td(-5),
      quadrant: "Q1", status: "complete", closedAt: now - 4 * 86_400_000, variance: 1,
      createdAt: now - 8 * 86_400_000, linkedGoalId: "g1" },
    { id: "t4", kind: "one-time", title: "Prepare Q2 strategy presentation",
      description: "Slide deck for leadership review — revenue, product roadmap, hiring",
      deadline: td(10), quadrant: "Q2", status: "open",
      createdAt: now - 5 * 86_400_000, linkedGoalId: "g3" },
    { id: "t5", kind: "one-time", title: "Complete online marketing course",
      description: "Module 3 & 4 — SEO and paid acquisition", deadline: td(18),
      quadrant: "Q2", status: "open", createdAt: now - 7 * 86_400_000, linkedGoalId: "" },
    { id: "t6", kind: "one-time", title: "Run 15 km training session",
      description: "Long run for half-marathon prep", deadline: td(6),
      quadrant: "Q2", status: "open", createdAt: now - 3 * 86_400_000, linkedGoalId: "g2" },
    { id: "t7", kind: "one-time", title: "Performance reviews — 3 reports",
      description: "Mid-year 1-on-1 review sessions with team", deadline: td(-1),
      quadrant: "Q2", status: "incomplete", closedAt: now - 86_400_000, variance: 0,
      createdAt: now - 14 * 86_400_000, linkedGoalId: "" },
    { id: "t8", kind: "one-time", title: "Reply to vendor pricing email",
      description: "3 vendors waiting on response from last week", deadline: td(-1),
      quadrant: "Q3", status: "open", createdAt: now - 6 * 86_400_000, linkedGoalId: "" },
    { id: "t9", kind: "one-time", title: "Schedule team offsite logistics",
      description: "Book venue and travel for July team meet", deadline: td(3),
      quadrant: "Q3", status: "open", createdAt: now - 4 * 86_400_000, linkedGoalId: "" },
    { id: "t10", kind: "one-time", title: "Reorganize laptop files",
      description: "Clean up downloads, sort old projects", deadline: td(25),
      quadrant: "Q4", status: "open", createdAt: now - 15 * 86_400_000, linkedGoalId: "" },
    // Pre-seeded recurring instances (from tpl1 — morning planning)
    { id: "inst_tpl1_m3", kind: "instance", parentId: "tpl1",
      title: "Morning planning", description: "15-min daily planner review",
      deadline: td(-3), quadrant: "Q2", status: "complete",
      closedAt: now - 3 * 86_400_000, variance: 0, createdAt: now - 3 * 86_400_000, linkedGoalId: "" },
    { id: "inst_tpl1_m2", kind: "instance", parentId: "tpl1",
      title: "Morning planning", description: "15-min daily planner review",
      deadline: td(-2), quadrant: "Q2", status: "complete",
      closedAt: now - 2 * 86_400_000, variance: 0, createdAt: now - 2 * 86_400_000, linkedGoalId: "" },
    { id: "inst_tpl1_m1", kind: "instance", parentId: "tpl1",
      title: "Morning planning", description: "15-min daily planner review",
      deadline: td(-1), quadrant: "Q2", status: "incomplete",
      closedAt: now - 86_400_000, variance: 0, createdAt: now - 86_400_000, linkedGoalId: "" },
  ];
}

// ── Seed templates ────────────────────────────────────────────────────────────
function seedTemplates(): RecurringTemplate[] {
  const now = Date.now();
  return [
    {
      id: "tpl1", title: "Morning planning", description: "15-min daily planner review",
      quadrant: "Q2", scheduleType: "daily", every: 1,
      days: [], monthDay: 0, month: 0, time: "07:00",
      startDate: ld(14), endCondition: "never", endDate: "", endAfter: 0,
      occurrenceCount: 14, active: true, linkedGoalId: "", createdAt: now - 14 * 86_400_000,
    },
    {
      id: "tpl2", title: "Weekly review", description: "Review goals, habits, and tasks for the week",
      quadrant: "Q2", scheduleType: "weekly", every: 1,
      days: [0], monthDay: 0, month: 0, time: "19:00",
      startDate: ld(21), endCondition: "never", endDate: "", endAfter: 0,
      occurrenceCount: 3, active: true, linkedGoalId: "", createdAt: now - 21 * 86_400_000,
    },
  ];
}

// ── Seed weekly ───────────────────────────────────────────────────────────────
function weekMonday(): string {
  const now = new Date();
  const dow = now.getDay();
  const d = new Date(now);
  d.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekDayStr(mondayISO: string, offset: number): string {
  const d = new Date(mondayISO + "T00:00:00");
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seedEventGroups(): EventGroup[] {
  const ts = Date.now();
  return [
    { id: GENERAL_GROUP_ID, name: "General", color: "#9CA3AF", createdAt: 0 }, // system – not user-facing
    { id: "eg1", name: "Deep Work",  color: "#6366F1", createdAt: ts },
    { id: "eg2", name: "Meetings",   color: "#F59E0B", createdAt: ts },
    { id: "eg3", name: "Health",     color: "#10B981", createdAt: ts },
    { id: "eg4", name: "Personal",   color: "#EC4899", createdAt: ts },
  ];
}

function seedWeekEvents(): WeekEvent[] {
  const monday = weekMonday();
  const ts = Date.now();
  return [
    { id: "we1", groupId: "eg2", title: "Team standup",          description: "",                         date: weekDayStr(monday, 0), startTime: "08:30", endTime: "09:00", createdAt: ts },
    { id: "we2", groupId: "eg1", title: "Product roadmap session",description: "Q3 planning",              date: weekDayStr(monday, 0), startTime: "09:30", endTime: "11:30", createdAt: ts },
    { id: "we3", groupId: "eg3", title: "Morning run · 5 km",    description: "Zone 2 training",          date: weekDayStr(monday, 1), startTime: "06:30", endTime: "07:30", createdAt: ts },
    { id: "we4", groupId: "eg2", title: "Client check-in",       description: "RGB Academy progress",     date: weekDayStr(monday, 1), startTime: "14:00", endTime: "15:00", createdAt: ts },
    { id: "we5", groupId: "eg1", title: "Content writing block", description: "Newsletter + blog post",   date: weekDayStr(monday, 2), startTime: "10:00", endTime: "12:30", createdAt: ts },
    { id: "we6", groupId: "eg4", title: "Lunch with mentor",     description: "",                         date: weekDayStr(monday, 3), startTime: "12:30", endTime: "14:00", createdAt: ts },
    { id: "we7", groupId: "eg3", title: "Gym — upper body",      description: "Strength session",         date: weekDayStr(monday, 4), startTime: "07:00", endTime: "08:00", createdAt: ts },
  ];
}

function seedWeekPlans(): WeekPlan[] {
  return [{
    weekStart: weekMonday(),
    priorities: [
      "Close the RGB Academy beta launch",
      "Complete Q2 financial review",
      "Run 3× this week — marathon training",
    ],
    outcomes: [
      "First 10 beta students enrolled",
      "Tax filing ready to submit",
    ],
    dayNotes:  {},
    dayThemes: {},
  }];
}

// ── Context ───────────────────────────────────────────────────────────────────
interface AppState {
  goals:       GoalData[];
  habits:      HabitData[];
  tasks:       TaskData[];
  templates:   RecurringTemplate[];
  eventGroups: EventGroup[];
  weekEvents:  WeekEvent[];
  weekPlans:   WeekPlan[];
  // Goal actions
  addGoal:    (g: GoalData) => void;
  updateGoal: (g: GoalData) => void;
  deleteGoal: (id: string) => void;
  // Habit actions
  addHabit:            (h: HabitData) => void;
  updateHabit:         (h: HabitData) => void;
  deleteHabit:         (id: string) => void;
  toggleHabitDay:      (id: string, date: string) => void;
  setHabitMeasurement: (id: string, date: string, value: number) => void;
  stepHabitToday:      (id: string, delta: number) => void;
  // Task actions
  addTask:        (t: TaskData) => void;
  closeTask:      (id: string, outcome: "complete" | "incomplete") => void;
  reopenTask:     (id: string) => void;
  addTemplate:    (t: RecurringTemplate) => void;
  updateTemplate: (t: RecurringTemplate) => void;
  deleteTemplate: (id: string, mode: "stop" | "delete-future" | "delete-all") => void;
  spawnInstances: (daysAhead?: number) => void;
  // Event group actions
  addEventGroup:    (g: EventGroup) => void;
  updateEventGroup: (g: EventGroup) => void;
  deleteEventGroup: (id: string)    => void;
  // Week event actions
  addWeekEvent:     (e: WeekEvent)  => void;
  updateWeekEvent:  (e: WeekEvent)  => void;
  deleteWeekEvent:  (id: string)    => void;
  // Week plan
  upsertWeekPlan:   (p: WeekPlan)   => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [goals,       setGoals]       = useState<GoalData[]>(()           => fromStorage("lbd_goals",     seedGoals));
  const [habits,      setHabits]      = useState<HabitData[]>(()          => fromStorage("lbd_habits",    seedHabits));
  const [tasks,       setTasks]       = useState<TaskData[]>(()           => fromStorage("lbd_tasks",     seedTasks));
  const [templates,   setTemplates]   = useState<RecurringTemplate[]>(()  => fromStorage("lbd_templates", seedTemplates));
  const [weekEvents,  setWeekEvents]  = useState<WeekEvent[]>(()          => fromStorage("lbd_weekEvents",seedWeekEvents));
  const [weekPlans,   setWeekPlans]   = useState<WeekPlan[]>(()           => fromStorage("lbd_weekPlans", seedWeekPlans));
  const [eventGroups, setEventGroups] = useState<EventGroup[]>(() => {
    const groups = fromStorage("lbd_eventGroups", seedEventGroups);
    // Always ensure the system General group exists
    if (!groups.find((g) => g.id === GENERAL_GROUP_ID)) {
      return [{ id: GENERAL_GROUP_ID, name: "General", color: "#9CA3AF", createdAt: 0 }, ...groups];
    }
    return groups;
  });

  // Persist every slice to localStorage whenever it changes
  useEffect(() => { localStorage.setItem("lbd_goals",       JSON.stringify(goals));       }, [goals]);
  useEffect(() => { localStorage.setItem("lbd_habits",      JSON.stringify(habits));      }, [habits]);
  useEffect(() => { localStorage.setItem("lbd_tasks",       JSON.stringify(tasks));       }, [tasks]);
  useEffect(() => { localStorage.setItem("lbd_templates",   JSON.stringify(templates));   }, [templates]);
  useEffect(() => { localStorage.setItem("lbd_eventGroups", JSON.stringify(eventGroups)); }, [eventGroups]);
  useEffect(() => { localStorage.setItem("lbd_weekEvents",  JSON.stringify(weekEvents));  }, [weekEvents]);
  useEffect(() => { localStorage.setItem("lbd_weekPlans",   JSON.stringify(weekPlans));   }, [weekPlans]);

  const updateHabitById = (id: string, fn: (h: HabitData) => HabitData) =>
    setHabits((prev) => prev.map((h) => h.id === id ? fn(h) : h));

  const spawnInstances = useCallback((daysAhead = 30) => {
    setTasks((prev) => {
      const newInstances = computeNewInstances(templates, prev, daysAhead);
      return newInstances.length > 0 ? [...prev, ...newInstances] : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  const ctx: AppState = {
    goals, habits, tasks, templates, eventGroups, weekEvents, weekPlans,

    addGoal:    (g) => setGoals((p) => [...p, g]),
    updateGoal: (g) => setGoals((p) => p.map((x) => x.id === g.id ? g : x)),
    deleteGoal: (id) => setGoals((p) => p.filter((x) => x.id !== id)),

    addHabit:    (h) => setHabits((p) => [...p, h]),
    updateHabit: (h) => updateHabitById(h.id, () => h),
    deleteHabit: (id) => setHabits((p) => p.filter((h) => h.id !== id)),

    toggleHabitDay: (id, date) => updateHabitById(id, (h) => ({
      ...h,
      completions: h.completions.includes(date)
        ? h.completions.filter((d) => d !== date)
        : [...h.completions, date],
    })),

    setHabitMeasurement: (id, date, value) => updateHabitById(id, (h) => ({
      ...h,
      measurements: { ...h.measurements, [date]: Math.max(0, value) },
    })),

    stepHabitToday: (id, delta) => {
      const today = toTaskDate();
      updateHabitById(id, (h) => ({
        ...h,
        measurements: {
          ...h.measurements,
          [today]: Math.max(0, (h.measurements[today] ?? 0) + delta),
        },
      }));
    },

    addTask: (t) => setTasks((p) => [...p, t]),

    reopenTask: (id) =>
      setTasks((prev) => prev.map((t) =>
        t.id !== id ? t : { ...t, status: "open", closedAt: undefined, variance: undefined }
      )),

    closeTask: (id, outcome) =>
      setTasks((prev) => prev.map((t) => {
        if (t.id !== id) return t;
        const variance = Math.round(
          (Date.now() - new Date(t.deadline + "T00:00:00").getTime()) / 86_400_000
        );
        return { ...t, status: outcome, closedAt: Date.now(), variance };
      })),

    addTemplate: (t) => setTemplates((p) => [...p, t]),

    updateTemplate: (t) => setTemplates((p) => p.map((x) => x.id === t.id ? t : x)),

    deleteTemplate: (id, mode) => {
      setTemplates((p) => {
        if (mode === "stop") return p.map((t) => t.id === id ? { ...t, active: false } : t);
        return p.filter((t) => t.id !== id);
      });
      if (mode === "delete-future") {
        const today = toTaskDate();
        setTasks((p) => p.filter((t) =>
          t.parentId !== id || t.status !== "open" || t.deadline < today
        ));
      }
      if (mode === "delete-all") {
        setTasks((p) => p.filter((t) => t.parentId !== id));
      }
    },

    spawnInstances,

    addEventGroup:    (g) => setEventGroups((p) => [...p, g]),
    updateEventGroup: (g) => setEventGroups((p) => p.map((x) => x.id === g.id ? g : x)),
    deleteEventGroup: (id) => setEventGroups((p) => p.filter((x) => x.id !== id)),

    addWeekEvent:     (e) => setWeekEvents((p) => [...p, e]),
    updateWeekEvent:  (e) => setWeekEvents((p) => p.map((x) => x.id === e.id ? e : x)),
    deleteWeekEvent:  (id) => setWeekEvents((p) => p.filter((x) => x.id !== id)),

    upsertWeekPlan: (plan) => setWeekPlans((prev) => {
      const idx = prev.findIndex((p) => p.weekStart === plan.weekStart);
      return idx >= 0 ? prev.map((p, i) => i === idx ? plan : p) : [...prev, plan];
    }),
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be inside AppProvider");
  return ctx;
}
