"use client";

import { useState, useEffect } from "react";
import { X, Camera, Check } from "lucide-react";
import type { BucketEntry } from "@/lib/bucketTypes";
import { LIFE_AREA_COLORS } from "@/lib/dayTypes";

interface Props {
  entry:    BucketEntry | null;
  onSave:   (reflection: { memoryPhotoUrl: string; changeReflection: string }) => void;
  onCancel: () => void;
}

function processImageUrl(raw: string): string {
  if (!raw) return raw;
  if (raw.includes("drive.google.com/thumbnail?id=")) return raw;

  let id: string | null = null;
  const fileMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) id = fileMatch[1];
  if (!id) {
    const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) id = idMatch[1];
  }
  if (!id) {
    const lh3Match = raw.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match) id = lh3Match[1];
  }
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1500` : raw;
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
  const imgSrc    = entry.imageUrl ? processImageUrl(entry.imageUrl) : "";
  const memorySrc = memoryPhotoUrl ? processImageUrl(memoryPhotoUrl) : "";

  function handleSave() {
    onSave({ memoryPhotoUrl: memoryPhotoUrl.trim(), changeReflection: changeText.trim() });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      backgroundColor: "rgba(28,25,23,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      {/* Close */}
      <button onClick={onCancel} style={{
        position: "absolute", top: 20, right: 20,
        width: 36, height: 36, borderRadius: 10,
        border: "1px solid #EDE5D8", backgroundColor: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: "0 2px 8px rgba(28,25,23,0.12)",
      }}>
        <X size={16} color="#57534E" />
      </button>

      {/* Flip scene */}
      <div className="bucket-flip-scene" style={{ width: "100%", maxWidth: 480 }}>
        <div className={`bucket-flip-card ${isFlipped ? "is-flipped" : ""}`}>

          {/* ── FRONT: Celebration ── */}
          <div className="bucket-flip-front" style={{
            backgroundColor: "#FFFFFF",
            border: "1.5px solid #EDE5D8",
            borderTop: "4px solid #F97316",
            borderRadius: "16px",
            padding: "32px 28px 28px",
            display: "flex", flexDirection: "column", alignItems: "center",
            boxShadow: "0 8px 40px rgba(249,115,22,0.15)",
          }}>
            {/* Badge */}
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <span style={{
                display: "inline-block", padding: "4px 14px", borderRadius: "20px",
                backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#EA580C", marginBottom: "12px",
              }}>
                Moment of Legacy
              </span>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#1C1917",
                lineHeight: 1.15, margin: 0 }}>
                Dream Achieved.
              </h2>
            </div>

            {/* Entry image or area label */}
            <div style={{
              width: "100%", height: 170, borderRadius: "12px", overflow: "hidden",
              marginBottom: "20px", position: "relative",
              background: `linear-gradient(135deg, ${areaColor}20 0%, #FFF7ED 100%)`,
              border: `1.5px solid ${areaColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {imgSrc ? (
                <img src={imgSrc} alt=""
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%",
                    backgroundColor: areaColor + "20",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 8px" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%",
                      backgroundColor: areaColor }} />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: areaColor }}>
                    {entry.lifeArea}
                  </span>
                </div>
              )}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "11px",
                background: "linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.6) 100%)",
                pointerEvents: "none",
              }} />
            </div>

            {/* Title + area */}
            <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917",
              textAlign: "center", lineHeight: 1.3, margin: "0 0 8px" }}>
              {entry.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
              <span style={{
                fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.06em", color: areaColor,
                backgroundColor: areaColor + "18", padding: "2px 8px", borderRadius: "20px",
              }}>
                {entry.lifeArea}
              </span>
            </div>

            {/* Quote */}
            <div style={{
              padding: "14px 18px", borderRadius: "12px",
              backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
              marginBottom: "24px", width: "100%",
            }}>
              <p style={{ fontSize: "12px", color: "#78716C", lineHeight: 1.65, margin: 0,
                fontStyle: "italic", textAlign: "center" }}>
                &ldquo;Your past self dreamed of this. Your present self made it happen.
                This goes into your legacy — permanent, undeniable, yours.&rdquo;
              </p>
            </div>

            <button
              onClick={() => setIsFlipped(true)}
              style={{
                width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                fontSize: "13px", fontWeight: 700, color: "#FFFFFF",
                cursor: "pointer", letterSpacing: "0.02em",
                boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
              }}
            >
              Capture This Memory →
            </button>
          </div>

          {/* ── BACK: Reflection form ── */}
          <div className="bucket-flip-back" style={{
            backgroundColor: "#FFFFFF",
            border: "1.5px solid #EDE5D8",
            borderTop: "4px solid #F97316",
            borderRadius: "16px",
            padding: "28px",
            display: "flex", flexDirection: "column", gap: "18px",
            boxShadow: "0 8px 40px rgba(249,115,22,0.15)",
          }}>
            <div>
              <span style={{
                display: "inline-block", padding: "3px 12px", borderRadius: "20px",
                backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
                fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#EA580C", marginBottom: "8px",
              }}>
                Legacy Archive
              </span>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#1C1917", margin: 0, lineHeight: 1.25 }}>
                {entry.title}
              </h3>
            </div>

            {/* Memory photo */}
            <div>
              <label style={lbl}>
                <Camera size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Memory Photo URL
                <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0,
                  marginLeft: 5, color: "#A8A29E", fontSize: "9px" }}>
                  optional
                </span>
              </label>
              <input
                value={memoryPhotoUrl}
                onChange={(e) => { setMemoryPhotoUrl(e.target.value); setImgError(false); }}
                placeholder="Paste a photo link from the moment…"
                className="weekly-input"
                style={inp}
              />
              {memoryPhotoUrl && !imgError && (
                <div style={{ marginTop: 8, height: 80, borderRadius: 8, overflow: "hidden",
                  border: "1px solid #E8DDD0" }}>
                  <img src={memorySrc} alt="" onError={() => setImgError(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>

            {/* Reflection */}
            <div>
              <label style={lbl}>How did this change you?</label>
              <textarea
                value={changeText}
                onChange={(e) => setChangeText(e.target.value)}
                placeholder="What shifted inside you, what new doors opened, who you became…"
                rows={5}
                autoFocus
                className="weekly-textarea"
                style={{ ...inp, resize: "none", fontFamily: "inherit", lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onCancel} style={{
                flex: 1, padding: "11px", borderRadius: "10px",
                border: "1px solid #E8DDD0", backgroundColor: "#FAFAFA",
                fontSize: "12px", fontWeight: 600, color: "#78716C", cursor: "pointer",
              }}>
                Cancel
              </button>
              <button onClick={handleSave} style={{
                flex: 2, padding: "11px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              }}>
                <Check size={14} /> Save to Legacy Archive
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700, color: "#44403C",
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: "10px",
  border: "1.5px solid #D6CEC5", backgroundColor: "#FAFAF9",
  fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
};
