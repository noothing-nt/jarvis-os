import api from "./api";

const BASE = "/hardware";

export const hardwareService = {
  list:      (params = {}) => api.get(BASE, { params }),
  get:       (id)          => api.get(`${BASE}/${id}`),
  stats:     ()            => api.get(`${BASE}/stats`),
  create:    (data)        => api.post(BASE, data),
  update:    (id, data)    => api.patch(`${BASE}/${id}`, data),
  updateQty: (id, delta)   => api.patch(`${BASE}/${id}/qty`, { delta }),
  delete:    (id)          => api.delete(`${BASE}/${id}`),

  // ESP32
  esp32Payload: () => api.get("/webhooks/esp32/payload"),
  esp32Ping:    () => api.post("/webhooks/esp32"),
};