import { NextResponse } from "next/server";
import { addWordFavorite, removeWordFavorite } from "@/lib/word-favorites";

interface Body {
  wordId: string;
  action: "add" | "remove";
}

// Add or remove a word from the user's word favorites (simple collection,
// no SRS). User state lives in SQLite (ADR-0006); the static word library is
// never written.
export async function POST(req: Request) {
  const { wordId, action } = (await req.json()) as Body;
  if (!wordId) {
    return NextResponse.json({ error: "wordId required" }, { status: 400 });
  }
  if (action === "add") addWordFavorite(wordId);
  else if (action === "remove") removeWordFavorite(wordId);
  else return NextResponse.json({ error: "action must be add or remove" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
