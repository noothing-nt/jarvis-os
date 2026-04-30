import api from "./api";

const BASE = "/ai";

export const aiService = {
  brainstorm: (idea_id, raw_idea, context = "") =>
    api.post(`${BASE}/brainstorm`, { idea_id, raw_idea, context }),

  summarize: (project_id) =>
    api.post(`${BASE}/summarize`, { project_id }),

  nextSteps: (project_id) =>
    api.post(`${BASE}/next-steps`, { project_id }),

  chat: (message, context = "", include_projects = true) =>
    api.post(`${BASE}/chat`, { message, context, include_projects }),
};
