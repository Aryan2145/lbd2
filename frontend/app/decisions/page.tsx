"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, X, CheckCircle2, Circle, Trash2, AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/AppStore";
import CalendarPicker from "@/components/ui/CalendarPicker";
import { todayDateStr } from "@/lib/dateValidation";
import type { DecisionEntry, EveningReflection } from "@/lib/dayTypes";

// ── Palette (mirrors the Daily → Reflection "night" world this page is opened from) ──
const P = {
  pageBg:    "#E8E6F5",
  headerBg:  "#E8E6F5",
  border:    "#D0CBEC",
  cardBg:    "#FFFFFF",
  cardBorder:"#EADFD3",
  accent:    "#6C5DD3",   // action / primary
  decisions: "#85B7EB",   // Decision Log accent, same as the daily card
  text:      "#1F2933",
  secondary: "#374151",
  muted:     "#6B7280",
  label:     "#4A4575",
  danger:    "#DC2626",
} as const;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(dateStr: string): { day: string; full: string } {
  const d = new Date(dateStr + "T00:00:00");
  return {
    day:  DAY_NAMES[d.getDay()],
    full: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  };
}

/** Stable shape used to detect whether a date's list actually differs from what's stored. */
function serialize(list: DecisionEntry[]): string {
  return JSON.stringify(list.map((d) => [d.id, d.text, d.made]));
}

function newEntry(text: string): DecisionEntry {
  return { id: crypto.randomUUID(), text, made: false, createdAt: Date.now() };
}

/** One row in the add/edit popup. `existing` rows came from the chosen day and
 *  keep their identity so editing them updates rather than duplicates. */
interface AddLine {
  id:        string;
  text:      string;
  made:      boolean;
  createdAt: number;
  existing:  boolean;
}

function blankLine(): AddLine {
  return { id: crypto.randomUUID(), text: "", made: false, createdAt: Date.now(), existing: false };
}

/** Ignores empty rows and whitespace so "no real change" doesn't read as dirty. */
function linesKey(list: { id: string; text: string; made: boolean }[]): string {
  return JSON.stringify(
    list.filter((l) => l.text.trim().length > 0).map((l) => [l.id, l.text.trim(), l.made]),
  );
}

export default function DecisionsPage() {
  const router = useRouter();
  const { eveningReflections, upsertEveningReflection } = useAppStore();

  // Dates the user has touched but not yet saved. Absent key = untouched (use stored value).
  const [draft,    setDraft]    = useState<Record<string, DecisionEntry[]>>({});
  const [focusId,  setFocusId]  = useState<string | null>(null);
  const [mounted,  setMounted]  = useState(false);

  // Add-batch popup
  const [addOpen,  setAddOpen]  = useState(false);
  const [addDate,  setAddDate]  = useState(todayDateStr());
  const [addLines, setAddLines] = useState<AddLine[]>([]);

  // Confirm dialogs
  const [leaveWarn, setLeaveWarn] = useState(false);
  const [closeWarn, setCloseWarn] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => setMounted(true), []);

  // ── Stored state, keyed by date ──
  const baseline = useMemo(() => {
    const map: Record<string, DecisionEntry[]> = {};
    for (const r of eveningReflections) {
      const list = r.decisions ?? [];
      if (list.length > 0) map[r.date] = list;
    }
    return map;
  }, [eveningReflections]);

  const effective = (date: string): DecisionEntry[] => draft[date] ?? baseline[date] ?? [];

  // Only dates that have data (or that the user is actively editing) get a group.
  const dates = useMemo(() => {
    const set = new Set([...Object.keys(baseline), ...Object.keys(draft)]);
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [baseline, draft]);

  const dirtyDates = useMemo(
    () => Object.keys(draft).filter((d) => serialize(draft[d]) !== serialize(baseline[d] ?? [])),
    [draft, baseline],
  );
  const isDirty = dirtyDates.length > 0;

  const totals = useMemo(() => {
    let open = 0, decided = 0;
    for (const d of dates) for (const e of effective(d)) {
      if (!e.text.trim()) continue;
      e.made ? decided++ : open++;
    }
    return { open, decided };
  }, [dates, draft, baseline]);

  // Focus a newly-added inline row once it has rendered.
  useEffect(() => {
    if (focusId && inputRefs.current[focusId]) {
      inputRefs.current[focusId]!.focus();
      setFocusId(null);
    }
  }, [focusId, draft]);

  // Browser-level guard (tab close / refresh) — the in-app dialog covers Back.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Draft mutations ──────────────────────────────────────────────────────────
  function setDate(date: string, list: DecisionEntry[]) {
    setDraft((prev) => ({ ...prev, [date]: list }));
  }
  function addInline(date: string) {
    const entry = newEntry("");
    setDate(date, [...effective(date), entry]);
    setFocusId(entry.id);
  }
  function editText(date: string, id: string, text: string) {
    setDate(date, effective(date).map((d) => (d.id === id ? { ...d, text } : d)));
  }
  function toggleMade(date: string, id: string) {
    setDate(date, effective(date).map((d) => (d.id === id ? { ...d, made: !d.made } : d)));
  }
  function removeEntry(date: string, id: string) {
    setDate(date, effective(date).filter((d) => d.id !== id));
  }

  // ── Persist ──────────────────────────────────────────────────────────────────
  /** Writes one date's decisions, creating a blank reflection row if that day has none. */
  function persist(date: string, decisions: DecisionEntry[]) {
    const existing = eveningReflections.find((r) => r.date === date);
    const next: EveningReflection = existing
      ? { ...existing, decisions }
      : {
          date, energyLevel: 5, mood: "",
          highlights: "", gratitude: "",
          decisions, wins: [], stuck: [],
        };
    // skipActivity: back-dating a decision must not earn today's daily-review point.
    upsertEveningReflection(next, { skipActivity: true });
  }

  function saveAll() {
    for (const date of dirtyDates) {
      persist(date, effective(date).filter((d) => d.text.trim().length > 0));
    }
    setDraft({});
  }

  function discardAll() {
    setDraft({});
    setLeaveWarn(false);
  }

  function goBack() {
    if (isDirty) { setLeaveWarn(true); return; }
    router.push("/daily?tab=reflection");
  }

  // ── Add-batch popup ──────────────────────────────────────────────────────────
  function openAdd() {
    setAddDate(todayDateStr());
    setAddLines([]);    // drop anything left over from a previous open
    setAddOpen(true);   // the effect below fills in that day's decisions
  }

  // Show the chosen day's decisions filled in, so the popup edits the day rather
  // than blindly appending to it. Re-runs when the date changes; anything the
  // user had already typed is carried across so switching date loses no work.
  useEffect(() => {
    if (!addOpen) return;
    setAddLines((prev) => {
      const carried = prev.filter((l) => !l.existing && l.text.trim().length > 0);
      const rows: AddLine[] = [
        ...effective(addDate).map((d) => ({
          id: d.id, text: d.text, made: d.made, createdAt: d.createdAt, existing: true,
        })),
        ...carried,
      ];
      while (rows.length < 3) rows.push(blankLine());
      if (rows.every((l) => l.text.trim().length > 0)) rows.push(blankLine());
      return rows;
    });
    // effective() is read as a snapshot on open / date change, by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen, addDate]);

  // Dirty against what's actually stored for that day — existing rows alone
  // aren't a change, so Save stays off until something really differs.
  const addDirty = linesKey(addLines) !== linesKey(effective(addDate));

  function requestCloseAdd() {
    if (addDirty) { setCloseWarn(true); return; }
    setAddOpen(false);
  }
  function forceCloseAdd() {
    setCloseWarn(false);
    setAddOpen(false);
  }

  function saveAdd() {
    const entries: DecisionEntry[] = addLines
      .filter((l) => l.text.trim().length > 0)
      .map((l) => ({ id: l.id, text: l.text.trim(), made: l.made, createdAt: l.createdAt }));

    // The popup held the day's full list, so this replaces rather than appends.
    persist(addDate, entries);
    // That write supersedes any unsaved inline edits for the same day.
    setDraft((prev) => {
      if (!(addDate in prev)) return prev;
      const next = { ...prev };
      delete next[addDate];
      return next;
    });
    setAddOpen(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: "100%", backgroundColor: P.pageBg,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* Sticky header */}
      <div className="px-page-md" style={{
        paddingTop: "12px", paddingBottom: "10px",
        borderBottom: `1px solid ${P.border}`, backgroundColor: P.headerBg,
        display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flexShrink: 0,
      }}>
        <button
          onClick={goBack}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "8px",
            border: `1.5px solid #C8BEE8`, backgroundColor: "#FFFFFF",
            fontSize: "12px", fontWeight: 600, color: P.label, cursor: "pointer",
          }}
        >
          <ArrowLeft size={14} color={P.label} /> Back
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", color: P.accent, marginBottom: "2px",
          }}>
            Daily · Reflection
          </p>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#13111F", margin: 0 }}>
            Decision Log
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: P.label, whiteSpace: "nowrap" }}>
            {totals.open} open · {totals.decided} decided
          </span>
          <button
            onClick={openAdd}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "8px", border: "none",
              backgroundColor: P.accent, color: "#FFFFFF",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={14} color="#FFFFFF" /> New
          </button>
        </div>
      </div>

      {/* Scrolling content */}
      <div className="px-page-md" style={{ flex: 1, overflowY: "auto", paddingTop: "16px", paddingBottom: "24px" }}>
        {dates.length === 0 ? (
          <div style={{
            maxWidth: "560px", margin: "48px auto", textAlign: "center",
            backgroundColor: P.cardBg, borderRadius: "14px",
            border: `1px solid ${P.cardBorder}`, borderTop: `3px solid ${P.decisions}`,
            padding: "32px 24px",
          }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: P.text, margin: "0 0 6px" }}>
              No decisions logged yet
            </p>
            <p style={{ fontSize: "12px", color: P.muted, margin: "0 0 18px", lineHeight: 1.5 }}>
              Decisions you log on the Daily reflection show up here, grouped by the day you made them.
            </p>
            <button
              onClick={openAdd}
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "none",
                backgroundColor: P.accent, color: "#FFFFFF",
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
              }}
            >
              Log your first decision
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {dates.map((date) => {
              const list = effective(date);
              const { day, full } = formatDate(date);
              const isToday = date === todayDateStr();
              return (
                <div key={date} style={{
                  backgroundColor: P.cardBg, borderRadius: "14px",
                  border: `1px solid ${P.cardBorder}`, borderTop: `3px solid ${P.decisions}`,
                  padding: "16px 18px",
                }}>
                  {/* Date group header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    marginBottom: "12px", flexWrap: "wrap",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: P.decisions, flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: P.text }}>{full}</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: P.muted }}>{day}</span>
                    {isToday && (
                      <span style={{
                        fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "#FFFFFF",
                        backgroundColor: P.accent, padding: "2px 7px", borderRadius: "5px",
                      }}>
                        Today
                      </span>
                    )}
                    <button
                      onClick={() => addInline(date)}
                      style={{
                        marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px",
                        padding: "4px 10px", borderRadius: "7px",
                        border: `1px solid ${P.decisions}`, backgroundColor: "#FFFFFF",
                        fontSize: "11px", fontWeight: 700, color: P.text, cursor: "pointer",
                      }}
                    >
                      <Plus size={12} color={P.text} /> Add
                    </button>
                  </div>

                  {/* Entries */}
                  {list.length === 0 ? (
                    <p style={{ fontSize: "12px", color: P.muted, margin: 0, fontStyle: "italic" }}>
                      No decisions on this day.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {list.map((dec) => (
                        <div key={dec.id} style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "8px 10px", borderRadius: "8px",
                          border: `1px solid ${dec.made ? P.decisions : P.cardBorder}`,
                          backgroundColor: dec.made ? "#F4F9FE" : "#FFFFFF",
                        }}>
                          <button
                            onClick={() => toggleMade(date, dec.id)}
                            title={dec.made ? "Mark as still to decide" : "Mark as decided"}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}
                          >
                            {dec.made
                              ? <CheckCircle2 size={16} color={P.decisions} />
                              : <Circle size={16} color={P.secondary} />}
                          </button>
                          <input
                            ref={(el) => { inputRefs.current[dec.id] = el; }}
                            value={dec.text}
                            onChange={(e) => editText(date, dec.id, e.target.value)}
                            placeholder="Describe the decision…"
                            style={{
                              flex: 1, minWidth: 0, border: "none", outline: "none",
                              backgroundColor: "transparent", fontFamily: "inherit",
                              fontSize: "13px", lineHeight: 1.4,
                              color: dec.made ? P.secondary : P.text,
                              textDecoration: dec.made ? "line-through" : "none",
                            }}
                          />
                          <button
                            onClick={() => removeEntry(date, dec.id)}
                            title="Delete"
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}
                          >
                            <Trash2 size={13} color={P.muted} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unsaved-changes bar */}
      {isDirty && (
        <div className="px-page-md" style={{
          flexShrink: 0, borderTop: `1px solid ${P.border}`, backgroundColor: "#FFFFFF",
          paddingTop: "10px", paddingBottom: "10px",
          display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
        }}>
          <AlertTriangle size={15} color="#B45309" />
          <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: P.text, minWidth: "160px" }}>
            Unsaved changes on {dirtyDates.length} {dirtyDates.length === 1 ? "day" : "days"}
          </span>
          <button
            onClick={discardAll}
            style={{
              padding: "7px 14px", borderRadius: "8px",
              border: `1.5px solid #C8BEE8`, backgroundColor: "#FFFFFF",
              fontSize: "12px", fontWeight: 600, color: P.label, cursor: "pointer",
            }}
          >
            Discard
          </button>
          <button
            onClick={saveAll}
            style={{
              padding: "7px 18px", borderRadius: "8px", border: "none",
              backgroundColor: P.accent, color: "#FFFFFF",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      )}

      {/* ── Add-batch popup ── */}
      {mounted && addOpen && createPortal(
        <div
          onClick={requestCloseAdd}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            backgroundColor: "rgba(19, 17, 31, 0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: "520px", maxHeight: "88vh",
              backgroundColor: "#FFFFFF", borderRadius: "16px",
              borderTop: `4px solid ${P.decisions}`,
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 20px 50px rgba(19,17,31,0.28)",
            }}
          >
            {/* Popup header */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "16px 18px 12px", borderBottom: `1px solid ${P.cardBorder}`,
            }}>
              <h2 style={{ flex: 1, fontSize: "15px", fontWeight: 700, color: P.text, margin: 0 }}>
                Log decisions
              </h2>
              <button
                onClick={requestCloseAdd}
                title="Close"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
              >
                <X size={18} color={P.muted} />
              </button>
            </div>

            {/* Popup body */}
            <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
              <label style={{
                display: "block", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: P.label, marginBottom: "6px",
              }}>
                Date
              </label>
              <CalendarPicker
                value={addDate}
                onChange={setAddDate}
                accentColor={P.accent}
                min=""
                max={todayDateStr()}
                // "center" renders the dropdown position:fixed, so the modal's
                // own overflow:auto can't clip the lower weeks of the month.
                placement="center"
              />
              <label style={{
                display: "block", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: P.label, margin: "18px 0 8px",
              }}>
                Decisions
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {addLines.map((line, i) => {
                  const filled = line.text.trim().length > 0;
                  return (
                    <div key={line.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() =>
                          setAddLines((prev) => prev.map((l, j) => (j === i ? { ...l, made: !l.made } : l)))
                        }
                        disabled={!filled}
                        title={line.made ? "Mark as still to decide" : "Mark as decided"}
                        style={{
                          background: "none", border: "none", padding: 0, flexShrink: 0, display: "flex",
                          cursor: filled ? "pointer" : "default",
                        }}
                      >
                        {line.made
                          ? <CheckCircle2 size={16} color={P.decisions} />
                          : <Circle size={16} color={filled ? P.secondary : "#D8D3E4"} />}
                      </button>
                      <input
                        value={line.text}
                        onChange={(e) =>
                          setAddLines((prev) => prev.map((l, j) => (j === i ? { ...l, text: e.target.value } : l)))
                        }
                        placeholder="Describe the decision…"
                        style={{
                          flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: "8px",
                          border: `1px solid ${line.made ? P.decisions : P.cardBorder}`,
                          backgroundColor: line.made ? "#F4F9FE" : "#FFFFFF",
                          fontSize: "13px", outline: "none",
                          color: line.made ? P.secondary : P.text,
                          textDecoration: line.made ? "line-through" : "none",
                          fontFamily: "inherit", boxSizing: "border-box",
                        }}
                      />
                      {addLines.length > 1 && (
                        <button
                          onClick={() => setAddLines((prev) => prev.filter((_, j) => j !== i))}
                          title={line.existing ? "Delete this decision" : "Remove line"}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}
                        >
                          <X size={14} color={P.muted} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setAddLines((prev) => [...prev, blankLine()])}
                style={{
                  display: "flex", alignItems: "center", gap: "5px", marginTop: "10px",
                  padding: "6px 12px", borderRadius: "7px",
                  border: `1px solid ${P.decisions}`, backgroundColor: "#FFFFFF",
                  fontSize: "11px", fontWeight: 700, color: P.text, cursor: "pointer",
                }}
              >
                <Plus size={12} color={P.text} /> Add line
              </button>
            </div>

            {/* Popup footer */}
            <div style={{
              display: "flex", justifyContent: "flex-end", gap: "8px",
              padding: "12px 18px", borderTop: `1px solid ${P.cardBorder}`,
            }}>
              <button
                onClick={requestCloseAdd}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  border: `1.5px solid #C8BEE8`, backgroundColor: "#FFFFFF",
                  fontSize: "12px", fontWeight: 600, color: P.label, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveAdd}
                disabled={!addDirty}
                style={{
                  padding: "8px 20px", borderRadius: "8px", border: "none",
                  backgroundColor: addDirty ? P.accent : "#C7C3DE",
                  color: "#FFFFFF", fontSize: "12px", fontWeight: 700,
                  cursor: addDirty ? "pointer" : "not-allowed",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Unsaved warning: leaving the page ── */}
      {mounted && leaveWarn && createPortal(
        <ConfirmDialog
          title="You have unsaved decisions"
          body={`Changes on ${dirtyDates.length} ${dirtyDates.length === 1 ? "day" : "days"} haven't been saved. Leaving now will discard them.`}
          cancelLabel="Stay on page"
          confirmLabel="Discard & leave"
          onCancel={() => setLeaveWarn(false)}
          onConfirm={() => { setDraft({}); setLeaveWarn(false); router.push("/daily?tab=reflection"); }}
          extraLabel="Save & leave"
          onExtra={() => { saveAll(); setLeaveWarn(false); router.push("/daily?tab=reflection"); }}
        />,
        document.body,
      )}

      {/* ── Unsaved warning: closing the popup ── */}
      {mounted && closeWarn && createPortal(
        <ConfirmDialog
          title="Discard these decisions?"
          body="You've typed decisions that haven't been saved yet. Closing will discard them."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          onCancel={() => setCloseWarn(false)}
          onConfirm={forceCloseAdd}
          extraLabel="Save"
          onExtra={() => { setCloseWarn(false); saveAdd(); }}
        />,
        document.body,
      )}
    </div>
  );
}

// ── Styled in-app confirmation (never a native confirm) ──────────────────────
function ConfirmDialog({
  title, body, cancelLabel, confirmLabel, onCancel, onConfirm, extraLabel, onExtra,
}: {
  title: string; body: string;
  cancelLabel: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void;
  extraLabel?: string; onExtra?: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(19, 17, 31, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "420px", backgroundColor: "#FFFFFF",
          borderRadius: "14px", padding: "20px", borderTop: "4px solid #F59E0B",
          boxShadow: "0 20px 50px rgba(19,17,31,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <AlertTriangle size={17} color="#B45309" />
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1F2933", margin: 0 }}>{title}</h3>
        </div>
        <p style={{ fontSize: "12.5px", color: "#374151", lineHeight: 1.5, margin: "0 0 18px" }}>{body}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 14px", borderRadius: "8px",
              border: "1.5px solid #C8BEE8", backgroundColor: "#FFFFFF",
              fontSize: "12px", fontWeight: 600, color: "#4A4575", cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 14px", borderRadius: "8px",
              border: "1.5px solid #DC2626", backgroundColor: "#FFFFFF",
              fontSize: "12px", fontWeight: 700, color: "#DC2626", cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
          {extraLabel && onExtra && (
            <button
              onClick={onExtra}
              style={{
                padding: "8px 18px", borderRadius: "8px", border: "none",
                backgroundColor: "#6C5DD3", color: "#FFFFFF",
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
              }}
            >
              {extraLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
