import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { TrendingUp, Award, Zap, Target } from "lucide-react";
import { format, subDays, isAfter, isBefore } from "date-fns";
import clsx from "clsx";
import { Skeleton } from "@/components/shared/Skeleton";

// ── Helpers ─────────────────────────────────────────────────────────

function heatColor(count) {
  if (count === 0) return "#F1F5F9";
  if (count <= 1) return "#E9D5FF";
  if (count <= 2) return "#C084FC";
  if (count <= 4) return "#9333EA";
  return "#6D28D9";
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px", color: "#0F172A", fontSize: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
      <p style={{ color: "#64748B", marginBottom: "4px", fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span style={{ color: p.color || p.fill }}>●</span>
          <span style={{ color: "#64748B", textTransform: "capitalize", fontWeight: 500 }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  // Real Data States
  const [kpis, setKpis] = useState({ tasksDone: 0, ideas: 0, activity: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [velocityData, setVelocityData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    async function fetchAndCrunchData() {
      setLoading(true);
      try {
        const { data: tasks } = await supabase.from('tasks').select('*');
        const { data: projects } = await supabase.from('projects').select('*');
        const { data: ideas } = await supabase.from('ideas').select('*');

        const safeTasks = tasks || [];
        const safeProjs = projects || [];
        const safeIdeas = ideas || [];

        const now = new Date();

        // 1. Time Allocation (Category Data)
        const catMap = {};
        safeProjs.forEach(p => {
          const cat = p.category || "Other";
          catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const catColors = ["#7C3AED", "#22D3EE", "#10B981", "#F59E0B", "#F43F5E", "#3B82F6"];
        const realCategories = Object.keys(catMap).map((k, i) => ({
          name: k, value: catMap[k], color: catColors[i % catColors.length]
        })).sort((a,b) => b.value - a.value);
        setCategoryData(realCategories.length ? realCategories : [{ name: "No Projects", value: 1, color: "#F1F5F9" }]);

        // 2. Velocity Data (Last 30 Days)
        const vel = [];
        for (let i = 29; i >= 0; i--) {
          const targetDate = subDays(now, i);
          const dateStr = format(targetDate, "yyyy-MM-dd");
          
          const added = safeTasks.filter(t => t.created_at?.startsWith(dateStr)).length;
          const completed = safeTasks.filter(t => (t.status === 'done' || t.done) && (t.due === dateStr || t.created_at?.startsWith(dateStr))).length;
          
          vel.push({ date: format(targetDate, "MMM d"), added, completed });
        }
        setVelocityData(vel);

        // 3. Weekly Output (Last 8 Weeks)
        const weeks = [];
        for(let i = 0; i < 8; i++) {
          const weeksAgo = 7 - i;
          const startDate = subDays(now, (weeksAgo + 1) * 7);
          const endDate = subDays(now, weeksAgo * 7);
          
          const tasksDone = safeTasks.filter(t => (t.status === 'done' || t.done) && new Date(t.created_at || 0) >= startDate && new Date(t.created_at || 0) <= endDate).length;
          const ideasAdded = safeIdeas.filter(id => new Date(id.created_at || 0) >= startDate && new Date(id.created_at || 0) <= endDate).length;
          
          weeks.push({ week: `W${i+1}`, tasks: tasksDone, ideas: ideasAdded, focus: 0 }); // Focus defaults to 0 as time-tracking isn't in DB yet
        }
        setWeeklyData(weeks);

        // 4. GitHub-Style Heatmap (Last 15 Weeks)
        const activityMap = {};
        const recordActivity = (dateString) => {
            if(!dateString) return;
            const d = dateString.split('T')[0];
            activityMap[d] = (activityMap[d] || 0) + 1;
        };
        safeTasks.forEach(t => recordActivity(t.created_at));
        safeProjs.forEach(p => recordActivity(p.lastModified || p.created_at));
        safeIdeas.forEach(i => recordActivity(i.created_at));

        const totalActivity = Object.values(activityMap).reduce((a,b) => a + b, 0);

        const heat = [];
        let dayCounter = 0;
        for (let w = 0; w < 15; w++) {
          for (let d = 0; d < 7; d++) {
             const daysAgo = (15 * 7 - 1) - dayCounter;
             const dateObj = subDays(now, daysAgo);
             const dateStr = format(dateObj, "yyyy-MM-dd");
             heat.push({ week: w, day: d, count: activityMap[dateStr] || 0 });
             dayCounter++;
          }
        }
        setHeatmapData(heat);

        // Update KPIs
        setKpis({
          tasksDone: safeTasks.filter(t => t.status === 'done' || t.done).length,
          ideas: safeIdeas.length,
          activity: totalActivity
        });

      } catch (err) {
        console.error("Analytics Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAndCrunchData();
  }, [timeRange]);

  return (
    // STRICT HEIGHT CALCULATION: Fits perfectly into viewport minus TopBar (64px)
    <div style={{ backgroundColor: "#F8FAFC", height: "calc(100vh - 64px)", padding: "12px 24px" }} className="animate-fade-in flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-3 flex-shrink-0">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "0px", color: "#0F172A" }}>
            System Analytics
          </h1>
          <p style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
            Performance metrics and productivity insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-lg p-1 shadow-sm">
            {["7d", "30d", "90d"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={clsx(
                  "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                  timeRange === range ? "bg-[#F1F5F9] text-[#0F172A]" : "text-[#94A3B8] hover:text-[#475569]"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:-translate-y-0.5 shadow-sm" style={{ backgroundColor: "#7C3AED" }}>
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-3 flex-shrink-0">
          {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="p-4 rounded-[16px] bg-white shadow-sm border border-[#F1F5F9]"><Skeleton className="h-4 w-1/2 mb-2" /><Skeleton className="h-6 w-3/4" /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-3 flex-shrink-0">
          {[
            { label: "Deep Work Hours", value: "0h",              sub: "Time tracking disabled", icon: Zap,        color: "#F59E0B", bg: "#FEF3C7", trend: "0%" },
            { label: "Tasks Completed", value: kpis.tasksDone,    sub: "All time",               icon: Target,     color: "#10B981", bg: "#D1FAE5", trend: "+1" },
            { label: "Velocity Score",  value: "Live",            sub: "Real-time sync",         icon: TrendingUp, color: "#22D3EE", bg: "#CFFAFE", trend: "ON" },
            { label: "Total XP",        value: kpis.activity * 5, sub: "Based on DB activity",   icon: Award,      color: "#7C3AED", bg: "#F3E8FF", trend: "+XP" },
          ].map(({ label, value, sub, icon: Icon, color, bg, trend }) => (
            <div key={label} className="p-4 rounded-[16px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F1F5F9]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg, color: color }}>
                  <Icon size={16} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
                  {trend}
                </span>
              </div>
              <h3 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">{label}</h3>
              <div className="text-xl font-bold text-[#0F172A] mb-0.5 tracking-tight">{value}</div>
              <div className="text-[10px] font-medium text-[#94A3B8]">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts Grid (Flex-1 perfectly divides remaining screen height) ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        
        {/* Charts Row 1 */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-3 min-h-0">
          
          {/* Weekly Output (Bar Chart) */}
          <div className="xl:col-span-2 p-4 rounded-[20px] bg-white border border-[#F1F5F9] shadow-sm flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Weekly Output</h2>
                <p className="text-[11px] font-medium text-[#64748B]">Tasks vs Focus Hours vs Ideas</p>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="week" stroke="#94A3B8" tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis stroke="#94A3B8" tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="focus" fill="#22D3EE" radius={[4, 4, 0, 0]} maxBarSize={12} name="Focus Hours" />
                  <Bar dataKey="tasks" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={12} name="Tasks Done" />
                  <Bar dataKey="ideas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={12} name="Ideas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Time Allocation (Donut Chart) */}
          <div className="p-4 rounded-[20px] bg-white border border-[#F1F5F9] shadow-sm flex flex-col min-h-0">
            <div className="mb-0 flex-shrink-0">
              <h2 className="text-sm font-bold text-[#0F172A]">Time Allocation</h2>
              <p className="text-[11px] font-medium text-[#64748B]">Focus by project category</p>
            </div>
            <div className="flex-1 relative min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTip />} />
                  <Pie data={categoryData} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value" stroke="none">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-[#0F172A]">100%</span>
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Tracked</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 pt-2 border-t border-[#F1F5F9] flex-shrink-0">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B]">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0">
          
          {/* Project Velocity (Area Chart) */}
          <div className="p-4 rounded-[20px] bg-white border border-[#F1F5F9] shadow-sm flex flex-col min-h-0">
            <div className="mb-2 flex-shrink-0">
              <h2 className="text-sm font-bold text-[#0F172A]">Project Velocity</h2>
              <p className="text-[11px] font-medium text-[#64748B]">Tasks added vs completed</p>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                  <YAxis stroke="#94A3B8" tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1, strokeDasharray: '5 5' }} />
                  <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2.5} fill="url(#colorCompleted)" name="Completed" activeDot={{ r: 4, strokeWidth: 0 }} dot={{ r: 0 }} />
                  <Area type="monotone" dataKey="added" stroke="#EF4444" strokeWidth={2.5} fill="url(#colorAdded)" name="Added" activeDot={{ r: 4, strokeWidth: 0 }} dot={{ r: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Heatmap (GitHub Style) */}
          <div className="p-4 rounded-[20px] bg-white border border-[#F1F5F9] shadow-sm flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">System Activity</h2>
                <p className="text-[11px] font-medium text-[#64748B]">Daily interaction map</p>
              </div>
              <div className="text-[11px] font-bold text-[#7C3AED] bg-[#F3E8FF] px-2 py-1 rounded-md">
                {kpis.activity} Contributions
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center overflow-x-auto custom-scrollbar">
              <div className="flex gap-1.5">
                <div className="flex flex-col gap-[4px] pr-2 text-[10px] font-bold text-[#94A3B8] justify-around py-0.5">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>
                <div className="flex gap-[4px]">
                  {Array.from({ length: 15 }).map((_, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[4px]">
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const dataPoint = heatmapData.find(d => d.week === weekIndex && d.day === dayIndex);
                        const count = dataPoint ? dataPoint.count : 0;
                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            className="w-[12px] h-[12px] rounded-[3px] transition-all hover:ring-1 hover:ring-[#7C3AED] cursor-crosshair"
                            style={{ backgroundColor: heatColor(count) }}
                            title={`${count} actions`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 mt-3 text-[10px] font-bold text-[#94A3B8]">
                <span>Less</span>
                <div className="flex gap-[4px]">
                  {[0, 1, 2, 4, 6].map((val) => (
                    <div key={val} className="w-[12px] h-[12px] rounded-[3px]" style={{ backgroundColor: heatColor(val) }} />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}