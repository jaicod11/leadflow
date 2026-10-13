"use client";

import { Suspense, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { LeadList } from "@/components/leads/lead-list";
import { LeadListSkeleton } from "@/components/leads/lead-list-skeleton";

/** The single LeadFlow screen. Owns UI state shared by the list and the upcoming dialogs. */
export function LeadsScreen() {
  // The selected lead opens the timeline dialog, which reads this value once it exists.
  const [, setSelectedLeadId] = useState<number | null>(null);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* LeadList reads the URL (useSearchParams) and the clock, so it renders on the client. */}
        <Suspense fallback={<LeadListSkeleton />}>
          <LeadList onSelect={setSelectedLeadId} />
        </Suspense>
      </main>
    </>
  );
}
