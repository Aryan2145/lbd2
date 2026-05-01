"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import RoleCard from "@/components/legacy/RoleCard";
import PurposeBox, {
  type SynthesisState,
  NextStepCard,
} from "@/components/legacy/PurposeBox";

const ROLES = [
  {
    id: "spouse",
    title: "Partner",
    question: "Your partner is sitting alone in a coffee shop, thinking about you. What do you want to be true in their mind in that moment?",
  },
  {
    id: "child",
    title: "Children",
    question: "Your child is now a parent themselves, putting their own child to sleep and thinking about you. What do you want them to be feeling about you?",
  },
  {
    id: "parent",
    title: "Parents",
    question: "Your mother or father is sitting in their favourite chair at home, quietly looking at an old photo of you. What do you want to be going through their mind?",
  },
  {
    id: "colleague",
    title: "Colleagues",
    question: "Someone who worked with you for years is in a job interview. They are asked — who is the one person who shaped how you work? What do you want them to say about you?",
  },
  {
    id: "friend",
    title: "Friends",
    question: "Your friend group is having a get-together. You are the only one missing. Your name comes up. What do you want them to be saying about you?",
  },
  {
    id: "social",
    title: "Community",
    question: "A community leader is reviewing the list of people who could work on an important event. Your name shows up. The leader stops for a while, thinking about you. What do you want to be going through their mind?",
  },
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function LegacyPage() {
  const [roleTexts, setRoleTexts] = useState<Record<string, string>>(
    Object.fromEntries(ROLES.map((r) => [r.id, ""]))
  );
  const [synthesisState, setSynthesisState] = useState<SynthesisState>("idle");
  const [purposeText, setPurposeText] = useState("");
  const [prevState, setPrevState] = useState<SynthesisState>("idle");
  const [showAchievement, setShowAchievement] = useState(false);
  const [dismissedAchievement, setDismissedAchievement] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = (patch: { roleTexts?: Record<string, string>; purposeText?: string; isSealed?: boolean }) => {
    api.put("/legacy", patch).then(() => {
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 1500);
    }).catch(() => {});
  };

  const persistDebounced = (roleTexts: Record<string, string>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => persist({ roleTexts }), 1500);
  };

  // Load saved data on mount
  useEffect(() => {
    api.get<{ roleTexts: Record<string,string>; purposeText: string; isSealed: boolean }>("/legacy")
      .then(data => {
        if (data.roleTexts && Object.keys(data.roleTexts).length > 0)
          setRoleTexts(prev => ({ ...prev, ...data.roleTexts }));
        if (data.purposeText) {
          setPurposeText(data.purposeText);
          setSynthesisState(data.isSealed ? "sealed" : "ready");
        }
      }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isRoleComplete = (id: string) => wordCount(roleTexts[id]) >= 10;
  const completedCount = ROLES.filter((r) => isRoleComplete(r.id)).length;
  const allComplete = completedCount === ROLES.length;
  const canSynthesize =
    allComplete &&
    (synthesisState === "idle" || synthesisState === "streaming");

  const handleRoleChange = (id: string, value: string) => {
    setRoleTexts((prev) => {
      const next = { ...prev, [id]: value };
      persistDebounced(next);
      return next;
    });
  };

  const handleSynthesize = async () => {
    if (!allComplete) return;
    setSynthesisState("processing");
    setPurposeText("");

    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: roleTexts }),
      });

      if (!res.ok || !res.body) {
        setSynthesisState("idle");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      setSynthesisState("streaming");
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setPurposeText(fullText);
      }

      setSynthesisState("ready");
      persist({ roleTexts, purposeText: fullText, isSealed: false });
    } catch {
      setSynthesisState("idle");
    }
  };

  const handleSeal = () => {
    setSynthesisState("sealed");
    persist({ roleTexts, purposeText, isSealed: true });
    if (!dismissedAchievement) {
      setShowAchievement(true);
      setTimeout(() => setShowAchievement(false), 6000);
    }
  };

  const handleEdit = () => {
    setPrevState(synthesisState);
    setSynthesisState("editing");
  };

  const handleSaveEdit = (text: string) => {
    setPurposeText(text);
    setSynthesisState("ready");
    persist({ roleTexts, purposeText: text, isSealed: false });
  };

  const handleCancelEdit = () => {
    setSynthesisState(prevState === "sealed" ? "sealed" : "ready");
  };

  const progressPct = (completedCount / ROLES.length) * 100;

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#FAF5EE" }}
    >
      {/* Achievement Toast */}
      {showAchievement && (
        <AchievementToast
          onClose={() => {
            setShowAchievement(false);
            setDismissedAchievement(true);
          }}
        />
      )}

      {/* Page Header */}
      <div
        className="px-8 pt-7 pb-6 flex items-start justify-between"
        style={{ borderBottom: "1px solid #EDE5D8" }}
      >
        <div>
          <p
            className="text-[10px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: "#F97316" }}
          >
            Identity
          </p>
          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: "#1C1917", letterSpacing: "-0.02em" }}
          >
            Your Legacy
          </h1>
          <p
            className="text-sm mt-2 max-w-lg leading-relaxed"
            style={{ color: "#44403C" }}
          >
            Years from now, you are gone. What do you want the people who knew
            you to say in their most honest moments? The pattern in their
            answers becomes your purpose.
          </p>
          {savedIndicator && (
            <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 6 }}>Saved ✓</p>
          )}
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-[11px]" style={{ color: "#78716C" }}>
              Roles complete
            </p>
            <p
              className="text-2xl font-semibold leading-none mt-0.5 transition-colors duration-300"
              style={{
                color: allComplete ? "#F97316" : "#1C1917",
              }}
            >
              {completedCount}
              <span
                className="text-sm font-normal ml-0.5"
                style={{ color: "#A8A29E" }}
              >
                /6
              </span>
            </p>
          </div>

          <div className="relative w-12 h-12">
            <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                strokeWidth="3.5"
                stroke="#EDE5D8"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                strokeWidth="3.5"
                stroke="#F97316"
                strokeLinecap="round"
                strokeDasharray={`${(progressPct / 100) * 125.6} 125.6`}
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 px-8 py-6 items-start">
        {/* Left: Role cards */}
        <div className="flex-1 min-w-0 space-y-3">
          {ROLES.map((role, i) => (
            <RoleCard
              key={role.id}
              index={i + 1}
              role={role}
              value={roleTexts[role.id]}
              onChange={(v) => handleRoleChange(role.id, v)}
              isComplete={isRoleComplete(role.id)}
            />
          ))}

          {/* Synthesize button */}
          <div className="pt-1 pb-2">
            <SynthesizeButton
              allComplete={allComplete}
              remaining={ROLES.length - completedCount}
              state={synthesisState}
              onClick={handleSynthesize}
            />
          </div>
        </div>

        {/* Right: Purpose box (sticky) */}
        <div className="w-[360px] flex-shrink-0 sticky top-6 space-y-0">
          <PurposeBox
            state={synthesisState}
            text={purposeText}
            onSeal={handleSeal}
            onEdit={handleEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
          />
          {synthesisState === "sealed" && <NextStepCard />}
        </div>
      </div>
    </div>
  );
}

function SynthesizeButton({
  allComplete,
  remaining,
  state,
  onClick,
}: {
  allComplete: boolean;
  remaining: number;
  state: SynthesisState;
  onClick: () => void;
}) {
  const isProcessing = state === "processing" || state === "streaming";
  const isDone =
    state === "ready" || state === "editing" || state === "sealed";

  const label = isProcessing
    ? "Magic Thinking..."
    : isDone
    ? "Re-synthesize Purpose"
    : allComplete
    ? "Synthesize My Purpose"
    : `${remaining} role${remaining !== 1 ? "s" : ""} remaining`;

  return (
    <button
      onClick={!allComplete || isProcessing ? undefined : onClick}
      disabled={!allComplete || isProcessing}
      className="w-full py-3.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300"
      style={{
        background: allComplete
          ? "linear-gradient(135deg, #F97316 0%, #EA580C 100%)"
          : "#F2EAE0",
        color: allComplete ? "#FFFFFF" : "#A8A29E",
        cursor: allComplete && !isProcessing ? "pointer" : "not-allowed",
        boxShadow: allComplete
          ? "0 4px 20px rgba(249,115,22,0.3)"
          : "none",
        animation:
          allComplete && !isProcessing && !isDone
            ? "orangeGlow 2.5s ease-in-out infinite"
            : "none",
      }}
    >
      {isProcessing ? (
        <SpinnerIcon />
      ) : (
        <Sparkles size={15} />
      )}
      {label}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AchievementToast({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed top-5 right-5 z-50 flex items-center gap-3.5 px-5 py-4 rounded-2xl animate-fade-up"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E8DDD0",
        boxShadow: "0 8px 40px rgba(249,115,22,0.12), 0 2px 8px rgba(28,25,23,0.06)",
        maxWidth: "320px",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #F97316, #EA580C)",
        }}
      >
        <CheckCircle size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>
          Identity Defined
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#78716C" }}>
          Your North Star is sealed. This is your first major milestone.
        </p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded-lg transition-colors"
        style={{ color: "#A8A29E" }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
