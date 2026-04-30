import api from "./api";

const BASE = "/tasks";

export const taskService = {
  list:     (params = {}) => api.get(BASE, { params }),
  get:      (id)          => api.get(`${BASE}/${id}`),
  today:    ()            => api.get(`${BASE}/today`),
  overdue:  ()            => api.get(`${BASE}/overdue`),
  create:   (data)        => api.post(BASE, data),
  update:   (id, data)    => api.patch(`${BASE}/${id}`, data),
  complete: (id)          => api.post(`${BASE}/${id}/complete`),
  delete:   (id)          => api.delete(`${BASE}/${id}`),
};