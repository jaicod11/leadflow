// Pure date helpers. No React; every relative calculation takes `now` explicitly so it is unit-testable.
// "Today", "tomorrow" and "yesterday" are calendar days in the BROWSER's local timezone.

import {
  addDays,
  differenceInMinutes,
  format,
  formatDistanceStrict,
  isBefore,
  isSameDay,
  parseISO,
  subDays,
} from "date-fns";

import { isClosedStatus } from "@/lib/lead-status";
import type { IsoDateTime, Lead } from "@/lib/types";

type FollowUpFields = Pick<Lead, "status" | "follow_up_at">;

/** "just now" (< 1 min), "5 min ago", "3 hours ago", "2 days ago", "1 month ago", ... */
export function formatTimeAgo(iso: IsoDateTime, now: Date): string {
  const date = parseISO(iso);
  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) return "just now"; // also absorbs small clock skew (timestamps slightly in the future)
  if (minutes < 60) return `${minutes} min ago`;
  return formatDistanceStrict(date, now, {
    addSuffix: true,
    roundingMethod: "floor",
  });
}

/** True if the follow-up falls on now's local calendar day. Never true for won/lost leads. */
export function isFollowUpToday(lead: FollowUpFields, now: Date): boolean {
  if (lead.follow_up_at === null || isClosedStatus(lead.status)) return false;
  return isSameDay(parseISO(lead.follow_up_at), now);
}

/** True if the follow-up time has passed. Never true for won/lost leads. */
export function isFollowUpOverdue(lead: FollowUpFields, now: Date): boolean {
  if (lead.follow_up_at === null || isClosedStatus(lead.status)) return false;
  return isBefore(parseISO(lead.follow_up_at), now);
}

/** Local clock time, e.g. "2:00 PM". */
export function formatTime(iso: IsoDateTime): string {
  return format(parseISO(iso), "h:mm a");
}

/** "Today at 2:00 PM", "Tomorrow at 10:30 AM", "Yesterday at 11:00 AM", otherwise "Thu, 15 Oct at 10:30 AM". */
export function formatFollowUp(iso: IsoDateTime, now: Date): string {
  const date = parseISO(iso);
  const time = formatTime(iso);
  if (isSameDay(date, now)) return `Today at ${time}`;
  if (isSameDay(date, addDays(now, 1))) return `Tomorrow at ${time}`;
  if (isSameDay(date, subDays(now, 1))) return `Yesterday at ${time}`;
  return `${format(date, "EEE, d MMM")} at ${time}`;
}
