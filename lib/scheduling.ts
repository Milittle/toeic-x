// Retest scheduling engine — pure functions. Computes D+2 / D+7 / D+21 due dates
// and the ordered "due now" list. No I/O, fully unit-testable.

import type { RetestSlot } from "./types";

export const SLOTS: readonly RetestSlot[] = ["D+2", "D+7", "D+21"];
const SLOT_DAYS: Record<RetestSlot, number> = { "D+2": 2, "D+7": 7, "D+21": 21 };

/** Calendar-day offset. Works in UTC dates so behaviour is timezone-stable. */
export function dueDate(from: Date, slot: RetestSlot): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + SLOT_DAYS[slot]);
  return d;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ScheduledItem {
  testId: string;
  questionNumber: number;
  slot: RetestSlot;
  dueDate: string; // YYYY-MM-DD
}

export interface DueItem extends ScheduledItem {
  status: "pending" | "done";
}

/**
 * Order scheduled retests for display: pending-due first (earliest due date
 * first), then pending-not-due grouped by slot, then done items last.
 */
export function orderForDisplay(items: ReadonlyArray<DueItem>, today = new Date()): DueItem[] {
  const todayISO = toISODate(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
  );
  const rank = (it: DueItem): [number, number, number] => {
    if (it.status === "done") return [3, 0, 0];
    const overdue = it.dueDate <= todayISO ? 0 : 1;
    const slotRank = SLOTS.indexOf(it.slot);
    return [overdue, slotRank, 0];
  };
  return [...items].sort((a, b) => {
    const [oa, sa, _a] = rank(a);
    const [ob, sb, _b] = rank(b);
    if (oa !== ob) return oa - ob;
    if (oa === 0) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0; // due: earliest first
    return sa - sb; // not yet due: by slot order
  });
}

/** The next slot after `slot`, or null if D+21 was the last one. */
export function nextSlot(slot: RetestSlot): RetestSlot | null {
  const i = SLOTS.indexOf(slot);
  return i >= 0 && i < SLOTS.length - 1 ? SLOTS[i + 1] : null;
}
