/**
 * Maps entity status → HUD color tokens & display labels
 */

export const PROJECT_STATUS_MAP = {
  planning:  { color: "text-hud-amber",     bg: "bg-amber-500/10",  border: "border-amber-500/30",  dot: "bg-hud-amber",  label: "Planning"   },
  active:    { color: "text-hud-cyan",      bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   dot: "bg-hud-cyan",   label: "Active"     },
  paused:    { color: "text-hud-text-dim",  bg: "bg-blue-900/20",   border: "border-hud-border",    dot: "bg-hud-text-dim", label: "Paused"   },
  completed: { color: "text-hud-green",     bg: "bg-green-500/10",  border: "border-green-500/30",  dot: "bg-hud-green",  label: "Completed"  },
  archived:  { color: "text-hud-text-dim",  bg: "bg-gray-800/30",   border: "border-gray-700/30",   dot: "bg-gray-600",   label: "Archived"   },
};

export const TASK_STATUS_MAP = {
  todo:        { color: "text-hud-text-dim", bg: "bg-blue-900/20",  dot: "bg-hud-text-dim", label: "To Do"       },
  in_progress: { color: "text-hud-cyan",     bg: "bg-cyan-500/10",  dot: "bg-hud-cyan",     label: "In Progress" },
  blocked:     { color: "text-hud-red",      bg: "bg-red-500/10",   dot: "bg-hud-red",      label: "Blocked"     },
  done:        { color: "text-hud-green",    bg: "bg-green-500/10", dot: "bg-hud-green",    label: "Done"        },
};

export const PRIORITY_MAP = {
  low:      { color: "text-hud-text-dim", label: "LOW",      icon: "▽" },
  medium:   { color: "text-hud-blue-lt",  label: "MEDIUM",   icon: "◇" },
  high:     { color: "text-hud-amber",    label: "HIGH",     icon: "△" },
  critical: { color: "text-hud-red",      label: "CRITICAL", icon: "▲" },
};

export const IDEA_STATUS_MAP = {
  raw:       { color: "text-hud-text-dim", label: "Raw"       },
  expanded:  { color: "text-hud-cyan",     label: "Expanded"  },
  promoted:  { color: "text-hud-green",    label: "Promoted"  },
  discarded: { color: "text-hud-red",      label: "Discarded" },
};

export const EMAIL_ACTION_MAP = {
  REPLY_NEEDED:     { color: "text-hud-amber", bg: "bg-amber-500/10",  label: "Reply Needed"  },
  ACTION_REQUIRED:  { color: "text-hud-red",   bg: "bg-red-500/10",    label: "Action Req."   },
  READ_ONLY:        { color: "text-hud-cyan",  bg: "bg-cyan-500/10",   label: "Read Only"     },
  FYI:              { color: "text-hud-text-dim", bg: "bg-blue-900/20", label: "FYI"          },
  SPAM:             { color: "text-hud-text-dim", bg: "bg-gray-800/20", label: "Spam"         },
};

export const ESP32_STATUS_MAP = {
  online:  { color: "text-hud-green", dot: "bg-hud-green", label: "ONLINE",  shadow: "shadow-hud-green"  },
  offline: { color: "text-hud-red",   dot: "bg-hud-red",   label: "OFFLINE", shadow: "shadow-hud-red"    },
  pending: { color: "text-hud-amber", dot: "bg-hud-amber", label: "PENDING", shadow: "shadow-hud-amber"  },
};

/**
 * Get a color for a progress value (0–100)
 */
export function progressColor(pct) {
  if (pct >= 80) return "#00FF88";
  if (pct >= 50) return "#00F5FF";
  if (pct >= 25) return "#FFB800";
  return "#FF3860";
}

/**
 * Map a hex color_hex → Tailwind-compatible inline style
 */
export function hexToGlow(hex) {
  if (!hex) return {};
  return { boxShadow: `0 0 8px ${hex}60, 0 0 16px ${hex}30` };
}
