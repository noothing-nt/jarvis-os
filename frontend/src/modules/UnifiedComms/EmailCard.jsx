import clsx                  from "clsx";
import HudCard               from "@/components/ui/HudCard";
import GlowBadge             from "@/components/ui/GlowBadge";
import { EMAIL_ACTION_MAP }  from "@/utils/statusColors";
import { timeAgo }           from "@/utils/dateHelpers";
import { useCommsStore }     from "@/store/useCommsStore";
import { EnvelopeIcon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";

export default function EmailCard({ email, selected, onSelect, style }) {
  const { markRead } = useCommsStore();
  const actionCfg    = EMAIL_ACTION_MAP[email.ai_action_hint] || EMAIL_ACTION_MAP.FYI;

  const handleClick = () => {
    onSelect();
    if (!email.is_read) markRead(email.id);
  };

  return (
    <HudCard
      className={clsx(
        "p-4 cursor-pointer card-entry transition-all",
        !email.is_read && "border-hud-cyan/30"
      )}
      glow={!email.is_read ? "cyan" : "none"}
      active={selected}
      onClick={handleClick}
      style={style}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {email.is_read
            ? <EnvelopeOpenIcon className="w-4 h-4 text-hud-text-dim shrink-0" />
            : <EnvelopeIcon     className="w-4 h-4 text-hud-cyan shrink-0" />
          }
          <span className={clsx(
            "text-xs font-sans truncate",
            email.is_read ? "text-hud-text-dim" : "text-hud-text font-medium"
          )}>
            {email.sender_name || email.sender_email}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GlowBadge
            variant={
              email.ai_action_hint === "REPLY_NEEDED"    ? "amber" :
              email.ai_action_hint === "ACTION_REQUIRED" ? "red"   :
              email.ai_action_hint === "READ_ONLY"       ? "cyan"  :
              "ghost"
            }
          >
            {actionCfg.label}
          </GlowBadge>
          <span className="font-mono text-[9px] text-hud-text-dim">
            {timeAgo(email.received_at)}
          </span>
        </div>
      </div>

      {/* Subject */}
      <p className={clsx(
        "text-xs mb-2 leading-snug",
        email.is_read ? "text-hud-text-dim" : "text-hud-text"
      )}>
        {email.subject}
      </p>

      {/* AI Summary */}
      {email.ai_summary && (
        <div className="px-2 py-1.5 rounded bg-hud-blue/10 border border-hud-blue/20">
          <p className="font-mono text-[9px] text-hud-cyan mb-0.5 tracking-widest">✦ AI</p>
          <p className="text-[11px] text-hud-text-dim font-sans leading-relaxed">
            {email.ai_summary}
          </p>
        </div>
      )}

      {/* Expanded: raw snippet */}
      {selected && email.raw_snippet && (
        <div className="mt-3 pt-3 border-t border-hud-border/50">
          <p className="font-mono text-[9px] text-hud-text-dim tracking-widest mb-1">SNIPPET</p>
          <p className="text-xs text-hud-text-dim font-sans leading-relaxed whitespace-pre-wrap">
            {email.raw_snippet.slice(0, 500)}
            {email.raw_snippet.length > 500 ? "…" : ""}
          </p>
        </div>
      )}

      {/* Account label */}
      <div className="mt-2 flex justify-end">
        <span className="font-mono text-[9px] text-hud-text-dim">
          {email.account_label || email.account_email}
        </span>
      </div>
    </HudCard>
  );
}
