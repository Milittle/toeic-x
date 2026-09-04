import { NextResponse } from "next/server";
import { ReviewError, upsertMark } from "@/lib/application/review";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid request body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    if (!Number.isInteger(b.attemptId) || !Number.isInteger(b.questionNumber)) {
      return NextResponse.json(
        { error: "attemptId and questionNumber must be integers" },
        { status: 400 },
      );
    }
    await upsertMark(
      b.attemptId,
      b.questionNumber,
      b.errorPattern === undefined ? null : b.errorPattern,
      b.note === undefined ? null : b.note,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ReviewError) {
      const status = error.code === "attempt_not_found" || error.code === "question_not_found" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
