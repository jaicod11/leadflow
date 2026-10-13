import { CalendarClock, CircleAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscussions } from "@/hooks/use-discussions";
import { formatTimeAgo, formatTimestamp } from "@/lib/dates";
import type { Discussion } from "@/lib/types";
import { cn } from "@/lib/utils";

const SKELETON_ITEM_COUNT = 3;

// A vertical line behind the dots, drawn by the <ol> itself.
const TIMELINE_CLASSES =
  "relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-border";

interface DiscussionTimelineProps {
  leadId: number;
  now: Date;
}

/** The lead's discussions, newest first (API order). The scrollable middle of the dialog. */
export function DiscussionTimeline({ leadId, now }: DiscussionTimelineProps) {
  const {
    data: discussions,
    error,
    isFetching,
    refetch,
  } = useDiscussions(leadId);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      {discussions === undefined ? (
        error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <span className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error.message}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="border-red-200 bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
            >
              <RotateCw
                className={cn(isFetching && "animate-spin")}
                aria-hidden
              />
              Retry
            </Button>
          </div>
        ) : (
          <TimelineSkeleton />
        )
      ) : discussions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No discussions yet — log the first one below.
        </p>
      ) : (
        <ol className={TIMELINE_CLASSES} aria-label="Discussion history">
          {discussions.map((discussion, index) => (
            <TimelineItem
              key={discussion.id}
              discussion={discussion}
              isNewest={index === 0}
              now={now}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

interface TimelineItemProps {
  discussion: Discussion;
  isNewest: boolean;
  now: Date;
}

function TimelineItem({ discussion, isNewest, now }: TimelineItemProps) {
  return (
    <li className="relative pl-7">
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 left-0 size-[15px] rounded-full border-2",
          isNewest
            ? "border-blue-600 bg-blue-600"
            : "border-neutral-300 bg-white",
        )}
      />
      <time
        dateTime={discussion.created_at}
        className="block text-xs text-muted-foreground"
      >
        {formatTimestamp(discussion.created_at)} (
        {formatTimeAgo(discussion.created_at, now)})
      </time>
      <p className="mt-1.5 rounded-lg border bg-neutral-50 px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap">
        {discussion.note}
      </p>
      {discussion.follow_up_at && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-blue-700">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          Follow-up set for {formatTimestamp(discussion.follow_up_at)}
        </p>
      )}
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <div
      className={TIMELINE_CLASSES}
      aria-busy="true"
      aria-label="Loading discussions"
    >
      {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => (
        <div key={index} className="relative pl-7">
          <Skeleton className="absolute top-0.5 left-0 size-[15px] rounded-full" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-14 w-full" />
        </div>
      ))}
    </div>
  );
}
