import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useDropzone } from "react-dropzone";
import {
  FolderOpen, Folder, Upload, File, FileCode, FileImage, FileText, 
  Trash2, Search, Grid, List, Plus, ChevronRight, ChevronDown,
  Star, Download, Link2, Code2, PenSquare, Terminal, Copy, Check
} from "lucide-react";
import Modal from "@/components/shared/Modal";
import clsx from "clsx";
import { format } from "date-fns";

/* ── Light Theme Markdown Parser for README.md ──────────────────── */
function renderMarkdown(content) {
  if (!content) return "";
  return content
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:24px;font-weight:800;color:#0F172A;margin:16px 0 8px;border-bottom:1px solid #F1F5F9;padding-bottom:8px;letter-spacing:-0.5px">$1</h1>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:18px;font-weight:700;color:#0F172A;margin:14px 0 8px;letter-spacing:-0.3px">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#475569;margin:12px 0 6px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0F172A;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em style="color:#64748B;font-style:italic">$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:#7C3AED;text-decoration:none;font-weight:600;border-bottom:1px solid rgba(124,58,237,0.3)">$1</a>')
    .replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;overflow-x:auto;font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#475569;margin:16px 0;line-height:1.5">$1</pre>')
    .replace(/\`([^\`\n]+)\`/g,   '<code style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;padding:2px 6px;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;color:#7C3AED;font-weight:600">$1</code>')
    .replace(/^- (.+)$/gm,      '<div style="display:flex;align-items:flex-start;gap:8px;margin:4px 0"><span style="color:#7C3AED;margin-top:2px;font-size:16px;line-height:0.8">•</span><span style="color:#475569;font-size:13px;line-height:1.5">$1</span></div>')
    .replace(/\n/g, '<br/>');
}

/* ── Phase 3: Syntax Highlighter & CLI Generator ────────────────── */
function highlightCode(code) {
  if (!code) return "";
  return code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(\/\/.*|\#.*)/g, '<span style="color: #94A3B8; font-style: italic;">$1</span>')
    .replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span style="color: #10B981">$&</span>')
    .replace(/\b(import|from|export|default|const|let|var|function|async|await|return|if|else|for|while|class|new|try|catch|def|print|console)\b/g, '<span style="color: #7C3AED; font-weight: bold;">$1</span>')
    .replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span style="color: #3B82F6; font-weight: 600;">$1</span>')
    .replace(/\b(\d+)\b/g, '<span style="color: #F59E0B">$1</span>');
}

function getRunCommand(file) {
  if (!file) return "";
  const ext = file.name.split('.').pop().toLowerCase();
  const path = file.filePath || file.name;
  if (ext === 'py') return `python ${path}`;
  if (ext === 'js') return `node ${path}`;
  if (ext === 'cpp') return `g++ ${path} -o output && ./output`;
  if (ext === 'c') return `gcc ${path} -o output && ./output`;
  if (ext === 'sh') return `bash ${path}`;
  if (ext === 'html') return `open ${path}`;
  return `cat ${path}`;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function FileIcon({ name, size = 16 }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","svg","webp"].includes(ext)) return <FileImage size={size} className="text-[#22D3EE]" />;
  if (["js","jsx","ts","tsx","py","cpp","c","h","ino","json","yaml","yml","env"].includes(ext)) return <FileCode size={size} className="text-[#F59E0B]" />;
  if (["pdf","doc","docx","txt","md"].includes(ext)) return <FileText size={size} className="text-[#7C3AED]" />;
  return <File size={size} className="text-[#94A3B8]" />;
}

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFileTree(files) {
  const root = { name: "root", type: "folder", path: "/", children: [] };
  files.forEach(file => {
    const pathString = file.filePath || file.name; 
    const parts = pathString.split("/").filter(Boolean);
    let current = root;
    let currentPath = "";
    parts.forEach((part, i) => {
      currentPath += `/${part}`;
      if (i === parts.length - 1) {
        current.children.push({ ...file, name: part, type: "file" });
      } else {
        let folder = current.children.find(c => c.name === part && c.type === "folder");
        if (!folder) {
          folder = { name: part, type: "folder", path: currentPath, children: [] };
          current.children.push(folder);
        }
        current = folder;
      }
    });
  });
  return root;
}

function FileTreeNode({ node, level = 0, onContextMenu, onSelect, selectedId }) {
  const [isOpen, setIsOpen] = useState(level < 1);
  if (node.type === "file") {
    return (
      <div onContextMenu={(e) => onContextMenu(e, node)} onClick={() => onSelect(node)} className={clsx("flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group text-[13px] font-medium", selectedId === node.id ? "bg-[#F3E8FF] text-[#7C3AED]" : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]")} style={{ paddingLeft: `${(level * 12) + 8}px` }}>
        <FileIcon name={node.name} size={14} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }
  return (
    <div>
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer text-[#0F172A] hover:bg-[#F1F5F9] transition-colors text-[13px] font-bold" style={{ paddingLeft: `${(level * 12) + 8}px` }}>
        {isOpen ? <ChevronDown size={14} className="text-[#94A3B8]"/> : <ChevronRight size={14} className="text-[#94A3B8]"/>}
        {isOpen ? <FolderOpen size={14} className="text-[#7C3AED]"/> : <Folder size={14} className="text-[#7C3AED]"/>}
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && node.children.map((child, i) => (
        <FileTreeNode key={i} node={child} level={level + 1} onContextMenu={onContextMenu} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}

function UploadZone({ onFiles }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onFiles, multiple: true });
  return (
    <div {...getRootProps()} className={clsx("border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all", isDragActive ? "border-[#7C3AED] bg-[#F3E8FF]" : "border-[#E2E8F0] hover:border-[#7C3AED] hover:bg-[#F8FAFC]")}>
      <input {...getInputProps()} webkitdirectory="true" />
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: isDragActive ? "#7C3AED" : "#F1F5F9", color: isDragActive ? "#FFF" : "#94A3B8", transition: "all 0.2s" }}>
        <Upload size={20} />
      </div>
      <p className="text-sm font-bold text-[#0F172A] mb-1">{isDragActive ? "Drop to preserve structure..." : "Drag & drop folders or files here"}</p>
      <p className="text-[11px] font-medium text-[#64748B] mb-4">Folder structures are automatically preserved.</p>
      <button className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center mx-auto gap-2 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.2)" }}>
        <Upload size={14} /> Browse System
      </button>
    </div>
  );
}

export default function ProjectVault() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  
  // Modals & Menus
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  
  // Phase 3: Copy States
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const [newProj, setNewProj] = useState({ name: "", description: "", category: "Software", color: "#7C3AED" });
  const [editProj, setEditProj] = useState(null);

  const [fileContent, setFileContent] = useState("");
  const [readmeContent, setReadmeContent] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from('projects').select('*');
      if (data) setProjects(data.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0)));
      if (error) console.error("Error fetching projects:", error);
    };
    fetchProjects();

    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  const activeProject = selected ? projects.find((p) => p.id === selected) : null;
  const fileTree = activeProject ? buildFileTree(activeProject.files || []) : null;

  /* ── Fetch File Contents & README ── */
  useEffect(() => {
    const fetchFile = async () => {
      if (selectedFile && selectedFile.url && !selectedFile.name.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i)) {
        setFileContent("Loading code viewer...");
        try {
          const res = await fetch(selectedFile.url);
          const text = await res.text();
          setFileContent(text);
        } catch (e) { setFileContent("Failed to load file contents."); }
      } else {
        setFileContent("");
      }
    };
    fetchFile();
  }, [selectedFile]);

  useEffect(() => {
    const fetchReadme = async () => {
      if (activeProject && !selectedFile) {
        const readmeFile = (activeProject.files || []).find(f => f.name.toLowerCase() === 'readme.md');
        if (readmeFile && readmeFile.url) {
          try {
            const res = await fetch(readmeFile.url);
            const text = await res.text();
            setReadmeContent(text);
          } catch(e) { setReadmeContent(""); }
        } else {
          setReadmeContent("");
        }
      }
    };
    fetchReadme();
  }, [activeProject, selectedFile]);

  /* ── Copy Actions ── */
  const handleCopyCode = () => {
    navigator.clipboard.writeText(fileContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(getRunCommand(selectedFile));
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  /* ── Right Click Context Menu Logic ── */
  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, file });
  };

  const copyLink = () => {
    if (contextMenu?.file?.url) navigator.clipboard.writeText(contextMenu.file.url);
  };

  /* ── File Management ── */
  const handleDrop = useCallback((files) => {
    const cleanFiles = files.filter((f) => {
      const path = f.path || f.webkitRelativePath || f.name;
      return !path.includes('/node_modules/') && !path.includes('/.git/') && !path.includes('/.next/') && !path.includes('/dist/') && !path.includes('/build/');
    });
    setUploadFiles(cleanFiles.map((f) => ({ 
      id: Date.now() + Math.random(), name: f.name, size: f.size, type: "file", 
      filePath: f.path || f.webkitRelativePath || f.name, modified: format(new Date(), "yyyy-MM-dd"), originalFile: f 
    })));
    setShowUpload(true);
  }, []);

  const handleUploadConfirm = async () => {
    if (!selected) return;
    setIsUploading(true);
    setUploadProgress({ current: 0, total: uploadFiles.length });
    const successfullyUploaded = [];

    const BATCH_SIZE = 2; 
    for (let i = 0; i < uploadFiles.length; i += BATCH_SIZE) {
      const batch = uploadFiles.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (file) => {
        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const pathPrefix = file.filePath.split('/').slice(0, -1).join('/'); 
          const safePathPrefix = pathPrefix.startsWith('/') ? pathPrefix.slice(1) : pathPrefix;
          const cloudPath = `projects/${selected}/${safePathPrefix ? safePathPrefix + '/' : ''}${Date.now()}_${cleanName}`.replace(/\/\//g, '/');
          
          const { error } = await supabase.storage.from('jarvis-vault').upload(cloudPath, file.originalFile, { upsert: true });
          if (error) return null; 
          
          const { data: { publicUrl } } = supabase.storage.from('jarvis-vault').getPublicUrl(cloudPath);
          return { id: Date.now() + Math.random(), name: file.name, filePath: file.filePath, size: file.size, type: "file", modified: format(new Date(), "yyyy-MM-dd"), url: publicUrl };
        } catch (error) { return null; }
      });
      const results = await Promise.all(batchPromises);
      successfullyUploaded.push(...results.filter(r => r !== null));
      setUploadProgress({ current: Math.min(i + BATCH_SIZE, uploadFiles.length), total: uploadFiles.length });
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    if (successfullyUploaded.length > 0) {
      const updatedFiles = [...(activeProject.files || []), ...successfullyUploaded];
      setProjects(prev => prev.map(p => p.id === selected ? { ...p, files: updatedFiles, fileCount: (p.fileCount || 0) + successfullyUploaded.length } : p));
      await supabase.from('projects').update({ files: updatedFiles, fileCount: (activeProject.fileCount || 0) + successfullyUploaded.length }).eq('id', selected);
    }
    
    setUploadFiles([]); setShowUpload(false); setIsUploading(false); setUploadProgress({ current: 0, total: 0 });
  };

  const deleteFile = async (fileId) => {
    const updatedFiles = (activeProject.files || []).filter(f => f.id !== fileId);
    setProjects(prev => prev.map(p => p.id === selected ? { ...p, files: updatedFiles, fileCount: p.fileCount - 1 } : p));
    await supabase.from('projects').update({ files: updatedFiles, fileCount: activeProject.fileCount - 1 }).eq('id', selected);
  };

  /* ── Project Edit & Delete ── */
  const createProject = async () => {
    if (!newProj.name.trim()) return;
    const projectData = { ...newProj, status: "planning", progress: 0, taskCount: 0, fileCount: 0, lastModified: format(new Date(), "yyyy-MM-dd"), starred: false, files: [] };
    const tempId = `temp-${Date.now()}`;
    setProjects(prev => [{ id: tempId, ...projectData }, ...prev]);
    setNewProj({ name: "", description: "", category: "Software", color: "#7C3AED" }); setShowNew(false);
    const { data } = await supabase.from('projects').insert([projectData]).select();
    if (data) setProjects(prev => prev.map(p => p.id === tempId ? data[0] : p));
  };

  const handleEditProject = async () => {
    if (!editProj.name.trim()) return;
    const { id, ...rest } = editProj;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...rest } : p));
    setShowEdit(false);
    await supabase.from('projects').update(rest).eq('id', id);
  };

  const handleDeleteProject = async () => {
    if(!window.confirm(`WARNING: Are you sure you want to delete "${activeProject.name}"? This will remove the repository from the vault.`)) return;
    const projId = activeProject.id;
    setProjects(prev => prev.filter(p => p.id !== projId));
    setSelected(null);
    await supabase.from('projects').delete().eq('id', projId);
  };

  const STATUS_COLORS = { active: "#10B981", planning: "#F59E0B", paused: "#94A3B8", done: "#3B82F6" };
  const COLORS = ["#7C3AED", "#22D3EE", "#10B981", "#F59E0B", "#F43F5E", "#3B82F6", "#0F172A"];
  const CATS   = ["Software","Embedded","AI/ML","Web","Mobile","Research","Other"];

  return (
    <div className="flex h-[calc(100vh-64px)] gap-6 animate-fade-in" style={{ backgroundColor: "#F8FAFC", padding: "16px 24px" }}>
      
      {/* ── Left Panel: Projects List OR VS Code File Explorer ── */}
      <div className={clsx("flex flex-col flex-shrink-0 transition-all h-full", activeProject ? "w-[280px]" : "w-full")}>
        
        {!activeProject ? (
          /* PROJECT LIST VIEW */
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-1">Project Vault</h1>
                <p className="text-sm text-[#64748B] font-medium">{projects.length} connected repositories</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl p-1 shadow-sm">
                  {[{id:"grid",icon:Grid},{id:"list",icon:List}].map(({id,icon:Icon}) => (
                    <button key={id} onClick={() => setView(id)} className={clsx("p-2 rounded-lg transition-all", view === id ? "bg-[#F1F5F9] text-[#0F172A]" : "text-[#94A3B8] hover:text-[#475569]")}><Icon size={16} /></button>
                  ))}
                </div>
                <button onClick={() => setShowNew(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}><Plus size={16} /> New Vault</button>
              </div>
            </div>

            <div className="relative mb-6">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search encrypted projects..." className="w-full bg-white border border-[#E2E8F0] rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] shadow-sm transition-all" />
            </div>

            {view === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-6">
                {filtered.map((p) => (
                  <div key={p.id} onClick={() => setSelected(p.id)} className="p-6 rounded-3xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg group relative overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                    <div className="absolute top-0 left-0 right-0 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: p.color }} />
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}15` }}>
                          <FolderOpen size={22} style={{ color: p.color }} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors">{p.name}</h3>
                          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">{p.category}</span>
                        </div>
                      </div>
                      {p.starred && <Star size={16} className="text-[#F59E0B] fill-[#F59E0B]" />}
                    </div>
                    <p className="text-sm text-[#475569] mb-5 line-clamp-2 leading-relaxed h-10">{p.description}</p>
                    <div className="mb-5">
                      <div className="flex justify-between text-xs font-bold text-[#64748B] mb-2">
                        <span className="uppercase tracking-wider">Progress</span>
                        <span style={{ color: p.color }}>{p.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-[#F1F5F9]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.progress}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#64748B] pt-4 border-t border-[#F1F5F9]">
                      <span className="flex items-center gap-1.5"><File size={14} className="text-[#94A3B8]" /> {p.fileCount || 0} files</span>
                      <span className="flex items-center gap-1.5" style={{ color: STATUS_COLORS[p.status] }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] }} />{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* VS CODE FILE EXPLORER VIEW */
          <div className="flex-1 rounded-[24px] overflow-hidden flex flex-col shadow-sm border border-[#E2E8F0] bg-white h-full">
            
            {/* Explorer Header */}
            <div className="p-4 border-b border-[#F1F5F9] bg-[#F8FAFC]">
              <button className="flex items-center gap-1.5 text-xs font-bold text-[#64748B] mb-4 hover:text-[#7C3AED] transition-colors uppercase tracking-wider" onClick={() => { setSelected(null); setSelectedFile(null); }}>
                <ChevronRight size={14} className="rotate-180" /> Back to Vault
              </button>
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2 uppercase tracking-wide">
                  <FolderOpen size={16} style={{ color: activeProject.color }} />
                  {activeProject.name}
                </h3>
              </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-white">
              {(activeProject.files || []).length === 0 ? (
                <div className="p-4 text-center mt-10">
                  <p className="text-xs font-bold text-[#94A3B8] mb-4">Repository is empty</p>
                  <button onClick={() => setShowUpload(true)} className="px-4 py-2 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0] transition-colors w-full">
                    Upload Files
                  </button>
                </div>
              ) : (
                fileTree.children.map((child, i) => (
                  <FileTreeNode key={i} node={child} onContextMenu={handleContextMenu} onSelect={setSelectedFile} selectedId={selectedFile?.id} />
                ))
              )}
            </div>
            
            {/* Bottom Upload Button */}
            <div className="p-3 border-t border-[#F1F5F9] bg-[#F8FAFC]">
               <button onClick={() => setShowUpload(true)} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:-translate-y-0.5" style={{ backgroundColor: activeProject.color, boxShadow: `0 4px 15px ${activeProject.color}40` }}>
                 <Upload size={14} /> Add to Repository
               </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel: Workspace / Code Viewer / Overview ── */}
      {activeProject && (
        <div className="flex-1 flex flex-col h-full animate-fade-in bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] overflow-hidden">
          
          {/* Top Breadcrumb Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC]">
            <div className="flex items-center gap-2 text-sm font-bold text-[#64748B]">
              <span className="text-[#0F172A] cursor-pointer hover:underline" onClick={() => setSelectedFile(null)}>{activeProject.name}</span>
              {selectedFile && (
                <>
                  <ChevronRight size={14} className="text-[#CBD5E1]" />
                  <FileIcon name={selectedFile.name} size={14} />
                  <span className="text-[#7C3AED]">{selectedFile.name}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {selectedFile && selectedFile.url ? (
                <a href={selectedFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shadow-sm">
                  <Download size={14} /> Download File
                </a>
              ) : (
                <>
                  <button onClick={() => { setEditProj(activeProject); setShowEdit(true); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shadow-sm">
                    <PenSquare size={14} /> Edit Vault
                  </button>
                  <button onClick={handleDeleteProject} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FECACA] transition-colors shadow-sm border border-[#FCA5A5]">
                    <Trash2 size={14} /> Delete Vault
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Workspace Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FFFFFF]">
            {selectedFile ? (
              /* Phase 3: IDE CODE VIEWER */
              <div className="h-full flex flex-col p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#F1F5F9]">
                   <div>
                     <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                       <Code2 size={18} className="text-[#7C3AED]" /> Viewer: {selectedFile.name}
                     </h2>
                     <p className="text-xs font-medium text-[#64748B] mt-1">{formatBytes(selectedFile.size)} • Path: {selectedFile.filePath}</p>
                   </div>
                   {/* Developer Actions */}
                   {!selectedFile.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) && (
                     <div className="flex gap-2">
                        <button onClick={handleCopyCmd} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] transition-all">
                          {copiedCmd ? <Check size={14} className="text-[#10B981]" /> : <Terminal size={14} />} 
                          {copiedCmd ? "Copied!" : "Copy Run Command"}
                        </button>
                        <button onClick={handleCopyCode} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-all shadow-[0_2px_10px_rgba(124,58,237,0.2)]">
                          {copiedCode ? <Check size={14} /> : <Copy size={14} />} 
                          {copiedCode ? "Copied!" : "Copy Code"}
                        </button>
                     </div>
                   )}
                </div>

                <div className="flex-1 overflow-auto rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  {selectedFile.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? (
                    <div className="w-full h-full flex items-center justify-center p-8 bg-[#F1F5F9] pattern-dots relative group">
                      <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-full rounded-lg shadow-sm border border-[#E2E8F0]" />
                      <a href={selectedFile.url} target="_blank" rel="noreferrer" className="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F172A] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        View Full Screen
                      </a>
                    </div>
                  ) : (
                    <pre className="p-5 text-[13px] font-mono text-[#475569] whitespace-pre-wrap leading-relaxed">
                      {fileContent === "Loading code viewer..." || fileContent === "Failed to load file contents." 
                        ? <code>{fileContent}</code> 
                        : <code dangerouslySetInnerHTML={{ __html: highlightCode(fileContent) }} />
                      }
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              /* Phase 2: PROJECT DASHBOARD & README ENGINE */
              <div className="max-w-3xl mx-auto p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${activeProject.color}15`, border: `1px solid ${activeProject.color}40` }}>
                    <FolderOpen size={32} style={{ color: activeProject.color }} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">{activeProject.name}</h1>
                    <span className="text-sm font-bold text-[#64748B] uppercase tracking-wider">{activeProject.category} Repository</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-6 rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-[#0F172A] mb-1">{activeProject.fileCount || 0}</span>
                    <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Tracked Files</span>
                  </div>
                  <div className="p-6 rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-[#0F172A] mb-1">{activeProject.progress}%</span>
                    <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Completion</span>
                  </div>
                </div>
                
                {/* README Render Engine */}
                <div className="p-8 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm">
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#F1F5F9]">
                    <FileText size={18} className="text-[#7C3AED]" />
                    <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">README.md</h3>
                  </div>
                  
                  {readmeContent ? (
                    <div 
                      className="text-[14px] text-[#475569] leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(readmeContent) }} 
                    />
                  ) : (
                    <p className="text-sm text-[#64748B] leading-relaxed bg-[#F8FAFC] p-4 rounded-xl border border-[#F1F5F9]">
                      <span className="font-bold text-[#0F172A]">Fallback Description:</span> {activeProject.description || "No description provided."}
                      <br/><br/>
                      <span className="text-xs text-[#94A3B8] italic">Note: Add a 'README.md' file to the root of this folder structure to automatically render documentation here.</span>
                    </p>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Context Menu (Right Click) ── */}
      {contextMenu && (
        <div className="fixed z-50 w-48 bg-white/90 backdrop-blur-xl border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden py-1 animate-scale-in" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="px-4 py-2 border-b border-[#F1F5F9] mb-1"><p className="text-xs font-bold text-[#0F172A] truncate">{contextMenu.file.name}</p></div>
          <a href={contextMenu.file.url} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#7C3AED] transition-colors"><Download size={14} /> Download</a>
          <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#7C3AED] transition-colors"><Link2 size={14} /> Copy Link</button>
          <div className="h-px bg-[#F1F5F9] my-1" />
          <button onClick={() => deleteFile(contextMenu.file.id)} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"><Trash2 size={14} /> Delete File</button>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Initialize Repository" size="sm" footer={<><button className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors" onClick={() => setShowNew(false)}>Cancel</button><button className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }} onClick={createProject}>Create Repository</button></>}>
        <div className="space-y-5">
          <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Repository Name</label><input autoFocus value={newProj.name} onChange={(e) => setNewProj((f) => ({ ...f, name: e.target.value }))} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED]" placeholder="E.g., jarvis-os-core" /></div>
          <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Description</label><textarea value={newProj.description} onChange={(e) => setNewProj((f) => ({ ...f, description: e.target.value }))} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED] resize-none h-24" placeholder="What is the purpose of this codebase?" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Category</label><select value={newProj.category} onChange={(e) => setNewProj((f) => ({ ...f, category: e.target.value }))} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]">{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Theme Color</label><div className="flex gap-2 flex-wrap">{COLORS.map((c) => <button key={c} type="button" onClick={() => setNewProj((f) => ({ ...f, color: c }))} className="w-7 h-7 rounded-full transition-all" style={{ background: c, border: newProj.color === c ? "3px solid #0F172A" : "2px solid transparent", transform: newProj.color === c ? "scale(1.15)" : "scale(1)" }} />)}</div></div>
          </div>
        </div>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Repository Vault" size="sm" footer={<><button className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors" onClick={() => setShowEdit(false)}>Cancel</button><button className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5" style={{ backgroundColor: "#0F172A", color: "#FFF", boxShadow: "0 4px 15px rgba(15,23,42,0.2)" }} onClick={handleEditProject}>Save Changes</button></>}>
        {editProj && (
          <div className="space-y-5">
            <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Repository Name</label><input autoFocus value={editProj.name} onChange={(e) => setEditProj((f) => ({ ...f, name: e.target.value }))} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED]" /></div>
            <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Description</label><textarea value={editProj.description} onChange={(e) => setEditProj((f) => ({ ...f, description: e.target.value }))} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED] resize-none h-24" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Category</label><select value={editProj.category} onChange={(e) => setEditProj((f) => ({ ...f, category: e.target.value }))} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]">{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Theme Color</label><div className="flex gap-2 flex-wrap">{COLORS.map((c) => <button key={c} type="button" onClick={() => setEditProj((f) => ({ ...f, color: c }))} className="w-7 h-7 rounded-full transition-all" style={{ background: c, border: editProj.color === c ? "3px solid #0F172A" : "2px solid transparent", transform: editProj.color === c ? "scale(1.15)" : "scale(1)" }} />)}</div></div>
            </div>
            <div><label className="block text-xs font-bold text-[#475569] mb-2 uppercase tracking-wide">Project Progress (%)</label><input type="number" min="0" max="100" value={editProj.progress} onChange={(e) => setEditProj((f) => ({ ...f, progress: parseInt(e.target.value) || 0 }))} className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#7C3AED]" /></div>
          </div>
        )}
      </Modal>

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload to Repository" subtitle={`${uploadFiles.length} file${uploadFiles.length !== 1 ? "s" : ""} queued for sync`} size="sm" footer={<><button className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0]" onClick={() => setShowUpload(false)}>Cancel</button><button disabled={isUploading} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" style={{ backgroundColor: "#7C3AED", color: "#FFF", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }} onClick={handleUploadConfirm}>{isUploading ? `Syncing (${uploadProgress.current}/${uploadProgress.total})...` : "Commit & Push"}</button></>}>
        <div className="mb-4"><UploadZone onFiles={handleDrop} /></div>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {uploadFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#F1F5F9] flex items-center justify-center"><FileIcon name={f.name} size={16} /></div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-bold text-[#0F172A] truncate">{f.name}</span>
                <span className="text-[10px] font-bold text-[#64748B] tracking-wider truncate">{f.filePath} • {formatBytes(f.size)}</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}