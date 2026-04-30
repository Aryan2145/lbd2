import Link from "next/link";
import { Crown } from "lucide-react";

const FEATURES = [
  {
    icon: "🎯",
    title: "Identity Architecture",
    desc: "Define your legacy across every role you inhabit — partner, parent, colleague, friend. Your purpose lives at their intersection.",
  },
  {
    icon: "🌅",
    title: "Vision Canvas",
    desc: "Build a visual board of your life's most important areas. Generate your purpose statement with AI and pin it at the centre.",
  },
  {
    icon: "📅",
    title: "Weekly Planning",
    desc: "Plan your week with intention. Set priorities, block time, and sync your schedule directly to Google Calendar.",
  },
  {
    icon: "✅",
    title: "Goals & Habits",
    desc: "Break your vision into quarterly goals and daily habits. Track streaks, measure progress, and close the gap every day.",
  },
  {
    icon: "🌙",
    title: "Evening Reflection",
    desc: "End each day with a structured reflection. Capture wins, learnings, and what to carry forward.",
  },
  {
    icon: "🗓️",
    title: "Weekly Review",
    desc: "A guided review every Sunday. Assess what worked, what didn't, and set the tone for the week ahead.",
  },
];

const MODULES = [
  { num: "01", name: "Identity" },
  { num: "02", name: "Vision" },
  { num: "03", name: "Goals" },
  { num: "04", name: "Habits" },
  { num: "05", name: "Tasks" },
  { num: "06", name: "Weekly Plan" },
];

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "#FAF5EE", minHeight: "100vh", fontFamily: "inherit" }}>

      {/* ── Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "rgba(250,245,238,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #EDE5D8",
        padding: "0 40px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg,#F97316,#EA580C)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1C1917" }}>Life By Design</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" style={{
            padding: "8px 20px", borderRadius: 10,
            border: "1.5px solid #D6C9BC", backgroundColor: "#FFFFFF",
            fontSize: 13, fontWeight: 600, color: "#44403C",
            textDecoration: "none",
          }}>
            Sign In
          </Link>
          <Link href="/login?mode=register" style={{
            padding: "8px 20px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#F97316,#EA580C)",
            fontSize: 13, fontWeight: 600, color: "#FFFFFF",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: "100px 40px 80px", textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#F97316", marginBottom: 20,
        }}>
          Your life. By design.
        </p>
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800,
          color: "#1C1917", lineHeight: 1.1, marginBottom: 24,
        }}>
          Build a life you&apos;re proud of.<br />
          <span style={{ color: "#F97316" }}>On purpose.</span>
        </h1>
        <p style={{
          fontSize: 18, color: "#78716C", lineHeight: 1.7,
          maxWidth: 560, margin: "0 auto 40px",
        }}>
          Life By Design is a structured system for people who want to live intentionally —
          from defining their legacy to planning their week with clarity and purpose.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login?mode=register" style={{
            padding: "14px 36px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#F97316,#EA580C)",
            fontSize: 15, fontWeight: 700, color: "#FFFFFF",
            textDecoration: "none",
            boxShadow: "0 6px 24px rgba(249,115,22,0.35)",
          }}>
            Start for free
          </Link>
          <Link href="/login" style={{
            padding: "14px 36px", borderRadius: 12,
            border: "1.5px solid #D6C9BC", backgroundColor: "#FFFFFF",
            fontSize: 15, fontWeight: 600, color: "#44403C",
            textDecoration: "none",
          }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Module strip ── */}
      <section style={{
        borderTop: "1px solid #EDE5D8", borderBottom: "1px solid #EDE5D8",
        backgroundColor: "#FFFFFF", padding: "20px 40px",
        display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap",
      }}>
        {MODULES.map((m, i) => (
          <div key={m.num} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 24px",
            borderRight: i < MODULES.length - 1 ? "1px solid #EDE5D8" : "none",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#F97316" }}>Module {m.num}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917" }}>{m.name}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#F97316",
          textAlign: "center", marginBottom: 12,
        }}>
          Everything in one place
        </p>
        <h2 style={{
          fontSize: 36, fontWeight: 800, color: "#1C1917",
          textAlign: "center", marginBottom: 56,
        }}>
          A complete system for intentional living
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
        }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              backgroundColor: "#FFFFFF", borderRadius: 16,
              border: "1px solid #EDE5D8", padding: "28px 28px",
              boxShadow: "0 2px 12px rgba(28,25,23,0.04)",
            }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.7, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        margin: "0 40px 80px", borderRadius: 24,
        background: "linear-gradient(135deg,#F97316 0%,#EA580C 100%)",
        padding: "64px 40px", textAlign: "center",
        boxShadow: "0 12px 48px rgba(249,115,22,0.3)",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#FFFFFF", marginBottom: 16 }}>
          Ready to design your life?
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 36 }}>
          Join others who are living with clarity, purpose, and intention.
        </p>
        <Link href="/login?mode=register" style={{
          display: "inline-block", padding: "14px 40px", borderRadius: 12,
          backgroundColor: "#FFFFFF", fontSize: 15, fontWeight: 700,
          color: "#EA580C", textDecoration: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}>
          Get started — it&apos;s free
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid #EDE5D8", padding: "24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <span style={{ fontSize: 13, color: "#A8A29E" }}>
          © 2026 RGB India. All rights reserved.
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: "#78716C", textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: 13, color: "#78716C", textDecoration: "none" }}>Terms & Conditions</Link>
          <a href="mailto:connect@rgbindia.com" style={{ fontSize: 13, color: "#78716C", textDecoration: "none" }}>Contact</a>
        </div>
      </footer>

    </div>
  );
}
