import { useState, useEffect, useCallback } from "react";
import HudCard          from "@/components/ui/HudCard";
import HudButton        from "@/components/ui/HudButton";
import GlowBadge        from "@/components/ui/GlowBadge";
import StatusIndicator  from "@/components/ui/StatusIndicator";
import LoadingHud       from "@/components/ui/LoadingHud";
import Esp32Status      from "./Esp32Status";
import DisplayControl   from "./DisplayControl";
import { hardwareService } from "@/services/hardwareService";
import { useAppStore }     from "@/store/useAppStore";
import { timeAgo }         from "@/utils/dateHelpers";
import { ArrowPathIcon, CpuChipIcon } from "@heroicons/react/24/outline";

export default function HardwareBridge() {
  const { showToast }             = useAppStore();
  const [payload,  setPayload]    = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [pinging,  setPinging]    = useState(false);
  const [lastPoll, setLastPoll]   = useState(null);

  const fetchPayload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hardwareService.esp32Payload();
      setPayload(res.data);
      setLastPoll(new Date());
    } catch (_) {
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePing = async () => {
    setPinging(true);
    try {
      await hardwareService.esp32Ping();
      await fetchPayload();
      showToast("success", "ESP32 ping sent.");
    } catch (e) {
      showToast("error", "Ping failed: " + e.message);
    } finally {
      setPinging(false);
    }
  };

  /* Auto-poll every 30 seconds */
  useEffect(() => {
    fetchPayload();
    const id = setInterval(fetchPayload, 30_000);
    return () => clearInterval(id);
  }, [fetchPayload]);

  const device   = payload?.device   || null;
  const isOnline = device?.is_online  || false;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-hud text-lg text-hud-cyan text-glow-cyan tracking-widest uppercase">
            Hardware Bridge
          </h1>
          <div className="module-header-line" />
          <p className="mt-1 font-mono text-xs text-hud-text-dim">
            ESP32 TFT display link &amp; payload manager
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HudButton
            variant="secondary"
            size="sm"
            icon={<ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />}
            onClick={fetchPayload}
            loading={loading}
          >
            Refresh
          </HudButton>
          <HudButton
            variant={isOnline ? "success" : "ghost"}
            size="sm"
            icon={<CpuChipIcon className="w-4 h-4" />}
            loading={pinging}
            onClick={handlePing}
          >
            Ping ESP32
          </HudButton>
        </div>
      </div>

      {/* ── Connection overview ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HudCard
          className="p-4 flex items-center gap-4"
          glow={isOnline ? "green" : "red"}
        >
          <StatusIndicator
            status={isOnline ? "online" : "offline"}
            size="md"
            showLabel={false}
            pulse
          />
          <div>
            <div className={`font-hud text-sm ${isOnline ? "text-hud-green" : "text-hud-red"}`}>
              {isOnline ? "CONNECTED" : "OFFLINE"}
            </div>
            <div className="font-mono text-[9px] text-hud-text-dim mt-0.5">
              {device?.device_name || "No device"}
            </div>
          </div>
        </HudCard>

        <HudCard className="p-4" glow="blue">
          <div className="font-mono text-[9px] text-hud-text-dim mb-1 tracking-widest">
            FIRMWARE
          </div>
          <div className="font-hud text-sm text-hud-blue-lt">
            {device?.firmware_ver || "—"}
          </div>
          <div className="font-mono text-[9px] text-hud-text-dim mt-1">
            {device?.last_ping ? `Last ping: ${timeAgo(device.last_ping)}` : "Never seen"}
          </div>
        </HudCard>

        <HudCard className="p-4" glow="amber">
          <div className="font-mono text-[9px] text-hud-text-dim mb-1 tracking-widest">
            DISPLAY MODE
          </div>
          <div className="font-hud text-sm text-hud-amber">
            {device?.display_mode?.toUpperCase() || "—"}
          </div>
          <div className="font-mono text-[9px] text-hud-text-dim mt-1">
            {lastPoll ? `Polled: ${timeAgo(lastPoll)}` : "Not polled"}
          </div>
        </HudCard>
      </div>

      {/* ── Main panels ───────────────────────────────────────── */}
      {loading && !payload ? (
        <LoadingHud label="CONNECTING TO ESP32" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Esp32Status device={device} payload={payload} />
          <DisplayControl payload={payload} onRefresh={fetchPayload} />
        </div>
      )}
    </div>
  );
}