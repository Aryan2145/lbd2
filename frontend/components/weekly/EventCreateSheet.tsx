"use client";

import { useState, useEffect } from "react";
import { X, Clock, Calendar, Layers, AlignLeft, Trash2, AlertTriangle, Lightbulb, Plus, Check } from "lucide-react";
import type { WeekEvent, EventGroup } from "@/lib/weeklyTypes";
import { GENERAL_GROUP_ID } from "@/lib/weeklyTypes";
import ClockTimePicker from "@/components/weekly/ClockTimePicker";
import { validateDate } from "@/lib/dateValidation";
import CalendarPicker from "@/components/ui/CalendarPicker";

const NEW_GROUP_COLORS = [
  "#6366F1","#3B82F6","#06B6D4","#10B981",
  "#F59E0B","#EF4444","#EC4899","#8B5CF6",
];

interface Props {
  open:           boolean;
  onClose:        () => void;
  onSave:         (e: WeekEvent)  => void;
  onDelete?:      (id: string)    => void;
  eventGroups:    EventGroup[];
  existingEvents: WeekEvent[];
  editEvent?:     WeekEvent | null;
  initialDate?:   string;
  initialTime?:   string;
  onEditConflict: (e: WeekEvent)  => void;
  onAddGroup?:    (g: EventGroup) => void;
}

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function EventCreateSheet({
  open, onClose, onSave, onDelete, eventGroups, existingEvents,
  editEvent, initialDate, initialTime, onEditConflict, onAddGroup,
}: Props) {
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [date,         setDate]         = useState("");
  const [startTime,    setStartTime]    = useState("09:00");
  const [endTime,      setEndTime]      = useState("10:00");
  const [groupId,      setGroupId]      = useState("");
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen,   setEndPickerOpen]   = useState(false);

  // Inline new-group creator
  const [showNewGroup,   setShowNewGroup]   = useState(false);
  const [newGroupName,   setNewGroupName]   = useState("");
  const [newGroupColor,  setNewGroupColor]  = useState(NEW_GROUP_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description);
      setDate(editEvent.date);
      setStartTime(editEvent.startTime);
      setEndTime(editEvent.endTime);
      setGroupId(editEvent.groupId);
    } else {
      setTitle("");
      setDescription("");
      setDate(initialDate ?? "");
      const st = initialTime ?? "09:00";
      setStartTime(st);
      setEndTime(addOneHour(st));
      setGroupId("");
    }
    setShowNewGroup(false);
    setNewGroupName("");
    setNewGroupColor(NEW_GROUP_COLORS[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function saveNewGroup() {
    const name = newGroupName.trim();
    if (!name || !onAddGroup) return;
    const newGroup: EventGroup = {
      id:        `eg_${Date.now()}`,
      name,
      color:     newGroupColor,
      createdAt: Date.now(),
    };
    onAddGroup(newGroup);
    setGroupId(newGroup.id);            // auto-select for the new event
    setShowNewGroup(false);
    setNewGroupName("");
    setNewGroupColor(NEW_GROUP_COLORS[0]);
  }

  if (!open) return null;

  // ── Live conflict detection ────────────────────────────────────────────────
  const newStart = toMins(startTime);
  const newEnd   = toMins(endTime);

  const timeInvalid = newStart >= newEnd;

  const conflicts: WeekEvent[] = date && !timeInvalid
    ? existingEvents.filter((e) => {
        if (e.date !== date) return false;
        if (e.id === editEvent?.id) return false;
        const es = toMins(e.startTime);
        const ee = toMins(e.endTime);
        return !(newEnd <= es || newStart >= ee);
      })
    : [];

  // Back-to-back: preceding event ends within 14 min of new start (no overlap)
  const backToBack: WeekEvent | null = conflicts.length === 0 && !timeInvalid && date
    ? existingEvents.find((e) => {
        if (e.date !== date) return false;
        if (e.id === editEvent?.id) return false;
        const gap = newStart - toMins(e.endTime);
        return gap >= 0 && gap < 15;
      }) ?? null
    : null;

  const dateError = validateDate(date, { required: true });
  const canSave   = title.trim().length > 0 && !dateError && !timeInvalid && conflicts.length === 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      id:          editEvent?.id ?? `we_${Date.now()}`,
      groupId:     groupId || GENERAL_GROUP_ID,
      title:       title.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      createdAt:   editEvent?.createdAt ?? Date.now(),
    });
    onClose();
  }

  return (
    <>
      {startPickerOpen && (
        <ClockTimePicker
          label="Start time"
          value={startTime}
          onChange={(v) => {
            setStartTime(v);
            setEndTime(addOneHour(v));
          }}
          onClose={() => setStartPickerOpen(false)}
        />
      )}
      {endPickerOpen && (
        <ClockTimePicker
          label="End time"
          value={endTime}
          onChange={(v) => setEndTime(v)}
          onClose={() => setEndPickerOpen(false)}
        />
      )}

      <div onClick={onClose} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50,
      }} />

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "600px",
        backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0",
        padding: "28px 28px 32px", zIndex: 51,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
            {editEvent ? "Edit Time Block" : "New Time Block"}
          </h2>
          <button onClick={onClose} style={iconBtn}>
            <X size={14} color="#57534E" />
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "14px" }}>
          <label style={lbl}>Event Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you doing?"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="weekly-input"
            style={inp}
          />
        </div>

        {/* Date + Time */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <div style={{ flex: 1.2 }}>
            <label style={lbl}><Calendar size={9} style={{ display: "inline", marginRight: 3 }} />Date</label>
            <CalendarPicker value={date} onChange={setDate} accentColor="#F97316" bgColor="#FFF7ED" placement="center" />
            {dateError && (
              <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, marginTop: "4px" }}>
                {dateError}
              </p>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}><Clock size={9} style={{ display: "inline", marginRight: 3 }} />Start</label>
            <button
              onClick={() => setStartPickerOpen(true)}
              style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontWeight: 600 }}
            >
              <span>{startTime}</span>
              <Clock size={12} color="#F97316" />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}><Clock size={9} style={{ display: "inline", marginRight: 3 }} />End</label>
            <button
              onClick={() => setEndPickerOpen(true)}
              style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontWeight: 600 }}
            >
              <span>{endTime}</span>
              <Clock size={12} color="#F97316" />
            </button>
          </div>
        </div>

        {/* ── Time order error (hard block) ── */}
        {timeInvalid && (
          <div style={{
            marginBottom: "14px", padding: "10px 14px", borderRadius: "10px",
            backgroundColor: "#FEF2F2", border: "1.5px solid #FCA5A5",
            display: "flex", gap: "9px", alignItems: "center",
          }}>
            <AlertTriangle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626", margin: 0 }}>
              End time must be after start time.
            </p>
          </div>
        )}

        {/* ── Conflict warning (hard block) ── */}
        {conflicts.length > 0 && (
          <div style={{
            marginBottom: "14px", padding: "12px 14px", borderRadius: "10px",
            backgroundColor: "#FEF2F2", border: "1.5px solid #FCA5A5",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <AlertTriangle size={14} color="#DC2626" />
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626", margin: 0 }}>
                Time conflict — this event overlaps with:
              </p>
            </div>
            <p style={{ fontSize: "11px", color: "#B91C1C", marginBottom: "8px" }}>
              Reschedule one of these events, or click a conflicting event below to edit it directly.
            </p>
            {conflicts.map((c) => {
              const g     = eventGroups.find((eg) => eg.id === c.groupId);
              const color = g?.color ?? "#6366F1";
              return (
                <div
                  key={c.id}
                  onClick={() => onEditConflict(c)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 12px", borderRadius: "8px",
                    border: `1.5px solid ${color}40`,
                    backgroundColor: "#FFFFFF", cursor: "pointer",
                    marginTop: "5px",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#1C1917", margin: 0 }}>{c.title}</p>
                    <p style={{ fontSize: "10px", color: "#57534E", margin: "1px 0 0" }}>
                      {c.startTime} – {c.endTime}
                    </p>
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: color }}>Edit →</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Back-to-back nudge (soft warning, non-blocking) ── */}
        {backToBack && (
          <div style={{
            marginBottom: "14px", padding: "10px 14px", borderRadius: "10px",
            backgroundColor: "#FFFBEB", border: "1.5px solid #FCD34D",
            display: "flex", gap: "9px", alignItems: "flex-start",
          }}>
            <Lightbulb size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#92400E", marginBottom: "3px" }}>
                Back-to-back scheduling alert
              </p>
              <p style={{ fontSize: "11px", color: "#78350F", lineHeight: 1.5, margin: 0 }}>
                Your previous block <strong>"{backToBack.title}"</strong> ends at {backToBack.endTime}.
                Productivity research recommends a <strong>15-minute buffer</strong> between meetings to
                recover, think, and avoid decision fatigue.
              </p>
            </div>
          </div>
        )}

        {/* Group selector */}
        <div style={{ marginBottom: "14px" }}>
          <label style={lbl}>
            <Layers size={9} style={{ display: "inline", marginRight: 3 }} />
            Group
            <span style={{ fontSize: "9px", fontWeight: 500, color: "#A8A29E",
              textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>
              (optional — unselected saves as General)
            </span>
          </label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {eventGroups.filter((g) => g.id !== GENERAL_GROUP_ID && !g.archived).map((g) => (
              <button key={g.id} onClick={() => setGroupId(groupId === g.id ? "" : g.id)} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "5px 12px", borderRadius: "8px",
                border: `1.5px solid ${groupId === g.id ? g.color : "#E8DDD0"}`,
                backgroundColor: groupId === g.id ? g.color + "15" : "#FFFFFF",
                fontSize: "12px", fontWeight: 600,
                color: groupId === g.id ? g.color : "#57534E",
                cursor: "pointer",
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: g.color }} />
                {g.name}
              </button>
            ))}
            {onAddGroup && !showNewGroup && (
              <button
                onClick={() => setShowNewGroup(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "5px 11px", borderRadius: "8px",
                  border: "1.5px dashed #C4B5A8", backgroundColor: "transparent",
                  fontSize: "12px", fontWeight: 600, color: "#57534E",
                  cursor: "pointer",
                }}
              >
                <Plus size={11} /> New group
              </button>
            )}
          </div>

          {/* Inline new-group creator */}
          {showNewGroup && onAddGroup && (
            <div style={{
              marginTop: "8px", padding: "10px 12px",
              borderRadius: "10px", border: "1.5px solid #FED7AA",
              backgroundColor: "#FFF7ED",
              display: "flex", flexDirection: "column", gap: "8px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name (e.g. Deep Work)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newGroupName.trim()) saveNewGroup();
                    if (e.key === "Escape") { setShowNewGroup(false); setNewGroupName(""); }
                  }}
                  style={{
                    flex: 1, padding: "6px 10px", borderRadius: "7px",
                    border: "1.5px solid #FED7AA", backgroundColor: "#FFFFFF",
                    fontSize: "12px", fontWeight: 600, color: "#1C1917",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={saveNewGroup}
                  disabled={!newGroupName.trim()}
                  title="Create group"
                  style={{
                    width: 28, height: 28, borderRadius: 7, border: "none",
                    backgroundColor: newGroupName.trim() ? newGroupColor : "#E8DDD0",
                    cursor: newGroupName.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Check size={13} color="#FFFFFF" strokeWidth={3} />
                </button>
                <button
                  onClick={() => { setShowNewGroup(false); setNewGroupName(""); }}
                  title="Cancel"
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: "1px solid #E8DDD0", backgroundColor: "#FFFFFF",
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={12} color="#57534E" />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "#57534E",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Color
                </span>
                {NEW_GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewGroupColor(c)}
                    aria-label={`Pick color ${c}`}
                    style={{
                      width: 18, height: 18, borderRadius: "50%", padding: 0, cursor: "pointer",
                      backgroundColor: c,
                      border: newGroupColor === c ? "2.5px solid #1C1917" : "1.5px solid #FFFFFF",
                      boxShadow: newGroupColor === c ? `0 0 0 2px ${c}55` : "0 1px 3px rgba(0,0,0,0.12)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "22px" }}>
          <label style={lbl}><AlignLeft size={9} style={{ display: "inline", marginRight: 3 }} />Notes (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context..."
            rows={2}
            className="weekly-textarea"
            style={{ ...inp, resize: "none", fontFamily: "inherit" }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            {editEvent && onDelete && (
              <button onClick={() => { onDelete(editEvent.id); onClose(); }} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "8px 14px", borderRadius: "10px",
                border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2",
                fontSize: "12px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
              }}>
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {(timeInvalid || conflicts.length > 0) && (
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600 }}>
                {timeInvalid ? "Fix time order to continue" : "Resolve conflict to continue"}
              </span>
            )}
            <button onClick={handleSave} disabled={!canSave} style={{
              padding: "8px 20px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              fontSize: "12px", fontWeight: 700, color: "#FFFFFF",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.45,
            }}>
              {editEvent ? "Save Changes" : "Add Event"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700, color: "#44403C",
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: "10px",
  border: "1.5px solid #F97316", backgroundColor: "#FFF7ED",
  fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
};

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: "1px solid #EDE5D8",
  backgroundColor: "#FAFAFA", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer",
};
