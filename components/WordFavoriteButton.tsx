"use client";

import { useState } from "react";

// Toggle a word in/out of the word favorites. Optimistic update; reverts on
// network failure. Server renders the initial state via `saved`.
// Mirrors NotebookButton (ADR-0006); the static word library is never written.
export function WordFavoriteButton({
  wordId,
  saved,
  size = "sm",
}: {
  wordId: string;
  saved: boolean;
  size?: "sm" | "md";
}) {
  const [isSaved, setIsSaved] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !isSaved;
    setIsSaved(next);
    setBusy(true);
    try {
      const res = await fetch("/api/word-favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, action: next ? "add" : "remove" }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      setIsSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  const padding = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 rounded-lg border font-medium transition ${padding} ${
        isSaved
          ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {isSaved ? "✓ 已收藏" : "+ 收藏"}
    </button>
  );
}
