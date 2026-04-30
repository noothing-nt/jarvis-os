import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import {
  Search, LayoutDashboard, Kanban, CalendarCheck2,
  FolderOpen, BookOpen, Brain, BarChart3,
  Cpu, Settings, Plus, ArrowRight, Hash,
} from "lucide-react";
import clsx from "clsx";

const COMMANDS = [
  { group: "Navigate", id: "nav-1",  label: "Dashboard",      icon: LayoutDashboard, path: "/"          },
  { group: "Navigate", id: "nav-2",  label: "Work Center",    icon: Kanban,          path: "/work"      },
  { group: "Navigate", id: "nav-3",  label: "Daily Ops",      icon: CalendarCheck2,  path: "/daily"     },
  { group: "Navigate", id: "nav-4",  label: "Project Vault",  icon: FolderOpen,      path: "/vault"     },
  { group: "Navigate", id: "nav-5",  label: "Notes & Docs",   icon: BookOpen,        path: "/notes"     },
  { group: "Navigate", id: "nav-6",  label: "Intelligence",   icon: Brain,           path: "/intel"     },
  { group: "Navigate", id: "nav-7",  label: "Analytics",      icon: BarChart3,       path: "/analytics" },
  { group: "Navigate", id: "nav-8",  label: "Hardware Bridge",icon: Cpu,             path: "/hardware"  },
  { group: "Navigate", id: "nav-9",  label: "Settings",       icon: Settings,        path: "/settings"  },
  { group: "Create",   id: "act-1",  label: "New Task",       icon: Plus,            path: "/daily"     },
  { group: "Create",   id: "act-2",  label: "New Project",    icon: Plus,            path: "/vault"     },
  { group: "Create",   id: "act-3",  label: "New Note",       icon: Plus,            path: "/notes"     },
  { group: "Create",   id: "act-4",  label: "New Idea",       icon: Plus,            path: "/intel"     },
];

export default function CommandPalette() {
  const { cmdOpen, setCmdOpen } = useApp();
  const navigate  = useNavigate();
  const [query,   setQuery]   = useState("");
  const [sel,     setSel]     = useState(0);
  const inputRef  = useRef(null);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  /* Group filtered results */
  const groups = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flat = Object.values(groups).flat();

  useEffect(() => {
    if (cmdOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSel(0);
    }
  }, [cmdOpen]);

  useEffect(() => { setSel(0); }, [query]);

  const execute = (cmd) => {
    navigate(cmd.path);
    setCmdOpen(false);
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter")     { if (flat[sel]) execute(flat[sel]); }
    if (e.key === "Escape")    { setCmdOpen(false); }
  };

  if (!cmdOpen) return null;

  return (
    <div className="cmd-palette-overlay" onClick={() => setCmdOpen(false)}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search commands, pages, actions..."
            className="flex-1 bg-transparent text-primary text-sm outline-none placeholder:text-muted"
          />
          <kbd className="font-mono text-2xs text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="px-4 py-6 text-center text-secondary text-sm">
              No results for "{query}"
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-2xs font-semibold text-muted uppercase tracking-widest">
                  {group}
                </div>
                {items.map((cmd) => {
                  const Icon    = cmd.icon;
                  const globalI = flat.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSel(globalI)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        sel === globalI
                          ? "bg-accent-subtle text-accent-hover"
                          : "text-secondary hover:text-primary"
                      )}
                    >
                      <Icon size={15} className="flex-shrink-0" />
                      <span className="flex-1 text-left">{cmd.label}</span>
                      {sel === globalI && (
                        <ArrowRight size={13} className="text-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4">
          {[
            ["↑↓", "navigate"],
            ["↵",  "select"],
            ["esc","close"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <kbd className="font-mono text-2xs bg-surface border border-border px-1.5 py-0.5 rounded text-secondary">
                {key}
              </kbd>
              <span className="text-2xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}