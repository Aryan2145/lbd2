"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Carlito } from "next/font/google";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

// Calibri (Windows) with Carlito as the open-source metric-compatible fallback
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
  const i = Math.floor((Date.now() / 86_400_000)) % QUOTES.length;
  return QUOTES[i];
}

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
  // Tracks the furthest step the user has reached so the indicator's
  // connector lines stay filled when going back to earlier steps.
  const [maxStep,     setMaxStep]     = useState(1);
  useEffect(() => {
    setMaxStep((prev) => Math.max(prev, step));
  }, [step]);

  const TOTAL_STEPS = 6;
  const quote = dailyQuote();

  function validateStep(s: number): string | null {
    if (s === 1 && name.trim().length < 2)         return "Please enter your full name.";
    if (s === 2 && !/^\S+@\S+\.\S+$/.test(email))  return "Please enter a valid email.";
    if (s === 3 && designation.trim().length < 2)  return "Please enter your designation.";
    if (s === 4 && !gender)                        return "Please select your gender.";
    if (s === 5 && password.length < 6)            return "Password must be at least 6 characters.";
    if (s === 6 && password !== confirmPw)         return "Passwords don't match.";
    return null;
  }

  function handleNext() {
    setError("");
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  // Click-to-jump on the step indicator:
  //   - Going backward (target ≤ current step): always allowed.
  //   - Going forward: only if every step between is valid.
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
    // Validate every step before submitting
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const err = validateStep(s);
      if (err) { setStep(s); setError(err); return; }
    }
    setLoading(true);
    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email,
        password,
        designation: designation.trim(),
        gender,
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
    width: "100%", padding: "12px 14px",
    borderRadius: 12, border: "1.5px solid #D6C9BC",
    backgroundColor: "#FFFFFF", color: "#1C1917",
    fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 6,
  };
  // mobile: darker for legibility on the glass; desktop: original muted stone
  const secondaryTextClass = "text-[#1C1917] lg:text-[#57534E]";

  return (
    <div style={{
      position: "relative",
      height: "100dvh", display: "flex", overflow: "hidden",
      backgroundColor: "#FAF5EE",
    }}>
      {/* Mobile-only background image (portrait mountain + orange filter) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/login-bg-mobile.png"
        alt=""
        aria-hidden
        className="lg:hidden"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="lg:hidden"
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          background:
            "linear-gradient(160deg, rgba(249,115,22,0.10) 0%, rgba(234,88,12,0.10) 100%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* ── LEFT — full-bleed mountain image with brand overlay ──── */}
      <div
        className="hidden lg:block"
        style={{
          flex: 1,
          backgroundImage: "url(/login-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute", inset: 0,
          background:
            "linear-gradient(180deg, rgba(28,25,23,0.35) 0%, rgba(28,25,23,0) 35%, rgba(28,25,23,0) 60%, rgba(28,25,23,0.45) 100%)",
        }} />

        {/* Brand block — glassmorphic plate */}
        <div style={{
          position: "absolute", top: 28, left: 28, zIndex: 1,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-orange.png"
            alt="Life By Design"
            style={{
              width: 44, height: 44, display: "block",
              borderRadius: 10,
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            }}
          />
          <span style={{
            ...wordmarkFont,
            fontSize: 24, fontWeight: 700, color: "#FFFFFF",
            letterSpacing: "-0.005em",
            padding: "6px 14px",
            backgroundColor: "rgba(0, 0, 0, 0.30)",
            backdropFilter: "blur(12px) saturate(140%)",
            WebkitBackdropFilter: "blur(12px) saturate(140%)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.22)",
            display: "inline-block",
          }}>
            Life By <span style={{ color: "#fd9266" }}>Design</span>
          </span>
        </div>
      </div>

      {/* ── RIGHT — registration card ────────────────────────────── */}
      <div
        className="flex flex-col px-6 lg:px-16 lg:bg-white lbd-hide-scrollbar"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 560,
          marginLeft: "auto",
          height: "100dvh",
          overflowY: "auto",
          scrollbarGutter: "stable",
          paddingTop: "9vh",
          paddingBottom: 32,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380, marginInline: "auto" }}>

          {/* Mobile: logo (bare) + wordmark on a glassmorphic plate */}
          <div
            className="flex lg:hidden"
            style={{
              alignItems: "center", gap: 12,
              marginTop: "-5vh",
              marginBottom: "calc(5vh + 18px)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-orange.png"
              alt="Life By Design"
              style={{
                width: 44, height: 44, display: "block",
                borderRadius: 10,
                boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              }}
            />
            <span style={{
              ...wordmarkFont,
              fontSize: 24, fontWeight: 700, color: "#FFFFFF",
              letterSpacing: "-0.005em",
              padding: "6px 14px",
              backgroundColor: "rgba(0, 0, 0, 0.30)",
              backdropFilter: "blur(12px) saturate(140%)",
              WebkitBackdropFilter: "blur(12px) saturate(140%)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: 12,
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.22)",
              display: "inline-block",
            }}>
              Life By <span style={{ color: "#fd9266" }}>Design</span>
            </span>
          </div>

          {/* Desktop: single compass logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Life By Design"
            className="hidden lg:block"
            style={{ width: 56, height: 56, marginBottom: 18 }}
          />

          {/* Frosted-glass card wrapping welcome → legal (mobile only) */}
          <div
            className="rounded-2xl bg-white/30 lg:bg-transparent lg:rounded-none lg:p-0"
            style={{
              padding: "20px 18px",
              border: "1px solid rgba(255,255,255,0.30)",
              boxShadow: "0 4px 16px rgba(28,25,23,0.08)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          >

          {/* Welcome line */}
          <p className={secondaryTextClass} style={{ fontSize: 14, margin: 0, marginBottom: 4 }}>
            Welcome to{" "}
            <span style={{ ...wordmarkFont, fontWeight: 700, color: "#1C1917", fontSize: 17 }}>
              Life By <span style={{ color: "#C2410C" }}>Design</span>
            </span>
          </p>

          {/* Quote — same as sign-in so the top stays identical */}
          <h1 style={{
            fontSize: 30, fontWeight: 800, color: "#1C1917",
            letterSpacing: "-0.02em", lineHeight: 1.18,
            margin: "0 0 6px",
          }}>
            &ldquo;{quote.text}&rdquo;
          </h1>
          {quote.author && (
            <p className="text-[#1C1917] lg:text-[#78716C]" style={{ fontSize: 13, margin: "0 0 28px", fontWeight: 600 }}>
              — {quote.author}
            </p>
          )}
          {!quote.author && <div style={{ height: 28 }} />}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── Step indicator ── */}
            <StepIndicator
              total={TOTAL_STEPS}
              current={step}
              maxReached={maxStep}
              onJump={jumpToStep}
            />

            {/* ── Active step's field — fixed-height area so the button stays put ── */}
            <div style={{ minHeight: 102, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
              {step === 1 && (
                <div>
                  <label className={secondaryTextClass} style={labelStyle}>Full Name</label>
                  <input
                    key="step1"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
              )}
              {step === 2 && (
                <div>
                  <label className={secondaryTextClass} style={labelStyle}>Email</label>
                  <input
                    key="step2"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
              )}
              {step === 3 && (
                <div>
                  <label className={secondaryTextClass} style={labelStyle}>Designation</label>
                  <input
                    key="step3"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Founder, Designer, Student"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
              )}
              {step === 4 && (
                <div>
                  <label className={secondaryTextClass} style={labelStyle}>Gender</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["Male", "Female", "Other"] as const).map((g) => {
                      const sel = gender === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            borderRadius: 12,
                            border: sel ? "2px solid #F97316" : "1.5px solid #D6C9BC",
                            backgroundColor: sel ? "#FFF7ED" : "#FFFFFF",
                            color: sel ? "#EA580C" : "#1C1917",
                            fontSize: 13, fontWeight: sel ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.12s",
                          }}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {step === 5 && (
                <div>
                  <label className={secondaryTextClass} style={labelStyle}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      key="step5"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      style={{ ...inputStyle, paddingRight: 42 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute", right: 12, top: "50%",
                        transform: "translateY(-50%)", background: "none",
                        border: "none", cursor: "pointer", padding: 2,
                        display: "flex", alignItems: "center", color: "#78716C",
                      }}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              {step === 6 && (
                <div>
                  <label className={secondaryTextClass} style={labelStyle}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      key="step6"
                      type={showPwd ? "text" : "password"}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Re-enter your password"
                      style={{ ...inputStyle, paddingRight: 42 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute", right: 12, top: "50%",
                        transform: "translateY(-50%)", background: "none",
                        border: "none", cursor: "pointer", padding: 2,
                        display: "flex", alignItems: "center", color: "#78716C",
                      }}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p style={{
                fontSize: 13, color: "#DC2626", margin: 0,
                padding: "9px 12px", backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5", borderRadius: 8, fontWeight: 600,
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: "13px 0", borderRadius: 12, border: "none",
                background: loading ? "#E8C8A8" : "linear-gradient(135deg, #F97316, #EA580C)",
                color: "#FFFFFF", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
                boxShadow: loading ? "none" : "0 4px 14px rgba(234,88,12,0.32)",
                transition: "transform 0.1s",
              }}
            >
              {loading
                ? "Creating account…"
                : step < TOTAL_STEPS ? "Next" : "Create account"}
            </button>
          </form>

          {/* Back to sign-in */}
          <p className={secondaryTextClass} style={{ textAlign: "center", fontSize: 13, marginTop: 22 }}>
            Already have an account?{" "}
            <Link
              href="/login"
              scroll={false}
              className="text-[#7C2D12] lg:text-[#EA580C]"
              style={{
                fontWeight: 700, fontSize: 13,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </p>

          <p className="text-[#1C1917] lg:text-[#78716C]" style={{
            textAlign: "center", fontSize: 11, fontWeight: 500,
            marginTop: 24, lineHeight: 1.5,
          }}>
            By creating an account you agree to our{" "}
            <a href="/privacy" className="text-[#7C2D12] lg:text-[#EA580C]" style={{ fontWeight: 700 }}>privacy policy</a>
            {" "}and{" "}
            <a href="/terms" className="text-[#7C2D12] lg:text-[#EA580C]" style={{ fontWeight: 700 }}>terms of use</a>.
          </p>

          </div>
          {/* end frosted-glass card */}
        </div>
      </div>
    </div>
  );
}

// ── Numbered step indicator (clickable to jump) ──────────────────────────────
function StepIndicator({ total, current, maxReached, onJump }: {
  total: number; current: number; maxReached: number; onJump: (n: number) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const isActive = n === current;
        // "Done" = reached at some point and not currently active
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
                background: isActive
                  ? "linear-gradient(135deg, #F97316, #EA580C)"
                  : isDone
                    ? "#FFE4CC"
                    : "#FFFFFF",
                border: isActive
                  ? "2px solid #FFD7B5"
                  : isDone
                    ? "1.5px solid #FDBA74"
                    : "1.5px solid #E5DBCD",
                color: isActive ? "#FFFFFF" : isDone ? "#C2410C" : "#A8A29E",
                boxShadow: isActive
                  ? "0 4px 14px rgba(234,88,12,0.40), 0 0 0 4px rgba(234,88,12,0.10)"
                  : "none",
                transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {n}
            </button>
            {n < total && (
              <div style={{
                width: 28, height: 2, borderRadius: 2,
                margin: "0 6px",
                backgroundColor: n < maxReached ? "#F97316" : "#EDE5D8",
                transition: "background-color 0.2s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
