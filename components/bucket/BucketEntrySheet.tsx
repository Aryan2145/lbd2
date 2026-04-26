"use client";

import { useState, useEffect } from "react";
import { X, Image, Sparkles, Copy, Check, Trash2 } from "lucide-react";
import type { BucketEntry, BucketStatus } from "@/lib/bucketTypes";
import type { LifeArea } from "@/lib/dayTypes";
import { LIFE_AREAS, LIFE_AREA_COLORS } from "@/lib/dayTypes";

interface Props {
  open:          boolean;
  onClose:       () => void;
  onSave:        (e: BucketEntry) => void;
  onDelete?:     (id: string) => void;
  editEntry?:    BucketEntry | null;
  initialStatus?: BucketStatus;
}

function processImageUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
}

function generatePrompt(title: string, description: string, lifeArea: LifeArea): string {
  return `A stunning, cinematic, aspirational photograph representing the dream: "${title || "a life aspiration"}". ${description ? description + " " : ""}The scene evokes ${lifeArea} at its finest — emotionally resonant, life-affirming, and beautifully composed. Golden hour natural lighting, photorealistic, high resolution, aspirational mood.`;
}

export default function BucketEntrySheet({
  open, onClose, onSave, onDelete, editEntry, initialStatus = "dreaming",
}: Props) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [lifeArea,    setLifeArea]    = useState<LifeArea>("Personal");
  const [imageUrl,    setImageUrl]    = useState("");
  const [targetDate,  setTargetDate]  = useState("");
  const [imgError,    setImgError]    = useState(false);
  const [copied,      setCopied]      = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editEntry) {
      setTitle(editEntry.title);
      setDescription(editEntry.description);
      setLifeArea(editEntry.lifeArea);
      setImageUrl(editEntry.imageUrl);
      setTargetDate(editEntry.targetDate);
    } else {
      setTitle(""); setDescription(""); setLifeArea("Personal");
      setImageUrl(""); setTargetDate("");
    }
    setImgError(false);
    setCopied(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSave = title.trim().length > 0;

  async function handleCopyPrompt() {
    const prompt = generatePrompt(title, description, lifeArea);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select a temp input
    }
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      id:          editEntry?.id ?? `bl_${Date.now()}`,
      title:       title.trim(),
      description: description.trim(),
      lifeArea,
      imageUrl:    imageUrl.trim(),
      targetDate:  targetDate.trim(),
      status:      editEntry?.status ?? initialStatus,
      createdAt:   editEntry?.createdAt ?? Date.now(),
      achievedAt:      editEntry?.achievedAt,
      memoryPhotoUrl:  editEntry?.memoryPhotoUrl,
      changeReflection: editEntry?.changeReflection,
    });
    onClose();
  }

  const processedSrc = imageUrl ? processImageUrl(imageUrl) : "";

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 50,
      }} />

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "620px",
        backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0",
        zIndex: 51, boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", maxHeight: "92vh",
      }}>
        {/* Drag handle */}
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E8DDD0" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 28px 16px", borderBottom: "1px solid #EDE5D8", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            {editEntry ? "Edit Dream" : "New Dream"}
          </h2>
          <button onClick={onClose} style={iconBtn}><X size={14} color="#57534E" /></button>
        </div>

        {/* Scrollable form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>

          {/* Title */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>Dream Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you dream of experiencing or achieving?"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="weekly-input"
              style={inp}
            />
          </div>

          {/* Life Area */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>Life Area</label>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {LIFE_AREAS.map((a) => {
                const selected = lifeArea === a;
                const color = LIFE_AREA_COLORS[a];
                return (
                  <button key={a} onClick={() => setLifeArea(a)} style={{
                    padding: "4px 11px", borderRadius: "7px",
                    border: `1.5px solid ${selected ? color : "#E8DDD0"}`,
                    backgroundColor: selected ? color + "18" : "#FFFFFF",
                    fontSize: "11px", fontWeight: 600,
                    color: selected ? color : "#57534E",
                    cursor: "pointer",
                  }}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where? With whom? What does this experience mean to you? Why does it matter?"
              rows={4}
              className="weekly-textarea"
              style={{ ...inp, resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {/* Vision Image */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>
              <Image size={9} style={{ display: "inline", marginRight: 3 }} />
              Vision Image URL
              <span style={{ fontSize: "9px", fontWeight: 500, color: "#A8A29E",
                textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>
                (Google Drive share link or any image URL)
              </span>
            </label>
            <input
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImgError(false); }}
              placeholder="https://drive.google.com/file/d/…"
              className="weekly-input"
              style={inp}
            />
            {imageUrl && !imgError && (
              <div style={{ marginTop: 8, height: 110, borderRadius: 10, overflow: "hidden",
                border: "1px solid #E8DDD0" }}>
                <img
                  src={processedSrc}
                  alt=""
                  onError={() => setImgError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            {imageUrl && imgError && (
              <p style={{ fontSize: "10px", color: "#EF4444", marginTop: 4 }}>
                Could not load image. Paste a direct image URL or use a public Google Drive share link.
              </p>
            )}
          </div>

          {/* Generate Prompt */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>
              <Sparkles size={9} style={{ display: "inline", marginRight: 3 }} />
              AI Image Prompt
              <span style={{ fontSize: "9px", fontWeight: 500, color: "#A8A29E",
                textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>
                (copy and use in Midjourney, DALL·E, or Ideogram)
              </span>
            </label>
            <div style={{
              padding: "10px 12px", borderRadius: "10px",
              border: "1.5px solid #E8DDD0", backgroundColor: "#FAF9F7",
              fontSize: "11px", color: "#78716C", lineHeight: 1.5,
              marginBottom: "7px",
            }}>
              {generatePrompt(title || "…", description, lifeArea).slice(0, 200)}…
            </div>
            <button onClick={handleCopyPrompt} style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "6px 14px", borderRadius: "8px",
              border: "1.5px solid #E8DDD0",
              backgroundColor: copied ? "#F0FDF4" : "#FFFFFF",
              fontSize: "11px", fontWeight: 600,
              color: copied ? "#16A34A" : "#57534E",
              cursor: "pointer",
            }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Prompt Copied!" : "Copy Full Prompt"}
            </button>
          </div>

          {/* Target Date */}
          <div style={{ marginBottom: "8px" }}>
            <label style={lbl}>Tentative Target</label>
            <input
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              placeholder="e.g. 2027, 2026 Q3, December 2027"
              className="weekly-input"
              style={inp}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 28px 24px", borderTop: "1px solid #EDE5D8", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            {editEntry && onDelete && editEntry.status !== "achieved" && (
              <button onClick={() => { onDelete(editEntry.id); onClose(); }} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "8px 14px", borderRadius: "10px",
                border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2",
                fontSize: "12px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
              }}>
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{
              padding: "8px 20px", borderRadius: "10px",
              border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
              fontSize: "12px", fontWeight: 600, color: "#57534E", cursor: "pointer",
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!canSave} style={{
              padding: "8px 22px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "12px", fontWeight: 700, color: "#FFFFFF",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.45,
            }}>
              {editEntry ? "Save Changes" : "Add Dream"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700, color: "#44403C",
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "10px",
  border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
  fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
};

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "1px solid #EDE5D8",
  backgroundColor: "#FAFAFA", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};
