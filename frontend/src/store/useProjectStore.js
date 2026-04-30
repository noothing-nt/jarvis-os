import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { projectService } from "@/services/projectService";

export const useProjectStore = create(
  devtools(
    (set, get) => ({
      // ── Data ────────────────────────────────────────────────────────
      projects:   [],
      ideas:      [],
      stats:      null,
      selected:   null,
      loading:    false,
      error:      null,

      // ── Filters ──────────────────────────────────────────────────────
      filters: {
        status:   "",
        priority: "",
        search:   "",
        category: "",
      },
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () =>
        set({ filters: { status: "", priority: "", search: "", category: "" } }),

      // ── Fetch Actions ────────────────────────────────────────────────
      fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
          const { filters } = get();
          const params = {};
          if (filters.status)   params.status   = filters.status;
          if (filters.priority) params.priority = filters.priority;
          if (filters.search)   params.search   = filters.search;
          if (filters.category) params.category = filters.category;
          const res = await projectService.list(params);
          set({ projects: res.data.items || res.data, loading: false });
        } catch (e) {
          set({ error: e.message, loading: false });
        }
      },

      fetchStats: async () => {
        try {
          const res = await projectService.stats();
          set({ stats: res.data });
        } catch (_) {}
      },

      fetchIdeas: async () => {
        try {
          const res = await projectService.listIdeas();
          set({ ideas: res.data.items || res.data });
        } catch (_) {}
      },

      // ── Mutations ────────────────────────────────────────────────────
      createProject: async (data) => {
        const res = await projectService.create(data);
        set((s) => ({ projects: [res.data, ...s.projects] }));
        return res.data;
      },

      updateProject: async (id, data) => {
        const res = await projectService.update(id, data);
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? res.data : p)),
          selected: s.selected?.id === id ? res.data : s.selected,
        }));
        return res.data;
      },

      deleteProject: async (id) => {
        await projectService.delete(id);
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          selected: s.selected?.id === id ? null : s.selected,
        }));
      },

      createIdea: async (data) => {
        const res = await projectService.createIdea(data);
        set((s) => ({ ideas: [res.data, ...s.ideas] }));
        return res.data;
      },

      updateIdea: async (id, data) => {
        const res = await projectService.updateIdea(id, data);
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? res.data : i)),
        }));
        return res.data;
      },

      promoteIdea: async (id) => {
        const res = await projectService.promoteIdea(id);
        await get().fetchProjects();
        await get().fetchIdeas();
        return res.data;
      },

      setSelected: (project) => set({ selected: project }),
    }),
    { name: "ProjectStore" }
  )
);