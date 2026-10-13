import { CircleAlert, Inbox, RotateCw, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LeadListErrorProps {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function LeadListError({
  message,
  onRetry,
  isRetrying,
}: LeadListErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <span className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {message}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="border-red-200 bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
      >
        <RotateCw className={cn(isRetrying && "animate-spin")} aria-hidden />
        Retry
      </Button>
    </div>
  );
}

/** No leads exist at all (no filter or search applied). */
export function NoLeadsState() {
  return (
    <EmptyState
      icon={<Inbox className="size-6" aria-hidden />}
      title="No leads yet"
      description="Add your first lead to get started."
    />
  );
}

/** Leads exist, but none match the current status filter / search. */
export function NoMatchingLeadsState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <EmptyState
      icon={<SearchX className="size-6" aria-hidden />}
      title="No leads match your filters"
      action={
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      }
    />
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-white px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-muted-foreground">
        {icon}
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
