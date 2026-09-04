import { NextResponse } from "next/server";
import { AttemptError, submitTimedAttempt } from "@/lib/application/attempts";

// Submit a timed attempt: score server-side (the client never saw the key),
// persist per-question answers, lock the first submitted score, return scorecard.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { attemptId?: unknown; selections?: unknown };
    if (!Number.isInteger(body.attemptId) || (body.attemptId as number) <= 0) {
      return NextResponse.json({ error: "attemptId must be a positive integer" }, { status: 400 });
    }
    const result = await submitTimedAttempt(body.attemptId as number, body.selections);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AttemptError) {
      const status = error.code === "attempt_not_found" || error.code === "test_not_found" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
