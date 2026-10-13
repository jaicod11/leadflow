import { describe, expect, it } from "vitest";

import { groupLeads } from "@/lib/lead-groups";
import { istToApi, makeLead } from "@/test/lead-factory";

// Tuesday 13 Oct 2026, 2:00 PM in Asia/Kolkata.
const NOW = new Date("2026-10-13T14:00:00+05:30");

const ids = (leads: { id: number }[]) => leads.map((lead) => lead.id);

describe("groupLeads", () => {
  // In API order (most recent activity first).
  const leads = [
    makeLead({ id: 1 }), // no follow-up
    makeLead({ id: 2, follow_up_at: istToApi("2026-10-13T16:00:00") }), // later today
    makeLead({
      id: 3,
      status: "won",
      follow_up_at: istToApi("2026-10-13T15:00:00"),
    }), // closed, today
    makeLead({ id: 4, follow_up_at: istToApi("2026-10-13T09:00:00") }), // earlier today (overdue)
    makeLead({ id: 5, follow_up_at: istToApi("2026-10-12T11:00:00") }), // overdue yesterday
    makeLead({ id: 6, follow_up_at: istToApi("2026-10-13T16:00:00") }), // later today, same time as #2
    makeLead({
      id: 7,
      status: "lost",
      follow_up_at: istToApi("2026-10-13T10:00:00"),
    }), // closed, today
    makeLead({ id: 8, follow_up_at: istToApi("2026-10-14T10:30:00") }), // tomorrow
    makeLead({ id: 9, follow_up_at: istToApi("2026-10-13T23:59:00") }), // 23:59 today
    makeLead({ id: 10, follow_up_at: istToApi("2026-10-14T00:00:00") }), // 00:00 tomorrow
  ];

  it("puts open leads with a follow-up today in `today`, earliest first", () => {
    // #4 (09:00, already due) first; #2 and #6 tie at 16:00 and keep API order; #9 at 23:59 last.
    expect(ids(groupLeads(leads, NOW).today)).toEqual([4, 2, 6, 9]);
  });

  it("keeps every other lead in API order", () => {
    expect(ids(groupLeads(leads, NOW).others)).toEqual([1, 3, 5, 7, 8, 10]);
  });

  it("puts each lead in exactly one group", () => {
    const { today, others } = groupLeads(leads, NOW);
    const all = [...ids(today), ...ids(others)];
    expect(all).toHaveLength(leads.length);
    expect(new Set(all).size).toBe(leads.length);
    expect([...all].sort((a, b) => a - b)).toEqual(ids(leads));
  });

  it("never pins won or lost leads", () => {
    const { today } = groupLeads(leads, NOW);
    expect(
      today.some((lead) => lead.status === "won" || lead.status === "lost"),
    ).toBe(false);
  });

  it("does not mutate the input", () => {
    const before = ids(leads);
    groupLeads(leads, NOW);
    expect(ids(leads)).toEqual(before);
  });

  it("handles an empty list", () => {
    expect(groupLeads([], NOW)).toEqual({ today: [], others: [] });
  });
});
