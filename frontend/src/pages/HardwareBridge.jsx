import { useState, useEffect } from "react";
import { Cpu, Wifi, RefreshCw, Send, Terminal, Activity, Code, Settings } from "lucide-react";
import Badge from "@/components/shared/Badge";
import clsx from "clsx";
import { format } from "date-fns";

const LOGS = [
  { time: "10:23:42", type: "INFO", msg: "ESP32-TFT-01 authenticated via Webhook Secret." },
  { time: "10:23:45", type: "TX",   msg: "Sent payload {mode: 'clock', tasks: 3} [200 OK]" },
  { time: "10:28:12", type: "RX",   msg: "Heartbeat received from 192.168.1.105. RSSI: -64dBm" },
  { time: "10:35:00", type: "WARN", msg: "Latency spike detected on local network (142ms)." },
  { time: "10:40:02", type: "TX",   msg: "Sent manual payload override [200 OK]" },
];

export default function HardwareBridge() {
  const [payload, setPayload] = useState('{\n  "display_mode": "HUD",\n  "line1": "JARVIS OS v2.0",\n  "line2": "Next: DSA Exam (14:00)",\n  "accent_color": "#00F5FF"\n}');
  const [isPushing, setIsPushing] = useState(false);
  const [activeTab, setActiveTab] = useState("terminal");

  const handlePush = () => {
    setIsPushing(true);
    setTimeout(() => setIsPushing(false), 800);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
    } catch(e) {
      alert("Invalid JSON format");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      <div>
        <h1 className="text-2xl font-bold text-primary">Hardware Bridge</h1>
        <p className="text-sm text-muted mt-0.5">Manage ESP32 nodes and TFT display payloads.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* ── Active Nodes ────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="nx-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-bl-full -mr-10 -mt-10 blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5 relative z-10">
              <h2 className="text-md font-semibold text-primary flex items-center gap-2">
                <Cpu size={16} className="text-accent" />
                Active Nodes
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm">
                <RefreshCw size={13} />
              </button>
            </div>

            <div className="bg-inset border border-border rounded-lg p-4 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-primary font-semibold text-sm">ESP32-TFT-01</h3>
                  <p className="text-2xs text-muted font-mono mt-0.5">192.168.1.105</p>
                </div>
                <Badge variant="green" className="font-mono text-2xs animate-pulse">
                  <Wifi size={10} className="mr-1 inline" />
                  ONLINE
                </Badge>
              </div>
              
              <div className="space-y-2 mt-4 pt-4 border-t border-border-subtle">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Display Mode</span>
                  <span className="text-primary font-medium">HUD/Tasks</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Last Ping</span>
                  <span className="text-primary">2m ago</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Firmware</span>
                  <span className="text-accent font-mono">v2.0.1</span>
                </div>
              </div>
            </div>
          </div>

          <div className="nx-card p-5">
            <h2 className="text-md font-semibold text-primary mb-4 flex items-center gap-2">
              <Activity size={16} className="text-warning-light" />
              Telemetry
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">Heap Memory</span>
                  <span className="text-primary font-mono">180 KB Free</span>
                </div>
                <div className="nx-progress h-1.5"><div className="nx-progress-fill bg-warning" style={{ width: "45%" }}/></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">Signal Strength (RSSI)</span>
                  <span className="text-primary font-mono">-64 dBm</span>
                </div>
                <div className="nx-progress h-1.5"><div className="nx-progress-fill bg-success" style={{ width: "85%" }}/></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payload & Console ──────────────────────────────────── */}
        <div className="xl:col-span-2 nx-card flex flex-col" style={{ minHeight: "500px" }}>
          
          <div className="flex items-center border-b border-border bg-subtle px-2">
            {[
              { id: "terminal", label: "Payload Dispatch", icon: Code },
              { id: "logs", label: "System Logs", icon: Terminal },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors",
                  activeTab === t.id ? "border-accent text-primary bg-surface" : "border-transparent text-secondary hover:text-primary"
                )}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "terminal" && (
            <div className="flex-1 flex flex-col p-5">
              <div className="flex justify-between items-end mb-3">
                <p className="text-xs text-muted">Inject manual JSON payloads directly to the ESP32 TFT screen.</p>
                <button onClick={formatJson} className="text-2xs text-accent hover:underline">Format JSON</button>
              </div>
              
              <div className="flex-1 bg-inset border border-border rounded-lg p-4 font-mono text-sm relative group mb-4">
                <textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="w-full h-full bg-transparent text-[#79C0FF] focus:outline-none resize-none leading-relaxed"
                  spellCheck="false"
                />
              </div>

              <div className="flex justify-end flex-shrink-0">
                <button 
                  onClick={handlePush}
                  disabled={isPushing}
                  className="btn btn-primary gap-2 w-40"
                >
                  {isPushing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {isPushing ? "Transmitting..." : "Send Payload"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="flex-1 bg-inset p-4 overflow-y-auto font-mono text-xs rounded-b-lg">
              {LOGS.map((log, i) => (
                <div key={i} className="flex gap-3 mb-2 hover:bg-white/5 px-2 py-1 rounded">
                  <span className="text-muted flex-shrink-0">[{log.time}]</span>
                  <span className={clsx(
                    "flex-shrink-0 w-10",
                    log.type === "INFO" ? "text-accent" :
                    log.type === "TX"   ? "text-success" :
                    log.type === "RX"   ? "text-purple-400" :
                    "text-warning"
                  )}>
                    {log.type}
                  </span>
                  <span className="text-primary">{log.msg}</span>
                </div>
              ))}
              <div className="flex gap-3 mt-4 px-2 py-1">
                <span className="text-accent animate-pulse">_</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}