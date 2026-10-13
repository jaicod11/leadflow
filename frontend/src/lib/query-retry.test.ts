import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { queryRetryDelay, shouldRetryQuery } from "@/lib/query-retry";

describe("shouldRetryQuery", () => {
  it.each([0, 502, 503, 504])("retries status %i up to 3 times", (status) => {
    const error = new ApiError(status, "Unavailable");
    expect([0, 1, 2, 3].map((count) => shouldRetryQuery(count, error))).toEqual(
      [true, true, true, false],
    );
  });

  it.each([400, 401, 404, 422, 500])("never retries status %i", (status) => {
    expect(shouldRetryQuery(0, new ApiError(status, "Nope"))).toBe(false);
  });

  it("never retries errors that are not ApiErrors", () => {
    expect(shouldRetryQuery(0, new TypeError("bug"))).toBe(false);
  });
});

describe("queryRetryDelay", () => {
  it("backs off exponentially and caps at 15 seconds", () => {
    expect([0, 1, 2, 3, 4].map(queryRetryDelay)).toEqual([
      2000, 4000, 8000, 15000, 15000,
    ]);
  });
});
