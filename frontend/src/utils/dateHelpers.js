import {
  format, formatDistanceToNow, isToday, isTomorrow,
  isPast, differenceInDays, parseISO, isValid,
} from "date-fns";

/**
 * Parse a date value (string | Date | null) → Date | null
 */
export function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  const parsed = parseISO(val);
  return isValid(parsed) ? parsed : null;
}

/**
 * Format for display — "Today", "Tomorrow", "Jan 15", "Jan 15, 2024"
 */
export function formatDate(val, opts = {}) {
  const d = toDate(val);
  if (!d) return "—";
  if (isToday(d))    return opts.showTime ? `Today ${format(d, "HH:mm")}` : "Today";
  if (isTomorrow(d)) return "Tomorrow";
  const thisYear = new Date().getFullYear();
  return d.getFullYear() === thisYear
    ? format(d, "MMM d")
    : format(d, "MMM d, yyyy");
}

/**
 * "2 hours ago", "in 3 days"
 */
export function timeAgo(val) {
  const d = toDate(val);
  if (!d) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Clock display: "14:32:05"
 */
export function formatTime(date = new Date()) {
  return format(date, "HH:mm:ss");
}

/**
 * Full date: "MONDAY, 23 APR 2026"
 */
export function formatFullDate(date = new Date()) {
  return format(date, "EEEE, d MMM yyyy").toUpperCase();
}

/**
 * Is a due date overdue?
 */
export function isOverdue(val) {
  const d = toDate(val);
  return d ? isPast(d) && !isToday(d) : false;
}

/**
 * Days until due (negative = overdue)
 */
export function daysUntil(val) {
  const d = toDate(val);
  return d ? differenceInDays(d, new Date()) : null;
}

/**
 * "HH:mm" from a time string "HH:mm:ss" or "HH:mm"
 */
export function formatTimeShort(timeStr) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

/**
 * Returns the current day name lowercase: "monday"
 */
export function todayName() {
  return format(new Date(), "EEEE").toLowerCase();
}
