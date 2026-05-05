// Shared date constraints for form date pickers across the app.
// Range: today → 2100-12-31. Past dates and dates after 2100 are blocked.

export const MAX_DATE_STR = "2100-12-31";

export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Validate a YYYY-MM-DD date string against the global rules.
 * - `required: true` → empty string returns an error.
 * - Empty string with `required: false` returns null (caller treats as "no date").
 * Returns null when the value is acceptable.
 */
export function validateDate(value: string, opts?: { required?: boolean }): string | null {
  if (!value) return opts?.required ? "Please pick a date." : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Invalid date format.";
  const today = todayDateStr();
  if (value < today)         return "Date can't be in the past.";
  if (value > MAX_DATE_STR)  return "Date must be on or before 2100-12-31.";
  return null;
}
