// Mirrors the backend Pydantic schemas in backend/app/schemas/ exactly (snake_case, same nullability).

/** ISO 8601 datetime string. Responses are always UTC with an explicit offset, e.g. "2026-10-14T10:00:00+00:00". */
export type IsoDateTime = string;

/** backend/app/models/lead.py: LeadStatus */
export type LeadStatus =
  "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";

/** backend/app/schemas/lead.py: LeadRead */
export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  follow_up_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  /** Note of the most recent discussion, or null if there are none. */
  last_note: string | null;
  /** created_at of the most recent discussion, or null if there are none. */
  last_discussion_at: IsoDateTime | null;
}

/** backend/app/schemas/lead.py: LeadCreate. There is no status: new leads are always "new". */
export interface LeadCreate {
  name: string;
  company?: string | null;
  phone?: string | null;
}

/**
 * backend/app/schemas/lead.py: LeadUpdate. Only the fields sent are applied; `{}` is rejected (400).
 * `name` and `status` may be omitted but never null. `follow_up_at: null` clears the follow-up.
 */
export interface LeadUpdate {
  name?: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
  /** Must include a timezone offset; more than 60 s in the past is rejected (400). */
  follow_up_at?: IsoDateTime | null;
}

/** backend/app/schemas/discussion.py: DiscussionRead */
export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  follow_up_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

/** backend/app/schemas/discussion.py: DiscussionCreate */
export interface DiscussionCreate {
  note: string;
  /** Must include a timezone offset; more than 60 s in the past is rejected (400). */
  follow_up_at?: IsoDateTime | null;
}
