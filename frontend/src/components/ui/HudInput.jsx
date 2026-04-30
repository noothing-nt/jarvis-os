import clsx from "clsx";
import { forwardRef } from "react";

const HudInput = forwardRef(function HudInput(
  {
    label,
    error,
    hint,
    icon,
    className    = "",
    inputClass   = "",
    as           = "input",
    rows         = 3,
    ...props
  },
  ref
) {
  const Tag = as;

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-[10px] font-mono tracking-widest text-hud-text-dim uppercase">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hud-text-dim pointer-events-none">
            {icon}
          </span>
        )}
        <Tag
          ref={ref}
          rows={as === "textarea" ? rows : undefined}
          className={clsx(
            "w-full bg-hud-bg border border-hud-border rounded",
            "text-hud-text font-sans text-sm",
            "placeholder:text-hud-text-dim/50",
            "transition-all duration-150",
            "focus:outline-none focus:border-hud-cyan/60 focus:shadow-[0_0_0_1px_rgba(0,245,255,0.2)]",
            "hover:border-hud-border/80",
            icon ? "pl-9 pr-3 py-2.5" : "px-3 py-2.5",
            as === "textarea" && "resize-none",
            error && "border-hud-red/60 focus:border-hud-red focus:shadow-[0_0_0_1px_rgba(255,56,96,0.2)]",
            inputClass
          )}
          {...props}
        />
      </div>

      {error && (
        <p className="text-[10px] font-mono text-hud-red tracking-wide">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[10px] font-mono text-hud-text-dim">{hint}</p>
      )}
    </div>
  );
});

export default HudInput;