/** Shown when a sign-in request is slow: on free hosting the API sleeps when idle. */
export function ServerWakingNotice() {
  return (
    <p role="status" className="text-center text-sm text-muted-foreground">
      Waking up the server — the first sign-in can take up to a minute…
    </p>
  );
}
