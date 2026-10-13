"use client";

import { Pin, Users } from "lucide-react";

import { LeadListSkeleton } from "@/components/leads/lead-list-skeleton";
import {
  LeadListError,
  NoLeadsState,
  NoMatchingLeadsState,
} from "@/components/leads/lead-list-states";
import { LeadSection } from "@/components/leads/lead-section";
import { LeadToolbar } from "@/components/leads/lead-toolbar";
import { useLeadFilters } from "@/hooks/use-lead-filters";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { groupLeads } from "@/lib/lead-groups";

interface LeadListProps {
  onSelect: (leadId: number) => void;
}

/** Toolbar + today's follow-ups + all other leads. Reads the URL, so render it inside <Suspense>. */
export function LeadList({ onSelect }: LeadListProps) {
  const filters = useLeadFilters();
  const now = useNow();
  const {
    data: leads,
    error,
    isPending,
    isFetching,
    refetch,
  } = useLeads({ status: filters.status, search: filters.search });

  const retry = () => void refetch();
  // Background refetch (filter/search change, window focus) while results are already on screen.
  const isRefreshing = isFetching && !isPending;

  function renderResults() {
    if (leads === undefined) {
      return error ? (
        <LeadListError
          message={error.message}
          onRetry={retry}
          isRetrying={isFetching}
        />
      ) : (
        <LeadListSkeleton />
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
        />
        <LeadSection
          title="All leads"
          icon={<Users className="size-3.5" aria-hidden />}
          leads={others}
          now={now}
          onSelect={onSelect}
          isRefreshing={isRefreshing}
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
