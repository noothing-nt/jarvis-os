import clsx from "clsx";

/**
 * Full-screen or inline HUD scanning loader
 * mode: "fullscreen" | "card" | "spinner" | "bar"
 */
export default function LoadingHud({
  mode    = "card",
  label   = "INITIALIZING",
  className = "",
}) {
  if (mode === "spinner") {
    return (
      <span className={clsx("inline-flex items-center gap-2", className)}>
        <svg className="animate-spin w-4 h-4 text-hud-cyan" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span className="text-[10px] font-mono text-hud-text-dim tracking-widest animate-pulse">
          {label}
        </span>
      </span>
    );
  }

  if (mode === "bar") {
    return (
      <div className={clsx("w-full", className)}>
        <div className="progress-track">
          <div
            className="h-full rounded bg-gradient-to-r from-hud-blue to-hud-cyan shadow-[0_0_8px_rgba(0,245,255,0.5)]"
            style={{ width: "60%", animation: "barPulse 1.5s ease-in-out infinite alternate" }}
          />
        </div>
        <style>{`@keyframes barPulse{from{width:20%}to{width:90%}}`}</style>
      </div>
    );
  }

  if (mode === "fullscreen") {
    return (
      <div className={clsx(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center",
        "bg-hud-bg hud-grid-bg",
        className
      )}>
        <div className="scan-line" />
        <div className="hud-scanline-bg absolute inset-0 pointer-events-none" />

        {/* Arc reactor logo */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full border-2 border-hud-cyan/30 flex items-center justify-center rotate-ring">
            <div className="w-14 h-14 rounded-full border border-hud-blue/50 flex items-center justify-center rotate-ring-rev">
              <div className="w-8 h-8 rounded-full bg-hud-blue/30 border border-hud-cyan arc-pulse flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-hud-cyan shadow-hud-cyan" />
              </div>
            </div>
          </div>
        </div>

        <h1 className="font-hud text-2xl text-hud-cyan text-glow-cyan tracking-[0.4em] mb-2">
          JARVIS OS
        </h1>
        <p className="font-mono text-xs text-hud-text-dim tracking-[0.3em] animate-pulse mb-6">
          {label}
        </p>

        {/* Progress bar */}
        <div className="w-48 h-px bg-hud-border overflow-hidden rounded">
          <div
            className="h-full bg-hud-cyan"
            style={{ animation: "barLoad 2s ease-in-out infinite" }}
          />
        </div>
        <style>{`
          @keyframes barLoad {
            0%   { width:0%;   margin-left:0% }
            50%  { width:60%;  margin-left:20% }
            100% { width:0%;   margin-left:100% }
          }
        `}</style>
      </div>
    );
  }

  /* Card mode (default) */
  return (
    <div className={clsx(
      "relative overflow-hidden rounded-lg border border-hud-border bg-hud-bg-2 p-8",
      "flex flex-col items-center justify-center gap-4",
      className
    )}>
      <div className="scan-line" />
      <svg className="animate-spin w-8 h-8 text-hud-cyan" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <span className="font-mono text-[10px] text-hud-text-dim tracking-[0.3em] animate-pulse">
        {label}
      </span>
    </div>
  );
}
