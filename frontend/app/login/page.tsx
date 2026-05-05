"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

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
    color: "#57534E", textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#FAF5EE" }}>
      {/* ── LEFT — full-bleed mountain image ─────────────────────── */}
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
        {/* subtle warm gradient overlay for depth */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(28,25,23,0) 0%, rgba(28,25,23,0.25) 100%)",
        }} />
      </div>

      {/* ── RIGHT — sign-in card ─────────────────────────────────── */}
      <div
        className="flex flex-col justify-center px-6 lg:px-16 py-10"
        style={{
          width: "100%",
          maxWidth: 560,
          marginLeft: "auto",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380, marginInline: "auto" }}>

          {/* Logo */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 20px rgba(234,88,12,0.28)",
            marginBottom: 18,
          }}>
            <Crown size={26} color="#fff" />
          </div>

          {/* Welcome line */}
          <p style={{ fontSize: 14, color: "#57534E", margin: 0, marginBottom: 4 }}>
            Welcome to <span style={{ fontWeight: 700, color: "#1C1917" }}>Life By Design</span>
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
            <p style={{ fontSize: 13, color: "#78716C", margin: "0 0 28px", fontWeight: 500 }}>
              — {quote.author}
            </p>
          )}
          {!quote.author && <div style={{ height: 28 }} />}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {mode === "register" && (
              <div>
                <label style={labelStyle}>Full Name</label>
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
              <label style={labelStyle}>Email</label>
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
              <label style={labelStyle}>Password</label>
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
          <p style={{ textAlign: "center", fontSize: 13, color: "#57534E", marginTop: 22 }}>
            {mode === "login" ? (
              <>
                New here?{" "}
                <button
                  onClick={() => switchMode("register")}
                  style={{
                    background: "none", border: "none",
                    color: "#EA580C", fontWeight: 700, cursor: "pointer", fontSize: 13,
                    padding: 0,
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => switchMode("login")}
                  style={{
                    background: "none", border: "none",
                    color: "#EA580C", fontWeight: 700, cursor: "pointer", fontSize: 13,
                    padding: 0,
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Legal */}
          <p style={{
            textAlign: "center", fontSize: 11, color: "#78716C",
            marginTop: 24, lineHeight: 1.5,
          }}>
            By continuing you agree to our{" "}
            <a href="/privacy" style={{ color: "#EA580C", fontWeight: 600 }}>privacy policy</a>
            {" "}and{" "}
            <a href="/terms" style={{ color: "#EA580C", fontWeight: 600 }}>terms of use</a>.
          </p>
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
