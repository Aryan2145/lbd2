"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/legacy");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

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
              Sign in to your account
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
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: "#78716C", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: "100%", padding: "10px 12px",
                  borderRadius: 10, border: "1.5px solid #D6C9BC",
                  backgroundColor: "#FDFAF7", color: "#1C1917",
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: "#78716C", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: 6,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "10px 12px",
                  borderRadius: 10, border: "1.5px solid #D6C9BC",
                  backgroundColor: "#FDFAF7", color: "#1C1917",
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#DC2626", margin: 0, padding: "8px 12px", backgroundColor: "#FEF2F2", borderRadius: 8 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "11px 0",
                borderRadius: 10,
                border: "none",
                background: loading
                  ? "#E8C8A8"
                  : "linear-gradient(135deg, #F97316, #EA580C)",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
                boxShadow: loading ? "none" : "0 2px 8px rgba(234,88,12,0.3)",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#A8A29E", marginTop: 24 }}>
          Contact your administrator to create an account.
        </p>
      </div>
    </div>
  );
}
