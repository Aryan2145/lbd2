"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

type Mode = "login" | "register";

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

function LoginForm() {
  const { login }    = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("mode") === "register" ? "register" : "login"
  );

  useEffect(() => {
    if (searchParams.get("mode") === "register") setMode("register");
  }, [searchParams]);

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

  const quote = dailyQuote();

  function switchMode(m: Mode) {
    setMode(m); setError("");
    setName(""); setEmail(""); setPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (name.trim().length < 2) throw new Error("Please enter your full name");
        await api.post("/auth/register", { name: name.trim(), email, password });
      }
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
      height: "100vh", display: "flex", overflow: "hidden",
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
        {/* subtle warm gradient for depth + legibility */}
        <div style={{
          position: "absolute", inset: 0,
          background:
            "linear-gradient(180deg, rgba(28,25,23,0.35) 0%, rgba(28,25,23,0) 35%, rgba(28,25,23,0) 60%, rgba(28,25,23,0.45) 100%)",
        }} />

        {/* Brand block — glassmorphic plate over the mountain */}
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

      {/* ── RIGHT — sign-in card ─────────────────────────────────── */}
      <div
        className="flex flex-col px-6 lg:px-16 lg:bg-white"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 560,
          marginLeft: "auto",
          height: "100vh",
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

          {/* Desktop: single compass logo (existing) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Life By Design"
            className="hidden lg:block"
            style={{
              width: 56, height: 56,
              marginBottom: 18,
            }}
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

          {/* Quote (in place of "Get started…") */}
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

            {mode === "register" && (
              <div>
                <label className={secondaryTextClass} style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label className={secondaryTextClass} style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label className={secondaryTextClass} style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 42 }}
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
                ? (mode === "login" ? "Signing in…" : "Creating account…")
                : (mode === "login" ? "Sign in" : "Create account & sign in")}
            </button>
          </form>

          {/* Mode toggle */}
          <p className={secondaryTextClass} style={{ textAlign: "center", fontSize: 13, marginTop: 22 }}>
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link
                  href="/register"
                  scroll={false}
                  className="text-[#7C2D12] lg:text-[#EA580C]"
                  style={{
                    fontWeight: 700, fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="text-[#7C2D12] lg:text-[#EA580C]"
                  style={{
                    background: "none", border: "none",
                    fontWeight: 700, cursor: "pointer", fontSize: 13,
                    padding: 0,
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Legal */}
          <p className="text-[#1C1917] lg:text-[#78716C]" style={{
            textAlign: "center", fontSize: 11, fontWeight: 500,
            marginTop: 24, lineHeight: 1.5,
          }}>
            By continuing you agree to our{" "}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
