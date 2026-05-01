"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Image as ImageIcon } from "lucide-react";
import type { AreaData } from "./PolaroidCard";

// Converts any Google Drive share URL to a directly embeddable CDN URL.
// Works for publicly shared files ("Anyone with the link") — no OAuth needed.
function toDriveImgUrl(raw: string): string {
  if (!raw || (!raw.includes("drive.google.com") && !raw.includes("docs.google.com"))) return raw;
  let id: string | null = null;
  const fileMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) id = fileMatch[1];
  if (!id) {
    const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) id = idMatch[1];
  }
  return id ? `https://lh3.googleusercontent.com/d/${id}` : raw;
}

interface AreaEditSheetProps {
  area: AreaData | null;
  onClose: () => void;
  onSave: (updated: AreaData) => void;
}

export default function AreaEditSheet({
  area,
  onClose,
  onSave,
}: AreaEditSheetProps) {
  const [text, setText] = useState("");
  const [score, setScore] = useState(5);
  const [imageUrl, setImageUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (area) {
      setText(area.text);
      setScore(area.score);
      setImageUrl(area.imageUrl);
    }
  }, [area]);

  if (!area) return null;

  const aiPrompt = `A high-fidelity, cinematic visualization of ${area.name} representing: ${text || "a life of purpose and achievement"}. Minimalist, inspiring, 8k resolution, photorealistic, warm golden light. 4:3 aspect ratio --ar 4:3`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resolvedImageUrl = toDriveImgUrl(imageUrl);

  const handleSave = () => {
    onSave({ ...area, text, score, imageUrl: resolvedImageUrl });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(28,25,23,0.25)",
          backdropFilter: "blur(2px)",
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div
        className="animate-fade-up"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "400px",
          backgroundColor: "#FFFFFF",
          borderLeft: "1px solid #E8DDD0",
          boxShadow: "-8px 0 40px rgba(28,25,23,0.1)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #F2EAE0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
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
                marginBottom: "2px",
              }}
            >
              Life Area
            </p>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917" }}>
              {area.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "#F5F0EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
            }}
          >
            <X size={14} color="#78716C" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          {/* 10-year vision text */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#1C1917",
                display: "block",
                marginBottom: "6px",
              }}
            >
              10-Year Visualization
            </label>
            <p
              style={{
                fontSize: "11px",
                color: "#57534E",
                marginBottom: "8px",
                fontStyle: "italic",
              }}
            >
              Write in present tense — as if it&apos;s already happened.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`I am living my ideal ${area.name.toLowerCase()} life...`}
              rows={5}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1.5px solid #E8DDD0",
                fontSize: "13px",
                lineHeight: 1.65,
                color: "#1C1917",
                backgroundColor: "#FDFAF7",
                outline: "none",
                resize: "none",
                caretColor: "#F97316",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Current Score Slider */}
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label
                style={{ fontSize: "11px", fontWeight: 600, color: "#1C1917" }}
              >
                Current Reality Score
              </label>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#1C1917",
                  lineHeight: 1,
                }}
              >
                {score}
                <span style={{ fontSize: "12px", color: "#57534E" }}>/10</span>
              </span>
            </div>
            <p
              style={{
                fontSize: "11px",
                color: "#57534E",
                marginBottom: "10px",
                fontStyle: "italic",
              }}
            >
              The vision text is the &ldquo;10.&rdquo; Where are you now?
            </p>
            <input
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#F97316",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "4px",
              }}
            >
              <span style={{ fontSize: "10px", color: "#57534E" }}>1</span>
              <span style={{ fontSize: "10px", color: "#57534E" }}>10</span>
            </div>
          </div>

          {/* AI Image Prompt */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#1C1917",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Vision Image
            </label>

            {/* Generated prompt */}
            <div
              style={{
                backgroundColor: "#FFF7ED",
                border: "1px solid #FED7AA",
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "10px",
              }}
            >
              <p
                style={{
                  fontSize: "10px",
                  color: "#44403C",
                  lineHeight: 1.5,
                  marginBottom: "8px",
                }}
              >
                {aiPrompt}
              </p>
              <button
                onClick={handleCopyPrompt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#9A3412",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                {copied ? (
                  <Check size={11} />
                ) : (
                  <Copy size={11} />
                )}
                {copied ? "Copied!" : "Copy AI Prompt"}
              </button>
            </div>

            {/* Image URL input */}
            <p style={{ fontSize: "10px", color: "#57534E", marginBottom: "6px", fontStyle: "italic" }}>
              Upload to Google Drive → right-click → Share → &ldquo;Anyone with the link&rdquo; → copy link and paste below.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1.5px solid #E8DDD0",
                backgroundColor: "#FDFAF7",
              }}
            >
              <ImageIcon size={13} color="#A8A29E" />
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste Google Drive or direct image URL…"
                style={{
                  flex: 1,
                  fontSize: "12px",
                  color: "#1C1917",
                  outline: "none",
                  border: "none",
                  backgroundColor: "transparent",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {resolvedImageUrl && (
              <div
                style={{
                  marginTop: "10px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  height: "140px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedImageUrl}
                  alt="preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #F2EAE0",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleSave}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
            }}
          >
            Save Vision
          </button>
        </div>
      </div>
    </>
  );
}
