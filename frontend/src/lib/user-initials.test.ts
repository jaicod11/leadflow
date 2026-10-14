import { describe, expect, it } from "vitest";

import { getInitials } from "@/lib/user-initials";

describe("getInitials", () => {
  it.each([
    ["Demo User", "DU"],
    ["ana rao", "AR"],
    ["Priya Raghavan Iyer", "PI"],
    ["Ananya", "A"],
    ["  Thomas   Brennan  ", "TB"],
    ["Élodie Durand", "ÉD"],
    ["😀 Smile", "😀S"],
    ["", "?"],
    ["   ", "?"],
  ])("%j -> %j", (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});
