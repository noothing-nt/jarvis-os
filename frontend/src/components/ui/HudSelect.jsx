import clsx from "clsx";
import { forwardRef } from "react";

const HudSelect = forwardRef(function HudSelect(
  { label, error, options = [], className = "", placeholder, ...props },
  ref
) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-[10px] font-mono tracking-widest text-hud-text-dim uppercase">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          "w-full bg-hud-bg border border-hud-border rounded",
          "text-hud-text font-sans text-sm px-3 py-2.5",
          "transition-all duration-150 cursor-pointer",
          "focus:outline-none focus:border-hud-cyan/60 focus:shadow-[0_0_0_1px_rgba(0,245,255,0.2)]",
          "hover:border-hud-border/80",
          error && "border-hud-red/60",
          "[&>option]:bg-hud-bg-2 [&>option]:text-hud-text"
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[10px] font-mono text-hud-red tracking-wide">{error}</p>
      )}
    </div>
  );
});

export default HudSelect;