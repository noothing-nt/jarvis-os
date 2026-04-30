import { useState } from "react";
import { Plus, Filter, MoreHorizontal, User, Calendar,
         Tag, ChevronDown, GripVertical, Search,
         Kanban, List, LayoutGrid } from "lucide-react";
import Badge  from "@/components/shared/Badge";
import Modal  from "@/components/shared/Modal";
import EmptyState from "@/components/shared/EmptyState";
import clsx from "clsx";
import { format } from "date-fns";

const COLUMNS = [
  { id: "backlog",     label: "Backlog",     color: "#484F58", count: 4  },
  { id: "todo",        label: "To Do",       color: "#2F81F7", count: 6  },
  { id: "in_progress", label: "In Progress", color: "#D29922", count: 3  },
  { id: "review",      label: "In Review",   color: "#A371F7", count: 2  },
  { id: "done",        label: "Done",        color: "#3FB950", count: 9  },
];

const INITIAL_CARDS = {
  backlog: [],
  todo: [],
  in_progress: [],
  review: [],
  done: [],
};

const PRIORITY_BADGE = {
  critical: "red",
  high:     "red",
  medium:   "amber",
  low:      "gray",
};

// 1. ADD onDelete TO THE PROPS HERE:
function KanbanCard({ card, colId, onMove, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="kanban-card group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-primary leading-snug flex-1">
          {card.title}
        </p>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn btn-ghost btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ width: 22, height: 22, padding: 2 }}
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-30 w-36
                              bg-overlay border border-border rounded-lg shadow-modal
                              overflow-hidden animate-scale-in">
                {COLUMNS.filter((c) => c.id !== colId).map((col) => (
                  <button
                    key={col.id}
                    onClick={() => { onMove(card.id, colId, col.id); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-secondary
                               hover:bg-raised hover:text-primary transition-colors"
                  >
                    Move to {col.label}
                  </button>
                ))}
                
                {/* 2. ADD THE DELETE BUTTON HERE: */}
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => { onDelete(card.id, colId); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors"
                >
                  Delete Task
                </button>
                
              </div>
            </>
          )}
        </div>
      </div>
// ... rest of the KanbanCard component stays exactly the same ...

      {/* Progress bar for in-progress */}
      {card.progress !== undefined && (
        <div className="mb-2">
          <div className="nx-progress">
            <div
              className="nx-progress-fill"
              style={{
                width: `${card.progress}%`,
                background: card.progress >= 75 ? "#3FB950" : card.progress >= 40 ? "#2F81F7" : "#D29922",
              }}
            />
          </div>
          <div className="text-2xs text-muted mt-0.5 text-right">{card.progress}%</div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {card.tags.map((tag) => (
          <span key={tag} className="badge badge-gray text-2xs">#{tag}</span>
        ))}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-accent-muted border border-accent/20
                          flex items-center justify-center text-2xs font-bold text-accent-hover">
            {card.assignee}
          </div>
          <Badge variant={PRIORITY_BADGE[card.priority] || "gray"}>
            {card.priority}
          </Badge>
        </div>
        {card.due && (
          <div className="flex items-center gap-1 text-2xs text-muted">
            <Calendar size={10} />
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
  const deleteCard = (taskId, colId) => {
    setCards((prev) => ({
      ...prev,
      [colId]: prev[colId].filter((c) => c.id !== taskId)
    }));
  }; 

  const moveCard = (cardId, fromCol, toCol) => {
    setCards((prev) => {
      const card = prev[fromCol].find((c) => c.id === cardId);
      if (!card) return prev;
      return {
        ...prev,
        [fromCol]: prev[fromCol].filter((c) => c.id !== cardId),
        [toCol]:   [card, ...prev[toCol]],
      };
    });
  };

  const handleCreate = () => {
    if (!newCard.title.trim()) return;
    const id = `new-${Date.now()}`;
    setCards((prev) => ({
      ...prev,
      [newCard.colId]: [
        { id, title: newCard.title, priority: newCard.priority,
          tags: [], assignee: "AK", due: null },
        ...prev[newCard.colId],
      ],
    }));
    setNewCard({ title: "", priority: "medium", colId: "todo" });
    setShowNew(false);
  };

  const totalCards = Object.values(cards).flat().length;
  const doneCards  = cards.done.length;

  return (
    <div className="flex flex-col h-full animate-fade-in" style={{ minHeight: "calc(100vh - 140px)" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-primary">Work Center</h1>
          <p className="text-sm text-muted mt-0.5">
            {doneCards}/{totalCards} tasks complete this sprint
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
            {[
              { id: "kanban", icon: Kanban },
              { id: "list",   icon: List   },
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={clsx(
                  "p-1.5 rounded transition-all",
                  view === id
                    ? "bg-raised text-primary"
                    : "text-muted hover:text-secondary"
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks..."
              className="nx-input pl-8 w-44 text-xs"
              style={{ minHeight: 32 }}
            />
          </div>

          <button
            onClick={() => setShowNew(true)}
            className="btn btn-blue btn-sm gap-1.5"
          >
            <Plus size={13} /> New Task
          </button>
        </div>
      </div>

      {/* ── Sprint progress bar ─────────────────────────────── */}
      <div className="nx-card p-4 mb-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">Sprint #4</span>
            <Badge variant="blue">Active</Badge>
            <span className="text-xs text-muted">Apr 21 – May 4, 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: col.color }} />
                <span>{col.label}: {cards[col.id].length}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="nx-progress" style={{ height: 6 }}>
          <div
            className="nx-progress-fill"
            style={{
              width: `${Math.round((doneCards / totalCards) * 100)}%`,
              background: "linear-gradient(90deg, #2F81F7, #3FB950)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-2xs text-muted">0</span>
          <span className="text-2xs text-success font-semibold">
            {Math.round((doneCards / totalCards) * 100)}% complete
          </span>
          <span className="text-2xs text-muted">{totalCards}</span>
        </div>
      </div>

      {/* ── Kanban board ───────────────────────────────────── */}
      {view === "kanban" && (
        <div className="kanban-board flex-1">
          {COLUMNS.map((col) => {
            const colCards = (cards[col.id] || []).filter((c) =>
              !search || c.title.toLowerCase().includes(search.toLowerCase())
            );

            return (
              <div key={col.id} className="kanban-col">
                {/* Column header */}
                <div className="kanban-col-header">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: col.color }}
                    />
                    <span className="text-sm font-semibold text-primary">{col.label}</span>
                    <span className="w-5 h-5 rounded-full bg-surface border border-border
                                     flex items-center justify-center text-2xs font-semibold text-muted">
                      {colCards.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setNewCard((f) => ({ ...f, colId: col.id })); setShowNew(true); }}
                    className="btn btn-ghost btn-icon opacity-60 hover:opacity-100"
                    style={{ width: 22, height: 22, padding: 2 }}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Cards */}
                <div className="kanban-col-body">
                  {colCards.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-xs text-muted text-center">
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
        <div className="nx-card overflow-hidden">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Tags</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cards).flatMap(([colId, colCards]) =>
                colCards
                  .filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()))
                  .map((card) => {
                    const col = COLUMNS.find((c) => c.id === colId);
                    return (
                      <tr key={card.id}>
                        <td>
                          <span className="text-sm text-primary font-medium">{card.title}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: col?.color }} />
                            <span className="text-xs text-secondary">{col?.label}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={PRIORITY_BADGE[card.priority] || "gray"}>
                            {card.priority}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {card.tags.slice(0,2).map((t) => (
                              <span key={t} className="badge badge-gray text-2xs">#{t}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="text-xs text-muted">
                            {card.due ? format(new Date(card.due), "MMM d") : "—"}
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
        subtitle="Add a new task to your board"
        size="sm"
        footer={
          <>
            <button className="btn btn-default" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn btn-blue" onClick={handleCreate}>Create Task</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="nx-label">Task Title *</label>
            <input
              autoFocus
              value={newCard.title}
              onChange={(e) => setNewCard((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="What needs to be done?"
              className="nx-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="nx-label">Priority</label>
              <select
                value={newCard.priority}
                onChange={(e) => setNewCard((f) => ({ ...f, priority: e.target.value }))}
                className="nx-input nx-select"
              >
                {["low","medium","high","critical"].map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="nx-label">Column</label>
              <select
                value={newCard.colId}
                onChange={(e) => setNewCard((f) => ({ ...f, colId: e.target.value }))}
                className="nx-input nx-select"
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