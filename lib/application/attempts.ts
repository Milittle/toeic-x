// Application module for practice and timed attempts.
//
// The public operations own the attempt invariants: an attempt belongs to one
// test and mode, a timed submission is idempotent, the first timed score is
// locked exactly once, and answers/scores/retest rows commit together.

import { loadTest } from "../content/question-bank";
import { getDb, markStatusOnDb } from "../adapters/sqlite/db";
import { scoreQuestions, toScored, type ScoreResult } from "../domain/scoring";
import type { AttemptType, Letter, TestStatus } from "../domain/types";
import { scheduleMissedInsideTransaction } from "./retest";

const DURATION_SEC = 75 * 60;

export interface AttemptStart {
  id: number;
  testId: string;
  isUnseenSample: boolean;
  startedAt: string;
}

export interface AnswerRow {
  questionNumber: number;
  selected: Letter | null;
  isCorrect: boolean | null;
}

export interface TimedSubmitResult {
  scored: ScoreResult;
  isFirst: boolean;
}

export type AttemptErrorCode =
  | "invalid_attempt"
  | "attempt_not_found"
  | "attempt_wrong_mode"
  | "test_not_found"
  | "invalid_selection"
  | "attempt_already_finished";

export class AttemptError extends Error {
  constructor(public readonly code: AttemptErrorCode, message: string) {
    super(message);
    this.name = "AttemptError";
  }
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

function isLetter(value: unknown): value is Letter {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function assertAttemptId(attemptId: number): void {
  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    throw new AttemptError("invalid_attempt", "attemptId must be a positive integer");
  }
}

function validateSelections(
  selections: unknown,
  validNumbers: ReadonlySet<number>,
): Map<number, Letter | undefined> {
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
    throw new AttemptError("invalid_selection", "selections must be an object");
  }
  const mapped = new Map<number, Letter | undefined>();
  for (const [rawNumber, selected] of Object.entries(selections as Record<string, unknown>)) {
    const number = Number(rawNumber);
    if (!Number.isInteger(number) || !validNumbers.has(number) || !isLetter(selected)) {
      throw new AttemptError("invalid_selection", `invalid selection for question ${rawNumber}`);
    }
    mapped.set(number, selected);
  }
  return mapped;
}

function rowFor(db: ReturnType<typeof getDb>, attemptId: number): AttemptRow | undefined {
  return db.prepare("SELECT * FROM attempts WHERE id = ?").get(attemptId) as AttemptRow | undefined;
}

function hasFirstTimedOnDb(db: ReturnType<typeof getDb>, testId: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM attempts WHERE test_id = ? AND type = 'timed' AND is_first = 1 LIMIT 1")
    .get(testId);
  return !!row;
}

function answerRows(
  questions: ReturnType<typeof toScored>,
  selections: ReadonlyMap<number, Letter | undefined>,
): AnswerRow[] {
  return questions.map((q) => {
    const selected = selections.get(q.number);
    return {
      questionNumber: q.number,
      selected: selected ?? null,
      isCorrect: selected === undefined ? null : selected === q.answer,
    };
  });
}

function insertAnswers(
  db: ReturnType<typeof getDb>,
  attemptId: number,
  rows: ReadonlyArray<AnswerRow>,
  answeredAt: string,
): void {
  const stmt = db.prepare(
    `INSERT INTO answers (attempt_id, question_number, selected, is_correct, answered_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const row of rows) {
    stmt.run(
      attemptId,
      row.questionNumber,
      row.selected,
      row.isCorrect === null ? null : row.isCorrect ? 1 : 0,
      answeredAt,
    );
  }
}

function scoreExistingTimedAttempt(
  db: ReturnType<typeof getDb>,
  attemptId: number,
  questions: ReturnType<typeof toScored>,
): ScoreResult {
  const selections = new Map<number, Letter | undefined>();
  const rows = db
    .prepare("SELECT question_number, selected FROM answers WHERE attempt_id = ?")
    .all(attemptId) as { question_number: number; selected: string | null }[];
  for (const row of rows) {
    if (isLetter(row.selected)) selections.set(row.question_number, row.selected);
  }
  return scoreQuestions(questions, selections);
}

function startAttempt(type: AttemptType, testId: string): AttemptStart {
  const db = getDb();
  const startedAt = new Date().toISOString();
  const run = db.transaction(() => {
    const status =
      (db.prepare("SELECT status FROM test_status WHERE test_id = ?").get(testId) as
        | { status: TestStatus }
        | undefined)?.status ?? "not_started";
    const isUnseenSample = type === "timed" && status === "not_started";
    const info = db
      .prepare(
        `INSERT INTO attempts (type, test_id, started_at, is_first, is_unseen_sample)
         VALUES (?, ?, ?, 0, ?)`,
      )
      .run(type, testId, startedAt, isUnseenSample ? 1 : 0);
    markStatusOnDb(db, testId, "seen", startedAt);
    return {
      id: Number(info.lastInsertRowid),
      testId,
      isUnseenSample,
      startedAt,
    };
  });
  return run();
}

export function startTimedAttempt(testId: string): AttemptStart {
  return startAttempt("timed", testId);
}

export function startPracticeAttempt(testId: string): AttemptStart {
  return startAttempt("practice", testId);
}

/** Whether the test has been seen in any mode. */
export function statusOf(testId: string): TestStatus {
  const row = getDb()
    .prepare("SELECT status FROM test_status WHERE test_id = ?")
    .get(testId) as { status: TestStatus } | undefined;
  return row?.status ?? "not_started";
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

/** Find a completed timed attempt only when it belongs to the current test. */
export function completedTimedAttemptForTest(
  testId: string,
  attemptId: number,
): AttemptRow | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM attempts
       WHERE id = ? AND test_id = ? AND type = 'timed' AND ended_at IS NOT NULL`,
    )
    .get(attemptId, testId) as AttemptRow | undefined;
}

/** Finish a practice attempt. Correctness is derived from the static bank. */
export async function finishPracticeAttempt(
  attemptId: number,
  selections: unknown,
): Promise<{ attemptId: number; recorded: number }> {
  assertAttemptId(attemptId);
  const attempt = getAttempt(attemptId);
  if (!attempt) throw new AttemptError("attempt_not_found", "attempt not found");
  if (attempt.type !== "practice") {
    throw new AttemptError("attempt_wrong_mode", "attempt is not a practice attempt");
  }
  if (attempt.ended_at) {
    const recorded = (
      getDb().prepare("SELECT COUNT(*) AS count FROM answers WHERE attempt_id = ?").get(attemptId) as {
        count: number;
      }
    ).count;
    return { attemptId, recorded };
  }

  const test = await loadTest(attempt.test_id);
  if (!test) throw new AttemptError("test_not_found", "test not found");
  const questions = toScored(test);
  const selectionMap = validateSelections(
    selections,
    new Set(questions.map((question) => question.number)),
  );
  const rows = answerRows(questions, selectionMap).filter((row) => row.selected !== null);
  const endedAt = new Date().toISOString();
  const db = getDb();
  const run = db.transaction(() => {
    const current = rowFor(db, attemptId);
    if (!current) throw new AttemptError("attempt_not_found", "attempt not found");
    if (current.type !== "practice") {
      throw new AttemptError("attempt_wrong_mode", "attempt is not a practice attempt");
    }
    if (current.ended_at) {
      const recorded = (
        db.prepare("SELECT COUNT(*) AS count FROM answers WHERE attempt_id = ?").get(attemptId) as {
          count: number;
        }
      ).count;
      return { attemptId, recorded };
    }
    insertAnswers(db, attemptId, rows, endedAt);
    db.prepare("UPDATE attempts SET ended_at = ? WHERE id = ? AND ended_at IS NULL").run(
      endedAt,
      attemptId,
    );
    return { attemptId, recorded: rows.length };
  });
  return run();
}

/**
 * Submit a timed attempt atomically and idempotently. The persisted attempt
 * supplies the test id and start time; callers cannot alter either field.
 */
export async function submitTimedAttempt(
  attemptId: number,
  selections: unknown,
): Promise<TimedSubmitResult> {
  assertAttemptId(attemptId);
  const attempt = getAttempt(attemptId);
  if (!attempt) throw new AttemptError("attempt_not_found", "attempt not found");
  if (attempt.type !== "timed") {
    throw new AttemptError("attempt_wrong_mode", "attempt is not a timed attempt");
  }
  const test = await loadTest(attempt.test_id);
  if (!test) throw new AttemptError("test_not_found", "test not found");
  const questions = toScored(test);
  const selectionMap = validateSelections(
    selections,
    new Set(questions.map((question) => question.number)),
  );
  const scored = scoreQuestions(questions, selectionMap);
  const rows = answerRows(questions, selectionMap);
  const missed = rows.filter((row) => row.isCorrect !== true).map((row) => row.questionNumber);
  const endedAt = new Date().toISOString();
  const db = getDb();

  const run = db.transaction(() => {
    const current = rowFor(db, attemptId);
    if (!current) throw new AttemptError("attempt_not_found", "attempt not found");
    if (current.type !== "timed") {
      throw new AttemptError("attempt_wrong_mode", "attempt is not a timed attempt");
    }
    if (current.ended_at) {
      return {
        scored: scoreExistingTimedAttempt(db, attemptId, questions),
        isFirst: current.is_first === 1,
      };
    }

    const isFirst = !hasFirstTimedOnDb(db, current.test_id);
    const durationSec = Math.min(
      DURATION_SEC,
      Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(current.started_at)) / 1000)),
    );
    insertAnswers(db, attemptId, rows, endedAt);
    const updated = db
      .prepare(
        `UPDATE attempts
         SET ended_at = ?, duration_sec = ?, is_first = ?, accuracy = ?, correct = ?, wrong = ?, unanswered = ?
         WHERE id = ? AND type = 'timed' AND ended_at IS NULL`,
      )
      .run(
        endedAt,
        durationSec,
        isFirst ? 1 : 0,
        scored.accuracy,
        scored.correct,
        scored.wrong,
        scored.unanswered,
        attemptId,
      );
    if (updated.changes !== 1) {
      throw new AttemptError("attempt_already_finished", "attempt was already submitted");
    }
    scheduleMissedInsideTransaction(db, current.test_id, missed, new Date(endedAt));
    markStatusOnDb(db, current.test_id, "first_attempted", endedAt);
    return { scored, isFirst };
  });
  return run();
}
