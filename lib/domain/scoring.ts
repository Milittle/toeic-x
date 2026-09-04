// Scoring engine — pure functions. The only place "what is correct / wrong /
// unanswered" and "accuracy" are decided, so it can be unit-tested in isolation.

import type { Letter, ReadingTest } from "./types";

export interface ScoredQuestion {
  number: number;
  answer: Letter;
  part: 5 | 6 | 7;
}

export interface PartScore {
  part: 5 | 6 | 7;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
}

export interface ScoreResult {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  /** correct / total (0..1). */
  accuracy: number;
  byPart: PartScore[];
}

/** Flatten a test into the minimal shape the scorer needs (number, answer, part). */
export function toScored(test: ReadingTest): ScoredQuestion[] {
  const out: ScoredQuestion[] = [];
  for (const p of test.parts) {
    if (p.part === 5) {
      for (const q of p.questions) out.push({ number: q.number, answer: q.answer, part: 5 });
    } else {
      for (const ps of p.passages) {
        for (const q of ps.questions) out.push({ number: q.number, answer: q.answer, part: p.part });
      }
    }
  }
  return out;
}

/**
 * Score a set of selections against the answer key. `selections` maps question
 * number -> chosen letter; an absent or undefined entry counts as unanswered
 * (never as wrong).
 */
export function scoreQuestions(
  questions: ReadonlyArray<ScoredQuestion>,
  selections: ReadonlyMap<number, Letter | undefined>,
): ScoreResult {
  const byPart = new Map<5 | 6 | 7, PartScore>();
  let correct = 0,
    wrong = 0,
    unanswered = 0;

  for (const q of questions) {
    const ps = byPart.get(q.part) ?? { part: q.part, total: 0, correct: 0, wrong: 0, unanswered: 0 };
    const chosen = selections.get(q.number);
    if (chosen === undefined) {
      unanswered += 1;
      ps.unanswered += 1;
    } else if (chosen === q.answer) {
      correct += 1;
      ps.correct += 1;
    } else {
      wrong += 1;
      ps.wrong += 1;
    }
    ps.total += 1;
    byPart.set(q.part, ps);
  }

  const total = questions.length;
  return {
    total,
    correct,
    wrong,
    unanswered,
    accuracy: total > 0 ? correct / total : 0,
    byPart: ([5, 6, 7] as const)
      .filter((p) => byPart.has(p))
      .map((p) => byPart.get(p)!),
  };
}
