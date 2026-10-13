"use client";

import { Suspense, useRef, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { LeadList, type LeadListHandle } from "@/components/leads/lead-list";
import { LeadListSkeleton } from "@/components/leads/lead-list-skeleton";
import { LeadTimelineDialog } from "@/components/leads/timeline/lead-timeline-dialog";
import type { Lead } from "@/lib/types";

/** The single LeadFlow screen. Owns UI state shared by the list and its dialogs. */
export function LeadsScreen() {
  // Clicking a lead card selects it, which opens its timeline dialog; closing clears it.
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isAddLeadOpen, setAddLeadOpen] = useState(false);
  const leadListRef = useRef<LeadListHandle>(null);

  function handleLeadCreated(lead: Lead) {
    setAddLeadOpen(false);
    leadListRef.current?.reveal(lead);
    toast.success("Lead added", {
      action: {
        label: "Log discussion",
        onClick: () => setSelectedLeadId(lead.id),
      },
    });
  }

  return (
    <>
      <AppHeader onAddLead={() => setAddLeadOpen(true)} />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* LeadList reads the URL (useSearchParams) and the clock, so it renders on the client. */}
        <Suspense fallback={<LeadListSkeleton />}>
          <LeadList ref={leadListRef} onSelect={setSelectedLeadId} />
        </Suspense>
      </main>
      <LeadTimelineDialog
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
      <AddLeadDialog
        open={isAddLeadOpen}
        onOpenChange={setAddLeadOpen}
        onCreated={handleLeadCreated}
      />
    </>
  );
}
