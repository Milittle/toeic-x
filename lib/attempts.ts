// Attempts / answers persistence (SQLite dynamic layer).
// First-try lock: exactly one timed attempt per test is `is_first`; its score
// is final. Later timed attempts are recorded but never replace it.

import { getDb, markStatus } from "./db";
import type { AttemptType, Letter, TestStatus } from "./types";
import type { ScoreResult } from "./scoring";

export interface AnswerRow {
  questionNumber: number;
  selected: Letter | null;
  isCorrect: boolean | null;
}

export function hasFirstTimed(testId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM attempts WHERE test_id = ? AND type = 'timed' AND is_first = 1 LIMIT 1")
    .get(testId);
  return !!row;
}

/** Whether the test has been seen in any mode (used for the unseen-sample flag). */
export function statusOf(testId: string): TestStatus {
  const row = getDb()
    .prepare("SELECT status FROM test_status WHERE test_id = ?")
    .get(testId) as { status: TestStatus } | undefined;
  return row?.status ?? "not_started";
}

export function createAttempt(
  type: AttemptType,
  testId: string,
): { id: number; isUnseenSample: boolean; startedAt: string } {
  // An unseen sample is a timed attempt started before the test was ever seen.
  const isUnseenSample = type === "timed" && statusOf(testId) === "not_started";
  const startedAt = new Date().toISOString();
  const info = getDb()
    .prepare(
      `INSERT INTO attempts (type, test_id, started_at, is_first, is_unseen_sample)
       VALUES (?, ?, ?, 0, ?)`,
    )
    .run(type, testId, startedAt, isUnseenSample ? 1 : 0);
  // Opening a test in any mode marks it as seen (honest "seen" tracking).
  markStatus(testId, "seen");
  return { id: Number(info.lastInsertRowid), isUnseenSample, startedAt };
}

export function recordAnswers(attemptId: number, rows: AnswerRow[]): void {
  const stmt = getDb().prepare(
    `INSERT INTO answers (attempt_id, question_number, selected, is_correct, answered_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const now = new Date().toISOString();
  const tx = getDb().transaction((items: AnswerRow[]) => {
    for (const r of items) {
      stmt.run(attemptId, r.questionNumber, r.selected, r.isCorrect === null ? null : r.isCorrect ? 1 : 0, now);
    }
  });
  tx(rows);
}

export function submitTimedAttempt(
  attemptId: number,
  testId: string,
  scored: ScoreResult,
  startedAt: string,
): { isFirst: boolean } {
  // The first *submitted* timed attempt is locked as the official first score.
  const isFirst = !hasFirstTimed(testId);
  getDb()
    .prepare(
      `UPDATE attempts
       SET ended_at = ?, duration_sec = ?, is_first = ?, accuracy = ?, correct = ?, wrong = ?, unanswered = ?
       WHERE id = ?`,
    )
    .run(
      new Date().toISOString(),
      Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
      isFirst ? 1 : 0,
      scored.accuracy,
      scored.correct,
      scored.wrong,
      scored.unanswered,
      attemptId,
    );
  markStatus(testId, "first_attempted");
  return { isFirst };
}

export interface AttemptRow {
  id: number;
  type: AttemptType;
  test_id: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  is_first: number;
  is_unseen_sample: number;
  accuracy: number | null;
  correct: number | null;
  wrong: number | null;
  unanswered: number | null;
}

export function getAttempt(id: number): AttemptRow | undefined {
  return getDb().prepare("SELECT * FROM attempts WHERE id = ?").get(id) as AttemptRow | undefined;
}

export function listAttempts(testId: string): AttemptRow[] {
  return getDb()
    .prepare("SELECT * FROM attempts WHERE test_id = ? ORDER BY started_at DESC")
    .all(testId) as AttemptRow[];
}

export function firstTimedAttempt(testId: string): AttemptRow | undefined {
  return getDb()
    .prepare("SELECT * FROM attempts WHERE test_id = ? AND type = 'timed' AND is_first = 1 LIMIT 1")
    .get(testId) as AttemptRow | undefined;
}
