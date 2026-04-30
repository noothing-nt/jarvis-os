import HudModal  from "./HudModal";
import HudButton from "./HudButton";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * Reusable confirmation dialog
 * Usage: <HudConfirm open onConfirm={fn} onCancel={fn} title="..." message="..." />
 */
export default function HudConfirm({
  open,
  onConfirm,
  onCancel,
  title     = "Confirm Action",
  message   = "Are you sure? This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  variant      = "danger",   // "danger" | "primary"
  loading      = false,
}) {
  return (
    <HudModal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <HudButton variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </HudButton>
          <HudButton variant={variant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </HudButton>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            variant === "danger" ? "text-hud-red" : "text-hud-amber"
          }`}
        />
        <p className="text-sm text-hud-text font-sans leading-relaxed">
          {message}
        </p>
      </div>
    </HudModal>
  );
}