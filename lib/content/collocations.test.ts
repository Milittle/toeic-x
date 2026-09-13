import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CollocationQuestion } from "./collocations";

// 搭配真题页的两条核心行为：未练习的套题只给题号，练习过之后连「原句」一起给。
// 与 attempts.test.ts 同一套做法：把 DB 指向临时目录，绝不碰用户真实的 data/app.db。
const tempDir = mkdtempSync(join(tmpdir(), "tuoye-collocations-"));
process.env.TUOYE_DB_PATH = join(tempDir, "app.db");

let db: typeof import("../adapters/sqlite/db");
let collocations: typeof import("./collocations");
let example: typeof import("../domain/collocation-example");

beforeAll(async () => {
  db = await import("../adapters/sqlite/db");
  collocations = await import("./collocations");
  example = await import("../domain/collocation-example");
});

afterAll(() => {
  if (db) db.getDb().close();
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.TUOYE_DB_PATH;
});

function toSource(q: CollocationQuestion, expression: string) {
  return {
    part: q.part,
    number: q.number,
    stem: q.stem,
    answerText: q.options[q.answer] ?? "",
    passageText: q.passage?.text ?? null,
    blankIndex: q.blankIndex,
    expression,
  };
}

describe("collocation sources: 门控", () => {
  it("未练习过的套题只给题号，不给题目内容，算不出原句", async () => {
    const c = await collocations.getCollocation("the-majority-of");
    expect(c).not.toBeNull();
    const group = (await collocations.collocationSourceGroups(c!)).find(
      (g) => g.testId === "reading-01",
    );

    expect(group?.status).toBe("not_started");
    expect(group?.revealed).toBe(false);
    expect(group?.numbers).toEqual([110]);
    expect(group?.questions).toEqual([]);
  });

  it("练习过之后给出题目，Part 5 的「原句」已补上正确答案", async () => {
    db.markStatus("reading-01", "seen");
    const c = await collocations.getCollocation("the-majority-of");
    const group = (await collocations.collocationSourceGroups(c!)).find(
      (g) => g.testId === "reading-01",
    );
    const q = group?.questions.find((x) => x.number === 110);
    expect(q).toBeDefined();

    expect(example.questionExample(toSource(q!, c!.expression))).toEqual({
      before: "The majority of the contract",
      match: "negotiations",
      after: "that took place during the year were handled by lawyers from a local law firm.",
    });
  });

  it("Part 6 的题带上「文章里的第几个空」，原句按题号标记补空", async () => {
    const c = await collocations.getCollocation("across-the-board");
    const group = (await collocations.collocationSourceGroups(c!)).find(
      (g) => g.testId === "reading-01",
    );
    const q = group?.questions.find((x) => x.number === 131);
    expect(q?.blankIndex).toBe(0);

    const ex = example.questionExample(toSource(q!, c!.expression));
    expect(ex?.match).toBe("have decided");
    expect(ex?.before.endsWith("Several of Canada’s largest banks")).toBe(true);
    expect(ex?.after.startsWith("to decrease their mortgage rates")).toBe(true);
  });
});
