import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { supabase }            from "@/lib/supabase";
import { useApp }              from "@/App";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2, Clock, Zap, FolderOpen, Brain, 
  ArrowRight, Plus, Target, Flame, Lightbulb
} from "lucide-react";
import { format, subDays } from "date-fns";
import { Skeleton } from "@/components/shared/Skeleton";

/* ── Light Mode Tooltip ────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "10px", color: "#0F172A", fontSize: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
      <p style={{ color: "#64748B", marginBottom: "4px", fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span style={{ color: p.color }}>●</span>
          <span style={{ color: "#64748B", textTransform: "capitalize", fontWeight: 500 }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useApp();
  const navigate = useNavigate();
  
  // Real State for Supabase Data
  const [tasks, setTasks] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [weeklyPct, setWeeklyPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    tasksTotal: 0, tasksDone: 0, projectsTotal: 0, notesTotal: 0
  });

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "NooThing";

  // WAKE UP SUPABASE ON LOAD & CALCULATE LIVE METRICS
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const { data: projectsData } = await supabase.from('projects').select('*');
        const { data: tasksData } = await supabase.from('tasks').select('*');
        const { data: notesData } = await supabase.from('notes').select('*');
        // Fetch ALL ideas for accurate graph calculation
        const { data: ideasData } = await supabase.from('ideas').select('*').order('created_at', { ascending: false });

        const tsks = tasksData || [];
        const ids = ideasData || [];
        
        setStats({
          tasksTotal: tsks.length,
          tasksDone: tsks.filter(t => t.done || t.completed || t.status === 'done').length,
          projectsTotal: (projectsData || []).length,
          notesTotal: (notesData || []).length + ids.length
        });

        // Get 5 active tasks & Top 4 recent ideas for the lists
        setTasks(tsks.filter(t => !t.done && t.status !== 'done').slice(0, 5));
        setIdeas(ids.slice(0, 4));

        const now = new Date();

        // 1. CALCULATE LIVE 14-DAY ACTIVITY DATA
        const actData = [];
        for (let i = 13; i >= 0; i--) {
          const targetDate = subDays(now, i);
          const dateStr = format(targetDate, "yyyy-MM-dd");
          
          // Count interactions (created or updated) on that specific day
          const tasksCount = tsks.filter(t => t.created_at?.startsWith(dateStr) || t.updated_at?.startsWith(dateStr) || t.due === dateStr).length;
          const ideasCount = ids.filter(idea => idea.created_at?.startsWith(dateStr)).length;
          
          actData.push({ 
            date: format(targetDate, "MMM d"), 
            tasks: tasksCount, 
            ideas: ideasCount 
          });
        }
        setActivityData(actData);

        // 2. CALCULATE LIVE WEEKLY COMPLETION %
        const sevenDaysAgo = subDays(now, 7);
        const tasksThisWeek = tsks.filter(t => new Date(t.created_at || 0) >= sevenDaysAgo || new Date(t.updated_at || 0) >= sevenDaysAgo);
        const doneThisWeek = tasksThisWeek.filter(t => t.done || t.status === 'done' || t.completed);
        
        const pctThisWeek = tasksThisWeek.length > 0 ? Math.round((doneThisWeek.length / tasksThisWeek.length) * 100) : 0;
        setWeeklyPct(pctThisWeek);

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.done;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: newStatus } : t));
    setStats(prev => ({ ...prev, tasksDone: newStatus ? prev.tasksDone + 1 : prev.tasksDone - 1 }));
    await supabase.from('tasks').update({ done: newStatus, status: newStatus ? 'done' : 'todo', updated_at: new Date().toISOString() }).eq('id', id);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const pct = stats.tasksTotal > 0 ? Math.round((stats.tasksDone / stats.tasksTotal) * 100) : 0;

  return (
    <div style={{ backgroundColor: "#F8FAFC", height: "calc(100vh - 64px)", padding: "16px 24px" }} className="animate-fade-in flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div>
          <div style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "2px", color: "#0F172A" }}>
            {greeting}, {name} 👋
          </div>
          <div style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")} • Here's your command overview.
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate("/work")} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0F172A", padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }} className="hover:bg-[#F8FAFC]">
            <Target size={14} /> Open Work Center
          </button>
          <button onClick={() => navigate("/daily")} style={{ background: "#7C3AED", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 15px rgba(124,58,237,0.3)", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }} className="hover:bg-[#6D28D9] hover:-translate-y-0.5">
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4 flex-shrink-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: "#FFF", borderRadius: "16px", padding: "16px", border: "1px solid #E2E8F0" }}><Skeleton className="h-4 w-1/2 mb-3" /><Skeleton className="h-6 w-3/4" /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4 flex-shrink-0">
          {[
            { label: "Tasks Completed", value: stats.tasksDone, icon: <CheckCircle2 size={16}/>, color: "#7C3AED", bg: "#F3E8FF", sub: "Today", trend: `${pct}%`, trendColor: "#7C3AED" },
            { label: "Active Projects", value: stats.projectsTotal, icon: <FolderOpen size={16}/>, color: "#10B981", bg: "#D1FAE5", sub: "Total", trend: "Live", trendColor: "#10B981" },
            { label: "Focus Hours", value: "0", icon: <Clock size={16}/>, color: "#3B82F6", bg: "#DBEAFE", sub: "This week", trend: "0h", trendColor: "#3B82F6" },
            { label: "XP Earned", value: "0", icon: <Zap size={16}/>, color: "#7C3AED", bg: "#F3E8FF", sub: "Level 1", trend: "0", trendColor: "#7C3AED" },
            { label: "Streak", value: "0 days", icon: <Flame size={16}/>, color: "#F59E0B", bg: "#FEF3C7", sub: "Best: 0", trend: "-", trendColor: "#F59E0B", valSize: "18px" },
            { label: "Ideas Captured", value: stats.notesTotal, icon: <Brain size={16}/>, color: "#22D3EE", bg: "#CFFAFE", sub: "In Vault", trend: "0", trendColor: "#22D3EE" },
          ].map((s, i) => (
            <div key={i} className="group cursor-default transition-all" style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "16px", padding: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
              <div className="flex justify-between items-start mb-2">
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: s.bg, color: s.color }}>{s.icon}</div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: s.trendColor }}>{s.trend}</span>
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ fontSize: s.valSize || "24px", fontWeight: 700, color: "#0F172A", marginBottom: "0px", letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* LEFT COL */}
        <div className="xl:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* Live Area Chart */}
          <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }} className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-start mb-4 flex-shrink-0">
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "2px" }}>Statistics</div>
                <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>Last 14 days of output (Live Sync)</div>
              </div>
              <div className="flex gap-4 text-[11px] font-bold text-[#64748B]">
                <span className="flex items-center gap-1.5"><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED" }}/> Tasks</span>
                <span className="flex items-center gap-1.5"><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22D3EE" }}/> Ideas</span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {loading ? (
                 <div className="h-full flex items-center justify-center text-xs font-bold text-[#94A3B8]">Loading Telemetry...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorPurpleLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15}/><stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCyanLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.15}/><stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1, strokeDasharray: '5 5' }} />
                    <Area type="monotone" dataKey="tasks" stroke="#7C3AED" strokeWidth={3} fill="url(#colorPurpleLight)" activeDot={{ r: 5, fill: "#7C3AED", stroke: "#FFF", strokeWidth: 2 }} dot={{ r: 0 }} />
                    <Area type="monotone" dataKey="ideas" stroke="#22D3EE" strokeWidth={3} fill="url(#colorCyanLight)" activeDot={{ r: 5, fill: "#22D3EE", stroke: "#FFF", strokeWidth: 2 }} dot={{ r: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Live Weekly Task Completion */}
          <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }} className="flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Weekly Task Completion</div>
                <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>Tasks done vs total this week</div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", background: "#F3E8FF", color: "#7C3AED" }}>{weeklyPct}% avg</span>
            </div>
            <div style={{ width: "100%", height: "12px", background: "#F1F5F9", borderRadius: "10px", overflow: "hidden" }}>
               <div style={{ width: `${weeklyPct}%`, height: "100%", background: "#7C3AED", borderRadius: "10px", transition: "width 1s ease-in-out" }} />
            </div>
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="flex flex-col gap-4 min-h-0">
          
          {/* Starting Tasks */}
          <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }} className="flex-1 flex flex-col min-h-0">
            <div style={{ marginBottom: "12px", flexShrink: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "2px" }}>Starting Tasks</div>
              <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>{stats.tasksDone}/{stats.tasksTotal} complete</div>
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {tasks.length > 0 ? tasks.map((task) => (
                <div key={task.id} onClick={() => toggleTask(task.id)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", border: "1px solid #F1F5F9", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" }} className="hover:border-[#E2E8F0] hover:shadow-sm">
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: `2px solid ${task.done ? "#10B981" : "#CBD5E1"}`, background: task.done ? "#10B981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: "10px", transition: "all 0.2s" }}>
                    {task.done && "✓"}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: task.done ? "#94A3B8" : "#0F172A", textDecoration: task.done ? "line-through" : "none", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {task.title}
                  </div>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-xs font-bold text-[#94A3B8]">No tasks to start.</div>
              )}
            </div>
          </div>

          {/* Idea Vault Integration */}
          <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }} className="flex-1 flex flex-col min-h-0">
             <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Recent Ideas</div>
                <span onClick={() => navigate("/intel")} style={{ fontSize: "10px", fontWeight: 700, color: "#F59E0B", background: "#FEF3C7", padding: "4px 8px", borderRadius: "6px", cursor: "pointer" }} className="hover:bg-[#FDE68A] transition-colors">Open Vault</span>
             </div>
             <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
               {ideas.length > 0 ? ideas.map((idea) => (
                 <div key={idea.id} className="flex gap-3 items-start border-b border-[#F1F5F9] pb-3 last:border-0 last:pb-0">
                   <Lightbulb size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="text-xs font-bold text-[#0F172A] mb-0.5">{idea.title || "New Concept"}</p>
                     <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed font-medium">"{idea.raw}"</p>
                   </div>
                 </div>
               )) : (
                 <div className="h-full flex items-center justify-center text-xs font-bold text-[#94A3B8]">No ideas captured yet.</div>
               )}
             </div>
          </div>

          {/* JARVIS AI Card */}
          <div style={{ background: "linear-gradient(135deg, #F3E8FF 0%, #FFFFFF 100%)", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "24px 20px", position: "relative", overflow: "hidden", boxShadow: "0 10px 30px rgba(124,58,237,0.05)" }} className="flex-shrink-0">
            <div style={{ position: "relative", zIndex: 10, width: "65%" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#7C3AED", marginBottom: "4px", letterSpacing: "-0.5px" }}>JARVIS AI</div>
              <div style={{ fontSize: "12px", color: "#475569", fontWeight: 500, marginBottom: "16px", lineHeight: "1.4" }}>Your autonomous intelligence center.</div>
              <button onClick={() => navigate("/intel")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#0F172A", cursor: "pointer", background: "none", border: "none", padding: 0, transition: "gap 0.2s" }} className="hover:gap-2">
                Initialize <ArrowRight size={14} />
              </button>
            </div>
            {/* Glowing Abstract Orb */}
            <div style={{
              position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
              width: "80px", height: "80px", borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #D8B4FE, #7C3AED, #4C1D95)",
              boxShadow: "0 10px 30px rgba(124,58,237,0.4), inset -10px -10px 20px rgba(0,0,0,0.2)",
              zIndex: 1
            }}>
               <div style={{ position:"absolute", inset: "-15px", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "50%" }}></div>
               <div style={{ position:"absolute", inset: "-30px", border: "1px dashed rgba(124,58,237,0.1)", borderRadius: "50%" }}></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}