import { useEffect } from "react";
import { useTaskStore } from "@/store/useTaskStore";

export function useTasks() {
  const store = useTaskStore();

  useEffect(() => {
    store.fetchToday();
    store.fetchOverdue();
    store.fetchTasks();
  }, []); // eslint-disable-line

  return store;
}