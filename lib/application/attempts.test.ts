import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Keep these tests away from the user's real data/app.db. The adapter reads
// this before its module is imported below.
const tempDir = mkdtempSync(join(tmpdir(), "tuoye-attempts-"));
process.env.TUOYE_DB_PATH = join(tempDir, "app.db");

let db: typeof import("../adapters/sqlite/db");
let attempts: typeof import("./attempts");
let review: typeof import("./review");
let retest: typeof import("./retest");

beforeAll(async () => {
  db = await import("../adapters/sqlite/db");
  attempts = await import("./attempts");
  review = await import("./review");
  retest = await import("./retest");
});

afterAll(() => {
  if (db) db.getDb().close();
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.TUOYE_DB_PATH;
});

describe("attempt application module", () => {
  it("marks a test seen when practice content is opened", () => {
    const started = attempts.startPracticeAttempt("reading-01");

    expect(started.isUnseenSample).toBe(false);
    expect(attempts.statusOf("reading-01")).toBe("seen");
  });

  it("derives practice correctness on the server and is idempotent", async () => {
    const started = attempts.startPracticeAttempt("reading-02");

    const first = await attempts.finishPracticeAttempt(started.id, { "101": "A" });
    const repeated = await attempts.finishPracticeAttempt(started.id, { "101": "B" });
    const answer = db
      .getDb()
      .prepare("SELECT selected, is_correct FROM answers WHERE attempt_id = ? AND question_number = 101")
      .get(started.id) as { selected: string; is_correct: number };

    expect(first).toEqual({ attemptId: started.id, recorded: 1 });
    expect(repeated).toEqual(first);
    expect(answer).toEqual({ selected: "A", is_correct: 1 });
  });

  it("locks the first timed score and returns it on repeated submission", async () => {
    const started = attempts.startTimedAttempt("reading-03");

    const first = await attempts.submitTimedAttempt(started.id, {});
    const repeated = await attempts.submitTimedAttempt(started.id, { "101": "A" });
    const stored = db
      .getDb()
      .prepare("SELECT is_first, COUNT(*) AS answers FROM attempts JOIN answers ON answers.attempt_id = attempts.id WHERE attempts.id = ?")
      .get(started.id) as { is_first: number; answers: number };
    const schedules = db
      .getDb()
      .prepare("SELECT COUNT(*) AS count FROM retest_schedule WHERE test_id = ?")
      .get("reading-03") as { count: number };

    expect(first.isFirst).toBe(true);
    expect(repeated).toEqual(first);
    expect(stored).toEqual({ is_first: 1, answers: 100 });
    expect(schedules.count).toBe(300);
  });

  it("allows only one first timed score for a test", async () => {
    const first = attempts.startTimedAttempt("reading-04");
    const second = attempts.startTimedAttempt("reading-04");

    const results = await Promise.all([
      attempts.submitTimedAttempt(first.id, {}),
      attempts.submitTimedAttempt(second.id, {}),
    ]);
    const locked = db
      .getDb()
      .prepare("SELECT COUNT(*) AS count FROM attempts WHERE test_id = ? AND type = 'timed' AND is_first = 1")
      .get("reading-04") as { count: number };

    expect(results.filter((result) => result.isFirst)).toHaveLength(1);
    expect(locked.count).toBe(1);
  });

  it("scopes review marks to completed timed attempts", async () => {
    const practice = attempts.startPracticeAttempt("reading-05");
    await expect(review.upsertMark(practice.id, 101, "G", null)).rejects.toMatchObject({
      code: "attempt_wrong_mode",
    });

    const timed = attempts.startTimedAttempt("reading-05");
    await attempts.submitTimedAttempt(timed.id, {});
    await review.upsertMark(timed.id, 101, "G", "结构判断");
    expect(review.getMarks(timed.id).get(101)).toMatchObject({
      errorPattern: "G",
      note: "结构判断",
    });
    await expect(review.upsertMark(timed.id, 999, "G", null)).rejects.toMatchObject({
      code: "question_not_found",
    });
  });

  it("does not overwrite a completed retest result", async () => {
    const item = retest.listSchedule().find((row) => row.testId === "reading-03");
    expect(item).toBeDefined();
    retest.markRetestDone(item!.id, true);
    expect(() => retest.markRetestDone(item!.id, false)).toThrowError(
      expect.objectContaining({ code: "already_done" }),
    );
  });
});
