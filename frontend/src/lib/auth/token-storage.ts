// The access token lives in localStorage (key "leadflow.token"). Every storage access is wrapped in
// try/catch, because storage can be unavailable (privacy modes, blocked site data, server rendering);
// an in-memory copy keeps the session working for this tab in that case.

const TOKEN_KEY = "leadflow.token";

// Only holds the token while storage can't, so a token cleared elsewhere (another tab) can't linger here.
let memoryToken: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    memoryToken = null;
  } catch {
    // Storage unavailable: keep the session in memory until the tab is closed.
    memoryToken = token;
  }
  notify();
}

export function clearToken(): void {
  memoryToken = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable: nothing persisted to remove.
  }
  notify();
}

/**
 * For useSyncExternalStore: notified on set/clear in this tab, on changes made in other tabs, and
 * when the browser restores this page from its back/forward cache (the token may be gone by then).
 */
export function subscribeToToken(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === null) listener();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", onPageShow);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", onPageShow);
  };
}
