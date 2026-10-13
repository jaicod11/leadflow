import { CalendarClock, CircleAlert, Clock } from "lucide-react";

import {
  formatFollowUp,
  isFollowUpOverdue,
  isFollowUpToday,
} from "@/lib/dates";
import { isClosedStatus } from "@/lib/lead-status";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHIP_CLASSES =
  "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium";

interface LeadFollowUpChipProps {
  lead: Lead;
  now: Date;
  className?: string;
}

/**
 * The lead's next follow-up: red when overdue, blue when later today, gray when in the future.
 * Renders nothing when there is no follow-up or the lead is closed (won/lost).
 */
export function LeadFollowUpChip({
  lead,
  now,
  className,
}: LeadFollowUpChipProps) {
  if (lead.follow_up_at === null || isClosedStatus(lead.status)) return null;

  const when = formatFollowUp(lead.follow_up_at, now, { midSentence: true });

  if (isFollowUpOverdue(lead, now)) {
    return (
      <span className={cn(CHIP_CLASSES, "bg-red-100 text-red-700", className)}>
        <CircleAlert className="size-3.5" aria-hidden />
        Overdue · due {when}
      </span>
    );
  }

  if (isFollowUpToday(lead, now)) {
    return (
      <span
        className={cn(CHIP_CLASSES, "bg-blue-100 text-blue-700", className)}
      >
        <Clock className="size-3.5" aria-hidden />
        Follow-up {when}
      </span>
    );
  }

  return (
    <span
      className={cn(CHIP_CLASSES, "bg-neutral-100 text-neutral-600", className)}
    >
      <CalendarClock className="size-3.5" aria-hidden />
      Follow-up {when}
    </span>
  );
}
