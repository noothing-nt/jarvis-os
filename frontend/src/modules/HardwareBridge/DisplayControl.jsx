import { useState }        from "react";
import HudCard             from "@/components/ui/HudCard";
import HudButton           from "@/components/ui/HudButton";
import HudSelect           from "@/components/ui/HudSelect";
import GlowBadge           from "@/components/ui/GlowBadge";
import { hardwareService } from "@/services/hardwareService";
import { useAppStore }     from "@/store/useAppStore";
import {
  TvIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const DISPLAY_MODES = [
  { value: "schedule", label: "SCHEDULE"  },
  { value: "tasks",    label: "TASKS"     },
  { value: "comms",    label: "COMMS"     },
  { value: "status",   label: "SYSTEM STATUS" },
  { value: "clock",    label: "CLOCK"     },
];

export default function DisplayControl({ payload, onRefresh }) {
  const { showToast }           = useAppStore();
  const [mode,    setMode]      = useState("schedule");
  const [pushing, setPushing]   = useState(false);

  const handlePush = async () => {
    setPushing(true);
    try {
      await hardwareService.esp32Ping();
      await onRefresh?.();
      showToast("success", `Display mode '${mode}' pushed to ESP32.`);
    } catch (e) {
      showToast("error", "Push failed: " + e.message);
    } finally {
      setPushing(false);
    }
  };

  const displayLines = payload?.display_lines || [];
  const summary      = payload?.summary       || {};

  return (
    <HudCard className="p-4" glow="blue">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TvIcon className="w-4 h-4 text-hud-blue-lt" />
        <span className="font-hud text-[10px] text-hud-text-dim tracking-widest uppercase">
          Display Control
        </span>
      </div>

      {/* TFT preview */}
      <div className="mb-4 rounded-lg overflow-hidden border-2 border-hud-cyan/30
                      bg-black relative"
           style={{ aspectRatio: "4/3", maxHeight: "180px" }}>
        {/* Screen glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-hud-cyan/5 to-transparent pointer-events-none" />
        <div className="scan-line opacity-20" />

        {/* Display content */}
        <div className="absolute inset-0 flex flex-col justify-center p-4 gap-1">
          {displayLines.length > 0 ? (
            displayLines.map((line, i) => (
              <div
                key={i}
                className="font-mono text-xs text-hud-cyan truncate"
                style={{ textShadow: "0 0 6px #00F5FF" }}
              >
                {line}
              </div>
            ))
          ) : (
            <div className="text-center">
              <div className="font-hud text-sm text-hud-cyan/50 tracking-widest">
                NO SIGNAL
              </div>
            </div>
          )}
        </div>

        {/* Screen edge effect */}
        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-hud-cyan/10 pointer-events-none" />
      </div>

      {/* Summary stats */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(summary).slice(0, 3).map(([key, val]) => (
            <div
              key={key}
              className="text-center px-2 py-1.5 rounded border border-hud-border/50 bg-hud-bg/50"
            >
              <div className="font-hud text-sm text-hud-cyan">{val}</div>
              <div className="font-mono text-[8px] text-hud-text-dim uppercase tracking-wider mt-0.5">
                {key.replace(/_/g, " ")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mode selector */}
      <div className="space-y-3">
        <HudSelect
          label="Display Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={DISPLAY_MODES}
        />

        <div className="flex gap-2">
          <HudButton
            className="flex-1"
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={onRefresh}
          >
            Refresh Data
          </HudButton>
          <HudButton
            variant="success"
            className="flex-1"
            icon={<CheckCircleIcon className="w-4 h-4" />}
            loading={pushing}
            onClick={handlePush}
          >
            Push to TFT
          </HudButton>
        </div>
      </div>

      {/* Mode badges */}
      <div className="flex gap-1.5 flex-wrap mt-3">
        {DISPLAY_MODES.map((m) => (
          <button key={m.value} onClick={() => setMode(m.value)}>
            <GlowBadge
              variant={mode === m.value ? "cyan" : "ghost"}
              className="cursor-pointer hover:border-hud-cyan/50 transition-colors"
            >
              {m.label}
            </GlowBadge>
          </button>
        ))}
      </div>
    </HudCard>
  );
}
