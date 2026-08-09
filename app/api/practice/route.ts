import { NextResponse } from "next/server";
import { createAttempt, recordAnswers, type AnswerRow } from "@/lib/attempts";
import type { Letter } from "@/lib/types";

interface PracticeBody {
  testId: string;
  answers: { questionNumber: number; selected: Letter; isCorrect: boolean }[];
}

// Finish a practice session: record per-question answers. Practice gives
// instant feedback client-side and is not a first-try scoring sample, so no
// score is stored on the attempt itself.
export async function POST(req: Request) {
  const body = (await req.json()) as PracticeBody;
  if (!body.testId) return NextResponse.json({ error: "testId required" }, { status: 400 });
  const { id } = createAttempt("practice", body.testId);
  const rows: AnswerRow[] = body.answers.map((a) => ({
    questionNumber: a.questionNumber,
    selected: a.selected,
    isCorrect: a.isCorrect,
  }));
  recordAnswers(id, rows);
  return NextResponse.json({ attemptId: id, recorded: rows.length });
}
