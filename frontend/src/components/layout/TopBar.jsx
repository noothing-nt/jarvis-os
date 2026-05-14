import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import { Search, Bell, Plus, ChevronRight, CheckCircle2, AlertCircle, Info, Check } from "lucide-react";
import clsx from "clsx";

const BREADCRUMB_MAP = {
  "/":          ["Dashboard"],
  "/work":      ["Work Center"],
  "/daily":     ["Daily Ops"],
  "/vault":     ["Project Vault"],
  "/notes":     ["Notes & Docs"],
  "/intel":     ["Intelligence"],
  "/analytics": ["Analytics"],
  "/hardware":  ["Hardware Bridge"],
  "/settings":  ["Settings"],
};

// Wired with actual routes
const QUICK_ACTIONS = [
  { label: "New Task",    shortcut: "T", path: "/work" },
  { label: "New Project", shortcut: "P", path: "/vault" },
  { label: "New Note",    shortcut: "N", path: "/notes" },
  { label: "New Idea",    shortcut: "I", path: "/intel" },
];

// Mock Notification Data
const INITIAL_NOTIFS = [
  { id: 1, title: "System Update", desc: "NexusOS v2.1 initialized successfully.", time: "Just now", read: false, type: "success" },
  { id: 2, title: "Vault Sync", desc: "110 files pushed to jarvis-vault.", time: "10m ago", read: false, type: "info" },
  { id: 3, title: "High CPU Usage", desc: "Server node experiencing high load.", time: "1h ago", read: false, type: "warning" },
];

export default function TopBar() {
  const { setCmdOpen } = useApp();
  const location       = useLocation();
  const navigate       = useNavigate();
  
  // UI States
  const [showQuick, setShowQuick] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState(INITIAL_NOTIFS);
  const unreadCount = notifications.filter(n => !n.read).length;

  const crumbs = BREADCRUMB_MAP[location.pathname] || ["—"];

  // 1. Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 't': e.preventDefault(); navigate('/work'); break;
          case 'p': e.preventDefault(); navigate('/vault'); break;
          case 'n': e.preventDefault(); navigate('/notes'); break;
          case 'i': e.preventDefault(); navigate('/intel'); break;
          case 'k': e.preventDefault(); setCmdOpen(true); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, setCmdOpen]);

  // 2. Actions
  const handleQuickAction = (path) => {
    setShowQuick(false);
    navigate(path);
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getNotifIcon = (type) => {
    if (type === 'success') return <CheckCircle2 size={16} className="text-[#10B981]" />;
    if (type === 'warning') return <AlertCircle size={16} className="text-[#F59E0B]" />;
    return <Info size={16} className="text-[#3B82F6]" />;
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#E2E8F0] shadow-sm flex-shrink-0 z-10 relative" style={{ height: "64px" }}>
      
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <span className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider">JARVIS</span>
        <ChevronRight size={14} className="text-[#CBD5E1] flex-shrink-0" />
        {crumbs.map((c, i) => (
          <span
            key={i}
            className={clsx(
              "text-sm font-bold",
              i === crumbs.length - 1 ? "text-[#0F172A]" : "text-[#64748B]"
            )}
          >
            {i > 0 && <ChevronRight size={14} className="text-[#CBD5E1] inline mr-1" />}
            {c}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {/* ── Search Trigger ── */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] text-xs hover:border-[#7C3AED] hover:ring-1 hover:ring-[#7C3AED] transition-all w-56"
        >
          <Search size={14} className="text-[#94A3B8]"/>
          <span className="flex-1 text-left font-medium">Search...</span>
          <kbd className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded-md border border-[#E2E8F0] text-[#94A3B8]">
            ⌘K
          </kbd>
        </button>

        {/* ── Quick Add Dropdown ── */}
        <div className="relative">
          <button
            onClick={() => setShowQuick((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(124,58,237,0.3)]"
            style={{ backgroundColor: "#7C3AED" }}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Quick Add</span>
          </button>

          {showQuick && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowQuick(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden animate-scale-in p-1">
                {QUICK_ACTIONS.map(({ label, shortcut, path }) => (
                  <button
                    key={label}
                    onClick={() => handleQuickAction(path)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#7C3AED] rounded-lg transition-colors"
                  >
                    <span>{label}</span>
                    <kbd className="font-mono text-[10px] font-bold text-[#94A3B8] bg-white px-1.5 py-0.5 rounded-md border border-[#E2E8F0]">
                      ⌘{shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-[#E2E8F0] mx-1" />

        {/* ── Notifications Dropdown ── */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifs((v) => !v)}
            className={clsx("relative p-2 rounded-xl transition-colors", showNotifs ? "bg-[#F8FAFC] text-[#0F172A]" : "text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#0F172A]")}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444] border-2 border-white" />
            )}
          </button>

          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden animate-scale-in flex flex-col">
                
                {/* Dropdown Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                  <span className="text-sm font-bold text-[#0F172A]">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] uppercase tracking-wider font-bold text-[#7C3AED] hover:text-[#6D28D9] transition-colors flex items-center gap-1">
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs font-semibold text-[#94A3B8]">No system alerts.</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={clsx(
                          "p-4 border-b border-[#F1F5F9] last:border-0 transition-colors flex gap-3", 
                          !n.read ? "bg-white hover:bg-[#F8FAFC]" : "bg-[#F8FAFC] opacity-60"
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                           {getNotifIcon(n.type)}
                        </div>
                        <div>
                          <p className={clsx("text-xs font-bold mb-0.5", !n.read ? "text-[#0F172A]" : "text-[#64748B]")}>{n.title}</p>
                          <p className="text-[11px] font-medium text-[#64748B] mb-1.5 leading-relaxed">{n.desc}</p>
                          <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">{n.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}