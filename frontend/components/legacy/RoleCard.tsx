"use client";

import { useState, useRef } from "react";
import {
  Heart, Users, User, Briefcase, Globe, Users2,
  CheckCircle2, Lock, Pencil,
  type LucideIcon,
} from "lucide-react";

interface Role {
  id: string;
  title: string;
  question: string;
}

interface RoleCardProps {
  index: number;
  role: Role;
  value: string;
  onChange: (value: string) => void;
  isComplete: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReopen: () => void;
}

const ROLE_META: Record<string, { Icon: LucideIcon; color: string; bg: string; cardBg: string; btnBg: string }> = {
  spouse:    { Icon: Heart,     color: "#FFFFFF", bg: "#BE123C", cardBg: "#FFF1F2", btnBg: "#881337" },
  child:     { Icon: Users,     color: "#FFFFFF", bg: "#3B82F6", cardBg: "#EFF6FF", btnBg: "#1D4ED8" },
  parent:    { Icon: User,      color: "#FFFFFF", bg: "#F59E0B", cardBg: "#FFFBEB", btnBg: "#B45309" },
  colleague: { Icon: Briefcase, color: "#FFFFFF", bg: "#8B5CF6", cardBg: "#F5F3FF", btnBg: "#6D28D9" },
  friend:    { Icon: Users2,    color: "#FFFFFF", bg: "#EC4899", cardBg: "#FDF2F8", btnBg: "#BE185D" },
  social:    { Icon: Globe,     color: "#FFFFFF", bg: "#06B6D4", cardBg: "#ECFEFF", btnBg: "#0E7490" },
};

export default function RoleCard({
  index,
  role,
  value,
  onChange,
  isComplete,
  isSaved,
  isSaving,
  onSave,
  onReopen,
}: RoleCardProps) {
  const [focused, setFocused] = useState(false);
  const MAX_WORDS = 200;
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const remaining = Math.max(0, 10 - wordCount);
  const isOverLimit = wordCount > MAX_WORDS;
  const meta = ROLE_META[role.id] ?? { Icon: User, color: "#F97316", bg: "#FFF7ED" };
  const { Icon } = meta;

  const status = isSaved ? "added" : wordCount > 0 ? "inprogress" : "notstarted";
  const cardRef = useRef<HTMLDivElement>(null);

  function onHover(enter: boolean) {
    const el = cardRef.current;
    if (!el) return;
    if (enter) {
      el.style.transform = "translateY(-3px)";
      el.style.boxShadow = `0 12px 32px ${meta.bg}66, 0 4px 12px rgba(28,25,23,0.08)`;
      el.style.borderColor = meta.bg;
    } else if (!focused) {
      el.style.transform = "translateY(0)";
      el.style.boxShadow = "0 2px 8px rgba(28,25,23,0.06)";
      el.style.borderColor = "#E8DDD0";
    }
  }

  const handleChange = (newValue: string) => {
    const words = newValue.trim().split(/\s+/).filter(Boolean);
    if (words.length > MAX_WORDS) {
      const trimmed = newValue.trimStart();
      const wordMatches = [...trimmed.matchAll(/\S+/g)];
      const cutoff = wordMatches[MAX_WORDS]?.index ?? newValue.length;
      onChange(newValue.slice(0, cutoff));
    } else {
      onChange(newValue);
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        backgroundColor: meta.cardBg,
        border: focused ? `1.5px solid ${meta.bg}` : `1.5px solid ${meta.bg}55`,
        borderRadius: "16px",
        boxShadow: focused
          ? `0 8px 28px ${meta.bg}55`
          : "0 2px 8px rgba(28,25,23,0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Colored top accent bar */}
      <div style={{ height: 4, backgroundColor: meta.bg, flexShrink: 0 }} />

      <div style={{ padding: "16px 18px 16px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "10px",
            background: `linear-gradient(135deg, ${meta.bg}, ${meta.bg}cc)`,
            boxShadow: `0 3px 8px ${meta.bg}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon size={16} color={meta.color} />
          </div>

          <h3 style={{
            fontSize: "14px", fontWeight: 700, color: "#1C1917",
            flex: 1, margin: 0, letterSpacing: "-0.01em",
          }}>
            {role.title}
          </h3>

          {status === "added" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "4px",
              backgroundColor: meta.btnBg,
              borderRadius: "999px", padding: "3px 9px", flexShrink: 0,
            }}>
              <CheckCircle2 size={10} color="#FFFFFF" />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#FFFFFF" }}>Added</span>
            </div>
          )}
          {status === "inprogress" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
              backgroundColor: "#FFF7ED", borderRadius: "999px", padding: "3px 9px",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#EA580C" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#C2410C" }}>In progress</span>
            </div>
          )}
          {status === "notstarted" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
              backgroundColor: "#F5F0EB", borderRadius: "999px", padding: "3px 9px",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#78716C" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#44403C" }}>Not started</span>
            </div>
          )}
        </div>

        {/* Question */}
        <p style={{
          fontSize: "13px", color: "#44403C", lineHeight: 1.6, marginBottom: "14px",
        }}>
          {role.question}
        </p>

        <div style={{ flex: 1 }} />

        {/* Content area */}
        {isSaved ? (
          <div style={{
            position: "relative",
            height: "88px",
            padding: "10px 12px 10px 26px",
            backgroundColor: `${meta.bg}18`,
            borderRadius: "10px",
            marginBottom: "10px",
            overflow: "hidden",
          }}>
            <span style={{
              position: "absolute", top: 4, left: 10,
              fontSize: "28px", lineHeight: 1, color: meta.bg,
              fontFamily: "Georgia, serif", opacity: 0.7,
            }}>"</span>
            <p style={{
              fontSize: "13px", fontStyle: "italic", lineHeight: 1.7,
              color: "#1C1917", margin: 0,
              display: "-webkit-box", WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {value}
            </p>
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Write from the heart — this is your legacy speaking."
            className="placeholder:text-stone-500"
            style={{
              width: "100%",
              resize: "none",
              outline: "none",
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: "13px",
              fontStyle: value.length === 0 ? "italic" : "normal",
              lineHeight: 1.7,
              color: "#1C1917",
              caretColor: meta.bg,
              height: "88px",
              overflowY: "auto",
              marginBottom: "10px",
            }}
          />
        )}

        {/* Progress bar */}
        <div style={{ height: 2, borderRadius: "999px", backgroundColor: "#F2EAE0", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "999px",
            width: isSaved ? "100%" : `${Math.min(100, (wordCount / 10) * 100)}%`,
            backgroundColor: wordCount >= 10 ? meta.bg : "#D5C9BC",
            transition: "width 0.4s ease",
          }} />
        </div>

        {/* Word count hint */}
        {!isSaved && (
          <p style={{
            fontSize: "11px", marginTop: "5px", textAlign: "right",
            color: isComplete ? meta.btnBg : "#78716C",
          }}>
            {isComplete ? `${wordCount} words ✓` : `${remaining} more words to unlock`}
          </p>
        )}

        {isOverLimit && !isSaved && (
          <p style={{ fontSize: "11px", color: "#DC2626", textAlign: "right", marginTop: 2 }}>
            {wordCount}/{MAX_WORDS}
          </p>
        )}

        {/* Save button */}
        {!isSaved && isComplete && (
          <button
            onClick={isSaving ? undefined : onSave}
            disabled={isSaving}
            style={{
              width: "100%", marginTop: "10px", padding: "8px",
              borderRadius: "10px", border: "none",
              background: isSaving ? "#F2EAE0" : meta.btnBg,
              color: isSaving ? "#A8A29E" : "#FFFFFF",
              boxShadow: isSaving ? "none" : `0 2px 8px ${meta.btnBg}66`,
              fontSize: "12px", fontWeight: 600, cursor: isSaving ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            {isSaving ? "Saving…" : <><Lock size={11} /> Save & Lock</>}
          </button>
        )}

        {/* Edit button when saved */}
        {isSaved && (
          <button
            onClick={onReopen}
            style={{
              width: "100%", marginTop: "10px", padding: "6px",
              borderRadius: "8px", border: "none",
              backgroundColor: meta.bg, color: "#FFFFFF",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
              boxShadow: `0 2px 8px ${meta.bg}55`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>
    </div>
  );
}
