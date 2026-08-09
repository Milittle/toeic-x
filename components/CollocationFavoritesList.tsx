"use client";

import { useState } from "react";
import Link from "next/link";

// The favorites list owns its own state so a remove is optimistic: the row
// disappears immediately and is restored only on network failure. The remove
// button mirrors the "+ 收藏" add button's shape (ADR-0006).
export interface CollocationFavoriteItem {
  id: string;
  expression: string;
  chinese: string;
  priority: "S" | "A" | "B" | null;
  parts: number[];
}

const PRIORITY_STYLE: Record<string, string> = {
  S: "bg-red-100 text-red-700",
  A: "bg-amber-100 text-amber-700",
  B: "bg-slate-100 text-slate-600",
};

export function CollocationFavoritesList({ items }: { items: CollocationFavoriteItem[] }) {
  const [list, setList] = useState(items);

  async function remove(item: CollocationFavoriteItem) {
    setList((prev) => prev.filter((x) => x.id !== item.id));
    try {
      const res = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collocationId: item.id, action: "remove" }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      setList((prev) => [item, ...prev]);
    }
  }

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {list.length > 0 ? `共 ${list.length} 条` : null}
      </p>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">还没有收藏的搭配。</p>
          <p className="mt-1 text-sm text-slate-500">
            在
            <Link href="/collocations" className="text-blue-600 hover:underline">
              {" "}
              搭配库{" "}
            </Link>
            里，把想记的词块加入收藏。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/collocations/${c.id}`} className="font-semibold hover:underline">
                    {c.expression}
                  </Link>
                  {c.priority && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[c.priority]}`}
                    >
                      {c.priority}
                    </span>
                  )}
                  {c.parts.map((p) => (
                    <span key={p} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      P{p}
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-600">{c.chinese || "（无中文）"}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(c)}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                ✕ 移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
