import { useState, useEffect }  from "react";
import HudCard                  from "@/components/ui/HudCard";
import HudButton                from "@/components/ui/HudButton";
import HudModal                 from "@/components/ui/HudModal";
import HudInput                 from "@/components/ui/HudInput";
import HudSelect                from "@/components/ui/HudSelect";
import GlowBadge                from "@/components/ui/GlowBadge";
import LoadingHud               from "@/components/ui/LoadingHud";
import { hardwareService }      from "@/services/hardwareService";
import { useAppStore }          from "@/store/useAppStore";
import { PlusIcon, CpuChipIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const STATUS_OPTIONS = ["available","in_use","low_stock","out_of_stock","damaged"].map(
  (s) => ({ value: s, label: s.toUpperCase().replace("_", " ") })
);

export default function HardwareInventory() {
  const { showToast }           = useAppStore();
  const [items,   setItems]     = useState([]);
  const [stats,   setStats]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [search,  setSearch]    = useState("");

  const [form, setForm] = useState({
    component_name: "", model_number: "", quantity: 1,
    unit: "pcs", status: "available", location: "", price_inr: "",
  });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fetch = async () => {
    setLoading(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        hardwareService.list({ search }),
        hardwareService.stats(),
      ]);
      setItems(itemsRes.data.items || itemsRes.data);
      setStats(statsRes.data);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line

  const handleAdd = async () => {
    if (!form.component_name.trim()) return;
    try {
      await hardwareService.create({ ...form, quantity: Number(form.quantity) });
      showToast("success", "Component added.");
      setShowAdd(false);
      setForm({ component_name: "", model_number: "", quantity: 1, unit: "pcs", status: "available", location: "", price_inr: "" });
      fetch();
    } catch (e) { showToast("error", e.message); }
  };

  const handleQty = async (id, delta) => {
    try {
      await hardwareService.updateQty(id, delta);
      fetch();
    } catch (e) { showToast("error", e.message); }
  };

  const filtered = items.filter((i) =>
    i.component_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "COMPONENTS", value: stats.total_components || 0, color: "cyan"  },
            { label: "TOTAL UNITS",value: stats.total_quantity   || 0, color: "blue"  },
            { label: "LOW STOCK",  value: stats.low_stock_count  || 0, color: "amber" },
            { label: "VALUE (₹)",  value: stats.total_value_inr  || "—", color: "green"},
          ].map((s) => (
            <HudCard key={s.label} className="p-3 text-center" glow={s.color}>
              <div className={`font-hud text-xl ${
                s.color === "cyan" ? "text-hud-cyan" :
                s.color === "blue" ? "text-hud-blue-lt" :
                s.color === "amber"? "text-hud-amber" : "text-hud-green"
              }`}>{s.value}</div>
              <div className="font-mono text-[9px] text-hud-text-dim mt-1 tracking-widest">
                {s.label}
              </div>
            </HudCard>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <HudInput
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <HudButton
          size="sm"
          icon={<PlusIcon className="w-4 h-4" />}
          onClick={() => setShowAdd(true)}
        >
          Add Component
        </HudButton>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingHud label="SCANNING INVENTORY" />
      ) : (
        <HudCard className="overflow-hidden" glow="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hud-border bg-hud-bg-3">
                  {["Component","Model","Qty","Unit","Status","Location","Price"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 font-mono text-[9px]
                                 text-hud-text-dim tracking-widest uppercase"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 font-mono text-xs text-hud-text-dim">
                      NO COMPONENTS IN INVENTORY
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-hud-border/30 hover:bg-hud-bg-3/50 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <CpuChipIcon className="w-3.5 h-3.5 text-hud-text-dim shrink-0" />
                          <span className="text-hud-text font-sans text-xs">{item.component_name}</span>
                          {item.status === "low_stock" && (
                            <ExclamationTriangleIcon className="w-3 h-3 text-hud-amber" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-hud-text-dim">
                        {item.model_number || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQty(item.id, -1)}
                            className="w-5 h-5 rounded border border-hud-border text-hud-text-dim
                                       hover:border-hud-red hover:text-hud-red transition-colors text-xs"
                          >−</button>
                          <span className="font-mono text-xs text-hud-cyan w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQty(item.id, 1)}
                            className="w-5 h-5 rounded border border-hud-border text-hud-text-dim
                                       hover:border-hud-green hover:text-hud-green transition-colors text-xs"
                          >+</button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-hud-text-dim">
                        {item.unit}
                      </td>
                      <td className="px-4 py-2.5">
                        <GlowBadge
                          variant={
                            item.status === "available"    ? "green" :
                            item.status === "low_stock"    ? "amber" :
                            item.status === "out_of_stock" ? "red"   :
                            item.status === "in_use"       ? "cyan"  : "ghost"
                          }
                        >
                          {item.status?.replace("_", " ")}
                        </GlowBadge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-hud-text-dim">
                        {item.location || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-hud-text-dim">
                        {item.price_inr ? `₹${item.price_inr}` : "—"}
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </HudCard>
      )}

      {/* Add Modal */}
      <HudModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Component"
        subtitle="Register a hardware component to inventory"
        footer={
          <>
            <HudButton variant="ghost" onClick={() => setShowAdd(false)}>Cancel</HudButton>
            <HudButton onClick={handleAdd}>Add Component</HudButton>
          </>
        }
      >
        <div className="space-y-4">
          <HudInput
            label="Component Name *"
            placeholder="e.g. ESP32 DevKit V1"
            value={form.component_name}
            onChange={(e) => setF("component_name", e.target.value)}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <HudInput
              label="Model Number"
              placeholder="e.g. ESP32-WROOM-32"
              value={form.model_number}
              onChange={(e) => setF("model_number", e.target.value)}
            />
            <HudInput
              label="Location"
              placeholder="e.g. Drawer A-2"
              value={form.location}
              onChange={(e) => setF("location", e.target.value)}
            />
            <HudInput
              label="Quantity"
              type="number" min="0"
              value={form.quantity}
              onChange={(e) => setF("quantity", e.target.value)}
            />
            <HudInput
              label="Unit"
              placeholder="pcs / m / kg"
              value={form.unit}
              onChange={(e) => setF("unit", e.target.value)}
            />
            <HudSelect
              label="Status"
              value={form.status}
              onChange={(e) => setF("status", e.target.value)}
              options={STATUS_OPTIONS}
            />
            <HudInput
              label="Price (₹)"
              type="number" min="0"
              placeholder="0.00"
              value={form.price_inr}
              onChange={(e) => setF("price_inr", e.target.value)}
            />
          </div>
        </div>
      </HudModal>
    </div>
  );
}
