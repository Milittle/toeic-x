// Local SQLite dynamic layer (ADR-0002): attempts, answers, test status,
// review marks, retest schedule. The app.db file lives under data/ and is
// created on first run. The question bank (data/questions/) is never written.

import Database from "better-sqlite3";
import path from "path";
import type { TestStatus } from "../../domain/types";

const DB_PATH = process.env.TUOYE_DB_PATH ?? path.join(process.cwd(), "data", "app.db");

const SCHEMA_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS attempts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  type             TEXT    NOT NULL,            -- 'practice' | 'timed'
  test_id          TEXT    NOT NULL,
  started_at       TEXT    NOT NULL,            -- ISO 8601
  ended_at         TEXT,                         -- ISO 8601, null until submitted
  duration_sec     INTEGER,
  is_first         INTEGER NOT NULL DEFAULT 0,   -- 1 for a first-try locked timed attempt
  is_unseen_sample INTEGER NOT NULL DEFAULT 0,
  accuracy         REAL,                          -- correct / 100 (timed only)
  correct          INTEGER,
  wrong            INTEGER,
  unanswered       INTEGER,
  CHECK (type IN ('practice', 'timed')),
  CHECK (is_first IN (0, 1)),
  CHECK (is_unseen_sample IN (0, 1)),
  CHECK (accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 1))
);

CREATE TABLE IF NOT EXISTS answers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id     INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  selected       TEXT,                            -- 'A'..'D', null if unanswered
  is_correct     INTEGER,                         -- 1/0/null; null for practice until revealed
  answered_at    TEXT,
  UNIQUE (attempt_id, question_number),
  CHECK (selected IS NULL OR selected IN ('A', 'B', 'C', 'D')),
  CHECK (is_correct IS NULL OR is_correct IN (0, 1))
);

CREATE TABLE IF NOT EXISTS test_status (
  test_id    TEXT PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'not_started', -- not_started | seen | first_attempted
  updated_at TEXT NOT NULL,
  CHECK (status IN ('not_started', 'seen', 'first_attempted'))
);

CREATE TABLE IF NOT EXISTS review_marks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id     INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  error_pattern  TEXT,                             -- G/V/S/E/T/A/L/K
  note           TEXT,
  created_at     TEXT NOT NULL,
  UNIQUE (attempt_id, question_number),
  CHECK (error_pattern IS NULL OR error_pattern IN ('G', 'V', 'S', 'E', 'T', 'A', 'L', 'K'))
);

CREATE TABLE IF NOT EXISTS retest_schedule (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id         TEXT    NOT NULL,
  question_number INTEGER NOT NULL,
  slot            TEXT    NOT NULL,               -- 'D+2' | 'D+7' | 'D+21'
  due_date        TEXT    NOT NULL,               -- ISO date (YYYY-MM-DD)
  status          TEXT    NOT NULL DEFAULT 'pending', -- pending | done
  retest_correct  INTEGER,                         -- 1/0 once retested
  attempt_id      INTEGER REFERENCES attempts(id),
  UNIQUE (test_id, question_number, slot),
  CHECK (slot IN ('D+2', 'D+7', 'D+21')),
  CHECK (status IN ('pending', 'done')),
  CHECK (retest_correct IS NULL OR retest_correct IN (0, 1))
);

CREATE TABLE IF NOT EXISTS collocation_notebook (
  collocation_id TEXT PRIMARY KEY,
  added_at       TEXT NOT NULL                     -- ISO 8601
);

CREATE TABLE IF NOT EXISTS word_notebook (
  word_id TEXT PRIMARY KEY,
  added_at TEXT NOT NULL                     -- ISO 8601
);
`;

type Db = Database.Database;

function migrate(db: Db): void {
  db.exec(SCHEMA);

  // These indexes add invariants that cannot be added by
  // CREATE TABLE IF NOT EXISTS when opening a database created by an older
  // version. Refuse ambiguous legacy data instead of silently rewriting it.
  const duplicateFirst = db
    .prepare(
      `SELECT test_id FROM attempts
       WHERE type = 'timed' AND is_first = 1
       GROUP BY test_id HAVING COUNT(*) > 1 LIMIT 1`,
    )
    .get() as { test_id: string } | undefined;
  if (duplicateFirst) {
    throw new Error(
      `cannot migrate database: multiple first timed attempts for ${duplicateFirst.test_id}`,
    );
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_first_timed_per_test
      ON attempts(test_id) WHERE type = 'timed' AND is_first = 1;
    CREATE INDEX IF NOT EXISTS answers_attempt_idx ON answers(attempt_id);
    CREATE INDEX IF NOT EXISTS retest_schedule_due_idx
      ON retest_schedule(status, due_date);
  `);

  const version = Number(db.pragma("user_version", { simple: true }));
  if (version < SCHEMA_VERSION) db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

// Avoid opening multiple handles under Next.js hot-reload.
const globalForDb = globalThis as unknown as { __tuoyeDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__tuoyeDb) {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    globalForDb.__tuoyeDb = db;
  }
  return globalForDb.__tuoyeDb;
}

// ---- test status ----

const STATUS_ORDER: Record<TestStatus, number> = {
  not_started: 0,
  seen: 1,
  first_attempted: 2,
};

/** Promote a test's status, never demoting it (first_attempted > seen > not_started). */
export function markStatusOnDb(
  db: Db,
  testId: string,
  target: TestStatus,
  now = new Date().toISOString(),
): void {
  const row = db
    .prepare("SELECT status FROM test_status WHERE test_id = ?")
    .get(testId) as { status: TestStatus } | undefined;
  const current = (row?.status ?? "not_started") as TestStatus;
  if (STATUS_ORDER[target] > STATUS_ORDER[current]) {
    db.prepare(
      `INSERT INTO test_status (test_id, status, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(test_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    ).run(testId, target, now);
  }
}

export function markStatus(testId: string, target: TestStatus): void {
  markStatusOnDb(getDb(), testId, target);
}

export function getStatuses(): Record<string, TestStatus> {
  const rows = getDb().prepare("SELECT test_id, status FROM test_status").all() as {
    test_id: string;
    status: TestStatus;
  }[];
  return Object.fromEntries(rows.map((r) => [r.test_id, r.status]));
}
