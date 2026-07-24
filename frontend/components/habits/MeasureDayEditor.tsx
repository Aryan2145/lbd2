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

const MAX_VALUE = 99999;   // upper cap so long numbers can't blow out the popup

const fmtDate = (ds: string) =>
  new Date(ds + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

/**
 * Compact centered popup for logging a measurable habit's value on a day.
 * Portaled to <body>, top-aligned so the mobile keyboard never covers it.
 * Shared by the habit card, detail-page calendar, and detail sheet.
 */
export default function MeasureDayEditor({ name, date, initial, target, unit, color, onSave, onCancel }: Props) {
  const clamp = (n: number) => Math.max(0, Math.min(MAX_VALUE, n));
  const [val, setVal]         = useState<number>(clamp(initial));
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on Escape + lock background scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Log ${name}`}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "18vh", paddingLeft: "16px", paddingRight: "16px", paddingBottom: "16px",
        backgroundColor: "rgba(28,25,23,0.30)", backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(240px, 100%)",
          display: "flex", flexDirection: "column", gap: "16px",
          padding: "14px 14px 15px", borderRadius: "16px",
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
          <button onClick={onCancel} title="Close" aria-label="Close" style={{
            width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
            border: "1px solid #FECACA", backgroundColor: "#FEF2F2", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626",
          }}>
            <X size={17} strokeWidth={2.75} />
          </button>
        </div>

        {/* Stepper (left) + inline save (right) — edge to edge, no dead side space */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", maxWidth: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <button onClick={() => setVal((v) => clamp(v - 1))} disabled={val <= 0}
              aria-label="Decrease" style={stepBtn("#F1ECE5", "#57534E", val <= 0)}>−</button>

            <div style={{ display: "flex", alignItems: "baseline", gap: "3px", minWidth: 0 }}>
              <input
                type="text"
                inputMode="numeric"
                aria-label={`${name} value`}
                value={val}
                onChange={(e) => setVal(clamp(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0))}
                onKeyDown={(e) => { if (e.key === "Enter") onSave(val); }}
                onFocus={(e) => e.currentTarget.select()}
                autoFocus
                style={{
                  width: `calc(${Math.max(2, String(val).length)}ch + 6px)`,
                  textAlign: "center", padding: 0, height: "26px",
                  fontSize: "22px", fontWeight: 800, color,
                  border: "none", background: "transparent", outline: "none",
                  fontFamily: "inherit", fontVariantNumeric: "tabular-nums",
                }}
              />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#57534E",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                /{target}{unit ? ` ${unit}` : ""}
              </span>
            </div>

            <button onClick={() => setVal((v) => clamp(v + 1))}
              aria-label="Increase" style={stepBtn(color, "#FFFFFF", false)}>+</button>
          </div>

          <button onClick={() => onSave(val)} title="Save" aria-label="Save" style={{
            width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
            border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF",
          }}>
            <Check size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function stepBtn(bg: string, color: string, disabled: boolean): React.CSSProperties {
  return {
    width: "32px", height: "32px", borderRadius: "9px", border: "none",
    backgroundColor: bg, color, fontSize: "19px", fontWeight: 700,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0, flexShrink: 0,
  };
}
