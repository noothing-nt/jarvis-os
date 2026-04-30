import HudCard  from "@/components/ui/HudCard";
import GlowBadge from "@/components/ui/GlowBadge";
import {
  FolderOpenIcon, CheckCircleIcon,
  LightBulbIcon, StarIcon,
} from "@heroicons/react/24/outline";

function StatRow({ label, value, sub, color = "text-hud-cyan" }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-hud-border/30 last:border-0">
      <span className="font-mono text-[10px] text-hud-text-dim tracking-wider uppercase">
        {label}
      </span>
      <div className="text-right">
        <span className={`font-hud text-sm ${color}`}>{value}</span>
        {sub && <span className="font-mono text-[9px] text-hud-text-dim ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export default function StatsWidget({
  projectStats,
  completedProjects,
  activeProjects,
  totalTasks,
  completedTasks,
  xpTotal,
  level,
}) {
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Project stats */}
      <HudCard className="p-4" glow="blue">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpenIcon className="w-4 h-4 text-hud-blue-lt" />
          <span className="font-hud text-[10px] text-hud-text-dim tracking-widest uppercase">
            Project Stats
          </span>
        </div>
        <StatRow label="Total"     value={projectStats?.total     || 0} />
        <StatRow label="Active"    value={activeProjects}          color="text-hud-cyan"  />
        <StatRow label="Completed" value={completedProjects}       color="text-hud-green" />
        <StatRow label="Paused"    value={projectStats?.paused    || 0} color="text-hud-text-dim" />
        <StatRow label="Planning"  value={projectStats?.planning  || 0} color="text-hud-amber" />
      </HudCard>

      {/* Task stats */}
      <HudCard className="p-4" glow="green">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircleIcon className="w-4 h-4 text-hud-green" />
          <span className="font-hud text-[10px] text-hud-text-dim tracking-widest uppercase">
            Task Stats
          </span>
        </div>
        <StatRow label="Total Tasks"    value={totalTasks}      />
        <StatRow label="Completed"      value={completedTasks}  color="text-hud-green" />
        <StatRow label="Completion Rate"value={`${completionRate}%`} color={
          completionRate >= 75 ? "text-hud-green" :
          completionRate >= 50 ? "text-hud-cyan"  :
          completionRate >= 25 ? "text-hud-amber" : "text-hud-red"
        }/>
      </HudCard>

      {/* XP breakdown */}
      <HudCard className="p-4" glow="cyan">
        <div className="flex items-center gap-2 mb-3">
          <StarIcon className="w-4 h-4 text-hud-cyan" />
          <span className="font-hud text-[10px] text-hud-text-dim tracking-widest uppercase">
            XP Breakdown
          </span>
        </div>
        <StatRow label="Total XP"   value={xpTotal.toLocaleString()} sub="xp" color="text-hud-cyan" />
        <StatRow label="Level"      value={level}                                color="text-hud-cyan" />
        <StatRow label="Next Level" value={`${200 - (xpTotal % 200)}`} sub="xp needed" />

        {/* XP sources */}
        <div className="mt-3 space-y-1.5">
          {[
            { label: "Critical Tasks", xp: 50, color: "text-hud-red"   },
            { label: "High Tasks",     xp: 35, color: "text-hud-amber"  },
            { label: "Medium Tasks",   xp: 20, color: "text-hud-cyan"   },
            { label: "Low Tasks",      xp: 10, color: "text-hud-text-dim"},
          ].map(({ label, xp, color }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="font-mono text-[9px] text-hud-text-dim">{label}</span>
              <GlowBadge
                variant={
                  color.includes("red")   ? "red"   :
                  color.includes("amber") ? "amber" :
                  color.includes("cyan")  ? "cyan"  : "ghost"
                }
              >
                +{xp} XP
              </GlowBadge>
            </div>
          ))}
        </div>
      </HudCard>
    </div>
  );
}
