"use client";

import Link from "next/link";
import {
  Eye, ArrowRight,
  Briefcase, Globe, DollarSign, Sparkles, BookOpen, Heart, Activity,
  type LucideIcon,
} from "lucide-react";
import type { LifeArea } from "./GoalCard";
import { AREA_META } from "./GoalCard";

const AREA_ICONS: Record<LifeArea, LucideIcon> = {
  professional:  Briefcase,
  contribution:  Globe,
  wealth:        DollarSign,
  spiritual:     Sparkles,
  personal:      BookOpen,
  relationships: Heart,
  health:        Activity,
};

interface Props {
  area: LifeArea;
  text: string;
  style?: React.CSSProperties;
}

/**
 * Anchors a goal to the vision statement of its life area. The vision text is
 * resolved live by area (see `visionTextForArea` in AppStore) — when empty,
 * we nudge the user to write one on the Vision page rather than hiding it.
 */
export default function VisionBanner({ area, text, style }: Props) {
  const { label, color, bg } = AREA_META[area];
  const Icon = AREA_ICONS[area];

  return (
    <div
      style={{
        backgroundColor: bg,
        border: `1px solid ${color}30`,
        borderRadius: "14px",
        padding: "14px 16px",
        ...style,
      }}
    >
      {/* Eyebrow */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={12} color="#FFFFFF" />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Your {label} Vision
        </span>
      </div>

      {text ? (
        <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "15px", lineHeight: 1.55, color: "#1C1917", margin: 0 }}>
          &ldquo;{text}&rdquo;
        </p>
      ) : (
        <div>
          <p style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500, color: "#57534E", margin: "0 0 8px" }}>
            <Eye size={13} color={color} style={{ flexShrink: 0 }} />
            No vision written for {label} yet.
          </p>
          <Link
            href="/vision"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color, textDecoration: "none" }}
          >
            Write your {label} vision <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
