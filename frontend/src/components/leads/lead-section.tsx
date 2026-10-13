import { LoaderCircle } from "lucide-react";
import { useId, type ReactNode } from "react";

import { LeadCard } from "@/components/leads/lead-card";
import type { Lead } from "@/lib/types";

interface LeadSectionProps {
  title: string;
  icon: ReactNode;
  leads: Lead[];
  now: Date;
  onSelect: (leadId: number) => void;
  /** Shows a small spinner next to the count while the list refetches in the background. */
  isRefreshing: boolean;
}

/** A titled group of lead cards, e.g. "TODAY'S FOLLOW-UPS · 3". Not rendered when empty. */
export function LeadSection({
  title,
  icon,
  leads,
  now,
  onSelect,
  isRefreshing,
}: LeadSectionProps) {
  const headingId = useId();
  if (leads.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {icon}
        <span>
          {title} · {leads.length}
        </span>
        {isRefreshing && (
          <>
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            <span className="sr-only">Refreshing</span>
          </>
        )}
      </h2>
      <ul className="space-y-3">
        {leads.map((lead) => (
          <li key={lead.id}>
            <LeadCard lead={lead} now={now} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  );
}
