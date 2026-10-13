import { Phone, XIcon } from "lucide-react";
import { toast } from "sonner";

import { LeadFollowUpChip } from "@/components/leads/lead-follow-up-chip";
import { LeadStatusSelect } from "@/components/leads/timeline/lead-status-select";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateLead } from "@/hooks/use-lead-mutations";
import { isClosedStatus } from "@/lib/lead-status";
import type { Lead } from "@/lib/types";

interface TimelineHeaderProps {
  lead: Lead;
  now: Date;
}

export function TimelineHeader({ lead, now }: TimelineHeaderProps) {
  return (
    <div className="border-b px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-1">
          <DialogTitle className="text-lg leading-snug font-semibold wrap-break-word">
            {lead.name}
            {lead.company && (
              <span className="font-normal text-muted-foreground">
                {" "}
                ({lead.company})
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Discussion history, follow-up and status for {lead.name}.
          </DialogDescription>
          {lead.phone && (
            <a
              href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <Phone className="size-3.5" aria-hidden />
              {lead.phone}
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <LeadStatusSelect lead={lead} />
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <XIcon />
            </Button>
          </DialogClose>
        </div>
      </div>
      <ActiveFollowUp lead={lead} now={now} />
    </div>
  );
}

/** The open follow-up (same chip as the list) with a "Mark done" action that clears it. */
function ActiveFollowUp({ lead, now }: TimelineHeaderProps) {
  const updateLead = useUpdateLead();
  if (lead.follow_up_at === null || isClosedStatus(lead.status)) return null;

  function markDone() {
    updateLead.mutate(
      { id: lead.id, data: { follow_up_at: null } },
      {
        onSuccess: () => toast.success("Follow-up cleared"),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <LeadFollowUpChip lead={lead} now={now} />
      <button
        type="button"
        onClick={markDone}
        disabled={updateLead.isPending}
        className="rounded-sm text-xs font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {updateLead.isPending ? "Clearing…" : "Mark done"}
      </button>
    </div>
  );
}
