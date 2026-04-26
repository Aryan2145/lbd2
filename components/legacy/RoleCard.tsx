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
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const remaining = Math.max(0, 10 - wordCount);

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200"
      style={{
        backgroundColor: "#FFFFFF",
        border: isComplete
          ? "1.5px solid #FED7AA"
          : focused
          ? "1.5px solid #D5C9BC"
          : "1.5px solid #F2EAE0",
        boxShadow: focused
          ? "0 4px 20px rgba(249, 115, 22, 0.07)"
          : "0 1px 4px rgba(28, 25, 23, 0.04)",
      }}
    >
      <div className="flex items-start gap-3.5">
        {/* Badge */}
        <div
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-semibold mt-0.5 transition-all duration-300"
          style={{
            backgroundColor: isComplete ? "#FFF7ED" : "#F5F0EB",
            color: isComplete ? "#EA580C" : "#A8A29E",
          }}
        >
          {isComplete ? (
            <CheckCircle2 size={13} style={{ color: "#F97316" }} />
          ) : (
            index
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-0.5">
            <h3
              className="text-sm font-semibold"
              style={{ color: "#1C1917" }}
            >
              {role.title}
            </h3>
            <span
              className="text-[11px] transition-colors duration-300 flex-shrink-0 ml-2"
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
            className="text-xs italic mb-3 leading-relaxed"
            style={{ color: "#78716C" }}
          >
            {role.question}
          </p>

          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Write from the heart — this is your legacy speaking..."
            rows={5}
            className="w-full resize-none text-sm leading-relaxed outline-none bg-transparent placeholder-shown:text-stone-400"
            style={{
              color: "#1C1917",
              caretColor: "#F97316",
            }}
          />

          {/* Word count bar */}
          <div
            className="mt-2 h-0.5 rounded-full overflow-hidden"
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
        </div>
      </div>
    </div>
  );
}
