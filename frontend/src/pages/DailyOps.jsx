import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { 
  Plus, Check, Calendar, Trash2, 
  Play, Square, RotateCcw, Target
} from "lucide-react";
import Modal from "@/components/shared/Modal";
import clsx from "clsx";

/* ── Pomodoro Config ── */
const POMO_MODES = {
  work:  { label: "Focus",       secs: 25 * 60, color: "#7C3AED", bg: "#F3E8FF" },
  short: { label: "Short Break", secs: 5 * 60,  color: "#10B981", bg: "#D1FAE5" },
  long:  { label: "Long Break",  secs: 15 * 60, color: "#22D3EE", bg: "#CFFAFE" },
};

export default function DailyOps() {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  /* ── State ── */
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("Tasks");
  
  /* ── Modals & Forms ── */
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", due: "", tags: "" });

  const [showNewEvent, setShowNewEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", time: "10:00", date: todayStr });

  const [showNewHabit, setShowNewHabit] = useState(false);
  const [habitForm, setHabitForm] = useState({ title: "" });

  /* ── PERSISTENT STATE FOR EVENTS & HABITS ── */
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('jarvis_events');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('jarvis_habits');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to Local Storage whenever they change
  useEffect(() => {
    localStorage.setItem('jarvis_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('jarvis_habits', JSON.stringify(habits));
  }, [habits]);

  /* ── Pomodoro State ── */
  const [mode, setMode] = useState("work");
  const [timeLeft, setTimeLeft] = useState(POMO_MODES.work.secs);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  /* ── Fetch Tasks from Supabase 'daily_tasks' ── */
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase.from('daily_tasks').select('*');
      if (data) setTasks(data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
      if (error) console.error("Error fetching daily tasks:", error);
    };
    fetchTasks();
  }, []);

  /* ── Pomodoro Timer Logic ── */
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer  = () => {
    setIsRunning(false);
    setTimeLeft(POMO_MODES[mode].secs);
  };
  const switchMode = (m) => {
    setMode(m);
    setIsRunning(false);
    setTimeLeft(POMO_MODES[m].secs);
  };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / POMO_MODES[mode].secs) * circumference;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  /* ── Task Database Logic ── */
  const createTask = async () => {
    if (!taskForm.title.trim()) return;
    
    const taskData = {
      title: taskForm.title,
      priority: taskForm.priority,
      status: "todo"
    };

    if (taskForm.due) taskData.due = taskForm.due;

    const tempId = `temp-${Date.now()}`;
    setTasks(prev => [{ id: tempId, ...taskData, created_at: new Date().toISOString() }, ...prev]);
    setTaskForm({ title: "", priority: "medium", due: "", tags: "" });
    setShowNewTask(false);

    const { data, error } = await supabase.from('daily_tasks').insert([taskData]).select();
    if (error) {
      console.error(error);
      alert("Database error: " + error.message + "\n\nMake sure your 'daily_tasks' table exists and has 'title', 'status', 'priority', and 'due' columns.");
      setTasks(prev => prev.filter(t => t.id !== tempId));
    } else if (data) {
      setTasks(prev => prev.map(t => t.id === tempId ? data[0] : t));
    }
  };

  const toggleTask = async (id) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;
    
    const newStatus = targetTask.status === "done" ? "todo" : "done";
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    const { error } = await supabase.from('daily_tasks').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error(error);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: targetTask.status } : t));
    }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('daily_tasks').delete().eq('id', id);
  };

  /* ── Local Schedule & Habits Logic ── */
  const createEvent = () => {
    if (!eventForm.title.trim()) return;
    setEvents(prev => [...prev, { id: Date.now(), ...eventForm }].sort((a, b) => a.time.localeCompare(b.time)));
    setEventForm({ title: "", time: "10:00", date: todayStr });
    setShowNewEvent(false);
  };

  const createHabit = () => {
    if (!habitForm.title.trim()) return;
    setHabits(prev => [...prev, { id: Date.now(), title: habitForm.title, streak: 0 }]);
    setHabitForm({ title: "" });
    setShowNewHabit(false);
  };

  /* ── Filtering Logic ── */
  const filteredTasks = tasks.filter(t => {
    if (filter === "Active") return t.status !== "done";
    if (filter === "Done") return t.status === "done";
    if (filter === "Today") {
      const isDueToday = t.due === todayStr;
      const createdStr = t.created_at ? t.created_at.split('T')[0] : null;
      const isCreatedToday = createdStr === todayStr;
      return isDueToday || (!t.due && isCreatedToday); 
    }
    return true;
  });

  const doneCount = tasks.filter(t => t.status === "done").length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full animate-fade-in" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", paddingTop: "10px", paddingBottom: "40px" }}>
      
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-1">Daily Ops</h1>
          <p className="text-sm text-[#64748B] font-medium">
            {format(now, "EEEE, MMMM d")} • {doneCount}/{tasks.length} tasks complete
          </p>
        </div>
        <div className="flex gap-2">
           {activeTab === "Schedule" && (
             <button onClick={() => setShowNewEvent(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#0F172A", color: "#FFF", boxShadow: "0 4px 15px rgba(15,23,42,0.2)" }}>
               <Plus size={16} /> New Event
             </button>
           )}
           {activeTab === "Habits" && (
             <button onClick={() => setShowNewHabit(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#10B981", color: "#FFF", boxShadow: "0 4px 15px rgba(16,185,129,0.2)" }}>
               <Plus size={16} /> New Habit
             </button>
           )}
           {activeTab === "Tasks" && (
             <button onClick={() => setShowNewTask(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}>
               <Plus size={16} /> New Task
             </button>
           )}
        </div>
      </div>

      {/* ── Day Progress Bar ── */}
      <div className="flex-shrink-0" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "24px", padding: "20px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", marginBottom: "24px" }}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-[#0F172A]">Day Progress</span>
          <span className="text-sm font-bold text-[#10B981]">{progressPct}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[#F1F5F9] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #34D399, #10B981)" }} />
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 pb-6">
        
        {/* LEFT COLUMN: Tasks / Schedule / Habits */}
        <div className="xl:col-span-2 flex flex-col">
          
          {/* Custom Tabs */}
          <div className="flex gap-2 p-1 bg-white border border-[#E2E8F0] rounded-xl mb-5 w-max shadow-sm flex-shrink-0">
            {["Tasks", "Schedule", "Habits"].map(t => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t)}
                className={clsx(
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeTab === t ? "bg-[#F8FAFC] text-[#0F172A] shadow-sm border border-[#E2E8F0]" : "text-[#64748B] hover:text-[#0F172A] border border-transparent"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "24px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", minHeight: "400px" }}>
            
            {/* ──────────────── TASKS VIEW ──────────────── */}
            {activeTab === "Tasks" && (
              <>
                <div className="flex gap-2 px-5 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC] flex-shrink-0">
                  {["All", "Today", "Active", "Done"].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setFilter(f)}
                      className={clsx(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        filter === f ? "bg-[#F3E8FF] text-[#7C3AED]" : "text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  {filteredTasks.length === 0 ? (
                    <div className="py-16 text-center text-sm font-medium text-[#94A3B8]">
                      {progressPct === 100 && tasks.length > 0 ? "All tasks complete! 🎉" : "No tasks found in this view."}
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const isDone = task.status === "done";
                      return (
                        <div key={task.id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => toggleTask(task.id)}
                              className={clsx(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer",
                                isDone ? "bg-[#10B981] border-[#10B981] text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-[#CBD5E1] hover:border-[#7C3AED]"
                              )}
                            >
                              {isDone && <Check size={12} strokeWidth={4} />}
                            </button>
                            
                            <div>
                              <div className={clsx("text-sm font-bold transition-colors", isDone ? "text-[#94A3B8] line-through" : "text-[#0F172A]")}>
                                {task.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold text-[#94A3B8]">
                                <Calendar size={12} /> {task.due ? format(parseISO(task.due), "MMM d, yyyy") : "Recently"}
                                {(task.tags || []).map((tag, idx) => (
                                  <span key={idx} className="bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded">#{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className={clsx(
                              "text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider",
                              task.priority === 'high' || task.priority === 'critical' ? "bg-[#FEE2E2] text-[#EF4444]" : 
                              task.priority === 'low' ? "bg-[#E0F2FE] text-[#3B82F6]" : 
                              "bg-[#FEF3C7] text-[#F59E0B]"
                            )}>
                              {task.priority || 'medium'}
                            </span>
                            <button onClick={() => deleteTask(task.id)} className="text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#EF4444] p-1">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}

            {/* ──────────────── SCHEDULE VIEW ──────────────── */}
            {activeTab === "Schedule" && (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                {events.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Calendar className="text-[#CBD5E1] mb-4" size={36} />
                    <h3 className="text-[#0F172A] font-bold text-lg mb-2">No events scheduled</h3>
                    <p className="text-[#64748B] text-sm mb-6">Your calendar is clear. Enjoy your deep work sessions.</p>
                    <button onClick={() => setShowNewEvent(true)} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:bg-[#F1F5F9]" style={{ backgroundColor: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                      <Plus size={16} /> Add Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map(ev => (
                      <div key={ev.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <div className="w-20 text-right flex flex-col items-end">
                          <span className="text-sm font-bold text-[#0F172A]">{ev.time}</span>
                          <span className="text-[10px] font-semibold text-[#94A3B8]">{ev.date ? format(parseISO(ev.date), "MMM d") : ""}</span>
                        </div>
                        <div className="w-1 h-10 rounded-full bg-[#0F172A]" />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-[#0F172A]">{ev.title}</h4>
                        </div>
                        <button onClick={() => setEvents(events.filter(e => e.id !== ev.id))} className="text-[#94A3B8] hover:text-[#EF4444]">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────────────── HABITS VIEW ──────────────── */}
            {activeTab === "Habits" && (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                {habits.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <RotateCcw className="text-[#CBD5E1] mb-4" size={36} />
                    <h3 className="text-[#0F172A] font-bold text-lg mb-2">Habit Tracker</h3>
                    <p className="text-[#64748B] text-sm mb-6">Track your daily routines and build streaks.</p>
                    <button onClick={() => setShowNewHabit(true)} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:bg-[#F1F5F9]" style={{ backgroundColor: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                      <Plus size={16} /> Add Habit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habits.map(habit => (
                      <div key={habit.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center text-[#10B981]">
                            <Target size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#0F172A]">{habit.title}</h4>
                            <span className="text-xs font-semibold text-[#94A3B8]">Streak: {habit.streak} days</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => setHabits(habits.map(h => h.id === habit.id ? {...h, streak: h.streak + 1} : h))} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#10B981] bg-[#D1FAE5] hover:bg-[#A7F3D0] transition-colors">
                             +1 Check
                           </button>
                           <button onClick={() => setHabits(habits.filter(h => h.id !== habit.id))} className="text-[#94A3B8] hover:text-[#EF4444] p-1.5">
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Pomodoro Timer */}
        <div className="flex flex-col">
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "24px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-[#0F172A]">Focus Timer</h3>
              <div className="text-xs font-bold text-[#64748B] flex items-center gap-1.5 bg-[#F1F5F9] px-2 py-1 rounded-md">
                0 sessions today
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-8">
              {Object.entries(POMO_MODES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  className={clsx(
                    "flex-1 text-xs font-bold py-2 rounded-lg transition-all",
                    mode === key ? "bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]" : "text-[#64748B] hover:text-[#0F172A]"
                  )}
                >
                  {config.label}
                </button>
              ))}
            </div>

            {/* PERFECTLY CENTERED POMODORO */}
            <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="8" />
                <circle 
                  cx="60" cy="60" r={radius} 
                  fill="none" 
                  stroke={POMO_MODES[mode].color} 
                  strokeWidth="8" 
                  strokeLinecap="round"
                  style={{ strokeDasharray: circumference, strokeDashoffset: strokeDashoffset, transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold font-mono text-[#0F172A] tracking-tight">{mins}:{secs}</span>
                <span className="text-xs font-semibold text-[#94A3B8] mt-1">{POMO_MODES[mode].label}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={resetTimer}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#E2E8F0] transition-colors"
              >
                <RotateCcw size={18} strokeWidth={2.5} />
              </button>
              <button 
                onClick={toggleTimer}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: POMO_MODES[mode].color, boxShadow: `0 8px 20px ${POMO_MODES[mode].color}40` }}
              >
                {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {isRunning ? "Pause" : "Start"}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── MODALS ── */}
      
      {/* New Task Modal */}
      <Modal open={showNewTask} onClose={() => setShowNewTask(false)} title="New Task" size="sm" footer={<><button className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors" onClick={() => setShowNewTask(false)}>Cancel</button><button className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.2)" }} onClick={createTask}>Add Task</button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Task Title</label>
            <input autoFocus value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && createTask()} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="What needs to be done?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Priority</label>
              <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED]">
                {["low","medium","high","critical"].map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Due Date (Optional)</label>
              <input type="date" value={taskForm.due} onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED]" />
            </div>
          </div>
        </div>
      </Modal>

      {/* New Event Modal (WITH DATE SELECTOR) */}
      <Modal open={showNewEvent} onClose={() => setShowNewEvent(false)} title="New Schedule Event" size="sm" footer={<><button className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors" onClick={() => setShowNewEvent(false)}>Cancel</button><button className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#0F172A", color: "#FFF" }} onClick={createEvent}>Add Event</button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Event Title</label>
            <input autoFocus value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && createEvent()} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A]" placeholder="e.g., Team Sync" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Date</label>
              <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Time</label>
              <input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A]" />
            </div>
          </div>
        </div>
      </Modal>

      {/* New Habit Modal */}
      <Modal open={showNewHabit} onClose={() => setShowNewHabit(false)} title="New Habit" size="sm" footer={<><button className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors" onClick={() => setShowNewHabit(false)}>Cancel</button><button className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#10B981", color: "#FFF" }} onClick={createHabit}>Add Habit</button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Habit Title</label>
            <input autoFocus value={habitForm.title} onChange={(e) => setHabitForm({ ...habitForm, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && createHabit()} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#10B981]" placeholder="e.g., Drink 2L Water" />
          </div>
        </div>
      </Modal>

    </div>
  );
}