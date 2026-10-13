import { describe, expect, it } from "vitest";

import { matchesLeadFilters } from "@/lib/lead-filters";

const newLead = { name: "Ananya Sharma", status: "new" } as const;

describe("matchesLeadFilters", () => {
  it("matches when no filters are active", () => {
    expect(matchesLeadFilters(newLead, {})).toBe(true);
    expect(matchesLeadFilters(newLead, { search: "   " })).toBe(true);
  });

  it("matches the status filter exactly", () => {
    expect(matchesLeadFilters(newLead, { status: "new" })).toBe(true);
    expect(matchesLeadFilters(newLead, { status: "qualified" })).toBe(false);
  });

  it("matches the search as a trimmed, case-insensitive substring of the name", () => {
    expect(matchesLeadFilters(newLead, { search: "SHAR" })).toBe(true);
    expect(matchesLeadFilters(newLead, { search: " nya s " })).toBe(true);
    expect(matchesLeadFilters(newLead, { search: "Priya" })).toBe(false);
  });

  it("requires both filters to match", () => {
    expect(matchesLeadFilters(newLead, { status: "new", search: "ana" })).toBe(
      true,
    );
    expect(matchesLeadFilters(newLead, { status: "won", search: "ana" })).toBe(
      false,
    );
  });
});
