import clsx from "clsx";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div className={clsx(
      "flex flex-col items-center justify-center py-16 px-6 text-center",
      className
    )}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border
                        flex items-center justify-center mb-4">
          <Icon size={24} className="text-muted" />
        </div>
      )}
      {title && (
        <h3 className="text-md font-semibold text-primary mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-muted max-w-xs mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}