import { useState }      from "react";
import EmailCard         from "./EmailCard";
import HudCard           from "@/components/ui/HudCard";
import { EnvelopeOpenIcon } from "@heroicons/react/24/outline";

export default function EmailFeed({ emails = [] }) {
  const [selected, setSelected] = useState(null);

  if (emails.length === 0) {
    return (
      <HudCard className="p-12 text-center" glow="none">
        <EnvelopeOpenIcon className="w-8 h-8 text-hud-text-dim mx-auto mb-2" />
        <p className="font-mono text-xs text-hud-text-dim tracking-wider">
          INBOX EMPTY — SYSTEM CLEAR
        </p>
      </HudCard>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {emails.map((email, i) => (
        <EmailCard
          key={email.id}
          email={email}
          selected={selected === email.id}
          onSelect={() => setSelected(selected === email.id ? null : email.id)}
          style={{ animationDelay: `${i * 0.04}s` }}
        />
      ))}
    </div>
  );
}
