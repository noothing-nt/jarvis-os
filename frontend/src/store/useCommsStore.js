
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { commsService } from "@/services/commsService";

export const useCommsStore = create(
  devtools(
    (set, get) => ({
      emails:    [],
      stats:     null,
      loading:   false,
      refreshing:false,
      selected:  null,

      filters: { account: "", is_read: "", action_hint: "" },
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),

      fetchEmails: async () => {
        set({ loading: true });
        try {
          const { filters } = get();
          const params = {};
          if (filters.account)     params.account     = filters.account;
          if (filters.is_read)     params.is_read     = filters.is_read;
          if (filters.action_hint) params.action_hint = filters.action_hint;
          const res = await commsService.list(params);
          set({ emails: res.data.items || res.data, loading: false });
        } catch (e) {
          set({ loading: false });
        }
      },

      fetchStats: async () => {
        try {
          const res = await commsService.stats();
          set({ stats: res.data });
        } catch (_) {}
      },

      refresh: async () => {
        set({ refreshing: true });
        try {
          await commsService.refresh();
          await get().fetchEmails();
          await get().fetchStats();
        } finally {
          set({ refreshing: false });
        }
      },

      markRead: async (id) => {
        await commsService.update(id, { is_read: true });
        set((s) => ({
          emails: s.emails.map((e) => (e.id === id ? { ...e, is_read: true } : e)),
        }));
      },

      setSelected: (email) => set({ selected: email }),
    }),
    { name: "CommsStore" }
  )
);