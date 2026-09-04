// Word favorites — the user's saved words for later review (mirrors
// application/notebook.ts for collocations). The static word library
// (data/words/words.json) is read-only (ADR-0005); this user state lives in the
// SQLite dynamic layer, parallel to collocation_notebook (ADR-0006).
//
// Dedup: the table keys on word_id, so a word favorited under one word-list tab
// is favorited across all tabs (ADR-0006).

import { getDb } from "../adapters/sqlite/db";

export interface WordFavoriteRow {
  wordId: string;
  addedAt: string;
}

export function listWordFavorites(): WordFavoriteRow[] {
  const rows = getDb()
    .prepare("SELECT word_id, added_at FROM word_notebook ORDER BY added_at DESC")
    .all() as { word_id: string; added_at: string }[];
  return rows.map((r) => ({ wordId: r.word_id, addedAt: r.added_at }));
}

export function wordFavoriteIds(): Set<string> {
  return new Set(listWordFavorites().map((r) => r.wordId));
}

export function wordFavoriteCount(): number {
  return (getDb().prepare("SELECT COUNT(*) c FROM word_notebook").get() as { c: number }).c;
}

export function isWordFavorited(wordId: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM word_notebook WHERE word_id = ?").get(wordId);
}

export function addWordFavorite(wordId: string): void {
  getDb()
    .prepare("INSERT OR IGNORE INTO word_notebook (word_id, added_at) VALUES (?, ?)")
    .run(wordId, new Date().toISOString());
}

export function removeWordFavorite(wordId: string): void {
  getDb().prepare("DELETE FROM word_notebook WHERE word_id = ?").run(wordId);
}
