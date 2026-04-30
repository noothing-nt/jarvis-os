import clsx from "clsx";
import { useState } from "react";

export default function HudButton({
  children,
  onClick,
  variant   = "primary",
  size      = "md",
  disabled  = false,
  loading   = false,
  icon      = null,
  iconRight = null,
  className = "",
  type      = "button",
  ...props
}) {
  const [ripple, setRipple] = useState(false);

  const handleClick = (e) => {
    if (disabled || loading) return;
    setRipple(true);
    setTimeout(() => setRipple(false), 500);
    onClick?.(e);
  };

  const base = [
    "relative inline-flex items-center justify-center gap-2",
    "font-hud tracking-widest uppercase select-none",
    "transition-all duration-150 rounded",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hud-cyan",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    "overflow-hidden",
  ];

  const sizes = {
    sm:   "min-h-[36px] min-w-[36px] px-3 py-1.5 text-[10px]",
    md:   "min-h-[44px] min-w-[44px] px-5 py-2.5 text-[11px]",
    lg:   "min-h-[52px] min-w-[52px] px-7 py-3 text-[12px]",
    icon: "min-h-[44px] min-w-[44px] p-2.5",
  };

  const variants = {
    primary:   "bg-hud-blue/30 border border-hud-cyan/60 text-hud-cyan hover:bg-hud-blue/50 hover:border-hud-cyan hover:shadow-hud-cyan active:scale-95",
    secondary: "bg-hud-bg-3 border border-hud-border text-hud-text hover:border-hud-cyan/50 hover:text-hud-cyan active:scale-95",
    danger:    "bg-red-900/20 border border-hud-red/50 text-hud-red hover:bg-red-900/40 hover:border-hud-red hover:shadow-hud-red active:scale-95",
    ghost:     "bg-transparent border border-transparent text-hud-text-dim hover:text-hud-cyan hover:border-hud-cyan/30 active:scale-95",
    success:   "bg-green-900/20 border border-hud-green/50 text-hud-green hover:bg-green-900/40 hover:border-hud-green hover:shadow-hud-green active:scale-95",
    icon:      "bg-hud-bg-3 border border-hud-border text-hud-text-dim hover:border-hud-cyan/50 hover:text-hud-cyan active:scale-95",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      className={clsx(base, sizes[size] || sizes.md, variants[variant] || variants.primary, className)}
      {...props}
    >
      {/* Ripple overlay */}
      {ripple && (
        <span
          className="absolute inset-0 rounded pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,245,255,0.25) 0%, transparent 70%)",
            animation: "ripple 0.5s ease-out forwards",
          }}
        />
      )}

      {/* Spinner */}
      {loading && (
        <svg
          className="animate-spin w-4 h-4 text-current shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}

      {/* Left icon */}
      {!loading && icon && <span className="shrink-0 w-4 h-4">{icon}</span>}

      {/* Label */}
      {children && <span>{children}</span>}

      {/* Right icon */}
      {!loading && iconRight && <span className="shrink-0 w-4 h-4">{iconRight}</span>}
    </button>
  );
}
