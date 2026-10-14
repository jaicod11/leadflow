/** Why the user was signed out: a deliberate logout, or a 401 on an authenticated request. */
export type SignOutReason = "logout" | "expired";

/**
 * The login page URL. After a logout it is plain "/login"; otherwise it carries the page to return
 * to (?next=) and, for an expired session, ?expired=1 so the login page can explain what happened.
 */
export function buildLoginUrl(
  next: string,
  reason: SignOutReason | null,
): string {
  if (reason === "logout") return "/login";
  const params = new URLSearchParams({ next });
  if (reason === "expired") params.set("expired", "1");
  return `/login?${params.toString()}`;
}
