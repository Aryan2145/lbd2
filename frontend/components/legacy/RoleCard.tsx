"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

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
}

export default function RoleCard({
  index,
  role,
  value,
  onChange,
  isComplete,
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
      className="rounded-2xl transition-all duration-200 overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        border: isComplete
          ? "1.5px solid #FED7AA"
          : focused
          ? "1.5px solid #F97316"
          : "1.5px solid #EDE5D8",
        boxShadow: focused
          ? "0 6px 28px rgba(249,115,22,0.10)"
          : isComplete
          ? "0 2px 12px rgba(249,115,22,0.06)"
          : "0 1px 4px rgba(28,25,23,0.05)",
      }}
    >
      {/* Top accent bar when complete */}
      {isComplete && (
        <div style={{ height: 3, background: "linear-gradient(90deg,#F97316,#EA580C)" }} />
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Badge */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold mt-0.5 transition-all duration-300"
            style={{
              background: isComplete
                ? "linear-gradient(135deg,#F97316,#EA580C)"
                : focused
                ? "#FFF7ED"
                : "#F5F0EB",
              color: isComplete ? "#FFFFFF" : focused ? "#F97316" : "#78716C",
            }}
          >
            {isComplete ? <CheckCircle2 size={14} /> : index}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between mb-1">
              <h3
                className="text-sm font-bold"
                style={{ color: "#1C1917", letterSpacing: "-0.01em" }}
              >
                {role.title}
              </h3>
              <span
                className="text-[11px] font-medium transition-colors duration-300 flex-shrink-0 ml-2"
                style={{
                  color: wordCount >= 10 ? "#F97316" : "#A8A29E",
                }}
              >
                {wordCount >= 10
                  ? `${wordCount} words ✓`
                  : `${wordCount} / ${remaining} more to unlock`}
              </span>
            </div>

            {/* Question */}
            <p
              className="text-xs mb-3 leading-relaxed"
              style={{ color: "#57534E", fontStyle: "italic" }}
            >
              {role.question}
            </p>

            {/* Textarea */}
            <textarea
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Write from the heart — this is your legacy speaking..."
              rows={4}
              className="w-full resize-none outline-none bg-transparent"
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "#1C1917",
                caretColor: "#F97316",
              }}
            />

            {/* Word count bar */}
            <div
              className="mt-2 h-[2px] rounded-full overflow-hidden"
              style={{ backgroundColor: "#F2EAE0" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (wordCount / 10) * 100)}%`,
                  backgroundColor: wordCount >= 10 ? "#F97316" : "#D5C9BC",
                }}
              />
            </div>

            {isOverLimit && (
              <p className="mt-1 text-right" style={{ fontSize: 11, color: "#DC2626" }}>
                {wordCount}/{MAX_WORDS}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
