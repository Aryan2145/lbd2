// Shared date constraints for form date pickers across the app.
// Global range: today → 2100-12-31.
// Goals / milestones use a tighter cap: today + MAX_GOAL_DAYS.

export const MAX_DATE_STR  = "2100-12-31";
export const MAX_GOAL_DAYS = 9999;

export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns YYYY-MM-DD string for today + MAX_GOAL_DAYS days. */
export function maxGoalDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_GOAL_DAYS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Human-readable version: "27 Apr 2053" */
export function maxGoalDateDisplay(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_GOAL_DAYS);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Validate a YYYY-MM-DD date string against the global rules.
 * - `required: true`  → empty string is an error.
 * - `maxDate`         → override the upper bound (defaults to MAX_DATE_STR).
 * Returns null when the value is acceptable.
 */
export function validateDate(
  value: string,
  opts?: { required?: boolean; maxDate?: string; maxDateLabel?: string },
): string | null {
  if (!value) return opts?.required ? "Please pick a date." : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Invalid date format.";
  const today  = todayDateStr();
  const maxStr = opts?.maxDate ?? MAX_DATE_STR;
  if (value < today)   return "Date can't be in the past.";
  if (value > maxStr) {
    const label = opts?.maxDateLabel ?? maxStr;
    return `Date must be on or before ${label}.`;
  }
  return null;
}

/**
 * Validate a goal or milestone deadline.
 * Blocks past dates and dates beyond today + 9,999 days.
 */
export function validateGoalDate(
  value: string,
  opts?: { required?: boolean },
): string | null {
  const max   = maxGoalDateStr();
  const label = `${maxGoalDateDisplay()} (max ${MAX_GOAL_DAYS.toLocaleString()} days from today)`;
  return validateDate(value, { required: opts?.required, maxDate: max, maxDateLabel: label });
}
