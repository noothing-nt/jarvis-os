import clsx from "clsx";

/**
 * Responsive CSS grid wrapper for module content.
 * cols: 1 | 2 | 3 | 4 | "auto"
 */
export default function MainGrid({
  children,
  cols      = "auto",
  gap       = 4,
  className = "",
}) {
  const colMap = {
    1:      "grid-cols-1",
    2:      "grid-cols-1 lg:grid-cols-2",
    3:      "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4:      "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
    auto:   "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  };
  const gapMap = { 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6" };

  return (
    <div className={clsx("grid", colMap[cols], gapMap[gap] || "gap-4", className)}>
      {children}
    </div>
  );
}
