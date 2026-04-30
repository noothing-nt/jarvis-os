import { useState, useEffect, useRef } from "react";
import { format, isToday, isPast, parseISO } from "date-fns";
import {
  Plus, CheckCircle2, Circle, Clock, Bell,
  Calendar, Trash2, Play, Pause, Square,
  Flag, MoreHorizontal, GraduationCap,
  AlarmClock, ChevronDown, ChevronRight,
} from "lucide-react";
import Badge  from "@/components/shared/Badge";
import Modal  from "@/components/shared/Modal";
import clsx   from "clsx";

/* ── Pomodoro Timer ──────────────────────────────────────────────── */
function PomodoroTimer() {
  const MODES = {
    work:       { label: "Focus",       seconds: 25 * 60, color: "#2F81F7" },
    short_break:{ label: "Short Break", seconds:  5 * 60, color: "#3FB950" },
    long_break: { label: "Long Break",  seconds: 15 * 60, color: "#A371F7" },
  };

  const [mode,    setMode]    = useState("work");
  const [seconds, setSeconds] = useState(MODES.work.seconds);
  const [running, setRunning] = useState(false);
  const [count,   setCount]   = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(ref.current);
            setRunning(false);
            setCount((c) => c + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [running]);

  const switchMode = (m) => {
    setMode(m);
    setSeconds(MODES[m].seconds);
    setRunning(false);
  };

  const reset = () => {
    setSeconds(MODES[mode].seconds);
    setRunning(false);
  };

  const m   = Math.floor(seconds / 60);
  const s   = seconds % 60;
  const pct = ((MODES[mode].seconds - seconds) / MODES[mode].seconds) * 100;
  const cfg = MODES[mode];
  const r   = 54;
  const circ = 2 * Math.PI * r;

  return (
    <div className="nx-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md font-semibold text-primary">Focus Timer</h2>
        <div className="flex items-center gap-1 text-2xs text-muted">
          <AlarmClock size={12} />
          <span>{count} sessions today</span>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-5 bg-surface rounded-lg p-0.5">
        {Object.entries(MODES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={clsx(
              "flex-1 py-1.5 rounded text-xs font-medium transition-all",
              mode === key
                ? "bg-raised text-primary shadow-sm"
                : "text-muted hover:text-secondary"
            )}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* SVG ring timer */}
      <div className="flex flex-col items-center">
        <div className="relative w-36 h-36 mb-5">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#21262D" strokeWidth="6" />
            <circle
              cx="60" cy="60" r={r}
              fill="none"
              stroke={cfg.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - (pct / 100) * circ}
              style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 6px ${cfg.color}80)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-bold text-primary tabular-nums">
              {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted mt-0.5">{cfg.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={reset} className="btn btn-ghost btn-icon">
            <Square size={16} />
          </button>
          <button
            onClick={() => setRunning((v) => !v)}
            className="btn btn-sm gap-2 px-6"
            style={{
              background: cfg.color,
              borderColor: cfg.color,
              color: "#fff",
            }}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? "Pause" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Schedule block ──────────────────────────────────────────────── */
const SCHEDULE = [];

/* ── Task data ───────────────────────────────────────────────────── */
const INITIAL_TASKS = [];

const PRIORITY_MAP = {
  critical: { badge: "red",   icon: "🔴" },
  high:     { badge: "red",   icon: "🟠" },
  medium:   { badge: "amber", icon: "🟡" },
  low:      { badge: "gray",  icon: "⚪" },
};

const STATUS_MAP = {
  todo:        { label: "To Do",       badge: "gray"  },
  in_progress: { label: "In Progress", badge: "blue"  },
  done:        { label: "Done",        badge: "green" },
};

export default function DailyOps() {
  const [tasks,   setTasks]   = useState(INITIAL_TASKS);
  const [tab,     setTab]     = useState("tasks");
  const [showNew, setShowNew] = useState(false);
  const [filter,  setFilter]  = useState("all");
  const [form,    setForm]    = useState({
    title: "", priority: "medium", due: "", tags: "",
  });

  const now   = new Date();
  const today = format(now, "HH:mm");

  const filtered = tasks.filter((t) => {
    if (filter === "today")   return t.due === format(now, "yyyy-MM-dd");
    if (filter === "active")  return t.status !== "done";
    if (filter === "done")    return t.status === "done";
    return true;
  });

  const done    = tasks.filter((t) => t.status === "done").length;
  const total   = tasks.length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t
      )
    );
  };

  const deleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const createTask = () => {
    if (!form.title.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id:       Date.now(),
        title:    form.title,
        priority: form.priority,
        status:   "todo",
        due:      form.due || format(now, "yyyy-MM-dd"),
        tags:     form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
      },
    ]);
    setForm({ title: "", priority: "medium", due: "", tags: "" });
    setShowNew(false);
  };

  /* Next scheduled class */
  const nextClass = SCHEDULE.find((s) => s.start > today);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Daily Ops</h1>
          <p className="text-sm text-muted mt-0.5">
            {format(now, "EEEE, MMMM d")} · {done}/{total} tasks complete
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-blue btn-sm gap-1.5">
          <Plus size={13} /> New Task
        </button>
      </div>

      {/* ── Day progress ───────────────────────────────────── */}
      <div className="nx-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary">Day Progress</span>
          <span className={clsx(
            "text-sm font-bold",
            pct >= 75 ? "text-success" : pct >= 50 ? "text-accent-hover" : "text-warning"
          )}>
            {pct}%
          </span>
        </div>
        <div className="nx-progress" style={{ height: 8 }}>
          <div
            className="nx-progress-fill"
            style={{
              width: `${pct}%`,
              background: pct >= 75
                ? "linear-gradient(90deg,#3FB950,#56D364)"
                : pct >= 50
                  ? "linear-gradient(90deg,#2F81F7,#388BFD)"
                  : "linear-gradient(90deg,#D29922,#E3B341)",
              boxShadow: "0 0 8px rgba(47,129,247,0.4)",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-2xs text-muted">{done} done</span>
          <span className="text-2xs text-muted">{total - done} remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left: Tasks ────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="nx-tabs">
            {[
              { id: "tasks",    label: "Tasks"    },
              { id: "schedule", label: "Schedule" },
              { id: "habits",   label: "Habits"   },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx("nx-tab", tab === t.id && "active")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tasks Tab ──────────────────────────────────── */}
          {tab === "tasks" && (
            <div className="nx-card overflow-hidden">
              {/* Filter bar */}
              <div className="flex items-center gap-1 px-4 py-3 border-b border-border-subtle">
                {["all","today","active","done"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      "px-3 py-1 rounded text-xs font-medium transition-all",
                      filter === f
                        ? "bg-accent-subtle text-accent-hover"
                        : "text-muted hover:text-secondary"
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Task list */}
              <div className="divide-y divide-border-subtle">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-muted text-sm">
                    No tasks match this filter
                  </div>
                ) : (
                  filtered.map((task) => {
                    const overdue = task.due && isPast(parseISO(task.due)) && task.status !== "done";
                    return (
                      <div
                        key={task.id}
                        className={clsx(
                          "flex items-center gap-3 px-4 py-3 group transition-colors",
                          "hover:bg-surface",
                          task.status === "done" && "opacity-60"
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex-shrink-0 transition-transform hover:scale-110"
                        >
                          {task.status === "done"
                            ? <CheckCircle2 size={17} className="text-success" />
                            : <Circle       size={17} className="text-muted hover:text-success transition-colors" />
                          }
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            "text-sm",
                            task.status === "done" ? "line-through text-muted" : "text-primary"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {task.due && (
                              <span className={clsx(
                                "flex items-center gap-1 text-2xs",
                                overdue ? "text-danger" : "text-muted"
                              )}>
                                <Calendar size={10} />
                                {format(parseISO(task.due), "MMM d")}
                                {overdue && " · Overdue"}
                              </span>
                            )}
                            {task.tags.map((tag) => (
                              <span key={tag} className="badge badge-gray text-2xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={PRIORITY_MAP[task.priority]?.badge || "gray"}>
                            {task.priority}
                          </Badge>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={13} className="text-danger" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add quick task */}
              <div className="px-4 py-3 border-t border-border-subtle">
                <button
                  onClick={() => setShowNew(true)}
                  className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors"
                >
                  <Plus size={14} /> Add a task...
                </button>
              </div>
            </div>
          )}

          {/* ── Schedule Tab ───────────────────────────────── */}
          {tab === "schedule" && (
            <div className="nx-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                <GraduationCap size={16} className="text-accent-hover" />
                <span className="text-sm font-semibold text-primary">
                  Today — {format(now, "EEEE, MMM d")}
                </span>
              </div>
              <div className="p-4 space-y-2">
                {SCHEDULE.map((cls) => {
                  const isNow = cls.start <= today && cls.end >= today;
                  const isPastCls = cls.end < today;
                  return (
                    <div
                      key={cls.id}
                      className={clsx(
                        "flex items-center gap-4 p-3 rounded-lg border transition-all",
                        isNow
                          ? "border-accent/40 bg-accent-subtle"
                          : isPastCls
                            ? "border-border-subtle opacity-50"
                            : "border-border-subtle hover:border-border"
                      )}
                    >
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ background: cls.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary truncate">
                            {cls.title}
                          </span>
                          {isNow && (
                            <span className="badge badge-blue text-2xs">NOW</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <Clock size={10} />
                            {cls.start} – {cls.end}
                          </span>
                          <span className="text-2xs text-muted">{cls.room}</span>
                          <span className="badge badge-gray text-2xs">{cls.type}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Habits Tab ─────────────────────────────────── */}
          {tab === "habits" && (
            <div className="nx-card p-5">
              <div className="space-y-3">
                {[
                  
                ].map((h) => (
                  <div
                    key={h.name}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border-subtle hover:border-border transition-colors"
                  >
                    <button
                      className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                        h.done
                          ? "border-success bg-success"
                          : "border-border hover:border-success"
                      )}
                    >
                      {h.done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <div
                      className="w-2 h-8 rounded-full flex-shrink-0"
                      style={{ background: h.color, opacity: h.done ? 1 : 0.4 }}
                    />
                    <span className={clsx(
                      "flex-1 text-sm",
                      h.done ? "text-primary" : "text-secondary"
                    )}>
                      {h.name}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
                      <span>🔥</span>
                      <span className="font-semibold text-warning-light">{h.streak}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right col ──────────────────────────────────────── */}
        <div className="space-y-5">
          <PomodoroTimer />

          {/* Next class */}
          {nextClass && (
            <div className="nx-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={14} className="text-accent-hover" />
                <span className="text-sm font-semibold text-primary">Next Up</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-subtle border border-accent/20">
                <div className="w-1 h-12 rounded-full" style={{ background: nextClass.color }} />
                <div>
                  <p className="text-sm font-semibold text-primary">{nextClass.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {nextClass.start} · {nextClass.room}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="nx-card p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Today's Stats</h3>
            <div className="space-y-3">
              {[
                { label: "Tasks Done",    value: done,          unit: `/ ${total}`, color: "text-success"        },
                { label: "Focus Time",    value: " ",      unit: "",           color: "text-accent-hover"    },
                { label: "Streak",        value: " ",     unit: "",           color: "text-warning-light"   },
                { label: "XP Today",      value: " ",        unit: "xp",         color: "text-purple-light"    },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className={clsx("text-sm font-bold", color)}>
                    {value}
                    {unit && <span className="text-2xs text-muted font-normal ml-1">{unit}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── New task modal ──────────────────────────────────── */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New Task"
        subtitle="Add to your daily operations queue"
        size="sm"
        footer={
          <>
            <button className="btn btn-default" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn btn-blue" onClick={createTask}>Create</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="nx-label">Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
              placeholder="What needs to be done?"
              className="nx-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="nx-label">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="nx-input nx-select"
              >
                {["low","medium","high","critical"].map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="nx-label">Due Date</label>
              <input
                type="date"
                value={form.due}
                onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
                className="nx-input"
              />
            </div>
          </div>
          <div>
            <label className="nx-label">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="backend, urgent, research"
              className="nx-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}