import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 60_000;

/**
 * The current time, re-rendering every 60 seconds so "time ago", today and overdue stay live
 * without a page refresh, including across midnight.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(
      () => setNow(new Date()),
      REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  return now;
}
