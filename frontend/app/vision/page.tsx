"use client";

import { useState, useEffect, useRef } from "react";
import WheelOfLife from "@/components/vision/WheelOfLife";
import PolaroidCard, { type AreaData } from "@/components/vision/PolaroidCard";
import AreaEditSheet from "@/components/vision/AreaEditSheet";
import { RotateCcw } from "lucide-react";
import { AREA_META } from "@/components/goals/GoalCard";
import type { LifeArea } from "@/components/goals/GoalCard";
import { api } from "@/lib/api";

// ── Constants ────────────────────────────────────────────────────────────────
const CY       = 420;
const WHEEL_PX = 320;
const RADAR_R  = Math.round(108 * (WHEEL_PX / 280)); // ~124px

// Card is 176×~220px — half-diagonal ≈ 141px. Add buffer → keep 290px from wheel center.
const MIN_CARD_DIST = RADAR_R + 165;

const AREAS_META = [
  { id: "professional",  name: "Professional",   rotation:  1.5 },
  { id: "contribution",  name: "Contribution",   rotation: -2.0 },
  { id: "wealth",        name: "Wealth",          rotation:  2.5 },
  { id: "spiritual",     name: "Spiritual",       rotation: -1.5 },
  { id: "personal",      name: "Personal Growth", rotation:  2.0 },
  { id: "relationships", name: "Relationships",   rotation: -2.5 },
  { id: "health",        name: "Health",          rotation:  1.0 },
];

// Default offsets from wheel center (dx, dy). Cards spread around the wheel.
const DEFAULT_OFFSETS: [number, number][] = [
  [    0, -320 ],  // Professional  — top
  [  420, -170 ],  // Contribution  — top-right
  [  470,   60 ],  // Wealth        — right
  [  360,  265 ],  // Spiritual     — bottom-right
  [ -360,  265 ],  // Personal      — bottom-left
  [ -470,   60 ],  // Relationships — left
  [ -420, -170 ],  // Health        — top-left
];

const N = AREAS_META.length;
const CANVAS_H = CY + 395; // bottom card center at CY+265, half-height ~110, +20 padding

type RelPos = { dx: number; dy: number };

const DEFAULT_REL_POS: Record<string, RelPos> = Object.fromEntries(
  AREAS_META.map((m, i) => [m.id, { dx: DEFAULT_OFFSETS[i][0], dy: DEFAULT_OFFSETS[i][1] }])
);

const EMPTY_AREAS: AreaData[] = AREAS_META.map((m) => ({
  id: m.id, name: m.name, text: "", score: 5, imageUrl: "",
}));

// Push a card away from the wheel center if it's too close
function clampAwayFromWheel(dx: number, dy: number): RelPos {
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { dx: 0, dy: -MIN_CARD_DIST };
  if (dist < MIN_CARD_DIST) {
    const scale = MIN_CARD_DIST / dist;
    return { dx: dx * scale, dy: dy * scale };
  }
  return { dx, dy };
}

function savePosToLS(pos: Record<string, RelPos>) {
  try { localStorage.setItem("lbd_vision_relpos_v2", JSON.stringify(pos)); } catch {}
}

function loadPosFromLS(): Record<string, RelPos> | null {
  try {
    const raw = localStorage.getItem("lbd_vision_relpos_v2");
    return raw ? (JSON.parse(raw) as Record<string, RelPos>) : null;
  } catch { return null; }
}

export default function VisionPage() {
  const [areas, setAreas]        = useState<AreaData[]>(EMPTY_AREAS);
  const [editingIdx, setEditing] = useState<number | null>(null);
  const [saving, setSaving]      = useState(false);
  const [CX, setCX]              = useState(0);
  // Mobile-only state
  const [mobileTab, setMobileTab]       = useState<"visions" | "wheel">("visions");
  const [wheelDetail, setWheelDetail]   = useState<number | null>(null);
  const [wheelHover, setWheelHover]     = useState<number | null>(null);
  const [relPos, setRelPos]      = useState<Record<string, RelPos>>(DEFAULT_REL_POS);
  const [dragging, setDragging]  = useState<{
    id: string;
    startMouseX: number; startMouseY: number;
    startDx: number; startDy: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Measure container and track CX on resize
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      if (w > 0) {
        setCX(w / 2);
        initializedRef.current = true;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Load saved data
  useEffect(() => {
    api.get<{ areas: AreaData[] }>("/vision").then((data) => {
      if (data.areas?.length) {
        setAreas((prev) => prev.map((a) => data.areas.find((d: AreaData) => d.id === a.id) ?? a));
      }
    }).catch(() => {});

    const saved = loadPosFromLS();
    if (saved) setRelPos((prev) => ({ ...prev, ...saved }));
  }, []);

  // ── Drag ────────────────────────────────────────────────────────────────────
  const startDrag = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const r = relPos[id] ?? DEFAULT_REL_POS[id];
    setDragging({ id, startMouseX: e.clientX, startMouseY: e.clientY, startDx: r.dx, startDy: r.dy });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setRelPos((prev) => ({
        ...prev,
        [dragging.id]: {
          dx: dragging.startDx + (e.clientX - dragging.startMouseX),
          dy: dragging.startDy + (e.clientY - dragging.startMouseY),
        },
      }));
    };
    const onUp = (e: MouseEvent) => {
      const moved = Math.hypot(e.clientX - dragging.startMouseX, e.clientY - dragging.startMouseY);
      if (moved < 6) {
        setEditing(AREAS_META.findIndex((m) => m.id === dragging.id));
      } else {
        setRelPos((prev) => {
          const r = prev[dragging.id];
          const clamped = clampAwayFromWheel(r.dx, r.dy);
          const next = { ...prev, [dragging.id]: clamped };
          savePosToLS(next);
          return next;
        });
      }
      setDragging(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const resetPositions = () => {
    setRelPos(DEFAULT_REL_POS);
    localStorage.removeItem("lbd_vision_relpos_v2");
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const scores      = areas.map((a) => a.score);
  const avgScore    = (scores.reduce((s, v) => s + v, 0) / N).toFixed(1);
  const filledCount = areas.filter((a) => a.text.trim().length > 0).length;

  const handleSave = (u: AreaData) => {
    const updated = areas.map((a) => (a.id === u.id ? u : a));
    setAreas(updated);
    setSaving(true);
    api.put("/vision", { areas: updated }).finally(() => setSaving(false));
  };

  // SVG connector line: from wheel edge → card center
  const lineFor = (id: string) => {
    const r = relPos[id];
    if (!r || CX === 0) return null;
    const d = Math.hypot(r.dx, r.dy);
    if (d === 0) return null;
    return {
      x1: CX + (RADAR_R + 10) * (r.dx / d),
      y1: CY + (RADAR_R + 10) * (r.dy / d),
      x2: CX + r.dx,
      y2: CY + r.dy,
    };
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-page" style={{
        paddingTop: "18px", paddingBottom: "14px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "8px",
      }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Vision
          </p>
          <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Vision Canvas
          </h1>
          <p className="hidden lg:block" style={{ fontSize: "12px", color: "#57534E", marginTop: "3px" }}>
            Drag cards to arrange your board. Click any card to edit.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {saving && <span style={{ fontSize: "11px", color: "#57534E" }}>Saving…</span>}
          <button
            className="hidden lg:flex items-center"
            onClick={resetPositions}
            style={{
              gap: "5px", padding: "6px 12px", borderRadius: "8px",
              border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
              fontSize: "11px", color: "#57534E", cursor: "pointer",
            }}
          >
            <RotateCcw size={11} /> Reset layout
          </button>
          <Stat label="Areas defined" value={`${filledCount}`} unit="/7"  color="#1C1917" />
          <Stat label="Avg. score"    value={avgScore}          unit="/10" color="#1C1917" />
        </div>
      </div>

      {/* ── Mobile layout (< lg) ─────────────────────────────────────────── */}
      <div className="block lg:hidden" style={{ backgroundColor: "#FAF5EE", minHeight: "calc(100vh - 56px)" }}>

        {/* Tab switcher */}
        <div style={{
          display: "flex", padding: "12px 16px 0", gap: "8px",
          borderBottom: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
        }}>
          {(["visions", "wheel"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setMobileTab(tab); setWheelDetail(null); }}
              style={{
                padding: "9px 20px",
                borderRadius: "10px 10px 0 0",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: mobileTab === tab ? "#FAF5EE" : "transparent",
                color: mobileTab === tab ? "#F97316" : "#78716C",
                borderBottom: mobileTab === tab ? "2px solid #F97316" : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {tab === "visions" ? "Visions" : "Wheel of Life"}
            </button>
          ))}
        </div>

        {/* ── Visions tab ── */}
        {mobileTab === "visions" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "20px", padding: "24px 20px 40px",
          }}>
            {AREAS_META.map((meta, i) => (
              <div key={meta.id} style={{ width: "100%", maxWidth: "340px" }}>
                <PolaroidCard
                  area={areas[i]}
                  rotation={0}
                  onClick={() => setEditing(i)}
                  accentColor={AREA_META[meta.id as LifeArea]?.color ?? "#F97316"}
                  accentBg={AREA_META[meta.id as LifeArea]?.bg ?? "#FFF7ED"}
                  cardWidth="100%"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Wheel of Life tab ── */}
        {mobileTab === "wheel" && (
          <div style={{ padding: "0 0 40px" }}>

            {/* Detail view — slide in when an area is selected */}
            {wheelDetail !== null ? (
              <div style={{ padding: "16px" }}>
                {/* Back */}
                <button
                  onClick={() => setWheelDetail(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "13px", fontWeight: 600,
                    color: "#57534E", padding: "4px 0", marginBottom: "20px",
                  }}
                >
                  ← Back to Wheel
                </button>

                {/* Area card */}
                {(() => {
                  const meta   = AREAS_META[wheelDetail];
                  const area   = areas[wheelDetail];
                  const accent = AREA_META[meta.id as LifeArea]?.color ?? "#F97316";
                  const bg     = AREA_META[meta.id as LifeArea]?.bg    ?? "#FFF7ED";
                  return (
                    <div style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "16px",
                      border: `1.5px solid ${accent}33`,
                      overflow: "hidden",
                    }}>
                      {/* Accent top bar */}
                      <div style={{ height: 4, background: accent }} />

                      <div style={{ padding: "20px" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                          <div>
                            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                              textTransform: "uppercase", color: accent, marginBottom: "2px" }}>
                              Life Area
                            </p>
                            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
                              {area.name}
                            </h2>
                          </div>
                          {/* Score badge */}
                          <div style={{
                            width: 56, height: 56, borderRadius: "50%",
                            backgroundColor: bg,
                            border: `2px solid ${accent}44`,
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontSize: "18px", fontWeight: 700, color: accent, lineHeight: 1 }}>
                              {area.score}
                            </span>
                            <span style={{ fontSize: "9px", color: "#78716C" }}>/10</span>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div style={{ marginBottom: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between",
                            fontSize: "11px", color: "#78716C", marginBottom: "6px" }}>
                            <span>Current score</span>
                            <span style={{ fontWeight: 600, color: accent }}>{area.score}/10</span>
                          </div>
                          <div style={{ height: 6, backgroundColor: "#F2EAE0", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 3,
                              width: `${(area.score / 10) * 100}%`,
                              background: accent,
                              transition: "width 0.4s ease",
                            }} />
                          </div>
                        </div>

                        {/* Vision text */}
                        <div style={{
                          backgroundColor: bg, borderRadius: "10px",
                          padding: "14px", marginBottom: "20px",
                          minHeight: "80px",
                        }}>
                          <p style={{ fontSize: "10px", fontWeight: 700, color: accent,
                            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                            10-Year Vision
                          </p>
                          {area.text ? (
                            <p style={{ fontSize: "13px", color: "#1C1917", lineHeight: 1.6, margin: 0 }}>
                              {area.text}
                            </p>
                          ) : (
                            <p style={{ fontSize: "13px", color: "#A8A29E", fontStyle: "italic", margin: 0 }}>
                              No vision added yet. Tap Edit to add yours.
                            </p>
                          )}
                        </div>

                        {/* Edit button */}
                        <button
                          onClick={() => { setWheelDetail(null); setEditing(wheelDetail); }}
                          style={{
                            width: "100%", padding: "12px",
                            borderRadius: "10px", border: "none",
                            background: accent,
                            color: "#FFFFFF", fontSize: "13px", fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {area.text ? "Edit Vision" : "Add Vision"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

            ) : (
              /* Wheel view */
              <div>
                <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px 8px" }}>
                  <WheelOfLife
                    scores={scores}
                    size={300}
                    interactive
                    activeIndex={wheelHover}
                    onAreaClick={(i) => { setWheelHover(i); setWheelDetail(i); }}
                  />
                </div>

                {/* Score list */}
                <div style={{ padding: "12px 16px 0" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "#78716C",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                    Scores
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {AREAS_META.map((meta, i) => {
                      const accent = AREA_META[meta.id as LifeArea]?.color ?? "#F97316";
                      return (
                        <button
                          key={meta.id}
                          onClick={() => setWheelDetail(i)}
                          style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            backgroundColor: "#FFFFFF", borderRadius: "10px",
                            padding: "10px 12px",
                            border: "1px solid #EDE5D8",
                            cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917",
                            flex: 1, minWidth: 0, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {meta.name}
                          </span>
                          <div style={{ flexShrink: 0, width: 80 }}>
                            <div style={{ height: 4, backgroundColor: "#F2EAE0", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${(areas[i].score / 10) * 100}%`,
                                background: accent,
                              }} />
                            </div>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: accent,
                            flexShrink: 0, minWidth: "30px", textAlign: "right" }}>
                            {areas[i].score}/10
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop canvas (≥ lg) ────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="hidden lg:block"
        style={{
          position: "relative", width: "100%", height: CANVAS_H,
          userSelect: "none",
          cursor: dragging ? "grabbing" : "default",
        }}
      >
        {/* Connector lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none", overflow: "visible" }}>
          {AREAS_META.map((m, i) => {
            const L = lineFor(m.id);
            if (!L) return null;
            const active = areas[i].text.trim().length > 0;
            return (
              <g key={m.id}>
                <line
                  x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2}
                  stroke={active ? "#F97316" : "#C9B89A"}
                  strokeWidth={active ? 1.5 : 1}
                  strokeDasharray={active ? "none" : "6,5"}
                  strokeOpacity={active ? 0.45 : 0.5}
                />
                <circle cx={L.x2} cy={L.y2} r={4.5}
                  fill={active ? "#F97316" : "#C9A84C"} opacity={0.45} />
              </g>
            );
          })}
        </svg>

        {/* Wheel of Life */}
        {CX > 0 && (
          <div style={{
            position: "absolute",
            left: CX - WHEEL_PX / 2, top: CY - WHEEL_PX / 2,
            width: WHEEL_PX, height: WHEEL_PX,
            filter: "drop-shadow(0 8px 32px rgba(249,115,22,0.13))",
            zIndex: 3, pointerEvents: "none",
          }}>
            <WheelOfLife scores={scores} size={WHEEL_PX} />
            <div style={{ position: "absolute", bottom: -32, left: "50%",
              transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap" }}>
              <p style={{ fontSize: "10px", color: "#44403C", marginBottom: "2px" }}>Current Balance</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#78716C" }}>
                {avgScore}{" "}
                <span style={{ fontWeight: 400, color: "#57534E", fontSize: "12px" }}>/ 10</span>
              </p>
            </div>
          </div>
        )}

        {/* Draggable polaroid cards */}
        {CX > 0 && AREAS_META.map((meta, i) => {
          const r = relPos[meta.id];
          if (!r) return null;
          const isThis = dragging?.id === meta.id;
          return (
            <div
              key={meta.id}
              onMouseDown={(e) => startDrag(meta.id, e)}
              style={{
                position: "absolute",
                left: CX + r.dx,
                top:  CY + r.dy,
                transform: "translate(-50%, -50%)",
                zIndex: isThis ? 20 : 5,
                cursor: isThis ? "grabbing" : "grab",
                transition: isThis ? "none" : "filter 0.2s",
                filter: isThis
                  ? "drop-shadow(0 14px 32px rgba(28,25,23,0.22))"
                  : "drop-shadow(0 4px 12px rgba(28,25,23,0.1))",
              }}
            >
              <PolaroidCard
                area={areas[i]}
                rotation={meta.rotation}
                onClick={() => {}}
                accentColor={AREA_META[meta.id as LifeArea]?.color ?? "#F97316"}
                accentBg={AREA_META[meta.id as LifeArea]?.bg ?? "#FFF7ED"}
              />
            </div>
          );
        })}
      </div>

      <AreaEditSheet
        area={editingIdx !== null ? areas[editingIdx] : null}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function Stat({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: "12px", fontWeight: 500, color: "#57534E", marginBottom: "2px" }}>{label}</p>
      <p style={{ fontSize: "24px", fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: "14px", fontWeight: 500, color: "#57534E" }}>{unit}</span>
      </p>
    </div>
  );
}
