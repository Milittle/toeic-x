import { NextResponse } from "next/server";
import { markRetestDone } from "@/lib/retest";

interface Body {
  id: number;
  correct: boolean;
}

// Record the outcome of a retest done in practice mode (D+2/D+7/D+21).
export async function POST(req: Request) {
  const { id, correct } = (await req.json()) as Body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  markRetestDone(id, correct);
  return NextResponse.json({ ok: true });
}
