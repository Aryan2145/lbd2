"use client";

import { useState, useEffect } from "react";
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
    question: "A community leader is going through names for an important project. Yours comes up. They pause for a moment, thinking about you. What do you want going through their mind?",
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
  const [savedCards, setSavedCards] = useState<Record<string, boolean>>(
    Object.fromEntries(ROLES.map((r) => [r.id, false]))
  );
  const [savingCard, setSavingCard] = useState<string | null>(null);

  const persist = (patch: { roleTexts?: Record<string, string>; purposeText?: string; isSealed?: boolean }) => {
    api.put("/legacy", patch).catch(() => {});
  };

  const handleSaveCard = (id: string) => {
    setSavingCard(id);
    api.put("/legacy", { roleTexts }).then(() => {
      setSavedCards((prev) => ({ ...prev, [id]: true }));
      setSavingCard(null);
    }).catch(() => setSavingCard(null));
  };

  const handleReopenCard = (id: string) => {
    setSavedCards((prev) => ({ ...prev, [id]: false }));
  };

  useEffect(() => {
    api.get<{ roleTexts: Record<string,string>; purposeText: string; isSealed: boolean }>("/legacy")
      .then(data => {
        if (data.roleTexts && Object.keys(data.roleTexts).length > 0) {
          setRoleTexts(prev => ({ ...prev, ...data.roleTexts }));
          const wc = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
          setSavedCards(prev => Object.fromEntries(
            ROLES.map((r) => [r.id, prev[r.id] || wc(data.roleTexts[r.id] ?? "") >= 10])
          ));
        }
        if (data.purposeText) {
          setPurposeText(data.purposeText);
          setSynthesisState(data.isSealed ? "sealed" : "ready");
        }
      }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isRoleComplete = (id: string) => wordCount(roleTexts[id]) >= 10;
  const completedCount = ROLES.filter((r) => isRoleComplete(r.id)).length;
  const allComplete = completedCount === ROLES.length;

  const handleRoleChange = (id: string, value: string) => {
    setRoleTexts((prev) => ({ ...prev, [id]: value }));
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
    <div className="min-h-full" style={{ backgroundColor: "#FAF5EE" }}>

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
        className="px-page"
        style={{
          paddingTop: "22px",
          paddingBottom: "18px",
          borderBottom: "1px solid #EDE5D8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#F97316",
              marginBottom: "4px",
            }}
          >
            Identity
          </p>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#1C1917",
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Your Legacy
          </h1>
        </div>

        {/* Progress counter + ring */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>

          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "11px", color: "#57534E", marginBottom: "2px" }}>
              Roles complete
            </p>
            <p
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: allComplete ? "#F97316" : "#1C1917",
                lineHeight: 1,
                transition: "color 0.3s",
              }}
            >
              {completedCount}
              <span style={{ fontSize: "14px", fontWeight: 400, color: "#57534E" }}>
                /6
              </span>
            </p>
          </div>
          <div style={{ position: "relative", width: "44px", height: "44px" }}>
            <svg viewBox="0 0 48 48" style={{ width: "44px", height: "44px", transform: "rotate(-90deg)" }}>
              <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3.5" stroke="#EDE5D8" />
              <circle
                cx="24" cy="24" r="20" fill="none" strokeWidth="3.5" stroke="#F97316"
                strokeLinecap="round"
                strokeDasharray={`${(progressPct / 100) * 125.6} 125.6`}
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Full-width quote banner */}
      <div
        className="px-6 sm:px-12"
        style={{
          paddingTop: "32px",
          paddingBottom: "32px",
          borderBottom: "1px solid #EDE5D8",
          backgroundColor: "#FDFAF7",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "18px",
            color: "#44403C",
            lineHeight: 1.75,
            margin: 0,
            fontWeight: 400,
          }}
        >
          Years from now, you are gone. What do you want the people who knew you to say in their most honest moments?{" "}
          <span style={{ color: "#1C1917", fontWeight: 700 }}>
            The pattern in their answers becomes your purpose.
          </span>
        </p>
      </div>

      {/* Main content: 3×2 grid + Your North Star column */}
      <div className="flex flex-col xl:flex-row gap-6 px-4 sm:px-6 lg:px-8 py-6 pb-8 items-start">

        {/* Left: 3×2 role cards grid */}
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {ROLES.map((role, i) => (
              <RoleCard
                key={role.id}
                index={i + 1}
                role={role}
                value={roleTexts[role.id]}
                onChange={(v) => handleRoleChange(role.id, v)}
                isComplete={isRoleComplete(role.id)}
                isSaved={savedCards[role.id]}
                isSaving={savingCard === role.id}
                onSave={() => handleSaveCard(role.id)}
                onReopen={() => handleReopenCard(role.id)}
              />
            ))}
          </div>

          {/* Synthesize button */}
          <div style={{ paddingTop: "16px" }}>
            <SynthesizeButton
              allComplete={allComplete}
              remaining={ROLES.length - completedCount}
              state={synthesisState}
              onClick={handleSynthesize}
            />
          </div>
        </div>

        {/* Right: Your North Star (4th column) */}
        <div className="w-full xl:w-80 xl:flex-shrink-0 xl:sticky xl:top-6">
          <p
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#F97316",
              marginBottom: "12px",
            }}
          >
            Your North Star
          </p>
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
        <p className="text-xs mt-0.5" style={{ color: "#57534E" }}>
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
