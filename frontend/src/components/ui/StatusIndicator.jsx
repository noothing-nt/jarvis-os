import clsx from "clsx";

const STATUS_CONFIG = {
  online:  { dot: "bg-hud-green",    ring: "bg-hud-green/30",    label: "ONLINE"  },
  offline: { dot: "bg-hud-red",      ring: "bg-hud-red/30",      label: "OFFLINE" },
  pending: { dot: "bg-hud-amber",    ring: "bg-hud-amber/30",    label: "PENDING" },
  active:  { dot: "bg-hud-cyan",     ring: "bg-hud-cyan/30",     label: "ACTIVE"  },
  idle:    { dot: "bg-hud-text-dim", ring: "bg-hud-text-dim/30", label: "IDLE"    },
  error:   { dot: "bg-hud-red",      ring: "bg-hud-red/30",      label: "ERROR"   },
};

export default function StatusIndicator({
  status   = "offline",
  label,
  showLabel = true,
  pulse     = true,
  size      = "sm",   // "xs" | "sm" | "md"
  className = "",
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const displayLabel = label || config.label;

  const dotSize = { xs: "w-1.5 h-1.5", sm: "w-2 h-2", md: "w-3 h-3" };
  const textSize = { xs: "text-[9px]", sm: "text-[10px]", md: "text-xs" };

  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      {/* Dot with optional pulse ring */}
      <span className="relative inline-flex items-center justify-center">
        {pulse && status !== "offline" && (
          <span
            className={clsx(
              "absolute rounded-full animate-ping",
              dotSize[size],
              config.ring
            )}
          />
        )}
        <span className={clsx("rounded-full relative z-10", dotSize[size], config.dot)} />
      </span>

      {showLabel && (
        <span className={clsx("font-mono tracking-widest", textSize[size], "text-hud-text-dim")}>
          {displayLabel}
        </span>
      )}
    </span>
  );
}
