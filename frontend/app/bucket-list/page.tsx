"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Calendar, GripVertical } from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import BucketEntrySheet, { toDriveImgUrl } from "@/components/bucket/BucketEntrySheet";
import AchievedTransition from "@/components/bucket/AchievedTransition";
import type { BucketEntry, BucketStatus } from "@/lib/bucketTypes";
import { COLUMN_META, formatTargetDate } from "@/lib/bucketTypes";
import { LIFE_AREA_LABELS } from "@/lib/dayTypes";
import { AREA_META } from "@/components/habits/HabitCard";

const COLUMN_ORDER: BucketStatus[] = ["dreaming", "planning", "achieved"];

function fmtAchievedDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function BucketListPage() {
  const {
    bucketEntries,
    addBucketEntry, updateBucketEntry, deleteBucketEntry, reorderBucketEntries,
  } = useAppStore();

  const [sheetOpen,      setSheetOpen]      = useState(false);
  const [editEntry,      setEditEntry]      = useState<BucketEntry | null>(null);
  const [sheetStatus,    setSheetStatus]    = useState<BucketStatus>("dreaming");
  const [achievingEntry, setAchievingEntry] = useState<BucketEntry | null>(null);
  const [draggingId,     setDraggingId]     = useState<string | null>(null);
  const [dragoverCol,    setDragoverCol]    = useState<BucketStatus | null>(null);
  const [dropTarget,     setDropTarget]     = useState<{ id: string; position: "above" | "below" } | null>(null);
  const [mobileTab,      setMobileTab]      = useState<BucketStatus>("dreaming");

  // ── Auto-scroll while dragging near a column's top/bottom edge ─────────────
  const scrollSpeedRef     = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const scrollRafRef       = useRef<number | null>(null);

  function autoScrollTick() {
    const c = scrollContainerRef.current;
    const s = scrollSpeedRef.current;
    if (c && s !== 0) {
      c.scrollBy({ top: s });
      scrollRafRef.current = window.requestAnimationFrame(autoScrollTick);
    } else {
      scrollRafRef.current = null;
      scrollContainerRef.current = null;
    }
  }

  function startAutoScroll(container: HTMLElement, speed: number) {
    scrollContainerRef.current = container;
    scrollSpeedRef.current     = speed;
    if (scrollRafRef.current === null) {
      scrollRafRef.current = window.requestAnimationFrame(autoScrollTick);
    }
  }

  function stopAutoScroll() {
    scrollSpeedRef.current = 0;
    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    scrollContainerRef.current = null;
  }

  function handleListDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!draggingId) return;
    const list = e.currentTarget;
    const rect = list.getBoundingClientRect();
    const EDGE = 60, MAX = 14;
    let speed = 0;
    if (e.clientY < rect.top + EDGE) {
      const dist = Math.max(0, e.clientY - rect.top);
      speed = -Math.ceil(MAX * (1 - dist / EDGE));
    } else if (e.clientY > rect.bottom - EDGE) {
      const dist = Math.max(0, rect.bottom - e.clientY);
      speed = Math.ceil(MAX * (1 - dist / EDGE));
    }
    if (speed !== 0) startAutoScroll(list, speed);
    else             stopAutoScroll();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const columns: [BucketStatus, BucketEntry[]][] = COLUMN_ORDER.map((s) => [
    s, bucketEntries.filter((e) => e.status === s),
  ]);

  const countOf = (s: BucketStatus) => bucketEntries.filter((e) => e.status === s).length;

  function openCreate(status: BucketStatus) {
    setEditEntry(null); setSheetStatus(status); setSheetOpen(true);
  }
  function openEdit(entry: BucketEntry) {
    setEditEntry(entry); setSheetStatus(entry.status); setSheetOpen(true);
  }
  function handleSave(entry: BucketEntry) {
    if (editEntry) updateBucketEntry(entry); else addBucketEntry(entry);
  }

  function handleDrop(targetStatus: BucketStatus) {
    stopAutoScroll();
    if (!draggingId) return;
    const entry = bucketEntries.find((e) => e.id === draggingId);
    setDraggingId(null); setDragoverCol(null); setDropTarget(null);
    if (!entry || entry.status === targetStatus) return;
    if (targetStatus === "achieved") {
      setAchievingEntry(entry);
    } else {
      updateBucketEntry({ ...entry, status: targetStatus });
    }
  }

  function handleCardDrop(targetId: string) {
    stopAutoScroll();
    const dt = dropTarget;
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null); setDragoverCol(null); setDropTarget(null);
      return;
    }
    const dragged = bucketEntries.find((e) => e.id === draggingId);
    const target  = bucketEntries.find((e) => e.id === targetId);
    if (!dragged || !target) {
      setDraggingId(null); setDragoverCol(null); setDropTarget(null);
      return;
    }
    // Cross-column to "achieved" — defer to the achievement flow (no reorder).
    if (dragged.status !== target.status && target.status === "achieved") {
      setAchievingEntry(dragged);
      setDraggingId(null); setDragoverCol(null); setDropTarget(null);
      return;
    }
    // Cross-column (dreaming ↔ planning): change status before reordering.
    if (dragged.status !== target.status) {
      updateBucketEntry({ ...dragged, status: target.status });
    }
    // Reorder the global list.
    const ids     = bucketEntries.map((e) => e.id);
    const without = ids.filter((id) => id !== draggingId);
    const tIdx    = without.indexOf(targetId);
    const insertAt = (dt?.position === "below") ? tIdx + 1 : tIdx;
    const newIds  = [...without.slice(0, insertAt), draggingId, ...without.slice(insertAt)];
    reorderBucketEntries(newIds);

    setDraggingId(null); setDragoverCol(null); setDropTarget(null);
  }

  function handleAchievedSave(reflection: { memoryPhotoUrl: string; changeReflection: string }) {
    if (!achievingEntry) return;
    updateBucketEntry({
      ...achievingEntry, status: "achieved", achievedAt: Date.now(),
      memoryPhotoUrl:   reflection.memoryPhotoUrl,
      changeReflection: reflection.changeReflection,
    });
    setAchievingEntry(null);
  }

  return (
    <div style={{ height: "100%", backgroundColor: "#FAF5EE",
      display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: "100vw" }}>

      {/* Header */}
      <div className="px-page" style={{
        paddingTop: "18px", paddingBottom: "14px", borderBottom: "1px solid #EDE5D8",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        backgroundColor: "#FFFFFF", gap: "12px",
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#F97316", marginBottom: "3px" }}>
            Bucket List
          </p>
          <h1 style={{ fontSize: "19px", fontWeight: 700, color: "#1C1917", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Life Experiences Board
          </h1>
          <p className="hidden sm:block" style={{ fontSize: "12px", color: "#1C1917", marginTop: "3px" }}>
            Dreams, intentions, and legacy moments — drag to progress.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <div className="hidden sm:flex" style={{ alignItems: "center", gap: "24px" }}>
            <Stat label="Dreaming" value={`${countOf("dreaming")}`} color={COLUMN_META.dreaming.accent} />
            <Stat label="Planning" value={`${countOf("planning")}`} color={COLUMN_META.planning.accent} />
            <Stat label="Achieved" value={`${countOf("achieved")}`} color={COLUMN_META.achieved.accent} />
          </div>
          <button onClick={() => openCreate("dreaming")} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 16px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            fontSize: "13px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)", whiteSpace: "nowrap",
          }}>
            <Plus size={14} /> New Dream
          </button>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden" style={{
        borderBottom: "1px solid #EDE5D8",
        backgroundColor: "#FAF5EE", flexShrink: 0,
      }}>
        {COLUMN_ORDER.map((status) => {
          const meta   = COLUMN_META[status];
          const active = mobileTab === status;
          return (
            <button key={status} onClick={() => setMobileTab(status)} style={{
              flex: 1, minWidth: 0, padding: "10px 4px", border: "none", cursor: "pointer",
              backgroundColor: "transparent",
              borderBottom: `2.5px solid ${active ? meta.accent : "transparent"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
              transition: "border-color 0.15s", overflow: "hidden",
            }}>
              <span style={{ fontSize: "12px", fontWeight: 700,
                color: active ? meta.accent : "#78716C" }}>
                {meta.label}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 700,
                color: active ? meta.accent : "#A8A29E",
                backgroundColor: active ? meta.accent + "18" : "transparent",
                padding: "0 7px", borderRadius: "20px",
                border: `1px solid ${active ? meta.accent + "30" : "transparent"}`,
              }}>
                {countOf(status)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop: original 3-column kanban — untouched */}
      <div className="hidden lg:flex flex-col sm:flex-row" style={{ flex: 1, overflow: "auto" }}>
        {columns.map(([status, entries]) => {
          const meta   = COLUMN_META[status];
          const isOver = dragoverCol === status;
          return (
            <div
              key={status}
              style={{
                flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
                backgroundColor: isOver ? meta.bg : meta.colBg,
                borderRight: status !== "achieved" ? "1px solid #E2D9CE" : "none",
                transition: "background-color 0.15s",
              }}
              onDragOver={(e)  => { e.preventDefault(); setDragoverCol(status); }}
              onDragLeave={(e) => {
                if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                  setDragoverCol(null);
                }
              }}
              onDrop={(e) => { e.preventDefault(); handleDrop(status); }}
            >
              {/* Column header */}
              <div style={{
                padding: "14px 16px 11px",
                borderBottom: `2px solid ${isOver ? meta.accent : meta.border}`,
                flexShrink: 0, transition: "border-color 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%",
                      backgroundColor: meta.accent, flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>
                      {meta.label}
                    </span>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, color: meta.accent,
                      backgroundColor: meta.accent + "18",
                      padding: "1px 8px", borderRadius: "20px",
                      border: `1px solid ${meta.accent}30`,
                    }}>
                      {entries.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreate(status === "achieved" ? "dreaming" : status)}
                    title={status === "achieved" ? "Add new dream" : `Add to ${meta.label}`}
                    style={{
                      width: 26, height: 26, borderRadius: 7,
                      border: "none",
                      backgroundColor: meta.accent,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}>
                    <Plus size={13} color="#FFFFFF" />
                  </button>
                </div>
                <p style={{ fontSize: "10px", color: "#78716C", margin: "4px 0 0", paddingLeft: "16px" }}>
                  {meta.subtitle}
                </p>
              </div>

              {/* Card list */}
              <div
                onDragOver={handleListDragOver}
                style={{
                  flex: 1, overflowY: "auto", padding: "12px",
                  display: "flex", flexDirection: "column", gap: "10px",
                }}
              >
                {entries.length === 0 ? (
                  <div style={{
                    padding: "32px 16px", textAlign: "center",
                    border: `1.5px dashed ${isOver ? meta.accent : meta.border}`,
                    borderRadius: "12px", marginTop: "4px",
                    backgroundColor: isOver ? meta.bg : "rgba(255,255,255,0.5)",
                    transition: "all 0.15s",
                  }}>
                    <p style={{ fontSize: "11px", color: "#78716C", lineHeight: 1.55, margin: "0 0 10px" }}>
                      {status === "dreaming" && "Add your first dream — no date required."}
                      {status === "planning" && "Drag a dream here when you're ready to plan it."}
                      {status === "achieved" && "Your legacy archive will appear here."}
                    </p>
                    <button onClick={() => openCreate(status === "achieved" ? "dreaming" : status)} style={{
                      padding: "5px 14px", borderRadius: "7px",
                      border: `1.5px solid ${meta.accent}40`,
                      backgroundColor: "rgba(255,255,255,0.7)",
                      fontSize: "11px", fontWeight: 600, color: meta.accent, cursor: "pointer",
                    }}>
                      + Add
                    </button>
                  </div>
                ) : entries.map((entry) => {
                  const isDropTarget = dropTarget?.id === entry.id;
                  return (
                    <div
                      key={entry.id}
                      style={{ position: "relative", flexShrink: 0 }}
                      onDragOver={(e) => {
                        if (!draggingId || draggingId === entry.id) return;
                        e.preventDefault();
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const position = e.clientY < rect.top + rect.height / 2 ? "above" : "below";
                        if (dropTarget?.id !== entry.id || dropTarget.position !== position) {
                          setDropTarget({ id: entry.id, position });
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        handleCardDrop(entry.id);
                      }}
                    >
                      {isDropTarget && dropTarget!.position === "above" && (
                        <div style={{ position: "absolute", top: -6, left: 0, right: 0,
                          height: 3, backgroundColor: meta.accent, borderRadius: 2, zIndex: 10,
                          pointerEvents: "none" }} />
                      )}
                      <BucketCard
                        entry={entry}
                        isDragging={draggingId === entry.id}
                        onEdit={() => openEdit(entry)}
                        onDragStart={() => setDraggingId(entry.id)}
                        onDragEnd={() => { stopAutoScroll(); setDraggingId(null); setDragoverCol(null); setDropTarget(null); }}
                        onMoveForward={() => {
                          if (entry.status === "dreaming") updateBucketEntry({ ...entry, status: "planning" });
                          else setAchievingEntry(entry);
                        }}
                      />
                      {isDropTarget && dropTarget!.position === "below" && (
                        <div style={{ position: "absolute", bottom: -6, left: 0, right: 0,
                          height: 3, backgroundColor: meta.accent, borderRadius: 2, zIndex: 10,
                          pointerEvents: "none" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: single active column */}
      {(() => {
        const status  = mobileTab;
        const meta    = COLUMN_META[status];
        const entries = columns.find(([s]) => s === status)?.[1] ?? [];
        return (
          <div className="flex flex-col lg:hidden" style={{
            flex: 1, minHeight: 0,
            backgroundColor: meta.colBg,
          }}>
            {/* sub-header */}
            <div style={{
              padding: "10px 16px 8px", flexShrink: 0,
              borderBottom: `1px solid ${meta.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "8px",
            }}>
              <p style={{ fontSize: "11px", color: "#78716C", margin: 0,
                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {meta.subtitle}
              </p>
              <button
                onClick={() => openCreate(status === "achieved" ? "dreaming" : status)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "5px 12px", borderRadius: "8px", flexShrink: 0,
                  border: "none", backgroundColor: meta.accent,
                  fontSize: "11px", fontWeight: 700, color: "#FFFFFF", cursor: "pointer",
                  whiteSpace: "nowrap",
                }}>
                <Plus size={11} color="#FFFFFF" />
                {status === "achieved" ? "New Dream" : `Add to ${meta.label}`}
              </button>
            </div>
            {/* scrollable cards */}
            <div
              onDragOver={handleListDragOver}
              style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px",
                display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {entries.length === 0 ? (
                <div style={{
                  padding: "40px 20px", textAlign: "center",
                  border: `1.5px dashed ${meta.border}`,
                  borderRadius: "14px", marginTop: "8px",
                  backgroundColor: "rgba(255,255,255,0.5)",
                }}>
                  <p style={{ fontSize: "12px", color: "#A8A29E", lineHeight: 1.6, margin: "0 0 12px" }}>
                    {status === "dreaming" && "Add your first dream — no date required."}
                    {status === "planning" && "Move a dream here when you're ready to plan it."}
                    {status === "achieved" && "Your legacy archive will appear here."}
                  </p>
                  <button onClick={() => openCreate(status === "achieved" ? "dreaming" : status)} style={{
                    padding: "6px 18px", borderRadius: "8px",
                    border: `1.5px solid ${meta.accent}40`,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    fontSize: "12px", fontWeight: 600, color: meta.accent, cursor: "pointer",
                  }}>+ Add</button>
                </div>
              ) : entries.map((entry) => {
                const isDropTarget = dropTarget?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    style={{ position: "relative", flexShrink: 0 }}
                    onDragOver={(e) => {
                      if (!draggingId || draggingId === entry.id) return;
                      e.preventDefault();
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const position = e.clientY < rect.top + rect.height / 2 ? "above" : "below";
                      if (dropTarget?.id !== entry.id || dropTarget.position !== position) {
                        setDropTarget({ id: entry.id, position });
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      handleCardDrop(entry.id);
                    }}
                  >
                    {isDropTarget && dropTarget!.position === "above" && (
                      <div style={{ position: "absolute", top: -7, left: 0, right: 0,
                        height: 3, backgroundColor: meta.accent, borderRadius: 2, zIndex: 10,
                        pointerEvents: "none" }} />
                    )}
                    <BucketCard
                      entry={entry}
                      isDragging={draggingId === entry.id}
                      onEdit={() => openEdit(entry)}
                      onDragStart={() => setDraggingId(entry.id)}
                      onDragEnd={() => { stopAutoScroll(); setDraggingId(null); setDragoverCol(null); setDropTarget(null); }}
                      onMoveForward={() => {
                        if (entry.status === "dreaming") updateBucketEntry({ ...entry, status: "planning" });
                        else setAchievingEntry(entry);
                      }}
                    />
                    {isDropTarget && dropTarget!.position === "below" && (
                      <div style={{ position: "absolute", bottom: -7, left: 0, right: 0,
                        height: 3, backgroundColor: meta.accent, borderRadius: 2, zIndex: 10,
                        pointerEvents: "none" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  entry:         BucketEntry;
  isDragging:    boolean;
  onEdit:        () => void;
  onDragStart:   () => void;
  onDragEnd:     () => void;
  onMoveForward: () => void;
}

function BucketCard({ entry, isDragging, onEdit, onDragStart, onDragEnd, onMoveForward }: CardProps) {
  const meta     = COLUMN_META[entry.status];
  const areaMeta = AREA_META[entry.lifeArea] ?? AREA_META.personal;

  return (
    <div
      draggable
      onClick={onEdit}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
      style={{
        backgroundColor: areaMeta.bg,
        borderRadius: "12px",
        border: `1px solid ${areaMeta.color}35`,
        borderLeft: `3px solid ${areaMeta.color}`,
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? "none" : "0 1px 4px rgba(28,25,23,0.06)",
        transition: "box-shadow 0.2s, opacity 0.15s",
        userSelect: "none",
        overflow: "hidden",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!isDragging)
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${areaMeta.color}25`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          isDragging ? "none" : "0 1px 4px rgba(28,25,23,0.06)";
      }}
    >
      {/* Image banner */}
      {entry.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={toDriveImgUrl(entry.imageUrl)} alt="" referrerPolicy="no-referrer"
          style={{ width: "100%", aspectRatio: "3 / 1", objectFit: "cover", display: "block" }} />
      )}

      {/* Card content */}
      <div style={{ padding: "12px 14px" }}>

        {/* Area badge + date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
          <span style={{
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: areaMeta.color,
            backgroundColor: areaMeta.bg, border: `1px solid ${areaMeta.color}`,
            padding: "2px 7px", borderRadius: "20px",
          }}>
            {LIFE_AREA_LABELS[entry.lifeArea]}
          </span>
          {entry.targetDate && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px",
              fontSize: "9px", color: "#78716C", fontWeight: 500 }}>
              <Calendar size={9} color="#78716C" />
              {formatTargetDate(entry.targetDate)}
            </span>
          )}
        </div>

        {/* Title */}
        <p style={{
          fontSize: "13px", fontWeight: 700, color: "#1C1917",
          lineHeight: 1.35, margin: "0 0 5px",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const, overflow: "hidden",
        }}>
          {entry.title}
        </p>

        {/* Description / reflection */}
        {(entry.status === "achieved" && entry.changeReflection
          ? entry.changeReflection
          : entry.description) && (
          <p style={{
            fontSize: "11px", color: "#57534E", lineHeight: 1.5,
            margin: "0 0 6px",
            display: "-webkit-box", WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical" as const, overflow: "hidden",
          }}>
            {entry.status === "achieved" && entry.changeReflection
              ? entry.changeReflection
              : entry.description}
          </p>
        )}

        {/* Achieved stamp */}
        {entry.status === "achieved" && entry.achievedAt && (
          <p style={{ fontSize: "10px", color: COLUMN_META.achieved.accent, fontWeight: 700, margin: "0 0 6px" }}>
            Achieved {fmtAchievedDate(entry.achievedAt)}
          </p>
        )}

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "8px", borderTop: `1px solid ${areaMeta.color}20`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {entry.status !== "achieved" && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveForward(); }}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", borderRadius: "7px",
                  border: `1.5px solid ${meta.accent}35`,
                  backgroundColor: meta.bg,
                  fontSize: "10px", fontWeight: 700, color: meta.accent, cursor: "pointer",
                }}
              >
                {entry.status === "dreaming" ? "Plan It" : "Mark Achieved"}
              </button>
            )}
            <GripVertical size={13} color={`${areaMeta.color}50`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "12px", fontWeight: 500, color: "#1C1917", marginBottom: "2px" }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 7,
  border: "1px solid #EDE5D8", backgroundColor: "#FAFAFA",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};
