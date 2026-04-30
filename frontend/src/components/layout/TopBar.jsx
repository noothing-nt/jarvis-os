import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/App";
import { Search, Bell, Plus, ChevronRight, Zap } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

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

const QUICK_ACTIONS = [
  { label: "New Task",    shortcut: "T" },
  { label: "New Project", shortcut: "P" },
  { label: "New Note",    shortcut: "N" },
  { label: "New Idea",    shortcut: "I" },
];

export default function TopBar() {
  const { setCmdOpen } = useApp();
  const location       = useNavigate ? useLocation() : { pathname: "/" };
  const [showQuick, setShowQuick] = useState(false);
  const [notifCount]   = useState(3);

  const crumbs = BREADCRUMB_MAP[location.pathname] || ["—"];

  return (
    <header className="app-topbar !bg-transparent backdrop-blur-md border-b border-white/10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <span className="text-muted text-xs">JARVIS</span>
        <ChevronRight size={12} className="text-muted flex-shrink-0" />
        {crumbs.map((c, i) => (
          <span
            key={i}
            className={clsx(
              "text-sm font-semibold",
              i === crumbs.length - 1 ? "text-primary" : "text-secondary"
            )}
          >
            {i > 0 && <ChevronRight size={12} className="text-muted inline mr-1" />}
            {c}
          </span>
        ))}
      </div>

      {/* Search trigger */}
      <button
        onClick={() => setCmdOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md
                   bg-white/5 border border-border text-muted text-xs
                   hover:border-accent/40 transition-all w-52"
      >
        <Search size={12} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="font-mono text-2xs bg-raised px-1.5 py-0.5 rounded border border-border">
          ⌘K
        </kbd>
      </button>

      {/* Quick add */}
      <div className="relative">
        <button
          onClick={() => setShowQuick((v) => !v)}
          className="btn btn-blue btn-sm gap-1.5"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Quick Add</span>
        </button>

        {showQuick && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowQuick(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-50 w-48
                            bg-white/10 backdrop-blur-xl border border-border rounded-lg
                            shadow-modal overflow-hidden animate-scale-in">
              {QUICK_ACTIONS.map(({ label, shortcut }) => (
                <button
                  key={label}
                  onClick={() => setShowQuick(false)}
                  className="w-full flex items-center justify-between
                             px-3 py-2.5 text-sm text-secondary
                             hover:bg-raised hover:text-primary transition-colors"
                >
                  <span>{label}</span>
                  <kbd className="font-mono text-2xs text-muted bg-white/5
                                  px-1.5 py-0.5 rounded border border-border">
                    ⌘{shortcut}
                  </kbd>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <button className="btn btn-ghost btn-icon relative">
        <Bell size={16} />
        {notifCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full
                           bg-danger text-white text-2xs flex items-center
                           justify-center font-bold">
            {notifCount}
          </span>
        )}
      </button>
    </header>
  );
}