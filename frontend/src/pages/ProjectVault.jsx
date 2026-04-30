import { useState, useCallback } from "react";
import { useDropzone }           from "react-dropzone";
import {
  FolderOpen, FolderPlus, Upload, File, FileCode,
  FileImage, FileText, Trash2, Download, Search,
  Grid, List, Plus, ChevronRight, MoreHorizontal,
  Archive, Star, Clock, HardDrive, Eye,
} from "lucide-react";
import Badge   from "@/components/shared/Badge";
import Modal   from "@/components/shared/Modal";
import clsx    from "clsx";
import { format } from "date-fns";

/* ── File type icon helper ───────────────────────────────────────── */
function FileIcon({ name, size = 16 }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","svg","webp"].includes(ext))
    return <FileImage size={size} className="text-purple-400" />;
  if (["js","jsx","ts","tsx","py","cpp","c","h","ino","json","yaml","yml","env"].includes(ext))
    return <FileCode size={size} className="text-accent-hover" />;
  if (["pdf","doc","docx","txt","md"].includes(ext))
    return <FileText size={size} className="text-warning-light" />;
  return <File size={size} className="text-muted" />;
}

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Initial data ────────────────────────────────────────────────── */
const INITIAL_PROJECTS = [];

/* ── Dropzone component ──────────────────────────────────────────── */
function UploadZone({ onFiles }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
        isDragActive
          ? "border-accent bg-accent-subtle"
          : "border-border hover:border-accent/50 hover:bg-surface"
      )}
    >
      <input {...getInputProps()} />
      <Upload size={28} className={clsx("mx-auto mb-3", isDragActive ? "text-accent-hover" : "text-muted")} />
      <p className="text-sm font-semibold text-primary mb-1">
        {isDragActive ? "Drop files here" : "Drop files or folders here"}
      </p>
      <p className="text-xs text-muted">
        Supports all file types · Max 100MB per file
      </p>
      <button className="btn btn-default btn-sm mt-4 gap-1.5">
        <Upload size={12} /> Browse Files
      </button>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function ProjectVault() {
  const [projects,    setProjects]    = useState(INITIAL_PROJECTS);
  const [selected,    setSelected]    = useState(null);
  const [view,        setView]        = useState("grid");
  const [search,      setSearch]      = useState("");
  const [showNew,     setShowNew]     = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [newProj,     setNewProj]     = useState({
    name: "", description: "", category: "Software", color: "#2F81F7",
  });

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const activeProject = selected ? projects.find((p) => p.id === selected) : null;

  const handleDrop = useCallback((files) => {
    setUploadFiles(files.map((f) => ({
      id:       Date.now() + Math.random(),
      name:     f.name,
      size:     f.size,
      type:     "file",
      modified: format(new Date(), "yyyy-MM-dd"),
    })));
    setShowUpload(true);
  }, []);

  const handleUploadConfirm = () => {
    if (!selected) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === selected
          ? {
              ...p,
              files: [...p.files, ...uploadFiles],
              fileCount: p.fileCount + uploadFiles.length,
            }
          : p
      )
    );
    setUploadFiles([]);
    setShowUpload(false);
  };

  const createProject = () => {
    if (!newProj.name.trim()) return;
    const id = `p${Date.now()}`;
    setProjects((prev) => [
      ...prev,
      {
        id,
        ...newProj,
        status: "planning",
        progress: 0,
        taskCount: 0,
        fileCount: 0,
        lastModified: format(new Date(), "yyyy-MM-dd"),
        starred: false,
        files: [],
      },
    ]);
    setNewProj({ name: "", description: "", category: "Software", color: "#2F81F7" });
    setShowNew(false);
  };

  const deleteFile = (projId, fileId) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projId
          ? { ...p, files: p.files.filter((f) => f.id !== fileId), fileCount: p.fileCount - 1 }
          : p
      )
    );
  };

  const STATUS_COLORS = {
    active:   "green",
    planning: "amber",
    paused:   "gray",
    done:     "blue",
  };

  const COLORS = ["#2F81F7","#3FB950","#A371F7","#D29922","#F85149","#2FBFA5","#E67E22"];
  const CATS   = ["Software","Embedded","AI/ML","Web","Mobile","Research","Other"];

  return (
    <div className="flex h-full gap-5 animate-fade-in" style={{ minHeight: "calc(100vh - 140px)" }}>

      {/* ── Left panel: project list ────────────────────────── */}
      <div className={clsx(
        "flex flex-col flex-shrink-0 transition-all",
        activeProject ? "w-72" : "w-full"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Project Vault</h1>
            <p className="text-sm text-muted mt-0.5">{projects.length} projects</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            {!activeProject && (
              <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
                {[{id:"grid",icon:Grid},{id:"list",icon:List}].map(({id,icon:Icon}) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={clsx(
                      "p-1.5 rounded transition-all",
                      view === id ? "bg-raised text-primary" : "text-muted hover:text-secondary"
                    )}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNew(true)} className="btn btn-blue btn-sm gap-1.5">
              <Plus size={13} /> New
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="nx-input pl-9"
          />
        </div>

        {/* Grid view */}
        {!activeProject && view === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelected(p.id)}
                className="nx-card p-5 cursor-pointer hover:border-accent/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}
                    >
                      <FolderOpen size={15} style={{ color: p.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-primary group-hover:text-accent-hover transition-colors">
                        {p.name}
                      </h3>
                      <span className="text-2xs text-muted">{p.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.starred && <Star size={13} className="text-warning fill-warning" />}
                    <Badge variant={STATUS_COLORS[p.status] || "gray"} dot>{p.status}</Badge>
                  </div>
                </div>

                <p className="text-xs text-muted mb-3 line-clamp-2">{p.description}</p>

                <div className="mb-3">
                  <div className="flex justify-between text-2xs text-muted mb-1">
                    <span>Progress</span>
                    <span className="font-semibold" style={{ color: p.color }}>{p.progress}%</span>
                  </div>
                  <div className="nx-progress">
                    <div
                      className="nx-progress-fill"
                      style={{ width: `${p.progress}%`, background: p.color }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-2xs text-muted pt-2 border-t border-border-subtle">
                  <span className="flex items-center gap-1">
                    <File size={10} /> {p.fileCount} files
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {format(new Date(p.lastModified), "MMM d")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {!activeProject && view === "list" && (
          <div className="nx-card overflow-hidden">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Files</th>
                  <th>Modified</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => setSelected(p.id)} className="cursor-pointer">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded flex items-center justify-center"
                             style={{ background: `${p.color}20` }}>
                          <FolderOpen size={12} style={{ color: p.color }} />
                        </div>
                        <span className="font-semibold text-primary text-sm">{p.name}</span>
                        {p.starred && <Star size={11} className="text-warning fill-warning" />}
                      </div>
                    </td>
                    <td><span className="text-xs text-secondary">{p.category}</span></td>
                    <td><Badge variant={STATUS_COLORS[p.status] || "gray"} dot>{p.status}</Badge></td>
                    <td>
                      <div className="flex items-center gap-2 w-24">
                        <div className="flex-1 nx-progress">
                          <div className="nx-progress-fill" style={{ width: `${p.progress}%`, background: p.color }} />
                        </div>
                        <span className="text-2xs text-muted w-8">{p.progress}%</span>
                      </div>
                    </td>
                    <td><span className="text-xs text-secondary">{p.fileCount}</span></td>
                    <td><span className="text-xs text-muted">{format(new Date(p.lastModified),"MMM d")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Project detail panel */}
        {activeProject && (
          <div className="flex-1 nx-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-xs text-muted mb-3 cursor-pointer"
                   onClick={() => setSelected(null)}>
                <ChevronRight size={12} className="rotate-180" />
                <span>All Projects</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                     style={{ background: `${activeProject.color}20`, border: `1px solid ${activeProject.color}40` }}>
                  <FolderOpen size={16} style={{ color: activeProject.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">{activeProject.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={STATUS_COLORS[activeProject.status] || "gray"} dot>
                      {activeProject.status}
                    </Badge>
                    <span className="text-2xs text-muted">{activeProject.category}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {activeProject.files.length === 0 ? (
                <div className="p-4">
                  <UploadZone onFiles={handleDrop} />
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {activeProject.files.map((f) => (
                    <div
                      key={f.id}
                      className="file-tree-item group justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon name={f.name} size={14} />
                        <span className="text-xs truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-2xs text-muted">{formatBytes(f.size)}</span>
                        <button
                          onClick={() => deleteFile(activeProject.id, f.id)}
                          className="text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {activeProject.files.length > 0 && (
              <div className="p-3 border-t border-border-subtle">
                <UploadZone onFiles={handleDrop} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right panel: project detail ─────────────────────── */}
      {activeProject && (
        <div className="flex-1 space-y-4 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Progress", value: `${activeProject.progress}%`, color: activeProject.color },
              { label: "Tasks",    value: activeProject.taskCount,       color: "#2F81F7"           },
              { label: "Files",    value: activeProject.fileCount,       color: "#A371F7"            },
            ].map(({ label, value, color }) => (
              <div key={label} className="nx-card p-4 text-center">
                <div className="text-xl font-bold" style={{ color }}>{value}</div>
                <div className="text-xs text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="nx-card p-4">
            <h3 className="text-sm font-semibold text-primary mb-2">About</h3>
            <p className="text-sm text-secondary leading-relaxed">{activeProject.description}</p>
          </div>

          {/* Progress */}
          <div className="nx-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary">Progress</h3>
              <span className="text-sm font-bold" style={{ color: activeProject.color }}>
                {activeProject.progress}%
              </span>
            </div>
            <div className="nx-progress" style={{ height: 8 }}>
              <div
                className="nx-progress-fill"
                style={{ width: `${activeProject.progress}%`, background: activeProject.color }}
              />
            </div>
          </div>

          {/* File list */}
          <div className="nx-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-primary">
                Files ({activeProject.fileCount})
              </h3>
              <button
                onClick={() => document.getElementById("file-upload")?.click()}
                className="btn btn-default btn-sm gap-1.5"
              >
                <Upload size={12} /> Upload
              </button>
            </div>
            {activeProject.files.length > 0 && (
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Modified</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {activeProject.files.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <FileIcon name={f.name} size={14} />
                          <span className="text-sm text-primary">{f.name}</span>
                        </div>
                      </td>
                      <td><span className="text-xs text-muted">{formatBytes(f.size)}</span></td>
                      <td><span className="text-xs text-muted">{format(new Date(f.modified),"MMM d, yyyy")}</span></td>
                      <td>
                        <button
                          onClick={() => deleteFile(activeProject.id, f.id)}
                          className="btn btn-ghost btn-icon btn-sm"
                        >
                          <Trash2 size={13} className="text-danger" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── New project modal ───────────────────────────────── */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New Project"
        size="sm"
        footer={
          <>
            <button className="btn btn-default" onClick={() => setShowNew(false)}>Cancel</button>
            <button className="btn btn-blue" onClick={createProject}>Create Project</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="nx-label">Project Name *</label>
            <input
              autoFocus
              value={newProj.name}
              onChange={(e) => setNewProj((f) => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Project"
              className="nx-input"
            />
          </div>
          <div>
            <label className="nx-label">Description</label>
            <textarea
              value={newProj.description}
              onChange={(e) => setNewProj((f) => ({ ...f, description: e.target.value }))}
              placeholder="What are you building?"
              className="nx-input nx-textarea"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="nx-label">Category</label>
              <select
                value={newProj.category}
                onChange={(e) => setNewProj((f) => ({ ...f, category: e.target.value }))}
                className="nx-input nx-select"
              >
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="nx-label">Color</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewProj((f) => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: newProj.color === c ? "#fff" : "transparent",
                      transform: newProj.color === c ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Upload confirm modal ────────────────────────────── */}
      <Modal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Files"
        subtitle={`${uploadFiles.length} file${uploadFiles.length !== 1 ? "s" : ""} ready to upload`}
        size="sm"
        footer={
          <>
            <button className="btn btn-default" onClick={() => setShowUpload(false)}>Cancel</button>
            <button className="btn btn-blue" onClick={handleUploadConfirm}>Upload All</button>
          </>
        }
      >
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {uploadFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface border border-border-subtle">
              <FileIcon name={f.name} size={15} />
              <span className="flex-1 text-sm text-primary truncate">{f.name}</span>
              <span className="text-2xs text-muted">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}