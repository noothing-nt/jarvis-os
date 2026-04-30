import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, Kanban, CalendarCheck2,
  FolderOpen, BookOpen, Brain,
  BarChart3, Cpu, Settings,
  ChevronLeft, ChevronRight,
  Zap, LogOut, Search, Bell,
  GitBranch, Layers,
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { format } from "date-fns";

const NAV = [
  {
    section: "WORKSPACE",
    items: [
      { path: "/",         icon: LayoutDashboard, label: "Dashboard",      badge: null   },
      { path: "/work",     icon: Kanban,          label: "Work Center",    badge: null    },
      { path: "/daily",    icon: CalendarCheck2,  label: "Daily Ops",      badge: null   },
      { path: "/vault",    icon: FolderOpen,      label: "Project Vault",  badge: null   },
      { path: "/notes",    icon: BookOpen,        label: "Notes & Docs",   badge: null   },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { path: "/intel",    icon: Brain,   label: "AI Center",      badge: null  },
      { path: "/analytics",icon: BarChart3,label: "Analytics",     badge: null  },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { path: "/hardware", icon: Cpu,      label: "Hardware Bridge", badge: null },
      { path: "/settings", icon: Settings, label: "Settings",        badge: null },
    ],
  },
];

const SYSTEM_STATUS = [
  { label: "API Server",  ok: true  },
  { label: "Database",    ok: true  },
  { label: "AI Engine",   ok: true  },
  { label: "ESP32",       ok: false },
];

export default function Sidebar() {
  const { user, sidebarCollapsed, setSidebarCollapsed, setCmdOpen } = useApp();
  const navigate  = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const name  = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside
      className={clsx("app-sidebar !bg-transparent backdrop-blur-2xl border-r border-white/10", sidebarCollapsed && "collapsed")}
    >
      {/* ── Brand ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center flex-shrink-0">
              <Zap size={15} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-primary tracking-tight">JARVIS OS</div>
              <div className="text-2xs text-muted">v2.0 — Personal OS</div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center mx-auto">
            <Zap size={15} className="text-white" />
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="btn btn-ghost btn-icon flex-shrink-0 ml-auto"
        >
          {sidebarCollapsed
            ? <ChevronRight size={14} />
            : <ChevronLeft  size={14} />
          }
        </button>
      </div>

      {/* ── User profile card ──────────────────────────────── */}
      {!sidebarCollapsed && (
        <div className="mx-3 mt-3 mb-1 p-3 rounded-lg bg-white/5 border border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-accent-muted border border-accent/30
                            flex items-center justify-center text-sm font-bold text-accent-hover flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-primary truncate">{name}</div>
              <div className="text-2xs text-muted truncate">{user?.email}</div>
            </div>
          </div>

          {/* Live clock */}
          <div className="mt-2.5 pt-2.5 border-t border-border-subtle flex items-center justify-between">
            <span className="font-mono text-xs text-accent-hover font-medium">
              {format(time, "HH:mm:ss")}
            </span>
            <span className="text-2xs text-muted">
              {format(time, "EEE, MMM d")}
            </span>
          </div>
        </div>
      )}

      {/* ── Search shortcut ────────────────────────────────── */}
      {!sidebarCollapsed && (
        <div className="px-3 mt-2 mb-1">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md
                       bg-white/5 border border-border text-muted text-sm
                       hover:border-accent/40 hover:text-secondary
                       transition-all duration-150"
          >
            <Search size={13} />
            <span className="flex-1 text-left text-xs">Search or jump to...</span>
            <kbd className="text-2xs font-mono bg-raised px-1.5 py-0.5 rounded border border-border">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-2">
            {!sidebarCollapsed && (
              <div className="nav-section-label">{section}</div>
            )}
            <div className="space-y-0.5">
              {items.map(({ path, icon: Icon, label, badge }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  className={({ isActive }) =>
                    clsx("nav-item", isActive && "active")
                  }
                  title={sidebarCollapsed ? label : undefined}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {badge && (
                        <span className="nav-badge">{badge}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── System Status ──────────────────────────────────── */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-t border-border-subtle flex-shrink-0">
          <div className="nav-section-label mb-2">SYSTEM STATUS</div>
          <div className="space-y-1.5">
            {SYSTEM_STATUS.map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={clsx("dot", ok ? "dot-green" : "dot-red")} />
                  <span className="text-xs text-secondary">{label}</span>
                </div>
                <span className={clsx(
                  "text-2xs font-mono",
                  ok ? "text-success" : "text-danger"
                )}>
                  {ok ? "LIVE" : "OFFLINE"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sign out ───────────────────────────────────────── */}
      <div className="px-2 pb-3 flex-shrink-0 border-t border-border-subtle pt-2">
        <button
          onClick={handleSignOut}
          className="nav-item w-full text-left"
        >
          <LogOut size={15} className="flex-shrink-0 text-danger" />
          {!sidebarCollapsed && (
            <span className="text-danger/80">Sign Out</span>
          )}
        </button>
      </div>
    </aside>
  );
}