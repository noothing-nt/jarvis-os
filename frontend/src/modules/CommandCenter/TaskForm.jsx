import { useState } from "react";
import HudModal  from "@/components/ui/HudModal";
import HudInput  from "@/components/ui/HudInput";
import HudSelect from "@/components/ui/HudSelect";
import HudButton from "@/components/ui/HudButton";
import { useTaskStore } from "@/store/useTaskStore";
import { useAppStore }  from "@/store/useAppStore";
import { TASK_PRIORITIES } from "@/utils/constants";

export default function TaskForm({ onClose, projectId }) {
  const { createTask }  = useTaskStore();
  const { showToast }   = useAppStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium",
    due_date: "", project_id: projectId || "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.due_date) delete payload.due_date;
      if (!payload.project_id) delete payload.project_id;
      await createTask(payload);
      showToast("success", "Task created.");
      onClose();
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
      title="New Task"
      subtitle="Add a task to your command queue"
      footer={
        <>
          <HudButton variant="ghost" onClick={onClose}>Cancel</HudButton>
          <HudButton loading={loading} onClick={handleSubmit}>Create Task</HudButton>
        </>
      }
    >
      <div className="space-y-4">
        <HudInput
          label="Task Title"
          placeholder="What needs to be done?"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          autoFocus
        />
        <HudInput
          as="textarea"
          label="Description (optional)"
          placeholder="Additional details..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <HudSelect
            label="Priority"
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
            options={TASK_PRIORITIES.map((p) => ({ value: p, label: p.toUpperCase() }))}
          />
          <HudInput
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={(e) => set("due_date", e.target.value)}
          />
        </div>
      </div>
    </HudModal>
  );
}