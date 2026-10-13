import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listLeads, type LeadListParams } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query-keys";

export function useLeads({ status, search }: LeadListParams = {}) {
  // Normalize so "", "  " and undefined share one cache entry (the API treats them all as "no filter").
  const params: LeadListParams = {
    status,
    search: search?.trim() || undefined,
  };

  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: ({ signal }) => listLeads(params, signal),
    // Keep showing the previous results while a new filter/search loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}
