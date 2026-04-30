import HudCard        from "@/components/ui/HudCard";
import GlowBadge      from "@/components/ui/GlowBadge";
import StatusIndicator from "@/components/ui/StatusIndicator";
import { timeAgo, formatDate } from "@/utils/dateHelpers";
import { CpuChipIcon, WifiIcon, ClockIcon } from "@heroicons/react/24/outline";

function InfoRow({ label, value, valueClass = "text-hud-text" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-hud-border/30 last:border-0">
      <span className="font-mono text-[9px] text-hud-text-dim tracking-widest uppercase">
        {label}
      </span>
      <span className={`font-mono text-[10px] ${valueClass}`}>{value || "—"}</span>
    </div>
  );
}

export default function Esp32Status({ device, payload }) {
  const isOnline = device?.is_online || false;

  return (
    <HudCard className="p-4" glow={isOnline ? "green" : "none"}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CpuChipIcon className="w-4 h-4 text-hud-cyan" />
        <span className="font-hud text-[10px] text-hud-text-dim tracking-widest uppercase">
          Device Status
        </span>
        <div className="ml-auto">
          <StatusIndicator
            status={isOnline ? "online" : "offline"}
            size="sm"
            pulse={isOnline}
          />
        </div>
      </div>

      {/* Device info */}
      <InfoRow label="Device ID"     value={device?.device_id}     />
      <InfoRow label="Device Name"   value={device?.device_name}   />
      <InfoRow label="Firmware"      value={device?.firmware_ver}  valueClass="text-hud-cyan" />
      <InfoRow label="Display Mode"  value={device?.display_mode?.toUpperCase()} valueClass="text-hud-amber" />
      <InfoRow label="Last Ping"     value={device?.last_ping ? timeAgo(device.last_ping) : "Never"} />

      {/* Payload preview */}
      {payload?.display_lines && (
        <div className="mt-4">
          <div className="font-mono text-[9px] text-hud-text-dim tracking-widest mb-2">
            CURRENT DISPLAY PAYLOAD
          </div>
          <div className="rounded bg-black/40 border border-hud-border p-3 space-y-1
                          font-mono text-xs text-hud-cyan relative overflow-hidden">
            <div className="scan-line opacity-30" />
            {payload.display_lines.map((line, i) => (
              <div key={i} className="truncate">
                <span className="text-hud-text-dim mr-2">{`L${i + 1}:`}</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON toggle */}
      {device?.current_payload && (
        <details className="mt-3">
          <summary className="font-mono text-[9px] text-hud-text-dim tracking-widest
                              cursor-pointer hover:text-hud-cyan transition-colors">
            RAW PAYLOAD JSON ▶
          </summary>
          <pre className="mt-2 p-2 rounded bg-black/30 border border-hud-border
                          text-[9px] font-mono text-hud-text-dim overflow-x-auto max-h-32">
            {JSON.stringify(device.current_payload, null, 2)}
          </pre>
        </details>
      )}
    </HudCard>
  );
}
