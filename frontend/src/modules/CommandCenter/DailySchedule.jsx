import HudCard  from "@/components/ui/HudCard";
import GlowBadge from "@/components/ui/GlowBadge";
import { formatTimeShort } from "@/utils/dateHelpers";
import { AcademicCapIcon } from "@heroicons/react/24/outline";

export default function DailySchedule({ schedule }) {
  const classes    = schedule?.classes    || [];
  const nextEvent  = schedule?.next_event || null;

  return (
    <HudCard className="p-4" glow="blue">
      <div className="flex items-center gap-2 mb-3">
        <AcademicCapIcon className="w-4 h-4 text-hud-blue-lt" />
        <span className="font-hud text-[10px] tracking-widest text-hud-text-dim uppercase">
          Today&apos;s Schedule
        </span>
      </div>

      {nextEvent && (
        <div className="mb-3 px-3 py-2 rounded bg-hud-blue/10 border border-hud-blue/30">
          <p className="font-mono text-[9px] text-hud-text-dim tracking-wider mb-0.5">NEXT UP</p>
          <p className="font-sans text-sm text-hud-cyan">{nextEvent.title}</p>
          <p className="font-mono text-[10px] text-hud-text-dim">
            {formatTimeShort(nextEvent.start_time)} – {formatTimeShort(nextEvent.end_time)}
          </p>
        </div>
      )}

      {classes.length === 0 ? (
        <p className="font-mono text-[10px] text-hud-text-dim tracking-wider py-3 text-center">
          NO CLASSES SCHEDULED
        </p>
      ) : (
        <div className="space-y-1.5">
          {classes.slice(0, 6).map((cls) => (
            <div
              key={cls.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded
                         border border-hud-border/40 hover:border-hud-border
                         transition-colors"
            >
              <div
                className="w-2 h-full min-h-[24px] rounded-sm shrink-0"
                style={{ background: cls.color_hex || "#1B6CA8" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-hud-text truncate">{cls.title}</p>
                <p className="font-mono text-[9px] text-hud-text-dim">
                  {formatTimeShort(cls.start_time)} – {formatTimeShort(cls.end_time)}
                  {cls.location && ` · ${cls.location}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </HudCard>
  );
}
