import { useEmails }     from "@/hooks/useEmails";
import { useAppStore }   from "@/store/useAppStore";
import HudCard           from "@/components/ui/HudCard";
import HudButton         from "@/components/ui/HudButton";
import GlowBadge         from "@/components/ui/GlowBadge";
import LoadingHud        from "@/components/ui/LoadingHud";
import AccountFilter     from "./AccountFilter";
import EmailFeed         from "./EmailFeed";
import { ArrowPathIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function UnifiedComms() {
  const {
    emails, stats, loading, refreshing,
    filters, setFilters, refresh,
  } = useEmails();
  const { showToast } = useAppStore();

  const handleRefresh = async () => {
    try {
      await refresh();
      showToast("success", "Inbox refreshed.");
    } catch (e) {
      showToast("error", "Refresh failed: " + e.message);
    }
  };

  const totalUnread = stats
    ? Object.values(stats).reduce((a, b) => a + (b?.unread || 0), 0)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-hud text-lg text-hud-cyan text-glow-cyan tracking-widest uppercase">
            Unified Comms
          </h1>
          <div className="module-header-line" />
          <p className="mt-1 font-mono text-xs text-hud-text-dim">
            {totalUnread > 0 ? `${totalUnread} unread messages` : "All caught up"}
          </p>
        </div>
        <HudButton
          variant="secondary"
          icon={<ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />}
          loading={refreshing}
          onClick={handleRefresh}
        >
          Refresh
        </HudButton>
      </div>

      {/* ── Account Stats ─────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(stats).map(([account, data]) => (
            <HudCard key={account} className="p-4" glow="blue">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-hud-text-dim tracking-wider uppercase truncate">
                  {account}
                </span>
                {data.unread > 0 && (
                  <GlowBadge variant="cyan">{data.unread}</GlowBadge>
                )}
              </div>
              <div className="font-hud text-xl text-hud-cyan">{data.total || 0}</div>
              <div className="font-mono text-[9px] text-hud-text-dim tracking-widest">
                TOTAL EMAILS
              </div>
            </HudCard>
          ))}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────── */}
      <AccountFilter filters={filters} setFilters={setFilters} stats={stats} />

      {/* ── Email Feed ────────────────────────────────────────────── */}
      {loading ? (
        <LoadingHud label="SCANNING INBOX" />
      ) : (
        <EmailFeed emails={emails} />
      )}
    </div>
  );
}
