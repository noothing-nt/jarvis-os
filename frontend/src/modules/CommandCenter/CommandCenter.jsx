import { useEffect } from "react";
import { useTasks }    from "@/hooks/useTasks";
import { useSchedule } from "@/hooks/useSchedule";
import { useAppStore } from "@/store/useAppStore";
import HudCard         from "@/components/ui/HudCard";
import GlowBadge       from "@/components/ui/GlowBadge";
import LoadingHud      from "@/components/ui/LoadingHud";
import TaskList        from "./TaskList";
import DailySchedule   from "./DailySchedule";
import ReminderWidget  from "./ReminderWidget";
import { formatFullDate } from "@/utils/dateHelpers";

export default function CommandCenter() {
  const { now }                          = useAppStore();
  const { todayTasks, overdue, loading } = useTasks();
  const { todaySchedule }                = useSchedule();

  const completedToday = todayTasks.filter((t) => t.status === "done").length;
  const pendingToday   = todayTasks.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-hud text-lg text-hud-cyan text-glow-cyan tracking-widest uppercase">
          Command Center
        </h1>
        <div className="module-header-line" />
        <p className="mt-1 font-mono text-xs text-hud-text-dim">
          {formatFullDate(now)}
        </p>
      </div>

      {/* ── Stat Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "TODAY",     value: todayTasks.length, color: "cyan"  },
          { label: "PENDING",   value: pendingToday,      color: "amber" },
          { label: "DONE",      value: completedToday,    color: "green" },
          { label: "OVERDUE",   value: overdue.length,    color: "red"   },
        ].map((s) => (
          <HudCard key={s.label} glow={s.color} className="p-4 text-center card-entry">
            <div className={`font-hud text-2xl text-hud-${s.color} text-glow-${s.color}`}>
              {s.value}
            </div>
            <div className="font-mono text-[9px] text-hud-text-dim tracking-widest mt-1">
              {s.label}
            </div>
          </HudCard>
        ))}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Tasks — takes 2 cols */}
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <LoadingHud label="LOADING TASKS" />
          ) : (
            <>
              {overdue.length > 0 && (
                <HudCard glow="amber" className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <GlowBadge variant="amber" dot>OVERDUE</GlowBadge>
                    <span className="font-mono text-[10px] text-hud-text-dim">
                      {overdue.length} task{overdue.length !== 1 ? "s" : ""} past deadline
                    </span>
                  </div>
                  <TaskList tasks={overdue.slice(0, 5)} compact />
                </HudCard>
              )}

              <HudCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <GlowBadge variant="cyan" dot>TODAY&apos;S TASKS</GlowBadge>
                  <span className="font-mono text-[10px] text-hud-text-dim">
                    {completedToday}/{todayTasks.length} complete
                  </span>
                </div>

                {/* Progress */}
                {todayTasks.length > 0 && (
                  <div className="progress-track mb-4">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${todayTasks.length > 0
                          ? Math.round((completedToday / todayTasks.length) * 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                )}

                <TaskList tasks={todayTasks} />
              </HudCard>
            </>
          )}
        </div>

        {/* Schedule + Reminders */}
        <div className="space-y-4">
          <DailySchedule schedule={todaySchedule} />
          <ReminderWidget tasks={todayTasks} />
        </div>
      </div>
    </div>
  );
}