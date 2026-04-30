import { useState, useEffect } from "react";
import HudCard                 from "@/components/ui/HudCard";
import GlowBadge               from "@/components/ui/GlowBadge";
import LoadingHud              from "@/components/ui/LoadingHud";
import StatsWidget             from "./StatsWidget";
import ActivityHeatmap         from "./ActivityHeatmap";
import { useProjectStore }     from "@/store/useProjectStore";
import { useTaskStore }        from "@/store/useTaskStore";
import api                     from "@/services/api";
import {
  ChartBarIcon,
  TrophyIcon,
  BoltIcon,
  FireIcon,
} from "@heroicons/react/24/outline";

export default function GrowthTracker() {
  const { projects, stats: projectStats, fetchStats } = useProjectStore();
  const { tasks, todayTasks, overdue }                 = useTaskStore();
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, []); // eslint-disable-line

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/activity_logs", { params: { limit: 200 } });
      setLogs(res.data?.items || res.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  /* ── Derived metrics ────────────────────────────────────────── */
  const completedTasks  = tasks.filter((t) => t.status === "done");
  const completedPct    = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const xpTotal = completedTasks.reduce((acc, t) => {
    const xpMap = { low: 10, medium: 20, high: 35, critical: 50 };
    return acc + (xpMap[t.priority] || 20);
  }, 0);

  const level    = Math.floor(xpTotal / 200) + 1;
  const xpInLevel = xpTotal % 200;
  const xpPct    = Math.round((xpInLevel / 200) * 100);

  const activeProjects    = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  /* ── Task completion by priority ────────────────────────────── */
  const byPriority = ["low", "medium", "high", "critical"].map((p) => ({
    label: p.toUpperCase(),
    done:  completedTasks.filter((t) => t.priority === p).length,
    total: tasks.filter((t) => t.priority === p).length,
  }));

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="font-hud text-lg text-hud-cyan text-glow-cyan tracking-widest uppercase">
          Growth Tracker
        </h1>
        <div className="module-header-line" />
        <p className="mt-1 font-mono text-xs text-hud-text-dim">
          Personal performance analytics &amp; XP system
        </p>
      </div>

      {/* ── XP / Level Card ───────────────────────────────────── */}
      <HudCard className="p-6" glow="cyan" scanline>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Level badge */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute inset-0 rotate-ring-rev" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28"
                  fill="none" stroke="rgba(0,245,255,0.1)" strokeWidth="2" />
                <circle cx="32" cy="32" r="28"
                  fill="none" stroke="#00F5FF" strokeWidth="2"
                  strokeDasharray={`${xpPct * 1.759} 175.9`}
                  strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                  style={{ filter: "drop-shadow(0 0 4px #00F5FF)" }}
                />
              </svg>
              <div className="z-10 text-center">
                <div className="font-hud text-xl text-hud-cyan leading-none">{level}</div>
                <div className="font-mono text-[8px] text-hud-text-dim">LVL</div>
              </div>
            </div>

            <div>
              <div className="font-hud text-2xl text-hud-cyan text-glow-cyan">
                {xpTotal.toLocaleString()}
                <span className="text-sm text-hud-text-dim ml-1">XP</span>
              </div>
              <div className="font-mono text-[10px] text-hud-text-dim mt-0.5">
                {xpInLevel} / 200 XP to Level {level + 1}
              </div>
              <div className="progress-track w-40 mt-2">
                <div className="progress-fill" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: TrophyIcon,  label: "Tasks Done",  value: completedTasks.length, color: "text-hud-green"  },
              { icon: BoltIcon,    label: "Active Proj", value: activeProjects,         color: "text-hud-cyan"   },
              { icon: FireIcon,    label: "Overdue",     value: overdue.length,         color: "text-hud-amber"  },
              { icon: ChartBarIcon,label: "Completion",  value: `${completedPct}%`,     color: "text-hud-blue-lt"},
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label}
                className="flex items-center gap-2 px-3 py-2 rounded
                           border border-hud-border/50 bg-hud-bg/50"
              >
                <Icon className={`w-4 h-4 ${color} shrink-0`} />
                <div>
                  <div className={`font-hud text-sm ${color}`}>{value}</div>
                  <div className="font-mono text-[9px] text-hud-text-dim">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HudCard>

      {/* ── Stats Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* Priority breakdown */}
          <HudCard className="p-4" glow="none">
            <div className="flex items-center gap-2 mb-4">
              <ChartBarIcon className="w-4 h-4 text-hud-cyan" />
              <span className="font-hud text-[10px] text-hud-text-dim tracking-widest uppercase">
                Task Completion by Priority
              </span>
            </div>
            <div className="space-y-3">
              {byPriority.map(({ label, done, total }) => {
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const color =
                  label === "CRITICAL" ? "#FF3860" :
                  label === "HIGH"     ? "#FFB800" :
                  label === "MEDIUM"   ? "#00F5FF" : "#4A7FA5";
                return (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px]" style={{ color }}>
                        {label}
                      </span>
                      <span className="font-mono text-[10px] text-hud-text-dim">
                        {done}/{total} ({pct}%)
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="h-full rounded bar-animated"
                        style={{
                          "--target-width": `${pct}%`,
                          background: `linear-gradient(90deg, ${color}80, ${color})`,
                          boxShadow: `0 0 6px ${color}60`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </HudCard>

          {/* Activity heatmap */}
          {loading ? (
            <LoadingHud label="LOADING ACTIVITY" />
          ) : (
            <ActivityHeatmap logs={logs} />
          )}
        </div>

        {/* Right col stats */}
        <div className="space-y-4">
          <StatsWidget
            projectStats={projectStats}
            completedProjects={completedProjects}
            activeProjects={activeProjects}
            totalTasks={tasks.length}
            completedTasks={completedTasks.length}
            xpTotal={xpTotal}
            level={level}
          />
        </div>
      </div>
    </div>
  );
}