// Collocation notebook — the user's saved collocations for active recall.
// The static collocation library (data/collocations/*.json) is read-only
// (ADR-0004); this user state lives in the SQLite dynamic layer (ADR-0002),
// parallel to test_status / retest_schedule.

import { getDb } from "./db";

export interface NotebookRow {
  collocationId: string;
  addedAt: string;
}

export function listNotebook(): NotebookRow[] {
  const rows = getDb()
    .prepare("SELECT collocation_id, added_at FROM collocation_notebook ORDER BY added_at DESC")
    .all() as { collocation_id: string; added_at: string }[];
  return rows.map((r) => ({ collocationId: r.collocation_id, addedAt: r.added_at }));
}

export function notebookIds(): Set<string> {
  return new Set(listNotebook().map((r) => r.collocationId));
}

export function notebookCount(): number {
  return (getDb().prepare("SELECT COUNT(*) c FROM collocation_notebook").get() as { c: number }).c;
}

export function isInNotebook(collocationId: string): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM collocation_notebook WHERE collocation_id = ?")
    .get(collocationId);
}

export function addToNotebook(collocationId: string): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO collocation_notebook (collocation_id, added_at) VALUES (?, ?)",
    )
    .run(collocationId, new Date().toISOString());
}

export function removeFromNotebook(collocationId: string): void {
  getDb().prepare("DELETE FROM collocation_notebook WHERE collocation_id = ?").run(collocationId);
}
