export type LifeArea =
  | "Health" | "Work" | "Family" | "Learning"
  | "Finance" | "Relationships" | "Personal" | "Spiritual" | "Other";

export const LIFE_AREAS: LifeArea[] = [
  "Health", "Work", "Family", "Learning",
  "Finance", "Relationships", "Personal", "Spiritual", "Other",
];

export const LIFE_AREA_COLORS: Record<LifeArea, string> = {
  Health:        "#10B981",
  Work:          "#6366F1",
  Family:        "#F59E0B",
  Learning:      "#3B82F6",
  Finance:       "#06B6D4",
  Relationships: "#EC4899",
  Personal:      "#8B5CF6",
  Spiritual:     "#F97316",
  Other:         "#9CA3AF",
};

export interface DailyPriority {
  text:      string;
  lifeArea:  LifeArea;
  completed: boolean;
}

export interface DecisionEntry {
  id:        string;
  text:      string;
  made:      boolean;   // false = "to decide", true = "decided"
  createdAt: number;
}

export interface DayIntention {
  date:       string;           // YYYY-MM-DD
  priorities: DailyPriority[];  // up to 3
  gratitude:  string;
  decisions:  DecisionEntry[];
}

export type MoodEmoji = "🤩" | "😊" | "😐" | "😔" | "😤";

export const MOODS: { emoji: MoodEmoji; label: string; color: string }[] = [
  { emoji: "🤩", label: "Amazing", color: "#F97316" },
  { emoji: "😊", label: "Good",    color: "#10B981" },
  { emoji: "😐", label: "Okay",    color: "#78716C" },
  { emoji: "😔", label: "Low",     color: "#6366F1" },
  { emoji: "😤", label: "Rough",   color: "#EF4444" },
];

export interface EveningReflection {
  date:         string;                    // YYYY-MM-DD
  energyLevel:  number;                    // 1–10
  mood:         MoodEmoji | "";
  highlights:   string;
  keyLearnings: string;
  wins:         [string, string, string];
  notes:        string;
}

export interface WeeklyReview {
  weekStart:     string;                   // Monday YYYY-MM-DD
  overallRating: number;                   // 1–10
  highlights:    string;
  keyLearnings:  string;
  wins:          [string, string, string];
  improvements:  string;
  nextWeekFocus: string;
}
