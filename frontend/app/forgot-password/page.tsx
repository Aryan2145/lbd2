"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

type Step = "email" | "otp" | "password" | "done";

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

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step,        setStep]        = useState<Step>("email");
  const [email,       setEmail]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [resetToken,  setResetToken]  = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showPwd,     setShowPwd]     = useState(false);

  const [error,   setError]   = useState("");
  const [notice,  setNotice]  = useState("");
  const [loading, setLoading] = useState(false);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setNotice(`We've sent a 6-digit code to ${email.trim()}.`);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { resetToken } = await api.post<{ resetToken: string }>("/auth/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      setResetToken(resetToken);
      setNotice("");
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPwd) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim(),
        resetToken,
        newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError(""); setNotice(""); setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setNotice("A new code has been sent.");
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const primaryBtn = (label: string): React.CSSProperties => ({
    marginTop: 4, padding: "12px 0", width: "100%",
    borderRadius: 24, border: "none",
    background: loading ? "#E8C8A8" : "#f97316",
    color: "#FFFFFF", fontSize: 14, fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    transition: "background 0.15s",
  });

  const stepMeta: Record<Step, { icon: React.ReactNode; title: string; sub: string }> = {
    email: {
      icon: <Mail size={20} color="#C2410C" strokeWidth={2} />,
      title: "Forgot your password?",
      sub: "Enter the email linked to your account and we'll send you a 6-digit code.",
    },
    otp: {
      icon: <ShieldCheck size={20} color="#C2410C" strokeWidth={2} />,
      title: "Enter your code",
      sub: `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
    },
    password: {
      icon: <Lock size={20} color="#C2410C" strokeWidth={2} />,
      title: "Set a new password",
      sub: "Choose a new password for your account.",
    },
    done: {
      icon: <CheckCircle2 size={20} color="#16A34A" strokeWidth={2} />,
      title: "Password updated",
      sub: "Your password has been changed. You can now sign in with it.",
    },
  };

  const meta = stepMeta[step];

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, background: "#FDF6EF",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Life By Design" style={{ width: 44, height: 44, margin: "0 auto 10px", display: "block" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
            Life By <span style={{ color: "#C2410C" }}>Design</span>
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: "#FFFFFF", border: "1px solid #F0E5D8", borderRadius: 18,
          padding: "28px 26px", boxShadow: "0 8px 30px rgba(120,60,10,0.06)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, marginBottom: 14,
            background: step === "done" ? "rgba(22,163,74,0.10)" : "#FFF4EC",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {meta.icon}
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            {meta.title}
          </h1>
          <p style={{ fontSize: 13, color: "#525252", margin: "0 0 20px", lineHeight: 1.5 }}>
            {meta.sub}
          </p>

          {notice && step !== "done" && (
            <p style={{
              fontSize: 12.5, color: "#9A3412", margin: "0 0 14px",
              padding: "9px 12px", backgroundColor: "#FFF4EC",
              border: "1px solid #FBD3B4", borderRadius: 8, fontWeight: 500, lineHeight: 1.5,
            }}>
              {notice}
            </p>
          )}

          {error && (
            <p style={{
              fontSize: 13, color: "#DC2626", margin: "0 0 14px",
              padding: "9px 12px", backgroundColor: "#FEF2F2",
              border: "1px solid #FCA5A5", borderRadius: 8, fontWeight: 600,
            }}>
              {error}
            </p>
          )}

          {/* ── Step: email ─────────────────────────────────────── */}
          {step === "email" && (
            <form onSubmit={submitEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus placeholder="you@example.com" style={inputStyle}
                />
              </div>
              <button type="submit" disabled={loading} style={primaryBtn("")}>
                {loading ? "Sending…" : "Send reset code"}
              </button>
            </form>
          )}

          {/* ── Step: otp ───────────────────────────────────────── */}
          {step === "otp" && (
            <form onSubmit={submitOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>6-digit code</label>
                <input
                  type="text" inputMode="numeric" autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required autoFocus placeholder="123456"
                  style={{ ...inputStyle, letterSpacing: "8px", textAlign: "center", fontSize: 20, fontWeight: 700 }}
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} style={{
                ...primaryBtn(""),
                background: (loading || otp.length !== 6) ? "#E8C8A8" : "#f97316",
                cursor: (loading || otp.length !== 6) ? "not-allowed" : "pointer",
              }}>
                {loading ? "Verifying…" : "Verify code"}
              </button>
              <button
                type="button" onClick={resendCode} disabled={loading}
                style={{ background: "none", border: "none", color: "#f97316", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}
              >
                Didn't get it? Resend code
              </button>
            </form>
          )}

          {/* ── Step: password ──────────────────────────────────── */}
          {step === "password" && (
            <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>New password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    required minLength={6} autoFocus placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button
                    type="button" onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: 2,
                      display: "flex", alignItems: "center", color: "#a3a3a3",
                    }}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirm new password</label>
                <input
                  type={showPwd ? "text" : "password"}
                  value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                  required minLength={6} placeholder="••••••••" style={inputStyle}
                />
              </div>
              <button type="submit" disabled={loading} style={primaryBtn("")}>
                {loading ? "Updating…" : "Reset password"}
              </button>
            </form>
          )}

          {/* ── Step: done ──────────────────────────────────────── */}
          {step === "done" && (
            <button
              type="button" onClick={() => router.replace("/login")}
              style={primaryBtn("")}
            >
              Back to sign in
            </button>
          )}
        </div>

        {/* Back link */}
        {step !== "done" && (
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <Link
              href="/login"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#737373", fontWeight: 600, textDecoration: "none" }}
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
