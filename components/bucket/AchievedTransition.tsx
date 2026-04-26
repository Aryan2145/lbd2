"use client";

import { useState, useEffect } from "react";
import { X, Camera } from "lucide-react";
import type { BucketEntry } from "@/lib/bucketTypes";
import { LIFE_AREA_EMOJI } from "@/lib/bucketTypes";
import { LIFE_AREA_COLORS } from "@/lib/dayTypes";

interface Props {
  entry:    BucketEntry | null;
  onSave:   (reflection: { memoryPhotoUrl: string; changeReflection: string }) => void;
  onCancel: () => void;
}

function processImageUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
}

export default function AchievedTransition({ entry, onSave, onCancel }: Props) {
  const [isFlipped,      setIsFlipped]      = useState(false);
  const [memoryPhotoUrl, setMemoryPhotoUrl] = useState("");
  const [changeText,     setChangeText]     = useState("");
  const [imgError,       setImgError]       = useState(false);

  useEffect(() => {
    if (entry) {
      setIsFlipped(false);
      setMemoryPhotoUrl("");
      setChangeText("");
      setImgError(false);
    }
  }, [entry]);

  if (!entry) return null;

  const areaColor = LIFE_AREA_COLORS[entry.lifeArea];
  const emoji     = LIFE_AREA_EMOJI[entry.lifeArea];
  const imgSrc    = entry.imageUrl ? processImageUrl(entry.imageUrl) : "";
  const memorySrc = memoryPhotoUrl ? processImageUrl(memoryPhotoUrl) : "";

  function handleFlip() { setIsFlipped(true); }
  function handleSave() { onSave({ memoryPhotoUrl: memoryPhotoUrl.trim(), changeReflection: changeText.trim() }); }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      backgroundColor: "rgba(10,8,6,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      {/* Close */}
      <button onClick={onCancel} style={{
        position: "absolute", top: 20, right: 20,
        width: 36, height: 36, borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.15)",
        backgroundColor: "rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}>
        <X size={16} color="#E8DDD0" />
      </button>

      {/* Flip scene */}
      <div className="bucket-flip-scene" style={{ width: "100%", maxWidth: 480 }}>
        <div className={`bucket-flip-card ${isFlipped ? "is-flipped" : ""}`}>

          {/* ── FRONT: Celebration ── */}
          <div className="bucket-flip-front" style={{
            background: "linear-gradient(160deg, #1C1917 0%, #0F0E0C 100%)",
            border: "1px solid rgba(249,115,22,0.25)",
            padding: "32px 28px 28px",
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            {/* Sparkle header */}
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em",
                textTransform: "uppercase", color: "#F97316", marginBottom: "6px" }}>
                ✦ Moment of Legacy ✦
              </p>
              <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#FAF5EE",
                lineHeight: 1.2, margin: 0 }}>
                Dream Achieved.
              </h2>
            </div>

            {/* Entry image or emoji */}
            <div style={{
              width: "100%", height: 180, borderRadius: "14px", overflow: "hidden",
              marginBottom: "20px", position: "relative",
              background: `linear-gradient(135deg, ${areaColor}30, ${areaColor}08)`,
              border: `1.5px solid ${areaColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {imgSrc ? (
                <img src={imgSrc} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "64px" }}>{emoji}</span>
              )}
              {/* Overlay glow */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "14px",
                background: "linear-gradient(to bottom, transparent 50%, rgba(10,8,6,0.4) 100%)",
                pointerEvents: "none",
              }} />
            </div>

            {/* Entry title */}
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FAF5EE",
              textAlign: "center", lineHeight: 1.3, margin: "0 0 8px" }}>
              {entry.title}
            </h3>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: areaColor }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: areaColor }}>
                {entry.lifeArea}
              </span>
            </div>

            {/* Legacy quote */}
            <div style={{
              padding: "14px 18px", borderRadius: "12px",
              backgroundColor: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.18)",
              marginBottom: "28px", textAlign: "center",
            }}>
              <p style={{ fontSize: "12px", color: "#D6D0C9", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                &ldquo;Your past self dreamed of this. Your present self made it happen.
                This goes into your legacy — permanent, undeniable, yours.&rdquo;
              </p>
            </div>

            <button
              onClick={handleFlip}
              className="legacy-glow"
              style={{
                width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                fontSize: "13px", fontWeight: 700, color: "#FFFFFF",
                cursor: "pointer", letterSpacing: "0.03em",
              }}
            >
              Capture This Memory →
            </button>
          </div>

          {/* ── BACK: Reflection form ── */}
          <div className="bucket-flip-back" style={{
            background: "linear-gradient(160deg, #1C1917 0%, #0F0E0C 100%)",
            border: "1px solid rgba(249,115,22,0.25)",
            padding: "28px",
            display: "flex", flexDirection: "column", gap: "18px",
          }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#F97316", marginBottom: "4px" }}>
                Legacy Archive
              </p>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FAF5EE", margin: 0, lineHeight: 1.2 }}>
                {entry.title}
              </h3>
            </div>

            {/* Memory photo */}
            <div>
              <label style={{ ...lbl, color: "#A8A29E" }}>
                <Camera size={10} style={{ display: "inline", marginRight: 4 }} />
                Memory Photo URL
                <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0,
                  marginLeft: 5, color: "#78716C" }}>
                  (optional — Google Drive or direct link)
                </span>
              </label>
              <input
                value={memoryPhotoUrl}
                onChange={(e) => { setMemoryPhotoUrl(e.target.value); setImgError(false); }}
                placeholder="Paste a photo link from the moment…"
                className="weekly-input"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: "10px",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  fontSize: "12px", color: "#FAF5EE", outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {memoryPhotoUrl && !imgError && (
                <div style={{ marginTop: 8, height: 90, borderRadius: 8, overflow: "hidden" }}>
                  <img src={memorySrc} alt="" onError={() => setImgError(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>

            {/* Change reflection */}
            <div>
              <label style={{ ...lbl, color: "#A8A29E" }}>
                How did this change you?
              </label>
              <textarea
                value={changeText}
                onChange={(e) => setChangeText(e.target.value)}
                placeholder="Write freely — what shifted inside you, what new doors opened, who you became..."
                rows={5}
                autoFocus
                className="weekly-textarea"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "10px",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  fontSize: "12px", color: "#FAF5EE", outline: "none",
                  boxSizing: "border-box", resize: "none", fontFamily: "inherit",
                  lineHeight: 1.6,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onCancel} style={{
                flex: 1, padding: "11px", borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.05)",
                fontSize: "12px", fontWeight: 600, color: "#A8A29E",
                cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={handleSave} style={{
                flex: 2, padding: "11px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #10B981, #059669)",
                fontSize: "12px", fontWeight: 700, color: "#FFFFFF",
                cursor: "pointer",
              }}>
                ✓ Save to Legacy Archive
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px",
};
