"use client";

import { useState } from "react";
import Link from "next/link";
import { X, User, Mail, Phone, Briefcase, Lock, Eye, EyeOff, Check, LogOut, HelpCircle, ChevronRight, Pencil } from "lucide-react";
import type { UserProfile } from "@/lib/AppStore";

interface Props {
  onClose:          () => void;
  profile:          UserProfile;
  onSave:           (p: UserProfile) => void;
  onChangePassword: (currentPw: string, newPw: string) => Promise<string | null>;
  onLogout:         () => void;
}

export default function ProfilePanel({ onClose, profile, onSave, onChangePassword, onLogout }: Props) {
  const [form,          setForm]          = useState<UserProfile>({ ...profile });
  const [locked,        setLocked]        = useState(true);
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw,     setCurrentPw]     = useState("");
  const [newPw,         setNewPw]         = useState("");
  const [confirmPw,     setConfirmPw]     = useState("");
  const [showPw,        setShowPw]        = useState(false);
  const [pwError,       setPwError]       = useState("");
  const [saved,         setSaved]         = useState(false);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  function handleSave() { onSave(form); setLocked(true); flash(); }

  async function handleChangePw() {
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    setPwError("");
    const err = await onChangePassword(currentPw, newPw);
    if (err) { setPwError(err); return; }
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setShowPwSection(false);
    flash();
  }

  const field: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "9px",
    border: "1.5px solid #C8BFB5", backgroundColor: "#FFFFFF",
    fontSize: "13px", color: "#1C1917", outline: "none", boxSizing: "border-box",
  };
  const lockedField: React.CSSProperties = {
    ...field,
    backgroundColor: "#F5F0EB",
    borderColor: "#E8DDD0",
    color: "#44403C",
    cursor: "default",
  };
  const lbl: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "10px", fontWeight: 700, color: "#78716C",
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px",
  };

  const initials = (form.name || "?").split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(28,25,23,0.45)",
          backdropFilter: "blur(2px)",
          zIndex: 400,
        }}
      />
      {/* Right-side drawer — same pattern as TaskCreateSheet */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(440px, 100vw)",
        backgroundColor: "#FFFFFF",
        boxShadow: "-8px 0 40px rgba(28,25,23,0.12)",
        zIndex: 401,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header — avatar inline */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #EDE5D8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)", flexShrink: 0,
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#FFFFFF",
              boxShadow: "0 2px 8px rgba(249,115,22,0.35)",
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#F97316", marginBottom: "2px",
              }}>
                Account
              </p>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
                My Profile
              </h2>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => {
                if (locked) {
                  setLocked(false);
                } else {
                  // Cancel edit: revert and re-lock
                  setForm({ ...profile });
                  setLocked(true);
                }
              }}
              aria-label={locked ? "Edit profile" : "Cancel edit"}
              title={locked ? "Edit profile" : "Cancel edit"}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: locked ? "none" : "1.5px solid #FCA5A5",
                backgroundColor: locked ? "#FFFFFF" : "#FEF2F2",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                boxShadow: locked ? "0 1px 3px rgba(28,25,23,0.08)" : "none",
              }}
            >
              {locked
                ? <Pencil size={13} color="#EA580C" />
                : <X size={13} color="#DC2626" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                backgroundColor: "#FAFAFA",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} color="#57534E" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
            <div>
              <label style={lbl}><User size={9} /> Name</label>
              <input value={form.name} disabled={locked} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={locked ? lockedField : field} />
            </div>
            <div>
              <label style={lbl}><Briefcase size={9} /> Role / Title</label>
              <input value={form.role} disabled={locked} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} style={locked ? lockedField : field} />
            </div>
            <div>
              <label style={lbl}><Mail size={9} /> Email</label>
              <input type="email" value={form.email} disabled={locked} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={locked ? lockedField : field} />
            </div>
            <div>
              <label style={lbl}><Phone size={9} /> Phone</label>
              <input type="tel" value={form.phone} disabled={locked} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} style={locked ? lockedField : field} />
            </div>

            {/* Save — only when unlocked */}
            {!locked && (
              <button onClick={handleSave} style={{
                padding: "9px", borderRadius: "10px", border: "none",
                background: saved ? "#10B981" : "linear-gradient(135deg, #F97316, #EA580C)",
                color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                {saved ? <><Check size={12} /> Saved</> : "Save Changes"}
              </button>
            )}

            {/* Support */}
            <Link
              href="/support"
              onClick={onClose}
              style={{
                padding: "8px", borderRadius: "10px",
                border: "1.5px solid #FED7AA", backgroundColor: "#FFF7ED",
                color: "#EA580C", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                textDecoration: "none",
              }}
            >
              <HelpCircle size={12} /> Support
              <ChevronRight size={11} style={{ marginLeft: "auto" }} />
            </Link>

            {/* Change password + Sign out — side by side */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowPwSection((s) => !s)}
                style={{
                  flex: 1,
                  padding: "7px 10px", borderRadius: "9px",
                  border: "1.5px solid #C8BFB5", backgroundColor: "#FAFAFA",
                  color: "#44403C", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  whiteSpace: "nowrap",
                }}
              >
                <Lock size={11} /> Change Password
              </button>
              <button
                onClick={onLogout}
                style={{
                  flex: 1,
                  padding: "7px 10px", borderRadius: "9px",
                  border: "1.5px solid #FECACA", backgroundColor: "#FEF2F2",
                  color: "#DC2626", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  whiteSpace: "nowrap",
                }}
              >
                <LogOut size={11} /> Sign Out
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Change Password — modal layered over the drawer */}
      {showPwSection && (
        <>
          <div
            onClick={() => { setShowPwSection(false); setPwError(""); }}
            style={{
              position: "fixed", inset: 0,
              backgroundColor: "rgba(28,25,23,0.55)",
              backdropFilter: "blur(2px)",
              zIndex: 500,
            }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(380px, calc(100vw - 24px))",
            maxHeight: "90vh", overflowY: "auto",
            backgroundColor: "#FFFFFF", borderRadius: "16px",
            border: "1px solid #E8DDD0",
            boxShadow: "0 16px 48px rgba(28,25,23,0.22)",
            zIndex: 501,
            display: "flex", flexDirection: "column",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "14px 18px", borderBottom: "1px solid #F0EBE4",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "linear-gradient(135deg, #FFF7ED, #FFFFFF)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Lock size={14} color="#EA580C" />
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
                  Change Password
                </h3>
              </div>
              <button
                onClick={() => { setShowPwSection(false); setPwError(""); }}
                aria-label="Close"
                style={{
                  width: 28, height: 28, borderRadius: 7, border: "none",
                  backgroundColor: "#FAFAFA",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={13} color="#57534E" />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={lbl}><Lock size={9} /> Current Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  style={field}
                  autoFocus
                />
              </div>
              <div>
                <label style={lbl}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    style={{ ...field, paddingRight: "36px" }}
                  />
                  <button
                    onClick={() => setShowPw((s) => !s)}
                    style={{
                      position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                    }}
                  >
                    {showPw ? <EyeOff size={13} color="#78716C" /> : <Eye size={13} color="#78716C" />}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Confirm Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  style={field}
                />
              </div>
              {pwError && (
                <p style={{ color: "#DC2626", fontSize: "11px", margin: 0, fontWeight: 600 }}>{pwError}</p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => { setShowPwSection(false); setPwError(""); }}
                  style={{
                    flex: 1, padding: "9px", borderRadius: "9px",
                    border: "1.5px solid #E8DDD0", backgroundColor: "#FFFFFF",
                    color: "#57534E", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePw}
                  style={{
                    flex: 2, padding: "9px", borderRadius: "9px", border: "none",
                    background: "linear-gradient(135deg, #F97316, #EA580C)",
                    color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
