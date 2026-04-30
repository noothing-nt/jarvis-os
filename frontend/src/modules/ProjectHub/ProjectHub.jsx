import { useState }          from "react";
import { useProjects }       from "@/hooks/useProjects";
import { useAppStore }       from "@/store/useAppStore";
import HudCard               from "@/components/ui/HudCard";
import HudButton             from "@/components/ui/HudButton";
import GlowBadge             from "@/components/ui/GlowBadge";
import LoadingHud            from "@/components/ui/LoadingHud";
import HudSelect             from "@/components/ui/HudSelect";
import HudInput              from "@/components/ui/HudInput";
import ProjectCard           from "./ProjectCard";
import ProjectForm           from "./ProjectForm";
import IdeaBox               from "./IdeaBox";
import HardwareInventory     from "./HardwareInventory";
import { PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_CATEGORIES } from "@/utils/constants";
import { PlusIcon, FunnelIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const TABS = [
  { id: "projects", label: "Projects" },
  { id: "ideas",    label: "Idea Box"  },
  { id: "hardware", label: "Hardware"  },
];

export default function ProjectHub() {
  const {
    projects, ideas, stats, loading,
    filters, setFilters, resetFilters,
    fetchProjects, deleteProject,
  } = useProjects();
  const { showToast } = useAppStore();

  const [tab,         setTab]         = useState("projects");
  const [showForm,    setShowForm]    = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      showToast("info", "Project deleted.");
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const statRows = stats
    ? [
        { label: "TOTAL",     value: stats.total     || 0, color: "cyan"  },
        { label: "ACTIVE",    value: stats.active    || 0, color: "cyan"  },
        { label: "PLANNING",  value: stats.planning  || 0, color: "amber" },
        { label: "COMPLETED", value: stats.completed || 0, color: "green" },
        { label: "PAUSED",    value: stats.paused    || 0, color: "ghost" },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-hud text-lg text-hud-cyan text-glow-cyan tracking-widest uppercase">
            Project Hub
          </h1>
          <div className="module-header-line" />
          <p className="mt-1 font-mono text-xs text-hud-text-dim">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in registry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HudButton
            variant="secondary"
            size="sm"
            icon={<FunnelIcon className="w-4 h-4" />}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filter
          </HudButton>
          <HudButton
            variant="secondary"
            size="sm"
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={fetchProjects}
          >
            Refresh
          </HudButton>
          <HudButton
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setShowForm(true)}
          >
            New Project
          </HudButton>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      {statRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statRows.map((s) => (
            <HudCard
              key={s.label}
              glow={s.color === "ghost" ? "none" : s.color}
              className="p-4 text-center card-entry"
            >
              <div className={`font-hud text-2xl ${
                s.color === "cyan"  ? "text-hud-cyan  text-glow-cyan"  :
                s.color === "amber" ? "text-hud-amber text-glow-amber" :
                s.color === "green" ? "text-hud-green text-glow-green" :
                "text-hud-text-dim"
              }`}>
                {s.value}
              </div>
              <div className="font-mono text-[9px] text-hud-text-dim tracking-widest mt-1">
                {s.label}
              </div>
            </HudCard>
          ))}
        </div>
      )}

      {/* ── Filters Panel ─────────────────────────────────────────── */}
      {showFilters && (
        <HudCard className="p-4 animate-slide-up" glow="none">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HudSelect
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              placeholder="All Statuses"
              options={PROJECT_STATUSES.map((s) => ({ value: s, label: s.toUpperCase() }))}
            />
            <HudSelect
              label="Priority"
              value={filters.priority}
              onChange={(e) => setFilters({ priority: e.target.value })}
              placeholder="All Priorities"
              options={PROJECT_PRIORITIES.map((p) => ({ value: p, label: p.toUpperCase() }))}
            />
            <HudSelect
              label="Category"
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value })}
              placeholder="All Categories"
              options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: c.toUpperCase() }))}
            />
            <HudInput
              label="Search"
              placeholder="Search projects..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
          <div className="flex justify-end mt-3 gap-2">
            <HudButton variant="ghost" size="sm" onClick={() => { resetFilters(); fetchProjects(); }}>
              Clear Filters
            </HudButton>
            <HudButton size="sm" onClick={fetchProjects}>Apply</HudButton>
          </div>
        </HudCard>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-hud-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 font-hud text-[10px] tracking-widest uppercase
                        transition-all duration-150 border-b-2 -mb-px
                        ${tab === t.id
                          ? "border-hud-cyan text-hud-cyan"
                          : "border-transparent text-hud-text-dim hover:text-hud-text"
                        }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      {tab === "projects" && (
        <>
          {loading ? (
            <LoadingHud label="LOADING PROJECTS" />
          ) : projects.length === 0 ? (
            <HudCard className="p-12 text-center" glow="none">
              <p className="font-mono text-xs text-hud-text-dim tracking-widest mb-4">
                NO PROJECTS IN REGISTRY
              </p>
              <HudButton
                icon={<PlusIcon className="w-4 h-4" />}
                onClick={() => setShowForm(true)}
              >
                Create First Project
              </HudButton>
            </HudCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onDelete={() => handleDelete(project.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "ideas"    && <IdeaBox ideas={ideas} />}
      {tab === "hardware" && <HardwareInventory />}

      {/* ── Project Form Modal ────────────────────────────────────── */}
      {showForm && (
        <ProjectForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchProjects(); }}
        />
      )}
    </div>
  );
}
