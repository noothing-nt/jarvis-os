import { useState, useCallback } from "react";
import { aiService }       from "@/services/aiService";
import { useProjectStore } from "@/store/useProjectStore";

const WELCOME = {
  id:        "welcome",
  role:      "assistant",
  content:   "JARVIS online. All systems nominal. How can I assist you, Boss?",
  timestamp: new Date().toISOString(),
};

export function useAiChat() {
  const { projects }              = useProjectStore();
  const [messages, setMessages]   = useState([WELCOME]);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState(null);

  const send = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = {
      id:        `u-${Date.now()}`,
      role:      "user",
      content:   trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const activeProjects = projects
        .filter((p) => p.status === "active")
        .map((p) => p.title);

      const res    = await aiService.chat(trimmed, "", true);
      const reply  = res.data?.response || "Processing complete.";

      setMessages((m) => [
        ...m,
        {
          id:        `a-${Date.now()}`,
          role:      "assistant",
          content:   reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setError(e.message);
      setMessages((m) => [
        ...m,
        {
          id:        `err-${Date.now()}`,
          role:      "assistant",
          content:   "System error. AI provider offline. Please retry.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, projects]);

  const clearHistory = () => setMessages([WELCOME]);

  return { messages, loading, error, send, clearHistory };
}