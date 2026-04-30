import clsx      from "clsx";
import HudButton from "./HudButton";

export default function HudEmptyState({
  icon:    Icon,
  title    = "No data found",
  message  = "",
  action,
  actionLabel = "Add New",
  className   = "",
}) {
  return (
    <div className={clsx(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      {Icon && (
        <Icon className="w-10 h-10 text-hud-text-dim mb-3 opacity-40" />
      )}
      <h3 className="font-hud text-xs text-hud-text-dim tracking-widest uppercase mb-1">
        {title}
      </h3>
      {message && (
        <p className="font-mono text-[10px] text-hud-text-dim mb-4 max-w-xs">
          {message}
        </p>
      )}
      {action && (
        <HudButton size="sm" variant="secondary" onClick={action}>
          {actionLabel}
        </HudButton>
      )}
    </div>
  );
}