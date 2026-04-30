import { useEffect } from "react";
import clsx from "clsx";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAppStore } from "@/store/useAppStore";

const CONFIG = {
  success: { icon: CheckCircleIcon,        color: "text-hud-green", border: "border-hud-green/40",  bg: "bg-green-900/20" },
  error:   { icon: ExclamationCircleIcon,  color: "text-hud-red",   border: "border-hud-red/40",    bg: "bg-red-900/20"   },
  info:    { icon: InformationCircleIcon,  color: "text-hud-cyan",  border: "border-hud-cyan/40",   bg: "bg-hud-blue/10"  },
  warning: { icon: ExclamationCircleIcon,  color: "text-hud-amber", border: "border-hud-amber/40",  bg: "bg-amber-900/20" },
};

export default function HudToast() {
  const { toast, dismissToast } = useAppStore();

  if (!toast) return null;

  const cfg = CONFIG[toast.type] || CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className="fixed bottom-6 right-6 z-[300] animate-slide-up">
      <div className={clsx(
        "flex items-start gap-3 px-4 py-3 rounded-lg border max-w-sm",
        "backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        cfg.bg, cfg.border
      )}>
        <Icon className={clsx("w-5 h-5 shrink-0 mt-0.5", cfg.color)} />
        <p className="text-sm text-hud-text font-sans flex-1">{toast.message}</p>
        <button
          onClick={dismissToast}
          className="text-hud-text-dim hover:text-hud-text transition-colors shrink-0"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}