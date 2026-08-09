import { NextResponse } from "next/server";
import { upsertMark } from "@/lib/review";
import type { ErrorPattern } from "@/lib/types";

interface Body {
  attemptId: number;
  questionNumber: number;
  errorPattern: ErrorPattern | null;
  note: string | null;
}

export async function POST(req: Request) {
  const b = (await req.json()) as Body;
  if (!b.attemptId || !b.questionNumber) {
    return NextResponse.json({ error: "attemptId and questionNumber required" }, { status: 400 });
  }
  upsertMark(b.attemptId, b.questionNumber, b.errorPattern, b.note ?? null);
  return NextResponse.json({ ok: true });
}
