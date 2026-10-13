import { describe, expect, it } from "vitest";

import { parseDemoMode } from "@/lib/demo-mode";

describe("parseDemoMode", () => {
  it.each(["true", "TRUE", " True "])(
    "shows the demo footer for %j",
    (value) => {
      expect(parseDemoMode(value)).toBe(true);
    },
  );

  it.each([undefined, "", "false", "0", "1", "yes"])(
    "hides the demo footer for %j",
    (value) => {
      expect(parseDemoMode(value)).toBe(false);
    },
  );
});
