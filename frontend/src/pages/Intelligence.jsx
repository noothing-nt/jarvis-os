import { useState, useRef, useEffect } from "react";
import {
  Brain, Send, Trash2, Plus, Sparkles,
  Mail, RefreshCw, ChevronRight, ArrowRight,
  Lightbulb, Zap, Copy, Check, Bot,
  MessageSquare, FileText, Star,
} from "lucide-react";
import Badge  from "@/components/shared/Badge";
import clsx   from "clsx";
import { format } from "date-fns";

/* ── Mock email data ─────────────────────────────────────────────── */
const EMAILS = [
  {
    id: "e1", from: "Prof. Sharma", subject: "Deadline Extension — Project Submission",
    preview: "I wanted to inform you that the submission deadline for the final project has been extended...",
    summary: "Project submission deadline extended by one week to May 10th. No action needed unless submitting early.",
    action: "READ_ONLY", account: "College", time: "9:32 AM", read: false,
  },
  {
    id: "e2", from: "GitHub", subject: "[jarvis-os] Pull request #12 needs review",
    preview: "A pull request has been opened in jarvis-os that requires your review before it can be merged...",
    summary: "PR #12 is waiting for your code review. Needs attention before merge to main branch.",
    action: "ACTION_REQUIRED", account: "Dev", time: "8:15 AM", read: false,
  },
  {
    id: "e3", from: "Amazon Web Services", subject: "Your AWS bill for April 2026",
    preview: "Your AWS account has been charged \$4.32 for April 2026 usage...",
    summary: "AWS bill of \$4.32 for April. No action needed, auto-payment processed.",
    action: "FYI", account: "Dev", time: "Yesterday", read: true,
  },
  {
    id: "e4", from: "Internship Portal", subject: "Application Status Update — TechCorp",
    preview: "Congratulations! Your application for the Software Engineering Intern position has moved to the interview stage...",
    summary: "Internship application advanced to interview stage at TechCorp. Reply required to schedule interview.",
    action: "REPLY_NEEDED", account: "Personal", time: "Yesterday", read: false,
  },
];

const ACTION_COLORS = {
  REPLY_NEEDED:    "amber",
  ACTION_REQUIRED: "red",
  READ_ONLY:       "blue",
  FYI:             "gray",
};

/* ── AI Chat ─────────────────────────────────────────────────────── */
const WELCOME = {
  id:      "w",
  role:    "assistant",
  content: "Hey! I'm JARVIS — your AI command center. I can help you brainstorm ideas, summarize projects, analyze emails, write code, or just chat. What's on your mind?",
  time:    new Date().toISOString(),
};

const QUICK_PROMPTS = [
  "What should I work on today?",
  "Summarize my active projects",
  "Give me 5 ideas for my ESP32 project",
  "Help me write a commit message",
  "What's the best way to structure a FastAPI app?",
  "Explain async/await in Python",
];

/* ── Typing indicator ────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0,1,2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-accent"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.8);opacity:0.5}40%{transform:scale(1.2);opacity:1}}`}</style>
    </div>
  );
}

/* ── Message bubble ──────────────────────────────────────────────── */
function Message({ msg }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={clsx("flex gap-3 group", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={clsx(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold",
        isUser
          ? "bg-accent-muted border border-accent/30 text-accent-hover"
          : "bg-surface border border-border text-muted"
      )}>
        {isUser ? "YOU" : <Bot size={13} />}
      </div>

      {/* Bubble */}
      <div className={clsx(
        "max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed relative",
        isUser
          ? "bg-accent-muted border border-accent/30 text-primary rounded-tr-sm"
          : "bg-surface border border-border text-secondary rounded-tl-sm"
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <div className={clsx(
          "flex items-center gap-2 mt-1.5",
          isUser ? "justify-start" : "justify-between"
        )}>
          <span className="text-2xs text-muted">
            {format(new Date(msg.time), "HH:mm")}
          </span>
          {!isUser && (
            <button
              onClick={copy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-primary"
            >
              {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function Intelligence() {
  const [tab,      setTab]      = useState("chat");
  const [messages, setMessages] = useState([WELCOME]);
  const [input,    setInput]    = useState("");
  const [thinking, setThinking] = useState(false);
  const [emails,   setEmails]   = useState(EMAILS);
  const [selEmail, setSelEmail] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  /* ── Simulated AI response ─────────────────────────────────── */
  const RESPONSES = {
    default: [
      "I've analyzed your request. Based on your current project load with 7 active projects and 24 tasks completed this week, I'd recommend focusing on the high-priority items in Work Center first — specifically the JWT refresh logic and ESP32 reconnect bug which are both marked critical and due tomorrow.",
      "Great question! For your JARVIS OS project at 68% completion, the next 3 key steps would be: 1) Complete the file upload system in Project Vault, 2) Wire up the Zustand stores to your FastAPI backend, 3) Deploy the frontend to Netlify with proper environment variables.",
      "I can help with that. Looking at your schedule, you have Data Structures at 1PM and a Project Review at 3PM. Your most productive window appears to be 10AM-12PM based on your activity patterns. I'd suggest using that time for deep work on the AI service integration.",
      "Analyzing your codebase patterns... For the ESP32 project, I recommend implementing a watchdog timer with a 30-second timeout and exponential backoff for WiFi reconnection. This will prevent infinite loop crashes on spotty networks.",
    ],
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg = { id: Date.now().toString(), role: "user", content: text, time: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    /* Simulate network delay */
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const reply = RESPONSES.default[Math.floor(Math.random() * RESPONSES.default.length)];
    setMessages((m) => [
      ...m,
      { id: Date.now().toString() + "r", role: "assistant", content: reply, time: new Date().toISOString() },
    ]);
    setThinking(false);
  };

  const clearChat = () => setMessages([WELCOME]);

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Intelligence</h1>
          <p className="text-sm text-muted mt-0.5">AI chat, email digest, and idea brainstorming</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30">
            <span className="dot dot-green animate-ping-slow" />
            <span className="text-xs font-semibold text-success">AI Online</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="nx-tabs">
        {[
          { id: "chat",   label: "AI Chat",    icon: MessageSquare },
          { id: "emails", label: "Email Digest",icon: Mail          },
          { id: "ideas",  label: "Brainstorm", icon: Lightbulb     },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx("nx-tab", tab === id && "active")}
          >
            <Icon size={13} />
            {label}
            {id === "emails" && emails.filter((e) => !e.read).length > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-danger text-white text-2xs
                               flex items-center justify-center font-bold">
                {emails.filter((e) => !e.read).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* AI CHAT TAB                                          */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === "chat" && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5" style={{ minHeight: "calc(100vh - 280px)" }}>

          {/* Chat panel */}
          <div className="xl:col-span-3 nx-card flex flex-col overflow-hidden"
               style={{ height: "calc(100vh - 280px)" }}>

            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent/30
                                flex items-center justify-center">
                  <Brain size={15} className="text-accent-hover" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">JARVIS AI</div>
                  <div className="text-2xs text-success flex items-center gap-1">
                    <span className="dot dot-green w-1.5 h-1.5" /> Gemini 1.5 Pro
                  </div>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="btn btn-ghost btn-sm gap-1.5 text-muted hover:text-primary"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {messages.map((msg) => <Message key={msg.id} msg={msg} />)}
              {thinking && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface border border-border
                                  flex items-center justify-center flex-shrink-0">
                    <Bot size={13} className="text-muted" />
                  </div>
                  <div className="bg-surface border border-border rounded-xl rounded-tl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-5 py-2 border-t border-border flex gap-2 overflow-x-auto flex-shrink-0">
              {QUICK_PROMPTS.slice(0,4).map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus(); }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border border-border
                             text-xs text-muted hover:text-primary hover:border-accent/40
                             transition-all bg-surface"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-border flex-shrink-0">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Ask JARVIS anything... (Enter to send, Shift+Enter for newline)"
                  rows={2}
                  className="flex-1 nx-input nx-textarea resize-none text-sm"
                  style={{ minHeight: 56 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || thinking}
                  className="btn btn-blue btn-sm flex-shrink-0"
                  style={{ minHeight: 56, minWidth: 56 }}
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-2xs text-muted mt-1.5 text-center">
                JARVIS can make mistakes. Verify important information.
              </p>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* AI capabilities */}
            <div className="nx-card p-4">
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-accent-hover" /> Capabilities
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Brainstorm ideas",    icon: "💡" },
                  { label: "Summarize projects",  icon: "📋" },
                  { label: "Review code",         icon: "💻" },
                  { label: "Write documentation", icon: "📝" },
                  { label: "Explain concepts",    icon: "🧠" },
                  { label: "Plan your day",       icon: "📅" },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    onClick={() => { setInput(label); inputRef.current?.focus(); }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg text-xs
                               text-secondary hover:text-primary hover:bg-surface
                               transition-all text-left border border-transparent
                               hover:border-border-subtle"
                  >
                    <span>{icon}</span>
                    {label}
                    <ChevronRight size={10} className="ml-auto text-muted" />
                  </button>
                ))}
              </div>
            </div>

            {/* Model status */}
            <div className="nx-card p-4">
              <h3 className="text-sm font-semibold text-primary mb-3">Model Status</h3>
              <div className="space-y-2">
                {[
                  { name: "Gemini 1.5 Pro", status: "primary", ok: true  },
                  { name: "GPT-4o Mini",    status: "fallback", ok: true  },
                  { name: "Local LLM",      status: "offline",  ok: false },
                ].map(({ name, status, ok }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx("dot", ok ? "dot-green" : "dot-gray")} />
                      <span className="text-xs text-secondary">{name}</span>
                    </div>
                    <Badge variant={ok ? (status === "primary" ? "blue" : "gray") : "gray"}>
                      {status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* EMAIL DIGEST TAB                                     */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === "emails" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Email list */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">
                {emails.filter((e) => !e.read).length} unread
              </span>
              <div className="flex items-center gap-2">
                {["All","Dev","College","Personal"].map((f) => (
                  <button
                    key={f}
                    className="px-2.5 py-1 rounded text-xs font-medium text-muted
                               hover:text-primary hover:bg-surface transition-all border border-transparent
                               hover:border-border-subtle"
                  >
                    {f}
                  </button>
                ))}
                <button className="btn btn-default btn-sm gap-1.5">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </div>

            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => {
                  setSelEmail(email.id === selEmail ? null : email.id);
                  setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, read: true } : e));
                }}
                className={clsx(
                  "nx-card p-4 cursor-pointer transition-all",
                  !email.read && "border-l-2 border-l-accent",
                  selEmail === email.id && "border-accent/40 bg-accent-subtle",
                  "hover:border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={clsx(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      "bg-accent-muted border border-accent/20 text-accent-hover"
                    )}>
                      {email.from[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "text-sm truncate",
                          email.read ? "text-secondary" : "font-semibold text-primary"
                        )}>
                          {email.from}
                        </span>
                        <Badge variant="gray" className="text-2xs flex-shrink-0">{email.account}</Badge>
                      </div>
                      <p className={clsx(
                        "text-xs truncate",
                        email.read ? "text-muted" : "text-secondary"
                      )}>
                        {email.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={ACTION_COLORS[email.action] || "gray"}>
                      {email.action.replace(/_/g," ")}
                    </Badge>
                    <span className="text-2xs text-muted">{email.time}</span>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg
                                bg-accent-subtle border border-accent/15 mt-2">
                  <Brain size={12} className="text-accent-hover flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-secondary leading-relaxed">{email.summary}</p>
                </div>

                {/* Expanded */}
                {selEmail === email.id && (
                  <div className="mt-3 pt-3 border-t border-border-subtle animate-fade-in">
                    <p className="text-xs text-muted leading-relaxed">{email.preview}</p>
                    {email.action === "REPLY_NEEDED" && (
                      <button className="btn btn-blue btn-sm mt-3 gap-1.5">
                        <Send size={11} /> Draft Reply with AI
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Email stats sidebar */}
          <div className="space-y-4">
            <div className="nx-card p-4">
              <h3 className="text-sm font-semibold text-primary mb-3">Accounts</h3>
              <div className="space-y-3">
                {["Dev","College","Personal"].map((acc) => {
                  const count  = emails.filter((e) => e.account === acc).length;
                  const unread = emails.filter((e) => e.account === acc && !e.read).length;
                  return (
                    <div key={acc} className="flex items-center justify-between p-2 rounded-lg
                                              bg-surface border border-border-subtle">
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-muted" />
                        <span className="text-sm text-secondary">{acc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-danger text-white text-2xs
                                           flex items-center justify-center font-bold">
                            {unread}
                          </span>
                        )}
                        <span className="text-xs text-muted">{count} total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="nx-card p-4">
              <h3 className="text-sm font-semibold text-primary mb-3">Action Summary</h3>
              <div className="space-y-2">
                {Object.entries(ACTION_COLORS).map(([action, color]) => {
                  const count = emails.filter((e) => e.action === action).length;
                  return count > 0 ? (
                    <div key={action} className="flex items-center justify-between">
                      <Badge variant={color}>{action.replace(/_/g," ")}</Badge>
                      <span className="text-xs font-semibold text-primary">{count}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* BRAINSTORM TAB                                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === "ideas" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-4">
            {/* Input card */}
            <div className="nx-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-warning-light" />
                <h3 className="text-md font-semibold text-primary">New Idea</h3>
              </div>
              <textarea
                placeholder="Describe your raw idea... AI will expand it into a full concept with feasibility analysis, next steps, and technical approach."
                className="nx-input nx-textarea w-full mb-3"
                rows={4}
              />
              <div className="flex items-center gap-2">
                <button className="btn btn-blue btn-sm gap-1.5">
                  <Sparkles size={12} /> AI Brainstorm
                </button>
                <button className="btn btn-default btn-sm gap-1.5">
                  <Plus size={12} /> Save Raw
                </button>
              </div>
            </div>

            {/* Ideas list */}
            {[
              {
                id: "i1", title: "Smart Mirror with JARVIS UI",
                raw: "Build a smart mirror that shows JARVIS dashboard on a two-way mirror with ESP32 behind it",
                expanded: "A smart mirror system using a two-way mirror with an LED display behind it. The ESP32 would act as the display controller, fetching data from JARVIS OS API and rendering it on a TFT or small LCD. The mirror effect creates a sleek HUD appearance showing time, weather, tasks, and notifications without a visible screen frame.",
                feasibility: "HIGH", status: "expanded",
                tags: ["hardware","display","esp32","iot"],
              },
              {
                id: "i2", title: "AI Code Review Bot",
                raw: "Auto review my GitHub PRs using AI before I merge",
                expanded: "A GitHub Actions workflow that triggers on PR creation, sends the diff to Gemini API for code review, and posts structured feedback as PR comments. Checks for security vulnerabilities, performance issues, and code style violations.",
                feasibility: "HIGH", status: "expanded",
                tags: ["ai","github","automation","devops"],
              },
              {
                id: "i3", title: "Gesture-controlled presentation remote",
                raw: "Use MediaPipe to control slides with hand gestures",
                expanded: null,
                feasibility: null, status: "raw",
                tags: ["mediapipe","gesture","python"],
              },
            ].map((idea) => (
              <div key={idea.id} className="nx-card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-primary">{idea.title}</h3>
                      <Badge variant={
                        idea.status === "expanded" ? "blue" :
                        idea.status === "promoted" ? "green" : "amber"
                      } dot>
                        {idea.status}
                      </Badge>
                      {idea.feasibility && (
                        <Badge variant={idea.feasibility === "HIGH" ? "green" : "amber"}>
                          {idea.feasibility} FEASIBILITY
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted italic">"{idea.raw}"</p>
                  </div>
                </div>

                {idea.expanded && (
                  <div className="p-3 rounded-lg bg-accent-subtle border border-accent/15 mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Brain size={12} className="text-accent-hover" />
                      <span className="text-2xs font-semibold text-accent-hover uppercase tracking-wide">
                        AI Expansion
                      </span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">{idea.expanded}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {idea.tags.map((t) => (
                    <span key={t} className="badge badge-gray text-2xs">#{t}</span>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    {!idea.expanded && (
                      <button className="btn btn-default btn-sm gap-1.5">
                        <Sparkles size={11} /> Expand
                      </button>
                    )}
                    <button className="btn btn-blue btn-sm gap-1.5">
                      <ArrowRight size={11} /> Promote to Project
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Idea stats */}
          <div className="space-y-4">
            <div className="nx-card p-4">
              <h3 className="text-sm font-semibold text-primary mb-3">Idea Bank</h3>
              <div className="space-y-2">
                {[
                  { label: "Total Ideas",    value: 38, color: "text-primary"       },
                  { label: "Expanded",       value: 24, color: "text-accent-hover"  },
                  { label: "Promoted",       value: 8,  color: "text-success"       },
                  { label: "Discarded",      value: 6,  color: "text-muted"         },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between p-2 rounded bg-surface">
                    <span className="text-xs text-secondary">{label}</span>
                    <span className={clsx("text-sm font-bold", color)}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="nx-card p-4">
              <h3 className="text-sm font-semibold text-primary mb-3">Top Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {["hardware","ai","automation","esp32","web","python","iot","ml","react"].map((t) => (
                  <span key={t} className="badge badge-gray"># {t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}