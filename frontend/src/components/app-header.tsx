import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export function LeadFlowLogo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
        <TrendingUp className="size-5" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight">LeadFlow</span>
    </div>
  );
}

/** The top bar. Without `actions` it is the shell shown while the session is being checked. */
export function AppHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
        <LeadFlowLogo />
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3">{actions}</div>
        )}
      </div>
    </header>
  );
}
