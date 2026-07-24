"use client";

import { useState, useEffect, useRef } from "react";
import { X, Image, Sparkles, Copy, Check, Trash2 } from "lucide-react";
import type { BucketEntry, BucketStatus } from "@/lib/bucketTypes";
import { COLUMN_META, formatTargetDate } from "@/lib/bucketTypes";
import type { LifeArea } from "@/lib/dayTypes";
import { LIFE_AREAS, LIFE_AREA_COLORS, LIFE_AREA_LABELS } from "@/lib/dayTypes";
import { validateDate } from "@/lib/dateValidation";
import CalendarPicker from "@/components/ui/CalendarPicker";
import { uploadMedia } from "@/lib/api";
import { VisionImg, UPLOAD_ACCEPT, isAllowedImageFile } from "@/lib/visionImage";

// Re-exported for existing importers (e.g. the bucket-list page).
export { toDriveImgUrl } from "@/lib/visionImage";

const MAX_BYTES  = 15 * 1024 * 1024;

interface Props {
  open:           boolean;
  onClose:        () => void;
  onSave:         (e: BucketEntry) => void;
  onDelete?:      (id: string) => void;
  editEntry?:     BucketEntry | null;
  initialStatus?: BucketStatus;
}

function generatePrompt(title: string, description: string, lifeArea: LifeArea): string {
  return `Panoramic banner photograph, 3:1 aspect ratio (extra-wide horizontal letterbox), representing the dream: "${title || "a life aspiration"}". ${description ? description + " " : ""}Evokes ${lifeArea} at its finest — emotionally resonant, life-affirming, beautifully composed for a wide banner crop. Golden hour natural lighting, photorealistic, high resolution, cinematic aspirational mood. Strict 3:1 horizontal banner format, no vertical or square framing. Output dimensions approximately 1500×500.`;
}

export default function BucketEntrySheet({
  open, onClose, onSave, onDelete, editEntry, initialStatus = "dreaming",
}: Props) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [lifeArea,    setLifeArea]    = useState<LifeArea>("personal");
  const [imageUrl,    setImageUrl]    = useState("");
  const [targetDate,  setTargetDate]  = useState("");
  const [status,      setStatus]      = useState<BucketStatus>("dreaming");
  const [imgError,    setImgError]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [stagedFile,    setStagedFile]    = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState("");
  const [copied,      setCopied]      = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke a staged local preview object URL (avoids leaking blobs).
  function clearStaged() {
    setStagedFile(null);
    setStagedPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
  }

  useEffect(() => {
    if (!open) return;
    if (editEntry) {
      setTitle(editEntry.title);
      setDescription(editEntry.description);
      setLifeArea(editEntry.lifeArea);
      setImageUrl(editEntry.imageUrl);
      setTargetDate(editEntry.targetDate);
      setStatus(editEntry.status);
    } else {
      setTitle(""); setDescription(""); setLifeArea("personal");
      setImageUrl(""); setTargetDate("");
      setStatus(initialStatus);
    }
    setImgError(false); setCopied(false); setConfirmDel(false);
    setUploading(false); setUploadError("");
    clearStaged();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const colMeta = COLUMN_META[status];
  const targetDateError = validateDate(targetDate, { required: false });
  const canSave         = title.trim().length > 0 && !targetDateError && !uploading;

  // Stage the file locally only — nothing is uploaded to R2 until the user Saves,
  // so an abandoned sheet never leaves an orphaned object behind.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      setUploadError("Please choose a PNG, JPEG, WebP, or HEIC image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Image is larger than 15 MB. Please pick a smaller file.");
      return;
    }
    setUploadError(""); setImgError(false);
    if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    setStagedFile(file);
    setStagedPreview(URL.createObjectURL(file));
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(generatePrompt(title, description, lifeArea));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!canSave) return;

    // Upload the staged image now (only on commit) and use the returned id.
    let finalImage = imageUrl.trim();
    if (stagedFile) {
      setUploading(true); setUploadError("");
      try {
        finalImage = (await uploadMedia(stagedFile, "dreams")).id;
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
        setUploading(false);
        return; // keep the sheet open; nothing persisted
      }
      setUploading(false);
    }

    onSave({
      id:               editEntry?.id ?? `bl_${Date.now()}`,
      title:            title.trim(),
      description:      description.trim(),
      lifeArea,
      imageUrl:         finalImage,
      targetDate:       targetDate.trim(),
      status,
      createdAt:        editEntry?.createdAt ?? Date.now(),
      achievedAt:       editEntry?.achievedAt,
      memoryPhotoUrl:   editEntry?.memoryPhotoUrl,
      changeReflection: editEntry?.changeReflection,
    });
    clearStaged();
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(28,25,23,0.45)", zIndex: 50,
      }} />

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "680px",
        backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0",
        zIndex: 51, boxShadow: "0 -8px 40px rgba(28,25,23,0.18)",
        display: "flex", flexDirection: "column", maxHeight: "92vh",
      }}>
        {/* Drag handle */}
        <div style={{ padding: "10px 0 6px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 36, height: 3.5, borderRadius: 2, backgroundColor: "#E8DDD0" }} />
        </div>

        {/* Header */}
        <div style={{
          padding: "4px 28px 14px", borderBottom: "1px solid #EDE5D8",
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
              {editEntry ? "Edit Dream" : "New Dream"}
            </h2>
            <span style={{
              fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", color: colMeta.accent,
              backgroundColor: colMeta.accent + "18",
              padding: "2px 9px", borderRadius: "20px",
              border: `1px solid ${colMeta.accent}30`,
            }}>
              {colMeta.label}
            </span>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={14} color="#57534E" /></button>
        </div>

        {/* Scrollable form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>

          {/* Title */}
          <div style={{ marginBottom: "18px" }}>
            <label style={lbl}>Dream Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              placeholder="What do you dream of experiencing or achieving?"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSave(); }}
              className="weekly-input"
              style={inp}
            />
            <p style={{ fontSize: "10px", fontWeight: 600, textAlign: "right", margin: "4px 2px 0",
              color: title.length >= 50 ? "#DC2626" : "#A8A29E" }}>{title.length}/50</p>
          </div>

          {/* Life Area (dropdown) + Tentative Target Date, side by side */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <label style={lbl}>Life Area</label>
              <LifeAreaDropdown value={lifeArea} onChange={setLifeArea} />
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <label style={lbl}>Tentative Target Date <span style={{ fontSize: "10px", fontWeight: 400, color: "#A8A29E" }}>(optional)</span></label>
              <CalendarPicker value={targetDate} onChange={setTargetDate} onClear={() => setTargetDate("")} accentColor="#F97316" />
              {targetDateError && (
                <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginTop: "5px", marginLeft: "2px" }}>
                  {targetDateError}
                </p>
              )}
              {!targetDateError && targetDate && (
                <p style={{ fontSize: "12px", color: "#F97316", fontWeight: 600, marginTop: "5px", marginLeft: "2px" }}>
                  {formatTargetDate(targetDate)}
                </p>
              )}
            </div>
            {editEntry && (
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <label style={lbl}>Status</label>
                <StatusDropdown value={status} onChange={setStatus} />
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: "20px" }}>
            <label style={lbl}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where? With whom? What does this mean to you and why does it matter?"
              rows={3}
              className="weekly-textarea"
              style={{ ...inp, resize: "none", fontFamily: "inherit", lineHeight: 1.55 }}
            />
          </div>

          {/* AI prompt — compact row (above the image, so you can generate then upload) */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "11px 14px", borderRadius: "10px", marginBottom: "18px",
            backgroundColor: "#FFF7ED", border: "1px solid #FED7AA",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <Sparkles size={13} color="#EA580C" />
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#1C1917", margin: 0 }}>
                  AI Dream Image Prompt
                </p>
                <p style={{ fontSize: "10px", color: "#57534E", margin: 0 }}>
                  Copy prompt → use in Midjourney, DALL·E, Ideogram
                </p>
              </div>
            </div>
            <button onClick={handleCopyPrompt} style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "6px 14px", borderRadius: "8px", flexShrink: 0,
              border: "1.5px solid #FDDAB4",
              backgroundColor: copied ? "#FFF7ED" : "#FFFFFF",
              fontSize: "11px", fontWeight: 700,
              color: copied ? "#16A34A" : "#EA580C", cursor: "pointer",
            }}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Dream Image */}
          <div style={{ marginBottom: "16px" }}>
            <label style={lbl}>
              <Image size={9} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Dream Image
              <span style={{ fontSize: "9px", fontWeight: 500, color: "#A8A29E",
                textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>
                PNG, JPEG or WebP · up to 15 MB · stored privately &amp; encrypted
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {(stagedFile || imageUrl) ? (
              <div style={{ marginTop: 4, borderRadius: 10, overflow: "hidden",
                border: "1px solid #E8DDD0", backgroundColor: "#FAFAFA", position: "relative" }}>
                {stagedFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stagedPreview} alt=""
                    style={{ width: "100%", height: "auto", maxHeight: "240px",
                      display: "block", objectFit: "contain" }} />
                ) : (
                  <VisionImg pointer={imageUrl} scope="dreams" variant="full" onError={() => setImgError(true)}
                    style={{ width: "100%", height: "auto", maxHeight: "240px",
                      display: "block", objectFit: "contain" }} />
                )}
                {imgError && !stagedFile && (
                  <div style={{ padding: 12, fontSize: 11, color: "#EF4444" }}>
                    Could not load the image preview.
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderTop: "1px solid #EDE5D8" }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={smallBtn}>
                    Replace
                  </button>
                  <button type="button" disabled={uploading}
                    onClick={() => { clearStaged(); setImageUrl(""); setImgError(false); }}
                    style={{ ...smallBtn, color: "#DC2626", borderColor: "#FCA5A5" }}>
                    Remove
                  </button>
                  {stagedFile && (
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#A8A29E", fontWeight: 600 }}>
                      {uploading ? "Uploading…" : "Uploads on save"}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%", padding: "22px 12px", borderRadius: 10,
                  border: "1.5px dashed #D6CEC5", backgroundColor: "#FAFAF9",
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  color: "#78716C", fontSize: 12, fontWeight: 600,
                }}
              >
                <Image size={18} color="#A8A29E" />
                Click to upload your dream image
              </button>
            )}

            {uploadError && (
              <p style={{ fontSize: "10px", color: "#EF4444", margin: "6px 2px 0" }}>{uploadError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 28px 24px", borderTop: "1px solid #EDE5D8", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            {editEntry && onDelete && editEntry.status !== "achieved" && (
              confirmDel ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600 }}>Delete?</span>
                  <button onClick={() => { onDelete(editEntry.id); onClose(); }} style={{
                    padding: "6px 12px", borderRadius: "8px",
                    border: "none", backgroundColor: "#DC2626",
                    fontSize: "11px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
                  }}>Yes, Delete</button>
                  <button onClick={() => setConfirmDel(false)} style={{
                    padding: "6px 12px", borderRadius: "8px",
                    border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
                    fontSize: "11px", fontWeight: 600, color: "#57534E", cursor: "pointer",
                  }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "8px 14px", borderRadius: "10px",
                  border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2",
                  fontSize: "12px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
                }}>
                  <Trash2 size={12} /> Delete
                </button>
              )
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{
              padding: "9px 20px", borderRadius: "10px",
              border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
              fontSize: "13px", fontWeight: 600, color: "#57534E", cursor: "pointer",
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!canSave} style={{
              padding: "9px 24px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "13px", fontWeight: 700, color: "#FFFFFF",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.45,
              boxShadow: canSave ? "0 2px 8px rgba(249,115,22,0.3)" : "none",
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
  width: "100%", padding: "9px 13px", borderRadius: "10px",
  border: "1.5px solid #D6CEC5", backgroundColor: "#FAFAF9",
  fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
};

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "1px solid #EDE5D8",
  backgroundColor: "#FAFAFA", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};

const smallBtn: React.CSSProperties = {
  flex: 1, padding: "6px 10px", borderRadius: 8,
  border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
  fontSize: 11, fontWeight: 700, color: "#57534E", cursor: "pointer",
};

function LifeAreaDropdown({ value, onChange }: { value: LifeArea; onChange: (a: LifeArea) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const color = LIFE_AREA_COLORS[value];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "10px",
          padding: "9px 12px", borderRadius: "10px",
          border: `1.5px solid ${color}55`, backgroundColor: "#FFFFFF",
          cursor: "pointer", outline: "none", boxSizing: "border-box",
          boxShadow: open ? `0 0 0 3px ${color}20` : "none", fontFamily: "inherit",
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: "50%", flexShrink: 0, backgroundColor: color, boxShadow: `0 0 0 3px ${color}22` }} />
        <span style={{ flex: 1, textAlign: "left", fontSize: "13px", fontWeight: 700, color }}>
          {LIFE_AREA_LABELS[value]}
        </span>
        <span style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none", display: "inline-flex" }}>
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>

      {open && (
        <div role="listbox" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
          backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E8DDD0",
          boxShadow: "0 12px 32px rgba(28,25,23,0.14)", padding: "6px",
          maxHeight: 280, overflowY: "auto",
        }}>
          {LIFE_AREAS.map(a => {
            const c = LIFE_AREA_COLORS[a];
            const selected = value === a;
            return (
              <button
                key={a}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(a); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "11px",
                  padding: "9px 10px", borderRadius: "8px", border: "none",
                  backgroundColor: selected ? c + "15" : "transparent",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = "#FAFAF9"; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c, flexShrink: 0, boxShadow: selected ? `0 0 0 3px ${c}22` : "none" }} />
                <span style={{ flex: 1, fontSize: "13px", fontWeight: selected ? 700 : 600, color: selected ? c : "#44403C" }}>{LIFE_AREA_LABELS[a]}</span>
                {selected && <Check size={14} color={c} strokeWidth={3} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusDropdown({ value, onChange }: { value: BucketStatus; onChange: (s: BucketStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = COLUMN_META[value];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "9px 30px 9px 12px", borderRadius: "10px",
          border: `1.5px solid ${meta.accent}`, backgroundColor: "#FFFFFF",
          fontSize: "12px", fontWeight: 700, color: "#1C1917",
          cursor: "pointer", outline: "none", textAlign: "left",
          display: "flex", alignItems: "center", gap: "8px", fontFamily: "inherit",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: meta.accent, flexShrink: 0 }} />
        {meta.label}
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
          <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#78716C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          backgroundColor: "#FFFFFF", borderRadius: "10px",
          border: "1.5px solid #E8DDD0", boxShadow: "0 8px 24px rgba(28,25,23,0.12)",
          zIndex: 100, overflow: "hidden",
        }}>
          {(["dreaming", "planning", "achieved"] as BucketStatus[]).map(s => {
            const m = COLUMN_META[s];
            const selected = value === s;
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                style={{
                  width: "100%", padding: "9px 12px", border: "none",
                  backgroundColor: selected ? m.bg : "#FFFFFF",
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "12px", fontWeight: selected ? 700 : 500,
                  color: "#1C1917", cursor: "pointer", textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: m.accent, flexShrink: 0 }} />
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
