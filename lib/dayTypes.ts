// Canonical 7 life areas — single source of truth used across all modules
export type LifeArea =
  | "professional" | "contribution" | "wealth"
  | "spiritual"    | "personal"     | "relationships" | "health";

export const LIFE_AREAS: LifeArea[] = [
  "professional", "contribution", "wealth",
  "spiritual", "personal", "relationships", "health",
];

export const LIFE_AREA_LABELS: Record<LifeArea, string> = {
  professional:  "Professional",
  contribution:  "Contribution",
  wealth:        "Wealth",
  spiritual:     "Spiritual",
  personal:      "Personal Growth",
  relationships: "Relationships",
  health:        "Health",
};

export const LIFE_AREA_COLORS: Record<LifeArea, string> = {
  professional:  "#2563EB",   // blue
  contribution:  "#16A34A",   // green
  wealth:        "#CA8A04",   // yellow
  spiritual:     "#7C3AED",   // purple
  personal:      "#F97316",   // orange
  relationships: "#DB2777",   // pink
  health:        "#DC2626",   // red
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

export interface DayPlan {
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

export interface StuckEntry {
  id:        string;
  text:      string;
  resolved:  boolean;
  createdAt: number;
}

export interface EveningReflection {
  date:         string;                    // YYYY-MM-DD
  energyLevel:  number;                    // 1–10
  mood:         MoodEmoji | "";
  highlights:   string;
  keyLearnings: string;
  wins:         string[];
  notes:        string;
  stuck:        StuckEntry[];
}

export interface LifeLessonEntry {
  id:       string;
  text:     string;
  lifeArea: LifeArea;
}

export interface CoreValueEntry {
  id:    string;
  value: string;
  note:  string;
}

export interface JournalSection {
  id:      string;
  heading: string;
  body:    string;
}

export interface WeeklyReview {
  weekStart:       string;          // Monday YYYY-MM-DD
  // Section 1: Top Wins (each win is linked to a day of the week)
  topWins:         { id: string; date: string; text: string }[];
  // Section 2: Outcome Review
  outcomeNotes:    string;
  outcomeChecked:  boolean[];
  // Section 3: Task Review
  taskReflection:  string;
  // Section 4: Habits Review
  habitReflection: string;
  overallRating:   number;          // 1–10
  // Section 5: Weekly Journal
  journalDate:     string;          // YYYY-MM-DD within the week
  journalText:     string;
  journalSections: JournalSection[];
  // Section 6: Life Lessons
  lifeLessons:     LifeLessonEntry[];
  // Section 7: Core Values Lived
  coreValuesLived: CoreValueEntry[];
}
