"use client";

import { useState } from "react";
import Link from "next/link";

// The favorites list owns its own state so a remove is optimistic: the row
// disappears immediately and is restored only on network failure. The remove
// button mirrors the "+ 收藏" add button's shape (ADR-0006).
export interface WordFavoriteItem {
  id: string;
  word: string;
  phonetic: string | null;
  level: string | null;
  zhDef: string;
}

const LEVEL_STYLE: Record<string, string> = {
  S: "bg-red-100 text-red-700",
  A: "bg-amber-100 text-amber-700",
  B: "bg-slate-100 text-slate-600",
  "基础": "bg-blue-50 text-blue-700",
};

export function WordFavoritesList({ items }: { items: WordFavoriteItem[] }) {
  const [list, setList] = useState(items);

  async function remove(item: WordFavoriteItem) {
    setList((prev) => prev.filter((x) => x.id !== item.id));
    try {
      const res = await fetch("/api/word-favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: item.id, action: "remove" }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      setList((prev) => [item, ...prev]);
    }
  }

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {list.length > 0 ? `共 ${list.length} 个` : null}
      </p>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">还没有收藏的单词。</p>
          <p className="mt-1 text-sm text-slate-500">
            在
            <Link href="/words" className="text-blue-600 hover:underline">
              {" "}
              背单词{" "}
            </Link>
            里，把想记的词加入收藏。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((w) => (
            <li
              key={w.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">{w.word}</span>
                  {w.phonetic && <span className="text-xs text-slate-400">/{w.phonetic}/</span>}
                  {w.level && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[w.level]}`}
                    >
                      {w.level}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-600">{w.zhDef || "（无中文释义）"}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(w)}
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
