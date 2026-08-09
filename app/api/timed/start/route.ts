import { NextResponse } from "next/server";
import { createAttempt } from "@/lib/attempts";

// Start a timed attempt: create the attempt row, mark the test as seen, and
// report whether this is an unseen-question sample (test never opened before).
export async function POST(req: Request) {
  const { testId } = (await req.json()) as { testId?: string };
  if (!testId) return NextResponse.json({ error: "testId required" }, { status: 400 });
  const attempt = createAttempt("timed", testId);
  return NextResponse.json(attempt);
}
