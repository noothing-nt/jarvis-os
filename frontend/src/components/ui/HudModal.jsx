import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import HudButton from "./HudButton";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function HudModal({
  open,
  onClose,
  title       = "",
  subtitle    = "",
  children,
  footer      = null,
  size        = "md",   // "sm" | "md" | "lg" | "xl" | "full"
  closable    = true,
  className   = "",
}) {
  const overlayRef = useRef(null);

  /* Close on ESC */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape" && closable) onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closable, onClose]);

  /* Prevent body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sizeMap = {
    sm:   "max-w-sm",
    md:   "max-w-lg",
    lg:   "max-w-2xl",
    xl:   "max-w-4xl",
    full: "max-w-[95vw] max-h-[95vh]",
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current && closable) onClose?.(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-hud-bg/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={clsx(
          "relative w-full z-10 animate-slide-up",
          "bg-gradient-to-br from-hud-bg-2 to-hud-bg",
          "border border-hud-border rounded-lg",
          "shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,245,255,0.08)]",
          sizeMap[size] || sizeMap.md,
          className
        )}
      >
        {/* Corner brackets */}
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-cyan/70 rounded-tl pointer-events-none" />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-hud-cyan/70 rounded-tr pointer-events-none" />
        <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-hud-cyan/70 rounded-bl pointer-events-none" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-hud-cyan/70 rounded-br pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-hud-border/50">
          <div>
            {title && (
              <h2 className="font-hud text-sm tracking-widest text-hud-cyan uppercase">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-hud-text-dim font-mono">{subtitle}</p>
            )}
          </div>
          {closable && (
            <HudButton
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-4 shrink-0"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-4 h-4" />
            </HudButton>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-5 pt-3 border-t border-hud-border/50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
