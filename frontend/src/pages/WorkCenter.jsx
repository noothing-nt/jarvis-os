import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, MoreHorizontal, Calendar, 
  Search, Kanban, List 
} from "lucide-react";
import Modal from "@/components/shared/Modal";
import clsx from "clsx";
import { format } from "date-fns";

/* ── Kanban Column Configuration ── */
const COLUMNS = [
  { id: "backlog",     label: "Backlog",     color: "#94A3B8" },
  { id: "todo",        label: "To Do",       color: "#3B82F6" },
  { id: "in_progress", label: "In Progress", color: "#F59E0B" },
  { id: "review",      label: "In Review",   color: "#7C3AED" },
  { id: "done",        label: "Done",        color: "#10B981" }
];

const INITIAL_CARDS = {
  backlog: [], todo: [], in_progress: [], review: [], done: [],
};

const PRIORITY_BADGE = {
  critical: { bg: "#FEE2E2", text: "#EF4444" },
  high:     { bg: "#FEE2E2", text: "#EF4444" },
  medium:   { bg: "#FEF3C7", text: "#F59E0B" },
  low:      { bg: "#E0F2FE", text: "#3B82F6" },
};

/* ── Kanban Card Component ── */
function KanbanCard({ card, colId, onMove, onDelete, onDragStart }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, card.id, colId)}
      className="group relative cursor-grab active:cursor-grabbing transition-all hover:-translate-y-1"
      style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "16px", marginBottom: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-[14px] font-bold text-[#0F172A] leading-snug flex-1">
          {card.title}
        </h4>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#94A3B8] hover:text-[#7C3AED] p-1 rounded-md hover:bg-[#F1F5F9]"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden animate-scale-in py-1">
                {COLUMNS.filter((c) => c.id !== colId).map((col) => (
                  <button
                    key={col.id}
                    onClick={() => { onMove(card.id, colId, col.id); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
                  >
                    Move to {col.label}
                  </button>
                ))}
                <div className="h-px bg-[#F1F5F9] my-1" />
                <button
                  onClick={() => { onDelete(card.id, colId); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress bar for in-progress */}
      {card.progress !== undefined && (
        <div className="mb-3">
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#F1F5F9]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${card.progress}%`,
                background: card.progress >= 75 ? "#10B981" : card.progress >= 40 ? "#3B82F6" : "#F59E0B",
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shadow-sm" style={{ background: "linear-gradient(135deg, #7C3AED, #22D3EE)" }}>
            {card.assignee || "O"}
          </div>
          <span 
            className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider"
            style={{ backgroundColor: PRIORITY_BADGE[card.priority]?.bg || "#F1F5F9", color: PRIORITY_BADGE[card.priority]?.text || "#64748B" }}
          >
            {card.priority || 'medium'}
          </span>
        </div>
        {card.due && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8]">
            <Calendar size={12} />
            {format(new Date(card.due), "MMM d")}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkCenter() {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [showNew, setShowNew] = useState(false);
  const [newCard, setNewCard] = useState({ title: "", priority: "medium", colId: "todo" });
  const [search, setSearch] = useState("");
  const [view, setView] = useState("kanban");
  const [draggedTask, setDraggedTask] = useState(null);

  // 1. Fetch data on load
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase.from('tasks').select('*');
      if (data) {
        const grouped = { backlog: [], todo: [], in_progress: [], review: [], done: [] };
        data.forEach(task => {
          const status = task.status || 'todo';
          if (grouped[status]) {
            grouped[status].push(task);
          } else {
             grouped.todo.push(task);
          }
        });
        setCards(grouped);
      }
      if (error) console.error("Error fetching tasks:", error);
    };
    fetchTasks();
  }, []);

  // 2. Delete
  const deleteCard = async (taskId, colId) => {
    setCards((prev) => ({ ...prev, [colId]: prev[colId].filter((c) => c.id !== taskId) }));
    await supabase.from('tasks').delete().eq('id', taskId);
  }; 

  // 3. Move (Handles both dropdown and drag/drop)
  const moveCard = async (cardId, fromCol, toCol) => {
    if (fromCol === toCol) return;
    
    setCards((prev) => {
      const card = prev[fromCol].find((c) => c.id === cardId);
      if (!card) return prev;
      return {
        ...prev,
        [fromCol]: prev[fromCol].filter((c) => c.id !== cardId),
        [toCol]:   [{ ...card, status: toCol }, ...prev[toCol]],
      };
    });

    // FIXED: Only save the status, not the 'done' property!
    await supabase.from('tasks').update({ status: toCol }).eq('id', cardId);
  };

  /* ── Native Drag & Drop Handlers ── */
  const handleDragStart = (e, taskId, sourceCol) => {
    setDraggedTask({ id: taskId, sourceCol });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = (e, targetCol) => {
    e.preventDefault();
    if (draggedTask) {
      moveCard(draggedTask.id, draggedTask.sourceCol, targetCol);
      setDraggedTask(null);
    }
  };

  // 4. Create Task
  const handleCreate = async () => {
    if (!newCard.title.trim()) return;
    
    // FIXED: Only save the status, not the 'done' property!
    const newTask = { 
      title: newCard.title, 
      priority: newCard.priority, 
      status: newCard.colId
    };

    const tempId = `temp-${Date.now()}`;
    setCards((prev) => ({
      ...prev,
      [newCard.colId]: [{ id: tempId, ...newTask }, ...prev[newCard.colId]],
    }));
    setNewCard({ title: "", priority: "medium", colId: "todo" });
    setShowNew(false);

    const { data, error } = await supabase.from('tasks').insert([newTask]).select();
    if (error) {
      alert(`Supabase rejected the task: ${error?.message}`);
      setCards(prev => ({ ...prev, [newCard.colId]: prev[newCard.colId].filter(c => c.id !== tempId) }));
    } else if (data) {
      setCards((prev) => ({ ...prev, [newCard.colId]: prev[newCard.colId].map(c => c.id === tempId ? data[0] : c) }));
    }
  };

  const totalCards = Object.values(cards).flat().length;
  const doneCards  = cards.done.length;
  const progressPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;

  return (
    <div className="flex flex-col h-full animate-fade-in" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", padding: "10px 0 40px", color: "#0F172A" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap flex-shrink-0">
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "4px", color: "#0F172A" }}>Work Center</h1>
          <p style={{ fontSize: "14px", color: "#64748B" }}>{doneCards}/{totalCards} tasks complete this sprint</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl p-1 shadow-sm">
            {[
              { id: "kanban", icon: Kanban },
              { id: "list",   icon: List   },
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={clsx(
                  "p-2 rounded-lg transition-all",
                  view === id ? "bg-[#F1F5F9] text-[#0F172A]" : "text-[#94A3B8] hover:text-[#475569]"
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks..."
              className="w-48 bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] shadow-sm transition-all"
            />
          </div>

          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5" 
            style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* ── Sprint progress bar ─────────────────────────────── */}
      <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "24px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", marginBottom: "24px" }} className="flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-[#0F172A]">Sprint #4</span>
            <span className="text-[#10B981] bg-[#D1FAE5] px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide">Active</span>
            <span className="text-sm font-medium text-[#64748B] hidden sm:block">Apr 21 – May 4, 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-[#64748B]">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                <span>{col.label}: {cards[col.id].length}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Sprint Progress</span>
          <span className="text-xs font-bold text-[#7C3AED]">{progressPct}%</span>
        </div>
        <div style={{ width: "100%", height: "12px", background: "#F1F5F9", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: "#7C3AED", borderRadius: "10px", transition: "width 1s ease-in-out" }} />
        </div>
      </div>

      {/* ── Kanban board ───────────────────────────────────── */}
      {view === "kanban" && (
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar">
          {COLUMNS.map((col) => {
            const colCards = (cards[col.id] || []).filter((c) =>
              !search || c.title.toLowerCase().includes(search.toLowerCase())
            );

            return (
              <div 
                key={col.id} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex flex-col flex-shrink-0"
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "24px", minWidth: "320px", height: "100%", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}
              >
                {/* Column header */}
                <div style={{ padding: "18px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: col.color }} />
                    <h3 className="text-sm font-bold text-[#0F172A]">{col.label}</h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md text-[#64748B] bg-[#F1F5F9]">
                      {colCards.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setNewCard((f) => ({ ...f, colId: col.id })); setShowNew(true); }}
                    className="text-[#94A3B8] hover:text-[#7C3AED] transition-colors bg-[#F8FAFC] hover:bg-[#F3E8FF] p-1.5 rounded-lg"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-3 overflow-y-auto" style={{ background: "#F8FAFC" }}>
                  {colCards.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-xs font-bold text-[#94A3B8] border-2 border-dashed border-[#E2E8F0] rounded-xl m-2">
                      Drop tasks here
                    </div>
                  ) : (
                    colCards.map((card) => (
                      <KanbanCard
                        key={card.id}
                        card={card}
                        colId={col.id}
                        onMove={moveCard}
                        onDelete={deleteCard}
                        onDragStart={handleDragStart}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List view ──────────────────────────────────────── */}
      {view === "list" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #F1F5F9", borderRadius: "24px", padding: "4px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }} className="overflow-hidden flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">Task</th>
                <th className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                <th className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">Priority</th>
                <th className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {Object.entries(cards).flatMap(([colId, colCards]) =>
                colCards
                  .filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()))
                  .map((card) => {
                    const col = COLUMNS.find((c) => c.id === colId);
                    return (
                      <tr key={card.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-4">
                          <span className="text-sm text-[#0F172A] font-bold">{card.title}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: col?.color }} />
                            <span className="text-xs font-bold text-[#64748B]">{col?.label}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span 
                            className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider"
                            style={{ backgroundColor: PRIORITY_BADGE[card.priority]?.bg || "#F1F5F9", color: PRIORITY_BADGE[card.priority]?.text || "#64748B" }}
                          >
                            {card.priority || 'medium'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold text-[#94A3B8]">
                            {card.due ? format(new Date(card.due), "MMM d, yyyy") : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── New task modal ──────────────────────────────────── */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Create Task"
        size="sm"
        footer={
          <>
            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.2)" }} onClick={handleCreate}>Create Task</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Task Title *</label>
            <input
              autoFocus
              value={newCard.title}
              onChange={(e) => setNewCard((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="What needs to be done?"
              className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Priority</label>
              <select
                value={newCard.priority}
                onChange={(e) => setNewCard((f) => ({ ...f, priority: e.target.value }))}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              >
                {["low","medium","high","critical"].map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Column</label>
              <select
                value={newCard.colId}
                onChange={(e) => setNewCard((f) => ({ ...f, colId: e.target.value }))}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}