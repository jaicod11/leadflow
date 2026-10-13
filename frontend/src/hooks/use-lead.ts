import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

import { getLead } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query-keys";
import type { Lead } from "@/lib/types";

/**
 * A single lead. Disabled (no request) while id is null.
 *
 * Seeded from any cached lead list that contains the lead, so a dialog header renders instantly.
 * The seed is marked as stale (updated at 0), so the lead is still refetched in the background.
 */
export function useLead(id: number | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: id === null ? skipToken : ({ signal }) => getLead(id, signal),
    initialData: () => {
      if (id === null) return undefined;
      const lists = queryClient.getQueriesData<Lead[]>({
        queryKey: queryKeys.leads.lists(),
      });
      for (const [, leads] of lists) {
        const lead = leads?.find((candidate) => candidate.id === id);
        if (lead) return lead;
      }
      return undefined;
    },
    initialDataUpdatedAt: 0,
  });
}
