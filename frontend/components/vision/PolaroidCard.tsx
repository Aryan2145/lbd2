"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, Plus, Camera, X, Copy, Check, Pencil, Briefcase, Globe, TrendingUp, Sparkles, BookOpen, Users, Activity, type LucideIcon } from "lucide-react";

const AREA_ICONS: Record<string, LucideIcon> = {
  professional:  Briefcase,
  contribution:  Globe,
  wealth:        TrendingUp,
  spiritual:     Sparkles,
  personal:      BookOpen,
  relationships: Users,
  health:        Activity,
};

function AreaIllustration({ id, color }: { id: string; color: string }) {
  const c = color;
  if (id === "professional") return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "80%" }} preserveAspectRatio="xMidYMax meet">
      <rect x="5"   y="80" width="22" height="40" rx="1" fill={`${c}22`} />
      <rect x="30"  y="58" width="24" height="62" rx="1" fill={`${c}33`} />
      <rect x="57"  y="38" width="28" height="82" rx="1" fill={`${c}48`} />
      <rect x="88"  y="18" width="32" height="102" rx="1" fill={`${c}60`} />
      <rect x="123" y="44" width="24" height="76" rx="1" fill={`${c}48`} />
      <rect x="150" y="62" width="22" height="58" rx="1" fill={`${c}33`} />
      <rect x="175" y="76" width="22" height="44" rx="1" fill={`${c}22`} />
      <rect x="61"  y="46" width="5" height="5" rx="1" fill={`${c}80`} />
      <rect x="70"  y="46" width="5" height="5" rx="1" fill={`${c}80`} />
      <rect x="61"  y="57" width="5" height="5" rx="1" fill={`${c}80`} />
      <rect x="70"  y="57" width="5" height="5" rx="1" fill={`${c}80`} />
      <rect x="92"  y="28" width="5" height="5" rx="1" fill={`${c}80`} />
      <rect x="102" y="28" width="5" height="5" rx="1" fill={`${c}80`} />
      <rect x="92"  y="40" width="5" height="5" rx="1" fill={`${c}80`} />
      <rect x="102" y="40" width="5" height="5" rx="1" fill={`${c}80`} />
    </svg>
  );
  if (id === "contribution") return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
      <circle cx="100" cy="60" r="42" fill="none" stroke={`${c}35`} strokeWidth="1.5" />
      <ellipse cx="100" cy="60" rx="42" ry="18" fill="none" stroke={`${c}28`} strokeWidth="1" />
      <ellipse cx="100" cy="45" rx="30" ry="11" fill="none" stroke={`${c}22`} strokeWidth="1" />
      <ellipse cx="100" cy="75" rx="30" ry="11" fill="none" stroke={`${c}22`} strokeWidth="1" />
      <line x1="100" y1="18" x2="100" y2="102" stroke={`${c}28`} strokeWidth="1" />
      <circle cx="100" cy="26" r="5" fill={`${c}65`} />
      <circle cx="62"  cy="48" r="5" fill={`${c}65`} />
      <circle cx="138" cy="48" r="5" fill={`${c}65`} />
      <circle cx="100" cy="94" r="5" fill={`${c}65`} />
      <circle cx="68"  cy="74" r="3.5" fill={`${c}45`} />
      <circle cx="132" cy="74" r="3.5" fill={`${c}45`} />
      <line x1="100" y1="26" x2="62"  y2="48" stroke={`${c}40`} strokeWidth="1.2" />
      <line x1="100" y1="26" x2="138" y2="48" stroke={`${c}40`} strokeWidth="1.2" />
      <line x1="62"  y1="48" x2="100" y2="94" stroke={`${c}40`} strokeWidth="1.2" />
      <line x1="138" y1="48" x2="100" y2="94" stroke={`${c}40`} strokeWidth="1.2" />
      <line x1="62"  y1="48" x2="68"  y2="74" stroke={`${c}30`} strokeWidth="1" />
      <line x1="138" y1="48" x2="132" y2="74" stroke={`${c}30`} strokeWidth="1" />
    </svg>
  );
  if (id === "wealth") return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
      {/* Ground shadow */}
      <ellipse cx="102" cy="112" rx="70" ry="6" fill={`${c}25`} />

      {/* Each biscuit: right-side (dark) → front face → top face (light) → shines */}
      {/* 3D offset: dx=9, dy=8 */}

      {/* ── Bottom-left biscuit (front x:44→98, y:80→104) ── */}
      <path d="M98 80 L98 104 L107 96 L107 72 Z"   fill={c}/><path d="M98 80 L98 104 L107 96 L107 72 Z"   fill="rgba(0,0,0,0.32)"/>
      <rect x="44" y="80" width="54" height="24" rx="4" fill={c}/>
      <rect x="50" y="85" width="36" height="5"  rx="2" fill="rgba(255,255,255,0.28)"/>
      <path d="M44 80 L98 80 L107 72 L53 72 Z"    fill={c}/><path d="M44 80 L98 80 L107 72 L53 72 Z"    fill="rgba(255,255,255,0.24)"/>
      <path d="M54 78 L88 78 L95 74 L61 74 Z"     fill="rgba(255,255,255,0.32)"/>

      {/* ── Bottom-right biscuit (front x:98→152, y:80→104) ── */}
      <path d="M152 80 L152 104 L161 96 L161 72 Z" fill={c}/><path d="M152 80 L152 104 L161 96 L161 72 Z" fill="rgba(0,0,0,0.32)"/>
      <rect x="98" y="80" width="54" height="24" rx="4" fill={c}/>
      <rect x="104" y="85" width="36" height="5" rx="2" fill="rgba(255,255,255,0.28)"/>
      <path d="M98 80 L152 80 L161 72 L107 72 Z"  fill={c}/><path d="M98 80 L152 80 L161 72 L107 72 Z"  fill="rgba(255,255,255,0.24)"/>
      <path d="M108 78 L142 78 L149 74 L115 74 Z" fill="rgba(255,255,255,0.32)"/>

      {/* ── Top biscuit (front x:71→125, y:54→78, rests on the two below at y=72) ── */}
      <path d="M125 54 L125 78 L134 70 L134 46 Z" fill={c}/><path d="M125 54 L125 78 L134 70 L134 46 Z" fill="rgba(0,0,0,0.32)"/>
      <rect x="71" y="54" width="54" height="24" rx="4" fill={c}/>
      <rect x="77" y="59" width="36" height="5"  rx="2" fill="rgba(255,255,255,0.28)"/>
      <path d="M71 54 L125 54 L134 46 L80 46 Z"   fill={c}/><path d="M71 54 L125 54 L134 46 L80 46 Z"   fill="rgba(255,255,255,0.24)"/>
      <path d="M81 52 L115 52 L122 48 L88 48 Z"   fill="rgba(255,255,255,0.35)"/>

      {/* Sparkles */}
      {([{x:30,y:58,s:8},{x:176,y:54,s:7},{x:22,y:92,s:5},{x:185,y:88,s:5}] as {x:number;y:number;s:number}[]).map(({x,y,s},i)=>(
        <path key={i} d={`M${x},${y-s} L${x+s*.22},${y-s*.22} L${x+s},${y} L${x+s*.22},${y+s*.22} L${x},${y+s} L${x-s*.22},${y+s*.22} L${x-s},${y} L${x-s*.22},${y-s*.22} Z`} fill={c}/>
      ))}
    </svg>
  );
  if (id === "spiritual") return (
    <svg viewBox="0 0 200 130" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
      {/* Aura rings centered on body */}
      <circle cx="100" cy="88" r="55" fill="none" stroke={`${c}10`} strokeWidth="1.5" />
      <circle cx="100" cy="88" r="42" fill="none" stroke={`${c}18`} strokeWidth="1.5" />
      <circle cx="100" cy="88" r="28" fill="none" stroke={`${c}28`} strokeWidth="1.5" />
      {/* Shadow/ground */}
      <ellipse cx="100" cy="118" rx="42" ry="7" fill={`${c}20`} />
      {/* Lotus petals */}
      <ellipse cx="100" cy="112" rx="44" ry="10" fill={`${c}28`} />
      <path d="M60 112 Q68 96 80 104 Q86 92 100 98 Q114 92 120 104 Q132 96 140 112Z" fill={`${c}35`} />
      {/* Crossed legs */}
      <ellipse cx="76"  cy="108" rx="20" ry="7" fill={`${c}48`} />
      <ellipse cx="124" cy="108" rx="20" ry="7" fill={`${c}48`} />
      {/* Body */}
      <path d="M78 108 Q80 85 100 80 Q120 85 122 108Z" fill={`${c}52`} />
      {/* Arms */}
      <path d="M80 98 Q72 106 68 110" fill="none" stroke={`${c}48`} strokeWidth="4" strokeLinecap="round" />
      <path d="M120 98 Q128 106 132 110" fill="none" stroke={`${c}48`} strokeWidth="4" strokeLinecap="round" />
      {/* Head — clearly separated from body */}
      <circle cx="100" cy="68" r="13" fill={`${c}60`} />
      {/* Subtle chakra line — just 3 small dots on body, not overlapping head */}
      <circle cx="100" cy="105" r="2" fill={`${c}65`} />
      <circle cx="100" cy="95"  r="2" fill={`${c}72`} />
      <circle cx="100" cy="84"  r="2" fill={`${c}80`} />
      {/* Crown glow above head — clearly separate */}
      <circle cx="100" cy="52" r="5" fill={`${c}70`} />
      <circle cx="100" cy="52" r="9" fill="none" stroke={`${c}35`} strokeWidth="1" />
      {/* Floating particles */}
      {[[86,38],[100,28],[114,36],[92,18],[108,22]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i%2===0?1.8:1.2} fill={`${c}${i%2===0?'50':'30'}`} />
      ))}
    </svg>
  );
  if (id === "personal") return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "92%" }} preserveAspectRatio="xMidYMax meet">
      <path d="M0 108 Q100 100 200 108 L200 120 L0 120Z" fill={`${c}22`} />
      <rect x="94" y="62" width="12" height="50" rx="5" fill={`${c}50`} />
      <ellipse cx="100" cy="70" rx="38" ry="26" fill={`${c}38`} />
      <ellipse cx="100" cy="52" rx="28" ry="22" fill={`${c}52`} />
      <ellipse cx="100" cy="36" rx="18" ry="16" fill={`${c}68`} />
      <circle cx="100" cy="22" r="6" fill={`${c}90`} />
      <circle cx="87"  cy="29" r="3.5" fill={`${c}60`} />
      <circle cx="113" cy="26" r="3.5" fill={`${c}60`} />
      <circle cx="58"  cy="76" r="8" fill={`${c}32`} />
      <circle cx="142" cy="73" r="8" fill={`${c}32`} />
      <circle cx="46"  cy="68" r="5" fill={`${c}25`} />
      <circle cx="154" cy="65" r="5" fill={`${c}25`} />
    </svg>
  );
  if (id === "relationships") return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
      {/* Ground */}
      <path d="M0 112 Q100 105 200 112 L200 120 L0 120Z" fill={`${c}20`} />
      {/* Left parent */}
      <circle cx="62" cy="30" r="13" fill={`${c}45`} />
      <path d="M36 118 Q42 78 62 69 Q82 78 88 118" fill={`${c}40`} />
      {/* Right parent */}
      <circle cx="138" cy="30" r="13" fill={`${c}55`} />
      <path d="M112 118 Q118 78 138 69 Q158 78 164 118" fill={`${c}50`} />
      {/* Child — smaller, centered */}
      <circle cx="100" cy="60" r="9" fill={`${c}68`} />
      <path d="M84 118 Q88 90 100 84 Q112 90 116 118" fill={`${c}62`} />
      {/* Arms of parents reaching toward child */}
      <path d="M80 82 Q88 90 92 88" fill="none" stroke={`${c}45`} strokeWidth="3" strokeLinecap="round" />
      <path d="M120 82 Q112 90 108 88" fill="none" stroke={`${c}55`} strokeWidth="3" strokeLinecap="round" />
      {/* Hearts floating */}
      <path d="M100 20 C100 17 96 15 94 17 C92 19 94 22 100 26 C106 22 108 19 106 17 C104 15 100 17 100 20Z" fill={`${c}75`} />
      <path d="M42 48 C42 46 39 44 38 46 C37 48 38 50 42 53 C46 50 47 48 46 46 C45 44 42 46 42 48Z" fill={`${c}55`} />
      <path d="M158 48 C158 46 155 44 154 46 C153 48 154 50 158 53 C162 50 163 48 162 46 C161 44 158 46 158 48Z" fill={`${c}55`} />
    </svg>
  );
  if (id === "health") return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
      <path d="M0 95 Q50 68 100 82 Q150 96 200 76 L200 120 L0 120Z" fill={`${c}20`} />
      <circle cx="105" cy="30" r="11" fill={`${c}52`} />
      <line x1="105" y1="41"  x2="105" y2="64"  stroke={`${c}52`} strokeWidth="4" strokeLinecap="round" />
      <line x1="105" y1="50"  x2="88"  y2="62"  stroke={`${c}52`} strokeWidth="3" strokeLinecap="round" />
      <line x1="105" y1="50"  x2="122" y2="44"  stroke={`${c}52`} strokeWidth="3" strokeLinecap="round" />
      <line x1="105" y1="64"  x2="90"  y2="80"  stroke={`${c}52`} strokeWidth="3" strokeLinecap="round" />
      <line x1="105" y1="64"  x2="120" y2="78"  stroke={`${c}52`} strokeWidth="3" strokeLinecap="round" />
      <polyline points="10,92 38,92 48,72 56,108 64,82 72,92 188,92" fill="none" stroke={`${c}72`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 200 120" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "75%" }} preserveAspectRatio="xMidYMax slice">
      <path d="M0 90 L40 40 L70 70 L110 20 L150 65 L180 38 L200 55 L200 120 L0 120Z" fill={`${c}28`} />
      <path d="M0 105 L30 70 L55 90 L90 50 L125 80 L160 55 L200 75 L200 120 L0 120Z" fill={`${c}45`} />
      <path d="M0 115 L25 90 L50 105 L80 78 L110 100 L145 82 L175 98 L200 88 L200 120 L0 120Z" fill={`${c}60`} />
    </svg>
  );
}

export interface AreaData {
  id: string;
  name: string;
  text: string;
  score: number;
  imageUrl: string;
}

interface PolaroidCardProps {
  area:            AreaData;
  rotation:        number;
  isEmpty?:        boolean;
  accentColor?:    string;
  accentBg?:       string;
  cardWidth?:      number | string;
  variant?:        "polaroid" | "canvas";
  onImageUpload?:  (dataUrl: string) => void;
  onSaveText?:     (text: string) => void;
  onSaveScore?:    (score: number) => void;
  gender?:         string;
}

export default function PolaroidCard({
  area,
  rotation,
  isEmpty,
  accentColor = "#F97316",
  accentBg    = "#FFF7ED",
  cardWidth   = "176px",
  variant     = "polaroid",
  onImageUpload,
  onSaveText,
  onSaveScore,
  gender = "",
}: PolaroidCardProps) {
  const hasContent = area.text.trim().length > 0;
  const w = typeof cardWidth === "number" ? `${cardWidth}px` : cardWidth;

  const cardRef = useRef<HTMLDivElement>(null);
  const [urlDialog, setUrlDialog] = useState(false);
  const [urlInput, setUrlInput]   = useState("");

  function toDriveImgUrl(raw: string): string {
    if (!raw) return raw;
    if (raw.includes("drive.google.com/thumbnail?id=")) return raw;
    let id: string | null = null;
    const fileMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) id = fileMatch[1];
    if (!id) { const m = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/); if (m) id = m[1]; }
    if (!id) { const m = raw.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/); if (m) id = m[1]; }
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1500` : raw;
  }

  function openDialog() {
    setUrlInput(area.imageUrl || "");
    setUrlDialog(true);
  }

  function openUrlDialog(e: React.MouseEvent) {
    e.stopPropagation();
    openDialog();
  }

  function confirmUrl() {
    const resolved = toDriveImgUrl(urlInput.trim());
    onImageUpload?.(resolved);
    setUrlDialog(false);
  }

  function onHover(enter: boolean) {
    const el = cardRef.current;
    if (!el) return;
    if (enter) {
      el.style.transform = `rotate(${rotation * 0.3}deg) translateY(-4px) scale(1.03)`;
      el.style.boxShadow = `0 16px 36px ${accentColor}44`;
      el.style.zIndex = "10";
    } else {
      el.style.transform = `rotate(${rotation}deg)`;
      el.style.boxShadow = `0 4px 16px ${accentColor}22`;
      el.style.zIndex = "";
    }
  }

  if (variant === "canvas") {
    return (
      <>
      <div
        ref={cardRef}
        onClick={openDialog}
        className="cursor-pointer select-none"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
          width: w,
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          backgroundColor: accentBg,
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: `0 4px 16px ${accentColor}22`,
          border: `1.5px solid ${accentColor}33`,
        }}
      >
        {/* Image area */}
        <div style={{
          width: "100%", aspectRatio: "4/3", position: "relative",
          overflow: "hidden",
          background: `linear-gradient(180deg, ${accentBg} 0%, ${accentColor}28 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {area.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={area.imageUrl} alt={area.name}
              referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          ) : (
            <AreaIllustration id={area.id} color={accentColor} />
          )}
          {/* Photo button */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={openUrlDialog}
            style={{
              position: "absolute", top: 8, right: 8,
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: accentColor,
              border: "none", cursor: "pointer", zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            <Camera size={13} color="#FFFFFF" />
          </button>
        </div>

        {/* Bottom strip */}
        <div style={{
          padding: "10px 12px 11px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          borderTop: `2px solid ${accentColor}22`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
            {(() => {
              const Icon = AREA_ICONS[area.id];
              return Icon ? (
                <div style={{
                  width: 24, height: 24, borderRadius: "6px",
                  backgroundColor: accentColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={13} color="#FFFFFF" />
                </div>
              ) : null;
            })()}
            <span style={{ fontSize: "12px", fontWeight: 700, color: accentColor, lineHeight: 1.2 }}>
              {area.name}
            </span>
          </div>
          <span style={{ fontSize: "14px", fontWeight: 800, color: accentColor, flexShrink: 0 }}>
            {area.score}
            <span style={{ fontSize: "10px", fontWeight: 500, color: "#78716C" }}>/10</span>
          </span>
        </div>
      </div>
      <UrlDialog
        open={urlDialog}
        urlInput={urlInput}
        accentColor={accentColor}
        areaName={area.name}
        areaText={area.text}
        areaScore={area.score}
        currentImageUrl={area.imageUrl}
        previewUrl={toDriveImgUrl(urlInput)}
        gender={gender}
        onChange={setUrlInput}
        onConfirm={confirmUrl}
        onClose={() => setUrlDialog(false)}
        onSaveText={onSaveText}
        onSaveScore={onSaveScore}
      />
      </>
    );
  }

  return (
    <>
    <div
      onClick={openDialog}
      className="group cursor-pointer select-none"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
        width: w,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        filter: "drop-shadow(0 6px 16px rgba(28,25,23,0.13))",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation * 0.3}deg) scale(1.04)`;
        (e.currentTarget as HTMLDivElement).style.filter =
          "drop-shadow(0 10px 24px rgba(28,25,23,0.2))";
        (e.currentTarget as HTMLDivElement).style.zIndex = "10";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg) scale(1)`;
        (e.currentTarget as HTMLDivElement).style.filter =
          "drop-shadow(0 6px 16px rgba(28,25,23,0.13))";
        (e.currentTarget as HTMLDivElement).style.zIndex = "";
      }}
    >
      <div
        style={{
          backgroundColor: accentBg,
          padding: "9px 9px 12px",
          borderRadius: "3px",
          borderTop: `3px solid ${accentColor}`,
        }}
      >
        {/* Image area */}
        <div
          style={{
            width: "calc(100% - 0px)",
            height: "118px",
            backgroundColor: "#F2EAE0",
            borderRadius: "2px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {area.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={area.imageUrl}
              alt={area.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ImageIcon size={20} style={{ color: "#D5C9BC" }} />
              <span style={{ fontSize: "9px", color: "#57534E" }}>
                Add vision image
              </span>
            </div>
          )}

          {/* Photo button */}
          <button
            onClick={openUrlDialog}
            style={{
              position: "absolute", top: 6, right: 6,
              width: 24, height: 24, borderRadius: "50%",
              backgroundColor: accentColor,
              border: "none", cursor: "pointer", zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            }}
          >
            <Camera size={11} color="#FFFFFF" />
          </button>

          {/* Add overlay on empty — hide if an image is present */}
          {!hasContent && !area.imageUrl && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(250,245,238,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#F97316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={14} color="#fff" />
              </div>
            </div>
          )}
        </div>

        {/* Text area */}
        <div style={{ paddingTop: "8px", paddingLeft: "2px" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: accentColor,
              marginBottom: "3px",
              lineHeight: 1.2,
            }}
          >
            {area.name}
          </p>
          <p
            style={{
              fontSize: "10px",
              color: "#44403C",
              marginBottom: "4px",
              fontWeight: 500,
            }}
          >
            10-year vision
          </p>

          {hasContent ? (
            <>
              <p
                style={{
                  fontSize: "11px",
                  color: "#44403C",
                  lineHeight: 1.5,
                  marginBottom: "6px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {area.text}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#1C1917",
                    lineHeight: 1,
                  }}
                >
                  {area.score}
                </span>
                <span style={{ fontSize: "13px", color: "#44403C", fontWeight: 500 }}>/10</span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: "11px", color: "#57534E" }}>
              Click to add your vision
            </p>
          )}
        </div>
      </div>

      {/* Pin dot */}
      <div
        style={{
          position: "absolute",
          top: "-8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: "#C9A84C",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          border: "2px solid #FAF5EE",
        }}
      />
    </div>
    <UrlDialog
      open={urlDialog}
      urlInput={urlInput}
      accentColor={accentColor}
      areaName={area.name}
      areaText={area.text}
      areaScore={area.score}
      currentImageUrl={area.imageUrl}
      previewUrl={toDriveImgUrl(urlInput)}
      gender={gender}
      onChange={setUrlInput}
      onConfirm={confirmUrl}
      onClose={() => setUrlDialog(false)}
      onSaveText={onSaveText}
      onSaveScore={onSaveScore}
    />
    </>
  );
}

interface UrlDialogProps {
  open:            boolean;
  urlInput:        string;
  accentColor:     string;
  areaName:        string;
  areaText:        string;
  areaScore:       number;
  currentImageUrl: string;
  previewUrl:      string;
  gender:          string;
  onChange:        (v: string) => void;
  onConfirm:       () => void;
  onClose:         () => void;
  onSaveText?:     (text: string) => void;
  onSaveScore?:    (score: number) => void;
}

function UrlDialog({ open, urlInput, accentColor, areaName, areaText, areaScore, currentImageUrl, previewUrl, gender, onChange, onConfirm, onClose, onSaveText, onSaveScore }: UrlDialogProps) {
  const [copied, setCopied]         = useState(false);
  const [localText, setLocalText]   = useState(areaText);
  const [locked, setLocked]         = useState(false);
  const [localScore, setLocalScore] = useState(areaScore);

  // Reset state each time the dialog opens
  useEffect(() => { if (open) { setLocalText(areaText); setLocked(false); setLocalScore(areaScore); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps


  const genderClause = gender?.toLowerCase() === "female"
    ? "a woman"
    : gender?.toLowerCase() === "male"
    ? "a man"
    : "a person";

  const aiPrompt = `A high-fidelity, cinematic visualization of ${areaName} for ${genderClause} representing: ${localText || `a life of purpose and achievement in ${areaName}`}. Minimalist, inspiring, 8k resolution, photorealistic, warm golden light. --ar 4:3`;

  function handleCopy() {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(28,25,23,0.3)",
          backdropFilter: "blur(2px)",
          zIndex: 9998,
        }}
      />
      {/* Dialog */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(400px, 92vw)",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1.5px solid #E8DDD0",
          boxShadow: "0 20px 60px rgba(28,25,23,0.2)",
          zIndex: 9999,
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #F2EAE0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, backgroundColor: "#FFFFFF",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: accentColor, marginBottom: "1px" }}>
              Vision Image
            </p>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1C1917", margin: 0 }}>
              {areaName}
            </h3>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "8px",
            backgroundColor: accentColor, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={13} color="#FFFFFF" />
          </button>
        </div>

        {/* Scrollbar color */}
        <style>{`
          .vision-dialog-body-${accentColor.replace("#","")}::-webkit-scrollbar { width: 4px; }
          .vision-dialog-body-${accentColor.replace("#","")}::-webkit-scrollbar-track { background: transparent; }
          .vision-dialog-body-${accentColor.replace("#","")}::-webkit-scrollbar-thumb { background: ${accentColor}66; border-radius: 99px; }
          .vision-dialog-body-${accentColor.replace("#","")}::-webkit-scrollbar-thumb:hover { background: ${accentColor}; }
        `}</style>

        {/* Body — scrolls inside the border-radius */}
        <div
          className={`vision-dialog-body-${accentColor.replace("#","")}`}
          style={{ padding: "16px 20px 20px", overflowY: "auto", flex: 1 }}
        >

          {/* Current image (if set) */}
          {currentImageUrl && !urlInput && (
            <div style={{ borderRadius: "10px", overflow: "hidden", height: 180, marginBottom: "14px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentImageUrl} alt="current" referrerPolicy="no-referrer"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* URL input preview */}
          {urlInput && (
            <div style={{ borderRadius: "10px", overflow: "hidden", height: 180, marginBottom: "14px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="preview" referrerPolicy="no-referrer"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {/* Visualization text + save */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "6px",
            }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#1C1917" }}>
                10-Year Visualization
              </label>
              <button
                onClick={handleCopy}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  fontSize: "10px", fontWeight: 600, color: accentColor,
                  cursor: "pointer", background: "none", border: "none", padding: 0,
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied!" : "Copy AI prompt"}
              </button>
            </div>
            {/* Textarea with lock/edit toggle inside */}
            <div style={{ position: "relative" }}>
              <textarea
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                placeholder={`I am living my ideal ${areaName.toLowerCase()} life...`}
                readOnly={locked}
                rows={2}
                style={{
                  width: "100%", padding: "10px 12px 44px",
                  borderRadius: "10px",
                  border: `1.5px solid ${locked ? accentColor + "90" : accentColor + "55"}`,
                  backgroundColor: locked ? `${accentColor}12` : `${accentColor}08`,
                  fontSize: "12px", lineHeight: 1.6, color: "#1C1917",
                  outline: "none", resize: "none", overflow: "hidden", caretColor: accentColor,
                  fontFamily: "inherit", boxSizing: "border-box",
                  cursor: locked ? "default" : "text",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
              />
              {onSaveText && (
                <button
                  onClick={() => {
                    if (!locked) onSaveText(localText);
                    setLocked((v) => !v);
                  }}
                  title={locked ? "Edit" : "Save"}
                  style={{
                    position: "absolute", bottom: 10, right: 10,
                    width: 24, height: 24, borderRadius: "4px",
                    border: `1.5px solid ${locked ? accentColor + "80" : accentColor}`,
                    backgroundColor: locked ? `${accentColor}18` : accentColor,
                    color: locked ? accentColor : "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                    transition: "background-color 0.2s, color 0.2s",
                  }}
                >
                  {locked ? <Pencil size={11} /> : <Check size={11} />}
                </button>
              )}
            </div>
          </div>

          {/* URL input */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 12px", borderRadius: "10px",
            border: `1.5px solid ${accentColor}55`,
            backgroundColor: `${accentColor}08`,
            marginBottom: "6px",
          }}>
            <ImageIcon size={13} color={accentColor} />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste Google Drive or direct image URL…"
              autoFocus
              style={{
                flex: 1, fontSize: "12px", color: "#1C1917",
                outline: "none", border: "none",
                backgroundColor: "transparent", fontFamily: "inherit",
              }}
            />
          </div>

          {/* Google Drive instructions */}
          <p style={{ fontSize: "10px", color: "#1C1917", marginBottom: "14px", lineHeight: 1.5 }}>
            Upload to Google Drive → Share → &ldquo;Anyone with the link&rdquo; → copy link and paste above.
          </p>

          {/* Current Reality Score */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#1C1917", margin: 0 }}>
                Current Reality Score
              </p>
              <span>
                <span style={{ fontSize: "20px", fontWeight: 800, color: accentColor, lineHeight: 1 }}>{localScore}</span>
                <span style={{ fontSize: "11px", fontWeight: 500, color: "#78716C" }}>/10</span>
              </span>
            </div>
            <style>{`
              .score-slider-${accentColor.replace("#", "")}::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px; height: 20px; border-radius: 50%;
                background: ${accentColor};
                cursor: grab; border: 2px solid #fff;
                box-shadow: 0 1px 6px rgba(0,0,0,0.18);
              }
              .score-slider-${accentColor.replace("#", "")}::-moz-range-thumb {
                width: 20px; height: 20px; border-radius: 50%;
                background: ${accentColor};
                cursor: grab; border: 2px solid #fff;
                box-shadow: 0 1px 6px rgba(0,0,0,0.18);
              }
            `}</style>
            <input
              type="range"
              min={1} max={10} step={1}
              value={localScore}
              onChange={(e) => {
                const s = Number(e.target.value);
                setLocalScore(s);
                onSaveScore?.(s);
              }}
              className={`score-slider-${accentColor.replace("#", "")}`}
              style={{
                width: "100%", height: 6, borderRadius: 3,
                appearance: "none", outline: "none", cursor: "pointer",
                background: `linear-gradient(to right, ${accentColor} ${(localScore - 1) / 9 * 100}%, ${accentColor}22 ${(localScore - 1) / 9 * 100}%)`,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between",
              fontSize: "12px", fontWeight: 700, color: accentColor, marginTop: "4px" }}>
              <span>1</span><span>10</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                background: accentColor,
                color: "#FFFFFF", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", boxShadow: `0 4px 12px ${accentColor}44`,
              }}
            >
              Set Image
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "10px 16px", borderRadius: "10px",
                border: "1.5px solid #EF4444", backgroundColor: "#FEF2F2",
                fontSize: "12px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
