// Weekly summary aggregation (read-only). Pulls everything from the dynamic
// SQLite layer; the web app never writes PROGRESS.md (ADR-0003) — it only
// presents numbers for the human to back-fill manually.

import { getDb } from "./db";
import type { ErrorPattern } from "./types";

export interface TestSummaryStat {
  testId: string;
  status: string;
  firstCorrect: number | null;
  firstAccuracy: number | null;
  isUnseenSample: number;
  attemptCount: number;
}

export function testStats(testIds: string[]): TestSummaryStat[] {
  const db = getDb();
  return testIds.map((testId) => {
    const status = (
      db.prepare("SELECT status FROM test_status WHERE test_id = ?").get(testId) as
        | { status: string }
        | undefined
    )?.status ?? "not_started";
    const first = db
      .prepare(
        "SELECT correct, accuracy, is_unseen_sample FROM attempts WHERE test_id = ? AND type = 'timed' AND is_first = 1 LIMIT 1",
      )
      .get(testId) as { correct: number; accuracy: number; is_unseen_sample: number } | undefined;
    const attemptCount = (
      db.prepare("SELECT COUNT(*) c FROM attempts WHERE test_id = ?").get(testId) as { c: number }
    ).c;
    return {
      testId,
      status,
      firstCorrect: first?.correct ?? null,
      firstAccuracy: first?.accuracy ?? null,
      isUnseenSample: first?.is_unseen_sample ?? 0,
      attemptCount,
    };
  });
}

export function errorPatternCounts(): Record<ErrorPattern, number> {
  const rows = getDb()
    .prepare(
      "SELECT error_pattern, COUNT(*) c FROM review_marks WHERE error_pattern IS NOT NULL GROUP BY error_pattern",
    )
    .all() as { error_pattern: ErrorPattern; c: number }[];
  const out = { G: 0, V: 0, S: 0, E: 0, T: 0, A: 0, L: 0, K: 0 } as Record<ErrorPattern, number>;
  for (const r of rows) out[r.error_pattern] = r.c;
  return out;
}

export interface RetestStats {
  total: number;
  pending: number;
  done: number;
  doneCorrect: number;
}

export function retestStats(): RetestStats {
  const total = (getDb().prepare("SELECT COUNT(*) c FROM retest_schedule").get() as { c: number }).c;
  const pending = (
    getDb().prepare("SELECT COUNT(*) c FROM retest_schedule WHERE status = 'pending'").get() as {
      c: number;
    }
  ).c;
  const doneCorrect = (
    getDb()
      .prepare("SELECT COUNT(*) c FROM retest_schedule WHERE status = 'done' AND retest_correct = 1")
      .get() as { c: number }
  ).c;
  return { total, pending, done: total - pending, doneCorrect };
}
