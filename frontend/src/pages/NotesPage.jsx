import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase"; 
import {
  BookOpen, Plus, Search, Trash2, Edit3,
  Save, Star, Clock, FileText,
  Bold, Italic, Code, List,
  FolderOpen, Maximize, Minimize,
  Download, Link2, Quote, CheckSquare
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

const FOLDERS = ["All Notes", "Starred", "General", "Projects", "Ideas"];

/* ── Light Theme Markdown Renderer ───────────────────────────────────── */
function renderMarkdown(content) {
  if (!content) return "";
  return content
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:26px;font-weight:800;color:#0F172A;margin:24px 0 12px;border-bottom:1px solid #F1F5F9;padding-bottom:8px;letter-spacing:-0.5px">$1</h1>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:20px;font-weight:700;color:#0F172A;margin:20px 0 10px;letter-spacing:-0.3px">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:700;color:#475569;margin:16px 0 8px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0F172A;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em style="color:#64748B;font-style:italic">$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:#7C3AED;text-decoration:none;font-weight:600;border-bottom:1px solid rgba(124,58,237,0.3)">$1</a>')
    .replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;overflow-x:auto;font-family:\'JetBrains Mono\',monospace;font-size:13px;color:#475569;margin:16px 0;line-height:1.6">$1</pre>')
    .replace(/\`([^\`\n]+)\`/g,   '<code style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;padding:2px 6px;font-family:\'JetBrains Mono\',monospace;font-size:12.5px;color:#7C3AED;font-weight:600">$1</code>')
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row.split("|").filter(Boolean).map((c) => c.trim());
      return `<div style="display:flex;gap:0;border-bottom:1px solid #E2E8F0">${cells.map((c) => `<div style="flex:1;padding:10px 16px;font-size:14px;color:#475569;border-right:1px solid #E2E8F0">${c}</div>`).join("")}</div>`;
    })
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:4px solid #7C3AED;margin:16px 0;padding:8px 20px;color:#64748B;font-style:italic;background:rgba(124,58,237,0.05);border-radius:0 8px 8px 0;font-size:15px">$1</blockquote>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><div style="width:16px;height:16px;border:2px solid #CBD5E1;border-radius:4px"></div><span style="color:#475569;font-size:15px">$1</span></div>')
    .replace(/^- \[x\] (.+)$/gm,'<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><div style="width:16px;height:16px;background:#10B981;border:2px solid #10B981;border-radius:4px;display:flex;align-items:center;justify-content:center"><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div><span style="color:#94A3B8;font-size:15px;text-decoration:line-through;font-weight:500">$1</span></div>')
    .replace(/^- (.+)$/gm,      '<div style="display:flex;align-items:flex-start;gap:10px;margin:6px 0"><span style="color:#7C3AED;margin-top:4px;font-size:18px;line-height:0.8">•</span><span style="color:#475569;font-size:15px;line-height:1.6">$1</span></div>')
    .replace(/^(\d+\.) (.+)$/gm,  '<div style="display:flex;align-items:flex-start;gap:10px;margin:6px 0"><span style="color:#64748B;font-weight:700;min-width:20px">$1</span><span style="color:#475569;font-size:15px;line-height:1.6">$2</span></div>')
    .replace(/\n/g, '<br/>');
}

export default function NotesPage() {
  const [notes,    setNotes]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [folder,   setFolder]   = useState("All Notes");
  const [search,   setSearch]   = useState("");
  const [editing,  setEditing]  = useState(false);
  const [preview,  setPreview]  = useState(true);
  
  // Features State
  const [zenMode,  setZenMode]  = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const editorRef = useRef(null);

  // Fetch Notes on Load (FIXED: Removed auto-select so the empty state shows by default)
  useEffect(() => {
    const fetchNotes = async () => {
      const { data, error } = await supabase.from('notes').select('*').order('modified', { ascending: false });
      if (data) { 
        setNotes(data); 
      }
    };
    fetchNotes();
  }, []);

  const note = notes.find((n) => n.id === selected);

  const filtered = notes.filter((n) => {
    const matchSearch = n.title?.toLowerCase().includes(search.toLowerCase()) || (n.content && n.content.toLowerCase().includes(search.toLowerCase()));
    const matchFolder = folder === "All Notes" ? true : folder === "Starred" ? n.starred : n.folder === folder;
    return matchSearch && matchFolder;
  });

  const updateNoteLocal = (field, value) => {
    setNotes(prev => prev.map(n => n.id === selected ? { ...n, [field]: value, modified: format(new Date(), "yyyy-MM-dd") } : n));
  };

  const saveNote = async () => {
    const noteToSave = notes.find((n) => n.id === selected);
    if (!noteToSave) return;
    
    setIsSaving(true);
    await supabase.from('notes').update({ 
      title: noteToSave.title, 
      content: noteToSave.content, 
      modified: format(new Date(), "yyyy-MM-dd") 
    }).eq('id', selected);
    
    setTimeout(() => {
      setIsSaving(false);
      setEditing(false);
    }, 400); 
  };

  const createNote = async () => {
    const newNote = { 
      title: "Untitled Note", 
      content: "# Untitled Note\n\nStart writing...", 
      tags: [], 
      starred: false, 
      folder: folder === "All Notes" || folder === "Starred" ? "General" : folder, 
      created: format(new Date(), "yyyy-MM-dd"), 
      modified: format(new Date(), "yyyy-MM-dd") 
    };
    
    const tempId = `temp-${Date.now()}`;
    setNotes(prev => [{ id: tempId, ...newNote }, ...prev]);
    setSelected(tempId); setEditing(true); setPreview(false); setZenMode(false);

    const { data, error } = await supabase.from('notes').insert([newNote]).select();
    if (data) { 
      setNotes(prev => prev.map(n => n.id === tempId ? data[0] : n)); 
      setSelected(data[0].id); 
    }
  };

  const deleteNote = async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selected === id) { 
      setSelected(null); // Show empty state when deleting the active note
    }
    await supabase.from('notes').delete().eq('id', id);
  };

  const toggleStar = async (id) => {
    const targetNote = notes.find((n) => n.id === id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, starred: !n.starred } : n));
    await supabase.from('notes').update({ starred: !targetNote.starred }).eq('id', id);
  };

  // Export Local File
  const exportLocal = () => {
    if (!note) return;
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'Untitled').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* Toolbar helpers */
  const insertMd = (before, after = "") => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd, sel = el.value.substring(start, end);
    const value = el.value.substring(0, start) + before + sel + after + el.value.substring(end);
    updateNoteLocal("content", value);
    setTimeout(() => { 
      el.selectionStart = start + before.length; 
      el.selectionEnd = start + before.length + sel.length; 
      el.focus(); 
    }, 0);
  };

  const TOOLBAR = [
    { icon: <Bold size={14}/>, title: "Bold",         action: () => insertMd("**", "**") },
    { icon: <Italic size={14}/>, title: "Italic",       action: () => insertMd("*", "*") },
    { icon: <Code size={14}/>, title: "Code",         action: () => insertMd("`", "`") },
    { icon: <Link2 size={14}/>, title: "Link",         action: () => insertMd("[", "](https://)") },
    { icon: <Quote size={14}/>, title: "Quote",        action: () => insertMd("\n> ") },
    { icon: <CheckSquare size={14}/>, title: "Task List", action: () => insertMd("\n- [ ] ") },
    { icon: <List size={14}/>, title: "List",         action: () => insertMd("\n- ") },
  ];

  const wordCount = (note?.content || "").split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200)); 

  return (
    <div className="flex flex-col h-full animate-fade-in" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", paddingTop: "10px", paddingBottom: "40px" }}>
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-1">Notes & Docs</h1>
          <p className="text-sm text-[#64748B] font-medium">{notes.length} total documents</p>
        </div>
      </div>

      {/* ── Dynamic Layout (FIXED ZEN MODE GRID) ── */}
      <div className={clsx(
        "flex-1 grid bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300",
        zenMode ? "grid-cols-1" : "grid-cols-[240px_320px_1fr]"
      )}>
        
        {/* COLUMN 1: Folders */}
        {!zenMode && (
          <div className="border-r border-[#F1F5F9] bg-[#F8FAFC] flex flex-col transition-all duration-300">
            <div className="p-5 border-b border-[#F1F5F9] flex-shrink-0">
              <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Directories</h2>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {FOLDERS.map((f) => {
                const count = notes.filter(n => f === "All Notes" ? true : f === "Starred" ? n.starred : n.folder === f).length;
                return (
                  <button 
                    key={f} 
                    onClick={() => { setFolder(f); setSelected(null); }} 
                    className={clsx(
                      "w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3", 
                      folder === f ? "bg-[#7C3AED] text-white shadow-md" : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                    )}
                  >
                    {f === "Starred" ? <Star size={16} className={folder === f ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#94A3B8]"} /> : <FolderOpen size={16} />}
                    <span className="flex-1">{f}</span>
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-md", folder === f ? "bg-white/20 text-white" : "bg-white border border-[#E2E8F0] text-[#94A3B8]")}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </nav>
            <div className="p-4 border-t border-[#F1F5F9]">
              <button onClick={createNote} className="w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#0F172A", color: "#FFF", boxShadow: "0 4px 15px rgba(15,23,42,0.2)" }}>
                <Plus size={16} /> New Note
              </button>
            </div>
          </div>
        )}

        {/* COLUMN 2: Note List */}
        {!zenMode && (
          <div className="border-r border-[#F1F5F9] bg-white flex flex-col transition-all duration-300">
            <div className="p-4 border-b border-[#F1F5F9] flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm font-medium text-[#94A3B8]">No notes found in '{folder}'</div>
              ) : filtered.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => { setSelected(n.id); setEditing(false); }} 
                  className={clsx(
                    "p-5 cursor-pointer transition-all border-l-4", 
                    selected === n.id ? "bg-[#F3E8FF] border-l-[#7C3AED]" : "hover:bg-[#F8FAFC] border-l-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={clsx("text-sm font-bold truncate flex-1", selected === n.id ? "text-[#7C3AED]" : "text-[#0F172A]")}>{n.title || "Untitled Note"}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleStar(n.id); }} className="flex-shrink-0 p-1">
                      <Star size={14} className={n.starred ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#CBD5E1] hover:text-[#F59E0B] transition-colors"} />
                    </button>
                  </div>
                  <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed mb-3">{(n.content || "").replace(/[#*\`]/g, "").substring(0, 100)}...</p>
                  <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    {n.modified ? format(new Date(n.modified), "MMM d, yyyy") : "Just now"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COLUMN 3: Editor */}
        <div className="bg-white flex flex-col min-w-0 transition-all duration-300">
          {note ? (
            <>
              {/* Top Meta Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-white flex-shrink-0">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button onClick={() => setZenMode(!zenMode)} className="p-2 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors" title={zenMode ? "Exit Zen Mode" : "Zen Mode"}>
                    {zenMode ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                  <div className="w-px h-6 bg-[#E2E8F0]" />
                  <div className="flex items-center bg-[#F1F5F9] rounded-lg p-1">
                    <button onClick={() => setPreview(false)} className={clsx("px-4 py-1.5 rounded-md text-xs font-bold transition-all", !preview ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]")}>Edit</button>
                    <button onClick={() => setPreview(true)} className={clsx("px-4 py-1.5 rounded-md text-xs font-bold transition-all", preview ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]")}>Preview</button>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={exportLocal} className="p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors" title="Download Local Markdown"><Download size={16} /></button>
                  <div className="w-px h-6 bg-[#E2E8F0]" />
                  <button onClick={() => deleteNote(note.id)} className="p-2 rounded-lg text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#EF4444] transition-colors" title="Delete Note"><Trash2 size={16} /></button>
                  {editing ? (
                    <button onClick={saveNote} disabled={isSaving} className="px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(124,58,237,0.3)]" style={{ backgroundColor: "#7C3AED" }}>
                      <Save size={14} /> {isSaving ? "Saving..." : "Save Now"}
                    </button>
                  ) : (
                    <button onClick={() => { setEditing(true); setPreview(false); }} className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5 border border-[#E2E8F0] shadow-sm" style={{ backgroundColor: "#FFFFFF", color: "#0F172A" }}>
                      <Edit3 size={14} /> Edit Note
                    </button>
                  )}
                </div>
              </div>

              {/* Formatting Toolbar */}
              {editing && !preview && (
                <div className="flex items-center gap-1.5 px-6 py-2 border-b border-[#F1F5F9] bg-[#F8FAFC] flex-shrink-0">
                  {TOOLBAR.map(({ icon, title, action }) => (
                    <button key={title} title={title} onClick={action} className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors flex items-center justify-center">
                      {icon}
                    </button>
                  ))}
                  <div className="ml-auto text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Markdown Supported</div>
                </div>
              )}

              {/* Editing Area */}
              <div className="flex-1 overflow-hidden flex justify-center bg-white">
                <div className="w-full h-full transition-all duration-300 max-w-4xl">
                  {!preview ? (
                    <div className="flex flex-col h-full p-8">
                      <input 
                        value={note.title} 
                        onChange={(e) => updateNoteLocal("title", e.target.value)} 
                        className="w-full bg-transparent text-3xl font-extrabold text-[#0F172A] outline-none border-b-2 border-transparent focus:border-[#F1F5F9] transition-colors mb-6 pb-2 tracking-tight placeholder-[#CBD5E1]" 
                        placeholder="Note Title" 
                      />
                      <textarea 
                        ref={editorRef} 
                        value={note.content || ""} 
                        onChange={(e) => updateNoteLocal("content", e.target.value)} 
                        spellCheck={false} 
                        className="w-full flex-1 bg-transparent text-[#475569] font-mono text-[14px] resize-none outline-none leading-relaxed custom-scrollbar placeholder-[#CBD5E1]" 
                        placeholder="Start typing your ideas..." 
                      />
                    </div>
                  ) : (
                    <div 
                      className="h-full overflow-y-auto p-10 custom-scrollbar text-[#475569] text-[15px] leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }} 
                    />
                  )}
                </div>
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-[#F1F5F9] bg-[#F8FAFC] flex-shrink-0 text-xs font-semibold text-[#64748B]">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2"><FileText size={14} className="text-[#94A3B8]"/> {wordCount} words</span>
                  <span className="flex items-center gap-2"><Clock size={14} className="text-[#94A3B8]"/> {readTime} min read</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2"><FolderOpen size={14} className="text-[#94A3B8]" /> {note.folder}</span>
                  <span className="text-[#94A3B8]">Last modified: {note.modified ? format(new Date(note.modified), "MMMM d, yyyy") : "Just now"}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFC]">
              <div className="w-20 h-20 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm flex items-center justify-center mb-6">
                <BookOpen size={32} className="text-[#94A3B8]" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">No Note Selected</h3>
              <p className="text-sm text-[#64748B] mb-8 max-w-sm leading-relaxed">Select a note from the sidebar directory, or create a fresh one to start capturing your thoughts.</p>
              <button onClick={createNote} className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(124,58,237,0.3)]" style={{ backgroundColor: "#7C3AED", color: "#FFF" }}>
                <Plus size={16} /> Create New Note
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}