/**
 * Shared formatting utilities used across modules
 */

/**
 * Truncate text to maxLength with ellipsis
 */
export function truncate(str = "", maxLength = 80) {
  if (!str) return "";
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}

/**
 * Format Indian Rupee amounts
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style:    "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with commas: 10000 → "10,000"
 */
export function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}

/**
 * Capitalize first letter
 */
export function capitalize(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert snake_case → Title Case
 */
export function snakeToTitle(str = "") {
  return str
    .split("_")
    .map((w) => capitalize(w))
    .join(" ");
}

/**
 * Clamp a number between min and max
 */
export function clamp(val, min = 0, max = 100) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Format bytes to human-readable
 */
export function formatBytes(bytes = 0) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate a random hex color in HUD palette range
 */
export function randomHudColor() {
  const colors = [
    "#00F5FF","#1B6CA8","#FFB800","#00FF88",
    "#FF3860","#9B59B6","#E67E22","#2ECC71",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}