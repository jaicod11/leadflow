/** Whether NEXT_PUBLIC_DEMO_MODE turns on the public-demo footer: only "true" (case-insensitive) does. */
export function parseDemoMode(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}
