import HudCard  from "@/components/ui/HudCard";
import GlowBadge from "@/components/ui/GlowBadge";
import { formatDate } from "@/utils/dateHelpers";
import { BellIcon } from "@heroicons/react/24/outline";

export default function ReminderWidget({ tasks = [] }) {
  const withReminders = tasks.filter(
    (t) => t.reminder_at && t.status !== "done"
  );

  return (
    <HudCard className="p-4" glow="amber">
      <div className="flex items-center gap-2 mb-3">
        <BellIcon className="w-4 h-4 text-hud-amber" />
        <span className="font-hud text-[10px] tracking-widest text-hud-text-dim uppercase">
          Reminders
        </span>
        {withReminders.length > 0 && (
          <GlowBadge variant="amber">{withReminders.length}</GlowBadge>
        )}
      </div>

      {withReminders.length === 0 ? (
        <p className="font-mono text-[10px] text-hud-text-dim tracking-wider py-2 text-center">
          NO REMINDERS SET
        </p>
      ) : (
        <div className="space-y-2">
          {withReminders.slice(0, 4).map((t) => (
            <div
              key={t.id}
              className="flex justify-between items-center py-1.5 px-2 rounded
                         border border-hud-amber/20 bg-amber-900/5"
            >
              <span className="text-xs text-hud-text truncate flex-1">{t.title}</span>
              <span className="font-mono text-[9px] text-hud-amber ml-2 shrink-0">
                {formatDate(t.reminder_at, { showTime: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </HudCard>
  );
}