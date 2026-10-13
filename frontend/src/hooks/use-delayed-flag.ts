import { useEffect, useState } from "react";

/** True once `active` has stayed true for `delayMs` (e.g. "this load is taking a while"). */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => setElapsed(true), delayMs);
    return () => {
      window.clearTimeout(timeout);
      setElapsed(false);
    };
  }, [active, delayMs]);

  return active && elapsed;
}
