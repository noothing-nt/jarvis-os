
export const APP_NAME    = import.meta.env.VITE_APP_NAME    || "JARVIS OS";
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
export const API_URL     = import.meta.env.VITE_API_URL     || "http://localhost:8000";

export const MODULES = [
  { id: "command",   label: "Command Center",   icon: "CommandLineIcon",   path: "/"          },
  { id: "projects",  label: "Project Hub",      icon: "FolderOpenIcon",    path: "/projects"  },
  { id: "comms",     label: "Unified Comms",    icon: "EnvelopeIcon",      path: "/comms"     },
  { id: "growth",    label: "Growth Tracker",   icon: "ChartBarIcon",      path: "/growth"    },
  { id: "hardware",  label: "Hardware Bridge",  icon: "CpuChipIcon",       path: "/hardware"  },
];

export const PROJECT_STATUSES = ["planning", "active", "paused", "completed", "archived"];
export const PROJECT_PRIORITIES = ["low", "medium", "high", "critical"];
export const PROJECT_CATEGORIES = [
  "embedded", "web", "mobile", "ai_ml", "automation",
  "research", "design", "other",
];

export const TASK_STATUSES   = ["todo", "in_progress", "blocked", "done"];
export const TASK_PRIORITIES = ["low", "medium", "high", "critical"];

export const IDEA_STATUSES = ["raw", "expanded", "promoted", "discarded"];

export const DAYS_OF_WEEK = [
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
];

export const XP_PER_TASK = {
  low:      10,
  medium:   20,
  high:     35,
  critical: 50,
};

export const PAGINATION_DEFAULT = 20;
export const POLL_INTERVAL_MS   = 5 * 60 * 1000; // 5 minutes