import { Search, X } from "lucide-react";
import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/lead-status";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: LeadStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  ...LEAD_STATUSES.map((value) => ({
    value,
    label: LEAD_STATUS_LABELS[value],
  })),
];

interface LeadToolbarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  status: LeadStatus | undefined;
  onStatusChange: (status: LeadStatus | undefined) => void;
}

export function LeadToolbar({
  searchInput,
  onSearchInputChange,
  status,
  onStatusChange,
}: LeadToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function clearSearch() {
    onSearchInputChange("");
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={inputRef}
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search leads by name…"
          aria-label="Search leads by name"
          enterKeyHint="search"
          className="h-10 bg-white pr-10 pl-9"
        />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-neutral-100 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filter by status"
        className="flex flex-wrap gap-2"
      >
        {STATUS_FILTERS.map(({ value, label }) => {
          const isActive = value === status;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStatusChange(value)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
