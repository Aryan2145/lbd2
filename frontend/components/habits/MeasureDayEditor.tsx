"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

interface Props {
  name:     string;                 // habit name
  date:     string;                 // YYYY-MM-DD being edited
  initial:  number;                 // current logged value for that day
  target:   number;
  unit:     string;
  color:    string;                 // life-area accent colour
  onSave:   (value: number) => void;
  onCancel: () => void;
}

const fmtDate = (ds: string) =>
  new Date(ds + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

/**
 * Compact centered popup for logging a measurable habit's value on a day.
 * Portaled to <body> and centered on screen so it never gets clipped.
 * Shared by the habit card, detail-page calendar, and detail sheet.
 */
export default function MeasureDayEditor({ name, date, initial, target, unit, color, onSave, onCancel }: Props) {
  const [val, setVal]         = useState<number>(initial);
  const [mounted, setMounted] = useState(false);
  const clamp = (n: number) => Math.max(0, n);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  onSave(val);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [val, onSave, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", backgroundColor: "rgba(28,25,23,0.30)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(300px, 100%)",
          display: "flex", flexDirection: "column", gap: "14px",
          padding: "14px 16px 16px", borderRadius: "16px",
          backgroundColor: "#FFFFFF", border: `1.5px solid ${color}`,
          boxShadow: "0 16px 40px rgba(28,25,23,0.22)",
        }}
      >
        {/* Header: name + date left, close top-right */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: 1.3 }}>
              {name}
            </p>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.03em",
              color: "#57534E", textTransform: "uppercase", margin: "3px 0 0", textAlign: "left" }}>
              {fmtDate(date)}
            </p>
          </div>
          <button onClick={onCancel} title="Close" style={{
            width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
            border: "none", backgroundColor: "#F1ECE5", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#57534E",
          }}>
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px" }}>
          <button onClick={() => setVal((v) => clamp(v - 1))} disabled={val <= 0} style={stepBtn("#F1ECE5", "#57534E")}>−</button>

          <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
            <input
              type="text"
              inputMode="numeric"
              value={val}
              onChange={(e) => setVal(clamp(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0))}
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
              style={{
                width: "48px", textAlign: "center", padding: 0, height: "32px",
                fontSize: "28px", fontWeight: 800, color,
                border: "none", background: "transparent", outline: "none",
                fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#57534E", whiteSpace: "nowrap" }}>
              /{target}{unit ? ` ${unit}` : ""}
            </span>
          </div>

          <button onClick={() => setVal((v) => v + 1)} style={stepBtn(color, "#FFFFFF")}>+</button>
        </div>

        {/* Full-width save */}
        <button onClick={() => onSave(val)} style={{
          width: "100%", height: "38px", borderRadius: "10px", border: "none",
          background: "linear-gradient(135deg, #F97316, #EA580C)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          color: "#FFFFFF", fontSize: "13px", fontWeight: 700,
        }}>
          <Check size={15} strokeWidth={3} /> Save
        </button>
      </div>
    </div>,
    document.body,
  );
}

function stepBtn(bg: string, color: string): React.CSSProperties {
  return {
    width: "34px", height: "34px", borderRadius: "9px", border: "none",
    backgroundColor: bg, color, fontSize: "20px", fontWeight: 700,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0, flexShrink: 0,
  };
}
