import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { TrendingUp, Award, Zap, Target, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import clsx from "clsx";

// ── Mock Data ────────────────────────────────────────────────────────

const WEEKLY_DATA = Array.from({ length: 8 }, (_, i) => ({
  week: `W${i + 1}`,
  tasks: Math.floor(Math.random() * 20) + 10,
  ideas: Math.floor(Math.random() * 8) + 2,
  focus: Math.floor(Math.random() * 15) + 20,
}));

const CATEGORY_DATA = [
  { name: "Software", value: 35, color: "#2F81F7" },
  { name: "Hardware", value: 25, color: "#3FB950" },
  { name: "Research", value: 20, color: "#A371F7" },
  { name: "AI/ML", value: 15, color: "#D29922" },
  { name: "Other", value: 5, color: "#484F58" },
];

const VELOCITY_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: format(subDays(new Date(), 29 - i), "MMM d"),
  completed: Math.floor(Math.random() * 8),
  added: Math.floor(Math.random() * 10),
}));

// GitHub-style Heatmap mock data
const HEATMAP_WEEKS = 15;
const HEATMAP_DATA = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => ({
  day: i % 7,
  week: Math.floor(i / 7),
  count: Math.random() > 0.3 ? Math.floor(Math.random() * 8) : 0,
}));

// ── Helpers ─────────────────────────────────────────────────────────

function heatColor(count) {
  if (count === 0) return "#21262D";
  if (count <= 2) return "#1F3A5F";
  if (count <= 4) return "#2F81F7";
  if (count <= 6) return "#388BFD";
  return "#79C0FF";
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-overlay border border-border rounded-lg px-3 py-2 text-xs shadow-modal">
      <p className="text-secondary font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-muted capitalize">{p.name}:</span>
          <span className="text-primary font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">System Analytics</h1>
          <p className="text-sm text-muted mt-0.5">Performance metrics and productivity insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-border rounded p-0.5">
            {["7d", "30d", "90d"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={clsx(
                  "px-3 py-1 rounded text-xs font-medium transition-all",
                  timeRange === range ? "bg-raised text-primary" : "text-muted hover:text-secondary"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="btn btn-blue btn-sm gap-1.5">
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Deep Work Hours", value: "35.5h", sub: "this week",        icon: Zap,        color: "#E3B341", trend: "+12%" },
          { label: "Tasks Completed", value: "46",    sub: "this week",        icon: Target,     color: "#3FB950", trend: "+8%" },
          { label: "Velocity Score",  value: "11.5",  sub: "avg tasks/day",    icon: TrendingUp, color: "#2F81F7", trend: "-2%" },
          { label: "Total XP",        value: "2,840", sub: "Level 14 — Senior", icon: Award,      color: "#A371F7", trend: "+340" },
        ].map(({ label, value, sub, icon: Icon, color, trend }) => (
          <div key={label} className="nx-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className={clsx(
                "text-xs font-mono px-2 py-0.5 rounded",
                trend.startsWith("+") ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              )}>
                {trend}
              </span>
            </div>
            <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{label}</h3>
            <div className="text-2xl font-bold text-primary mb-1">{value}</div>
            <div className="text-2xs text-muted">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Weekly Output (Bar Chart) */}
        <div className="xl:col-span-2 nx-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h2 className="text-md font-semibold text-primary">Weekly Output</h2>
              <p className="text-xs text-muted">Tasks vs Focus Hours vs Ideas</p>
            </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                <XAxis dataKey="week" stroke="#484F58" tick={{ fill: "#8B949E", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#484F58" tick={{ fill: "#8B949E", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: '#21262D', opacity: 0.4 }} />
                <Bar dataKey="focus" fill="#2F81F7" radius={[3, 3, 0, 0]} maxBarSize={16} name="Focus Hours" />
                <Bar dataKey="tasks" fill="#A371F7" radius={[3, 3, 0, 0]} maxBarSize={16} name="Tasks Done" />
                <Bar dataKey="ideas" fill="#3FB950" radius={[3, 3, 0, 0]} maxBarSize={16} name="Ideas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Allocation (Donut Chart) */}
        <div className="nx-card p-5 flex flex-col">
          <div className="mb-6 flex-shrink-0">
            <h2 className="text-md font-semibold text-primary">Time Allocation</h2>
            <p className="text-xs text-muted">Focus by project category</p>
          </div>
          <div className="flex-1 relative min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTip />} />
                <Pie
                  data={CATEGORY_DATA}
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-primary">100%</span>
              <span className="text-2xs text-muted">Tracked</span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-4 pt-4 border-t border-border-subtle flex-shrink-0">
            {CATEGORY_DATA.map((c) => (
              <div key={c.name} className="flex items-center gap-1.5 text-2xs text-secondary">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        
        {/* Project Velocity (Area Chart) */}
        <div className="nx-card p-5 flex flex-col">
          <div className="mb-6 flex-shrink-0">
            <h2 className="text-md font-semibold text-primary">Project Velocity</h2>
            <p className="text-xs text-muted">Tasks added vs completed</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VELOCITY_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3FB950" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3FB950" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F85149" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F85149" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                <XAxis dataKey="date" stroke="#484F58" tick={{fill: '#8B949E', fontSize: 11}} axisLine={false} tickLine={false} />
                <YAxis stroke="#484F58" tick={{fill: '#8B949E', fontSize: 11}} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="completed" stroke="#3FB950" strokeWidth={2} fill="url(#colorCompleted)" name="Completed" />
                <Area type="monotone" dataKey="added" stroke="#F85149" strokeWidth={2} fill="url(#colorAdded)" name="Added" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Heatmap (GitHub Style) */}
        <div className="nx-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h2 className="text-md font-semibold text-primary">System Activity</h2>
              <p className="text-xs text-muted">Daily interaction map</p>
            </div>
            <div className="text-xs font-semibold text-accent-hover">
              342 Contributions
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center overflow-x-auto">
            <div className="flex gap-2">
              <div className="flex flex-col gap-[5px] pr-2 text-2xs text-muted font-mono justify-around py-1">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              <div className="flex gap-[5px]">
                {Array.from({ length: HEATMAP_WEEKS }).map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[5px]">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const dataPoint = HEATMAP_DATA.find(d => d.week === weekIndex && d.day === dayIndex);
                      const count = dataPoint ? dataPoint.count : 0;
                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className="w-[14px] h-[14px] rounded-sm transition-all hover:ring-1 hover:ring-accent cursor-crosshair"
                          style={{ backgroundColor: heatColor(count) }}
                          title={`${count} actions`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 mt-4 text-2xs text-muted font-mono">
              <span>Less</span>
              <div className="flex gap-[5px]">
                {[0, 1, 3, 5, 7].map((val) => (
                  <div key={val} className="w-[14px] h-[14px] rounded-sm" style={{ backgroundColor: heatColor(val) }} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}