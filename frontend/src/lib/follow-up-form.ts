// Pure helpers for the follow-up date/time inputs (native <input type="date"> / <input type="time">).
// All values are in the browser's local timezone; the API receives UTC ISO strings.

import {
  addDays,
  addHours,
  format,
  isSameDay,
  isValid,
  parse,
  setHours,
  startOfDay,
  startOfHour,
} from "date-fns";

export interface FollowUpInput {
  /** "yyyy-MM-dd", as used by <input type="date">. */
  date: string;
  /** "HH:mm" (24h), as used by <input type="time">. */
  time: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const TOMORROW_DEFAULT_HOUR = 9;

/** Today at the next full hour; if that rolls past midnight, tomorrow at 09:00. */
export function getDefaultFollowUp(now: Date): FollowUpInput {
  const nextFullHour = startOfHour(addHours(now, 1));
  const target = isSameDay(nextFullHour, now)
    ? nextFullHour
    : setHours(startOfDay(addDays(now, 1)), TOMORROW_DEFAULT_HOUR);
  return { date: format(target, "yyyy-MM-dd"), time: format(target, "HH:mm") };
}

/** Combines a local date ("yyyy-MM-dd") and time ("HH:mm") into a UTC ISO string, or null if invalid. */
export function toFollowUpIso(date: string, time: string): string | null {
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) return null;
  const local = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date(0));
  return isValid(local) ? local.toISOString() : null;
}

/** An error message for the follow-up inputs, or null when they hold a valid future time. */
export function validateFollowUp(
  date: string,
  time: string,
  now: Date,
): string | null {
  const iso = toFollowUpIso(date, time);
  if (iso === null) return "Pick a date and time";
  if (new Date(iso).getTime() <= now.getTime())
    return "Follow-up must be in the future";
  return null;
}
