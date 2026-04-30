import { useState }        from "react";
import HudCard             from "@/components/ui/HudCard";
import HudButton           from "@/components/ui/HudButton";
import HudModal            from "@/components/ui/HudModal";
import HudInput            from "@/components/ui/HudInput";
import GlowBadge           from "@/components/ui/GlowBadge";
import { useProjectStore } from "@/store/useProjectStore";
import { useAppStore }     from "@/store/useAppStore";
import { aiService }       from "@/services/aiService";
import { IDEA_STATUS_MAP } from "@/utils/statusColors";
import { timeAgo }         from "@/utils/dateHelpers";
import {
  LightBulbIcon, SparklesIcon, ArrowUpCircleIcon,
  TrashIcon, PlusIcon, XCircleIcon,
} from "@heroicons/react/24/outline";

export default function IdeaBox({ ideas = [] }) {
  const { createIdea, updateIdea, promoteIdea, discardIdea, deleteIdea, fetchIdeas } =
    useProjectStore();
  const { showToast } = useAppStore();

  const [showNew,    setShowNew]    = useState(false);
  const [newIdea,    setNewIdea]    = useState({ title: "", raw_idea: "", tags: "" });
  const [saving,     setSaving]     = useState(false);
  const [aiLoading,  setAiLoading]  = useState(null); // idea id

  const handleCreate = async () => {
    if (!newIdea.title.trim()) return;
    setSaving(true);
    try {
      await createIdea({
        title:    newIdea.title,
        raw_idea: newIdea.raw_idea,
        tags:     newIdea.tags
          ? newIdea.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
          : [],
      });
      showToast("success", "Idea captured.");
      setNewIdea({ title: "", raw_idea: "", tags: "" });
      setShowNew(false);
      fetchIdeas();
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBrainstorm = async (idea) => {
    setAiLoading(idea.id);
    try {
      await aiService.brainstorm(idea.id, idea.raw_idea || idea.title);
      await fetchIdeas();
      showToast("success", "AI brainstorm complete!");
    } catch (e) {
      showToast("error", "AI error: " + e.message);
    } finally {
      setAiLoading(null);
    }
  };

  const handlePromote = async (id) => {
    try {
      await promoteIdea(id);
      showToast("success", "Idea promoted to project!");
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const handleDiscard = async (id) => {
    try {
      await discardIdea(id);
      showToast("info", "Idea discarded.");
      fetchIdeas();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const activeIdeas    = ideas.filter((i) => i.status !== "discarded" && i.status !== "promoted");
  const promotedIdeas  = ideas.filter((i) => i.status === "promoted");
  const discardedIdeas = ideas.filter((i) => i.status === "discarded");

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="w-4 h-4 text-hud-amber" />
          <span className="font-hud text-xs text-hud-text-dim tracking-widest uppercase">
            {activeIdeas.length} Active Ideas
          </span>
        </div>
        <HudButton
          size="sm"
          icon={<PlusIcon className="w-4 h-4" />}
          onClick={() => setShowNew(true)}
        >
          Capture Idea
        </HudButton>
      </div>

      {/* Ideas grid */}
      {activeIdeas.length === 0 ? (
        <HudCard className="p-8 text-center" glow="none">
          <LightBulbIcon className="w-8 h-8 text-hud-text-dim mx-auto mb-2" />
          <p className="font-mono text-xs text-hud-text-dim tracking-wider">
            NO IDEAS YET — FIRE AWAY
          </p>
        </HudCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeIdeas.map((idea, i) => {
            const statusCfg = IDEA_STATUS_MAP[idea.status] || IDEA_STATUS_MAP.raw;
            return (
              <HudCard
                key={idea.id}
                className="p-4 flex flex-col gap-3 card-entry"
                glow="amber"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <GlowBadge
                      variant={
                        idea.status === "expanded" ? "cyan"  :
                        idea.status === "promoted" ? "green" : "amber"
                      }
                      dot
                      className="mb-1"
                    >
                      {statusCfg.label}
                    </GlowBadge>
                    <h3 className="font-hud text-sm text-hud-text">{idea.title}</h3>
                  </div>
                  <span className="font-mono text-[9px] text-hud-text-dim shrink-0">
                    {timeAgo(idea.created_at)}
                  </span>
                </div>

                {/* Raw idea */}
                {idea.raw_idea && (
                  <p className="text-xs text-hud-text-dim font-sans leading-relaxed line-clamp-3">
                    {idea.raw_idea}
                  </p>
                )}

                {/* AI expansion */}
                {idea.ai_expanded && (
                  <div className="px-3 py-2 rounded bg-hud-blue/10 border border-hud-blue/20">
                    <p className="font-mono text-[9px] text-hud-cyan mb-1 tracking-widest">
                      ✦ AI EXPANSION
                    </p>
                    <p className="text-xs text-hud-text-dim font-sans leading-relaxed line-clamp-3">
                      {idea.ai_expanded}
                    </p>
                    {idea.ai_feasibility && (
                      <GlowBadge
                        variant={
                          idea.ai_feasibility === "HIGH"   ? "green" :
                          idea.ai_feasibility === "MEDIUM" ? "amber" : "red"
                        }
                        className="mt-2"
                      >
                        FEASIBILITY: {idea.ai_feasibility}
                      </GlowBadge>
                    )}
                  </div>
                )}

                {/* Tags */}
                {idea.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {idea.tags.map((tag) => (
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

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-hud-border/30">
                  <HudButton
                    variant="ghost"
                    size="sm"
                    icon={<SparklesIcon className="w-3 h-3" />}
                    loading={aiLoading === idea.id}
                    onClick={() => handleBrainstorm(idea)}
                    className="text-[9px]"
                  >
                    Brainstorm
                  </HudButton>
                  <HudButton
                    variant="success"
                    size="sm"
                    icon={<ArrowUpCircleIcon className="w-3 h-3" />}
                    onClick={() => handlePromote(idea.id)}
                    className="text-[9px]"
                  >
                    Promote
                  </HudButton>
                  <div className="flex-1" />
                  <HudButton
                    variant="danger"
                    size="sm"
                    icon={<XCircleIcon className="w-3 h-3" />}
                    onClick={() => handleDiscard(idea.id)}
                    className="text-[9px]"
                  />
                </div>
              </HudCard>
            );
          })}
        </div>
      )}

      {/* Promoted / Discarded counts */}
      {(promotedIdeas.length > 0 || discardedIdeas.length > 0) && (
        <div className="flex gap-3 pt-2">
          {promotedIdeas.length > 0 && (
            <GlowBadge variant="green" dot>{promotedIdeas.length} Promoted</GlowBadge>
          )}
          {discardedIdeas.length > 0 && (
            <GlowBadge variant="ghost">{discardedIdeas.length} Discarded</GlowBadge>
          )}
        </div>
      )}

      {/* New Idea Modal */}
      <HudModal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Capture Idea"
        subtitle="Quick-fire your raw thought — AI will expand it later"
        footer={
          <>
            <HudButton variant="ghost" onClick={() => setShowNew(false)}>Cancel</HudButton>
            <HudButton loading={saving} onClick={handleCreate}>Save Idea</HudButton>
          </>
        }
      >
        <div className="space-y-4">
          <HudInput
            label="Idea Title *"
            placeholder="One-line concept..."
            value={newIdea.title}
            onChange={(e) => setNewIdea((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <HudInput
            as="textarea"
            label="Raw Idea"
            placeholder="Dump everything you know about this idea..."
            value={newIdea.raw_idea}
            onChange={(e) => setNewIdea((f) => ({ ...f, raw_idea: e.target.value }))}
            rows={5}
          />
          <HudInput
            label="Tags (comma-separated)"
            placeholder="ai, hardware, web"
            value={newIdea.tags}
            onChange={(e) => setNewIdea((f) => ({ ...f, tags: e.target.value }))}
          />
        </div>
      </HudModal>
    </div>
  );
}
