import type { ReactNode } from "react";

import { LeadFlowLogo } from "@/components/app-header";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  /** Shown under the card content, e.g. the link to the other auth page. */
  footer: ReactNode;
}

/** Centered layout shared by the sign-in and create-account pages. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <LeadFlowLogo />
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-xs sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        </div>
      </div>
    </main>
  );
}
