import { useState }            from "react";
import clsx                    from "clsx";
import { useNavigate }         from "react-router-dom";
import HudCard                 from "@/components/ui/HudCard";
import HudButton               from "@/components/ui/HudButton";
import GlowBadge               from "@/components/ui/GlowBadge";
import { PROJECT_STATUS_MAP, PRIORITY_MAP, progressColor, hexToGlow } from "@/utils/statusColors";
import { formatDate }          from "@/utils/dateHelpers";
import { useProjectStore }     from "@/store/useProjectStore";
import { useAppStore }         from "@/store/useAppStore";
import { aiService }           from "@/services/aiService";
import {
  SparklesIcon, TrashIcon, PencilIcon,
  CalendarIcon, TagIcon,
} from "@heroicons/react/24/outline";
import ProjectForm from "./ProjectForm";

export default function ProjectCard({ project, onDelete, style }) {
  const { updateProject }     = useProjectStore();
  const { showToast }         = useAppStore();
  const [aiLoading, setAiLoading] = useState(false);
  const [editing,   setEditing]   = useState(false);

  const status   = PROJECT_STATUS_MAP[project.status]   || PROJECT_STATUS_MAP.planning;
  const priority = PRIORITY_MAP[project.priority]       || PRIORITY_MAP.medium;
  const pct      = project.progress_percent || 0;
  const pColor   = progressColor(pct);

  const handleAiSummarize = async () => {
    setAiLoading(true);
    try {
      await aiService.summarize(project.id);
      showToast("success", "AI summary generated!");
    } catch (e) {
      showToast("error", "AI unavailable: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const glowStyle = project.color_hex ? hexToGlow(project.color_hex) : {};

  return (
    <>
      <HudCard
        className="p-4 card-entry flex flex-col gap-3"
        glow={project.is_pinned ? "cyan" : "none"}
        active={project.is_pinned}
        style={style}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {project.is_pinned && (
                <span className="font-mono text-[9px] text-hud-cyan tracking-widest">
                  ⬡ PINNED
                </span>
              )}
              <GlowBadge
                variant={
                  project.status === "active"    ? "cyan"  :
                  project.status === "completed" ? "green" :
                  project.status === "paused"    ? "ghost" :
                  "amber"
                }
                dot
              >
                {status.label}
              </GlowBadge>
              <span className={clsx("font-mono text-[9px] tracking-wider", priority.color)}>
                {priority.icon} {priority.label}
              </span>
            </div>
            <h3 className="font-hud text-sm text-hud-text tracking-wide leading-snug">
              {project.title}
            </h3>
          </div>

          {/* Color dot */}
          {project.color_hex && (
            <div
              className="w-3 h-3 rounded-full shrink-0 mt-1"
              style={{ background: project.color_hex, ...glowStyle }}
            />
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-hud-text-dim font-sans leading-relaxed line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-mono text-[9px] text-hud-text-dim tracking-wider">PROGRESS</span>
            <span className="font-mono text-[9px]" style={{ color: pColor }}>{pct}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill bar-animated"
              style={{
                "--target-width": `${pct}%`,
                background: `linear-gradient(90deg, #1B6CA8, ${pColor})`,
                boxShadow: `0 0 8px ${pColor}80`,
              }}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-hud-text-dim flex-wrap">
          {project.due_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {formatDate(project.due_date)}
            </span>
          )}
          {project.category && (
            <span className="flex items-center gap-1">
              <TagIcon className="w-3 h-3" />
              {project.category.toUpperCase()}
            </span>
          )}
        </div>

        {/* AI summary */}
        {project.ai_summary && (
          <div className="px-3 py-2 rounded bg-hud-blue/10 border border-hud-blue/20">
            <p className="font-mono text-[9px] text-hud-text-dim mb-1 tracking-widest">
              ✦ AI SUMMARY
            </p>
            <p className="text-xs text-hud-text-dim font-sans leading-relaxed line-clamp-2">
              {project.ai_summary}
            </p>
          </div>
        )}

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono
                           bg-hud-bg border border-hud-border text-hud-text-dim"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1 border-t border-hud-border/30">
          <HudButton
            variant="ghost"
            size="sm"
            icon={<SparklesIcon className="w-3 h-3" />}
            loading={aiLoading}
            onClick={handleAiSummarize}
            className="text-[9px]"
          >
            AI
          </HudButton>
          <HudButton
            variant="ghost"
            size="sm"
            icon={<PencilIcon className="w-3 h-3" />}
            onClick={() => setEditing(true)}
            className="text-[9px]"
          >
            Edit
          </HudButton>
          <div className="flex-1" />
          <HudButton
            variant="danger"
            size="sm"
            icon={<TrashIcon className="w-3 h-3" />}
            onClick={onDelete}
            className="text-[9px]"
          />
        </div>
      </HudCard>

      {editing && (
        <ProjectForm
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </>
  );
}
