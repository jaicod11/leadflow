"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/components/auth/auth-provider";
import { LeadListSkeleton } from "@/components/leads/lead-list-skeleton";
import { useDelayedFlag } from "@/hooks/use-delayed-flag";
import { buildLoginUrl } from "@/lib/auth/login-url";

const SLOW_SESSION_CHECK_MS = 4000;

/**
 * Client-side route protection (the app is client-rendered; the API enforces auth on every request).
 * Until the user is known, renders the header shell and the list skeleton, so no lead data flashes.
 * Signed out: replaces the URL with the login page, remembering this page (path + query) as ?next=.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, signOutReason } = useAuth();
  const router = useRouter();
  // Checking a stored token against a sleeping API (cold start) can take a while.
  const isSlowSessionCheck = useDelayedFlag(
    status === "loading",
    SLOW_SESSION_CHECK_MS,
  );

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const { pathname, search } = window.location;
    router.replace(buildLoginUrl(pathname + search, signOutReason));
  }, [status, signOutReason, router]);

  if (status === "authenticated") return children;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl space-y-3 px-4 py-6 sm:px-6 sm:py-8">
        <LeadListSkeleton />
        {isSlowSessionCheck && (
          <p
            role="status"
            className="text-center text-sm text-muted-foreground"
          >
            Waking up the API server — free hosting can take up to a minute on
            the first visit…
          </p>
        )}
      </main>
    </>
  );
}
