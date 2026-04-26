"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Lock,
  Edit3,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export type SynthesisState =
  | "idle"
  | "processing"
  | "streaming"
  | "ready"
  | "editing"
  | "sealed";

interface PurposeBoxProps {
  state: SynthesisState;
  text: string;
  onSeal: () => void;
  onEdit: () => void;
  onSaveEdit: (text: string) => void;
  onCancelEdit: () => void;
}

export default function PurposeBox({
  state,
  text,
  onSeal,
  onEdit,
  onSaveEdit,
  onCancelEdit,
}: PurposeBoxProps) {
  const [editText, setEditText] = useState(text);
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    if (state === "editing") setEditText(text);
  }, [state]);

  useEffect(() => {
    if (state !== "streaming") return;
    const t = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(t);
  }, [state]);

  const isSealed = state === "sealed";

  if (state === "idle") return <IdleBox />;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-500"
      style={{
        backgroundColor: "#FFFFFF",
        border: isSealed ? "2px solid #C9A84C" : "1.5px solid #E8DDD0",
        boxShadow: isSealed
          ? "0 0 0 4px rgba(201,168,76,0.1), 0 8px 32px rgba(201,168,76,0.15)"
          : "0 2px 16px rgba(28,25,23,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4 flex items-start justify-between"
        style={{ borderBottom: "1px solid #F2EAE0" }}
      >
        <div>
          <p
            className="text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: "#F97316" }}
          >
            Your Purpose
          </p>
          <h3
            className="text-sm font-semibold mt-0.5"
            style={{ color: "#1C1917" }}
          >
            North Star Statement
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isSealed && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: "#F5E6C0", color: "#92681A" }}
            >
              <Lock size={9} />
              Sealed
            </span>
          )}
          {state === "ready" && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors duration-150"
              style={{ color: "#78716C", backgroundColor: "#F5F0EB" }}
            >
              <Edit3 size={10} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5 min-h-[160px]">
        {state === "processing" && <ShimmerLines />}

        {state === "streaming" && (
          <p
            className="text-sm leading-[1.75] animate-fade-in"
            style={{ color: "#1C1917" }}
          >
            {text}
            <span
              className="inline-block w-[2px] h-[14px] ml-[2px] rounded-sm align-middle transition-opacity duration-100"
              style={{
                backgroundColor: "#F97316",
                opacity: cursorOn ? 1 : 0,
              }}
            />
          </p>
        )}

        {(state === "ready" || state === "sealed") && (
          <p
            className="text-sm leading-[1.75] animate-fade-up"
            style={{ color: "#1C1917" }}
          >
            {text}
          </p>
        )}

        {state === "editing" && (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={7}
            autoFocus
            className="w-full resize-none text-sm leading-[1.75] outline-none bg-transparent"
            style={{ color: "#1C1917", caretColor: "#F97316" }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 space-y-2">
        {state === "editing" && (
          <div className="flex gap-2">
            <button
              onClick={() => onSaveEdit(editText)}
              className="flex-1 py-2 rounded-xl text-xs font-medium text-white transition-all duration-150"
              style={{
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                boxShadow: "0 2px 10px rgba(249,115,22,0.25)",
              }}
            >
              Save Changes
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 rounded-xl text-xs transition-all duration-150"
              style={{ backgroundColor: "#F5F0EB", color: "#78716C" }}
            >
              Cancel
            </button>
          </div>
        )}

        {state === "ready" && (
          <button
            onClick={onSeal}
            className="w-full py-3 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #C9A84C, #A87A22)",
              boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
            }}
          >
            <Lock size={13} />
            Seal My Purpose
          </button>
        )}

        {isSealed && (
          <>
            <button
              onClick={onEdit}
              className="w-full py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all duration-150"
              style={{ backgroundColor: "#F5F0EB", color: "#78716C" }}
            >
              <Edit3 size={11} />
              Refine Purpose
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function IdleBox() {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center text-center py-12 px-8"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1.5px dashed #E8DDD0",
        minHeight: "280px",
      }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: "#FFF7ED" }}
      >
        <Sparkles size={18} style={{ color: "#F97316" }} />
      </div>
      <p className="text-sm font-semibold mb-1.5" style={{ color: "#1C1917" }}>
        Your North Star Awaits
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "#78716C", maxWidth: "200px" }}
      >
        Complete all six role reflections to unlock the AI synthesis.
      </p>

      {/* Ghost lines */}
      <div className="mt-7 w-full space-y-2">
        {[100, 82, 91, 72].map((w, i) => (
          <div
            key={i}
            className="h-2 rounded-full"
            style={{ width: `${w}%`, backgroundColor: "#F2EAE0", margin: "0 auto" }}
          />
        ))}
      </div>
    </div>
  );
}

function ShimmerLines() {
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={13} style={{ color: "#F97316" }} />
        <span
          className="text-xs font-medium"
          style={{ color: "#F97316" }}
        >
          Synthesizing your legacy...
        </span>
      </div>
      {[100, 88, 94, 80, 60].map((w, i) => (
        <div
          key={i}
          className="h-3 rounded-full shimmer-bg"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

export function NextStepCard() {
  return (
    <div
      className="rounded-2xl p-5 mt-4 flex items-center justify-between animate-fade-up"
      style={{
        background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
        border: "1.5px solid #FED7AA",
      }}
    >
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-0.5"
           style={{ color: "#F97316" }}>
          Next Step
        </p>
        <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>
          Build Your Vision Board
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#78716C" }}>
          Map your 7 life areas in 10 years
        </p>
      </div>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: "#F97316" }}
      >
        <ArrowRight size={15} className="text-white" />
      </div>
    </div>
  );
}
