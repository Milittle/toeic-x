// Retest persistence + wiring to the scheduling engine (lib/scheduling.ts).

import { getDb } from "./db";
import { SLOTS, dueDate, toISODate, orderForDisplay, type DueItem } from "./scheduling";

export interface ScheduleRow {
  id: number;
  testId: string;
  questionNumber: number;
  slot: (typeof SLOTS)[number];
  dueDate: string;
  status: "pending" | "done";
  retestCorrect: number | null;
}

/** Schedule D+2 / D+7 / D+21 for a set of missed questions (idempotent). */
export function scheduleMissed(testId: string, numbers: Iterable<number>, from = new Date()): void {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO retest_schedule (test_id, question_number, slot, due_date, status)
     VALUES (?, ?, ?, ?, 'pending')`,
  );
  const tx = getDb().transaction((nums: number[]) => {
    for (const n of nums) {
      for (const slot of SLOTS) stmt.run(testId, n, slot, toISODate(dueDate(from, slot)));
    }
  });
  tx([...numbers]);
}

export function listSchedule(): ScheduleRow[] {
  const rows = getDb()
    .prepare(
      "SELECT id, test_id, question_number, slot, due_date, status, retest_correct, attempt_id FROM retest_schedule",
    )
    .all() as {
      id: number;
      test_id: string;
      question_number: number;
      slot: ScheduleRow["slot"];
      due_date: string;
      status: "pending" | "done";
      retest_correct: number | null;
    }[];
  const mapped: ScheduleRow[] = rows.map((r) => ({
    id: r.id,
    testId: r.test_id,
    questionNumber: r.question_number,
    slot: r.slot,
    dueDate: r.due_date,
    status: r.status,
    retestCorrect: r.retest_correct,
  }));
  const dueItems: DueItem[] = mapped.map((m) => ({
    testId: m.testId,
    questionNumber: m.questionNumber,
    slot: m.slot,
    dueDate: m.dueDate,
    status: m.status,
  }));
  const order = orderForDisplay(dueItems);
  // apply the computed order to the full rows
  const key = (m: ScheduleRow) => `${m.testId}:${m.questionNumber}:${m.slot}`;
  const byKey = new Map(mapped.map((m) => [key(m), m]));
  return order
    .map((d) => byKey.get(`${d.testId}:${d.questionNumber}:${d.slot}`))
    .filter((x): x is ScheduleRow => !!x);
}

export function markRetestDone(id: number, retestCorrect: boolean): void {
  getDb()
    .prepare("UPDATE retest_schedule SET status = 'done', retest_correct = ? WHERE id = ?")
    .run(retestCorrect ? 1 : 0, id);
}
