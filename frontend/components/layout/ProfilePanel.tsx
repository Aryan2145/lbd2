"use client";

import { useState } from "react";
import { X, User, Mail, Phone, Briefcase, Lock, Eye, EyeOff, Check, LogOut } from "lucide-react";
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
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw,     setCurrentPw]     = useState("");
  const [newPw,         setNewPw]         = useState("");
  const [confirmPw,     setConfirmPw]     = useState("");
  const [showPw,        setShowPw]        = useState(false);
  const [pwError,       setPwError]       = useState("");
  const [saved,         setSaved]         = useState(false);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  function handleSave() { onSave(form); flash(); }

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
  const lbl: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "10px", fontWeight: 700, color: "#78716C",
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px",
  };

  const initials = (form.name || "?").split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div style={{
        position: "absolute", top: "46px", right: 0,
        width: "min(300px, calc(100vw - 16px))", maxHeight: "540px",
        backgroundColor: "#FFFFFF", borderRadius: "16px",
        border: "1px solid #E8DDD0", boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 14px", borderBottom: "1px solid #F0EBE4",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "#FAF5EE", flexShrink: 0,
        }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917" }}>My Profile</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={13} color="#78716C" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {/* Avatar */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", fontWeight: 700, color: "#FFFFFF",
            }}>
              {initials}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
            <div>
              <label style={lbl}><User size={9} /> Name</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={field} />
            </div>
            <div>
              <label style={lbl}><Briefcase size={9} /> Role / Title</label>
              <input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} style={field} />
            </div>
            <div>
              <label style={lbl}><Mail size={9} /> Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={field} />
            </div>
            <div>
              <label style={lbl}><Phone size={9} /> Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} style={field} />
            </div>

            {/* Save */}
            <button onClick={handleSave} style={{
              padding: "9px", borderRadius: "10px", border: "none",
              background: saved ? "#10B981" : "linear-gradient(135deg, #F97316, #EA580C)",
              color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
              {saved ? <><Check size={12} /> Saved</> : "Save Changes"}
            </button>

            {/* Change password */}
            <button onClick={() => setShowPwSection((s) => !s)} style={{
              padding: "8px", borderRadius: "10px",
              border: "1.5px solid #C8BFB5", backgroundColor: "#FAFAFA",
              color: "#44403C", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
              <Lock size={12} /> Change Password
            </button>

            {/* Sign out */}
            <button onClick={onLogout} style={{
              padding: "8px", borderRadius: "10px",
              border: "1.5px solid #FECACA", backgroundColor: "#FEF2F2",
              color: "#DC2626", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              marginTop: "4px",
            }}>
              <LogOut size={12} /> Sign Out
            </button>

            {showPwSection && (
              <div style={{
                padding: "12px", borderRadius: "10px",
                border: "1px solid #EDE5D8", backgroundColor: "#FAF5EE",
                display: "flex", flexDirection: "column", gap: "10px",
              }}>
                <div>
                  <label style={lbl}><Lock size={9} /> Current Password</label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    style={field}
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
                  <p style={{ color: "#DC2626", fontSize: "11px", margin: 0 }}>{pwError}</p>
                )}
                <button onClick={handleChangePw} style={{
                  padding: "8px", borderRadius: "9px", border: "none",
                  backgroundColor: "#F97316", color: "#FFFFFF",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer",
                }}>
                  Update Password
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
