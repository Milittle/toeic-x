// Retest persistence + wiring to the scheduling engine (lib/domain/scheduling.ts).

import { getDb } from "../adapters/sqlite/db";
import { SLOTS, dueDate, toISODate, orderForDisplay, type DueItem } from "../domain/scheduling";
import type BetterSqlite3 from "better-sqlite3";

export interface ScheduleRow {
  id: number;
  testId: string;
  questionNumber: number;
  slot: (typeof SLOTS)[number];
  dueDate: string;
  status: "pending" | "done";
  retestCorrect: number | null;
}

export type RetestErrorCode = "invalid_id" | "not_found" | "already_done";

export class RetestError extends Error {
  constructor(public readonly code: RetestErrorCode, message: string) {
    super(message);
    this.name = "RetestError";
  }
}

type Db = ReturnType<typeof getDb>;

/** Schedule D+2 / D+7 / D+21 for a set of missed questions (idempotent). */
export function scheduleMissed(testId: string, numbers: Iterable<number>, from = new Date()): void {
  scheduleMissedOnDb(getDb(), testId, numbers, from);
}

/** Internal transaction-aware form used by the timed-attempt module. */
export function scheduleMissedOnDb(
  db: Db,
  testId: string,
  numbers: Iterable<number>,
  from = new Date(),
): void {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO retest_schedule (test_id, question_number, slot, due_date, status)
     VALUES (?, ?, ?, ?, 'pending')`,
  );
  const tx = db.transaction((nums: number[]) => writeMissed(stmt, testId, nums, from));
  tx([...numbers]);
}

/** Internal form for callers that already own a transaction. */
export function scheduleMissedInsideTransaction(
  db: Db,
  testId: string,
  numbers: Iterable<number>,
  from = new Date(),
): void {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO retest_schedule (test_id, question_number, slot, due_date, status)
     VALUES (?, ?, ?, ?, 'pending')`,
  );
  writeMissed(stmt, testId, [...numbers], from);
}

function writeMissed(
  stmt: BetterSqlite3.Statement<unknown[]>,
  testId: string,
  numbers: number[],
  from: Date,
): void {
  for (const n of numbers) {
    for (const slot of SLOTS) stmt.run(testId, n, slot, toISODate(dueDate(from, slot)));
  }
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

export function markRetestDone(id: unknown, retestCorrect: unknown): void {
  if (!Number.isInteger(id) || (id as number) <= 0 || typeof retestCorrect !== "boolean") {
    throw new RetestError("invalid_id", "id must be a positive integer and correct must be boolean");
  }
  const db = getDb();
  const row = db.prepare("SELECT status FROM retest_schedule WHERE id = ?").get(id) as
    | { status: "pending" | "done" }
    | undefined;
  if (!row) throw new RetestError("not_found", "retest item not found");
  if (row.status === "done") throw new RetestError("already_done", "retest item is already done");
  const updated = db
    .prepare(
      "UPDATE retest_schedule SET status = 'done', retest_correct = ? WHERE id = ? AND status = 'pending'",
    )
    .run(retestCorrect ? 1 : 0, id);
  if (updated.changes !== 1) throw new RetestError("already_done", "retest item is already done");
}
