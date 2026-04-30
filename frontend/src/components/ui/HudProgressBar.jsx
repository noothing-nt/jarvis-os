import clsx from "clsx";
import { progressColor } from "@/utils/statusColors";

export default function HudProgressBar({
  value      = 0,       // 0–100
  showLabel  = true,
  size       = "sm",    // "xs" | "sm" | "md"
  colorAuto  = true,    // auto color based on value
  color      = null,    // manual hex override
  className  = "",
  animated   = true,
}) {
  const pct      = Math.min(Math.max(Math.round(value), 0), 100);
  const barColor = color || (colorAuto ? progressColor(pct) : "#00F5FF");

  const heights = { xs: "h-0.5", sm: "h-1", md: "h-2" };

  return (
    <div className={clsx("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[9px] text-hud-text-dim tracking-wider">
            PROGRESS
          </span>
          <span
            className="font-mono text-[9px] tabular-nums"
            style={{ color: barColor }}
          >
            {pct}%
          </span>
        </div>
      )}

      {/* Track */}
      <div
        className={clsx(
          "w-full rounded overflow-hidden bg-hud-border/30",
          heights[size] || heights.sm
        )}
      >
        {/* Fill */}
        <div
          className={clsx("h-full rounded", animated && "bar-animated")}
          style={{
            width:      `${pct}%`,
            "--target-width": `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
            boxShadow:  `0 0 6px ${barColor}80`,
            transition: animated ? undefined : "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}