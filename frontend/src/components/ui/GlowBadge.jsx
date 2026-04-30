import clsx from "clsx";

const VARIANTS = {
  cyan:   "bg-hud-cyan/10  border-hud-cyan/40  text-hud-cyan",
  amber:  "bg-amber-500/10 border-amber-500/40 text-hud-amber",
  green:  "bg-green-500/10 border-green-500/40 text-hud-green",
  red:    "bg-red-500/10   border-red-500/40   text-hud-red",
  blue:   "bg-hud-blue/20  border-hud-blue/40  text-hud-blue-lt",
  ghost:  "bg-hud-bg-3     border-hud-border   text-hud-text-dim",
};

export default function GlowBadge({
  children,
  variant   = "cyan",
  className = "",
  dot       = false,
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5",
        "rounded border text-[10px] font-mono tracking-wider uppercase",
        VARIANTS[variant] || VARIANTS.ghost,
        className
      )}
    >
      {dot && (
        <span className={clsx(
          "w-1.5 h-1.5 rounded-full shrink-0",
          variant === "cyan"  && "bg-hud-cyan",
          variant === "amber" && "bg-hud-amber",
          variant === "green" && "bg-hud-green",
          variant === "red"   && "bg-hud-red",
          variant === "blue"  && "bg-hud-blue-lt",
          variant === "ghost" && "bg-hud-text-dim",
        )} />
      )}
      {children}
    </span>
  );
}
