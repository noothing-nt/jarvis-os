import { useEffect } from "react";
import { useCommsStore } from "@/store/useCommsStore";
import { POLL_INTERVAL_MS } from "@/utils/constants";

export function useEmails() {
  const store = useCommsStore();

  useEffect(() => {
    store.fetchEmails();
    store.fetchStats();
    const interval = setInterval(() => {
      store.fetchStats();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  return store;
}
