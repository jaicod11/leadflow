import { describe, expect, it } from "vitest";

import { buildLoginUrl } from "@/lib/auth/login-url";

describe("buildLoginUrl", () => {
  it("sends a logged-out visitor to /login with the page to return to", () => {
    expect(buildLoginUrl("/", null)).toBe("/login?next=%2F");
    expect(buildLoginUrl("/?status=qualified&q=pri", null)).toBe(
      "/login?next=%2F%3Fstatus%3Dqualified%26q%3Dpri",
    );
  });

  it("flags an expired session", () => {
    expect(buildLoginUrl("/?status=won", "expired")).toBe(
      "/login?next=%2F%3Fstatus%3Dwon&expired=1",
    );
  });

  it("uses plain /login after a deliberate logout", () => {
    expect(buildLoginUrl("/?status=won", "logout")).toBe("/login");
  });
});
