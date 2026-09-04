"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { flattenClientTest, type ClientTest } from "@/lib/domain/questions";
import type { Letter } from "@/lib/domain/types";

const LETTERS: Letter[] = ["A", "B", "C", "D"];

export function PracticeClient({ test, attemptId }: { test: ClientTest; attemptId: number }) {
  const items = useMemo(() => flattenClientTest(test), [test]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [saved, setSaved] = useState(false);

  const item = items[current];
  const q = item.question;
  const chosen = answers[q.number];
  const revealed = chosen !== undefined;
  const correct = q.answer !== undefined && chosen === q.answer;

  function choose(letter: Letter) {
    setAnswers((prev) => ({ ...prev, [q.number]: letter }));
  }

  async function finish() {
    const payload = {
      attemptId,
      answers: Object.entries(answers).map(([n, sel]) => {
        const question = items.find((it) => it.question.number === Number(n))!.question;
        return { questionNumber: Number(n), selected: sel };
      }),
    };
    await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaved(true);
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href={`/tests/${test.testId}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← 返回
        </Link>
        <h1 className="font-semibold">{test.title} · 练习</h1>
        <span className="text-sm text-slate-500">已作答 {answeredCount}/{items.length}</span>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        {/* main panel */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          {item.passage && item.showPassage && (
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
                {item.passage.descriptor} {item.passage.title && `· ${item.passage.title}`}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">{item.passage.text}</p>
            </div>
          )}

          <p className="mb-3 font-medium">
            <span className="text-slate-400">{q.number}.</span> {q.stem || "（见上方文章上下文）"}
          </p>

          <ul className="space-y-2">
            {LETTERS.map((letter) => {
              const isChosen = chosen === letter;
              const isAnswer = q.answer === letter;
              let style = "border-slate-200 hover:border-slate-300";
              if (revealed) {
                if (isAnswer) style = "border-emerald-400 bg-emerald-50";
                else if (isChosen) style = "border-red-400 bg-red-50";
                else style = "border-slate-200 opacity-70";
              } else if (isChosen) {
                style = "border-slate-400 bg-slate-50";
              }
              return (
                <li key={letter}>
                  <button
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(letter)}
                    className={`flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm ${style}`}
                  >
                    <span className="font-mono font-semibold">({letter})</span>
                    <span>{q.options[letter]}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {revealed && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium">
                {correct ? "✓ 答对了" : `✗ 正确答案：(${q.answer})`}
              </p>
              {q.translation && <p className="mt-2 text-slate-600">译文：{q.translation}</p>}
              {q.explanation && <p className="mt-1 text-slate-600">解析：{q.explanation}</p>}
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
            >
              上一题
            </button>
            {current < items.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(items.length - 1, c + 1))}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
              >
                下一题
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saved}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saved ? "已保存" : "完成练习"}
              </button>
            )}
          </div>
        </section>

        {/* navigator */}
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">题号导航</p>
          <div className="grid grid-cols-6 gap-1.5 md:grid-cols-5">
            {items.map((it, i) => {
              const num = it.question.number;
              const ans = answers[num];
              const isCurrent = i === current;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`rounded px-1 py-1 text-xs font-mono ${
                    isCurrent ? "bg-slate-800 text-white" : ans ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
