"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth, type AuthUser } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { AuthShell, wordmarkFont, inputStyle, labelStyle, errorBoxStyle } from "@/components/auth/AuthPanel";
import OtpInput from "@/components/OtpInput";

const RESEND_SECONDS = 60;

function ResetPasswordForm() {
  const { setSession } = useAuth();
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const email          = searchParams.get("email") ?? "";

  const [code,      setCode]      = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [cooldown,  setCooldown]  = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) router.replace("/forgot-password");
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (code.length !== 6)       { setError("Enter the 6-digit code from your email."); return; }
    if (password.length < 6)     { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)    { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: AuthUser }>(
        "/auth/reset-password",
        { email, code, newPassword: password },
      );
      setSession(res.accessToken, res.user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await api.post("/auth/resend-otp", { email, purpose: "password_reset" });
      setCooldown(RESEND_SECONDS);
      setCode("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code");
    } finally {
      setResending(false);
    }
  }

  const pwToggle = (
    <button type="button" onClick={() => setShowPwd(v => !v)}
      aria-label={showPwd ? "Hide password" : "Show password"}
      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: "#a3a3a3" }}>
      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <AuthShell>
      <p style={{ fontSize: 13, color: "#525252", margin: "0 0 4px" }}>
        <span style={{ ...wordmarkFont, fontWeight: 700, color: "#1a1a1a", fontSize: 15 }}>
          Life By <span style={{ color: "#C2410C" }}>Design</span>
        </span>
      </p>
      <h1 className="text-[22px] lg:text-[26px]" style={{ fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em", lineHeight: 1.18, margin: "0 0 6px" }}>
        Reset your password
      </h1>
      <p style={{ fontSize: 13, color: "#737373", margin: "0 0 24px", lineHeight: 1.5 }}>
        Enter the 6-digit code sent to{" "}
        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{email}</span> and choose a new password.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Verification code</label>
          <OtpInput value={code} onChange={setCode} disabled={loading} autoFocus />
        </div>

        <div>
          <label style={labelStyle}>New password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required minLength={6}
              placeholder="At least 6 characters"
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            {pwToggle}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Confirm new password</label>
          <input
            type={showPwd ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required minLength={6}
            placeholder="Re-enter your password"
            style={inputStyle}
          />
        </div>

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
          {loading ? "Resetting…" : "Reset password & sign in"}
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: 13, color: "#525252", marginTop: 20 }}>
        Didn&apos;t get it?{" "}
        {cooldown > 0 ? (
          <span style={{ color: "#A8A29E" }}>Resend in {cooldown}s</span>
        ) : (
          <button onClick={resend} disabled={resending}
            style={{ background: "none", border: "none", color: "#f97316", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>
            {resending ? "Sending…" : "Resend code"}
          </button>
        )}
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
