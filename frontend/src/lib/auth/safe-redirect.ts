const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

/**
 * Where to go after signing in: `next` only if it is a same-site relative path, otherwise "/".
 * Rejects absolute URLs, protocol-relative "//host" and "/\host" (both leave the site), other schemes
 * such as "javascript:", and control characters (browsers drop tabs/newlines, turning "/\t/x" into "//x").
 */
export function getSafeRedirect(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\") ||
    CONTROL_CHARACTERS.test(next)
  ) {
    return "/";
  }
  return next;
}
