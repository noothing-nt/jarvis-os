import { useState, useRef, useEffect } from "react";
import HudCard   from "@/components/ui/HudCard";
import HudButton from "@/components/ui/HudButton";
import HudInput  from "@/components/ui/HudInput";
import { aiService }       from "@/services/aiService";
import { useProjectStore } from "@/store/useProjectStore";
import { useAppStore }     from "@/store/useAppStore";
import { timeAgo }         from "@/utils/dateHelpers";
import {
  SparklesIcon,
  PaperAirplaneIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded shrink-0 flex items-center justify-center text-[10px] font-hud
        ${isUser
          ? "bg-hud-blue/40 border border-hud-cyan/30 text-hud-cyan"
          : "bg-hud-bg-3 border border-hud-border text-hud-text-dim"
        }`}
      >
        {isUser ? "YOU" : "J"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] rounded px-3 py-2.5 text-sm font-sans leading-relaxed
        ${isUser
          ? "bg-hud-blue/20 border border-hud-cyan/20 text-hud-text"
          : "bg-hud-bg-3 border border-hud-border text-hud-text"
        }`}
      >
        {msg.content}
        <div className="mt-1 text-[9px] font-mono text-hud-text-dim">
          {timeAgo(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default function AiChat({ onClose }) {
  const { projects }              = useProjectStore();
  const { showToast }             = useAppStore();
  const [messages, setMessages]   = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Online and operational. How can I assist you today, Boss?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const projectTitles = projects
        .filter((p) => p.status === "active")
        .map((p) => p.title);

      const res = await aiService.chat(trimmed, "", true);
      const reply = res.data?.response || "No response from AI.";

      setMessages((m) => [
        ...m,
        {
          id: Date.now().toString() + "_r",
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      showToast("error", "JARVIS AI unavailable: " + e.message);
      setMessages((m) => [
        ...m,
        {
          id: Date.now().toString() + "_err",
          role: "assistant",
          content: "I'm experiencing technical difficulties. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90] w-[380px] max-w-[calc(100vw-2rem)] animate-slide-up">
      <HudCard className="flex flex-col overflow-hidden" glow="cyan" style={{ height: "520px" }}>

        {/* ── Chat header ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3
                        border-b border-hud-border bg-hud-bg-3/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-hud-blue/30 border border-hud-cyan/40
                            flex items-center justify-center arc-pulse">
              <SparklesIcon className="w-3 h-3 text-hud-cyan" />
            </div>
            <div>
              <div className="font-hud text-xs text-hud-cyan tracking-widest">JARVIS AI</div>
              <div className="font-mono text-[8px] text-hud-green flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-hud-green inline-block" />
                ONLINE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <HudButton
              variant="ghost"
              size="icon"
              onClick={() => setMessages([{
                id: "welcome",
                role: "assistant",
                content: "Memory cleared. How can I help?",
                timestamp: new Date().toISOString(),
              }])}
              aria-label="Clear chat"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </HudButton>
            {onClose && (
              <HudButton variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <XMarkIcon className="w-3.5 h-3.5" />
              </HudButton>
            )}
          </div>
        </div>

        {/* ── Messages ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded bg-hud-bg-3 border border-hud-border
                              flex items-center justify-center text-[10px] font-hud text-hud-text-dim shrink-0">
                J
              </div>
              <div className="px-3 py-2.5 rounded bg-hud-bg-3 border border-hud-border">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-hud-cyan animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ──────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-3 border-t border-hud-border shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask JARVIS anything..."
              disabled={loading}
              className="flex-1 bg-hud-bg border border-hud-border rounded
                         text-hud-text font-sans text-sm px-3 py-2.5
                         placeholder:text-hud-text-dim/50
                         focus:outline-none focus:border-hud-cyan/60
                         focus:shadow-[0_0_0_1px_rgba(0,245,255,0.2)]
                         disabled:opacity-50 transition-all"
            />
            <HudButton
              size="icon"
              disabled={!input.trim() || loading}
              onClick={handleSend}
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </HudButton>
          </div>
          <p className="mt-1.5 font-mono text-[9px] text-hud-text-dim text-center">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </HudCard>
    </div>
  );
}