import { NextResponse } from "next/server";
import { addToNotebook, removeFromNotebook } from "@/lib/notebook";

interface Body {
  collocationId: string;
  action: "add" | "remove";
}

// Add or remove a collocation from the user's notebook (simple collection,
// no SRS). User state lives in SQLite (ADR-0002/0004); the static library is
// never written.
export async function POST(req: Request) {
  const { collocationId, action } = (await req.json()) as Body;
  if (!collocationId) {
    return NextResponse.json({ error: "collocationId required" }, { status: 400 });
  }
  if (action === "add") addToNotebook(collocationId);
  else if (action === "remove") removeFromNotebook(collocationId);
  else return NextResponse.json({ error: "action must be add or remove" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
