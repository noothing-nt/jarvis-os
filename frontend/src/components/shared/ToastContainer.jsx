import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const ICONS = {
  success: { Icon: CheckCircle,   color: "text-success" },
  error:   { Icon: AlertCircle,   color: "text-danger"  },
  warning: { Icon: AlertTriangle, color: "text-warning" },
  info:    { Icon: Info,          color: "text-accent"  },
};

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const cfg  = ICONS[t.type] || ICONS.info;
        const Icon = cfg.Icon;
        return (
          <div key={t.id} className="toast animate-slide-up">
            <Icon size={16} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary leading-snug">{t.message}</p>
            </div>
            <button
              onClick={() => onRemove(t.id)}
              className="text-muted hover:text-primary flex-shrink-0 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}