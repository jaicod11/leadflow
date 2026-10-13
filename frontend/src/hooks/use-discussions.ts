import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createDiscussion, listDiscussions } from "@/lib/api/discussions";
import { queryKeys } from "@/lib/query-keys";
import type { DiscussionCreate } from "@/lib/types";

/** A lead's discussions, newest first. Disabled (no request) while leadId is null. */
export function useDiscussions(leadId: number | null) {
  return useQuery({
    queryKey: queryKeys.discussions.byLead(leadId),
    queryFn:
      leadId === null
        ? skipToken
        : ({ signal }) => listDiscussions(leadId, signal),
  });
}

export function useCreateDiscussion(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DiscussionCreate) => createDiscussion(leadId, data),
    // A new discussion changes the timeline, the lead's last note/follow-up, and list ordering.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.discussions.byLead(leadId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.leads.detail(leadId),
        }),
      ]),
  });
}
