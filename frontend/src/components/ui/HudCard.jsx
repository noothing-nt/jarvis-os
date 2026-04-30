import clsx from "clsx";

/**
 * Core HUD card with:
 * - Glowing border on hover
 * - Optional corner bracket decoration
 * - Scan-line overlay
 * - Ambient glow color variant
 */
export default function HudCard({
  children,
  className = "",
  glow = "cyan",       // "cyan" | "amber" | "blue" | "green" | "red" | "none"
  corners = true,
  scanline = false,
  active = false,
  onClick,
  style = {},
}) {
  const glowMap = {
    cyan:  "hover:border-hud-cyan/40 hover:shadow-[0_4px_32px_rgba(0,245,255,0.12)]",
    amber: "hover:border-hud-amber/40 hover:shadow-[0_4px_32px_rgba(255,184,0,0.12)]",
    blue:  "hover:border-hud-blue/60 hover:shadow-[0_4px_32px_rgba(27,108,168,0.2)]",
    green: "hover:border-hud-green/40 hover:shadow-[0_4px_32px_rgba(0,255,136,0.12)]",
    red:   "hover:border-hud-red/40 hover:shadow-[0_4px_32px_rgba(255,56,96,0.12)]",
    none:  "",
  };
  const activeMap = {
    cyan:  "border-hud-cyan shadow-[0_0_20px_rgba(0,245,255,0.18)]",
    amber: "border-hud-amber shadow-[0_0_20px_rgba(255,184,0,0.18)]",
    blue:  "border-hud-blue shadow-[0_0_20px_rgba(27,108,168,0.25)]",
    green: "border-hud-green shadow-[0_0_20px_rgba(0,255,136,0.18)]",
    red:   "border-hud-red shadow-[0_0_20px_rgba(255,56,96,0.18)]",
    none:  "",
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={clsx(
        "relative bg-gradient-to-br from-hud-bg-2 to-hud-bg",
        "border border-hud-border rounded-lg",
        "transition-all duration-200",
        "shadow-hud-card",
        glowMap[glow] || glowMap.cyan,
        active && (activeMap[glow] || activeMap.cyan),
        onClick && "cursor-pointer select-none",
        className
      )}
    >
      {/* Corner brackets */}
      {corners && (
        <>
          <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-hud-cyan/60 rounded-tl-sm pointer-events-none" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-hud-cyan/60 rounded-tr-sm pointer-events-none" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-hud-cyan/60 rounded-bl-sm pointer-events-none" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-hud-cyan/60 rounded-br-sm pointer-events-none" />
        </>
      )}

      {/* Scanline overlay */}
      {scanline && (
        <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden z-0">
          <div className="hud-scanline-bg w-full h-full" />
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
