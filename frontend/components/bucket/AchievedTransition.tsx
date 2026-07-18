"use client";

import { useState, useEffect, useRef } from "react";
import { X, Camera, Check } from "lucide-react";
import type { BucketEntry } from "@/lib/bucketTypes";
import { LIFE_AREA_COLORS } from "@/lib/dayTypes";
import { uploadMedia } from "@/lib/api";
import { VisionImg } from "@/lib/visionImage";

interface Props {
  entry:    BucketEntry | null;
  onSave:   (reflection: { memoryPhotoUrl: string; changeReflection: string }) => void;
  onCancel: () => void;
}

const ACCEPT    = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 15 * 1024 * 1024;

export default function AchievedTransition({ entry, onSave, onCancel }: Props) {
  const [isFlipped,      setIsFlipped]      = useState(false);
  const [memoryPhotoUrl, setMemoryPhotoUrl] = useState("");
  const [changeText,     setChangeText]     = useState("");
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState("");
  const [stagedFile,     setStagedFile]     = useState<File | null>(null);
  const [stagedPreview,  setStagedPreview]  = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearStaged() {
    setStagedFile(null);
    setStagedPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
  }

  useEffect(() => {
    if (entry) {
      setIsFlipped(false);
      setMemoryPhotoUrl("");
      setChangeText("");
      setUploading(false);
      setUploadError("");
      clearStaged();
    }
  }, [entry]);

  if (!entry) return null;

  const areaColor = LIFE_AREA_COLORS[entry.lifeArea];

  // Stage locally; upload to R2 only on save so an abandoned form leaves no orphan.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) { setUploadError("Choose a PNG, JPEG, or WebP image."); return; }
    if (file.size > MAX_BYTES) { setUploadError("Image is larger than 15 MB."); return; }
    setUploadError("");
    if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    setStagedFile(file);
    setStagedPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    let finalPhoto = memoryPhotoUrl.trim();
    if (stagedFile) {
      setUploading(true); setUploadError("");
      try {
        finalPhoto = (await uploadMedia(stagedFile, "dreams")).id;
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    onSave({ memoryPhotoUrl: finalPhoto, changeReflection: changeText.trim() });
    clearStaged();
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
              {entry.imageUrl ? (
                <VisionImg pointer={entry.imageUrl} scope="dreams" variant="full" alt=""
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
                Memory Photo
                <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0,
                  marginLeft: 5, color: "#A8A29E", fontSize: "9px" }}>
                  optional · encrypted
                </span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {(stagedFile || memoryPhotoUrl) ? (
                <div style={{ marginTop: 4, borderRadius: 8, overflow: "hidden", border: "1px solid #E8DDD0" }}>
                  <div style={{ height: 80 }}>
                    {stagedFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stagedPreview} alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <VisionImg pointer={memoryPhotoUrl} scope="dreams" variant="thumb" alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, borderTop: "1px solid #EDE5D8" }}>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={smallBtn}>Replace</button>
                    <button type="button" disabled={uploading} onClick={() => { clearStaged(); setMemoryPhotoUrl(""); }}
                      style={{ ...smallBtn, color: "#DC2626", borderColor: "#FCA5A5" }}>Remove</button>
                    {stagedFile && (
                      <span style={{ marginLeft: "auto", fontSize: 9, color: "#A8A29E", fontWeight: 600 }}>
                        {uploading ? "Uploading…" : "Uploads on save"}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "100%", padding: "14px 12px", borderRadius: 8,
                    border: "1.5px dashed #D6CEC5", backgroundColor: "#FAFAF9",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    color: "#78716C", fontSize: 11, fontWeight: 600,
                  }}>
                  <Camera size={13} color="#A8A29E" />
                  Upload a photo from the moment
                </button>
              )}

              {uploadError && (
                <p style={{ fontSize: "10px", color: "#EF4444", margin: "6px 2px 0" }}>{uploadError}</p>
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

const smallBtn: React.CSSProperties = {
  flex: 1, padding: "5px 10px", borderRadius: 7,
  border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: 11, fontWeight: 700, color: "#57534E", cursor: "pointer",
};
