import { create }  from "zustand";
import { devtools } from "zustand/middleware";
import { hardwareService } from "@/services/hardwareService";

export const useHardwareStore = create(
  devtools(
    (set, get) => ({
      items:   [],
      stats:   null,
      loading: false,
      error:   null,
      search:  "",

      setSearch: (v) => set({ search: v }),

      fetchAll: async (params = {}) => {
        set({ loading: true, error: null });
        try {
          const [itemsRes, statsRes] = await Promise.all([
            hardwareService.list(params),
            hardwareService.stats(),
          ]);
          set({
            items:   itemsRes.data?.items || itemsRes.data || [],
            stats:   statsRes.data,
            loading: false,
          });
        } catch (e) {
          set({ error: e.message, loading: false });
        }
      },

      createItem: async (data) => {
        const res = await hardwareService.create(data);
        set((s) => ({ items: [res.data, ...s.items] }));
        return res.data;
      },

      updateItem: async (id, data) => {
        const res = await hardwareService.update(id, data);
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? res.data : i)),
        }));
        return res.data;
      },

      updateQty: async (id, delta) => {
        const res = await hardwareService.updateQty(id, delta);
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? res.data : i)),
        }));
        return res.data;
      },

      deleteItem: async (id) => {
        await hardwareService.delete(id);
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },
    }),
    { name: "HardwareStore" }
  )
);