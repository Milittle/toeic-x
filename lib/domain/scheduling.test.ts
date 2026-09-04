import { describe, expect, it } from "vitest";
import {
  SLOTS,
  dueDate,
  toISODate,
  nextSlot,
  orderForDisplay,
  type DueItem,
} from "./scheduling";

const from = (iso: string) => new Date(iso + "T00:00:00Z");

describe("scheduling", () => {
  it("computes D+2 / D+7 / D+21 due dates, crossing month boundaries", () => {
    const base = from("2026-01-30");
    expect(toISODate(dueDate(base, "D+2"))).toBe("2026-02-01"); // cross Jan→Feb
    expect(toISODate(dueDate(base, "D+7"))).toBe("2026-02-06");
    expect(toISODate(dueDate(base, "D+21"))).toBe("2026-02-20");
  });

  it("handles year boundaries", () => {
    expect(toISODate(dueDate(from("2026-12-30"), "D+7"))).toBe("2027-01-06");
  });

  it("keeps multiple same-day questions distinct", () => {
    const base = from("2026-03-10");
    expect(toISODate(dueDate(base, "D+2"))).toBe("2026-03-12");
    // two questions sharing a due date both resolve to the same day
    expect(toISODate(dueDate(base, "D+2"))).toBe(toISODate(dueDate(base, "D+2")));
  });

  it("advances through the slot ladder", () => {
    expect(SLOTS).toEqual(["D+2", "D+7", "D+21"]);
    expect(nextSlot("D+2")).toBe("D+7");
    expect(nextSlot("D+7")).toBe("D+21");
    expect(nextSlot("D+21")).toBeNull();
  });

  it("orders due-first, then not-due by slot, then done last", () => {
    const today = from("2026-03-10");
    const items: DueItem[] = [
      { testId: "t", questionNumber: 1, slot: "D+21", dueDate: "2026-03-31", status: "pending" },
      { testId: "t", questionNumber: 2, slot: "D+2", dueDate: "2026-03-08", status: "pending" }, // due
      { testId: "t", questionNumber: 3, slot: "D+7", dueDate: "2026-03-09", status: "pending" }, // due, earlier
      { testId: "t", questionNumber: 4, slot: "D+2", dueDate: "2026-03-12", status: "done" },
      { testId: "t", questionNumber: 5, slot: "D+7", dueDate: "2026-03-15", status: "pending" }, // not due
    ];
    const ordered = orderForDisplay(items, today);
    // due group (overdue), earliest due date first: q2(03-08), q3(03-09);
    // then not-due pending grouped by slot: q5(D+7), q1(D+21); then done: q4
    expect(ordered.map((i) => i.questionNumber)).toEqual([2, 3, 5, 1, 4]);
  });
});
