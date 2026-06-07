"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, type AuthUser } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { AuthShell, wordmarkFont, errorBoxStyle } from "@/components/auth/AuthPanel";
import OtpInput from "@/components/OtpInput";

const RESEND_SECONDS = 60;

function VerifyEmailForm() {
  const { setSession } = useAuth();
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const email          = searchParams.get("email") ?? "";

  const [code,      setCode]      = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [cooldown,  setCooldown]  = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const submittedFor = useRef<string>("");

  // No email in the URL → nothing to verify.
  useEffect(() => {
    if (!email) router.replace("/login");
  }, [email, router]);

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function submit(fullCode: string) {
    if (loading || fullCode.length !== 6) return;
    if (submittedFor.current === fullCode) return; // avoid double-submit on autofill
    submittedFor.current = fullCode;
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: AuthUser }>(
        "/auth/verify-email",
        { email, code: fullCode },
      );
      setSession(res.accessToken, res.user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCode("");
      submittedFor.current = "";
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit once all six digits are entered.
  function handleChange(v: string) {
    setCode(v);
    if (v.length === 6) submit(v);
  }

  async function resend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await api.post("/auth/resend-otp", { email, purpose: "verify_email" });
      setCooldown(RESEND_SECONDS);
      setCode("");
      submittedFor.current = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell>
      <p style={{ fontSize: 13, color: "#525252", margin: "0 0 4px" }}>
        Welcome to{" "}
        <span style={{ ...wordmarkFont, fontWeight: 700, color: "#1a1a1a", fontSize: 15 }}>
          Life By <span style={{ color: "#C2410C" }}>Design</span>
        </span>
      </p>
      <h1 className="text-[22px] lg:text-[26px]" style={{ fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em", lineHeight: 1.18, margin: "0 0 6px" }}>
        Verify your email
      </h1>
      <p style={{ fontSize: 13, color: "#737373", margin: "0 0 26px", lineHeight: 1.5 }}>
        We sent a 6-digit code to{" "}
        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{email}</span>. Enter it below to finish setting up your account.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); submit(code); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <OtpInput value={code} onChange={handleChange} disabled={loading} autoFocus />

        {error && <p style={errorBoxStyle}>{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          style={{
            padding: "12px 0", borderRadius: 24, border: "none",
            background: loading || code.length !== 6 ? "#E8C8A8" : "#f97316",
            color: "#FFFFFF", fontSize: 14, fontWeight: 600,
            cursor: loading || code.length !== 6 ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Verifying…" : "Verify"}
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

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
