import type { LeadListParams } from "@/lib/api/leads";

const LEADS = ["leads"] as const;
const DISCUSSIONS = ["discussions"] as const;

/**
 * Hierarchical query keys, so invalidating a prefix refreshes everything below it:
 * leads.all ⊃ leads.lists() ⊃ leads.list(params), and leads.all ⊃ leads.detail(id).
 */
export const queryKeys = {
  leads: {
    all: LEADS,
    lists: () => [...LEADS, "list"] as const,
    list: (params: LeadListParams) => [...LEADS, "list", params] as const,
    detail: (id: number | null) => [...LEADS, "detail", id] as const,
  },
  discussions: {
    all: DISCUSSIONS,
    byLead: (leadId: number | null) =>
      [...DISCUSSIONS, "byLead", leadId] as const,
  },
  auth: {
    /** The signed-in user (GET /auth/me). */
    me: ["auth", "me"] as const,
  },
};
