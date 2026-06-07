"use client";

import { useRef } from "react";

const LEN = 6;

/**
 * Controlled 6-digit OTP input rendered as separate boxes. `value` is the full
 * string (0–6 digits); `onChange` receives the updated string. Handles
 * type-to-advance, backspace-to-retreat, and pasting a full code.
 */
export default function OtpInput({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.split("").slice(0, LEN);

  function setCharAt(i: number, char: string) {
    const arr = value.split("");
    arr[i] = char;
    // join, trim to length, drop trailing empties
    const next = arr.join("").replace(/\D/g, "").slice(0, LEN);
    onChange(next);
  }

  function handleChange(i: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d) return;
    if (d.length > 1) {
      // pasted / multi-char into one box — fill forward from here
      const next = (value.slice(0, i) + d).replace(/\D/g, "").slice(0, LEN);
      onChange(next);
      const focusIdx = Math.min(next.length, LEN - 1);
      refs.current[focusIdx]?.focus();
      return;
    }
    setCharAt(i, d);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setCharAt(i, "");
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        setCharAt(i - 1, "");
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LEN - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (d) {
      onChange(d);
      refs.current[Math.min(d.length, LEN - 1)]?.focus();
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
      {Array.from({ length: LEN }, (_, i) => {
        const filled = !!digits[i];
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            value={digits[i] ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${i + 1}`}
            style={{
              width: 48, height: 56, textAlign: "center",
              fontSize: 22, fontWeight: 800,
              borderRadius: 12,
              border: filled ? "1.5px solid #f97316" : "1px solid #E5E5E5",
              backgroundColor: filled ? "#FFF7ED" : "#FFFFFF",
              color: filled ? "#EA580C" : "#1a1a1a",
              outline: "none", boxSizing: "border-box",
              transition: "all 0.12s",
            }}
          />
        );
      })}
    </div>
  );
}
