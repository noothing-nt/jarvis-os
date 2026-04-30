import api from "./api";

const BASE = "/schedule";

export const scheduleService = {
  list:   (params = {}) => api.get(BASE, { params }),
  get:    (id)          => api.get(`${BASE}/${id}`),
  today:  ()            => api.get(`${BASE}/today`),
  week:   ()            => api.get(`${BASE}/week`),
  create: (data)        => api.post(BASE, data),
  update: (id, data)    => api.patch(`${BASE}/${id}`, data),
  toggle: (id)          => api.patch(`${BASE}/${id}/toggle`),
  delete: (id)          => api.delete(`${BASE}/${id}`),
};