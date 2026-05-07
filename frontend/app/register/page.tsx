"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Carlito } from "next/font/google";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

const carlito = Carlito({
  subsets: ["latin"],
  weight: ["400", "700"],
  style:   ["normal", "italic"],
  display: "swap",
});

const wordmarkFont: React.CSSProperties = {
  fontFamily: `Calibri, "Calibri Light", ${carlito.style.fontFamily}, sans-serif`,
  fontStyle:  "italic",
};

const QUOTES = [
  { text: "Win the morning, win the day.", author: "" },
  { text: "Your habits today are building your identity of tomorrow.", author: "James Clear" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Do the hard thing first. The rest of the day gets easier.", author: "Brian Tracy" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Small steps forward are still steps forward.", author: "" },
  { text: "Clarity comes from action, not from thought.", author: "" },
];

function dailyQuote() {
  return QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length];
}

const PHRASES = [
  "I want to grow as fast as possible",
  "Wake up at 5am. No excuses.",
  "Building my dream life, one day at a time",
  "Every day I'm getting 1% better",
  "My future self is watching me right now",
  "Ship the landing page. Close 3 deals.",
  "Fear is just resistance to growth",
];
const CRYPTO  = "@#%&x!z$8fA3kQ92mBp7Lr5Ws2Yt9Nh4";
const randChar = () => CRYPTO[Math.floor(Math.random() * CRYPTO.length)];

// ── Left dark panel — identical to sign-in page ──────────────────────────────
function DarkPanel() {
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
        sEl.style.color = "#AAAAAA";
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
    "radial-gradient(ellipse 80% 60% at 20% 100%, rgba(249,115,22,0.22) 0%, transparent 60%)",
    "radial-gradient(ellipse 60% 80% at 100% 0%, rgba(249,115,22,0.08) 0%, transparent 50%)",
    "#0a0a0a",
  ].join(", ");

  const dots = [
    "radial-gradient(1px 1px at 18% 28%, rgba(249,115,22,0.5), transparent)",
    "radial-gradient(1px 1px at 72% 62%, rgba(255,255,255,0.25), transparent)",
    "radial-gradient(1px 1px at 42% 78%, rgba(249,115,22,0.4), transparent)",
    "radial-gradient(1px 1px at 88% 22%, rgba(255,255,255,0.2), transparent)",
    "radial-gradient(1px 1px at 12% 68%, rgba(249,115,22,0.35), transparent)",
    "radial-gradient(1px 1px at 60% 12%, rgba(255,255,255,0.3), transparent)",
  ].join(", ");

  return (
    <div
      className="flex-none w-full h-[48dvh] landscape:max-lg:h-auto landscape:max-lg:flex-1 lg:h-auto lg:flex-1 flex flex-col justify-between p-6 lg:p-7"
      style={{ background: bg, position: "relative", overflow: "hidden" }}
    >
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: dots }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-orange.png" alt="Life By Design" style={{ width: 34, height: 34, borderRadius: 8, display: "block" }} />
        <span style={{ ...wordmarkFont, fontSize: 16, fontWeight: 700, color: "#FFFFFF", padding: "5px 11px", backgroundColor: "rgba(0,0,0,0.40)", borderRadius: 8 }}>
          Life By <span style={{ color: "#fb923c" }}>Design</span>
        </span>
      </div>

      {/* Headline + crypto card */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <h2 className="mb-2" style={{ fontSize: 28, fontWeight: 600, color: "white", lineHeight: 1.2, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
          Your private space<br />to design your life.
        </h2>
        <p className="mb-3 lg:mb-[22px]" style={{ fontSize: 13, color: "#C4C4C4", margin: 0, lineHeight: 1.5 }}>
          Goals, habits, reflections — encrypted before they leave your device.
        </p>

        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "0.5px solid rgba(249,115,22,0.35)",
          borderRadius: 12, padding: "16px 18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: "rgba(249,115,22,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Lock size={11} color="#fb923c" strokeWidth={2.5} />
            </div>
            <span ref={statusRef} style={{ fontSize: 10, fontWeight: 600, color: "#AAAAAA", letterSpacing: "1.2px", textTransform: "uppercase" }}>
              Plain text
            </span>
          </div>
          <div ref={phraseRef} style={{
            fontSize: 15, fontWeight: 500, color: "white",
            lineHeight: 1.5, minHeight: 46,
            fontFamily: "'SF Mono', 'Courier New', monospace",
            letterSpacing: "0.2px", wordBreak: "break-all",
          }}>
            {PHRASES[0]}
          </div>
        </div>
      </div>

      {/* Footer pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        {["AES-256", "END-TO-END"].map(label => (
          <span key={label} style={{
            background: "rgba(249,115,22,0.12)", color: "#fb923c",
            padding: "4px 10px", borderRadius: 12,
            fontSize: 10, fontWeight: 600, letterSpacing: "0.5px",
            border: "0.5px solid rgba(249,115,22,0.25)",
          }}>
            {label}
          </span>
        ))}
        <span style={{ fontSize: 11, color: "#C4C4C4" }}>Only you can read this.</span>
      </div>
    </div>
  );
}

// ── Registration form ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [designation, setDesignation] = useState("");
  const [gender,      setGender]      = useState("");
  const [password,    setPassword]    = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [step,        setStep]        = useState(1);
  const [maxStep,     setMaxStep]     = useState(1);

  useEffect(() => { setMaxStep(prev => Math.max(prev, step)); }, [step]);

  const TOTAL_STEPS = 6;
  const quote       = dailyQuote();

  function validateStep(s: number): string | null {
    if (s === 1 && name.trim().length < 2)        return "Please enter your full name.";
    if (s === 2 && !/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email.";
    if (s === 3 && designation.trim().length < 2) return "Please enter your designation.";
    if (s === 4 && !gender)                       return "Please select your gender.";
    if (s === 5 && password.length < 6)           return "Password must be at least 6 characters.";
    if (s === 6 && password !== confirmPw)        return "Passwords don't match.";
    return null;
  }

  function handleNext() {
    setError("");
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setStep(s => Math.min(TOTAL_STEPS, s + 1));
  }

  function jumpToStep(target: number) {
    setError("");
    if (target <= step) { setStep(target); return; }
    for (let s = step; s < target; s++) {
      const err = validateStep(s);
      if (err) { setStep(s); setError(err); return; }
    }
    setStep(target);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step < TOTAL_STEPS) { handleNext(); return; }
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const err = validateStep(s);
      if (err) { setStep(s); setError(err); return; }
    }
    setLoading(true);
    try {
      await api.post("/auth/register", {
        name: name.trim(), email, password,
        designation: designation.trim(), gender,
      });
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px",
    borderRadius: 24, border: "1px solid #E5E5E5",
    backgroundColor: "#FFFFFF", color: "#1a1a1a",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    marginBottom: 6, color: "#404040",
  };

  return (
    <div className="flex flex-col landscape:max-lg:flex-row lg:flex-row overflow-hidden" style={{ height: "100dvh", backgroundColor: "#FFFFFF" }}>

      <DarkPanel />

      {/* ── Form panel ─────────────────────────────────────────────── */}
      <div
        className="flex-1 lg:flex-none lg:w-[460px] overflow-y-auto lbd-hide-scrollbar px-6 lg:px-14 flex flex-col pt-10 landscape:max-lg:pt-[6vh] lg:pt-[7vh]"
        style={{ paddingBottom: 32, scrollbarGutter: "stable" }}
      >
        <div style={{ width: "100%", maxWidth: 360, marginInline: "auto" }}>

          {/* Desktop compass logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Life By Design"
            className="hidden lg:block"
            style={{ width: 48, height: 48, marginBottom: 20 }}
          />

          {/* Welcome + daily quote */}
          <p style={{ fontSize: 13, color: "#525252", margin: "0 0 4px" }}>
            Welcome to{" "}
            <span style={{ ...wordmarkFont, fontWeight: 700, color: "#1a1a1a", fontSize: 15 }}>
              Life By <span style={{ color: "#C2410C" }}>Design</span>
            </span>
          </p>
          <h1 className="text-[22px] lg:text-[26px]" style={{ fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em", lineHeight: 1.18, margin: "0 0 6px" }}>
            &ldquo;{quote.text}&rdquo;
          </h1>
          {quote.author
            ? <p style={{ fontSize: 12, color: "#737373", margin: "0 0 26px", fontWeight: 600 }}>— {quote.author}</p>
            : <div style={{ height: 26 }} />
          }

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <StepIndicator total={TOTAL_STEPS} current={step} maxReached={maxStep} onJump={jumpToStep} />

            {/* Fixed-height field area so the button stays put */}
            <div style={{ minHeight: 102, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>

              {step === 1 && (
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input key="step1" type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your full name" style={inputStyle} autoFocus />
                </div>
              )}
              {step === 2 && (
                <div>
                  <label style={labelStyle}>Email</label>
                  <input key="step2" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" style={inputStyle} autoFocus />
                </div>
              )}
              {step === 3 && (
                <div>
                  <label style={labelStyle}>Designation</label>
                  <input key="step3" type="text" value={designation} onChange={e => setDesignation(e.target.value)}
                    placeholder="e.g. Founder, Designer, Student" style={inputStyle} autoFocus />
                </div>
              )}
              {step === 4 && (
                <div>
                  <label style={labelStyle}>Gender</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["Male", "Female", "Other"] as const).map(g => {
                      const sel = gender === g;
                      return (
                        <button key={g} type="button" onClick={() => setGender(g)} style={{
                          flex: 1, padding: "10px 8px",
                          borderRadius: 24,
                          border: sel ? "2px solid #f97316" : "1px solid #E5E5E5",
                          backgroundColor: sel ? "#FFF7ED" : "#FFFFFF",
                          color: sel ? "#EA580C" : "#1a1a1a",
                          fontSize: 13, fontWeight: sel ? 700 : 500,
                          cursor: "pointer", transition: "all 0.12s",
                        }}>
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {step === 5 && (
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input key="step5" type={showPwd ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      style={{ ...inputStyle, paddingRight: 44 }} autoFocus />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: "#a3a3a3" }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              {step === 6 && (
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input key="step6" type={showPwd ? "text" : "password"} value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Re-enter your password"
                      style={{ ...inputStyle, paddingRight: 44 }} autoFocus />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: "#a3a3a3" }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#DC2626", margin: 0, padding: "9px 12px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, fontWeight: 600 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, padding: "12px 0",
                borderRadius: 24, border: "none",
                background: loading ? "#E8C8A8" : "#f97316",
                color: "#FFFFFF", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Creating account…" : step < TOTAL_STEPS ? "Next" : "Create account"}
            </button>
          </form>

          {/* Back to sign-in */}
          <p style={{ textAlign: "center", fontSize: 13, color: "#525252", marginTop: 20 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#f97316", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>

          {/* Legal */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#737373", fontWeight: 500, marginTop: 20, lineHeight: 1.5 }}>
            By creating an account you agree to our{" "}
            <a href="/privacy" style={{ color: "#f97316", fontWeight: 700 }}>privacy policy</a>
            {" "}and{" "}
            <a href="/terms" style={{ color: "#f97316", fontWeight: 700 }}>terms of use</a>.
          </p>

        </div>
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ total, current, maxReached, onJump }: {
  total: number; current: number; maxReached: number; onJump: (n: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: total }, (_, i) => i + 1).map(n => {
        const isActive = n === current;
        const isDone   = n <= maxReached && !isActive;
        const dotSize  = isActive ? 32 : 26;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => onJump(n)}
              aria-label={`Go to step ${n}`}
              aria-current={isActive ? "step" : undefined}
              style={{
                width: dotSize, height: dotSize, borderRadius: "50%",
                padding: 0, cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isActive ? 13 : 12, fontWeight: 800,
                fontFamily: "inherit", letterSpacing: "-0.02em",
                background: isActive ? "#f97316" : isDone ? "#FFE4CC" : "#FFFFFF",
                border: isActive ? "2px solid #FFD7B5" : isDone ? "1.5px solid #FDBA74" : "1.5px solid #E5E5E5",
                color: isActive ? "#FFFFFF" : isDone ? "#C2410C" : "#A8A29E",
                boxShadow: isActive ? "0 4px 14px rgba(234,88,12,0.35)" : "none",
                transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {n}
            </button>
            {n < total && (
              <div style={{
                width: 28, height: 2, borderRadius: 2, margin: "0 4px",
                backgroundColor: n < maxReached ? "#f97316" : "#E5E5E5",
                transition: "background-color 0.2s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
