import { create }  from "zustand";
import { devtools } from "zustand/middleware";
import { aiService } from "@/services/aiService";

export const useAiStore = create(
  devtools(
    (set) => ({
      // Per-action loading states
      loading: {
        brainstorm: false,
        summarize:  false,
        nextSteps:  false,
        chat:       false,
      },
      error: null,

      setLoading: (action, val) =>
        set((s) => ({ loading: { ...s.loading, [action]: val } })),
      setError: (msg) => set({ error: msg }),
      clearError: ()  => set({ error: null }),

      /* ── Actions ─────────────────────────────────────────── */
      brainstorm: async (ideaId, rawIdea, context = "") => {
        set((s) => ({ loading: { ...s.loading, brainstorm: true }, error: null }));
        try {
          const res = await aiService.brainstorm(ideaId, rawIdea, context);
          return res.data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        } finally {
          set((s) => ({ loading: { ...s.loading, brainstorm: false } }));
        }
      },

      summarize: async (projectId) => {
        set((s) => ({ loading: { ...s.loading, summarize: true }, error: null }));
        try {
          const res = await aiService.summarize(projectId);
          return res.data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        } finally {
          set((s) => ({ loading: { ...s.loading, summarize: false } }));
        }
      },

      nextSteps: async (projectId) => {
        set((s) => ({ loading: { ...s.loading, nextSteps: true }, error: null }));
        try {
          const res = await aiService.nextSteps(projectId);
          return res.data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        } finally {
          set((s) => ({ loading: { ...s.loading, nextSteps: false } }));
        }
      },
    }),
    { name: "AiStore" }
  )
);