import { NextResponse } from "next/server";
import { RetestError, markRetestDone } from "@/lib/application/retest";

// Record the outcome of a retest done in practice mode (D+2/D+7/D+21).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid request body" }, { status: 400 });
    }
    const { id, correct } = body as { id?: unknown; correct?: unknown };
    markRetestDone(id, correct);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RetestError) {
      return NextResponse.json({ error: error.message }, { status: error.code === "not_found" ? 404 : 400 });
    }
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
