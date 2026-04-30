import { useState, useEffect, useCallback } from "react";
import { hardwareService } from "@/services/hardwareService";

export function useHardware() {
  const [items,   setItems]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchAll = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        hardwareService.list(params),
        hardwareService.stats(),
      ]);
      setItems(itemsRes.data?.items || itemsRes.data || []);
      setStats(statsRes.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateQty = async (id, delta) => {
    await hardwareService.updateQty(id, delta);
    await fetchAll();
  };

  const createItem = async (data) => {
    const res = await hardwareService.create(data);
    setItems((prev) => [res.data, ...prev]);
    return res.data;
  };

  const deleteItem = async (id) => {
    await hardwareService.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return {
    items, stats, loading, error,
    fetchAll, updateQty, createItem, deleteItem,
  };
}