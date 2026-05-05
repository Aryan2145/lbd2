"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { AREA_META, type LifeArea } from "@/components/goals/GoalCard";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_VALUES   = 5;
const CIRCLE_DIAM  = 280;
const CIRCLE_R     = CIRCLE_DIAM / 2; // 140
const CARD_W       = 228;
const CY           = 480;
const CANVAS_H     = CY + 450; // 930

// Pentagon slot angles, starting at top (12 o'clock), clockwise
const SLOT_ANGLES = Array.from({ length: MAX_VALUES }, (_, i) =>
  ((-90 + i * 72) * Math.PI) / 180
);

// Desktop card positions (dx, dy from circle center)
const AREAS: { id: LifeArea; dx: number; dy: number }[] = [
  { id: "professional",  dx:    0, dy: -335 },
  { id: "contribution",  dx:  385, dy: -175 },
  { id: "wealth",        dx:  435, dy:   65 },
  { id: "spiritual",     dx:  345, dy:  285 },
  { id: "personal",      dx: -345, dy:  285 },
  { id: "relationships", dx: -435, dy:   65 },
  { id: "health",        dx: -385, dy: -175 },
];

// Pre-defined value chips per area
const DEFAULT_CHIPS: Record<LifeArea, string[]> = {
  professional:  ["Ambition", "Excellence", "Leadership", "Innovation", "Integrity", "Discipline", "Mastery"],
  contribution:  ["Service", "Empathy", "Generosity", "Impact", "Community", "Compassion", "Kindness"],
  wealth:        ["Abundance", "Security", "Freedom", "Opportunity", "Prosperity", "Growth", "Stewardship"],
  spiritual:     ["Faith", "Mindfulness", "Purpose", "Gratitude", "Peace", "Wisdom", "Presence"],
  personal:      ["Learning", "Resilience", "Courage", "Authenticity", "Curiosity", "Creativity", "Growth"],
  relationships: ["Love", "Trust", "Loyalty", "Connection", "Family", "Respect", "Presence"],
  health:        ["Vitality", "Balance", "Energy", "Strength", "Longevity", "Wellness", "Consistency"],
};

type SelectedValue = { area: LifeArea; value: string };
type StoredData    = { selected: SelectedValue[]; custom: Partial<Record<LifeArea, string[]>> };

function loadData(): StoredData {
  try {
    const raw = localStorage.getItem("lbd_values_v1");
    if (raw) return JSON.parse(raw) as StoredData;
  } catch {}
  return { selected: [], custom: {} };
}

function saveData(d: StoredData) {
  try { localStorage.setItem("lbd_values_v1", JSON.stringify(d)); } catch {}
}

// ── Value Circle ──────────────────────────────────────────────────────────────
function ValueCircle({ selected, size = CIRCLE_DIAM }: { selected: SelectedValue[]; size?: number }) {
  const half  = size / 2;
  const slotR = size * 0.315;
  const slots = Array.from({ length: MAX_VALUES }, (_, i) => selected[i] ?? null);

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: "#FFFBF5",
      border: "2.5px solid #EDE5D8",
      position: "relative", flexShrink: 0,
      boxShadow: "0 8px 40px rgba(249,115,22,0.12), 0 2px 12px rgba(28,25,23,0.06)",
    }}>
      {/* Inner decorative ring */}
      <div style={{
        position: "absolute", inset: "18px", borderRadius: "50%",
        border: "1px dashed #E8DDD0", pointerEvents: "none",
      }} />

      {/* Center label */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center", pointerEvents: "none", zIndex: 1,
      }}>
        <p style={{ fontSize: "9px", fontWeight: 700, color: "#A8A29E",
          textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
          Core Values
        </p>
        {selected.length === 0 ? (
          <p style={{ fontSize: "10px", color: "#A8A29E", margin: "3px 0 0", lineHeight: 1.4 }}>
            Select up<br />to 5
          </p>
        ) : (
          <p style={{ fontSize: "26px", fontWeight: 700, color: "#1C1917", margin: "2px 0 0", lineHeight: 1 }}>
            {selected.length}
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#78716C" }}>/5</span>
          </p>
        )}
      </div>

      {/* Value slots */}
      {slots.map((sv, i) => {
        const angle = SLOT_ANGLES[i];
        const x     = half + slotR * Math.cos(angle);
        const y     = half + slotR * Math.sin(angle);
        const meta  = sv ? AREA_META[sv.area] : null;

        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y,
            transform: "translate(-50%, -50%)", zIndex: 2,
          }}>
            {sv ? (
              <div style={{
                padding: "5px 10px", borderRadius: "20px",
                backgroundColor: meta!.color,
                boxShadow: `0 2px 10px ${meta!.color}55`,
                maxWidth: 90, textAlign: "center",
              }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#FFFFFF",
                  margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {sv.value}
                </p>
              </div>
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: "50%",
                border: "1.5px dashed #D6C5B4" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Area Value Card ───────────────────────────────────────────────────────────
function AreaValueCard({
  areaId, selected, custom, canAdd, onToggle, onAddCustom, fullWidth,
}: {
  areaId:      LifeArea;
  selected:    SelectedValue[];
  custom:      string[];
  canAdd:      boolean;
  onToggle:    (area: LifeArea, value: string) => void;
  onAddCustom: (area: LifeArea, value: string) => void;
  fullWidth?:  boolean;
}) {
  const meta         = AREA_META[areaId];
  const chips        = [...DEFAULT_CHIPS[areaId], ...custom];
  const areaSelected = selected.filter((s) => s.area === areaId);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput]     = useState("");

  function submit() {
    const v = input.trim();
    if (!v) return;
    onAddCustom(areaId, v);
    setInput("");
    setAddMode(false);
  }

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      border: `1.5px solid ${meta.color}22`,
      borderRadius: "16px",
      overflow: "hidden",
      width: fullWidth ? "100%" : CARD_W,
      boxShadow: "0 2px 12px rgba(28,25,23,0.06)",
    }}>
      {/* Top accent bar */}
      <div style={{ height: 4, backgroundColor: meta.color }} />

      {/* Header */}
      <div style={{
        padding: "11px 14px 9px",
        display: "flex", alignItems: "center", gap: "6px",
        borderBottom: `1px solid ${meta.color}15`,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%",
          backgroundColor: meta.color, flexShrink: 0 }} />
        <p style={{ fontSize: "10px", fontWeight: 700, color: meta.color,
          textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, flex: 1 }}>
          {meta.label}
        </p>
        {areaSelected.length > 0 && (
          <span style={{
            fontSize: "9px", fontWeight: 700, color: meta.color,
            backgroundColor: meta.bg, padding: "2px 7px", borderRadius: "10px",
          }}>
            {areaSelected.length} ✓
          </span>
        )}
      </div>

      {/* Chips */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
        {chips.map((v) => {
          const isSelected = areaSelected.some((s) => s.value === v);
          const disabled   = !isSelected && !canAdd;
          return (
            <button
              key={v}
              onClick={() => !disabled && onToggle(areaId, v)}
              style={{
                padding: "4px 10px", borderRadius: "20px",
                cursor: disabled ? "not-allowed" : "pointer",
                border: `1.5px solid ${isSelected ? meta.color : disabled ? "#E8DDD0" : meta.color + "55"}`,
                backgroundColor: isSelected ? meta.color : disabled ? "#F9F7F5" : meta.bg,
                fontSize: "11px", fontWeight: 600,
                color: isSelected ? "#FFFFFF" : disabled ? "#B4A898" : meta.color,
                transition: "all 0.12s",
              }}
            >
              {v}
            </button>
          );
        })}

        {/* Add custom chip */}
        {addMode ? (
          <div style={{ display: "flex", gap: "4px", alignItems: "center",
            width: "100%", marginTop: "2px" }}>
            <input
              autoFocus value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your value…"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") { setAddMode(false); setInput(""); }
              }}
              style={{
                flex: 1, padding: "4px 9px", borderRadius: "8px",
                border: `1.5px solid ${meta.color}`,
                fontSize: "11px", outline: "none",
                backgroundColor: meta.bg, color: meta.color,
              }}
            />
            <button
              onClick={() => { setAddMode(false); setInput(""); }}
              style={{
                width: 22, height: 22, borderRadius: 5, border: "none",
                backgroundColor: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0,
              }}
            >
              <X size={11} color="#A8A29E" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddMode(true)}
            style={{
              padding: "4px 9px", borderRadius: "20px",
              border: "1.5px dashed #C4B5A8",
              backgroundColor: "transparent",
              fontSize: "11px", fontWeight: 600, color: "#78716C",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "3px",
            }}
          >
            <Plus size={10} color="#78716C" /> Custom
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ValuesPage() {
  const [selected, setSelected] = useState<SelectedValue[]>([]);
  const [custom, setCustom]     = useState<Partial<Record<LifeArea, string[]>>>({});
  const [mobileTab, setMobileTab] = useState<"values" | "circle">("values");
  const [CX, setCX]             = useState(0);
  const containerRef            = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    const d = loadData();
    setSelected(d.selected);
    setCustom(d.custom);
    setHydrated(true);
  }, []);

  // Measure canvas container width
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      if (w > 0) setCX(w / 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Persist to localStorage on any change
  useEffect(() => {
    if (!hydrated) return;
    saveData({ selected, custom });
  }, [selected, custom, hydrated]);

  function toggleValue(area: LifeArea, value: string) {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.area === area && s.value === value);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      if (prev.length >= MAX_VALUES) return prev;
      return [...prev, { area, value }];
    });
  }

  function addCustom(area: LifeArea, value: string) {
    setCustom((prev) => ({
      ...prev,
      [area]: [...(prev[area] ?? []), value],
    }));
  }

  const canAdd = selected.length < MAX_VALUES;

  // SVG connector line from circle edge toward card center
  function lineFor(dx: number, dy: number) {
    if (CX === 0) return null;
    const d = Math.hypot(dx, dy);
    if (d === 0) return null;
    return {
      x1: CX + (CIRCLE_R + 14) * (dx / d),
      y1: CY  + (CIRCLE_R + 14) * (dy / d),
      x2: CX + dx,
      y2: CY  + dy,
    };
  }

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-page" style={{
        paddingTop: "18px", paddingBottom: "14px",
        borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: "8px",
        backgroundColor: "#FAF5EE",
      }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Values
          </p>
          <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Life Values
          </h1>
          <p className="hidden lg:block" style={{ fontSize: "12px", color: "#57534E", marginTop: "3px" }}>
            Choose up to 5 core values that define how you live — one per slot in the circle.
          </p>
        </div>

        {/* Counter stat */}
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#57534E", marginBottom: "2px" }}>
            Values selected
          </p>
          <p style={{ fontSize: "24px", fontWeight: 700, color: "#1C1917", lineHeight: 1 }}>
            {selected.length}
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#57534E" }}>/5</span>
          </p>
        </div>
      </div>

      {/* ── Mobile layout (< lg) ────────────────────────────────────────────── */}
      <div className="block lg:hidden" style={{ backgroundColor: "#FAF5EE" }}>

        {/* Tab switcher */}
        <div style={{
          display: "flex", padding: "12px 16px 0", gap: "8px",
          borderBottom: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
        }}>
          {(["values", "circle"] as const).map((tab) => (
            <button key={tab} onClick={() => setMobileTab(tab)} style={{
              padding: "9px 20px", borderRadius: "10px 10px 0 0",
              fontSize: "13px", fontWeight: 600,
              border: "none", cursor: "pointer",
              backgroundColor: mobileTab === tab ? "#FAF5EE" : "transparent",
              color: mobileTab === tab ? "#F97316" : "#78716C",
              borderBottom: mobileTab === tab ? "2px solid #F97316" : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              {tab === "values" ? "Values" : "Value Circle"}
            </button>
          ))}
        </div>

        {/* Values tab — scrollable area cards */}
        {mobileTab === "values" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            gap: "16px", padding: "20px 16px 40px" }}>
            {AREAS.map(({ id }) => (
              <AreaValueCard
                key={id}
                areaId={id} selected={selected} custom={custom[id] ?? []}
                canAdd={canAdd} onToggle={toggleValue} onAddCustom={addCustom}
                fullWidth
              />
            ))}
          </div>
        )}

        {/* Circle tab */}
        {mobileTab === "circle" && (
          <div style={{ padding: "32px 16px 40px", display: "flex",
            flexDirection: "column", alignItems: "center", gap: "24px" }}>
            <ValueCircle selected={selected} size={260} />

            {selected.length > 0 ? (
              <div style={{ width: "100%", maxWidth: "420px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "#78716C",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  Your Core Values
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selected.map((sv, i) => {
                    const meta = AREA_META[sv.area];
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        backgroundColor: "#FFFFFF", borderRadius: "10px",
                        padding: "10px 12px", border: "1px solid #EDE5D8",
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%",
                          backgroundColor: meta.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "#1C1917" }}>
                          {sv.value}
                        </span>
                        <span style={{
                          fontSize: "10px", color: meta.color, fontWeight: 600,
                          backgroundColor: meta.bg, padding: "2px 7px", borderRadius: "8px",
                        }}>
                          {meta.label}
                        </span>
                        <button
                          onClick={() => toggleValue(sv.area, sv.value)}
                          style={{
                            width: 22, height: 22, borderRadius: 5, border: "none",
                            backgroundColor: "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", padding: 0,
                          }}
                        >
                          <X size={11} color="#A8A29E" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "#78716C", textAlign: "center" }}>
                Switch to the Values tab to choose your core values.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop canvas (≥ lg) ────────────────────────────────────────────── */}
      <div className="hidden lg:block" style={{ overflowX: "auto" }}>
        <div
          ref={containerRef}
          style={{
            position: "relative", width: "100%", minWidth: 1100,
            height: CANVAS_H, userSelect: "none",
          }}
        >
          {/* Connector lines SVG */}
          <svg style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            pointerEvents: "none", overflow: "visible",
          }}>
            {AREAS.map(({ id, dx, dy }) => {
              const L = lineFor(dx, dy);
              if (!L) return null;
              const hasValues = selected.some((s) => s.area === id);
              const color = AREA_META[id].color;
              return (
                <g key={id}>
                  <line
                    x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2}
                    stroke={color}
                    strokeWidth={hasValues ? 1.5 : 1}
                    strokeDasharray={hasValues ? "none" : "6 5"}
                    strokeOpacity={hasValues ? 0.45 : 0.28}
                  />
                  <circle cx={L.x2} cy={L.y2} r={4} fill={color} opacity={0.35} />
                </g>
              );
            })}
          </svg>

          {/* Value Circle */}
          {CX > 0 && (
            <div style={{
              position: "absolute",
              left: CX - CIRCLE_R,
              top:  CY  - CIRCLE_R,
              zIndex: 3,
              filter: "drop-shadow(0 8px 32px rgba(249,115,22,0.10))",
              pointerEvents: "none",
            }}>
              <ValueCircle selected={selected} size={CIRCLE_DIAM} />
              <p style={{
                textAlign: "center", marginTop: "10px",
                fontSize: "10px", color: "#78716C", fontWeight: 500,
              }}>
                {MAX_VALUES - selected.length} slot{MAX_VALUES - selected.length !== 1 ? "s" : ""} remaining
              </p>
            </div>
          )}

          {/* Area value cards */}
          {CX > 0 && AREAS.map(({ id, dx, dy }) => (
            <div key={id} style={{
              position: "absolute",
              left: CX + dx, top: CY + dy,
              transform: "translate(-50%, -50%)",
              zIndex: 5,
            }}>
              <AreaValueCard
                areaId={id} selected={selected} custom={custom[id] ?? []}
                canAdd={canAdd} onToggle={toggleValue} onAddCustom={addCustom}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
