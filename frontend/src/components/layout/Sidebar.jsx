import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, Target, CalendarCheck2, FolderOpen,
  BookOpen, Brain, Activity, Settings, Cpu,
  LogOut, Search, ChevronLeft, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

const NAV = [
  {
    section: "WORKSPACE",
    items: [
      { path: "/",         icon: LayoutDashboard, label: "Dashboard"     },
      { path: "/work",     icon: Target,          label: "Work Center"   },
      { path: "/daily",    icon: CalendarCheck2,  label: "Daily Ops"     },
      { path: "/vault",    icon: FolderOpen,      label: "Project Vault" },
      { path: "/notes",    icon: BookOpen,        label: "Notes & Docs"  },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { path: "/intel",    icon: Brain,    label: "AI Center" },
      { path: "/analytics",icon: Activity, label: "Analytics" },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { path: "/hardware", icon: Cpu,      label: "Hardware Bridge" },
      { path: "/settings", icon: Settings, label: "Settings"        },
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

  // Live Clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const name  = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "NooThing";

  return (
    <aside
      className={clsx(
        "flex flex-col h-screen flex-shrink-0 transition-all duration-300 border-r border-[#1E293B]",
        sidebarCollapsed ? "w-20" : "w-[260px]"
      )}
      style={{ backgroundColor: "#0B1021", color: "#FFFFFF" }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#1E293B] flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img src="/bat_logo.png" alt="Logo" className="w-full h-auto drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>NOOTHING</div>
              <div className="text-[10px] text-[#64748B] font-mono mt-0.5">Life DB</div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-10 h-10 flex items-center justify-center mx-auto">
            <img src="/bat_logo.png" alt="Logo" className="w-full h-auto drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          </div>
        )}
      </div>

      {/* ── User profile card ── */}
      {!sidebarCollapsed && (
        <div className="mx-4 mt-5 mb-2 p-3 rounded-xl border border-[#1E293B] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] cursor-pointer transition-colors flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#050810] border border-[#1E293B]">
            <img src="/bat_logo.png" alt="User" className="w-5 h-auto drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
          </div>
          <div className="min-w-0 flex-1 flex items-center">
            <div className="text-[13.5px] font-semibold text-white truncate">{name}</div>
          </div>
        </div>
      )}

      {/* ── Live clock ── */}
      {!sidebarCollapsed && (
        <div className="px-6 py-3 flex items-center justify-between mb-2">
          <span className="font-mono text-[20px] font-medium text-[#7C3AED]" style={{ textShadow: "0 0 20px rgba(124,106,247,0.3)" }}>
            {format(time, "HH:mm:ss")}
          </span>
          <span className="text-[11px] text-[#64748B]">
            {format(time, "EEE, MMM d")}
          </span>
        </div>
      )}

      {/* ── Search shortcut ── */}
      {!sidebarCollapsed && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[#1E293B] rounded-xl cursor-pointer hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[#94A3B8]"
          >
            <Search size={14} />
            <span className="text-[12px] flex-1 text-left">Search or jump to...</span>
            <kbd className="text-[10px] font-mono bg-[#0B1021] border border-[#1E293B] px-1.5 py-0.5 rounded text-[#64748B]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ── Navigation using NavLink ── */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-5 pb-6 custom-scrollbar">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            {!sidebarCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{section}</div>
            )}
            <div className="space-y-1">
              {items.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  className={({ isActive }) =>
                    clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-medium transition-all",
                      isActive
                        ? "bg-[#7C3AED] text-white shadow-[0_4px_15px_rgba(124,58,237,0.3)]"
                        : "text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)] hover:text-white",
                      sidebarCollapsed && "justify-center"
                    )
                  }
                  title={sidebarCollapsed ? label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} className={isActive ? "text-white" : "text-[#64748B]"} />
                      {!sidebarCollapsed && <span className="flex-1 truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── System Status & Footer ── */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-[#1E293B] bg-[#0B1021] flex-shrink-0">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-3 px-1">System Status</div>
          <div className="space-y-2.5 px-1 mb-4">
            {SYSTEM_STATUS.map((sys) => (
              <div key={sys.label} className="flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <div className={clsx("w-1.5 h-1.5 rounded-full", sys.ok && "animate-pulse")}
                       style={{ backgroundColor: sys.ok ? "#10B981" : "#EF4444", boxShadow: `0 0 6px ${sys.ok ? "#10B981" : "#EF4444"}` }} />
                  {sys.label}
                </div>
                <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: sys.ok ? "#10B981" : "#EF4444" }}>
                  {sys.ok ? "LIVE" : "ERR"}
                </span>
              </div>
            ))}
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[#EF4444] text-[12px] font-semibold hover:bg-[rgba(239,68,68,0.1)] transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      )}
      
      {/* Collapse Toggle */}
      {sidebarCollapsed && (
         <div className="p-3 border-t border-[#1E293B] flex justify-center">
            <button onClick={() => setSidebarCollapsed(false)} className="text-[#64748B] hover:text-white p-2">
               <ChevronRight size={18} />
            </button>
         </div>
      )}
    </aside>
  );
}