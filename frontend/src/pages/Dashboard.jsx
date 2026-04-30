import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { useApp }              from "@/App";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2, Clock, Zap, TrendingUp,
  FolderOpen, Brain, ArrowRight, Plus,
  Activity, Target, Flame, Star,
  ExternalLink, MoreHorizontal, RefreshCw,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useApp as useCtx } from "@/App";
import Badge from "@/components/shared/Badge";
import { Skeleton, SkeletonCard } from "@/components/shared/Skeleton";
/* ── Real Data Integration Ready ─────────────────────────── */
const ACTIVITY_DATA = [];
const TASK_DATA = [];
const RECENT_ACTIVITY = [];
const PINNED_PROJECTS = [];
const TODAY_TASKS = [];

const STAT_CARDS = [
  { label: "Tasks Completed", value: "0", sub: "0 today", icon: CheckCircle2, color: "green", trend: "0%", trendUp: true },
  { label: "Active Projects", value: "0", sub: "0 due", icon: FolderOpen, color: "blue", trend: "0", trendUp: true },
  { label: "Focus Hours", value: "0", sub: "this week", icon: Clock, color: "purple", trend: "0h", trendUp: true },
  { label: "XP Earned", value: "0", sub: "Level 1", icon: Zap, color: "amber", trend: "0", trendUp: true },
  { label: "Streak", value: "0 days", sub: "Personal best: 0", icon: Flame, color: "red", trend: "-", trendUp: true },
  { label: "Ideas Captured", value: "0", sub: "0 promoted", icon: Brain, color: "teal", trend: "0", trendUp: true },
];

const PRIORITY_COLORS = {
  high:   "badge-red",
  medium: "badge-amber",
  low:    "badge-gray",
};

/* ── Custom tooltip ─────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-overlay border border-border rounded-lg px-3 py-2 shadow-modal text-xs">
      <p className="text-secondary font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-muted capitalize">{p.name}:</span>
          <span className="text-primary font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function Dashboard() {
  const { user }      = useApp();
  const navigate      = useNavigate();
  const [tasks, setTasks] = useState(TODAY_TASKS);
  const [loading, setLoading] = useState(true);

  const name = user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "there";

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, done: !t.done } : t)
    );
  };

  const doneTasks = tasks.filter((t) => t.done).length;
  const pct       = Math.round((doneTasks / tasks.length) * 100);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {greeting}, {name} 👋
          </h1>
          <p className="text-sm text-muted mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")} · Here's your command overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/work")}
            className="btn btn-default btn-sm gap-1.5"
          >
            <Target size={13} />
            Open Work Center
          </button>
          <button
            onClick={() => navigate("/daily")}
            className="btn btn-blue btn-sm gap-1.5"
          >
            <Plus size={13} />
            Add Task
          </button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="stat-card">
              <Skeleton className="h-3 w-2/3 mb-3" />
              <Skeleton className="h-7 w-1/2 mb-2" />
              <Skeleton className="h-2.5 w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAT_CARDS.map(({ label, value, sub, icon: Icon, color, trend, trendUp }) => (
            <div key={label} className={`stat-card ${color}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted uppercase tracking-wide">
                  {label}
                </span>
                <Icon size={14} className={`text-${
                  color === "green"  ? "success"       :
                  color === "blue"   ? "accent-hover"  :
                  color === "purple" ? "purple-400"    :
                  color === "amber"  ? "warning-light" :
                  color === "red"    ? "danger-light"  :
                  "teal-400"
                }`} />
              </div>
              <div className="text-2xl font-bold text-primary mb-1">{value}</div>
              <div className="flex items-center justify-between">
                <span className="text-2xs text-muted">{sub}</span>
                <span className={`text-2xs font-semibold ${trendUp ? "text-success" : "text-danger"}`}>
                  {trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left col (charts) ────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Activity chart */}
          <div className="nx-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-md font-semibold text-primary">Activity Overview</h2>
                <p className="text-xs text-muted">Last 14 days of output</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                {[
                  { color: "#2F81F7", label: "Tasks"  },
                  { color: "#A371F7", label: "Ideas"  },
                  { color: "#2FBFA5", label: "Notes"  },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={ACTIVITY_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  {[
                    { id: "tasks", color: "#2F81F7" },
                    { id: "ideas", color: "#A371F7" },
                    { id: "notes", color: "#2FBFA5" },
                  ].map(({ id, color }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={color} stopOpacity={0}   />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#484F58", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#484F58", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="tasks" stroke="#2F81F7" fill="url(#tasks)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="ideas" stroke="#A371F7" fill="url(#ideas)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="notes" stroke="#2FBFA5" fill="url(#notes)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly task completion */}
          <div className="nx-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-md font-semibold text-primary">Weekly Task Completion</h2>
                <p className="text-xs text-muted">Tasks done vs total this week</p>
              </div>
              <span className="badge badge-green">82% avg</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={TASK_DATA} margin={{ top: 0, right: 0, bottom: 0, left: -25 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#484F58", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#484F58", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill="#21262D"  radius={[3,3,0,0]} maxBarSize={28} />
                <Bar dataKey="done"  fill="#3FB950"  radius={[3,3,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pinned projects */}
          <div className="nx-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-md font-semibold text-primary">Pinned Projects</h2>
                <p className="text-xs text-muted">{PINNED_PROJECTS.length} active projects</p>
              </div>
              <button
                onClick={() => navigate("/vault")}
                className="btn btn-ghost btn-sm gap-1"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {PINNED_PROJECTS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate("/vault")}
                  className="group flex items-center gap-4 p-3 rounded-lg
                             border border-border-subtle hover:border-accent/30
                             hover:bg-surface cursor-pointer transition-all"
                >
                  {/* Color bar */}
                  <div className={`w-1 h-10 rounded-full flex-shrink-0 bg-${
                    p.color === "blue"   ? "accent"        :
                    p.color === "green"  ? "success"       :
                    "purple-400"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-primary truncate">
                        {p.title}
                      </span>
                      <Badge variant={p.status === "active" ? "green" : "amber"} dot>
                        {p.status}
                      </Badge>
                      <span className="badge badge-gray text-2xs ml-auto">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 nx-progress">
                        <div
                          className={`nx-progress-fill bg-${
                            p.color === "blue"   ? "accent"   :
                            p.color === "green"  ? "success"  :
                            "purple-400"
                          }`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted w-8 text-right flex-shrink-0">
                        {p.progress}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted">{p.tasks} tasks</div>
                    <ArrowRight
                      size={13}
                      className="text-muted group-hover:text-accent ml-auto mt-1 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right col ────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Today's tasks */}
          <div className="nx-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-md font-semibold text-primary">Today's Tasks</h2>
                <p className="text-xs text-muted">{doneTasks}/{tasks.length} complete</p>
              </div>
              <button
                onClick={() => navigate("/daily")}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <ExternalLink size={13} />
              </button>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted mb-1.5">
                <span>Progress</span>
                <span className="font-semibold text-primary">{pct}%</span>
              </div>
              <div className="nx-progress">
                <div
                  className="nx-progress-fill"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 80
                      ? "linear-gradient(90deg, #3FB950, #56D364)"
                      : pct >= 50
                        ? "linear-gradient(90deg, #2F81F7, #388BFD)"
                        : "linear-gradient(90deg, #D29922, #E3B341)",
                  }}
                />
              </div>
            </div>

            {/* Task list */}
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 rounded-md
                             hover:bg-surface transition-colors group"
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center
                                justify-center transition-all
                                ${task.done
                                  ? "bg-success border-success"
                                  : "border-border hover:border-success"
                                }`}
                  >
                    {task.done && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm truncate ${task.done ? "line-through text-muted" : "text-primary"}`}>
                    {task.title}
                  </span>
                  <span className={`badge text-2xs flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/daily")}
              className="btn btn-ghost btn-sm w-full mt-3 gap-1.5"
            >
              <Plus size={12} /> Add task
            </button>
          </div>

          {/* Live activity feed */}
          <div className="nx-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-md font-semibold text-primary">Live Activity</h2>
                <p className="text-xs text-muted">Recent system events</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="dot dot-green animate-ping-slow" />
                <span className="text-2xs text-success font-medium">LIVE</span>
              </div>
            </div>

            <div className="space-y-0">
              {RECENT_ACTIVITY.map((item, i) => (
                <div key={item.id} className="activity-item">
                  <div className="activity-dot-line">
                    <span className={`dot ${item.color} mt-1`} />
                    {i < RECENT_ACTIVITY.length - 1 && (
                      <div className="activity-line" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-3">
                    <p className="text-xs text-secondary leading-snug">{item.text}</p>
                    <span className="text-2xs text-muted">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick AI panel */}
          <div className="nx-card p-5 border-accent/20"
               style={{ background: "linear-gradient(135deg, #0D1117, #0D2340)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30
                              flex items-center justify-center">
                <Brain size={14} className="text-accent-hover" />
              </div>
              <div>
                <div className="text-sm font-semibold text-primary">JARVIS AI</div>
                <div className="text-2xs text-success flex items-center gap-1">
                  <span className="dot dot-green w-1.5 h-1.5" /> Online
                </div>
              </div>
            </div>
            <p className="text-xs text-secondary mb-3 leading-relaxed">
              Ask me anything about your projects, get ideas brainstormed, or summarize your emails.
            </p>
            <button
              onClick={() => navigate("/intel")}
              className="btn btn-blue btn-sm w-full gap-1.5"
            >
              <Brain size={13} />
              Open AI Center
              <ArrowRight size={12} className="ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}