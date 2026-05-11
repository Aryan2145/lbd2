"use client";

import { useState, useEffect, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { todayDateStr, MAX_DATE_STR } from "@/lib/dateValidation";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export default function CalendarPicker({
  value, onChange, onClear, accentColor = "#F97316", min, max, disabled, placement = "down", bgColor = "#FFFFFF",
}: {
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  accentColor?: string;
  /** Defaults to today. Pass "" to allow past dates. */
  min?: string;
  /** Defaults to MAX_DATE_STR (2100-12-31). */
  max?: string;
  disabled?: boolean;
  placement?: "up" | "down" | "center";
  bgColor?: string;
}) {
  const today   = todayDateStr();
  const minDate = min !== undefined ? min : today;
  const maxDate = max ?? MAX_DATE_STR;

  const initial = value ? new Date(value + "T00:00:00") : new Date();
  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [mode,      setMode]      = useState<"cal" | "year">("cal");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setMode("cal");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
    }
  }, [value]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells   = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(viewYear, viewMonth, i - firstWeekday + 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth && d.getFullYear() === viewYear,
      disabled: (minDate !== "" && iso < minDate) || (maxDate !== "" && iso > maxDate),
    };
  });

  const baseYear = new Date().getFullYear();
  const maxYear  = Math.min(parseInt(maxDate.slice(0, 4)) || baseYear + 29, baseYear + 29);
  const years    = Array.from({ length: maxYear - baseYear + 1 }, (_, i) => baseYear + i);

  const displayText = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => { if (!disabled) { setOpen(o => !o); if (!open) setMode("cal"); } }}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "9px 12px", borderRadius: "8px",
          border: `1.5px solid ${accentColor}`,
          backgroundColor: disabled ? "#FEF3F2" : bgColor,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
          boxShadow: open ? `0 0 0 3px ${accentColor}18` : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          userSelect: "none",
        }}
      >
        <CalendarDays size={14} color={open ? accentColor : `${accentColor}99`} style={{ flexShrink: 0, transition: "color 0.15s" }} />
        <span style={{ flex: 1, fontSize: "13px", fontFamily: "inherit", color: value ? "#1C1917" : "#9CA3AF" }}>
          {displayText || "Pick a date"}
        </span>
        {value && onClear && !disabled && (
          <button
            onClick={e => { e.stopPropagation(); onClear(); }}
            style={{ width: 18, height: 18, borderRadius: "50%", border: "none", backgroundColor: "#D1D5DB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
          >
            <X size={10} color="#FFFFFF" />
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position: placement === "center" ? "fixed" : "absolute",
          ...(placement === "up"
            ? { bottom: "calc(100% + 6px)", left: 0 }
            : placement === "center"
            ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
            : { top: "calc(100% + 6px)", left: 0 }),
          zIndex: placement === "center" ? 500 : 200,
          backgroundColor: "#FFFFFF", borderRadius: "14px",
          border: "1px solid #E5E9EE",
          boxShadow: "0 8px 32px rgba(28,25,23,0.14)",
          width: "min(288px, 80vw)", overflow: "hidden",
        }}>
          {mode === "cal" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #F5F0EB" }}>
                <button
                  onClick={prevMonth}
                  style={{ width: 30, height: 30, borderRadius: "8px", border: "none", backgroundColor: "#F5F5F4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#EDE5D8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F5F4"; }}
                >
                  <ChevronLeft size={15} color="#6B7280" />
                </button>
                <button
                  onClick={() => setMode("year")}
                  style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: "7px", transition: "background-color 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFF7ED"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                >
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </button>
                <button
                  onClick={nextMonth}
                  style={{ width: 30, height: 30, borderRadius: "8px", border: "none", backgroundColor: "#F5F5F4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#EDE5D8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F5F4"; }}
                >
                  <ChevronRight size={15} color="#6B7280" />
                </button>
              </div>

              <div style={{ padding: "10px 12px 14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" }}>
                  {DAY_HEADERS.map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#9CA3AF", padding: "3px 0" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                  {cells.map((cell, i) => {
                    const isSelected = cell.iso === value;
                    const isToday    = cell.iso === today;
                    return (
                      <button
                        key={i}
                        onClick={() => { if (!cell.disabled) { onChange(cell.iso); setOpen(false); } }}
                        disabled={cell.disabled}
                        style={{
                          width: "100%", aspectRatio: "1", borderRadius: "8px", border: "none",
                          backgroundColor: isSelected ? accentColor : "transparent",
                          color: isSelected ? "#FFFFFF"
                            : cell.disabled ? "#D1D5DB"
                            : !cell.inMonth ? "#C4B5A0"
                            : isToday ? accentColor
                            : "#1C1917",
                          fontSize: "12px", fontWeight: isSelected || isToday ? 700 : 400,
                          cursor: cell.disabled ? "default" : "pointer",
                          outline: isToday && !isSelected ? `2px solid ${accentColor}40` : "none",
                          outlineOffset: "-2px",
                          transition: "background-color 0.1s",
                        }}
                        onMouseEnter={e => { if (!cell.disabled && !isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accentColor}18`; }}
                        onMouseLeave={e => { if (!cell.disabled && !isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <button
                  onClick={() => setMode("cal")}
                  style={{ width: 28, height: 28, borderRadius: "7px", border: "none", backgroundColor: "#F5F5F4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronLeft size={14} color="#6B7280" />
                </button>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>Select Year</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", maxHeight: 200, overflowY: "auto" }}>
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => { setViewYear(y); setMode("cal"); }}
                    style={{
                      padding: "8px 4px", borderRadius: "8px", border: "none",
                      backgroundColor: y === viewYear ? accentColor : "#F5F5F4",
                      color: y === viewYear ? "#FFFFFF" : "#374151",
                      fontSize: "12px", fontWeight: y === viewYear ? 700 : 500,
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => { if (y !== viewYear) (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accentColor}18`; }}
                    onMouseLeave={e => { if (y !== viewYear) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5F5F4"; }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
