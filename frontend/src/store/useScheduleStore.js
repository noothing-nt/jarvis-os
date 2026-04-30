import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { scheduleService } from "@/services/scheduleService";

export const useScheduleStore = create(
  devtools(
    (set, get) => ({
      todaySchedule: null,
      weekSchedule:  {},
      allEntries:    [],
      loading:       false,
      error:         null,

      fetchToday: async () => {
        set({ loading: true });
        try {
          const res = await scheduleService.today();
          set({ todaySchedule: res.data, loading: false });
        } catch (e) {
          set({ error: e.message, loading: false });
        }
      },

      fetchWeek: async () => {
        try {
          const res = await scheduleService.week();
          set({ weekSchedule: res.data });
        } catch (_) {}
      },

      fetchAll: async () => {
        try {
          const res = await scheduleService.list();
          set({ allEntries: res.data?.items || res.data || [] });
        } catch (_) {}
      },

      createEntry: async (data) => {
        const res = await scheduleService.create(data);
        set((s) => ({ allEntries: [...s.allEntries, res.data] }));
        await get().fetchToday();
        await get().fetchWeek();
        return res.data;
      },

      updateEntry: async (id, data) => {
        const res = await scheduleService.update(id, data);
        set((s) => ({
          allEntries: s.allEntries.map((e) => (e.id === id ? res.data : e)),
        }));
        await get().fetchToday();
        return res.data;
      },

      toggleEntry: async (id) => {
        const res = await scheduleService.toggle(id);
        set((s) => ({
          allEntries: s.allEntries.map((e) => (e.id === id ? res.data : e)),
        }));
        await get().fetchToday();
        return res.data;
      },

      deleteEntry: async (id) => {
        await scheduleService.delete(id);
        set((s) => ({
          allEntries: s.allEntries.filter((e) => e.id !== id),
        }));
        await get().fetchToday();
      },
    }),
    { name: "ScheduleStore" }
  )
);