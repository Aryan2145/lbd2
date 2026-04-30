"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [mode,     setMode]     = useState<Mode>("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

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
      router.replace("/legacy");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    borderRadius: 10, border: "1.5px solid #D6C9BC",
    backgroundColor: "#FDFAF7", color: "#1C1917",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "#78716C", textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 6,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#FAF5EE" }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10 gap-3">
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(234,88,12,0.25)",
          }}>
            <Crown size={22} color="#fff" />
          </div>
          <div className="text-center">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C1917", letterSpacing: "-0.02em", margin: 0 }}>
              Life By Design
            </h1>
            <p style={{ fontSize: 13, color: "#A8A29E", marginTop: 4 }}>
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          border: "1px solid #EDE5D8",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          padding: "32px 28px",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {mode === "register" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Aryan Jain"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", padding: 2,
                    display: "flex", alignItems: "center", color: "#A8A29E",
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p style={{
                fontSize: 13, color: "#DC2626", margin: 0,
                padding: "8px 12px", backgroundColor: "#FEF2F2", borderRadius: 8,
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "11px 0", borderRadius: 10, border: "none",
                background: loading ? "#E8C8A8" : "linear-gradient(135deg, #F97316, #EA580C)",
                color: "#FFFFFF", fontSize: 14, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
                boxShadow: loading ? "none" : "0 2px 8px rgba(234,88,12,0.3)",
              }}
            >
              {loading
                ? (mode === "login" ? "Signing in…" : "Creating account…")
                : (mode === "login" ? "Sign in" : "Create account & sign in")}
            </button>
          </form>
        </div>

        {/* Toggle */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#A8A29E", marginTop: 20 }}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                onClick={() => switchMode("register")}
                style={{ background: "none", border: "none", color: "#EA580C", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("login")}
                style={{ background: "none", border: "none", color: "#EA580C", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
