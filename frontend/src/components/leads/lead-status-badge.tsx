import { Badge } from "@/components/ui/badge";
import {
  LEAD_STATUS_BADGE_CLASSES,
  LEAD_STATUS_LABELS,
} from "@/lib/lead-status";
import type { LeadStatus } from "@/lib/types";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge className={LEAD_STATUS_BADGE_CLASSES[status]}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
