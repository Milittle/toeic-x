// Review (error-pattern) marks persistence.

import { getDb } from "../adapters/sqlite/db";
import { loadTest } from "../content/question-bank";
import { flattenQuestions } from "../domain/questions";
import type { ErrorPattern } from "../domain/types";

export type ReviewErrorCode =
  | "invalid_mark"
  | "attempt_not_found"
  | "attempt_wrong_mode"
  | "attempt_not_finished"
  | "question_not_found";

export class ReviewError extends Error {
  constructor(public readonly code: ReviewErrorCode, message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

export interface ReviewMark {
  attemptId: number;
  questionNumber: number;
  errorPattern: ErrorPattern | null;
  note: string | null;
}

function isErrorPattern(value: unknown): value is ErrorPattern {
  return ["G", "V", "S", "E", "T", "A", "L", "K"].includes(value as string);
}

/** Save a mark only for a completed timed attempt and a real question. */
export async function upsertMark(
  attemptId: unknown,
  questionNumber: unknown,
  errorPattern: unknown,
  note: unknown,
): Promise<void> {
  if (!Number.isInteger(attemptId) || (attemptId as number) <= 0) {
    throw new ReviewError("invalid_mark", "attemptId must be a positive integer");
  }
  if (!Number.isInteger(questionNumber) || (questionNumber as number) <= 0) {
    throw new ReviewError("invalid_mark", "questionNumber must be a positive integer");
  }
  if (errorPattern !== null && !isErrorPattern(errorPattern)) {
    throw new ReviewError("invalid_mark", "invalid error pattern");
  }
  if (note !== null && typeof note !== "string") {
    throw new ReviewError("invalid_mark", "note must be a string or null");
  }

  const db = getDb();
  const attempt = db
    .prepare("SELECT type, test_id, ended_at FROM attempts WHERE id = ?")
    .get(attemptId) as { type: string; test_id: string; ended_at: string | null } | undefined;
  if (!attempt) throw new ReviewError("attempt_not_found", "attempt not found");
  if (attempt.type !== "timed") {
    throw new ReviewError("attempt_wrong_mode", "review requires a timed attempt");
  }
  if (!attempt.ended_at) {
    throw new ReviewError("attempt_not_finished", "attempt is not finished");
  }
  const test = await loadTest(attempt.test_id);
  if (
    !test ||
    !new Set(flattenQuestions(test).map((question) => question.number)).has(questionNumber as number)
  ) {
    throw new ReviewError("question_not_found", "question does not belong to the attempt");
  }

  db.prepare(
    `INSERT INTO review_marks (attempt_id, question_number, error_pattern, note, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(attempt_id, question_number) DO UPDATE SET error_pattern = excluded.error_pattern, note = excluded.note`,
  )
    .run(attemptId, questionNumber, errorPattern, note, new Date().toISOString());
}

export function getMarks(attemptId: number): Map<number, ReviewMark> {
  const rows = getDb()
    .prepare("SELECT attempt_id, question_number, error_pattern, note FROM review_marks WHERE attempt_id = ?")
    .all(attemptId) as {
      attempt_id: number;
      question_number: number;
      error_pattern: ErrorPattern | null;
      note: string | null;
    }[];
  return new Map(
    rows.map((r) => [
      r.question_number,
      {
        attemptId: r.attempt_id,
        questionNumber: r.question_number,
        errorPattern: r.error_pattern,
        note: r.note,
      },
    ]),
  );
}

/** Answers for one attempt: question number -> {selected, isCorrect}. */
export interface AttemptAnswer {
  questionNumber: number;
  selected: string | null;
  isCorrect: number | null;
}

export function getAnswers(attemptId: number): AttemptAnswer[] {
  const rows = getDb()
    .prepare("SELECT question_number, selected, is_correct FROM answers WHERE attempt_id = ?")
    .all(attemptId) as {
      question_number: number;
      selected: string | null;
      is_correct: number | null;
    }[];
  return rows.map((r) => ({
    questionNumber: r.question_number,
    selected: r.selected,
    isCorrect: r.is_correct,
  }));
}
