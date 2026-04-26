"use client";

import { useState } from "react";
import { Plus, Pencil, ArrowRight, Star, Target, Crown, Calendar, ExternalLink } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import BucketEntrySheet   from "@/components/bucket/BucketEntrySheet";
import AchievedTransition from "@/components/bucket/AchievedTransition";
import type { BucketEntry, BucketStatus } from "@/lib/bucketTypes";
import { COLUMN_META, LIFE_AREA_EMOJI } from "@/lib/bucketTypes";
import { LIFE_AREA_COLORS } from "@/lib/dayTypes";

const COLUMN_ICON: Record<BucketStatus, React.ReactNode> = {
  dreaming: <Star   size={14} />,
  planning: <Target size={14} />,
  achieved: <Crown  size={14} />,
};

function processImageUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
}

function fmtAchievedDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function BucketListPage() {
  const { bucketEntries, addBucketEntry, updateBucketEntry, deleteBucketEntry } = useAppStore();

  const [sheetOpen,       setSheetOpen]       = useState(false);
  const [editEntry,       setEditEntry]        = useState<BucketEntry | null>(null);
  const [sheetStatus,     setSheetStatus]      = useState<BucketStatus>("dreaming");
  const [achievingEntry,  setAchievingEntry]   = useState<BucketEntry | null>(null);
  const [expandedId,      setExpandedId]       = useState<string | null>(null);

  const dreaming = bucketEntries.filter((e) => e.status === "dreaming");
  const planning = bucketEntries.filter((e) => e.status === "planning");
  const achieved = bucketEntries.filter((e) => e.status === "achieved");
  const columns: [BucketStatus, BucketEntry[]][] = [
    ["dreaming", dreaming],
    ["planning", planning],
    ["achieved", achieved],
  ];

  function openCreate(status: BucketStatus) {
    setEditEntry(null);
    setSheetStatus(status);
    setSheetOpen(true);
  }

  function openEdit(entry: BucketEntry) {
    setEditEntry(entry);
    setSheetStatus(entry.status);
    setSheetOpen(true);
  }

  function handleSave(entry: BucketEntry) {
    if (editEntry) { updateBucketEntry(entry); } else { addBucketEntry(entry); }
  }

  function handleMoveNext(entry: BucketEntry) {
    if (entry.status === "dreaming") {
      updateBucketEntry({ ...entry, status: "planning" });
    } else if (entry.status === "planning") {
      setAchievingEntry(entry);
    }
  }

  function handleMovePrev(entry: BucketEntry) {
    if (entry.status === "planning") {
      updateBucketEntry({ ...entry, status: "dreaming" });
    }
  }

  function handleAchievedSave(reflection: { memoryPhotoUrl: string; changeReflection: string }) {
    if (!achievingEntry) return;
    updateBucketEntry({
      ...achievingEntry,
      status:           "achieved",
      achievedAt:       Date.now(),
      memoryPhotoUrl:   reflection.memoryPhotoUrl,
      changeReflection: reflection.changeReflection,
    });
    setAchievingEntry(null);
  }

  return (
    <div style={{
      height: "100%", backgroundColor: "#FAF5EE",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        padding: "16px 28px 12px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, backgroundColor: "#FAF5EE",
      }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "2px" }}>
            Module 04 · Bucket List
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            Life Experiences Board
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Summary chips */}
          <span style={summaryChip("#6366F1")}>
            <Star size={10} /> {dreaming.length} Dreaming
          </span>
          <span style={summaryChip("#F97316")}>
            <Target size={10} /> {planning.length} Planning
          </span>
          <span style={summaryChip("#10B981")}>
            <Crown size={10} /> {achieved.length} Achieved
          </span>
          <button onClick={() => openCreate("dreaming")} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 18px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "12px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
          }}>
            <Plus size={14} /> New Dream
          </button>
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>
        {columns.map(([status, entries]) => {
          const meta = COLUMN_META[status];
          return (
            <div key={status} style={{
              flex: 1, display: "flex", flexDirection: "column",
              borderRight: status !== "achieved" ? "1px solid #EDE5D8" : "none",
              overflow: "hidden",
            }}>
              {/* Column header */}
              <div style={{
                padding: "14px 16px 12px",
                borderBottom: `3px solid ${meta.accent}`,
                backgroundColor: meta.bg,
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <span style={{ color: meta.accent }}>{COLUMN_ICON[status]}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>
                      {meta.label}
                    </span>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, color: meta.accent,
                      backgroundColor: meta.accent + "18", border: `1px solid ${meta.border}`,
                      padding: "1px 7px", borderRadius: "6px",
                    }}>
                      {entries.length}
                    </span>
                  </div>
                  {status !== "achieved" && (
                    <button onClick={() => openCreate(status)} style={{
                      width: 26, height: 26, borderRadius: 7,
                      border: `1.5px solid ${meta.border}`,
                      backgroundColor: "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: meta.accent,
                    }}>
                      <Plus size={13} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: "10px", color: "#78716C", margin: "4px 0 0" }}>
                  {meta.subtitle}
                </p>
              </div>

              {/* Column entries */}
              <div style={{
                flex: 1, overflowY: "auto",
                padding: "12px", display: "flex", flexDirection: "column", gap: "10px",
                backgroundColor: status === "achieved" ? "#F9FAFB" : "#FFFFFF",
              }}>
                {entries.length === 0 && (
                  <div style={{
                    padding: "28px 16px", textAlign: "center",
                    border: `1.5px dashed ${meta.border}`,
                    borderRadius: "12px", marginTop: "4px",
                  }}>
                    <span style={{ fontSize: "24px", display: "block", marginBottom: "6px" }}>
                      {status === "dreaming" ? "💭" : status === "planning" ? "🗺️" : "🏆"}
                    </span>
                    <p style={{ fontSize: "11px", color: "#A8A29E", lineHeight: 1.5, margin: 0 }}>
                      {status === "dreaming" && "Add your first dream — no pressure, no date required."}
                      {status === "planning" && "Move a dream here when you're ready to plan it."}
                      {status === "achieved" && "Your legacy archive will appear here."}
                    </p>
                    {status !== "achieved" && (
                      <button onClick={() => openCreate(status)} style={{
                        marginTop: "10px", padding: "5px 14px", borderRadius: "7px",
                        border: `1.5px solid ${meta.border}`, backgroundColor: "transparent",
                        fontSize: "11px", fontWeight: 600, color: meta.accent, cursor: "pointer",
                      }}>
                        + Add
                      </button>
                    )}
                  </div>
                )}

                {entries.map((entry) => (
                  <BucketCard
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggleExpand={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    onEdit={() => openEdit(entry)}
                    onMoveNext={() => handleMoveNext(entry)}
                    onMovePrev={() => handleMovePrev(entry)}
                    onDelete={() => deleteBucketEntry(entry.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <BucketEntrySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onDelete={deleteBucketEntry}
        editEntry={editEntry}
        initialStatus={sheetStatus}
      />

      <AchievedTransition
        entry={achievingEntry}
        onSave={handleAchievedSave}
        onCancel={() => setAchievingEntry(null)}
      />
    </div>
  );
}

// ── Inline Card Component ─────────────────────────────────────────────────────

interface CardProps {
  entry:          BucketEntry;
  expanded:       boolean;
  onToggleExpand: () => void;
  onEdit:         () => void;
  onMoveNext?:    () => void;
  onMovePrev?:    () => void;
  onDelete:       () => void;
}

function BucketCard({ entry, expanded, onToggleExpand, onEdit, onMoveNext, onMovePrev }: CardProps) {
  const [imgError, setImgError] = useState(false);
  const meta       = COLUMN_META[entry.status];
  const areaColor  = LIFE_AREA_COLORS[entry.lifeArea];
  const emoji      = LIFE_AREA_EMOJI[entry.lifeArea];
  const imgSrc     = entry.status === "achieved" && entry.memoryPhotoUrl
    ? processImageUrl(entry.memoryPhotoUrl)
    : entry.imageUrl ? processImageUrl(entry.imageUrl) : "";

  const hasImage = !!imgSrc && !imgError;

  const moveLabel = entry.status === "dreaming"
    ? "Plan It →"
    : entry.status === "planning"
    ? "Mark Achieved ★"
    : null;

  return (
    <div style={{
      borderRadius: "14px", overflow: "hidden",
      border: `1.5px solid ${meta.border}`,
      backgroundColor: "#FFFFFF",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    }}>
      {/* Image area */}
      <div style={{
        height: 130, position: "relative", overflow: "hidden",
        background: hasImage
          ? "transparent"
          : `linear-gradient(135deg, ${areaColor}22 0%, ${areaColor}08 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {hasImage ? (
          <img
            src={imgSrc}
            alt=""
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "44px" }}>{emoji}</span>
        )}
        {/* Status badge for achieved */}
        {entry.status === "achieved" && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            padding: "3px 9px", borderRadius: "7px",
            backgroundColor: "#10B981", border: "1px solid #059669",
            fontSize: "9px", fontWeight: 800, color: "#FFFFFF",
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            ✓ Achieved
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
          background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.8))",
          pointerEvents: "none",
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: "11px 13px 10px" }}>
        {/* Life area */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: areaColor }} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: areaColor,
            textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {entry.lifeArea}
          </span>
          {entry.targetDate && (
            <>
              <span style={{ fontSize: "9px", color: "#C4B5A8" }}>·</span>
              <Calendar size={9} color="#A8A29E" />
              <span style={{ fontSize: "9px", color: "#A8A29E", fontWeight: 500 }}>
                {entry.targetDate}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: "13px", fontWeight: 700, color: "#1C1917",
          lineHeight: 1.3, margin: "0 0 5px",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}>
          {entry.title}
        </h3>

        {/* Description / reflection preview */}
        {entry.status === "achieved" && entry.changeReflection ? (
          <div
            onClick={onToggleExpand}
            style={{
              fontSize: "11px", color: "#57534E", lineHeight: 1.5,
              cursor: "pointer",
              display: expanded ? "block" : "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: expanded ? "visible" : "hidden",
            }}
          >
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#10B981",
              textTransform: "uppercase", letterSpacing: "0.05em", display: "block",
              marginBottom: 2 }}>
              How it changed me
            </span>
            {entry.changeReflection}
          </div>
        ) : entry.description && (
          <div
            onClick={onToggleExpand}
            style={{
              fontSize: "11px", color: "#78716C", lineHeight: 1.45, cursor: "pointer",
              display: expanded ? "block" : "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: expanded ? "visible" : "hidden",
            }}
          >
            {entry.description}
          </div>
        )}

        {/* Achieved date */}
        {entry.status === "achieved" && entry.achievedAt && (
          <p style={{ fontSize: "10px", color: "#10B981", fontWeight: 600, margin: "5px 0 0" }}>
            Achieved {fmtAchievedDate(entry.achievedAt)}
          </p>
        )}
      </div>

      {/* Footer actions */}
      <div style={{
        padding: "7px 13px 10px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid #F5F0EB",
      }}>
        <div style={{ display: "flex", gap: "5px" }}>
          <button onClick={onEdit} style={actionBtn}>
            <Pencil size={11} color="#78716C" />
          </button>
          {entry.status === "planning" && (
            <button onClick={onMovePrev} title="Move back to Dreaming" style={actionBtn}>
              <ArrowRight size={11} color="#78716C" style={{ transform: "scaleX(-1)" }} />
            </button>
          )}
          {entry.imageUrl && (
            <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer" style={actionBtn}>
              <ExternalLink size={11} color="#78716C" />
            </a>
          )}
        </div>

        {moveLabel && (
          <button
            onClick={onMoveNext}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", borderRadius: "7px",
              border: `1.5px solid ${entry.status === "planning" ? "#10B981" : meta.accent}`,
              backgroundColor: entry.status === "planning" ? "#F0FDF4" : meta.bg,
              fontSize: "10px", fontWeight: 700,
              color: entry.status === "planning" ? "#10B981" : meta.accent,
              cursor: "pointer",
            }}
          >
            {moveLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function summaryChip(color: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "4px 10px", borderRadius: "7px",
    border: `1px solid ${color}30`, backgroundColor: color + "10",
    fontSize: "10px", fontWeight: 700, color,
  };
}

const actionBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 7,
  border: "1px solid #EDE5D8", backgroundColor: "#FAFAFA",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", textDecoration: "none",
};
