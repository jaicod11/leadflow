import { describe, expect, it } from "vitest";

import {
  getDefaultFollowUp,
  toFollowUpIso,
  validateFollowUp,
} from "@/lib/follow-up-form";

// All local times are Asia/Kolkata (UTC+05:30), the timezone pinned in vitest.config.mts.
const local = (dateTime: string) => new Date(`${dateTime}+05:30`);

describe("getDefaultFollowUp", () => {
  it.each([
    ["2026-10-13T14:00:00", { date: "2026-10-13", time: "15:00" }],
    ["2026-10-13T14:01:00", { date: "2026-10-13", time: "15:00" }],
    ["2026-10-13T14:59:59", { date: "2026-10-13", time: "15:00" }],
    ["2026-10-13T00:00:00", { date: "2026-10-13", time: "01:00" }],
    ["2026-10-13T22:59:00", { date: "2026-10-13", time: "23:00" }],
    ["2026-10-13T23:00:00", { date: "2026-10-14", time: "09:00" }], // next hour is midnight
    ["2026-10-13T23:45:00", { date: "2026-10-14", time: "09:00" }],
    ["2026-12-31T23:30:00", { date: "2027-01-01", time: "09:00" }], // year rollover
  ])("now %s -> %o", (now, expected) => {
    expect(getDefaultFollowUp(local(now))).toEqual(expected);
  });
});

describe("toFollowUpIso", () => {
  it("converts local date + time to a UTC ISO string", () => {
    expect(toFollowUpIso("2026-10-14", "11:00")).toBe(
      "2026-10-14T05:30:00.000Z",
    );
    expect(toFollowUpIso("2026-10-14", "02:00")).toBe(
      "2026-10-13T20:30:00.000Z",
    );
  });

  it.each([
    ["", "11:00"],
    ["2026-10-14", ""],
    ["2026-02-30", "11:00"], // no such day
    ["2026-10-14", "25:00"],
    ["2026-10-14", "11:60"],
    ["14/10/2026", "11:00"],
    ["2026-10-14", "11am"],
  ])("returns null for invalid input (%j, %j)", (date, time) => {
    expect(toFollowUpIso(date, time)).toBeNull();
  });
});

describe("validateFollowUp", () => {
  const NOW = local("2026-10-13T14:00:30");

  it("accepts a future date and time", () => {
    expect(validateFollowUp("2026-10-13", "14:01", NOW)).toBeNull();
    expect(validateFollowUp("2026-10-14", "11:00", NOW)).toBeNull();
  });

  it("asks for a date and time when either is missing or invalid", () => {
    expect(validateFollowUp("", "", NOW)).toBe("Pick a date and time");
    expect(validateFollowUp("2026-10-14", "", NOW)).toBe(
      "Pick a date and time",
    );
    expect(validateFollowUp("2026-02-30", "11:00", NOW)).toBe(
      "Pick a date and time",
    );
  });

  it("rejects times that are not in the future", () => {
    expect(validateFollowUp("2026-10-13", "14:00", NOW)).toBe(
      "Follow-up must be in the future",
    );
    expect(validateFollowUp("2026-10-12", "18:00", NOW)).toBe(
      "Follow-up must be in the future",
    );
  });
});
