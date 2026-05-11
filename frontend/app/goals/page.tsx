"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Target, Check, Search, X, ChevronDown } from "lucide-react";
import GoalCard, { type GoalData, type LifeArea, AREA_META } from "@/components/goals/GoalCard";
import GoalCreateSheet from "@/components/goals/GoalCreateSheet";
import GoalDetailSheet from "@/components/goals/GoalDetailSheet";
import { useAppStore } from "@/lib/AppStore";

const ALL_AREAS: LifeArea[] = [
  "professional", "wealth", "health", "contribution", "personal", "relationships", "spiritual",
];

type StatusFilter = "all" | "active" | "at-risk";

const STATUS_OPTIONS = [
  { value: "all"      as StatusFilter, label: "All Goals"   },
  { value: "active"   as StatusFilter, label: "In Progress" },
  { value: "at-risk"  as StatusFilter, label: "At Risk"     },
];

function isStale(g: GoalData) {
  return Math.floor((Date.now() - g.lastMoved) / (1000 * 60 * 60 * 24)) >= 14;
}

function applyFilter(goals: GoalData[], areas: Set<LifeArea>, status: StatusFilter): GoalData[] {
  let result = areas.size === 0 || areas.size === ALL_AREAS.length ? goals : goals.filter((g) => areas.has(g.area as LifeArea));
  if (status === "active")  return result.filter((g) => g.progress > 0 && g.progress < 100);
  if (status === "at-risk") return result.filter((g) => isStale(g) || g.velocity < 0);
  return result;
}

export default function GoalsPage() {
  const { goals, habits, tasks, addGoal, updateGoal, deleteGoal, addTask, addHabit, updateTask, updateHabit } = useAppStore();

  const [selectedAreas, setSelectedAreas] = useState<Set<LifeArea>>(new Set(ALL_AREAS));
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editGoal,      setEditGoal]      = useState<GoalData | null>(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchOpen,    setSearchOpen]    = useState(false);
  const searchRef      = useRef<HTMLInputElement>(null);
  const areaDropRef    = useRef<HTMLDivElement>(null);
  const statusDropRef  = useRef<HTMLDivElement>(null);
  const [areaDropOpen,   setAreaDropOpen]   = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (areaDropRef.current && !areaDropRef.current.contains(e.target as Node))
        setAreaDropOpen(false);
      if (statusDropRef.current && !statusDropRef.current.contains(e.target as Node))
        setStatusDropOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function clearSearch() { setSearchQuery(""); setSearchOpen(false); }

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? goals.filter((g) =>
        g.statement.toLowerCase().includes(q) ||
        g.outcome.toLowerCase().includes(q)
      )
    : [];
  const showSearch = q.length > 0;
  const [detailGoal, setDetailGoal] = useState<GoalData | null>(null);

  const filtered    = applyFilter(goals, selectedAreas, statusFilter);

  function toggleArea(area: LifeArea) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area); else next.add(area);
      return next;
    });
  }
  const staleCount  = goals.filter(isStale).length;
  const avgProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  const linkedHabitsFor = (goalId: string) =>
    habits.filter((h) => h.linkedGoalId === goalId);

  const linkedTasksFor = (goalId: string) =>
    tasks.filter((t) => t.linkedGoalId === goalId);

  const handleUpdate = (updated: GoalData) => {
    updateGoal(updated);
    // Only keep the detail sheet in sync if it's already open for this goal
    setDetailGoal((prev) => prev?.id === updated.id ? updated : prev);
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FFFFFF" }}>

      {/* Header */}
      <div className="px-page" style={{ paddingTop: "18px", paddingBottom: "14px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Goals
          </p>
          <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Goal Tracker
          </h1>
          <p style={{ fontSize: "12px", color: "#78716C", marginTop: "3px" }}>
            Track meaningful goals tied to your life vision.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "20px",
            padding: "10px 18px", borderRadius: "12px",
            backgroundColor: "#FFFFFF",
            border: "1.5px solid #E8DDD0",
            boxShadow: "0 2px 8px rgba(28,25,23,0.06)",
          }}>
            <Stat label="Goals defined"   value={`${goals.length}`} unit=""  color="#1C1917" />
            <div style={{ width: 1, height: 32, backgroundColor: "#E8DDD0" }} />
            <Stat label="Avg. progress"   value={`${avgProgress}`}  unit="%" color="#EA580C" />
            {staleCount > 0 && (
              <>
                <div style={{ width: 1, height: 32, backgroundColor: "#E8DDD0" }} />
                <Stat label="Need attention" value={`${staleCount}`}  unit=""  color="#DC2626" />
              </>
            )}
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 16px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
            }}>
            <Plus size={14} /> Add Goal
          </button>
        </div>
      </div>

      {/* Unified filter bar */}
      <div className="px-page no-scrollbar" style={{ paddingTop: "10px", paddingBottom: "10px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", gap: "8px", overflowX: "auto" }}>

        {/* Life Areas dropdown */}
        <div style={{ position: "relative", flexShrink: 0 }} ref={areaDropRef}>
          <button onClick={() => { setAreaDropOpen(!areaDropOpen); setStatusDropOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "8px", whiteSpace: "nowrap",
            border: `1.5px solid ${selectedAreas.size < ALL_AREAS.length ? "#F97316" : "#E8DDD0"}`,
            backgroundColor: selectedAreas.size < ALL_AREAS.length ? "#FFF7ED" : "#FFFFFF",
            fontSize: "11px", fontWeight: 600,
            color: selectedAreas.size < ALL_AREAS.length ? "#F97316" : "#78716C", cursor: "pointer",
          }}>
            Life Areas
            {selectedAreas.size < ALL_AREAS.length && (
              <span style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "#F97316",
                color: "#FFFFFF", borderRadius: "10px", padding: "1px 5px" }}>
                {selectedAreas.size}
              </span>
            )}
            <ChevronDown size={11} style={{ transition: "transform 0.15s",
              transform: areaDropOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          {areaDropOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
              backgroundColor: "#FFFFFF", border: "1px solid #E8DDD0", borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "6px", minWidth: "200px" }}>
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
                    <span style={{ fontSize: "12px", fontWeight: 600, color: sel ? "#EA580C" : "#78716C" }}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status dropdown */}
        <div style={{ position: "relative", flexShrink: 0 }} ref={statusDropRef}>
          <button onClick={() => { setStatusDropOpen(!statusDropOpen); setAreaDropOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "8px", whiteSpace: "nowrap",
            border: `1.5px solid ${statusFilter !== "all" ? "#F97316" : "#E8DDD0"}`,
            backgroundColor: statusFilter !== "all" ? "#FFF7ED" : "#FFFFFF",
            fontSize: "11px", fontWeight: 600,
            color: statusFilter !== "all" ? "#F97316" : "#78716C", cursor: "pointer",
          }}>
            {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
            {statusFilter === "at-risk" && staleCount > 0 && (
              <span style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "#F97316",
                color: "#FFFFFF", borderRadius: "10px", padding: "1px 5px" }}>
                {staleCount}
              </span>
            )}
            <ChevronDown size={11} style={{ transition: "transform 0.15s",
              transform: statusDropOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          {statusDropOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
              backgroundColor: "#FFFFFF", border: "1px solid #E8DDD0", borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "6px", minWidth: "160px" }}>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => { setStatusFilter(value); setStatusDropOpen(false); }} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "8px",
                  padding: "7px 8px", borderRadius: "6px", border: "none",
                  backgroundColor: statusFilter === value ? "#FFF7ED" : "transparent", cursor: "pointer",
                }}>
                  <span style={{ width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${statusFilter === value ? "#F97316" : "#D5C9BC"}`,
                    backgroundColor: statusFilter === value ? "#F97316" : "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {statusFilter === value && (
                      <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#FFFFFF" }} />
                    )}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 600,
                    color: statusFilter === value ? "#EA580C" : "#78716C" }}>
                    {label}
                  </span>
                  {value === "at-risk" && staleCount > 0 && (
                    <span style={{ marginLeft: "auto", fontSize: "9px", fontWeight: 700,
                      backgroundColor: "#F97316", color: "#FFFFFF",
                      borderRadius: "10px", padding: "1px 5px" }}>
                      {staleCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: "8px" }} />

        {/* Search bar */}
        <div style={{ width: "200px", flexShrink: 0, display: "flex" }}>
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={12} color="#78716C" style={{
                  position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search goals..."
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
              <span style={{ color: "#78716C" }}>Search goals...</span>
            </button>
          )}
        </div>
      </div>

      {/* Goal grid */}
      <div className="px-page" style={{ paddingTop: "24px", paddingBottom: "24px" }}>
        {showSearch ? (
          <>
            <p style={{ fontSize: "12px", color: "#78716C", marginBottom: "16px" }}>
              <span style={{ fontWeight: 700, color: "#1C1917" }}>{searchResults.length}</span>{" "}
              result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
            </p>
            {searchResults.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
                <p style={{ fontSize: "13px", color: "#A8A29E" }}>No goals match your search</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {searchResults.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    linkedHabits={linkedHabitsFor(g.id)}
                    linkedTasks={linkedTasksFor(g.id)}
                    onUpdate={handleUpdate}
                    onClick={() => setDetailGoal(g)}
                  />
                ))}
              </div>
            )}
          </>
        ) : selectedAreas.size === 0 ? (
          <NoAreaState />
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setCreateOpen(true)} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {filtered.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                linkedHabits={linkedHabitsFor(g.id)}
                linkedTasks={linkedTasksFor(g.id)}
                onUpdate={handleUpdate}
                onClick={() => setDetailGoal(g)}
              />
            ))}
            <button
              onClick={() => setCreateOpen(true)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "8px",
                backgroundColor: "#FFFFFF", border: "2px dashed #E8DDD0",
                borderRadius: "12px", padding: "32px 16px",
                cursor: "pointer", color: "#A8A29E",
                transition: "border-color 0.2s, color 0.2s", minHeight: "160px",
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
              <span style={{ fontSize: "12px", fontWeight: 600 }}>New goal</span>
            </button>
          </div>
        )}
      </div>

      <GoalCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={addGoal}
        onSaveTask={addTask}
        onSaveHabit={addHabit}
      />
      <GoalCreateSheet
        open={!!editGoal}
        onClose={() => setEditGoal(null)}
        initialData={editGoal ?? undefined}
        onSave={(g) => { updateGoal(g); setEditGoal(null); }}
        onSaveTask={addTask}
        onSaveHabit={addHabit}
      />
      <GoalDetailSheet
        goal={detailGoal}
        linkedHabits={detailGoal ? linkedHabitsFor(detailGoal.id) : []}
        tasks={tasks}
        onClose={() => setDetailGoal(null)}
        onUpdate={handleUpdate}
        onDelete={(id) => { deleteGoal(id); setDetailGoal(null); }}
        onEdit={(g) => { setDetailGoal(null); setEditGoal(g); }}
        onUpdateTask={updateTask}
        onUpdateHabit={updateHabit}
        onSaveTask={addTask}
        onSaveHabit={addHabit}
      />
    </div>
  );
}

function Stat({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "12px", fontWeight: 500, color: "#1C1917", marginBottom: "2px" }}>{label}</p>
      <p style={{ fontSize: "24px", fontWeight: 700, color, lineHeight: 1 }}>
        {value}<span style={{ fontSize: "14px", fontWeight: 500, color: "#1C1917" }}>{unit}</span>
      </p>
    </div>
  );
}

function NoAreaState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "10px", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "50%",
        backgroundColor: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Target size={24} color="#F97316" />
      </div>
      <p style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
        No life area selected
      </p>
      <p style={{ fontSize: "13px", color: "#78716C", maxWidth: "280px", lineHeight: 1.5, margin: 0 }}>
        Select at least one life area above to view your goals.
      </p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "12px", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "50%",
        backgroundColor: "#FFF7ED",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Target size={28} color="#F97316" />
      </div>
      <p style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>No goals yet</p>
      <p style={{ fontSize: "13px", color: "#78716C", maxWidth: "320px", lineHeight: 1.5 }}>
        Goals bridge your 10-year vision and daily actions.
      </p>
      <button onClick={onAdd} style={{
        marginTop: "4px", padding: "10px 20px", borderRadius: "10px",
        border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)",
        fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
      }}>
        Add your first goal
      </button>
    </div>
  );
}
