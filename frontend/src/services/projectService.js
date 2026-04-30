import api from "./api";

const BASE = "/projects";

export const projectService = {
  list:  (params = {}) => api.get(BASE, { params }),
  get:   (id)          => api.get(`${BASE}/${id}`),
  stats: ()            => api.get(`${BASE}/stats`),
  tasks: (id, params)  => api.get(`${BASE}/${id}/tasks`, { params }),
  create:(data)        => api.post(BASE, data),
  update:(id, data)    => api.patch(`${BASE}/${id}`, data),
  delete:(id)          => api.delete(`${BASE}/${id}`),

  // Ideas
  listIdeas:   (params) => api.get("/ideas", { params }),
  createIdea:  (data)   => api.post("/ideas", data),
  updateIdea:  (id, d)  => api.patch(`/ideas/${id}`, d),
  promoteIdea: (id)     => api.post(`/ideas/${id}/promote`),
  discardIdea: (id)     => api.post(`/ideas/${id}/discard`),
  deleteIdea:  (id)     => api.delete(`/ideas/${id}`),
};