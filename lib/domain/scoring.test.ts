import { describe, expect, it } from "vitest";
import { scoreQuestions, toScored, type ScoredQuestion } from "./scoring";
import type { Letter } from "./types";

const Q = (number: number, answer: Letter, part: 5 | 6 | 7): ScoredQuestion => ({
  number,
  answer,
  part,
});
const sel = (entries: Array<[number, Letter]>): Map<number, Letter | undefined> =>
  new Map<number, Letter | undefined>(entries);

describe("scoreQuestions", () => {
  it("classifies correct / wrong / unanswered as three distinct states", () => {
    const qs = [Q(101, "A", 5), Q(102, "B", 5), Q(131, "D", 6), Q(147, "C", 7)];
    const r = scoreQuestions(qs, sel([[101, "A"], [102, "C"], [147, "C"]]));
    expect(r.total).toBe(4);
    expect(r.correct).toBe(2);
    expect(r.wrong).toBe(1);
    expect(r.unanswered).toBe(1);
    expect(r.accuracy).toBe(0.5);
  });

  it("counts unanswered as unanswered, never as wrong", () => {
    const qs = [Q(101, "A", 5), Q(102, "B", 5)];
    const r = scoreQuestions(qs, sel([]));
    expect(r.correct).toBe(0);
    expect(r.wrong).toBe(0);
    expect(r.unanswered).toBe(2);
    expect(r.accuracy).toBe(0);
  });

  it("breaks results down by part", () => {
    const qs = [
      Q(101, "A", 5), Q(102, "A", 5),
      Q(131, "B", 6),
      Q(147, "C", 7), Q(148, "D", 7),
    ];
    const sel2 = sel([[101, "A"], [131, "B"], [147, "C"]]); // P5:1/2 P6:1/1 P7:1/2
    const r = scoreQuestions(qs, sel2);
    const byPart = Object.fromEntries(r.byPart.map((p) => [p.part, p]));
    expect(byPart[5]).toMatchObject({ total: 2, correct: 1, wrong: 0, unanswered: 1 });
    expect(byPart[6]).toMatchObject({ total: 1, correct: 1, wrong: 0, unanswered: 0 });
    expect(byPart[7]).toMatchObject({ total: 2, correct: 1, wrong: 0, unanswered: 1 });
  });

  it("toScored flattens a test preserving part membership", () => {
    const test = {
      testId: "t",
      title: "t",
      verified: false,
      parts: [
        { part: 5, questions: [{ number: 101, stem: "", options: { A: "a", B: "b", C: "c", D: "d" }, answer: "A" as const, translation: "", explanation: "" }] },
        { part: 7, passages: [{ id: "p1", descriptor: "", title: "", text: "", questions: [{ number: 147, stem: "", options: { A: "a", B: "b", C: "c", D: "d" }, answer: "C" as const, translation: "", explanation: "" }] }] },
      ],
    };
    const scored = toScored(test as never);
    expect(scored).toEqual([
      { number: 101, answer: "A", part: 5 },
      { number: 147, answer: "C", part: 7 },
    ]);
  });
});
