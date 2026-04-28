import type { LifeArea } from "@/lib/dayTypes";

export type BucketStatus = "dreaming" | "planning" | "achieved";

export interface BucketEntry {
  id:          string;
  title:       string;
  description: string;     // where, with whom, what it means
  lifeArea:    LifeArea;
  imageUrl:    string;     // Google Drive URL or direct image URL
  targetDate:  string;     // flexible: "2027", "2026 Q3", "June 2027", ""
  status:      BucketStatus;
  createdAt:   number;
  // Set when moved to Achieved
  achievedAt?:       number;
  memoryPhotoUrl?:   string;
  changeReflection?: string;
}

export function formatTargetDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const suf = [11,12,13].includes(day) ? "th"
    : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  return `${day}${suf} ${d.toLocaleDateString("en-US", { month: "long" })}, ${d.getFullYear()}`;
}

export const COLUMN_META: Record<BucketStatus, {
  label: string;
  subtitle: string;
  accent: string;
  bg: string;
  colBg: string;
  border: string;
}> = {
  dreaming: {
    label:    "Dreaming",
    subtitle: "Your unfiltered wishlist",
    accent:   "#475569",
    bg:       "#F1F5F9",
    colBg:    "#EEF2F6",
    border:   "#CBD5E1",
  },
  planning: {
    label:    "Planning",
    subtitle: "Active with a target in mind",
    accent:   "#B45309",
    bg:       "#FFFBEB",
    colBg:    "#FEF8E7",
    border:   "#FDE68A",
  },
  achieved: {
    label:    "Achieved",
    subtitle: "Moments of legacy",
    accent:   "#0D9488",
    bg:       "#F0FDFA",
    colBg:    "#ECFCF9",
    border:   "#99F6E4",
  },
};
