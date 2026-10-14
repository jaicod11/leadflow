import { describe, expect, it } from "vitest";

import { getSafeRedirect } from "@/lib/auth/safe-redirect";

describe("getSafeRedirect", () => {
  it.each(["/", "/?status=qualified", "/?status=qualified&q=pri", "/login"])(
    "keeps the same-site path %j",
    (next) => {
      expect(getSafeRedirect(next)).toBe(next);
    },
  );

  it.each([
    ["https://evil.com", "absolute URL"],
    ["http://evil.com/?status=qualified", "absolute http URL"],
    ["//evil.com", "protocol-relative URL"],
    ["/\\evil.com", "backslash trick"],
    ["javascript:alert(1)", "javascript: URL"],
    ["evil.com", "no leading slash"],
    ["/\t/evil.com", "tab that browsers strip"],
    ["/\n/evil.com", "newline that browsers strip"],
    ["", "empty"],
  ])("falls back to / for %j (%s)", (next) => {
    expect(getSafeRedirect(next)).toBe("/");
  });

  it("falls back to / for a missing value", () => {
    expect(getSafeRedirect(null)).toBe("/");
    expect(getSafeRedirect(undefined)).toBe("/");
  });
});
