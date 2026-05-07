"use client";

import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";

const CHARS  = "0123456789abcdef";
const TARGET = "habits · goals · reflections";

export default function EncryptionBadge() {
  const spanRef  = useRef<HTMLSpanElement>(null);
  const resolved = useRef(TARGET.length); // start fully readable
  const phase    = useRef<"hold" | "scramble" | "resolve">("hold");
  const tick     = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (!spanRef.current) return;
      tick.current++;

      if (phase.current === "hold") {
        if (tick.current > 30) {          // ~2.25 s readable pause
          phase.current = "scramble";
          tick.current  = 0;
        }
      } else if (phase.current === "scramble") {
        if (tick.current % 2 === 0 && resolved.current > 0) resolved.current--;
        if (resolved.current <= 0) {
          phase.current = "resolve";
          tick.current  = 0;
        }
      } else {
        if (tick.current % 3 === 0 && resolved.current < TARGET.length) resolved.current++;
        if (resolved.current >= TARGET.length) {
          phase.current = "hold";
          tick.current  = 0;
        }
      }

      const text = Array.from(TARGET, (char, i) => {
        if (i < resolved.current) return char;
        // keep spaces and separator dots in place so the shape stays readable
        if (!/[a-z]/i.test(char)) return char;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join("");

      spanRef.current.textContent = text;
    }, 75);

    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", borderRadius: 12, marginTop: 18,
      backgroundColor: "rgba(249,115,22,0.06)",
      border: "1px solid rgba(249,115,22,0.18)",
    }}>
      {/* Lock icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: "linear-gradient(135deg, #F97316, #EA580C)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(234,88,12,0.28)",
      }}>
        <Lock size={13} color="#fff" strokeWidth={2.5} />
      </div>

      {/* Text + decryption animation */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 700, color: "#1C1917",
          margin: "0 0 2px", letterSpacing: "-0.01em",
        }}>
          Your data is encrypted
        </p>
        <span
          ref={spanRef}
          aria-hidden
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 10, color: "#9A3412",
            letterSpacing: "1.5px", fontWeight: 600,
          }}
        >
          {TARGET}
        </span>
      </div>

      {/* Tech spec pill */}
      <span style={{
        fontSize: 9, fontWeight: 800, color: "#EA580C",
        backgroundColor: "rgba(249,115,22,0.12)",
        padding: "3px 7px", borderRadius: 20,
        letterSpacing: "0.1em", textTransform: "uppercase",
        flexShrink: 0, border: "1px solid rgba(249,115,22,0.20)",
        whiteSpace: "nowrap",
      }}>
        AES-256
      </span>
    </div>
  );
}
