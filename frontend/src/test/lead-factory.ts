import type { Lead } from "@/lib/types";

let nextId = 1;

/** A Lead as the API returns it, with sensible defaults. Test-only. */
export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: nextId++,
    name: "Test Lead",
    company: null,
    phone: null,
    status: "new",
    follow_up_at: null,
    created_at: "2026-10-01T09:00:00+00:00",
    updated_at: "2026-10-01T09:00:00+00:00",
    last_note: null,
    last_discussion_at: null,
    ...overrides,
  };
}

/** A local wall-clock time in Asia/Kolkata (the test timezone), serialized like the API: UTC with "+00:00". */
export function istToApi(localDateTime: string): string {
  return new Date(`${localDateTime}+05:30`)
    .toISOString()
    .replace(".000Z", "+00:00");
}
