import { NextResponse } from "next/server";
import { loadTest } from "@/lib/loaders";
import { recordAnswers, submitTimedAttempt, type AnswerRow } from "@/lib/attempts";
import { scoreQuestions, toScored } from "@/lib/scoring";
import { scheduleMissed } from "@/lib/retest";
import type { Letter } from "@/lib/types";

interface SubmitBody {
  attemptId: number;
  testId: string;
  startedAt: string;
  selections: Record<string, Letter>; // { "101": "A", ... }
}

// Submit a timed attempt: score server-side (the client never saw the key),
// persist per-question answers, lock the first submitted score, return scorecard.
export async function POST(req: Request) {
  const body = (await req.json()) as SubmitBody;
  const test = await loadTest(body.testId);
  if (!test) return NextResponse.json({ error: "test not found" }, { status: 404 });

  const scoredQuestions = toScored(test);
  const sel = new Map<number, Letter | undefined>(
    Object.entries(body.selections).map(([n, l]) => [Number(n), l]),
  );
  const scored = scoreQuestions(scoredQuestions, sel);

  const answers: AnswerRow[] = scoredQuestions.map((q) => {
    const chosen = sel.get(q.number);
    return {
      questionNumber: q.number,
      selected: chosen ?? null,
      isCorrect: chosen === undefined ? null : chosen === q.answer,
    };
  });
  recordAnswers(body.attemptId, answers);
  const { isFirst } = submitTimedAttempt(body.attemptId, body.testId, scored, body.startedAt);

  // Schedule retests (D+2 / D+7 / D+21) for every missed question.
  const missed = answers.filter((a) => a.isCorrect !== true).map((a) => a.questionNumber);
  if (missed.length) scheduleMissed(body.testId, missed);

  return NextResponse.json({ scored, isFirst });
}
