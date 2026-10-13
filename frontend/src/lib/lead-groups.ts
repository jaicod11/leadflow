import { isFollowUpToday } from "@/lib/dates";
import type { Lead } from "@/lib/types";

export interface LeadGroups {
  /** Open leads with a follow-up today, earliest first (so items already due today come first). */
  today: Lead[];
  /** Every other lead, in the order the API returned them (most recent activity first). */
  others: Lead[];
}

/** Splits leads into today's follow-ups and the rest. Each lead lands in exactly one group. */
export function groupLeads(leads: readonly Lead[], now: Date): LeadGroups {
  const today: Lead[] = [];
  const others: Lead[] = [];
  for (const lead of leads) {
    (isFollowUpToday(lead, now) ? today : others).push(lead);
  }
  // Array.prototype.sort is stable, so equal follow-up times keep the API order.
  today.sort((a, b) => followUpTime(a) - followUpTime(b));
  return { today, others };
}

function followUpTime(lead: Lead): number {
  return lead.follow_up_at === null
    ? Number.POSITIVE_INFINITY
    : Date.parse(lead.follow_up_at);
}
