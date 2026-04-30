import api from "./api";

const BASE = "/comms";

export const commsService = {
  list:    (params = {}) => api.get(`${BASE}/emails`, { params }),
  get:     (id)          => api.get(`${BASE}/emails/${id}`),
  update:  (id, data)    => api.patch(`${BASE}/emails/${id}`, data),
  refresh: ()            => api.post(`${BASE}/refresh`),
  stats:   ()            => api.get(`${BASE}/stats`),
};
