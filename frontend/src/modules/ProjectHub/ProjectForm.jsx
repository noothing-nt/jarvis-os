import { useState }          from "react";
import HudModal              from "@/components/ui/HudModal";
import HudInput              from "@/components/ui/HudInput";
import HudSelect             from "@/components/ui/HudSelect";
import HudButton             from "@/components/ui/HudButton";
import { useProjectStore }   from "@/store/useProjectStore";
import { useAppStore }       from "@/store/useAppStore";
import {
  PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_CATEGORIES,
} from "@/utils/constants";

const COLORS = ["#00F5FF","#1B6CA8","#FFB800","#00FF88","#FF3860","#9B59B6","#E67E22"];

export default function ProjectForm({ project, onClose, onSaved }) {
  const { createProject, updateProject } = useProjectStore();
  const { showToast }                    = useAppStore();
  const [loading, setLoading]            = useState(false);

  const isEdit = Boolean(project);

  const [form, setForm] = useState({
    title:            project?.title            || "",
    description:      project?.description      || "",
    category:         project?.category         || "",
    status:           project?.status           || "planning",
    priority:         project?.priority         || "medium",
    progress_percent: project?.progress_percent || 0,
    due_date:         project?.due_date?.slice(0, 10) || "",
    color_hex:        project?.color_hex        || "#1B6CA8",
    is_pinned:        project?.is_pinned        || false,
    tags:             project?.tags?.join(", ") || "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        progress_percent: Number(form.progress_percent),
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
          : [],
      };
      if (!payload.due_date) delete payload.due_date;
      if (!payload.category) delete payload.category;

      if (isEdit) {
        await updateProject(project.id, payload);
        showToast("success", "Project updated.");
      } else {
        await createProject(payload);
        showToast("success", "Project created.");
      }
      onSaved?.();
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HudModal
      open
      onClose={onClose}
      title={isEdit ? "Edit Project" : "New Project"}
      subtitle={isEdit ? `Editing: ${project.title}` : "Register a new project"}
      size="lg"
      footer={
        <>
          <HudButton variant="ghost" onClick={onClose}>Cancel</HudButton>
          <HudButton loading={loading} onClick={handleSubmit}>
            {isEdit ? "Save Changes" : "Create Project"}
          </HudButton>
        </>
      }
    >
      <div className="space-y-4">
        <HudInput
          label="Project Title *"
          placeholder="Enter project name..."
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          autoFocus
        />
        <HudInput
          as="textarea"
          label="Description"
          placeholder="What are you building?"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
        />

        <div className="grid grid-cols-2 gap-3">
          <HudSelect
            label="Status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            options={PROJECT_STATUSES.map((s) => ({ value: s, label: s.toUpperCase() }))}
          />
          <HudSelect
            label="Priority"
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
            options={PROJECT_PRIORITIES.map((p) => ({ value: p, label: p.toUpperCase() }))}
          />
          <HudSelect
            label="Category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Select Category"
            options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: c.toUpperCase() }))}
          />
          <HudInput
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={(e) => set("due_date", e.target.value)}
          />
        </div>

        <div>
          <label className="text-[10px] font-mono tracking-widest text-hud-text-dim uppercase block mb-1.5">
            Progress — {form.progress_percent}%
          </label>
          <input
            type="range" min="0" max="100" step="5"
            value={form.progress_percent}
            onChange={(e) => set("progress_percent", e.target.value)}
            className="w-full accent-hud-cyan cursor-pointer"
          />
        </div>

        <HudInput
          label="Tags (comma-separated)"
          placeholder="react, esp32, ai, iot"
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
        />

        {/* Color picker */}
        <div>
          <label className="text-[10px] font-mono tracking-widest text-hud-text-dim uppercase block mb-1.5">
            Card Color
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color_hex", c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  form.color_hex === c
                    ? "border-white scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              value={form.color_hex}
              onChange={(e) => set("color_hex", e.target.value)}
              className="w-7 h-7 rounded cursor-pointer bg-transparent border border-hud-border"
            />
          </div>
        </div>

        {/* Pin toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => set("is_pinned", !form.is_pinned)}
            className={`w-10 h-5 rounded-full border transition-colors relative ${
              form.is_pinned
                ? "bg-hud-blue/40 border-hud-cyan"
                : "bg-hud-bg border-hud-border"
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
              form.is_pinned
                ? "left-5 bg-hud-cyan shadow-hud-cyan"
                : "left-0.5 bg-hud-text-dim"
            }`} />
          </div>
          <span className="font-mono text-xs text-hud-text-dim">Pin to dashboard</span>
        </label>
      </div>
    </HudModal>
  );
}
