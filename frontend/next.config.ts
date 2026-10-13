import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` write frontend/AGENTS.md; the equivalent guidance lives in the root CLAUDE.md.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
