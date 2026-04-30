import { useState, useEffect, useCallback } from "react";
import { scheduleService } from "@/services/scheduleService";

export function useSchedule() {
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [weekSchedule,  setWeekSchedule]  = useState({});
  const [loading, setLoading] = useState(false);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scheduleService.today();
      setTodaySchedule(res.data);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  const fetchWeek = useCallback(async () => {
    try {
      const res = await scheduleService.week();
      setWeekSchedule(res.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchToday();
    fetchWeek();
  }, [fetchToday, fetchWeek]);

  return { todaySchedule, weekSchedule, loading, fetchToday, fetchWeek };
}