import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Pin the timezone so "today" / "tomorrow" / "yesterday" logic is deterministic on every machine.
// Set before any test worker starts, so the workers inherit it.
process.env.TZ = "Asia/Kolkata";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // lib/env.ts requires it; the API client tests never reach this host (fetch is mocked).
    env: { NEXT_PUBLIC_API_URL: "http://api.test/api" },
  },
});
