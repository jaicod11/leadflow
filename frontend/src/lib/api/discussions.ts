import { apiFetch } from "@/lib/api/client";
import type { Discussion, DiscussionCreate } from "@/lib/types";

/** Newest first (created_at DESC, id DESC), as returned by the API. */
export function listDiscussions(
  leadId: number,
  signal?: AbortSignal,
): Promise<Discussion[]> {
  return apiFetch<Discussion[]>(`/leads/${leadId}/discussions`, { signal });
}

export function createDiscussion(
  leadId: number,
  data: DiscussionCreate,
): Promise<Discussion> {
  return apiFetch<Discussion>(`/leads/${leadId}/discussions`, {
    method: "POST",
    body: data,
  });
}
