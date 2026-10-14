import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearToken, getToken, setToken } from "@/lib/auth/token-storage";

function fakeStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

function throwingStorage(): Storage {
  const fail = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

afterEach(() => {
  clearToken();
  vi.unstubAllGlobals();
});

describe("with localStorage available", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  it("stores, reads and clears the token under leadflow.token", () => {
    expect(getToken()).toBeNull();

    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
    expect(storage.getItem("leadflow.token")).toBe("abc.def.ghi");

    clearToken();
    expect(getToken()).toBeNull();
    expect(storage.getItem("leadflow.token")).toBeNull();
  });

  it("reads a token persisted by an earlier visit", () => {
    storage.setItem("leadflow.token", "from-last-visit");
    expect(getToken()).toBe("from-last-visit");
  });

  it("sees a token cleared by another tab (no stale in-memory copy)", () => {
    setToken("abc.def.ghi");
    storage.removeItem("leadflow.token");
    expect(getToken()).toBeNull();
  });
});

describe("with localStorage unavailable", () => {
  it("falls back to memory when every storage call throws", () => {
    vi.stubGlobal("window", { localStorage: throwingStorage() });

    expect(getToken()).toBeNull();
    setToken("in-memory-token");
    expect(getToken()).toBe("in-memory-token");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("falls back to memory when there is no window (server rendering)", () => {
    expect(getToken()).toBeNull();
    setToken("server-side");
    expect(getToken()).toBe("server-side");
  });
});
