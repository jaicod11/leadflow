import type { LeadStatus } from "@/lib/types";

/** Pipeline order, used for filters and status pickers. */
export const LEAD_STATUSES: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

/** Subtle tinted background with darker text, applied on top of the shadcn Badge. */
export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  new: "border-transparent bg-blue-100 text-blue-700",
  contacted: "border-transparent bg-amber-100 text-amber-800",
  qualified: "border-transparent bg-violet-100 text-violet-700",
  proposal_sent: "border-transparent bg-cyan-100 text-cyan-800",
  won: "border-transparent bg-emerald-100 text-emerald-700",
  lost: "border-transparent bg-zinc-200 text-zinc-700",
};

/** Won and lost leads are closed: never pinned as today's follow-ups and never marked overdue. */
export function isClosedStatus(status: LeadStatus): boolean {
  return status === "won" || status === "lost";
}
