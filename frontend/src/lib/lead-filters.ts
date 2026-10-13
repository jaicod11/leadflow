import type { LeadListParams } from "@/lib/api/leads";
import type { Lead } from "@/lib/types";

/**
 * Whether the lead would be in the list for these filters, mirroring the API:
 * exact status match, and `search` as a trimmed, case-insensitive substring of the name.
 */
export function matchesLeadFilters(
  lead: Pick<Lead, "name" | "status">,
  { status, search }: LeadListParams,
): boolean {
  if (status !== undefined && lead.status !== status) return false;
  const term = search?.trim().toLowerCase() ?? "";
  return term === "" || lead.name.toLowerCase().includes(term);
}
