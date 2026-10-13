"use client";

import { Pin, Users } from "lucide-react";
import { useEffect, useImperativeHandle, useState, type Ref } from "react";

import { LeadListSkeleton } from "@/components/leads/lead-list-skeleton";
import {
  LeadListError,
  NoLeadsState,
  NoMatchingLeadsState,
} from "@/components/leads/lead-list-states";
import { LeadSection } from "@/components/leads/lead-section";
import { LeadToolbar } from "@/components/leads/lead-toolbar";
import { useDelayedFlag } from "@/hooks/use-delayed-flag";
import { useLeadFilters } from "@/hooks/use-lead-filters";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { matchesLeadFilters } from "@/lib/lead-filters";
import { groupLeads } from "@/lib/lead-groups";
import type { Lead } from "@/lib/types";

const HIGHLIGHT_DURATION_MS = 2000;
// After this long on the first load, explain the wait (a free-tier API may be cold-starting).
const SLOW_FIRST_LOAD_MS = 4000;

export interface LeadListHandle {
  /** Make a (new) lead visible: clear filters that would hide it, scroll to its card, highlight it. */
  reveal: (lead: Lead) => void;
}

interface LeadListProps {
  onSelect: (leadId: number) => void;
  ref?: Ref<LeadListHandle>;
}

/** Toolbar + today's follow-ups + all other leads. Reads the URL, so render it inside <Suspense>. */
export function LeadList({ onSelect, ref }: LeadListProps) {
  const filters = useLeadFilters();
  const now = useNow();
  const {
    data: leads,
    error,
    isPending,
    isFetching,
    refetch,
  } = useLeads({ status: filters.status, search: filters.search });
  const [highlightedLeadId, setHighlightedLeadId] = useState<number | null>(
    null,
  );

  useImperativeHandle(
    ref,
    () => ({
      reveal(lead) {
        const { status, search, clearFilters } = filters;
        if (!matchesLeadFilters(lead, { status, search })) clearFilters();
        setHighlightedLeadId(lead.id);
      },
    }),
    [filters],
  );

  // Once the highlighted lead's card is on screen (after any filter reset and refetch),
  // scroll it into view, then drop the highlight after the fade-out animation.
  const isHighlightedLeadShown =
    highlightedLeadId !== null &&
    (leads?.some((lead) => lead.id === highlightedLeadId) ?? false);
  useEffect(() => {
    if (!isHighlightedLeadShown) return;
    document
      .querySelector(`[data-lead-id="${highlightedLeadId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = window.setTimeout(
      () => setHighlightedLeadId(null),
      HIGHLIGHT_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [isHighlightedLeadShown, highlightedLeadId]);

  const retry = () => void refetch();
  // Background refetch (filter/search change, window focus) while results are already on screen.
  const isRefreshing = isFetching && !isPending;
  const isSlowFirstLoad = useDelayedFlag(
    leads === undefined && !error,
    SLOW_FIRST_LOAD_MS,
  );

  function renderResults() {
    if (leads === undefined) {
      return error ? (
        <LeadListError
          message={error.message}
          onRetry={retry}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <LeadListSkeleton />
          {isSlowFirstLoad && (
            <p
              role="status"
              className="text-center text-sm text-muted-foreground"
            >
              Waking up the API server — free hosting can take up to a minute on
              the first visit…
            </p>
          )}
        </>
      );
    }

    if (leads.length === 0) {
      return filters.hasActiveFilters ? (
        <NoMatchingLeadsState onClearFilters={filters.clearFilters} />
      ) : (
        <NoLeadsState />
      );
    }

    const { today, others } = groupLeads(leads, now);
    return (
      <>
        <LeadSection
          title="Today's follow-ups"
          icon={<Pin className="size-3.5 text-blue-600" aria-hidden />}
          leads={today}
          now={now}
          onSelect={onSelect}
          isRefreshing={isRefreshing}
          highlightedLeadId={highlightedLeadId}
        />
        <LeadSection
          title="All leads"
          icon={<Users className="size-3.5" aria-hidden />}
          leads={others}
          now={now}
          onSelect={onSelect}
          isRefreshing={isRefreshing}
          highlightedLeadId={highlightedLeadId}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <LeadToolbar
        searchInput={filters.searchInput}
        onSearchInputChange={filters.setSearchInput}
        status={filters.status}
        onStatusChange={filters.setStatus}
      />
      {/* A failed background refetch keeps the last results on screen, with the error above them. */}
      {error && leads !== undefined && (
        <LeadListError
          message={error.message}
          onRetry={retry}
          isRetrying={isFetching}
        />
      )}
      {renderResults()}
    </div>
  );
}
