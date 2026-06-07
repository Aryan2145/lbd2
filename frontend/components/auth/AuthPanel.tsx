"use client";

import { useEffect, useRef } from "react";
import { Carlito } from "next/font/google";
import { Lock, Shield, User } from "lucide-react";

const carlito = Carlito({
  subsets: ["latin"],
  weight: ["400", "700"],
  style:   ["normal", "italic"],
  display: "swap",
});

export const wordmarkFont: React.CSSProperties = {
  fontFamily: `Calibri, "Calibri Light", ${carlito.style.fontFamily}, sans-serif`,
  fontStyle:  "italic",
};

export const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  borderRadius: 24, border: "1px solid #E5E5E5",
  backgroundColor: "#FFFFFF", color: "#1a1a1a",
  fontSize: 14, outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em",
  marginBottom: 6, color: "#404040",
};

export const errorBoxStyle: React.CSSProperties = {
  fontSize: 13, color: "#DC2626", margin: 0,
  padding: "9px 12px", backgroundColor: "#FEF2F2",
  border: "1px solid #FCA5A5", borderRadius: 8, fontWeight: 600,
};

const PHRASES = [
  "Become the most disciplined version of myself.",
  "Create financial freedom for my family.",
  "Build something that outlives me.",
  "Wake up every day with purpose and clarity.",
  "Design a life on my own terms.",
  "Invest in the person I am becoming.",
  "Leave a legacy worth remembering.",
];
const CRYPTO = "@#%&x!z$8fA3kQ92mBp7Lr5Ws2Yt9Nh4";
const randChar = () => CRYPTO[Math.floor(Math.random() * CRYPTO.length)];

// ── Left dark panel with encryption animation (shared across auth screens) ────
export function DarkPanel() {
  const phraseRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const idxRef    = useRef(0);
  const phaseRef  = useRef<"show" | "encrypt" | "encrypted" | "next">("show");
  const frameRef  = useRef(0);
  const lockedRef = useRef("");

  useEffect(() => {
    const id = setInterval(() => {
      const phrase = PHRASES[idxRef.current];
      const pEl    = phraseRef.current;
      const sEl    = statusRef.current;
      if (!pEl || !sEl) return;

      if (phaseRef.current === "show") {
        pEl.textContent = phrase;
        pEl.style.color = "white";
        sEl.textContent = "Plain text";
        sEl.style.color = "rgba(255,255,255,0.55)";
        if (++frameRef.current > 35) { phaseRef.current = "encrypt"; frameRef.current = 0; }

      } else if (phaseRef.current === "encrypt") {
        sEl.textContent = "Encrypting...";
        sEl.style.color = "#fb923c";
        const progress  = Math.min(frameRef.current / 22, 1);
        pEl.textContent = phrase.split("").map(c =>
          c === " " ? " " : (Math.random() < progress ? randChar() : c)
        ).join("");
        if (progress > 0.5) pEl.style.color = "#fb923c";
        if (++frameRef.current > 22) {
          lockedRef.current = phrase.split("").map(c => c === " " ? " " : randChar()).join("");
          phaseRef.current  = "encrypted";
          frameRef.current  = 0;
        }

      } else if (phaseRef.current === "encrypted") {
        sEl.textContent = "Encrypted ✓";
        sEl.style.color = "#fb923c";
        pEl.textContent = lockedRef.current;
        pEl.style.color = "#fb923c";
        if (++frameRef.current > 20) { phaseRef.current = "next"; frameRef.current = 0; }

      } else {
        idxRef.current   = (idxRef.current + 1) % PHRASES.length;
        phaseRef.current = "show";
        frameRef.current = 0;
      }
    }, 65);
    return () => clearInterval(id);
  }, []);

  const bg = [
    "radial-gradient(ellipse 80% 90% at 105% 58%, rgba(249,115,22,0.5) 0%, rgba(200,75,5,0.25) 28%, rgba(249,115,22,0.06) 55%, transparent 70%)",
    "radial-gradient(ellipse 40% 40% at 88% 52%, rgba(180,60,0,0.55) 0%, transparent 45%)",
    "#060504",
  ].join(", ");

  const particles = [
    "radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,0.55), transparent)",
    "radial-gradient(1px 1px at 78% 12%, rgba(255,255,255,0.4), transparent)",
    "radial-gradient(1px 1px at 92% 32%, rgba(249,115,22,0.7), transparent)",
    "radial-gradient(2px 2px at 4% 72%, rgba(255,255,255,0.35), transparent)",
    "radial-gradient(1px 1px at 55% 82%, rgba(249,115,22,0.5), transparent)",
    "radial-gradient(1px 1px at 28% 92%, rgba(255,255,255,0.3), transparent)",
    "radial-gradient(1px 1px at 96% 78%, rgba(249,115,22,0.55), transparent)",
    "radial-gradient(2px 2px at 48% 4%, rgba(249,115,22,0.45), transparent)",
    "radial-gradient(1px 1px at 65% 48%, rgba(255,255,255,0.2), transparent)",
  ].join(", ");

  return (
    <div
      className="flex-none w-full h-[48dvh] landscape:max-lg:h-auto landscape:max-lg:flex-1 lg:h-auto lg:flex-1 flex flex-col p-6 lg:p-10"
      style={{ background: bg, position: "relative", overflow: "hidden" }}
    >
      {/* Orbital arc ring */}
      <div aria-hidden style={{
        position: "absolute", right: "-160px", top: "50%",
        transform: "translateY(-52%)",
        width: "540px", height: "540px", borderRadius: "50%",
        border: "1px solid rgba(249,115,22,0.22)",
        pointerEvents: "none", zIndex: 1,
      }} />
      {/* Inner warm halo */}
      <div aria-hidden style={{
        position: "absolute", right: "-80px", top: "50%",
        transform: "translateY(-50%)",
        width: "320px", height: "320px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 1,
      }} />
      {/* Particles */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: particles, zIndex: 1 }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-orange.png" alt="Life By Design" style={{ width: 52, height: 52, borderRadius: 12, display: "block" }} />
        <span style={{ ...wordmarkFont, fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>
          Life By <span style={{ color: "#fb923c" }}>Design</span>
        </span>
      </div>

      {/* All content grouped at bottom */}
      <div style={{ marginTop: "auto", position: "relative", zIndex: 2 }}>
        {/* Main headline */}
        <div style={{ marginBottom: 14 }}>
          <p className="text-[26px] lg:text-[34px]" style={{ fontWeight: 400, color: "rgba(255,255,255,0.92)", margin: 0, lineHeight: 1.15, letterSpacing: "-0.3px" }}>
            A personal growth system<br />built around
          </p>
          <p className="text-[26px] lg:text-[34px]" style={{ fontWeight: 700, color: "#fb923c", margin: "2px 0 6px", lineHeight: 1.15, letterSpacing: "-0.3px" }}>
            who you want to become.
          </p>
          <svg width="88" height="10" viewBox="0 0 88 10" fill="none" aria-hidden>
            <path d="M2 7 Q11 2 20 7 Q29 12 38 7 Q47 2 56 7 Q65 12 74 7 Q80 4 86 6" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        {/* Sub-headline */}
        <p style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.42)", margin: "0 0 18px", lineHeight: 1.5 }}>
          Your private space to design your life.
        </p>

        {/* Crypto card */}
        <div style={{
          background: "#131211",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "16px 20px",
          maxWidth: 520, marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "rgba(249,115,22,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Lock size={15} color="#fb923c" strokeWidth={2} />
            </div>
            <span ref={statusRef} style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase" }}>
              PLAIN TEXT
            </span>
          </div>
          <div ref={phraseRef} style={{
            fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.72)",
            lineHeight: 1.7, fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
            letterSpacing: "0.1px",
          }}>
            {PHRASES[0]}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {([
            { label: "PRIVATE BY DESIGN",    Icon: Shield },
            { label: "END-TO-END",            Icon: Lock   },
            { label: "ONLY YOU\nCAN READ THIS", Icon: User  },
          ] as const).map(({ label, Icon }) => (
            <div key={label} style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              padding: "9px 11px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.09)",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: "rgba(249,115,22,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={13} color="#fb923c" strokeWidth={2} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.82)", letterSpacing: "0.06em", lineHeight: 1.35, whiteSpace: "pre-line" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Shield size={11} color="rgba(255,255,255,0.28)" strokeWidth={1.5} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>Your data stays private and secure.</span>
        </div>
      </div>
    </div>
  );
}

// ── Split-screen shell: dark panel + right-hand form column ───────────────────
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col landscape:max-lg:flex-row lg:flex-row overflow-hidden" style={{ height: "100dvh", backgroundColor: "#FFFFFF" }}>
      <DarkPanel />
      <div
        className="flex-1 lg:flex-none lg:w-[460px] overflow-y-auto lbd-hide-scrollbar px-6 lg:px-14 flex flex-col pt-10 landscape:max-lg:pt-[6vh] lg:pt-[7vh]"
        style={{ paddingBottom: 32, scrollbarGutter: "stable" }}
      >
        <div style={{ width: "100%", maxWidth: 360, marginInline: "auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Life By Design" className="hidden lg:block" style={{ width: 48, height: 48, marginBottom: 20 }} />
          {children}
        </div>
      </div>
    </div>
  );
}
