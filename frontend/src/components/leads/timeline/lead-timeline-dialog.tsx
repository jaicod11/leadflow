"use client";

import { CircleAlert, XIcon } from "lucide-react";
import { useRef, useState, type RefObject } from "react";

import { AddDiscussionForm } from "@/components/leads/timeline/add-discussion-form";
import { DiscussionTimeline } from "@/components/leads/timeline/discussion-timeline";
import { TimelineHeader } from "@/components/leads/timeline/timeline-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLead } from "@/hooks/use-lead";
import { useNow } from "@/hooks/use-now";

interface LeadTimelineDialogProps {
  /** The lead to show; the dialog is open while this is set. */
  leadId: number | null;
  /** Called when the dialog is dismissed (×, Esc, overlay click, Close button). */
  onClose: () => void;
}

export function LeadTimelineDialog({
  leadId,
  onClose,
}: LeadTimelineDialogProps) {
  // Keep rendering the last lead while the close animation runs (leadId is already null then).
  const [shownLeadId, setShownLeadId] = useState(leadId);
  if (leadId !== null && leadId !== shownLeadId) setShownLeadId(leadId);

  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Dialog
      open={leadId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-[calc(100%-1.5rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        onOpenAutoFocus={(event) => {
          // Start in the note field rather than on the first control (the status select).
          if (noteInputRef.current) {
            event.preventDefault();
            noteInputRef.current.focus();
          }
        }}
      >
        {shownLeadId !== null && (
          <LeadTimeline
            key={shownLeadId}
            leadId={shownLeadId}
            noteInputRef={noteInputRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LeadTimelineProps {
  leadId: number;
  noteInputRef: RefObject<HTMLTextAreaElement | null>;
}

/** Sticky header, scrollable discussion history, sticky "log a discussion" footer. */
function LeadTimeline({ leadId, noteInputRef }: LeadTimelineProps) {
  const now = useNow();
  const { data: lead, error } = useLead(leadId);

  // A 404 means the lead is gone, even if a stale copy was seeded from the list cache.
  if (error && (lead === undefined || error.status === 404)) {
    return <LeadLoadError message={error.message} />;
  }

  return (
    <>
      {lead ? (
        <TimelineHeader lead={lead} now={now} />
      ) : (
        <TimelineHeaderSkeleton />
      )}
      <DiscussionTimeline leadId={leadId} now={now} />
      <AddDiscussionForm
        leadId={leadId}
        now={now}
        noteInputRef={noteInputRef}
      />
    </>
  );
}

function TimelineHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
      <DialogTitle className="sr-only">Loading lead</DialogTitle>
      <DialogDescription className="sr-only">
        Loading the lead&apos;s details.
      </DialogDescription>
      <div className="space-y-2">
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <DialogClose asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Close">
          <XIcon />
        </Button>
      </DialogClose>
    </div>
  );
}

function LeadLoadError({ message }: { message: string }) {
  return (
    <div className="space-y-4 p-5">
      <DialogTitle className="flex items-center gap-2 text-base font-semibold">
        <CircleAlert className="size-5 text-red-600" aria-hidden />
        Couldn&apos;t load this lead
      </DialogTitle>
      <DialogDescription className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {message}
      </DialogDescription>
      <div className="flex justify-end">
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </div>
    </div>
  );
}
