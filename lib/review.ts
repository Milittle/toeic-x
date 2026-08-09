// Review (error-pattern) marks persistence.

import { getDb } from "./db";
import type { ErrorPattern } from "./types";

export interface ReviewMark {
  attemptId: number;
  questionNumber: number;
  errorPattern: ErrorPattern | null;
  note: string | null;
}

export function upsertMark(
  attemptId: number,
  questionNumber: number,
  errorPattern: ErrorPattern | null,
  note: string | null,
): void {
  getDb()
    .prepare(
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
