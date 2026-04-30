import clsx from "clsx";

const READ_OPTIONS = [
  { value: "",      label: "All"    },
  { value: "false", label: "Unread" },
  { value: "true",  label: "Read"   },
];

const ACTION_OPTIONS = [
  { value: "",                label: "All Actions"    },
  { value: "REPLY_NEEDED",    label: "Reply Needed"   },
  { value: "ACTION_REQUIRED", label: "Action Req."    },
  { value: "READ_ONLY",       label: "Read Only"      },
  { value: "FYI",             label: "FYI"            },
];

export default function AccountFilter({ filters, setFilters, stats }) {
  const accounts = stats ? Object.keys(stats) : [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Account pills */}
      <button
        onClick={() => setFilters({ account: "" })}
        className={clsx(
          "px-3 py-1.5 rounded border font-mono text-[10px] tracking-wider uppercase transition-all",
          !filters.account
            ? "border-hud-cyan bg-hud-blue/20 text-hud-cyan"
            : "border-hud-border text-hud-text-dim hover:border-hud-cyan/50"
        )}
      >
        All Accounts
      </button>
      {accounts.map((acc) => (
        <button
          key={acc}
          onClick={() => setFilters({ account: acc })}
          className={clsx(
            "px-3 py-1.5 rounded border font-mono text-[10px] tracking-wider uppercase transition-all",
            filters.account === acc
              ? "border-hud-cyan bg-hud-blue/20 text-hud-cyan"
              : "border-hud-border text-hud-text-dim hover:border-hud-cyan/50"
          )}
        >
          {acc}
        </button>
      ))}

      <div className="w-px h-5 bg-hud-border mx-1" />

      {/* Read filter */}
      {READ_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setFilters({ is_read: opt.value })}
          className={clsx(
            "px-3 py-1.5 rounded border font-mono text-[10px] tracking-wider transition-all",
            filters.is_read === opt.value
              ? "border-hud-cyan bg-hud-blue/20 text-hud-cyan"
              : "border-hud-border text-hud-text-dim hover:border-hud-cyan/50"
          )}
        >
          {opt.label}
        </button>
      ))}

      <div className="w-px h-5 bg-hud-border mx-1" />

      {/* Action filter */}
      <select
        value={filters.action_hint}
        onChange={(e) => setFilters({ action_hint: e.target.value })}
        className="bg-hud-bg border border-hud-border rounded px-2 py-1.5
                   font-mono text-[10px] text-hud-text-dim tracking-wider
                   focus:border-hud-cyan focus:outline-none transition-colors
                   [&>option]:bg-hud-bg-2"
      >
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
