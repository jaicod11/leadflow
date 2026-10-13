import { describe, expect, it } from "vitest";

import {
  formatFollowUp,
  formatTimeAgo,
  formatTimestamp,
  isFollowUpOverdue,
  isFollowUpToday,
} from "@/lib/dates";
import type { LeadStatus } from "@/lib/types";
import { istToApi, makeLead } from "@/test/lead-factory";

// Tuesday 13 Oct 2026, 2:00 PM in Asia/Kolkata (the timezone pinned in vitest.config.ts).
const NOW = new Date("2026-10-13T14:00:00+05:30");
const OPEN_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
];

function secondsBeforeNow(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

describe("test environment", () => {
  it("runs in Asia/Kolkata (UTC+05:30)", () => {
    expect(NOW.getTimezoneOffset()).toBe(-330);
  });
});

describe("formatTimeAgo", () => {
  it.each([
    [0, "just now"],
    [30, "just now"],
    [59, "just now"],
    [60, "1 min ago"],
    [5 * 60, "5 min ago"],
    [59 * 60, "59 min ago"],
    [60 * 60, "1 hour ago"],
    [3 * 60 * 60, "3 hours ago"],
    [23 * 60 * 60 + 59 * 60, "23 hours ago"],
    [24 * 60 * 60, "1 day ago"],
    [2 * 24 * 60 * 60, "2 days ago"],
    [45 * 24 * 60 * 60, "1 month ago"],
  ])("%i seconds ago -> %s", (seconds, expected) => {
    expect(formatTimeAgo(secondsBeforeNow(seconds), NOW)).toBe(expected);
  });

  it("parses the API's +00:00 format", () => {
    expect(formatTimeAgo(istToApi("2026-10-13T11:00:00"), NOW)).toBe(
      "3 hours ago",
    );
  });

  it("treats timestamps slightly in the future (clock skew) as just now", () => {
    expect(formatTimeAgo(secondsBeforeNow(-20), NOW)).toBe("just now");
  });
});

describe("isFollowUpToday", () => {
  it.each([
    ["2026-10-13T00:00:00", true, "00:00 today"],
    ["2026-10-13T09:00:00", true, "earlier today"],
    ["2026-10-13T18:30:00", true, "later today"],
    ["2026-10-13T23:59:00", true, "23:59 today"],
    ["2026-10-14T00:00:00", false, "00:00 tomorrow"],
    ["2026-10-12T23:59:00", false, "23:59 yesterday"],
  ])("%s -> %s (%s)", (localTime, expected) => {
    const lead = makeLead({ follow_up_at: istToApi(localTime) });
    expect(isFollowUpToday(lead, NOW)).toBe(expected);
  });

  it("uses the local calendar day, not the UTC day", () => {
    // 20:00 UTC on the 13th is 01:30 on the 14th in Kolkata: tomorrow, not today.
    const lateUtc = makeLead({ follow_up_at: "2026-10-13T20:00:00+00:00" });
    // 20:00 UTC on the 12th is 01:30 on the 13th in Kolkata: today.
    const earlyLocal = makeLead({ follow_up_at: "2026-10-12T20:00:00+00:00" });
    expect(isFollowUpToday(lateUtc, NOW)).toBe(false);
    expect(isFollowUpToday(earlyLocal, NOW)).toBe(true);
  });

  it("is false without a follow-up", () => {
    for (const status of OPEN_STATUSES) {
      expect(isFollowUpToday(makeLead({ status }), NOW)).toBe(false);
    }
  });
});

describe("isFollowUpOverdue", () => {
  it.each([
    ["2026-10-12T11:00:00", true, "yesterday"],
    ["2026-10-13T09:00:00", true, "earlier today"],
    ["2026-10-13T14:00:00", false, "exactly now"],
    ["2026-10-13T18:30:00", false, "later today"],
    ["2026-10-14T10:30:00", false, "tomorrow"],
  ])("%s -> %s (%s)", (localTime, expected) => {
    const lead = makeLead({ follow_up_at: istToApi(localTime) });
    expect(isFollowUpOverdue(lead, NOW)).toBe(expected);
  });

  it("is false without a follow-up", () => {
    expect(isFollowUpOverdue(makeLead(), NOW)).toBe(false);
  });
});

describe("a follow-up earlier today", () => {
  it("is BOTH today AND overdue", () => {
    const lead = makeLead({ follow_up_at: istToApi("2026-10-13T09:00:00") });
    expect(isFollowUpToday(lead, NOW)).toBe(true);
    expect(isFollowUpOverdue(lead, NOW)).toBe(true);
  });
});

describe("won and lost leads", () => {
  const followUps = [
    "2026-10-13T09:00:00", // earlier today
    "2026-10-13T18:30:00", // later today
    "2026-10-10T11:00:00", // days ago
  ];

  it.each(["won", "lost"] as const)(
    "%s is never today or overdue",
    (status) => {
      for (const localTime of followUps) {
        const lead = makeLead({ status, follow_up_at: istToApi(localTime) });
        expect(isFollowUpToday(lead, NOW)).toBe(false);
        expect(isFollowUpOverdue(lead, NOW)).toBe(false);
      }
    },
  );
});

describe("formatFollowUp", () => {
  it.each([
    ["2026-10-13T00:00:00", "Today at 12:00 AM"],
    ["2026-10-13T14:00:00", "Today at 2:00 PM"],
    ["2026-10-13T23:59:00", "Today at 11:59 PM"],
    ["2026-10-14T00:00:00", "Tomorrow at 12:00 AM"],
    ["2026-10-14T10:30:00", "Tomorrow at 10:30 AM"],
    ["2026-10-12T11:00:00", "Yesterday at 11:00 AM"],
    ["2026-10-12T23:59:00", "Yesterday at 11:59 PM"],
    ["2026-10-11T23:59:00", "Sun, 11 Oct at 11:59 PM"],
    ["2026-10-15T10:30:00", "Thu, 15 Oct at 10:30 AM"],
    ["2026-10-15T09:05:00", "Thu, 15 Oct at 9:05 AM"],
  ])("%s -> %s", (localTime, expected) => {
    expect(formatFollowUp(istToApi(localTime), NOW)).toBe(expected);
  });

  it.each([
    ["2026-10-13T16:30:00", "today at 4:30 PM"],
    ["2026-10-14T10:30:00", "tomorrow at 10:30 AM"],
    ["2026-10-12T11:00:00", "yesterday at 11:00 AM"],
    ["2026-10-15T10:30:00", "Thu, 15 Oct at 10:30 AM"],
  ])("mid-sentence: %s -> %s", (localTime, expected) => {
    expect(
      formatFollowUp(istToApi(localTime), NOW, { midSentence: true }),
    ).toBe(expected);
  });

  it("converts the API's UTC time to local time", () => {
    // 05:00 UTC = 10:30 in Kolkata.
    expect(formatFollowUp("2026-10-15T05:00:00+00:00", NOW)).toBe(
      "Thu, 15 Oct at 10:30 AM",
    );
  });
});

describe("formatTimestamp", () => {
  it("formats an absolute local date and time", () => {
    expect(formatTimestamp(istToApi("2026-10-13T16:30:00"))).toBe(
      "Oct 13, 4:30 PM",
    );
    // 20:00 UTC on the 12th is 01:30 on the 13th in Kolkata.
    expect(formatTimestamp("2026-10-12T20:00:00+00:00")).toBe(
      "Oct 13, 1:30 AM",
    );
  });
});
