import { LeadFollowUpChip } from "@/components/leads/lead-follow-up-chip";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { formatTimeAgo, isFollowUpOverdue, isFollowUpToday } from "@/lib/dates";
import { isClosedStatus } from "@/lib/lead-status";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  now: Date;
  onSelect: (leadId: number) => void;
}

// Overdue takes precedence over today; closed (won/lost) leads are never today or overdue.
// pl-[13px] offsets the 4px left accent border so text lines up with the other cards.
const TONE_CLASSES = {
  overdue:
    "border-red-200 border-l-4 border-l-red-500 bg-red-50/70 pl-[13px] hover:bg-red-50",
  today: "border-blue-200 bg-blue-50/70 hover:bg-blue-50",
  default: "bg-white hover:bg-neutral-50",
} as const;

export function LeadCard({ lead, now, onSelect }: LeadCardProps) {
  const tone = isFollowUpOverdue(lead, now)
    ? "overdue"
    : isFollowUpToday(lead, now)
      ? "today"
      : "default";

  return (
    <button
      type="button"
      onClick={() => onSelect(lead.id)}
      className={cn(
        "block w-full rounded-xl border p-4 text-left shadow-xs transition-[background-color,box-shadow,opacity] outline-none hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-blue-500/50",
        TONE_CLASSES[tone],
        isClosedStatus(lead.status) && "opacity-60 hover:opacity-80",
      )}
    >
      <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <span className="min-w-0 wrap-break-word">
          <span className="font-semibold">{lead.name}</span>
          {lead.company && (
            <span className="text-muted-foreground"> ({lead.company})</span>
          )}
        </span>
        <LeadStatusBadge status={lead.status} />
      </span>

      <LastActivity lead={lead} now={now} />
      <LeadFollowUpChip lead={lead} now={now} className="mt-2.5" />
    </button>
  );
}

function LastActivity({ lead, now }: { lead: Lead; now: Date }) {
  if (lead.last_note === null || lead.last_discussion_at === null) {
    return (
      <span className="mt-1.5 block text-sm text-muted-foreground italic">
        No discussions yet · Added {formatTimeAgo(lead.created_at, now)}
      </span>
    );
  }

  return (
    <span className="mt-1.5 flex min-w-0 items-baseline gap-1 text-sm">
      <span className="shrink-0 text-muted-foreground">Last note:</span>
      <span className="line-clamp-1 min-w-0 wrap-break-word text-neutral-700">
        {lead.last_note}
      </span>
      <span className="shrink-0 whitespace-nowrap text-muted-foreground">
        · {formatTimeAgo(lead.last_discussion_at, now)}
      </span>
    </span>
  );
}
