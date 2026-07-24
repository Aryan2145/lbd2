"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface Props {
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
 * Compact inline popup for logging a measurable habit's value on a day.
 * Mirrors the card's +/- stepper; icon Save / close keep it minimal.
 * Shared by the habit card, detail-page calendar, and detail sheet.
 */
export default function MeasureDayEditor({ date, initial, target, unit, color, onSave, onCancel }: Props) {
  const [val, setVal] = useState<number>(initial);
  const clamp = (n: number) => Math.max(0, n);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "inline-flex", flexDirection: "column", gap: "5px",
        padding: "8px 10px", borderRadius: "12px",
        backgroundColor: "#FFFFFF", border: `1.5px solid ${color}`,
        boxShadow: "0 6px 20px rgba(28,25,23,0.12)",
      }}
    >
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.03em",
        color: "#A8A29E", textTransform: "uppercase" }}>
        {fmtDate(date)}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={() => setVal((v) => clamp(v - 1))} disabled={val <= 0} style={stepBtn("#F1ECE5", "#78716C")}>−</button>
          <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
            <input
              type="text"
              inputMode="numeric"
              value={val}
              onChange={(e) => setVal(clamp(parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0))}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                width: "32px", textAlign: "center", padding: 0, height: "22px",
                fontSize: "15px", fontWeight: 800, color,
                border: "none", background: "transparent", outline: "none",
                fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#A8A29E", whiteSpace: "nowrap" }}>
              /{target}{unit ? ` ${unit}` : ""}
            </span>
          </div>
          <button onClick={() => setVal((v) => v + 1)} style={stepBtn(color, "#FFFFFF")}>+</button>
        </div>

        {/* divider */}
        <div style={{ width: "1px", height: "20px", backgroundColor: "#EDE5D8" }} />

        {/* actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <button onClick={() => onSave(val)} title="Save" style={iconBtn(color, "#FFFFFF")}>
            <Check size={14} strokeWidth={3} />
          </button>
          <button onClick={onCancel} title="Cancel" style={iconBtn("#F1ECE5", "#78716C")}>
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function stepBtn(bg: string, color: string): React.CSSProperties {
  return {
    width: "24px", height: "24px", borderRadius: "6px", border: "none",
    backgroundColor: bg, color, fontSize: "15px", fontWeight: 700,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0, flexShrink: 0,
  };
}

function iconBtn(bg: string, color: string): React.CSSProperties {
  return {
    width: "24px", height: "24px", borderRadius: "6px", border: "none",
    backgroundColor: bg, color,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, flexShrink: 0,
  };
}
