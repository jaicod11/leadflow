import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateLead } from "@/hooks/use-lead-mutations";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/lead-status";
import type { Lead, LeadStatus } from "@/lib/types";

/** Changes the lead's status immediately (PATCH). Disabled while saving. */
export function LeadStatusSelect({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead();
  // While saving, show the chosen status; afterwards the server's value (which reverts it on error).
  const value = updateLead.isPending
    ? (updateLead.variables.data.status ?? lead.status)
    : lead.status;

  function changeStatus(status: LeadStatus) {
    if (status === lead.status) return;
    updateLead.mutate(
      { id: lead.id, data: { status } },
      {
        onSuccess: () =>
          toast.success(`Status updated to ${LEAD_STATUS_LABELS[status]}`),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(next) => changeStatus(next as LeadStatus)}
      disabled={updateLead.isPending}
    >
      <SelectTrigger
        size="sm"
        aria-label="Lead status"
        className="w-36 bg-white"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {LEAD_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {LEAD_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
