"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Target, CheckSquare, Flame, Compass } from "lucide-react";
import type { GoalData } from "@/components/goals/GoalCard";
import type { HabitData } from "@/components/habits/HabitCard";
import type { TaskData } from "@/components/tasks/TaskCard";
import type { BucketEntry } from "@/lib/bucketTypes";

interface Props {
  onClose:       () => void;
  goals:         GoalData[];
  tasks:         TaskData[];
  habits:        HabitData[];
  bucketEntries: BucketEntry[];
}

interface Result {
  id:    string;
  title: string;
  sub:   string;
  href:  string;
  icon:  React.ReactNode;
  hoverBg: string;
}

export default function SearchPanel({ onClose, goals, tasks, habits, bucketEntries }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.toLowerCase().trim();

  const results: Result[] = q.length < 1 ? [] : [
    ...goals
      .filter((g) => g.statement.toLowerCase().includes(q))
      .map((g) => ({
        id: "g-" + g.id, title: g.statement, sub: `Goal · ${g.area}`,
        href: "/goals", icon: <Target size={13} color="#2563EB" />, hoverBg: "#EFF6FF",
      })),
    ...tasks
      .filter((t) => t.kind !== "instance" && t.title.toLowerCase().includes(q))
      .map((t) => ({
        id: "t-" + t.id, title: t.title, sub: `Task · ${t.status} · due ${t.deadline}`,
        href: "/tasks", icon: <CheckSquare size={13} color="#16A34A" />, hoverBg: "#F0FDF4",
      })),
    ...habits
      .filter((h) => h.name.toLowerCase().includes(q))
      .map((h) => ({
        id: "h-" + h.id, title: h.name, sub: `Habit · ${h.area}`,
        href: "/habits", icon: <Flame size={13} color="#EA580C" />, hoverBg: "#FFF7ED",
      })),
    ...bucketEntries
      .filter((b) => b.title.toLowerCase().includes(q))
      .map((b) => ({
        id: "b-" + b.id, title: b.title, sub: `Bucket List · ${b.lifeArea}`,
        href: "/bucket-list", icon: <Compass size={13} color="#7C3AED" />, hoverBg: "#FAF5FF",
      })),
  ];

  function go(href: string) { router.push(href); onClose(); }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "72px" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />

      {/* Modal */}
      <div style={{
        position: "relative", width: "560px", maxHeight: "460px",
        backgroundColor: "#FFFFFF", borderRadius: "16px",
        border: "1px solid #E8DDD0", boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1,
      }}>
        {/* Input row */}
        <div style={{
          padding: "13px 16px",
          display: "flex", alignItems: "center", gap: "10px",
          borderBottom: "1px solid #F0EBE4",
        }}>
          <Search size={16} color="#A8A29E" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, goals, habits, bucket list…"
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: "14px", color: "#1C1917", backgroundColor: "transparent",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>
              <X size={14} color="#A8A29E" />
            </button>
          )}
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            borderLeft: "1px solid #E8DDD0", paddingLeft: "12px", marginLeft: "4px",
            fontSize: "11px", color: "#A8A29E", fontWeight: 600, flexShrink: 0,
          }}>
            Esc
          </button>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {q.length < 1 ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#A8A29E", margin: 0 }}>
                Search across tasks, goals, habits, and bucket list
              </p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#A8A29E", margin: 0 }}>No results for "{query}"</p>
            </div>
          ) : (
            <div style={{ padding: "8px" }}>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => go(r.href)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "10px", border: "none",
                    backgroundColor: "transparent", cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = r.hoverBg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "8px",
                    backgroundColor: r.hoverBg, border: "1px solid #E8DDD0",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {r.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: "13px", fontWeight: 500, color: "#1C1917",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{r.title}</p>
                    <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#78716C" }}>{r.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
