import { useMemo }  from "react";
import HudCard      from "@/components/ui/HudCard";
import { format, subDays, startOfDay, parseISO, isValid } from "date-fns";

const WEEKS  = 15;
const DAYS   = 7;
const TOTAL  = WEEKS * DAYS;

function getIntensity(count) {
  if (count === 0) return 0;
  if (count <= 1)  return 1;
  if (count <= 3)  return 2;
  if (count <= 6)  return 3;
  return 4;
}

const COLORS = [
  "bg-hud-border/30",          // 0 — none
  "bg-hud-blue/40",            // 1 — low
  "bg-hud-cyan/30",            // 2 — medium
  "bg-hud-cyan/60",            // 3 — high
  "bg-hud-cyan shadow-hud-cyan",// 4 — max
];

export default function ActivityHeatmap({ logs = [] }) {
  const today = startOfDay(new Date());

  /* Build a map: "yyyy-MM-dd" → count */
  const countMap = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      try {
        const d = startOfDay(parseISO(log.created_at));
        if (!isValid(d)) return;
        const key = format(d, "yyyy-MM-dd");
        map[key] = (map[key] || 0) + 1;
      } catch (_) {}
    });
    return map;
  }, [logs]);

  /* Build grid: newest day last */
  const cells = useMemo(() => {
    return Array.from({ length: TOTAL }, (_, i) => {
      const date  = subDays(today, TOTAL - 1 - i);
      const key   = format(date, "yyyy-MM-dd");
      const count = countMap[key] || 0;
      return { date, key, count, intensity: getIntensity(count) };
    });
  }, [countMap, today]);

  const months = useMemo(() => {
    const seen = new Set();
    return cells
      .filter((c, i) => {
        const m = format(c.date, "MMM");
        if (seen.has(m)) return false;
        seen.add(m);
        return i % 7 === 0;
      })
      .map((c) => ({ label: format(c.date, "MMM"), weekIdx: Math.floor(cells.indexOf(c) / 7) }));
  }, [cells]);

  const totalActivity = Object.values(countMap).reduce((a, b) => a + b, 0);

  return (
    <HudCard className="p-4" glow="none">
      <div className="flex items-center justify-between mb-4">
        <span className="font-hud text-[10px] text-hud-text-dim tracking-widest uppercase">
          Activity — Last {WEEKS} Weeks
        </span>
        <span className="font-mono text-[10px] text-hud-cyan">
          {totalActivity} actions
        </span>
      </div>

      {/* Month labels */}
      <div
        className="grid mb-1"
        style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: WEEKS }, (_, w) => {
          const label = months.find((m) => m.weekIdx === w)?.label;
          return (
            <div key={w} className="font-mono text-[8px] text-hud-text-dim text-center">
              {label || ""}
            </div>
          );
        })}
      </div>

      {/* Grid (column-major: weeks × days) */}
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
          gridTemplateRows:    `repeat(${DAYS}, 12px)`,
          gridAutoFlow:        "column",
        }}
      >
        {cells.map(({ key, count, intensity, date }) => (
          <div
            key={key}
            title={`${format(date, "MMM d, yyyy")} — ${count} action${count !== 1 ? "s" : ""}`}
            className={`rounded-sm transition-all duration-150 cursor-default ${COLORS[intensity]}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="font-mono text-[9px] text-hud-text-dim">Less</span>
        {COLORS.map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
        ))}
        <span className="font-mono text-[9px] text-hud-text-dim">More</span>
      </div>
    </HudCard>
  );
}
