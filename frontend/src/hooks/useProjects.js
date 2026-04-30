import { useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";

export function useProjects() {
  const store = useProjectStore();

  useEffect(() => {
    store.fetchProjects();
    store.fetchStats();
  }, []); // eslint-disable-line

  return store;
}