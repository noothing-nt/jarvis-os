import clsx from "clsx";

export function Skeleton({ className = "", style = {} }) {
  return <div className={clsx("skeleton", className)} style={style} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="nx-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-2.5" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-3 py-3 border-b border-border-subtle">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3"
              style={{ width: c === 0 ? "30%" : c === 1 ? "25%" : "15%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}