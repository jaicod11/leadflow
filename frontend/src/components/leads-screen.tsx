"use client";

import { Suspense, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { LeadList } from "@/components/leads/lead-list";
import { LeadListSkeleton } from "@/components/leads/lead-list-skeleton";
import { LeadTimelineDialog } from "@/components/leads/timeline/lead-timeline-dialog";

/** The single LeadFlow screen. Owns UI state shared by the list and its dialogs. */
export function LeadsScreen() {
  // Clicking a lead card selects it, which opens its timeline dialog; closing clears it.
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* LeadList reads the URL (useSearchParams) and the clock, so it renders on the client. */}
        <Suspense fallback={<LeadListSkeleton />}>
          <LeadList onSelect={setSelectedLeadId} />
        </Suspense>
      </main>
      <LeadTimelineDialog
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </>
  );
}
