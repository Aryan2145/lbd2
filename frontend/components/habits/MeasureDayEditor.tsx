"use client";

import { useState } from "react";

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
 * Inline editor for logging a measurable habit's value on a specific day.
 * Shared by the habit card, the detail-page calendar, and the detail sheet so
 * that clicking any day gives the same +/- stepper AND typed-number entry.
 */
export default function MeasureDayEditor({ date, initial, target, unit, color, onSave, onCancel }: Props) {
  const [val, setVal] = useState<number>(initial);

  const clamp = (n: number) => Math.max(0, n);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        padding: "12px 14px", borderRadius: "10px",
        backgroundColor: "#FFFFFF", border: `1.5px solid ${color}`,
        boxShadow: "0 4px 16px rgba(28,25,23,0.10)",
      }}
    >
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#1C1917", marginBottom: "10px" }}>
        {fmtDate(date)}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button onClick={() => setVal((v) => clamp(v - 1))} style={stepBtn} disabled={val <= 0}>−</button>

        <div style={{ display: "flex", alignItems: "baseline", gap: "5px", flex: 1, justifyContent: "center" }}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={val}
            onChange={(e) => setVal(clamp(parseInt(e.target.value, 10) || 0))}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: "56px", textAlign: "center", padding: "5px 4px",
              fontSize: "20px", fontWeight: 800, color,
              border: `1.5px solid ${color}55`, borderRadius: "8px",
              outline: "none", fontFamily: "inherit", MozAppearance: "textfield",
            }}
          />
          <span style={{ fontSize: "12px", color: "#78716C", whiteSpace: "nowrap" }}>
            / {target}{unit ? ` ${unit}` : ""}
          </span>
        </div>

        <button
          onClick={() => setVal((v) => v + 1)}
          style={{ ...stepBtn, backgroundColor: color, color: "#FFFFFF", border: "none" }}
        >
          +
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "8px", borderRadius: "8px",
          border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
          fontSize: "12px", fontWeight: 600, color: "#78716C", cursor: "pointer",
        }}>
          Cancel
        </button>
        <button onClick={() => onSave(val)} style={{
          flex: 2, padding: "8px", borderRadius: "8px", border: "none",
          background: "linear-gradient(135deg, #F97316, #EA580C)",
          fontSize: "12px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
        }}>
          Save
        </button>
      </div>
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
  border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: "18px", fontWeight: 700, color: "#78716C",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
