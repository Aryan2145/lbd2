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

export const LIFE_AREA_EMOJI: Record<LifeArea, string> = {
  Health:        "💪",
  Work:          "💼",
  Family:        "❤️",
  Learning:      "📚",
  Finance:       "💰",
  Relationships: "🤝",
  Personal:      "🌟",
  Spiritual:     "✨",
  Other:         "🎯",
};

export const COLUMN_META: Record<BucketStatus, {
  label: string;
  subtitle: string;
  accent: string;
  bg: string;
  border: string;
}> = {
  dreaming: {
    label:    "Dreaming",
    subtitle: "Your unfiltered wishlist",
    accent:   "#6366F1",
    bg:       "#F5F3FF",
    border:   "#C4B5FD",
  },
  planning: {
    label:    "Planning",
    subtitle: "Active with a target in mind",
    accent:   "#F97316",
    bg:       "#FFF7ED",
    border:   "#FED7AA",
  },
  achieved: {
    label:    "Achieved",
    subtitle: "Moments of legacy",
    accent:   "#10B981",
    bg:       "#F0FDF4",
    border:   "#BBF7D0",
  },
};
