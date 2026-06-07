"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AuthShell, wordmarkFont, inputStyle, labelStyle, errorBoxStyle } from "@/components/auth/AuthPanel";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [error,    setError]    = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      // Backend returns ACCOUNT_NOT_FOUND when no user has this email.
      if (err instanceof Error && err.message === "ACCOUNT_NOT_FOUND") {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <p style={{ fontSize: 13, color: "#525252", margin: "0 0 4px" }}>
        <span style={{ ...wordmarkFont, fontWeight: 700, color: "#1a1a1a", fontSize: 15 }}>
          Life By <span style={{ color: "#C2410C" }}>Design</span>
        </span>
      </p>
      <h1 className="text-[22px] lg:text-[26px]" style={{ fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em", lineHeight: 1.18, margin: "0 0 6px" }}>
        Forgot your password?
      </h1>
      <p style={{ fontSize: 13, color: "#737373", margin: "0 0 26px", lineHeight: 1.5 }}>
        Enter your email and we&apos;ll send you a 6-digit code to reset your password.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setNotFound(false); setError(""); }}
            required
            placeholder="you@example.com"
            style={inputStyle}
            autoFocus
          />
        </div>

        {notFound && (
          <div style={{
            fontSize: 13, color: "#92400E", margin: 0,
            padding: "11px 13px", backgroundColor: "#FFFBEB",
            border: "1px solid #FDE68A", borderRadius: 10, lineHeight: 1.5,
          }}>
            No account found with this email.{" "}
            <Link
              href={`/register`}
              style={{ color: "#EA580C", fontWeight: 700, textDecoration: "none" }}
            >
              Create an account
            </Link>
          </div>
        )}

        {error && <p style={errorBoxStyle}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4, padding: "12px 0", borderRadius: 24, border: "none",
            background: loading ? "#E8C8A8" : "#f97316",
            color: "#FFFFFF", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s",
          }}
        >
          {loading ? "Sending code…" : "Send reset code"}
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: 13, color: "#525252", marginTop: 20 }}>
        Remembered it?{" "}
        <Link href="/login" style={{ color: "#f97316", fontWeight: 700, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
