import { NextResponse } from "next/server";
import { loadTest } from "@/lib/content/question-bank";
import { startTimedAttempt } from "@/lib/application/attempts";

// Start a timed attempt: create the attempt row, mark the test as seen, and
// report whether this is an unseen-question sample (test never opened before).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid request body" }, { status: 400 });
    }
    const { testId } = body as { testId?: unknown };
    if (typeof testId !== "string" || !testId.trim()) {
      return NextResponse.json({ error: "testId required" }, { status: 400 });
    }
    if (!(await loadTest(testId))) {
      return NextResponse.json({ error: "test not found" }, { status: 404 });
    }
    const attempt = startTimedAttempt(testId);
    return NextResponse.json(attempt);
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
