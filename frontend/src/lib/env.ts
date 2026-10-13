import { parseDemoMode } from "@/lib/demo-mode";

function readApiUrl(): string {
  // Must be accessed as a literal `process.env.NEXT_PUBLIC_*` so Next.js can inline it at build time.
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy frontend/.env.example to frontend/.env.local " +
        "(or set it in your deployment), then restart the dev server.",
    );
  }
  return value.replace(/\/+$/, "");
}

export const env = {
  /** Base URL of the API including the /api prefix, without a trailing slash. */
  apiUrl: readApiUrl(),
  /** Public demo deployment: shows the "data resets daily" footer. */
  demoMode: parseDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE),
} as const;
