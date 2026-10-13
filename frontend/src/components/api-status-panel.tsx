"use client";

// TEMPORARY: verifies the frontend ↔ API wiring. Replaced by the lead list in Task 6.

import { CircleAlert, CircleCheck } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useLeads } from "@/hooks/use-leads";

export function ApiStatusPanel() {
  const { data: leads, error, isPending } = useLeads();

  return (
    <section className="rounded-xl border bg-white p-6 shadow-xs">
      <h2 className="text-sm font-medium text-muted-foreground">
        API connection
      </h2>

      {isPending ? (
        <div className="mt-4 space-y-3" aria-label="Loading leads">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error.message}</span>
        </div>
      ) : (
        <>
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CircleCheck className="size-4" aria-hidden />
            Connected to API — {leads.length} leads loaded
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
            {leads.map((lead) => (
              <li key={lead.id}>{lead.name}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
