import { env } from "@/lib/env";

/** Only on the public demo (NEXT_PUBLIC_DEMO_MODE=true): the data is reset by a daily GitHub Action. */
export function DemoFooter() {
  if (!env.demoMode) return null;

  return (
    <footer className="mt-auto py-6 text-center text-xs text-muted-foreground">
      Demo instance · data resets daily at 9:00 AM IST
    </footer>
  );
}
