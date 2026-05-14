import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import {
  Brain, Send, Trash2, Plus, Sparkles, Mail, RefreshCw, 
  ChevronRight, Lightbulb, Copy, Check, Bot, Activity,
  MessageSquare, Network, Cpu, Wand2
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

/* ── Fallback Mock Email Data ────────────── */
const FALLBACK_EMAILS = [
  { id: "e1", from: "System", subject: "Connect your Email API", preview: "Your email digest is currently showing fallback data. Connect your Gmail to Supabase via Zapier/Make to see live emails here.", summary: "Setup required for live emails.", action: "ACTION_REQUIRED", account: "System", time: "Now", read: false, color: "#EF4444", bg: "#FEE2E2" },
];

const QUICK_PROMPTS = [
  "What active tasks do I have right now?",
  "Summarize my current projects",
  "Write a Python script to control an ESP32 LED",
  "Brainstorm 3 ideas for my next automation",
];

/* ── Components ──────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0,1,2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1.1);opacity:1}}`}</style>
    </div>
  );
}

function Message({ msg }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={clsx("flex gap-3 group", isUser && "flex-row-reverse animate-slide-in-right")}>
      <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 text-[10px] font-bold shadow-sm", isUser ? "bg-[#7C3AED] text-white" : "bg-white border border-[#E2E8F0] text-[#7C3AED]")}>
        {isUser ? "USR" : <Bot size={16} />}
      </div>

      <div className={clsx("max-w-[85%] rounded-2xl px-5 py-4 text-[13px] leading-relaxed relative shadow-sm", isUser ? "bg-[#7C3AED] text-white rounded-tr-sm" : "bg-white border border-[#E2E8F0] text-[#475569] rounded-tl-sm")}>
        <div className="whitespace-pre-wrap font-medium" dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: inherit">$1</strong>')
            .replace(/\`(.*?)\`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace">$1</code>')
        }} />
        
        <div className={clsx("flex items-center gap-3 mt-3", isUser ? "justify-start" : "justify-between")}>
          <span className={clsx("text-[9px] font-bold uppercase tracking-wider", isUser ? "text-white/70" : "text-[#94A3B8]")}>
            {format(new Date(msg.time), "HH:mm")}
          </span>
          {!isUser && (
            <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#94A3B8] hover:text-[#7C3AED]">
              {copied ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function Intelligence() {
  const [tab, setTab] = useState("chat");
  const [apiKeyStatus, setApiKeyStatus] = useState("checking");
  
  // Real Persistent Chat State
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('jarvis_chat');
    return saved ? JSON.parse(saved) : [{ id: "w", role: "assistant", content: "Systems online. I am JARVIS. I have access to your tasks and project vaults. How can I assist you today?", time: new Date().toISOString() }];
  });
  
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Live Database States
  const [emails, setEmails] = useState([]);
  const [selEmail, setSelEmail] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [rawIdeaText, setRawIdeaText] = useState("");
  const [systemContext, setSystemContext] = useState(""); 

  // 1. WAKE UP & GATHER CONTEXT (Ideas, Emails, Tasks, Projects)
  const fetchAllData = async () => {
    // Check API Key
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    setApiKeyStatus(key ? "connected" : "simulated");

    // Fetch Ideas
    const { data: ideaData, error: ideaErr } = await supabase.from('ideas').select('*').order('created_at', { ascending: false });
    if (ideaData) setIdeas(ideaData);
    if (ideaErr) console.error("RLS Error on Ideas:", ideaErr);

    // Fetch Emails (LIVE)
    const { data: emailData, error: emailErr } = await supabase.from('emails').select('*').order('created_at', { ascending: false });
    if (emailData && emailData.length > 0) {
      setEmails(emailData);
    } else {
      setEmails(FALLBACK_EMAILS); // Show setup warning if table empty or missing
    }

    // Fetch Tasks & Projects for AI Context
    const { data: tasks } = await supabase.from('tasks').select('title, status, done').eq('done', false);
    const { data: projs } = await supabase.from('projects').select('name, status');
    
    let ctx = "CURRENT SYSTEM STATE:\n";
    if (tasks?.length) ctx += `Active Tasks: ${tasks.map(t => t.title).join(", ")}.\n`;
    if (projs?.length) ctx += `Active Projects: ${projs.map(p => p.name).join(", ")}.\n`;
    setSystemContext(ctx);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    localStorage.setItem('jarvis_chat', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (tab === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, tab]);

  /* ── LIVE AI ENGINE ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg = { id: Date.now().toString(), role: "user", content: text, time: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    try {
      if (apiKey) {
        const prompt = `You are JARVIS, a highly advanced, concise, and technical AI assistant for a developer.\n${systemContext}\nUser Query: ${text}`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await res.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        setMessages((m) => [...m, { id: Date.now().toString() + "r", role: "assistant", content: aiText, time: new Date().toISOString() }]);
      } else {
        await new Promise((r) => setTimeout(r, 1500));
        let reply = "I am operating in local simulation mode (API Key missing). ";
        if (text.toLowerCase().includes("task")) reply += `Based on your database, your active tasks are: ${systemContext.split("Active Tasks: ")[1]?.split(".")[0] || "None found"}.`;
        else if (text.toLowerCase().includes("project")) reply += `Your current projects in the vault are: ${systemContext.split("Active Projects: ")[1]?.split(".")[0] || "None found"}.`;
        else reply += "I have logged your request. Please connect a Gemini API key in your .env file for full autonomous reasoning.";
        setMessages((m) => [...m, { id: Date.now().toString() + "r", role: "assistant", content: reply, time: new Date().toISOString() }]);
      }
    } catch (error) {
      setMessages((m) => [...m, { id: Date.now().toString() + "e", role: "assistant", content: "Error connecting to neural network.", time: new Date().toISOString() }]);
    }
    setThinking(false);
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  /* ── IDEA VAULT ACTIONS ── */
  const saveRawIdea = async () => {
    if (!rawIdeaText.trim()) return;
    const newIdea = { title: "New Concept", raw: rawIdeaText, status: "raw", created_at: new Date().toISOString() };
    
    // Optimistic UI
    const tempId = Date.now();
    setIdeas([{ id: tempId, ...newIdea }, ...ideas]);
    setRawIdeaText("");
    
    // DB Push with Error Handling
    const { data, error } = await supabase.from('ideas').insert([newIdea]).select();
    
    if (error) {
      console.error("Database Insert Error:", error);
      alert(`Database Error: ${error.message}\n\n(Tip: Go to Supabase -> Authentication -> Policies and enable RLS for the 'ideas' table!)`);
      setIdeas(prev => prev.filter(i => i.id !== tempId)); // revert on error
    } else if (data) {
      setIdeas(prev => prev.map(i => i.id === tempId ? data[0] : i));
    }
  };

  const enhanceIdea = async (idea) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return alert("Please add VITE_GEMINI_API_KEY to your .env to use AI Enhancement.");
    
    setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: "enhancing..." } : i));

    try {
      const prompt = `Expand this raw idea into a short, structured technical project plan (1 paragraph overview, 3 bullet point steps): "${idea.raw}"`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const enhancedText = data.candidates[0].content.parts[0].text;
      
      const updatedIdea = { ...idea, raw: enhancedText, status: "enhanced", title: "Enhanced Concept" };
      setIdeas(prev => prev.map(i => i.id === idea.id ? updatedIdea : i));
      
      const { error } = await supabase.from('ideas').update({ raw: enhancedText, status: "enhanced", title: "Enhanced Concept" }).eq('id', idea.id);
      if(error) alert("Failed to save enhancement to database. Check RLS.");

    } catch (e) {
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: "raw" } : i));
    }
  };

  /* ── LIVE EMAIL ACTIONS ── */
  const handleEmailClick = async (email) => {
    setSelEmail(email.id === selEmail ? null : email.id);
    
    // If not read, mark as read in UI and DB
    if (!email.read) {
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, read: true } : e));
      if (email.id !== "e1") { // Don't update the DB if it's the fallback mock email
        await supabase.from('emails').update({ read: true }).eq('id', email.id);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in" style={{ backgroundColor: "#F8FAFC", padding: "16px 24px" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-0.5">Intelligence Center</h1>
          <p className="text-xs text-[#64748B] font-medium">Autonomous AI routing & systems control</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white shadow-sm" style={{ borderColor: apiKeyStatus === "connected" ? "#10B981" : "#F59E0B" }}>
            <Network size={14} className={apiKeyStatus === "connected" ? "text-[#10B981]" : "text-[#F59E0B]"} />
            <span className={clsx("text-[10px] font-bold uppercase tracking-wider", apiKeyStatus === "connected" ? "text-[#10B981]" : "text-[#F59E0B]")}>
              {apiKeyStatus === "connected" ? "Gemini Linked" : "Simulated Local"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 p-1 bg-white border border-[#E2E8F0] rounded-xl mb-4 w-max shadow-sm flex-shrink-0">
        {[
          { id: "chat", label: "Neural Chat", icon: MessageSquare },
          { id: "ideas", label: "Idea Vault", icon: Lightbulb },
          { id: "emails", label: "Comms Digest", icon: Mail }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all", 
              tab === id ? "bg-[#F1F5F9] text-[#0F172A] shadow-sm border border-[#E2E8F0]" : "text-[#64748B] hover:text-[#0F172A] border border-transparent"
            )}
          >
            <Icon size={14} />{label}
            {id === "emails" && emails.filter((e) => !e.read).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md flex items-center justify-center text-[9px]" style={{ backgroundColor: "#7C3AED", color: "#FFF" }}>
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
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 min-h-0 pb-4">
          
          {/* Chat panel */}
          <div className="xl:col-span-3 bg-white border border-[#E2E8F0] rounded-[20px] flex flex-col overflow-hidden shadow-sm min-h-0">
            
            {/* Chat header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] flex-shrink-0 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #7C3AED, #22D3EE)" }}>
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">JARVIS AI Engine</div>
                  <div className="text-[10px] font-bold text-[#7C3AED] flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" /> Live DB Context Active
                  </div>
                </div>
              </div>
              <button onClick={() => setMessages([{ id: "w", role: "assistant", content: "Context cleared. Ready for new instructions.", time: new Date().toISOString() }])} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors flex items-center gap-1.5">
                <Trash2 size={12} /> Clear Context
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#F8FAFC] custom-scrollbar">
              {messages.map((msg) => <Message key={msg.id} msg={msg} />)}
              {thinking && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot size={16} className="text-[#7C3AED]" />
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-sm shadow-sm"><TypingDots /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-6 py-3 border-t border-[#F1F5F9] flex gap-2 overflow-x-auto flex-shrink-0 bg-white custom-scrollbar">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }} className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-bold text-[#64748B] hover:text-[#7C3AED] hover:border-[#7C3AED] hover:bg-[#F3E8FF] transition-all bg-[#F8FAFC] shadow-sm">
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-[#F1F5F9] flex-shrink-0 bg-white">
              <div className="flex items-end gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-2 shadow-sm focus-within:border-[#7C3AED] focus-within:ring-1 focus-within:ring-[#7C3AED] transition-all">
                <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} placeholder="Command JARVIS..." rows={1} className="flex-1 bg-transparent text-sm font-medium text-[#0F172A] placeholder-[#94A3B8] resize-none outline-none px-3 py-2.5" style={{ minHeight: 40 }} />
                <button onClick={sendMessage} disabled={!input.trim() || thinking} className="flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-50 transition-all hover:scale-105 shadow-sm" style={{ height: 40, width: 40, backgroundColor: "#7C3AED", color: "#FFF" }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 flex flex-col min-h-0">
            <div className="p-5 rounded-[20px] bg-white border border-[#E2E8F0] shadow-sm">
              <h3 className="text-xs font-bold text-[#0F172A] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Cpu size={14} className="text-[#7C3AED]" /> Live Telemetry
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase mb-1">Database Sync</div>
                  <div className="text-sm font-bold text-[#0F172A]">{systemContext.split("Tasks").length - 1 > 0 ? "Active" : "Scanning..."}</div>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase mb-1">Model Route</div>
                  <div className="text-sm font-bold text-[#0F172A] truncate">Gemini 1.5 Pro Flash</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* IDEA VAULT TAB                                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === "ideas" && (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0 pb-4">
          <div className="xl:col-span-2 flex flex-col gap-4 min-h-0">
            
            {/* Input Card */}
            <div className="p-5 rounded-[20px] bg-white border border-[#E2E8F0] shadow-sm flex-shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#F59E0B] flex items-center justify-center"><Lightbulb size={16} /></div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Capture Concept</h3>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Syncs to Postgres DB</p>
                </div>
              </div>
              <textarea value={rawIdeaText} onChange={(e) => setRawIdeaText(e.target.value)} placeholder="Dump a raw thought here..." className="w-full mb-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all resize-none shadow-inner" rows={2} />
              <button onClick={saveRawIdea} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white transition-all hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(245,158,11,0.3)]" style={{ backgroundColor: "#F59E0B" }}>
                <Plus size={14} /> Save to Database
              </button>
            </div>

            {/* Ideas List */}
            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
              {ideas.map((idea) => (
                <div key={idea.id} className="p-5 rounded-[20px] bg-white border border-[#E2E8F0] shadow-sm transition-all hover:-translate-y-1 hover:shadow-md group">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0F172A]">{idea.title}</h3>
                      <span className={clsx("px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-bold", idea.status === 'enhanced' ? "bg-[#D1FAE5] text-[#10B981]" : "bg-[#FEF3C7] text-[#F59E0B]")}>
                        {idea.status}
                      </span>
                    </div>
                    {idea.status !== 'enhanced' && (
                       <button onClick={() => enhanceIdea(idea)} disabled={idea.status === 'enhancing...'} className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-[#F3E8FF] text-[#7C3AED] hover:bg-[#E9D5FF] transition-colors disabled:opacity-50">
                         <Wand2 size={12} /> {idea.status === 'enhancing...' ? "Working..." : "AI Enhance"}
                       </button>
                    )}
                  </div>
                  <div className="text-xs text-[#475569] leading-relaxed p-3 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9] whitespace-pre-wrap font-medium">"{idea.raw}"</div>
                </div>
              ))}
              {ideas.length === 0 && <div className="h-full flex items-center justify-center text-xs font-bold text-[#94A3B8]">Your idea vault is currently empty.</div>}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="p-6 rounded-[20px] relative overflow-hidden flex flex-col justify-end shadow-md h-full min-h-[200px]" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)" }}>
              <h1 className="text-xl font-bold tracking-tight text-white mb-2 z-10">Neural Vault</h1>
              <p className="text-xs font-medium text-white/90 mb-0 z-10 leading-relaxed">Concepts are parsed and automatically structured by the JARVIS backend system.</p>
              {/* Decorative background shapes */}
              <div className="absolute top-[-20px] right-[-20px] w-32 h-32 rounded-full border-4 border-white/10" />
              <div className="absolute bottom-[-40px] right-[20px] w-24 h-24 rounded-full border-4 border-white/10" />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* EMAIL DIGEST TAB (Live DB Integration)                 */}
      {/* ══════════════════════════════════════════════════════ */}
      {tab === "emails" && (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0 pb-4">
          <div className="xl:col-span-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-sm font-bold text-[#0F172A]">{emails.filter((e) => !e.read).length} Unread Comms</span>
              <button onClick={fetchAllData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E2E8F0] text-[#7C3AED] bg-white hover:bg-[#F3E8FF] transition-colors shadow-sm">
                <RefreshCw size={12} /> Sync DB
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {emails.map((email) => (
                <div key={email.id} onClick={() => handleEmailClick(email)} className={clsx("p-5 rounded-[20px] cursor-pointer transition-all shadow-sm border", !email.read ? "border-l-4" : "border-l border-[#E2E8F0]", selEmail === email.id ? "bg-[#F8FAFC]" : "bg-white hover:-translate-y-0.5 hover:shadow-md")} style={{ borderLeftColor: !email.read ? email.color : "#E2E8F0" }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm" style={{ backgroundColor: email.bg || "#F1F5F9", color: email.color || "#64748B" }}>
                        {(email.from || "S")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={clsx("text-sm truncate font-bold", email.read ? "text-[#64748B]" : "text-[#0F172A]")}>{email.from}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-[#F1F5F9] text-[#64748B]">{email.account}</span>
                        </div>
                        <p className={clsx("text-xs truncate font-medium", email.read ? "text-[#94A3B8]" : "text-[#475569]")}>{email.subject}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: email.bg || "#F1F5F9", color: email.color || "#64748B" }}>{(email.action || "INFO").replace(/_/g," ")}</span>
                      <span className="text-[10px] font-bold text-[#94A3B8]">{email.time || "Just now"}</span>
                    </div>
                  </div>
                  
                  {email.summary && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl border" style={{ backgroundColor: "#F8FAFC", borderColor: "#F1F5F9" }}>
                      <Brain size={14} className="flex-shrink-0 mt-0.5" style={{ color: email.color || "#64748B" }} />
                      <p className="text-[11px] text-[#475569] leading-relaxed font-medium"><span className="font-bold" style={{ color: email.color || "#64748B" }}>JARVIS Scan:</span> {email.summary}</p>
                    </div>
                  )}

                  {selEmail === email.id && email.preview && (
                    <div className="mt-4 pt-4 border-t border-[#F1F5F9] animate-fade-in">
                      <p className="text-xs text-[#64748B] leading-relaxed mb-4 p-3 bg-white rounded-xl border border-[#F1F5F9]">{email.preview}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <div className="p-5 rounded-[20px] border border-[#E2E8F0] bg-white shadow-sm">
              <h3 className="text-xs font-bold text-[#0F172A] mb-4 uppercase tracking-wider">Monitored Inboxes</h3>
              <div className="space-y-2.5">
                {["Dev","College","Personal"].map((acc) => {
                  const count  = emails.filter((e) => e.account === acc).length;
                  const unread = emails.filter((e) => e.account === acc && !e.read).length;
                  return (
                    <div key={acc} className="flex items-center justify-between p-3 rounded-xl border border-[#F1F5F9] bg-[#F8FAFC]">
                      <div className="flex items-center gap-2.5">
                        <Mail size={14} className="text-[#64748B]" />
                        <span className="text-xs font-bold text-[#475569]">{acc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {unread > 0 && <span className="px-1.5 py-0.5 rounded flex items-center justify-center font-bold text-[9px] shadow-sm" style={{ backgroundColor: "#7C3AED", color: "#FFF" }}>{unread} unread</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}