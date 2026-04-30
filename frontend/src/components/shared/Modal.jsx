import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";

const WIDTHS = {
  sm:   "max-w-sm",
  md:   "max-w-lg",
  lg:   "max-w-2xl",
  xl:   "max-w-4xl",
  full: "max-w-6xl",
};

export default function Modal({
  open, onClose,
  title, subtitle,
  children, footer,
  size     = "md",
  closable = true,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && closable) onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closable, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget && closable) onClose?.(); }}
    >
      <div
        ref={panelRef}
        className={clsx("modal-panel w-full", WIDTHS[size] || WIDTHS.md)}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            {title && <h2 className="text-md font-semibold text-primary">{title}</h2>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {closable && (
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon btn-sm ml-3 flex-shrink-0"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}