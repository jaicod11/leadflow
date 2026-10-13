import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createLead, updateLead } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query-keys";
import type { LeadCreate, LeadUpdate } from "@/lib/types";

// onSuccess returns the invalidation promise, so the mutation only settles once the
// affected queries have refetched and the list already shows the change.

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LeadCreate) => createLead(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() }),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LeadUpdate }) =>
      updateLead(id, data),
    onSuccess: (lead) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.leads.detail(lead.id),
        }),
      ]),
  });
}
