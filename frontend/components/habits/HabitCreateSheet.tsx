"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, ChevronDown, Check } from "lucide-react";
import { AREA_META, FREQ_LABEL, type HabitData, type HabitFrequency, type HabitType, type LifeArea } from "./HabitCard";
import type { GoalData, Milestone } from "@/components/goals/GoalCard";

const AREAS = Object.keys(AREA_META) as LifeArea[];
const FREQS = Object.keys(FREQ_LABEL) as HabitFrequency[];
const DAYS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const GOAL_AREA_META: Record<string, { label: string; color: string; bg: string }> = {
  professional:  { label: "Professional",   color: "#2563EB", bg: "#EFF6FF" },
  contribution:  { label: "Contribution",   color: "#7C3AED", bg: "#F5F3FF" },
  wealth:        { label: "Wealth",         color: "#C9A84C", bg: "#FEFCE8" },
  spiritual:     { label: "Spiritual",      color: "#059669", bg: "#ECFDF5" },
  personal:      { label: "Personal Growth",color: "#DB2777", bg: "#FDF2F8" },
  relationships: { label: "Relationships",  color: "#EA580C", bg: "#FFF7ED" },
  health:        { label: "Health",         color: "#DC2626", bg: "#FEF2F2" },
};

function fmtMilestoneDate(iso: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US",
    { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  open:                boolean;
  onClose:             () => void;
  onSave:              (h: HabitData) => void;
  onUpdate?:           (h: HabitData) => void;
  onDelete?:           (id: string) => void;
  goals:               GoalData[];
  initialGoalId?:      string;
  initialMilestoneId?: string;
  editHabit?:          HabitData;
}

export default function HabitCreateSheet({ open, onClose, onSave, onUpdate, onDelete, goals, initialGoalId, initialMilestoneId, editHabit }: Props) {
  const isEdit = !!editHabit;
  const [name,              setName]             = useState("");
  const [desc,              setDesc]             = useState("");
  const [area,              setArea]             = useState<LifeArea | "">("");
  const [frequency,         setFrequency]        = useState<HabitFrequency>("daily");
  const [customDays,        setCustomDays]       = useState<number[]>([1, 2, 3, 4, 5]);
  const [type,              setType]             = useState<HabitType>("binary");
  const [target,            setTarget]           = useState(1);
  const [unit,              setUnit]             = useState("");
  const [cue,               setCue]              = useState("");
  const [reward,            setReward]           = useState("");
  const [linkedGoalId,      setLinkedGoalId]     = useState("");
  const [linkedMilestoneId, setLinkedMilestoneId] = useState("");
  const nameRef  = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (editHabit) {
        setName(editHabit.name); setDesc(editHabit.description); setArea(editHabit.area);
        setFrequency(editHabit.frequency); setCustomDays(editHabit.customDays.length ? editHabit.customDays : [1,2,3,4,5]);
        setType(editHabit.type); setTarget(editHabit.target); setUnit(editHabit.unit);
        setCue(editHabit.cue); setReward(editHabit.reward);
        setLinkedGoalId(editHabit.linkedGoalId); setLinkedMilestoneId(editHabit.linkedMilestoneId);
      } else {
        setName(""); setDesc(""); setArea(""); setFrequency("daily");
        setCustomDays([1, 2, 3, 4, 5]); setType("binary"); setTarget(1); setUnit("");
        setCue(""); setReward("");
        setLinkedGoalId(initialGoalId ?? "");
        setLinkedMilestoneId(initialMilestoneId ?? "");
      }
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prevent = (e: Event) => {
      if (modalRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.addEventListener("wheel",     prevent, { passive: false });
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.removeEventListener("wheel",     prevent);
      document.removeEventListener("touchmove", prevent);
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const toggleDay = (d: number) =>
    setCustomDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort());

  const selectedGoal   = goals.find((g) => g.id === linkedGoalId);
  const goalMilestones = [...(selectedGoal?.milestones ?? [])].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const goalHasNoMilestones = !!linkedGoalId && goalMilestones.length === 0;
  const milestoneRequired   = !!linkedGoalId && goalMilestones.length > 0 && !linkedMilestoneId;

  const canSave = (
    name.trim().length > 0 &&
    area !== "" &&
    (type === "binary" || target >= 1) &&
    !goalHasNoMilestones &&
    !milestoneRequired
  );

  const handleGoalChange = (gId: string) => {
    setLinkedGoalId(gId);
    setLinkedMilestoneId("");
  };

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit && editHabit) {
      onUpdate?.({ ...editHabit, name: name.trim(), description: desc.trim(),
        area: area as LifeArea, frequency, customDays: frequency === "custom" ? customDays : [],
        cue: cue.trim(), reward: reward.trim(),
        type, target: type === "binary" ? 1 : target, unit: type === "binary" ? "" : unit.trim(),
      });
    } else {
      onSave({
        id: crypto.randomUUID(), name: name.trim(), description: desc.trim(),
        area: area as LifeArea, frequency, customDays: frequency === "custom" ? customDays : [],
        cue: cue.trim(), reward: reward.trim(),
        type, target: type === "binary" ? 1 : target, unit: type === "binary" ? "" : unit.trim(),
        completions: [], measurements: {}, linkedGoalId, linkedMilestoneId,
        createdAt: Date.now(),
      });
    }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)", backdropFilter: "blur(3px)", zIndex: 400 }} />
      <div ref={modalRef} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, maxWidth: "calc(100vw - 32px)", backgroundColor: "#FFFFFF", borderRadius: "18px", zIndex: 401, boxShadow: "0 24px 64px rgba(28,25,23,0.18)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EDE5D8", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F97316", margin: "0 0 3px" }}>{isEdit ? "Edit Habit" : "New Habit"}</p>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>{isEdit ? "Edit habit" : "Build a new habit"}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "8px", border: "none", backgroundColor: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} color="#DC2626" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          <Field label="Habit name">
            <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning meditation" style={inStyle}
              onKeyDown={(e) => { if (e.key === "Enter" && canSave) handleSave(); }} />
          </Field>

          <Field label="Description (optional)">
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. 10 mins of breath-focused meditation" style={inStyle} />
          </Field>

          {/* Habit type */}
          <Field label="Habit type">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(["binary", "measurable"] as HabitType[]).map((t) => (
                <button key={t} onClick={() => setType(t)} style={{
                  padding: "10px 12px", borderRadius: "10px", textAlign: "left",
                  border: `1.5px solid ${type === t ? "#F97316" : "#E8DDD0"}`,
                  backgroundColor: type === t ? "#FFF7ED" : "#FFFFFF", cursor: "pointer",
                }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, margin: 0,
                    color: type === t ? "#F97316" : "#1C1917" }}>
                    {t === "binary" ? "Yes / No" : "Measurable"}
                  </p>
                  <p style={{ fontSize: "10px", color: "#6B7280", margin: "2px 0 0" }}>
                    {t === "binary" ? "Done or not done" : "Track a daily count"}
                  </p>
                </button>
              ))}
            </div>
          </Field>

          {/* Target + unit */}
          {type === "measurable" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Daily target">
                <input type="number" min={1} value={target}
                  onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  style={inStyle} />
              </Field>
              <Field label="Unit (e.g. pages, mins)">
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
                  placeholder="pages" style={inStyle} />
              </Field>
            </div>
          )}

          {/* Life area */}
          <Field label="Life area *">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {AREAS.map((a) => {
                const m = AREA_META[a];
                return (
                  <button key={a} onClick={() => setArea(a)} style={{
                    padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                    border: `1.5px solid ${area === a ? m.color : "#E8DDD0"}`,
                    backgroundColor: area === a ? m.bg : "#FFFFFF",
                    color: area === a ? m.color : "#374151", cursor: "pointer",
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
                  color: frequency === f ? "#F97316" : "#374151", cursor: "pointer",
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
                    color: customDays.includes(i) ? "#FFFFFF" : "#374151", cursor: "pointer",
                  }}>
                    {day[0]}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* Goal link */}
          {goals.length > 0 && (
            <Field label="Goal (optional)">
              <GoalSelect goals={goals} value={linkedGoalId} onChange={handleGoalChange} zIndex={60} />
            </Field>
          )}

          {/* No milestones warning */}
          {goalHasNoMilestones && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              padding: "10px 12px", borderRadius: "8px",
              backgroundColor: "#FFFBEB", border: "1px solid #FCD34D", marginBottom: "16px",
            }}>
              <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "12px", color: "#92400E", margin: 0, lineHeight: 1.5 }}>
                This goal has no milestones yet — add milestones to the goal first to link this habit.
              </p>
            </div>
          )}

          {/* Milestone — required */}
          {linkedGoalId && goalMilestones.length > 0 && (
            <Field label="Milestone *">
              <MilestoneSelect milestones={goalMilestones} value={linkedMilestoneId}
                onChange={setLinkedMilestoneId} required zIndex={60} />
              {milestoneRequired && (
                <p style={{ fontSize: "11px", color: "#D97706", fontWeight: 500, marginTop: "5px" }}>
                  Habits must be linked to a specific milestone — pick one above.
                </p>
              )}
            </Field>
          )}

          {/* Habit loop */}
          <div style={{
            padding: "14px", borderRadius: "10px",
            backgroundColor: "#FFFFFF", border: "1px solid #EDE5D8", marginBottom: "16px",
          }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#6B7280", marginBottom: "10px" }}>
              Habit Loop (optional)
            </p>
            <div style={{ marginBottom: "10px" }}>
              <p style={labelSm}>Cue — what triggers this habit?</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#374151", whiteSpace: "nowrap" }}>After I</span>
                <input type="text" value={cue} onChange={(e) => setCue(e.target.value)}
                  placeholder="wake up / finish lunch…" style={{ ...inStyle, flex: 1 }} />
              </div>
            </div>
            <div>
              <p style={labelSm}>Reward — how will you celebrate?</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#374151", whiteSpace: "nowrap" }}>I will</span>
                <input type="text" value={reward} onChange={(e) => setReward(e.target.value)}
                  placeholder="enjoy a coffee / feel proud…" style={{ ...inStyle, flex: 1 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #EDE5D8", flexShrink: 0 }}>
          {isEdit && onDelete && (
            <button
              onClick={() => { onDelete(editHabit!.id); onClose(); }}
              style={{
                width: "100%", padding: "10px", borderRadius: "10px", border: "none",
                backgroundColor: "#FEE2E2", color: "#DC2626",
                fontSize: "13px", fontWeight: 600, cursor: "pointer", marginBottom: "8px",
              }}
            >
              Delete Habit
            </button>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={cancelBtn}>Cancel</button>
            <button onClick={handleSave} disabled={!canSave} style={{
              flex: 2, padding: "11px", borderRadius: "10px", border: "none",
              fontSize: "13px", fontWeight: 700,
              background: canSave ? "linear-gradient(135deg, #F97316, #EA580C)" : "#E8DDD0",
              color: canSave ? "#FFFFFF" : "#A8A29E",
              cursor: canSave ? "pointer" : "default",
              boxShadow: canSave ? "0 2px 8px rgba(249,115,22,0.3)" : "none",
            }}>
              {isEdit ? "Save Changes" : "Add Habit"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{lbl}</p>
      {children}
    </div>
  );
}

// ── Custom dropdowns ──────────────────────────────────────────────────────────

function GoalSelect({ goals, value, onChange, zIndex }: {
  goals: GoalData[]; value: string; onChange: (id: string) => void; zIndex: number;
}) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);
  const triggerRef        = useRef<HTMLButtonElement>(null);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0, maxH: 260 });

  const openDrop = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const vh = window.innerHeight;
    const estH = Math.min((goals.length + 1) * 38, 260);
    const fitsBelow = r.bottom + 6 + estH < vh - 56;
    setPos({
      top:  fitsBelow ? r.bottom + 4 : r.top - estH - 4,
      left: r.left, width: r.width,
      maxH: fitsBelow ? Math.min(260, vh - r.bottom - 64) : Math.min(260, r.top - 12),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const sel  = goals.find((g) => g.id === value);
  const meta = sel ? GOAL_AREA_META[sel.area] : null;

  return (
    <div ref={containerRef}>
      <button ref={triggerRef} onClick={() => open ? setOpen(false) : openDrop()} style={{
        width: "100%", padding: "9px 12px", borderRadius: "8px", boxSizing: "border-box",
        border: "1.5px solid #F97316",
        backgroundColor: "#FFFFFF", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {sel && meta ? (
          <>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, backgroundColor: meta.color }} />
            <span style={{ flex: 1, textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#1C1917",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sel.outcome || sel.statement.slice(0, 55)}
            </span>
            <span style={{ fontSize: "9px", fontWeight: 600, color: meta.color, backgroundColor: meta.bg,
              padding: "2px 7px", borderRadius: "8px", flexShrink: 0, whiteSpace: "nowrap" }}>
              {meta.label}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", fontSize: "13px", color: "#6B7280" }}>
            No linked goal
          </span>
        )}
        <ChevronDown size={13} color="#A8A29E" style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "fixed", top: pos.top, left: pos.left, width: pos.width,
          backgroundColor: "#FFFFFF", borderRadius: "10px",
          border: "1.5px solid #EDE5D8", boxShadow: "0 8px 32px rgba(28,25,23,0.16)",
          zIndex, maxHeight: pos.maxH, overflowY: "auto",
        }}>
          <button onClick={() => { onChange(""); setOpen(false); }} style={{
            width: "100%", padding: "7px 12px", border: "none", borderBottom: "1px solid #F2EAE0",
            backgroundColor: value === "" ? "#FFF7ED" : "#FFFFFF", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "11px", fontWeight: 500, color: "#78716C" }}>No linked goal</span>
            {value === "" && <Check size={11} color="#F97316" />}
          </button>

          {goals.map((g) => {
            const m = GOAL_AREA_META[g.area]; const isSel = g.id === value;
            return (
              <button key={g.id} onClick={() => { onChange(g.id); setOpen(false); }} style={{
                width: "100%", padding: "7px 12px", border: "none", borderBottom: "1px solid #F9F5EF",
                backgroundColor: isSel ? "#FFF7ED" : "#FFFFFF", cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: m.color, flexShrink: 0 }} />
                <p style={{ flex: 1, fontSize: "12px", fontWeight: 600, margin: 0,
                  color: isSel ? "#F97316" : "#1C1917",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.outcome || g.statement.slice(0, 60)}
                </p>
                <span style={{ fontSize: "9px", fontWeight: 600, color: m.color, backgroundColor: m.bg,
                  padding: "2px 7px", borderRadius: "8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {m.label}
                </span>
                {isSel && <Check size={11} color="#F97316" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MilestoneSelect({ milestones, value, onChange, required: req, zIndex }: {
  milestones: Milestone[]; value: string; onChange: (id: string) => void;
  required?: boolean; zIndex: number;
}) {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);
  const triggerRef        = useRef<HTMLButtonElement>(null);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0, maxH: 240 });

  const openDrop = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const vh = window.innerHeight;
    const estH = Math.min(milestones.length * 48, 240);
    const fitsBelow = r.bottom + 6 + estH < vh - 56;
    setPos({
      top:  fitsBelow ? r.bottom + 4 : r.top - estH - 4,
      left: r.left, width: r.width,
      maxH: fitsBelow ? Math.min(240, vh - r.bottom - 64) : Math.min(240, r.top - 12),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const sel       = milestones.find((m) => m.id === value);
  const needsPick = req && !value;

  return (
    <div ref={containerRef}>
      <button ref={triggerRef} onClick={() => open ? setOpen(false) : openDrop()} style={{
        width: "100%", padding: "9px 12px", borderRadius: "8px", boxSizing: "border-box",
        border: `1.5px solid ${needsPick ? "#DC2626" : "#F97316"}`,
        backgroundColor: needsPick ? "#FFFBEB" : "#FFFFFF", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        {sel ? (
          <>
            <span style={{ fontSize: "11px", color: "#D97706", flexShrink: 0 }}>◆</span>
            <span style={{ flex: 1, textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#1C1917",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sel.title}
            </span>
            <span style={{ fontSize: "9px", color: "#D97706", fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap" }}>
              {fmtMilestoneDate(sel.deadline)}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", fontSize: "13px",
            color: needsPick ? "#D97706" : "#A8A29E", fontWeight: needsPick ? 600 : 400 }}>
            {needsPick ? "Select a milestone *" : "— Select a milestone —"}
          </span>
        )}
        <ChevronDown size={13} color={needsPick ? "#D97706" : "#A8A29E"} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "fixed", top: pos.top, left: pos.left, width: pos.width,
          backgroundColor: "#FFFFFF", borderRadius: "10px",
          border: "1.5px solid #FCD34D", boxShadow: "0 8px 32px rgba(28,25,23,0.16)",
          zIndex, maxHeight: pos.maxH, overflowY: "auto",
        }}>
          {milestones.map((m) => {
            const isSel = m.id === value;
            return (
              <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }} style={{
                width: "100%", padding: "8px 12px", border: "none", borderBottom: "1px solid #F9F5EF",
                backgroundColor: isSel ? "#FFFBEB" : "#FFFFFF", cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{ fontSize: "11px", color: "#D97706", flexShrink: 0 }}>◆</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, margin: 0,
                    color: isSel ? "#D97706" : "#1C1917",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.title}
                  </p>
                  <p style={{ fontSize: "10px", color: "#A8A29E", margin: "2px 0 0" }}>
                    Due {fmtMilestoneDate(m.deadline)}
                  </p>
                </div>
                {m.completed && (
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#16A34A",
                    backgroundColor: "#F0FDF4", padding: "2px 6px", borderRadius: "8px", flexShrink: 0 }}>
                    Done
                  </span>
                )}
                {isSel && !m.completed && <Check size={11} color="#D97706" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "8px",
  border: "1.5px solid #F97316", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};
const cancelBtn: React.CSSProperties = {
  flex: 1, padding: "11px", borderRadius: "10px",
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "13px", fontWeight: 600, color: "#78716C", cursor: "pointer",
};
const labelSm: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "#374151", marginBottom: "5px",
};
