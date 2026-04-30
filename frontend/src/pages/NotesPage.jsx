import { useState, useRef } from "react";
import {
  BookOpen, Plus, Search, Trash2, Edit3,
  Save, Star, Hash, Clock, FileText,
  Bold, Italic, Code, List, Eye,
  ChevronRight, FolderOpen,
} from "lucide-react";
import clsx     from "clsx";
import { format } from "date-fns";

const INITIAL_NOTES = [
  
];

const FOLDERS = [];

/* ── Minimal markdown renderer ───────────────────────────────────── */
function renderMarkdown(content) {
  return content
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:20px;font-weight:700;color:#E6EDF3;margin:16px 0 8px">\$1</h1>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:16px;font-weight:600;color:#E6EDF3;margin:14px 0 6px">\$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;color:#C9D1D9;margin:12px 0 4px">\$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#E6EDF3">\$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em style="color:#C9D1D9">\$1</em>')
    .replace(/`([^`\n]+)`/g,   '<code style="background:#1C2333;border:1px solid #30363D;border-radius:4px;padding:1px 6px;font-family:JetBrains Mono,monospace;font-size:12px;color:#79C0FF">\$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre style="background:#010409;border:1px solid #30363D;border-radius:8px;padding:14px;overflow-x:auto;font-family:JetBrains Mono,monospace;font-size:12px;color:#C9D1D9;margin:10px 0">\$1</pre>')
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row.split("|").filter(Boolean).map((c) => c.trim());
      return `<div style="display:flex;gap:0;border-bottom:1px solid #21262D">${cells.map((c) => `<div style="flex:1;padding:6px 10px;font-size:12px;color:#C9D1D9;border-right:1px solid #21262D">${c}</div>`).join("")}</div>`;
    })
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #2F81F7;margin:8px 0;padding:4px 12px;color:#8B949E;font-style:italic">\$1</blockquote>')
    .replace(/^- $$ $$ (.+)$/gm, '<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="color:#484F58;font-size:14px">○</span><span style="color:#C9D1D9;font-size:13px">\$1</span></div>')
    .replace(/^- $$x$$ (.+)$/gm,'<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="color:#3FB950;font-size:14px">✓</span><span style="color:#8B949E;font-size:13px;text-decoration:line-through">\$1</span></div>')
    .replace(/^- (.+)$/gm,      '<div style="display:flex;align-items:flex-start;gap:8px;margin:3px 0"><span style="color:#484F58;margin-top:2px">•</span><span style="color:#C9D1D9;font-size:13px">\$1</span></div>')
    .replace(/^\d+\. (.+)$/gm,  '<div style="color:#C9D1D9;font-size:13px;margin:3px 0;padding-left:16px">\$1</div>')
    .replace(/\n/g, '<br/>');
}

export default function NotesPage() {
  const [notes,    setNotes]    = useState(INITIAL_NOTES);
  const [selected, setSelected] = useState("n1");
  const [folder,   setFolder]   = useState("All Notes");
  const [search,   setSearch]   = useState("");
  const [editing,  setEditing]  = useState(false);
  const [preview,  setPreview]  = useState(true);
  const editorRef = useRef(null);

  const note = notes.find((n) => n.id === selected);

  const filtered = notes.filter((n) => {
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.includes(search.toLowerCase()));
    const matchFolder =
      folder === "All Notes" ? true :
      folder === "Starred"   ? n.starred :
      n.folder === folder;
    return matchSearch && matchFolder;
  });

  const updateNote = (field, value) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selected
          ? { ...n, [field]: value, modified: format(new Date(), "yyyy-MM-dd") }
          : n
      )
    );
  };

  const createNote = () => {
    const id = `n${Date.now()}`;
    const newNote = {
      id,
      title:    "Untitled Note",
      content:  "# Untitled Note\n\nStart writing...",
      tags:     [],
      starred:  false,
      folder:   folder === "All Notes" || folder === "Starred" ? "General" : folder,
      created:  format(new Date(), "yyyy-MM-dd"),
      modified: format(new Date(), "yyyy-MM-dd"),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelected(id);
    setEditing(true);
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selected === id) setSelected(filtered.find((n) => n.id !== id)?.id || null);
  };

  const toggleStar = (id) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, starred: !n.starred } : n));
  };

  /* Toolbar helpers */
  const insertMd = (before, after = "") => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = el.value.substring(start, end);
    const value = el.value.substring(0, start) + before + sel + after + el.value.substring(end);
    updateNote("content", value);
    setTimeout(() => {
      el.selectionStart = start + before.length;
      el.selectionEnd   = start + before.length + sel.length;
      el.focus();
    }, 0);
  };

  const TOOLBAR = [
    { label: "B",  title: "Bold",         action: () => insertMd("**", "**") },
    { label: "I",  title: "Italic",       action: () => insertMd("*",  "*")  },
    { label: "</>",title: "Inline Code",  action: () => insertMd("`",  "`")  },
    { label: "H1", title: "Heading 1",    action: () => insertMd("# ")       },
    { label: "H2", title: "Heading 2",    action: () => insertMd("## ")      },
    { label: "—",  title: "Divider",      action: () => insertMd("\n---\n")  },
    { label: "[]", title: "Checkbox",     action: () => insertMd("- [ ] ")   },
    { label: "•",  title: "List item",    action: () => insertMd("- ")       },
  ];

  return (
    <div className="flex h-full gap-0 animate-fade-in rounded-xl overflow-hidden border border-border"
         style={{ minHeight: "calc(100vh - 140px)", background: "#161B22" }}>

      {/* ── Sidebar: folders ──────────────────────────────────── */}
      <div className="w-44 flex-shrink-0 border-r border-border flex flex-col"
           style={{ background: "#0D1117" }}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-accent-hover" />
            <span className="text-sm font-bold text-primary">Notes</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {FOLDERS.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded text-xs font-medium transition-all flex items-center gap-2",
                folder === f
                  ? "bg-accent-subtle text-accent-hover"
                  : "text-muted hover:text-secondary hover:bg-surface"
              )}
            >
              {f === "Starred"
                ? <Star size={12} className={folder === f ? "text-warning fill-warning" : "text-muted"} />
                : <FolderOpen size={12} />
              }
              {f}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          <button onClick={createNote} className="btn btn-blue btn-sm w-full gap-1.5">
            <Plus size={12} /> New Note
          </button>
        </div>
      </div>

      {/* ── Note list ─────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-r border-border flex flex-col"
           style={{ background: "#161B22" }}>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="nx-input pl-8 text-xs"
              style={{ minHeight: 30 }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted">No notes found</div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => { setSelected(n.id); setEditing(false); }}
                className={clsx(
                  "p-3 border-b border-border-subtle cursor-pointer transition-colors group",
                  selected === n.id
                    ? "bg-accent-subtle border-l-2 border-l-accent"
                    : "hover:bg-surface border-l-2 border-l-transparent"
                )}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className={clsx(
                    "text-xs font-semibold truncate flex-1",
                    selected === n.id ? "text-primary" : "text-secondary"
                  )}>
                    {n.title}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(n.id); }}
                    className="flex-shrink-0"
                  >
                    <Star
                      size={11}
                      className={n.starred ? "text-warning fill-warning" : "text-muted opacity-0 group-hover:opacity-100"}
                    />
                  </button>
                </div>
                <p className="text-2xs text-muted line-clamp-2 leading-relaxed mb-1.5">
                  {n.content.replace(/[#*`]/g, "").substring(0, 80)}...
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {n.tags.slice(0,2).map((t) => (
                      <span key={t} className="badge badge-gray text-2xs">#{t}</span>
                    ))}
                  </div>
                  <span className="text-2xs text-muted flex-shrink-0">
                    {format(new Date(n.modified), "MMM d")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Editor / Preview ──────────────────────────────────── */}
      {note ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Note toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0"
               style={{ background: "#161B22" }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {editing ? (
                <input
                  value={note.title}
                  onChange={(e) => updateNote("title", e.target.value)}
                  className="flex-1 bg-transparent text-md font-bold text-primary
                             outline-none border-b border-transparent focus:border-accent
                             transition-colors min-w-0"
                />
              ) : (
                <h2 className="text-md font-bold text-primary truncate">{note.title}</h2>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <span className="text-2xs text-muted hidden sm:block">
                Modified {format(new Date(note.modified), "MMM d, yyyy")}
              </span>

              {/* View toggle */}
              <div className="flex items-center bg-surface border border-border rounded p-0.5">
                <button
                  onClick={() => setPreview(false)}
                  className={clsx(
                    "px-2 py-1 rounded text-2xs font-medium transition-all",
                    !preview ? "bg-raised text-primary" : "text-muted hover:text-secondary"
                  )}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreview(true)}
                  className={clsx(
                    "px-2 py-1 rounded text-2xs font-medium transition-all",
                    preview ? "bg-raised text-primary" : "text-muted hover:text-secondary"
                  )}
                >
                  Preview
                </button>
              </div>

              {editing ? (
                <button
                  onClick={() => setEditing(false)}
                  className="btn btn-blue btn-sm gap-1.5"
                >
                  <Save size={12} /> Save
                </button>
              ) : (
                <button
                  onClick={() => { setEditing(true); setPreview(false); }}
                  className="btn btn-default btn-sm gap-1.5"
                >
                  <Edit3 size={12} /> Edit
                </button>
              )}

              <button
                onClick={() => deleteNote(note.id)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <Trash2 size={13} className="text-danger" />
              </button>
            </div>
          </div>

          {/* Markdown toolbar (when editing) */}
          {editing && !preview && (
            <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border flex-shrink-0"
                 style={{ background: "#0D1117" }}>
              {TOOLBAR.map(({ label, title, action }) => (
                <button
                  key={title}
                  title={title}
                  onClick={action}
                  className="px-2 py-1 rounded text-xs font-mono text-muted
                             hover:text-primary hover:bg-surface transition-all"
                >
                  {label}
                </button>
              ))}
              <div className="flex gap-1 ml-auto flex-wrap">
                {note.tags.map((tag) => (
                  <span key={tag} className="badge badge-gray text-2xs">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-hidden" style={{ background: "#0D1117" }}>
            {!preview ? (
              <textarea
                ref={editorRef}
                value={note.content}
                onChange={(e) => updateNote("content", e.target.value)}
                spellCheck={false}
                className="w-full h-full p-6 bg-transparent text-primary font-mono
                           text-sm resize-none outline-none leading-relaxed"
                placeholder="Start writing in Markdown..."
              />
            ) : (
              <div
                className="h-full overflow-y-auto p-6 markdown-body leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
              />
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-border
                          text-2xs text-muted flex-shrink-0"
               style={{ background: "#161B22" }}>
            <div className="flex items-center gap-3">
              <span>{note.content.split(/\s+/).filter(Boolean).length} words</span>
              <span>{note.content.length} chars</span>
              <span className="flex items-center gap-1">
                <Hash size={9} /> {note.folder}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Clock size={9} /> {format(new Date(note.created), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen size={32} className="text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">Select a note to view</p>
            <button onClick={createNote} className="btn btn-blue btn-sm mt-3 gap-1.5">
              <Plus size={12} /> New Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}