"use client";

import { useState } from "react";
import Link from "next/link";
import { ERROR_PATTERNS, type ErrorPattern, type Letter } from "@/lib/domain/types";

const PATTERNS = Object.keys(ERROR_PATTERNS) as ErrorPattern[];

export interface ReviewItem {
  number: number;
  stem: string;
  options: Record<Letter, string>;
  answer: Letter;
  explanation: string;
  translation: string;
  passage: { title: string; text: string; descriptor: string } | null;
  showPassage: boolean;
  selected: Letter | null;
  isCorrect: boolean | null;
  mark: { errorPattern: ErrorPattern | null; note: string | null } | null;
}

interface Props {
  testId: string;
  title: string;
  attemptId: number;
  items: ReviewItem[];
}

export function ReviewClient({ testId, title, attemptId, items }: Props) {
  const [marks, setMarks] = useState(() =>
    Object.fromEntries(items.map((it) => [it.number, it.mark])),
  );
  const [notes, setNotes] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((it) => [it.number, it.mark?.note ?? ""])),
  );

  async function save(number: number, errorPattern: ErrorPattern | null, note: string | null) {
    setMarks((m) => ({ ...m, [number]: { errorPattern, note } }));
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, questionNumber: number, errorPattern, note }),
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href={`/tests/${testId}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← 返回
        </Link>
        <h1 className="font-semibold">{title} · 复盘</h1>
        <Link href={`/retests`} className="text-sm text-blue-600 hover:underline">复测列表 →</Link>
      </header>

      <ol className="space-y-4">
        {items.map((it) => {
          const missed = it.isCorrect === false || it.selected === null;
          return (
            <li key={it.number} className={`rounded-xl border bg-white p-4 ${missed ? "border-red-200" : "border-slate-200"}`}>
              {it.passage && it.showPassage && (
                <details className="mb-3 rounded bg-slate-50 p-2 text-sm">
                  <summary className="cursor-pointer text-xs uppercase tracking-wide text-slate-400">
                    {it.passage.descriptor} {it.passage.title && `· ${it.passage.title}`}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{it.passage.text}</p>
                </details>
              )}
              <p className="mb-2 font-medium">
                <span className="text-slate-400">{it.number}.</span> {it.stem || "（见上方文章）"}
              </p>
              <div className="mb-2 space-y-1 text-sm">
                {(["A", "B", "C", "D"] as Letter[]).map((l) => (
                  <p
                    key={l}
                    className={
                      l === it.answer
                        ? "font-semibold text-emerald-700"
                        : l === it.selected && !it.isCorrect
                          ? "text-red-600 line-through"
                          : "text-slate-600"
                    }
                  >
                    ({l}) {it.options[l]}
                    {l === it.selected ? "  ← 你的选择" : ""}
                  </p>
                ))}
              </div>
              <p className="mb-1 text-sm">
                {it.isCorrect === true && <span className="text-emerald-700">✓ 答对</span>}
                {it.isCorrect === false && <span className="text-red-600">✗ 答错（正确：{it.answer}）</span>}
                {it.selected === null && <span className="text-amber-700">○ 未答（正确：{it.answer}）</span>}
              </p>
              {(it.translation || it.explanation) && (
                <div className="mb-3 rounded bg-slate-50 p-2 text-xs text-slate-600">
                  {it.translation && <p>译文：{it.translation}</p>}
                  {it.explanation && <p className="mt-1">解析：{it.explanation}</p>}
                </div>
              )}

              {missed && (
                <div className="mt-2 border-t border-slate-100 pt-3">
                  <p className="mb-1 text-xs text-slate-500">主错因（标记后进入复测）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PATTERNS.map((p) => {
                      const active = marks[it.number]?.errorPattern === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => save(it.number, active ? null : p, notes[it.number] || null)}
                          className={`rounded-full px-2.5 py-1 text-xs ${active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                          title={ERROR_PATTERNS[p]}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={notes[it.number] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [it.number]: e.target.value }))}
                    onBlur={(e) => save(it.number, marks[it.number]?.errorPattern ?? null, e.target.value || null)}
                    placeholder="备注（可选）"
                    className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
