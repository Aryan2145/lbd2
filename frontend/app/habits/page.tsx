"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Flame, Repeat2, CheckCheck, Check, Search, X, ChevronDown } from "lucide-react";
import HabitCard, { toLocalDate, isScheduledDay, calcStreak, isHabitDoneOnDate, AREA_META, type HabitData, type LifeArea } from "@/components/habits/HabitCard";
import HabitCreateSheet from "@/components/habits/HabitCreateSheet";
import HabitDetailSheet from "@/components/habits/HabitDetailSheet";
import { useAppStore } from "@/lib/AppStore";

const ALL_AREAS: LifeArea[] = [
  "professional", "wealth", "health", "spiritual", "personal", "relationships", "contribution",
];

export default function HabitsPage() {
  const {
    goals, habits,
    addHabit, updateHabit, deleteHabit,
    toggleHabitDay, setHabitMeasurement, stepHabitToday,
  } = useAppStore();

  const [selectedAreas, setSelectedAreas] = useState<Set<LifeArea>>(new Set(ALL_AREAS));
  const [todayOnly,     setTodayOnly]     = useState(false);
  const [createOpen,   setCreateOpen]  = useState(false);
  const [detailHabit,  setDetailHabit] = useState<HabitData | null>(null);
  const [searchQuery,  setSearchQuery] = useState("");
  const [searchOpen,   setSearchOpen]  = useState(false);
  const searchRef    = useRef<HTMLInputElement>(null);
  const filterDropRef = useRef<HTMLDivElement>(null);
  const [filterDropOpen, setFilterDropOpen] = useState(false);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (filterDropRef.current && !filterDropRef.current.contains(e.target as Node))
        setFilterDropOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function clearSearch() { setSearchQuery(""); setSearchOpen(false); }

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? habits.filter((h) =>
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q)
      )
    : [];
  const showSearch = q.length > 0;

  const todayDow   = new Date().getDay();
  const todayStr   = toLocalDate();
  const dueToday   = habits.filter((h) => isScheduledDay(h.frequency, h.customDays, todayDow));
  const doneToday  = dueToday.filter((h) => isHabitDoneOnDate(h, todayStr));
  const todayPct   = dueToday.length > 0 ? Math.round((doneToday.length / dueToday.length) * 100) : 0;
  const topStreak  = Math.max(0, ...habits.map(calcStreak));
  const activeCount = habits.filter((h) => calcStreak(h) > 0).length;

  function toggleArea(area: LifeArea) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area); else next.add(area);
      return next;
    });
  }

  const filtered = habits.filter((h) => {
    if (todayOnly && !isScheduledDay(h.frequency, h.customDays, todayDow)) return false;
    if (selectedAreas.size < ALL_AREAS.length && !selectedAreas.has(h.area as LifeArea)) return false;
    return true;
  });

  const handleToggle = (id: string) => {
    toggleHabitDay(id, todayStr);
    setDetailHabit((prev) => {
      if (!prev || prev.id !== id) return prev;
      const has = prev.completions.includes(todayStr);
      return { ...prev, completions: has ? prev.completions.filter((d) => d !== todayStr) : [...prev.completions, todayStr] };
    });
  };

  const handleToggleDate = (id: string, date: string) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    if (habit.type === "measurable") {
      const cur  = habit.measurements[date] ?? 0;
      const next = cur >= habit.target ? 0 : habit.target;
      setHabitMeasurement(id, date, next);
    } else {
      toggleHabitDay(id, date);
    }
  };

  const handleStep = (id: string, delta: number) => {
    stepHabitToday(id, delta);
    setDetailHabit((prev) => {
      if (!prev || prev.id !== id) return prev;
      const cur = prev.measurements[todayStr] ?? 0;
      return { ...prev, measurements: { ...prev.measurements, [todayStr]: Math.max(0, cur + delta) } };
    });
  };

  const handleUpdate = (updated: HabitData) => {
    updateHabit(updated);
    setDetailHabit(updated);
  };

  const handleDelete = (id: string) => {
    deleteHabit(id);
    setDetailHabit(null);
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* Header */}
      <div
        className="px-page flex flex-wrap items-center justify-between gap-3"
        style={{ paddingTop: "18px", paddingBottom: "14px", borderBottom: "1px solid #EDE5D8" }}
      >
        <div className="flex items-start justify-between gap-3 w-full lg:w-auto">
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
              Habits
            </p>
            <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
              Habit Tracker
            </h1>
            <p className="hidden lg:block" style={{ fontSize: "12px", color: "#78716C", marginTop: "3px" }}>
              Small actions, done daily, compound into extraordinary results.
            </p>
          </div>
          {/* Add button — visible on mobile next to title */}
          <button
            onClick={() => setCreateOpen(true)}
            className="lg:hidden flex-shrink-0"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "12px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
            }}>
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="flex items-center gap-3 lg:gap-6 flex-wrap">
          <HeaderStat icon={<Repeat2 size={14} color="#F97316" />} label="Active habits" value={`${habits.length}`} color="#1C1917" />
          <HeaderStat icon={<Flame size={14} color="#F97316" />} label="Top streak" value={`${topStreak} days`} color="#F97316" />
          <HeaderStat icon={<CheckCheck size={14} color="#16A34A" />} label="On streak" value={`${activeCount}`} color="#16A34A" />
          <button
            onClick={() => setCreateOpen(true)}
            className="hidden lg:flex"
            style={{
              alignItems: "center", gap: "6px",
              padding: "9px 16px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
            }}>
            <Plus size={14} /> Add Habit
          </button>
        </div>
      </div>

      {/* Today's progress banner */}
      <div
        className="px-page flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5"
        style={{
          paddingTop: "14px", paddingBottom: "14px", borderBottom: "1px solid #EDE5D8",
          backgroundColor: todayPct === 100 ? "#F0FDF4" : "#FFFFFF",
          transition: "background-color 0.4s",
        }}>
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#78716C", marginBottom: "2px" }}>
            Today&apos;s progress
          </p>
          <p style={{ fontSize: "22px", fontWeight: 800,
            color: todayPct === 100 ? "#16A34A" : "#F97316", lineHeight: 1 }}>
            {doneToday.length}
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#78716C" }}>
              /{dueToday.length} habits
            </span>
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: "10px", color: "#A8A29E", fontWeight: 500, marginBottom: "5px" }}>
            <span>{todayPct === 100 ? "All done! Great work." : `${todayPct}% complete`}</span>
            <span>{dueToday.length - doneToday.length} remaining</span>
          </div>
          <div style={{ height: "8px", borderRadius: "4px", backgroundColor: "#EDE5D8" }}>
            <div style={{
              height: "100%", borderRadius: "4px", width: `${todayPct}%`,
              background: todayPct === 100
                ? "linear-gradient(90deg, #16A34A, #22C55E)"
                : "linear-gradient(90deg, #F97316, #EA580C)",
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
        {todayPct === 100 && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "20px",
            backgroundColor: "#DCFCE7", border: "1px solid #86EFAC" }}>
            <CheckCheck size={14} color="#16A34A" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#16A34A" }}>Perfect day!</span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-page" style={{ paddingTop: "10px", paddingBottom: "10px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", gap: "8px" }}>

        {/* Filter dropdown — same style as Goals Life Areas */}
        <div style={{ position: "relative", flexShrink: 0 }} ref={filterDropRef}>
          <button onClick={() => setFilterDropOpen(!filterDropOpen)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "8px", whiteSpace: "nowrap",
            border: `1.5px solid ${(todayOnly || selectedAreas.size < ALL_AREAS.length) ? "#F97316" : "#E8DDD0"}`,
            backgroundColor: (todayOnly || selectedAreas.size < ALL_AREAS.length) ? "#FFF7ED" : "#FFFFFF",
            fontSize: "11px", fontWeight: 600,
            color: (todayOnly || selectedAreas.size < ALL_AREAS.length) ? "#F97316" : "#78716C",
            cursor: "pointer",
          }}>
            Life Areas
            {selectedAreas.size < ALL_AREAS.length && (
              <span style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "#F97316",
                color: "#FFFFFF", borderRadius: "10px", padding: "1px 5px" }}>
                {selectedAreas.size}
              </span>
            )}
            <ChevronDown size={11} style={{ transition: "transform 0.15s",
              transform: filterDropOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          {filterDropOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
              backgroundColor: "#FFFFFF", border: "1px solid #E8DDD0", borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "6px", minWidth: "200px" }}>

              {/* Today toggle */}
              <button onClick={() => setTodayOnly(!todayOnly)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: "8px",
                padding: "6px 8px", borderRadius: "6px", border: "none",
                backgroundColor: todayOnly ? "#FFF7ED" : "transparent", cursor: "pointer",
              }}>
                <span style={{ width: 14, height: 14, borderRadius: "3px", flexShrink: 0,
                  border: `2px solid ${todayOnly ? "#F97316" : "#C8BFB5"}`,
                  backgroundColor: todayOnly ? "#F97316" : "#FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {todayOnly && <Check size={8} color="#FFFFFF" strokeWidth={3} />}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600,
                  color: todayOnly ? "#EA580C" : "#78716C" }}>Today only</span>
                <span style={{ marginLeft: "auto", fontSize: "9px", fontWeight: 700,
                  backgroundColor: todayOnly ? "#F97316" : "#E8DDD0",
                  color: todayOnly ? "#FFFFFF" : "#78716C",
                  borderRadius: "10px", padding: "1px 5px" }}>
                  {dueToday.length}
                </span>
              </button>

              <div style={{ height: "1px", backgroundColor: "#F0EAE0", margin: "4px 0" }} />

              <button
                onClick={() => setSelectedAreas(selectedAreas.size === ALL_AREAS.length ? new Set() : new Set(ALL_AREAS))}
                style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "none",
                  backgroundColor: "transparent", cursor: "pointer", textAlign: "left",
                  fontSize: "10px", fontWeight: 700, color: "#F97316" }}>
                {selectedAreas.size === ALL_AREAS.length ? "Deselect All" : "Select All"}
              </button>
              <div style={{ height: "1px", backgroundColor: "#F0EAE0", margin: "4px 0" }} />

              {ALL_AREAS.map((area) => {
                const sel = selectedAreas.has(area); const meta = AREA_META[area];
                return (
                  <button key={area} onClick={() => toggleArea(area)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "8px",
                    padding: "6px 8px", borderRadius: "6px", border: "none",
                    backgroundColor: sel ? "#FFF7ED" : "transparent", cursor: "pointer",
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: "3px", flexShrink: 0,
                      border: `2px solid ${sel ? meta.color : "#C8BFB5"}`,
                      backgroundColor: sel ? meta.color : "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <Check size={8} color="#FFFFFF" strokeWidth={3} />}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 600,
                      color: sel ? "#EA580C" : "#78716C" }}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden lg:block" style={{ flex: 1 }} />

        <div className="flex flex-1 lg:flex-none lg:w-60">
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={12} color="#78716C" style={{
                  position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search habits..."
                  className="search-input"
                  style={{
                    width: "100%", padding: "7px 10px 7px 28px", borderRadius: "8px",
                    backgroundColor: "#FFFFFF", fontSize: "12px", color: "#1C1917",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button onClick={clearSearch} style={{
                flexShrink: 0, width: "30px", height: "30px", borderRadius: "8px",
                border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <X size={13} color="#78716C" />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "6px",
              padding: "7px 10px", borderRadius: "8px",
              border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
              fontSize: "12px", color: "#1C1917", cursor: "pointer",
            }}>
              <Search size={12} color="#78716C" />
              <span style={{ color: "#78716C" }}>Search habits...</span>
            </button>
          )}
        </div>
      </div>

      {/* Habit grid */}
      <div className="px-page" style={{ paddingTop: "24px", paddingBottom: "24px" }}>
        {showSearch ? (
          <>
            <p style={{ fontSize: "12px", color: "#78716C", marginBottom: "16px" }}>
              <span style={{ fontWeight: 700, color: "#1C1917" }}>{searchResults.length}</span>{" "}
              result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
            </p>
            {searchResults.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
                <p style={{ fontSize: "13px", color: "#A8A29E" }}>No habits match your search</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "14px" }}>
                {searchResults.map((h) => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    onClick={() => setDetailHabit(habits.find((x) => x.id === h.id) ?? h)}
                    onToggleToday={handleToggle}
                    onStep={handleStep}
                    onToggleDate={handleToggleDate}
                  />
                ))}
              </div>
            )}
          </>
        ) : filtered.length === 0 ? (
          <EmptyState area={selectedAreas.size === 1 ? [...selectedAreas][0] : null}
            onAdd={() => setCreateOpen(true)} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "14px" }}>
            {filtered.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                onClick={() => setDetailHabit(habits.find((x) => x.id === h.id) ?? h)}
                onToggleToday={handleToggle}
                onStep={handleStep}
                onToggleDate={handleToggleDate}
              />
            ))}
            <button
              onClick={() => setCreateOpen(true)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "8px",
                backgroundColor: "#FFFFFF", border: "2px dashed #E8DDD0",
                borderRadius: "12px", padding: "28px 16px",
                cursor: "pointer", color: "#A8A29E",
                transition: "border-color 0.2s, color 0.2s", minHeight: "140px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#F97316";
                (e.currentTarget as HTMLButtonElement).style.color = "#F97316";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#E8DDD0";
                (e.currentTarget as HTMLButtonElement).style.color = "#A8A29E";
              }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%",
                border: "2px dashed currentColor",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={16} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>New habit</span>
            </button>
          </div>
        )}
      </div>

      <HabitCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={addHabit}
        goals={goals}
      />
      <HabitDetailSheet
        habit={detailHabit}
        onClose={() => setDetailHabit(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        goals={goals}
      />
    </div>
  );
}

function HeaderStat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px",
        justifyContent: "flex-end", marginBottom: "2px" }}>
        {icon}
        <p style={{ fontSize: "12px", fontWeight: 500, color: "#78716C", margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: "20px", fontWeight: 700, color, lineHeight: 1, margin: 0 }}>{value}</p>
    </div>
  );
}

function EmptyState({ area, onAdd }: { area: LifeArea | null; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "12px", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "50%",
        backgroundColor: "#FFF7ED",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Flame size={28} color="#F97316" />
      </div>
      <p style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
        {area ? `No ${area} habits yet` : "No habits here"}
      </p>
      <p style={{ fontSize: "13px", color: "#78716C", maxWidth: "320px", lineHeight: 1.5 }}>
        Habits are the bridge between your goals and daily actions. Start small and stay consistent.
      </p>
      <button onClick={onAdd} style={{
        marginTop: "4px", padding: "10px 20px", borderRadius: "10px",
        border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)",
        fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
      }}>
        Add your first habit
      </button>
    </div>
  );
}
