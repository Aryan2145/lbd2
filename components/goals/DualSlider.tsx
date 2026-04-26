"use client";

import { useRef, useCallback } from "react";

interface DualSliderProps {
  value: number;          // 0–100
  onChange: (v: number) => void;
  startLabel?: string;
  endLabel?: string;
  disabled?: boolean;
}

export default function DualSlider({
  value,
  onChange,
  startLabel = "Not started",
  endLabel   = "Complete",
  disabled   = false,
}: DualSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const calcValue = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * 100);
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    onChange(calcValue(e.clientX));

    const onMove = (ev: MouseEvent) => onChange(calcValue(ev.clientX));
    const onUp   = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (disabled) return;
    onChange(calcValue(e.clientX));
  };

  const thumbLeft = `${value}%`;

  return (
    <div style={{ userSelect: "none" }}>
      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        style={{
          position: "relative", height: "8px", borderRadius: "4px",
          backgroundColor: "#EDE5D8",
          cursor: disabled ? "default" : "pointer",
          marginBottom: "6px",
        }}
      >
        {/* Fill */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: thumbLeft, borderRadius: "4px",
          background: "linear-gradient(90deg, #F97316, #EA580C)",
          transition: "width 0.05s",
        }} />

        {/* Thumb */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            left: thumbLeft, top: "50%",
            transform: "translate(-50%, -50%)",
            width: "20px", height: "20px",
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            border: "2px solid #F97316",
            boxShadow: "0 2px 6px rgba(249,115,22,0.3)",
            cursor: disabled ? "default" : "grab",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2,
          }}
        >
          {/* Bubble */}
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)",
            left: "50%", transform: "translateX(-50%)",
            backgroundColor: "#F97316", color: "#FFFFFF",
            fontSize: "10px", fontWeight: 700,
            padding: "2px 5px", borderRadius: "4px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}>
            {value}%
          </div>
        </div>
      </div>

      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", color: "#A8A29E", fontWeight: 500 }}>{startLabel}</span>
        <span style={{ fontSize: "10px", color: "#A8A29E", fontWeight: 500 }}>{endLabel}</span>
      </div>
    </div>
  );
}
