"use client";

import { useState, useEffect, useRef } from "react";
import WheelOfLife from "@/components/vision/WheelOfLife";
import PolaroidCard, { type AreaData } from "@/components/vision/PolaroidCard";
import AreaEditSheet from "@/components/vision/AreaEditSheet";
import { Edit2, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { AREA_META } from "@/components/goals/GoalCard";
import type { LifeArea } from "@/components/goals/GoalCard";
import { api } from "@/lib/api";

// ── Constants ────────────────────────────────────────────────────────────────
const CY       = 440;    // vertical center of wheel in canvas
const WHEEL_PX = 340;    // wheel display diameter — prominent
const RADAR_R  = Math.round(108 * (WHEEL_PX / 280)); // ≈ 131px from center to edge

// Card initial offsets from CX — deliberately spread wide to use full screen width
// Side cards (Relationships/Wealth) are pushed far left/right into the empty red-marked areas
const REL_POS = [
  { dx:    0, dy: -330 },   // 0 Professional  — top center
  { dx:  430, dy: -180 },   // 1 Contribution  — top right
  { dx:  490, dy:   65 },   // 2 Wealth        — right (uses that empty space!)
  { dx:  370, dy:  280 },   // 3 Spiritual     — bottom right
  { dx: -370, dy:  280 },   // 4 Personal Growth — bottom left
  { dx: -490, dy:   65 },   // 5 Relationships — left  (uses that empty space!)
  { dx: -430, dy: -180 },   // 6 Health        — top left
];

const AREAS_META = [
  { id: "professional",  name: "Professional",   rotation:  1.5 },
  { id: "contribution",  name: "Contribution",   rotation: -2.0 },
  { id: "wealth",        name: "Wealth",          rotation:  2.5 },
  { id: "spiritual",     name: "Spiritual",       rotation: -1.5 },
  { id: "personal",      name: "Personal Growth", rotation:  2.0 },
  { id: "relationships", name: "Relationships",   rotation: -2.5 },
  { id: "health",        name: "Health",          rotation:  1.0 },
];

const N = AREAS_META.length;

const DEFAULT_PURPOSE = "I live to build a legacy so deeply rooted in love and discipline that my family carries its warmth for generations.";

type Pos = { x: number; y: number };

const EMPTY_AREA: AreaData[] = AREAS_META.map((m) => ({
  id: m.id, name: m.name, text: "", score: 5, imageUrl: "",
}));

export default function VisionPage() {
  const [areas, setAreas]                   = useState<AreaData[]>(EMPTY_AREA);
  const [editingIdx, setEditing]            = useState<number | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [purposeStatement, setPurpose]      = useState(DEFAULT_PURPOSE);
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [generateError, setGenerateError]   = useState<string | null>(null);
  const [CX, setCX]                         = useState(0);
  const [positions, setPositions]           = useState<Record<string, Pos>>({});
  const [dragging, setDragging]             = useState<{
    id: string; offX: number; offY: number; startX: number; startY: number;
  } | null>(null);

  const containerRef      = useRef<HTMLDivElement>(null);
  const initialized       = useRef(false);
  const positionsRef      = useRef<Record<string, Pos>>({});
  const positionsRestored = useRef(false);

  useEffect(() => { positionsRef.current = positions; }, [positions]);

  // One-time init: measure width → set CX + default card positions
  useEffect(() => {
    const init = () => {
      if (initialized.current || !containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      if (w === 0) return;
      const cx = w / 2;
      setCX(cx);
      const pos: Record<string, Pos> = {};
      AREAS_META.forEach((m, i) => {
        pos[m.id] = { x: cx + REL_POS[i].dx, y: CY + REL_POS[i].dy };
      });
      setPositions(pos);
      initialized.current = true;
    };
    init();
    const ro = new ResizeObserver(init);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Keep wheel centered on window resize (cards stay where user left them)
  useEffect(() => {
    const onResize = () => {
      if (containerRef.current)
        setCX(containerRef.current.getBoundingClientRect().width / 2);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Load persisted vision data on mount
  useEffect(() => {
    api.get<{ areas: AreaData[]; purposeStatement?: string }>("/vision").then((data) => {
      if (data.areas && data.areas.length > 0) {
        setAreas((prev) =>
          prev.map((a) => data.areas.find((d: AreaData) => d.id === a.id) ?? a)
        );
      }
      if (data.purposeStatement) setPurpose(data.purposeStatement);
    }).catch(() => {});
  }, []);

  // Restore card positions from localStorage once CX is known
  useEffect(() => {
    if (CX === 0 || positionsRestored.current) return;
    positionsRestored.current = true;
    try {
      const raw = localStorage.getItem("lbd_vision_positions");
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, { dx: number; dy: number }>;
      setPositions((prev) => {
        const next = { ...prev };
        for (const [id, off] of Object.entries(saved)) {
          next[id] = { x: CX + off.dx, y: CY + off.dy };
        }
        return next;
      });
    } catch {}
  }, [CX]);

  const savePositionsToLS = (pos: Record<string, Pos>, cx: number) => {
    try {
      const rel: Record<string, { dx: number; dy: number }> = {};
      for (const [id, p] of Object.entries(pos)) {
        rel[id] = { dx: Math.round(p.x - cx), dy: Math.round(p.y - CY) };
      }
      localStorage.setItem("lbd_vision_positions", JSON.stringify(rel));
    } catch {}
  };

  // ── Drag logic ─────────────────────────────────────────────────────────────
  const startDrag = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const pos  = positions[id] ?? { x: CX, y: CY };
    setDragging({
      id,
      offX:   e.clientX - rect.left  - pos.x,
      offY:   e.clientY - rect.top   - pos.y,
      startX: e.clientX,
      startY: e.clientY,
    });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      setPositions((prev) => ({
        ...prev,
        [dragging.id]: {
          x: e.clientX - rect.left - dragging.offX,
          y: e.clientY - rect.top  - dragging.offY,
        },
      }));
    };
    const onUp = (e: MouseEvent) => {
      const moved = Math.hypot(e.clientX - dragging.startX, e.clientY - dragging.startY);
      if (moved < 6) {
        setEditing(AREAS_META.findIndex((m) => m.id === dragging.id));
      } else {
        savePositionsToLS(positionsRef.current, CX);
      }
      setDragging(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [dragging]);

  // Reset cards to default positions
  const resetPositions = () => {
    const pos: Record<string, Pos> = {};
    AREAS_META.forEach((m, i) => {
      pos[m.id] = { x: CX + REL_POS[i].dx, y: CY + REL_POS[i].dy };
    });
    setPositions(pos);
    localStorage.removeItem("lbd_vision_positions");
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const scores      = areas.map((a) => a.score);
  const avgScore    = (scores.reduce((s, v) => s + v, 0) / N).toFixed(1);
  const filledCount = areas.filter((a) => a.text.trim().length > 0).length;

  // Line from wheel edge toward card center
  const lineFor = (id: string) => {
    const pos = positions[id];
    if (!pos) return null;
    const dx = pos.x - CX, dy = pos.y - CY;
    const d  = Math.hypot(dx, dy);
    if (d === 0) return null;
    return {
      x1: CX + (RADAR_R + 10) * (dx / d),
      y1: CY + (RADAR_R + 10) * (dy / d),
      x2: pos.x, y2: pos.y,
    };
  };

  const handleSave = (u: AreaData) => {
    const updated = areas.map((a) => (a.id === u.id ? u : a));
    setAreas(updated);
    setSaving(true);
    api.put("/vision", { areas: updated, purposeStatement }).finally(() => setSaving(false));
  };

  const handlePurposeSave = (text: string) => {
    const trimmed = text.trim() || DEFAULT_PURPOSE;
    setPurpose(trimmed);
    setEditingPurpose(false);
    api.put("/vision", { areas, purposeStatement: trimmed }).catch(() => {});
  };

  const handleGenerate = async () => {
    if (isGenerating) return; // hard guard — ignore extra clicks
    setIsGenerating(true);
    setGenerateError(null);
    setPurpose("");
    try {
      const res = await fetch("/api/generate-purpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas: areas.map(a => ({ id: a.id, name: a.name, text: a.text })) }),
      });
      if (res.status === 429) {
        const { message } = await res.json();
        setGenerateError(message ?? "Too many requests, please wait.");
        setPurpose(DEFAULT_PURPOSE);
        return;
      }
      if (!res.ok || !res.body) throw new Error("Generation failed.");
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let generated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        generated += decoder.decode(value, { stream: true });
        setPurpose(generated);
      }
      api.put("/vision", { areas, purposeStatement: generated }).catch(() => {});
    } catch {
      setGenerateError("Something went wrong. Please try again.");
      setPurpose(DEFAULT_PURPOSE);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", backgroundColor: "#FAF5EE" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: "18px 36px 14px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Vision
          </p>
          <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Vision Canvas
          </h1>
          <p style={{ fontSize: "12px", color: "#57534E", marginTop: "3px" }}>
            Drag cards to arrange your board. Click any card to edit.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {saving && (
            <span style={{ fontSize: "11px", color: "#57534E" }}>Saving…</span>
          )}
          <button
            onClick={resetPositions}
            title="Reset card positions"
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "6px 12px", borderRadius: "8px",
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

      {/* ── Canvas ─────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          position: "relative", width: "100%", height: 860,
          userSelect: "none",
          cursor: dragging ? "grabbing" : "default",
        }}
      >
        {/* Connecting lines SVG */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none", overflow: "visible" }}>
          {AREAS_META.map((m, i) => {
            const L = lineFor(m.id);
            if (!L) return null;
            const active = areas[i].text.trim().length > 0;
            return (
              <g key={m.id}>
                <line x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2}
                  stroke={active ? "#F97316" : "#C9B89A"}
                  strokeWidth={active ? 1.5 : 1}
                  strokeDasharray={active ? "none" : "6,5"}
                  strokeOpacity={active ? 0.45 : 0.5} />
                <circle cx={L.x2} cy={L.y2} r={4.5}
                  fill={active ? "#F97316" : "#C9A84C"} opacity={0.45} />
              </g>
            );
          })}
        </svg>

        {/* Wheel of Life — fixed at center, prominent */}
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
              <p style={{ fontSize: "10px", color: "#44403C", marginBottom: "2px" }}>
                Current Balance
              </p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#78716C" }}>
                {avgScore}{" "}
                <span style={{ fontWeight: 400, color: "#57534E", fontSize: "12px" }}>/ 10</span>
              </p>
            </div>
          </div>
        )}

        {/* Draggable polaroid cards */}
        {AREAS_META.map((meta, i) => {
          const pos = positions[meta.id];
          if (!pos) return null;
          const isThis = dragging?.id === meta.id;
          return (
            <div
              key={meta.id}
              onMouseDown={(e) => startDrag(meta.id, e)}
              style={{
                position: "absolute",
                left: pos.x, top: pos.y,
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

        {/* Purpose statement footer */}
        <div style={{
          position: "absolute", bottom: 16, left: "50%",
          transform: "translateX(-50%)", width: "min(820px, 90%)",
          textAlign: "center", borderTop: "1px solid #E8DDD0",
          paddingTop: "12px",
        }}>
          {generateError && (
            <p style={{ fontSize: "11px", color: "#B91C1C", marginBottom: "6px" }}>
              {generateError}
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {editingPurpose ? (
              <textarea
                autoFocus
                defaultValue={purposeStatement}
                rows={2}
                onBlur={(e) => handlePurposeSave(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePurposeSave(e.currentTarget.value); }
                  if (e.key === "Escape") setEditingPurpose(false);
                }}
                style={{
                  flex: 1, maxWidth: "740px", fontSize: "13px", color: "#57534E",
                  fontStyle: "italic", lineHeight: 1.65, textAlign: "center",
                  border: "1.5px solid #F97316", borderRadius: "8px",
                  padding: "6px 10px", backgroundColor: "#FDFAF7",
                  outline: "none", resize: "none", fontFamily: "inherit",
                  caretColor: "#F97316",
                }}
              />
            ) : (
              <p style={{ fontSize: "13px", color: "#57534E", fontStyle: "italic",
                lineHeight: 1.65, maxWidth: "640px",
                opacity: isGenerating ? 0.5 : 1, transition: "opacity 0.2s" }}>
                {purposeStatement ? `“${purposeStatement}”` : " "}
              </p>
            )}
            {/* Edit button */}
            <button
              onClick={() => !isGenerating && setEditingPurpose(true)}
              disabled={isGenerating}
              title="Edit purpose statement"
              style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "6px",
                backgroundColor: "#F5F0EB", border: "none",
                cursor: isGenerating ? "not-allowed" : "pointer", opacity: isGenerating ? 0.4 : 1,
                display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Edit2 size={10} color="#A8A29E" />
            </button>
            {/* Generate with AI button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              title="Generate purpose statement with AI"
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 10px", borderRadius: "7px",
                background: isGenerating ? "#F5F0EB" : "linear-gradient(135deg,#F97316,#EA580C)",
                border: "none", cursor: isGenerating ? "not-allowed" : "pointer",
                fontSize: "10px", fontWeight: 600,
                color: isGenerating ? "#57534E" : "#fff",
                transition: "opacity 0.2s",
              }}
            >
              {isGenerating
                ? <><Loader2 size={10} className="animate-spin" /> Generating…</>
                : <><Sparkles size={10} /> Generate with AI</>
              }
            </button>
          </div>
        </div>
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
