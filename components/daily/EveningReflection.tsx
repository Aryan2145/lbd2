"use client";

import type { EveningReflection, MoodEmoji } from "@/lib/dayTypes";
import { MOODS } from "@/lib/dayTypes";
import { Trophy } from "lucide-react";

interface Props {
  date:       string;
  reflection: EveningReflection;
  onUpdate:   (r: EveningReflection) => void;
}

function energyColor(n: number): string {
  if (n <= 3) return "#EF4444";
  if (n <= 6) return "#F59E0B";
  return "#10B981";
}

function energyLabel(n: number): string {
  if (n <= 2) return "Exhausted";
  if (n <= 4) return "Low";
  if (n <= 6) return "Okay";
  if (n <= 8) return "Good";
  return "Energised";
}

export default function EveningReflectionComponent({ date, reflection, onUpdate }: Props) {
  function updateWin(idx: number, val: string) {
    const wins = [...reflection.wins] as [string, string, string];
    wins[idx] = val;
    onUpdate({ ...reflection, wins });
  }

  const col = energyColor(reflection.energyLevel);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 28px 48px" }}>

        {/* Energy Level */}
        <section style={{ marginBottom: "28px" }}>
          <p style={sectionTitle}>Energy Level</p>
          <div style={{
            padding: "20px 24px", borderRadius: "14px",
            backgroundColor: col + "0D", border: `1.5px solid ${col}30`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                border: `3px solid ${col}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                backgroundColor: col + "15",
              }}>
                <span style={{ fontSize: "24px", fontWeight: 800, color: col, lineHeight: 1 }}>
                  {reflection.energyLevel}
                </span>
                <span style={{ fontSize: "8px", fontWeight: 600, color: col, textTransform: "uppercase",
                  letterSpacing: "0.05em" }}>
                  /10
                </span>
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 700, color: col, margin: 0 }}>
                  {energyLabel(reflection.energyLevel)}
                </p>
                <p style={{ fontSize: "11px", color: "#78716C", margin: "2px 0 0" }}>
                  How did your energy feel today?
                </p>
              </div>
            </div>
            <input
              type="range"
              min={1} max={10}
              value={reflection.energyLevel}
              onChange={(e) => onUpdate({ ...reflection, energyLevel: Number(e.target.value) })}
              style={{ width: "100%", accentColor: col, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ fontSize: "9px", color: "#78716C", fontWeight: 600 }}>1 — Exhausted</span>
              <span style={{ fontSize: "9px", color: "#78716C", fontWeight: 600 }}>10 — Peak energy</span>
            </div>
          </div>
        </section>

        {/* Mood */}
        <section style={{ marginBottom: "28px" }}>
          <p style={sectionTitle}>Mood</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {MOODS.map((m) => {
              const selected = reflection.mood === m.emoji;
              return (
                <button
                  key={m.emoji}
                  onClick={() => onUpdate({ ...reflection, mood: selected ? "" : m.emoji as MoodEmoji })}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                    padding: "10px 16px", borderRadius: "12px",
                    border: `2px solid ${selected ? m.color : "#E8DDD0"}`,
                    backgroundColor: selected ? m.color + "15" : "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{m.emoji}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700,
                    color: selected ? m.color : "#78716C" }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Highlights */}
        <section style={{ marginBottom: "22px" }}>
          <label style={{ ...sectionTitle, display: "block", marginBottom: "10px" }}>
            Highlights of the day
          </label>
          <textarea
            value={reflection.highlights}
            onChange={(e) => onUpdate({ ...reflection, highlights: e.target.value })}
            placeholder="What stood out today? Moments, conversations, breakthroughs…"
            rows={3}
            className="weekly-textarea"
            style={tarea}
          />
        </section>

        {/* Key Learnings */}
        <section style={{ marginBottom: "22px" }}>
          <label style={{ ...sectionTitle, display: "block", marginBottom: "10px" }}>
            Key learnings
          </label>
          <textarea
            value={reflection.keyLearnings}
            onChange={(e) => onUpdate({ ...reflection, keyLearnings: e.target.value })}
            placeholder="What did today teach you? Skills, patterns, insights…"
            rows={3}
            className="weekly-textarea"
            style={tarea}
          />
        </section>

        {/* Three Wins */}
        <section style={{ marginBottom: "22px" }}>
          <p style={{ ...sectionTitle, marginBottom: "12px" }}>
            <Trophy size={10} style={{ display: "inline", marginRight: 4 }} />
            Three wins today
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {([0, 1, 2] as const).map((idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #F97316, #EA580C)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 800, color: "#FFFFFF",
                }}>
                  {idx + 1}
                </span>
                <input
                  value={reflection.wins[idx]}
                  onChange={(e) => updateWin(idx, e.target.value)}
                  placeholder={`Win ${idx + 1}…`}
                  className="weekly-input"
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: "10px",
                    border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
                    fontSize: "13px", color: "#1C1917", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Additional Notes */}
        <section>
          <label style={{ ...sectionTitle, display: "block", marginBottom: "10px" }}>
            Additional notes
          </label>
          <textarea
            value={reflection.notes}
            onChange={(e) => onUpdate({ ...reflection, notes: e.target.value })}
            placeholder="Anything else worth capturing from today…"
            rows={3}
            className="weekly-textarea"
            style={tarea}
          />
        </section>

      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "#78716C", margin: "0 0 10px",
};

const tarea: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: "10px",
  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none",
  boxSizing: "border-box", resize: "none", fontFamily: "inherit",
};
