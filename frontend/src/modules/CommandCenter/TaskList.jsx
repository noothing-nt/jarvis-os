import { useState } from "react";
import clsx from "clsx";
import { useTaskStore }       from "@/store/useTaskStore";
import { useAppStore }        from "@/store/useAppStore";
import HudButton              from "@/components/ui/HudButton";
import GlowBadge              from "@/components/ui/GlowBadge";
import { TASK_STATUS_MAP, PRIORITY_MAP } from "@/utils/statusColors";
import { formatDate, isOverdue }         from "@/utils/dateHelpers";
import { CheckIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import TaskItem  from "./TaskItem";
import TaskForm  from "./TaskForm";

export default function TaskList({ tasks = [], compact = false }) {
  const { completeTask, deleteTask } = useTaskStore();
  const { showToast }               = useAppStore();
  const [showForm, setShowForm]     = useState(false);

  const handleComplete = async (id) => {
    try {
      await completeTask(id);
      showToast("success", "Task completed! XP awarded.");
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      showToast("info", "Task deleted.");
    } catch (e) {
      showToast("error", e.message);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="font-mono text-xs text-hud-text-dim tracking-wider">
          NO TASKS — SYSTEM CLEAR
        </p>
        {!compact && (
          <HudButton
            variant="ghost"
            size="sm"
            className="mt-3"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setShowForm(true)}
          >
            Add Task
          </HudButton>
        )}
        {showForm && <TaskForm onClose={() => setShowForm(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => (
        <TaskItem
          key={task.id}
          task={task}
          compact={compact}
          style={{ animationDelay: `${i * 0.04}s` }}
          onComplete={() => handleComplete(task.id)}
          onDelete={() => handleDelete(task.id)}
        />
      ))}

      {!compact && (
        <div className="pt-1">
          <HudButton
            variant="ghost"
            size="sm"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setShowForm(true)}
          >
            Add Task
          </HudButton>
        </div>
      )}

      {showForm && <TaskForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
