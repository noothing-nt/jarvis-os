import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase }    from "@/lib/supabase";
import Sidebar         from "@/components/layout/Sidebar";
import TopBar          from "@/components/layout/TopBar";
import CommandPalette  from "@/components/shared/CommandPalette";
import ToastContainer  from "@/components/shared/ToastContainer";

/* ── Pages ───────────────────────────────────────────────────────── */
import Dashboard       from "@/pages/Dashboard";
import WorkCenter      from "@/pages/WorkCenter";
import DailyOps        from "@/pages/DailyOps";
import ProjectVault    from "@/pages/ProjectVault";
import NotesPage       from "@/pages/NotesPage";
import Intelligence    from "@/pages/Intelligence";
import Analytics       from "@/pages/Analytics";
import HardwareBridge  from "@/pages/HardwareBridge";
import SettingsPage    from "@/pages/SettingsPage";
import LoginPage       from "@/pages/LoginPage";
import NotFound        from "@/pages/NotFound";

/* ── App Context ─────────────────────────────────────────────────── */
export const AppCtx = createContext(null);

export function useApp() {
  return useContext(AppCtx);
}

/* ── Toast system ────────────────────────────────────────────────── */
let _addToast = null;
export function toast(message, type = "info", duration = 4000) {
  _addToast?.({ id: Date.now(), message, type, duration });
}

/* ── Auth guard ──────────────────────────────────────────────────── */
function RequireAuth({ children }) {
  const { user, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
          <span className="text-secondary text-sm">Initializing...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/* ── Shell layout ────────────────────────────────────────────────── */
function AppShell() {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="app-shell !bg-transparent">
      <Sidebar />
      <div className="app-main !bg-transparent">
        <TopBar />
        <div
          className="app-content page-enter !bg-transparent"
          key={useLocation().pathname}
        >
          <Routes>
            <Route path="/"           element={<Dashboard      />} />
            <Route path="/work"       element={<WorkCenter     />} />
            <Route path="/daily"      element={<DailyOps       />} />
            <Route path="/vault"      element={<ProjectVault   />} />
            <Route path="/vault/:id"  element={<ProjectVault   />} />
            <Route path="/notes"      element={<NotesPage      />} />
            <Route path="/notes/:id"  element={<NotesPage      />} />
            <Route path="/intel"      element={<Intelligence   />} />
            <Route path="/analytics"  element={<Analytics      />} />
            <Route path="/hardware"   element={<HardwareBridge />} />
            <Route path="/settings"   element={<SettingsPage   />} />
            <Route path="*"           element={<NotFound       />} />
          </Routes>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}

/* ── Root ────────────────────────────────────────────────────────── */
export default function App() {
  const [user,              setUser]              = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [cmdOpen,           setCmdOpen]           = useState(false);
  const [toasts,            setToasts]            = useState([]);

  /* Register global toast fn */
  const addToast = useCallback((t) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((p) => p.filter((x) => x.id !== t.id));
    }, t.duration);
  }, []);
  _addToast = addToast;

  const removeToast = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  /* ── Auth bootstrap ──────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });

    /* ⌘K command palette */
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const ctx = {
    user, loading,
    setUser,
    sidebarCollapsed, setSidebarCollapsed,
    cmdOpen, setCmdOpen,
    addToast, toasts,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppCtx.Provider>
  );
}