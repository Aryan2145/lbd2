"use client";

import { useState } from "react";
import { CheckCircle2, Lock, Pencil } from "lucide-react";

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
      className="rounded-2xl transition-all duration-200"
      style={{
        backgroundColor: "#FFFFFF",
        border: isSaved
          ? "1.5px solid #86EFAC"
          : isComplete
          ? "1.5px solid #FED7AA"
          : focused
          ? "1.5px solid #F97316"
          : "1.5px solid #EDE5D8",
        boxShadow: isSaved
          ? "0 2px 12px rgba(34,197,94,0.08)"
          : focused
          ? "0 6px 28px rgba(249,115,22,0.10)"
          : isComplete
          ? "0 2px 12px rgba(249,115,22,0.06)"
          : "0 1px 4px rgba(28,25,23,0.05)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top accent bar */}
      {(isComplete || isSaved) && (
        <div style={{
          height: 3,
          background: isSaved
            ? "linear-gradient(90deg,#22C55E,#16A34A)"
            : "linear-gradient(90deg,#F97316,#EA580C)",
          flexShrink: 0,
        }} />
      )}

      <div className="p-5" style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header: badge + title + word count / saved indicator */}
        <div className="flex items-center gap-3" style={{ marginBottom: "10px" }}>
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold transition-all duration-300"
            style={{
              background: isSaved
                ? "linear-gradient(135deg,#22C55E,#16A34A)"
                : isComplete
                ? "linear-gradient(135deg,#F97316,#EA580C)"
                : focused
                ? "#FFF7ED"
                : "#F5F0EB",
              color: isSaved || isComplete ? "#FFFFFF" : focused ? "#F97316" : "#78716C",
            }}
          >
            {isSaved ? <Lock size={12} /> : isComplete ? <CheckCircle2 size={14} /> : index}
          </div>

          <h3
            className="text-sm font-bold flex-1 min-w-0"
            style={{ color: "#1C1917", letterSpacing: "-0.01em" }}
          >
            {role.title}
          </h3>

          {isSaved ? (
            <button
              onClick={onReopen}
              className="flex items-center gap-1 flex-shrink-0 transition-colors"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#16A34A",
                background: "#F0FDF4",
                border: "1px solid #86EFAC",
                borderRadius: "6px",
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              <Pencil size={10} />
              Edit
            </button>
          ) : (
            <span
              className="text-[11px] font-medium flex-shrink-0 transition-colors duration-300"
              style={{ color: wordCount >= 10 ? "#F97316" : "#A8A29E" }}
            >
              {wordCount >= 10
                ? `${wordCount} words ✓`
                : `${wordCount} / ${remaining} more to unlock`}
            </span>
          )}
        </div>

        {/* Question — full text, no clipping */}
        <p
          className="text-xs leading-relaxed"
          style={{
            color: "#57534E",
            fontStyle: "italic",
            marginBottom: "8px",
          }}
        >
          {role.question}
        </p>

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: "12px" }} />

        {/* Saved: read-only text view */}
        {isSaved ? (
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: "#1C1917",
              height: "96px",
              overflowY: "auto",
              padding: "4px 0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {value}
          </div>
        ) : (
          /* Editable textarea */
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Write from the heart — this is your legacy speaking..."
            className="w-full resize-none outline-none bg-transparent"
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: "#1C1917",
              caretColor: "#F97316",
              height: "96px",
              overflowY: "auto",
            }}
          />
        )}

        {/* Progress bar */}
        <div
          className="mt-2 h-[2px] rounded-full overflow-hidden"
          style={{ backgroundColor: "#F2EAE0" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: isSaved ? "100%" : `${Math.min(100, (wordCount / 10) * 100)}%`,
              backgroundColor: isSaved ? "#22C55E" : wordCount >= 10 ? "#F97316" : "#D5C9BC",
            }}
          />
        </div>

        {isOverLimit && !isSaved && (
          <p className="mt-1 text-right" style={{ fontSize: 11, color: "#DC2626" }}>
            {wordCount}/{MAX_WORDS}
          </p>
        )}

        {/* Save button — appears when 10+ words and not yet saved */}
        {!isSaved && isComplete && (
          <button
            onClick={isSaving ? undefined : onSave}
            disabled={isSaving}
            className="w-full mt-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200"
            style={{
              background: isSaving ? "#F2EAE0" : "linear-gradient(135deg,#F97316,#EA580C)",
              color: isSaving ? "#A8A29E" : "#FFFFFF",
              border: "none",
              cursor: isSaving ? "default" : "pointer",
              boxShadow: isSaving ? "none" : "0 2px 10px rgba(249,115,22,0.25)",
            }}
          >
            {isSaving ? "Saving…" : <><Lock size={11} /> Save & Lock</>}
          </button>
        )}
      </div>
    </div>
  );
}
