"use client";

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { GoalData, GoalNote } from "@/components/goals/GoalCard";
import type { HabitData } from "@/components/habits/HabitCard";
import type { TaskData, RecurringTemplate } from "@/components/tasks/TaskCard";
import { toTaskDate } from "@/components/tasks/TaskCard";
import type { EventGroup, WeekEvent, WeekPlan } from "@/lib/weeklyTypes";
import { GENERAL_GROUP_ID } from "@/lib/weeklyTypes";
import type { DayPlan, EveningReflection, WeeklyReview } from "@/lib/dayTypes";
import type { BucketEntry, BucketStatus } from "@/lib/bucketTypes";
import type { SupportTicket, TicketCategory, TicketPriority } from "@/lib/ticketTypes";
import { api } from "@/lib/api";

// ── User profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  name:     string;
  email:    string;
  phone:    string;
  role:     string;
  password: string;
}

// ── Type mapping helpers ──────────────────────────────────────────────────────

const Q_FROM_DB: Record<string, string> = { q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4" };

function mapGoal(g: any): GoalData {
  return {
    id: g.id, statement: g.statement, outcome: g.outcome ?? "",
    metric: g.metric ?? "", metricUnit: "",
    deadline: g.deadline, area: g.area,
    progress: g.progress ?? 0,
    lastMoved: new Date(g.updatedAt ?? g.createdAt).getTime(),
    velocity: g.velocity ?? 0,
    notes: (g.notes ?? []).map((n: any): GoalNote => ({
      id: n.id, text: n.text,
      timestamp: new Date(n.createdAt).getTime(),
    })),
    createdAt: new Date(g.createdAt).getTime(),
    milestones: Array.isArray(g.milestones) ? g.milestones : [],
  };
}

function goalToApi(g: GoalData) {
  return {
    statement: g.statement, outcome: g.outcome || null, metric: g.metric || null,
    deadline: g.deadline, area: g.area, progress: g.progress, velocity: g.velocity || null,
    milestones: g.milestones ?? [],
  };
}

function mapHabit(h: any): HabitData {
  return {
    id: h.id, name: h.name, description: "", area: h.area,
    frequency: h.frequency, customDays: h.customDays ?? [],
    cue: "", reward: "", type: h.type, target: h.target ?? 1,
    unit: h.unit ?? "", completions: h.completions ?? [],
    measurements: h.measurements ?? {},
    linkedGoalId: h.linkedGoalId ?? "",
    linkedMilestoneId: h.linkedMilestoneId ?? "",
    createdAt: new Date(h.createdAt).getTime(),
  };
}

function habitToApi(h: HabitData) {
  return {
    name: h.name, area: h.area, frequency: h.frequency, customDays: h.customDays,
    type: h.type, target: h.target, unit: h.unit || null,
    completions: h.completions, measurements: h.measurements,
    linkedGoalId: h.linkedGoalId || null,
    linkedMilestoneId: h.linkedMilestoneId || null,
  };
}

function mapTask(t: any): TaskData {
  return {
    id: t.id, kind: t.kind ?? "one-time", title: t.title, description: "",
    deadline: t.deadline, quadrant: (Q_FROM_DB[t.quadrant] ?? t.quadrant) as any,
    status: t.status as any,
    linkedGoalId: t.linkedGoalId ?? "",
    linkedMilestoneId: t.linkedMilestoneId ?? "",
    closedAt: t.closedAt != null ? Number(t.closedAt) : undefined,
    variance: t.variance ?? undefined,
    createdAt: new Date(t.createdAt).getTime(),
  };
}

function taskToApi(t: TaskData) {
  return {
    title: t.title, deadline: t.deadline, quadrant: t.quadrant,
    status: t.status, kind: t.kind ?? "one-time",
    linkedGoalId: t.linkedGoalId || null,
    linkedMilestoneId: t.linkedMilestoneId || null,
    closedAt: t.closedAt ?? null, variance: t.variance ?? null,
  };
}

function mapEventGroup(g: any): EventGroup {
  return { id: g.id, name: g.name, color: g.color, createdAt: g.createdAt ? new Date(g.createdAt).getTime() : Date.now() };
}

function mapWeekEvent(e: any): WeekEvent {
  return { id: e.id, groupId: e.groupId, title: e.title, description: e.description ?? "", date: e.date, startTime: e.startTime, endTime: e.endTime, createdAt: Date.now() };
}

function mapWeekPlan(p: any): WeekPlan {
  return { weekStart: p.weekStart, priorities: p.priorities ?? [], outcomes: p.outcomes ?? [], dayNotes: p.dayNotes ?? {}, dayThemes: p.dayThemes ?? {} };
}

function mapDayPlan(d: any): DayPlan {
  return { date: d.date, priorities: d.priorities ?? [], gratitude: d.gratitude ?? "", decisions: d.decisions ?? [] };
}

function mapEveningReflection(r: any): EveningReflection {
  return { date: r.date, energyLevel: r.energyLevel ?? 5, mood: r.mood ?? "", highlights: r.highlights ?? "", keyLearnings: r.keyLearnings ?? "", wins: r.wins ?? [], notes: r.notes ?? "", stuck: r.stuck ?? [] };
}

function mapWeeklyReview(r: any): WeeklyReview {
  return { weekStart: r.weekStart, topWins: r.topWins ?? [], outcomeNotes: r.outcomeNotes ?? "", outcomeChecked: r.outcomeChecked ?? [], taskReflection: r.taskReflection ?? "", habitReflection: r.habitReflection ?? "", overallRating: r.overallRating ?? 0, journalDate: r.journalDate ?? "", journalText: r.journalText ?? "", journalSections: r.journalSections ?? [], lifeLessons: r.lifeLessons ?? [], coreValuesLived: r.coreValuesLived ?? [] };
}

function mapBucketEntry(e: any): BucketEntry {
  return {
    id:               e.id,
    title:            e.title,
    description:      e.description ?? "",
    lifeArea:         e.lifeArea,
    imageUrl:         e.imageUrl ?? "",
    targetDate:       e.targetDate ?? "",
    status:           e.status as BucketStatus,
    createdAt:        new Date(e.createdAt).getTime(),
    achievedAt:       e.achievedAt ? Number(e.achievedAt) : undefined,
    memoryPhotoUrl:   e.memoryPhotoUrl ?? undefined,
    changeReflection: e.changeReflection ?? undefined,
  };
}

function mapTicket(t: any): SupportTicket {
  return {
    id: t.id, title: t.title ?? t.subject,
    category: "other" as TicketCategory, priority: "medium" as TicketPriority,
    status: t.status as any,
    messages: (t.messages ?? []).map((m: any) => ({
      id: m.id, authorType: m.authorType ?? m.role ?? "user",
      body: m.body ?? m.content ?? "", createdAt: typeof m.createdAt === "string" ? new Date(m.createdAt).getTime() : Number(m.createdAt ?? Date.now()),
    })),
    createdAt: new Date(t.createdAt).getTime(),
    updatedAt: new Date(t.updatedAt).getTime(),
  };
}

async function fetchSafe<T>(path: string, fallback: T): Promise<T> {
  try { return await api.get<T>(path); } catch { return fallback; }
}

// ── AppState interface ────────────────────────────────────────────────────────
interface AppState {
  loaded: boolean;
  goals:       GoalData[];
  habits:      HabitData[];
  tasks:       TaskData[];
  eventGroups:        EventGroup[];
  weekEvents:         WeekEvent[];
  weekPlans:          WeekPlan[];
  dayPlans:           DayPlan[];
  eveningReflections: EveningReflection[];
  weeklyReviews:      WeeklyReview[];
  bucketEntries:      BucketEntry[];
  tickets:            SupportTicket[];
  userProfile:        UserProfile;
  // Goal actions
  addGoal:    (g: GoalData) => void;
  updateGoal: (g: GoalData) => void;
  deleteGoal: (id: string)  => void;
  // Habit actions
  addHabit:            (h: HabitData) => void;
  updateHabit:         (h: HabitData) => void;
  deleteHabit:         (id: string)   => void;
  toggleHabitDay:      (id: string, date: string) => void;
  setHabitMeasurement: (id: string, date: string, value: number) => void;
  stepHabitToday:      (id: string, delta: number) => void;
  // Task actions
  addTask:    (t: TaskData) => void;
  updateTask: (t: TaskData) => void;
  closeTask:  (id: string, outcome: "complete" | "incomplete") => void;
  reopenTask: (id: string)  => void;
  // Event group actions
  addEventGroup:    (g: EventGroup) => void;
  updateEventGroup: (g: EventGroup) => void;
  deleteEventGroup: (id: string)    => void;
  // Week event actions
  addWeekEvent:    (e: WeekEvent) => void;
  updateWeekEvent: (e: WeekEvent) => void;
  deleteWeekEvent: (id: string)   => void;
  // Planning
  upsertWeekPlan:          (p: WeekPlan)          => void;
  upsertDayPlan:           (d: DayPlan)           => void;
  upsertEveningReflection: (r: EveningReflection) => void;
  upsertWeeklyReview:      (r: WeeklyReview)      => void;
  // Bucket
  addBucketEntry:    (e: BucketEntry) => void;
  updateBucketEntry: (e: BucketEntry) => void;
  deleteBucketEntry: (id: string)     => void;
  // Support
  addTicket:    (t: SupportTicket) => void;
  updateTicket: (t: SupportTicket) => void;
  deleteTicket: (id: string)       => void;
  // Profile
  updateUserProfile: (p: UserProfile) => void;
}

const AppContext = createContext<AppState | null>(null);

// ── AppProvider ───────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [loaded,             setLoaded]             = useState(false);
  const [goals,              setGoals]              = useState<GoalData[]>([]);
  const [habits,             setHabits]             = useState<HabitData[]>([]);
  const [tasks,              setTasks]              = useState<TaskData[]>([]);
  const [eventGroups,        setEventGroups]        = useState<EventGroup[]>([]);
  const [weekEvents,         setWeekEvents]         = useState<WeekEvent[]>([]);
  const [weekPlans,          setWeekPlans]          = useState<WeekPlan[]>([]);
  const [dayPlans,           setDayPlans]           = useState<DayPlan[]>([]);
  const [eveningReflections, setEveningReflections] = useState<EveningReflection[]>([]);
  const [weeklyReviews,      setWeeklyReviews]      = useState<WeeklyReview[]>([]);
  const [bucketEntries,      setBucketEntries]      = useState<BucketEntry[]>([]);
  const [tickets,            setTickets]            = useState<SupportTicket[]>([]);
  const [userProfile,        setUserProfile]        = useState<UserProfile>({ name: "", email: "", phone: "", role: "", password: "" });

  // Ref so async callbacks always see latest goals (for note diffing)
  const goalsRef = useRef<GoalData[]>([]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [
        apiGoals, apiHabits, apiTasks, apiGroups,
        apiWeekPlans, apiDayPlans, apiEveningReflections,
        apiWeeklyReviews, apiBucket, apiTickets, apiUser,
      ] = await Promise.all([
        fetchSafe<any[]>('/goals', []),
        fetchSafe<any[]>('/habits', []),
        fetchSafe<any[]>('/tasks', []),
        fetchSafe<any[]>('/calendar/groups', []),
        fetchSafe<any[]>('/week-plans', []),
        fetchSafe<any[]>('/day-plans', []),
        fetchSafe<any[]>('/evening-reflections', []),
        fetchSafe<any[]>('/weekly-reviews', []),
        fetchSafe<any[]>('/bucket', []),
        fetchSafe<any[]>('/support', []),
        fetchSafe<any>('/users/me', null),
      ]);

      setGoals(apiGoals.map(mapGoal));
      setHabits(apiHabits.map(mapHabit));
      setTasks(apiTasks.map(mapTask));

      // Calendar: groups include nested events
      const groups = apiGroups.map(mapEventGroup);
      const events = apiGroups.flatMap((g: any) =>
        (g.events ?? []).map((e: any) => mapWeekEvent({ ...e, groupId: g.id }))
      );
      if (!groups.find(g => g.id === GENERAL_GROUP_ID)) {
        const created = await api.post<any>('/calendar/groups', { id: GENERAL_GROUP_ID, name: "General", color: "#9CA3AF" }).catch(() => null);
        if (created) groups.unshift(mapEventGroup(created));
      }
      setEventGroups(groups);
      setWeekEvents(events);

      setWeekPlans(apiWeekPlans.map(mapWeekPlan));
      setDayPlans(apiDayPlans.map(mapDayPlan));
      setEveningReflections(apiEveningReflections.map(mapEveningReflection));
      setWeeklyReviews(apiWeeklyReviews.map(mapWeeklyReview));
      setBucketEntries(apiBucket.map(mapBucketEntry));
      setTickets(apiTickets.map(mapTicket));

      if (apiUser) {
        setUserProfile({ name: apiUser.name ?? "", email: apiUser.email ?? "", phone: apiUser.phone ?? "", role: apiUser.role ?? "", password: "" });
      }

      setLoaded(true);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateHabitById = (id: string, fn: (h: HabitData) => HabitData) =>
    setHabits(prev => prev.map(h => h.id === id ? fn(h) : h));

  function upsertBy<T>(setter: (fn: (prev: T[]) => T[]) => void, key: keyof T, item: T) {
    setter(prev => {
      const idx = prev.findIndex(x => x[key] === item[key]);
      return idx >= 0 ? prev.map((x, i) => i === idx ? item : x) : [...prev, item];
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const ctx: AppState = {
    loaded,
    goals, habits, tasks, eventGroups, weekEvents, weekPlans,
    dayPlans, eveningReflections, weeklyReviews, bucketEntries, tickets,

    // Goals
    addGoal: (g) => {
      setGoals(prev => [...prev, g]);
      api.post<any>('/goals', goalToApi(g))
        .then(created => setGoals(prev => prev.map(x => x.id === g.id ? mapGoal(created) : x)))
        .catch(() => setGoals(prev => prev.filter(x => x.id !== g.id)));
    },
    updateGoal: (updated) => {
      setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
      api.patch(`/goals/${updated.id}`, goalToApi(updated)).catch(console.error);
      // Diff notes
      const current = goalsRef.current.find(g => g.id === updated.id);
      if (current) {
        const currentIds = new Set(current.notes.map(n => n.id));
        const updatedIds = new Set(updated.notes.map(n => n.id));
        for (const n of updated.notes) {
          if (!currentIds.has(n.id)) {
            api.post<any>(`/goals/${updated.id}/notes`, { text: n.text })
              .then(created => setGoals(prev => prev.map(g =>
                g.id !== updated.id ? g : {
                  ...g, notes: g.notes.map(note => note.id === n.id ? { ...note, id: created.id } : note)
                }
              ))).catch(console.error);
          }
        }
        for (const n of current.notes) {
          if (!updatedIds.has(n.id)) {
            api.del(`/goals/${updated.id}/notes/${n.id}`).catch(console.error);
          }
        }
      }
    },
    deleteGoal: (id) => {
      setGoals(prev => prev.filter(g => g.id !== id));
      api.del(`/goals/${id}`).catch(console.error);
    },

    // Habits
    addHabit: (h) => {
      setHabits(prev => [...prev, h]);
      api.post<any>('/habits', habitToApi(h))
        .then(created => setHabits(prev => prev.map(x => x.id === h.id ? mapHabit(created) : x)))
        .catch(() => setHabits(prev => prev.filter(x => x.id !== h.id)));
    },
    updateHabit: (h) => {
      setHabits(prev => prev.map(x => x.id === h.id ? h : x));
      api.patch(`/habits/${h.id}`, habitToApi(h)).catch(console.error);
    },
    deleteHabit: (id) => {
      setHabits(prev => prev.filter(h => h.id !== id));
      api.del(`/habits/${id}`).catch(console.error);
    },
    toggleHabitDay: (id, date) => {
      updateHabitById(id, h => {
        const completions = h.completions.includes(date)
          ? h.completions.filter(d => d !== date)
          : [...h.completions, date];
        api.patch(`/habits/${id}`, { completions }).catch(console.error);
        return { ...h, completions };
      });
    },
    setHabitMeasurement: (id, date, value) => {
      updateHabitById(id, h => {
        const measurements = { ...h.measurements, [date]: Math.max(0, value) };
        api.patch(`/habits/${id}`, { measurements }).catch(console.error);
        return { ...h, measurements };
      });
    },
    stepHabitToday: (id, delta) => {
      const today = toTaskDate();
      updateHabitById(id, h => {
        const measurements = { ...h.measurements, [today]: Math.max(0, (h.measurements[today] ?? 0) + delta) };
        api.patch(`/habits/${id}`, { measurements }).catch(console.error);
        return { ...h, measurements };
      });
    },

    // Tasks
    addTask: (t) => {
      setTasks(prev => [...prev, t]);
      api.post<any>('/tasks', taskToApi(t))
        .then(created => setTasks(prev => prev.map(x => x.id === t.id ? mapTask(created) : x)))
        .catch(() => setTasks(prev => prev.filter(x => x.id !== t.id)));
    },
    updateTask: (t) => {
      setTasks(prev => prev.map(x => x.id === t.id ? t : x));
      api.patch(`/tasks/${t.id}`, taskToApi(t)).catch(console.error);
    },
    closeTask: (id, outcome) => {
      setTasks(prev => prev.map(t => {
        if (t.id !== id) return t;
        const variance = Math.round((Date.now() - new Date(t.deadline + "T00:00:00").getTime()) / 86_400_000);
        const closedAt = Date.now();
        api.patch(`/tasks/${id}`, { status: outcome, closedAt, variance }).catch(console.error);
        return { ...t, status: outcome, closedAt, variance };
      }));
    },
    reopenTask: (id) => {
      setTasks(prev => prev.map(t =>
        t.id !== id ? t : { ...t, status: "open", closedAt: undefined, variance: undefined }
      ));
      api.patch(`/tasks/${id}`, { status: "open", closedAt: null, variance: null }).catch(console.error);
    },

    // Event groups
    addEventGroup: (g) => {
      setEventGroups(prev => [...prev, g]);
      api.post<any>('/calendar/groups', { name: g.name, color: g.color })
        .then(created => setEventGroups(prev => prev.map(x => x.id === g.id ? mapEventGroup(created) : x)))
        .catch(() => setEventGroups(prev => prev.filter(x => x.id !== g.id)));
    },
    updateEventGroup: (g) => {
      setEventGroups(prev => prev.map(x => x.id === g.id ? g : x));
      api.patch(`/calendar/groups/${g.id}`, { name: g.name, color: g.color }).catch(console.error);
    },
    deleteEventGroup: (id) => {
      setEventGroups(prev => prev.filter(x => x.id !== id));
      api.del(`/calendar/groups/${id}`).catch(console.error);
    },

    // Week events
    addWeekEvent: (e) => {
      setWeekEvents(prev => [...prev, e]);
      api.post<any>('/calendar/events', { groupId: e.groupId, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, description: e.description })
        .then(created => setWeekEvents(prev => prev.map(x => x.id === e.id ? mapWeekEvent(created) : x)))
        .catch(() => setWeekEvents(prev => prev.filter(x => x.id !== e.id)));
    },
    updateWeekEvent: (e) => {
      setWeekEvents(prev => prev.map(x => x.id === e.id ? e : x));
      api.patch(`/calendar/events/${e.id}`, { groupId: e.groupId, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, description: e.description }).catch(console.error);
    },
    deleteWeekEvent: (id) => {
      setWeekEvents(prev => prev.filter(x => x.id !== id));
      api.del(`/calendar/events/${id}`).catch(console.error);
    },

    // Planning (upserts)
    upsertWeekPlan: (plan) => {
      upsertBy(setWeekPlans, "weekStart", plan);
      api.put('/week-plans', { weekStart: plan.weekStart, priorities: plan.priorities, outcomes: plan.outcomes, dayNotes: plan.dayNotes, dayThemes: plan.dayThemes }).catch(console.error);
    },
    upsertDayPlan: (d) => {
      upsertBy(setDayPlans, "date", d);
      api.put('/day-plans', { date: d.date, priorities: d.priorities, gratitude: d.gratitude, decisions: d.decisions }).catch(console.error);
    },
    upsertEveningReflection: (r) => {
      upsertBy(setEveningReflections, "date", r);
      api.put('/evening-reflections', { date: r.date, energyLevel: r.energyLevel, mood: r.mood, highlights: r.highlights, keyLearnings: r.keyLearnings, wins: r.wins, notes: r.notes, stuck: r.stuck }).catch(console.error);
    },
    upsertWeeklyReview: (r) => {
      upsertBy(setWeeklyReviews, "weekStart", r);
      api.put('/weekly-reviews', { weekStart: r.weekStart, topWins: r.topWins, outcomeNotes: r.outcomeNotes, outcomeChecked: r.outcomeChecked, taskReflection: r.taskReflection, habitReflection: r.habitReflection, overallRating: r.overallRating, journalDate: r.journalDate, journalText: r.journalText, journalSections: r.journalSections, lifeLessons: r.lifeLessons, coreValuesLived: r.coreValuesLived }).catch(console.error);
    },

    // Bucket
    addBucketEntry: (e) => {
      setBucketEntries(prev => [...prev, e]);
      api.post<any>('/bucket', {
        title: e.title, description: e.description, lifeArea: e.lifeArea,
        imageUrl: e.imageUrl, status: e.status, targetDate: e.targetDate,
        achievedAt: e.achievedAt, memoryPhotoUrl: e.memoryPhotoUrl, changeReflection: e.changeReflection,
      })
        .then(created => setBucketEntries(prev => prev.map(x => x.id === e.id ? mapBucketEntry(created) : x)))
        .catch(() => setBucketEntries(prev => prev.filter(x => x.id !== e.id)));
    },
    updateBucketEntry: (e) => {
      setBucketEntries(prev => prev.map(x => x.id === e.id ? e : x));
      api.patch(`/bucket/${e.id}`, {
        title: e.title, description: e.description, lifeArea: e.lifeArea,
        imageUrl: e.imageUrl, status: e.status, targetDate: e.targetDate,
        achievedAt: e.achievedAt, memoryPhotoUrl: e.memoryPhotoUrl, changeReflection: e.changeReflection,
      }).catch(console.error);
    },
    deleteBucketEntry: (id) => {
      setBucketEntries(prev => prev.filter(x => x.id !== id));
      api.del(`/bucket/${id}`).catch(console.error);
    },

    // Support
    addTicket: (t) => {
      setTickets(prev => [...prev, t]);
      api.post<any>('/support', { title: t.title, status: t.status, messages: t.messages })
        .then(created => setTickets(prev => prev.map(x => x.id === t.id ? mapTicket(created) : x)))
        .catch(() => setTickets(prev => prev.filter(x => x.id !== t.id)));
    },
    updateTicket: (t) => {
      setTickets(prev => prev.map(x => x.id === t.id ? t : x));
      api.patch(`/support/${t.id}`, { title: t.title, status: t.status, messages: t.messages }).catch(console.error);
    },
    deleteTicket: (id) => {
      setTickets(prev => prev.filter(x => x.id !== id));
    },

    // Profile
    userProfile,
    updateUserProfile: (p) => {
      setUserProfile(p);
      // Update stored auth user so name/email stays in sync across sessions
      const raw = localStorage.getItem("lbd_auth_user");
      if (raw) {
        try {
          const u = JSON.parse(raw);
          localStorage.setItem("lbd_auth_user", JSON.stringify({ ...u, name: p.name, email: p.email, phone: p.phone, role: p.role }));
        } catch {}
      }
      api.patch("/users/me", { name: p.name, email: p.email, phone: p.phone, role: p.role }).catch(console.error);
    },
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be inside AppProvider");
  return ctx;
}
