import { create } from "zustand";
import { devtools } from "zustand/middleware";

export const useAppStore = create(
  devtools(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────────────
      user:    null,
      session: null,
      setUser:    (user)    => set({ user }),
      setSession: (session) => set({ session }),
      clearAuth:  ()        => set({ user: null, session: null }),

      // ── UI State ─────────────────────────────────────────────────────
      activeModule:    "command",
      sidebarOpen:     true,
      globalLoading:   false,
      toast:           null,   // { type, message }

      setActiveModule: (id)  => set({ activeModule: id }),
      setSidebarOpen:  (v)   => set({ sidebarOpen: v }),
      setGlobalLoading:(v)   => set({ globalLoading: v }),

      showToast: (type, message, duration = 3500) => {
        set({ toast: { type, message } });
        setTimeout(() => set({ toast: null }), duration);
      },

      dismissToast: () => set({ toast: null }),

      // ── Clock ─────────────────────────────────────────────────────────
      now: new Date(),
      tickClock: () => set({ now: new Date() }),
    }),
    { name: "AppStore" }
  )
);