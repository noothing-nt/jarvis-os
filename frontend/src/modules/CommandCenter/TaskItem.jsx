import clsx from "clsx";
import GlowBadge from "@/components/ui/GlowBadge";
import { TASK_STATUS_MAP, PRIORITY_MAP } from "@/utils/statusColors";
import { formatDate, isOverdue } from "@/utils/dateHelpers";
import { CheckIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function TaskItem({ task, compact, onComplete, onDelete, style }) {
  const status   = TASK_STATUS_MAP[task.status]   || TASK_STATUS_MAP.todo;
  const priority = PRIORITY_MAP[task.priority]    || PRIORITY_MAP.medium;
  const done     = task.status === "done";
  const overdue  = !done && isOverdue(task.due_date);

  return (
    <div
      style={style}
      className={clsx(
        "card-entry flex items-start gap-3 px-3 py-2.5 rounded border",
        "transition-all duration-150 group",
        done
          ? "bg-green-900/5 border-green-900/30 opacity-60"
          : overdue
            ? "bg-amber-900/10 border-hud-amber/30 hover:border-hud-amber/50"
            : "bg-hud-bg/50 border-hud-border/50 hover:border-hud-cyan/30"
      )}
    >
      {/* Complete button */}
      <button
        onClick={onComplete}
        disabled={done}
        className={clsx(
          "shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center",
          "transition-all duration-150",
          done
            ? "bg-hud-green/20 border-hud-green/50 text-hud-green"
            : "border-hud-border hover:border-hud-cyan hover:bg-hud-cyan/10 text-transparent hover:text-hud-cyan"
        )}
        aria-label="Complete task"
      >
        <CheckIcon className="w-3 h-3" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={clsx(
          "text-sm font-sans leading-snug",
          done ? "line-through text-hud-text-dim" : "text-hud-text"
        )}>
          {task.title}
        </p>

        {!compact && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={clsx("font-mono text-[9px] tracking-wider", priority.color)}>
              {priority.icon} {priority.label}
            </span>
            {task.due_date && (
              <span className={clsx(
                "font-mono text-[9px]",
                overdue ? "text-hud-amber" : "text-hud-text-dim"
              )}>
                {overdue ? "⚠ " : ""}{formatDate(task.due_date)}
              </span>
            )}
            <GlowBadge
              variant={
                task.status === "done"        ? "green"
                : task.status === "blocked"   ? "red"
                : task.status === "in_progress"? "cyan"
                : "ghost"
              }
            >
              {status.label}
            </GlowBadge>
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 mt-0.5
                   text-hud-text-dim hover:text-hud-red transition-all"
        aria-label="Delete task"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
