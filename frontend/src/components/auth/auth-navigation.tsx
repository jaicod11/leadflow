"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { getSafeRedirect } from "@/lib/auth/safe-redirect";

// These read the URL (useSearchParams), so each one renders inside its own <Suspense> boundary
// and the rest of the page stays in the prerendered static shell.

/** On the login/register pages: sends a signed-in user on to ?next= (only same-site paths) or "/". */
export function RedirectIfAuthenticated() {
  return (
    <Suspense fallback={null}>
      <RedirectWhenSignedIn />
    </Suspense>
  );
}

function RedirectWhenSignedIn() {
  const { status } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");

  useEffect(() => {
    if (status === "authenticated") router.replace(getSafeRedirect(next));
  }, [status, next, router]);

  return null;
}

/** On the login page: explains a redirect caused by an expired session (?expired=1), once. */
export function SessionExpiredNotice() {
  return (
    <Suspense fallback={null}>
      <SessionExpiredToast />
    </Suspense>
  );
}

function SessionExpiredToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";

  useEffect(() => {
    if (!isExpired) return;
    // A fixed id, so a repeated effect (React Strict Mode) can't stack a second toast.
    toast.info("Your session expired. Please sign in again.", {
      id: "session-expired",
    });
    // Drop the flag from the URL so a reload doesn't show the notice again; ?next= stays.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("expired");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [isExpired, searchParams, pathname, router]);

  return null;
}

/** Link to the other auth page that carries ?next= along, so either page returns to the same place. */
export function AuthSwitchLink({
  href,
  children,
}: {
  href: "/login" | "/register";
  children: ReactNode;
}) {
  const className =
    "font-medium text-blue-600 underline-offset-4 hover:underline";
  return (
    <Suspense
      fallback={
        <Link href={href} className={className}>
          {children}
        </Link>
      }
    >
      <LinkKeepingNext href={href} className={className}>
        {children}
      </LinkKeepingNext>
    </Suspense>
  );
}

function LinkKeepingNext({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const next = useSearchParams().get("next");
  const target = next ? `${href}?${new URLSearchParams({ next })}` : href;
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
