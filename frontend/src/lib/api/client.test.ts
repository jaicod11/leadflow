import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, setUnauthorizedHandler } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { clearToken, setToken } from "@/lib/auth/token-storage";

const fetchMock = vi.fn<typeof fetch>();
const onUnauthorized = vi.fn<() => void>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sentHeaders(): Record<string, string> {
  const init = fetchMock.mock.calls[0]?.[1];
  return (init?.headers ?? {}) as Record<string, string>;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setUnauthorizedHandler(onUnauthorized);
});

afterEach(() => {
  setUnauthorizedHandler(null);
  clearToken();
  fetchMock.mockReset();
  onUnauthorized.mockReset();
  vi.unstubAllGlobals();
});

describe("Authorization header", () => {
  it("is attached when a token exists", async () => {
    setToken("abc.def.ghi");
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await apiFetch("/leads");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/leads",
      expect.anything(),
    );
    expect(sentHeaders()).toMatchObject({
      Authorization: "Bearer abc.def.ghi",
    });
  });

  it("is omitted when there is no token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await apiFetch("/leads");

    expect(sentHeaders()).not.toHaveProperty("Authorization");
  });
});

describe("401 handling", () => {
  it("calls the unauthorized handler, then still throws the ApiError", async () => {
    setToken("expired-token");
    fetchMock.mockResolvedValue(
      jsonResponse(401, { detail: "Invalid or expired token" }),
    );

    const error = await apiFetch("/leads").catch((caught: unknown) => caught);

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      message: "Invalid or expired token",
    });
  });

  it.each(["/auth/login", "/auth/register"])(
    "does not call the handler for a 401 from %s",
    async (path) => {
      fetchMock.mockResolvedValue(
        jsonResponse(401, { detail: "Invalid email or password" }),
      );

      await expect(
        apiFetch(path, { method: "POST", body: {} }),
      ).rejects.toMatchObject({
        status: 401,
        message: "Invalid email or password",
      });
      expect(onUnauthorized).not.toHaveBeenCalled();
    },
  );

  it("does not call the handler for other errors", async () => {
    setToken("valid-token");
    fetchMock.mockResolvedValue(
      jsonResponse(404, { detail: "Lead not found" }),
    );

    await expect(apiFetch("/leads/999")).rejects.toMatchObject({ status: 404 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
