import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { taskService } from "@/services/taskService";

export const useTaskStore = create(
  devtools(
    (set, get) => ({
      tasks:     [],
      todayTasks: [],
      overdue:   [],
      loading:   false,
      error:     null,

      filters: { status: "", priority: "", project_id: "" },
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),

      fetchTasks: async () => {
        set({ loading: true });
        try {
          const { filters } = get();
          const params = {};
          if (filters.status)     params.status     = filters.status;
          if (filters.priority)   params.priority   = filters.priority;
          if (filters.project_id) params.project_id = filters.project_id;
          const res = await taskService.list(params);
          set({ tasks: res.data.items || res.data, loading: false });
        } catch (e) {
          set({ error: e.message, loading: false });
        }
      },

      fetchToday: async () => {
        try {
          const res = await taskService.today();
          set({ todayTasks: res.data });
        } catch (_) {}
      },

      fetchOverdue: async () => {
        try {
          const res = await taskService.overdue();
          set({ overdue: res.data });
        } catch (_) {}
      },

      createTask: async (data) => {
        const res = await taskService.create(data);
        set((s) => ({ tasks: [res.data, ...s.tasks] }));
        return res.data;
      },

      updateTask: async (id, data) => {
        const res = await taskService.update(id, data);
        set((s) => ({
          tasks:      s.tasks.map((t)      => (t.id === id ? res.data : t)),
          todayTasks: s.todayTasks.map((t) => (t.id === id ? res.data : t)),
        }));
        return res.data;
      },

      completeTask: async (id) => {
        const res = await taskService.complete(id);
        set((s) => ({
          tasks:      s.tasks.map((t)      => (t.id === id ? res.data : t)),
          todayTasks: s.todayTasks.map((t) => (t.id === id ? res.data : t)),
        }));
        return res.data;
      },

      deleteTask: async (id) => {
        await taskService.delete(id);
        set((s) => ({
          tasks:      s.tasks.filter((t)      => t.id !== id),
          todayTasks: s.todayTasks.filter((t) => t.id !== id),
        }));
      },
    }),
    { name: "TaskStore" }
  )
);