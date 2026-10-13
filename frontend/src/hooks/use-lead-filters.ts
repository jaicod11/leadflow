import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { LEAD_STATUSES } from "@/lib/lead-status";
import type { LeadStatus } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 300;
const STATUS_PARAM = "status";
const SEARCH_PARAM = "q";

function parseStatus(value: string | null): LeadStatus | undefined {
  return LEAD_STATUSES.find((status) => status === value);
}

/**
 * Status filter + debounced name search, mirrored to the URL (?status=qualified&q=pri) so a
 * refresh or shared link keeps them. The URL is read once on mount; after that local state is the
 * source of truth and every change is written back with router.replace (no scroll, no history
 * entries). Invalid status values in the URL are ignored and dropped.
 *
 * Uses useSearchParams, so the calling component must be inside a <Suspense> boundary.
 */
export function useLeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(() =>
    parseStatus(searchParams.get(STATUS_PARAM)),
  );
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get(SEARCH_PARAM) ?? "",
  );
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS).trim();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    setOrDelete(params, STATUS_PARAM, status);
    setOrDelete(params, SEARCH_PARAM, search);
    const query = params.toString();
    if (query !== searchParams.toString()) {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [status, search, searchParams, pathname, router]);

  const clearFilters = useCallback(() => {
    setStatus(undefined);
    setSearchInput("");
  }, []);

  return {
    /** Applied status filter (undefined = all). */
    status,
    setStatus,
    /** What is typed in the search box (updates on every keystroke). */
    searchInput,
    setSearchInput,
    /** Applied search: the trimmed, debounced search input. */
    search,
    hasActiveFilters: status !== undefined || search !== "",
    clearFilters,
  };
}

function setOrDelete(params: URLSearchParams, key: string, value?: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}
