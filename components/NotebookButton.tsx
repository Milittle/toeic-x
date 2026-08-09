"use client";

import { useState } from "react";

// Toggle a collocation in/out of the notebook. Optimistic update; reverts on
// network failure. Server renders the initial state via `inNotebook`.
export function NotebookButton({
  collocationId,
  inNotebook,
  size = "sm",
}: {
  collocationId: string;
  inNotebook: boolean;
  size?: "sm" | "md";
}) {
  const [saved, setSaved] = useState(inNotebook);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      const res = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collocationId, action: next ? "add" : "remove" }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      setSaved(!next);
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
        saved
          ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {saved ? "✓ 已收藏" : "+ 收藏"}
    </button>
  );
}
