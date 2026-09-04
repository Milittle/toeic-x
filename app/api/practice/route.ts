import { NextResponse } from "next/server";
import { AttemptError, finishPracticeAttempt } from "@/lib/application/attempts";

// Finish a practice session: record per-question answers. Practice gives
// instant feedback client-side and is not a first-try scoring sample, so no
// score is stored on the attempt itself.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      attemptId?: unknown;
      answers?: unknown;
    };
    if (!Number.isInteger(body.attemptId) || (body.attemptId as number) <= 0) {
      return NextResponse.json({ error: "attemptId must be a positive integer" }, { status: 400 });
    }
    if (!Array.isArray(body.answers)) {
      return NextResponse.json({ error: "answers must be an array" }, { status: 400 });
    }
    const selections: Record<string, unknown> = {};
    for (const answer of body.answers) {
      if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
        return NextResponse.json({ error: "invalid answer" }, { status: 400 });
      }
      const row = answer as { questionNumber?: unknown; selected?: unknown };
      if (!Number.isInteger(row.questionNumber) || typeof row.selected !== "string") {
        return NextResponse.json({ error: "invalid answer" }, { status: 400 });
      }
      selections[String(row.questionNumber)] = row.selected;
    }
    const result = await finishPracticeAttempt(body.attemptId as number, selections);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AttemptError) {
      const status = error.code === "attempt_not_found" || error.code === "test_not_found" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
