"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { flattenClientTest, type ClientTest } from "@/lib/domain/questions";
import type { Letter } from "@/lib/domain/types";
import type { ScoreResult } from "@/lib/domain/scoring";

const LETTERS: Letter[] = ["A", "B", "C", "D"];
const DURATION_SEC = 75 * 60;

interface Props {
  test: ClientTest;
  attemptId: number;
  startedAt: string;
  isUnseenSample: boolean;
}

export function TimedClient({ test, attemptId, startedAt, isUnseenSample }: Props) {
  const items = useMemo(() => flattenClientTest(test), [test]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [remaining, setRemaining] = useState(DURATION_SEC);
  const [result, setResult] = useState<{ scored: ScoreResult; isFirst: boolean } | null>(null);
  const submittedRef = useRef(false);

  // countdown
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const left = DURATION_SEC - elapsed;
      setRemaining(Math.max(0, left));
      if (left <= 0 && !submittedRef.current) submit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const res = await fetch("/api/timed/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, selections: answers }),
    });
    const data = (await res.json()) as { scored: ScoreResult; isFirst: boolean };
    setResult(data);
  }

  if (result) {
    const { scored, isFirst } = result;
    const durationMin = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">{test.title} · 成绩单</h1>
        <div className={`mb-4 rounded-lg border p-3 text-sm ${isUnseenSample ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {isUnseenSample ? "✓ 本次为「未见题样本」" : "⚠️ 本次非未见题样本（套题此前已被看过）"}
          {isFirst && "　·　首次成绩已锁定"}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="正确" value={`${scored.correct}`} />
          <Stat label="错误" value={`${scored.wrong}`} />
          <Stat label="未答" value={`${scored.unanswered}`} />
          <Stat label="正确率" value={`${(scored.accuracy * 100).toFixed(0)}%`} />
        </div>

        <h2 className="mb-2 font-semibold">分 Part 正确率</h2>
        <table className="mb-6 w-full text-sm">
          <thead className="text-slate-500">
            <tr><th className="text-left">Part</th><th className="text-left">正确 / 总数</th><th className="text-left">正确率</th><th className="text-left">未答</th></tr>
          </thead>
          <tbody>
            {scored.byPart.map((p) => (
              <tr key={p.part} className="border-t border-slate-100">
                <td className="py-1.5">Part {p.part}</td>
                <td>{p.correct} / {p.total}</td>
                <td>{((p.correct / p.total) * 100).toFixed(0)}%</td>
                <td>{p.unanswered}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mb-6 text-sm text-slate-500">用时：约 {durationMin} 分钟</p>

        <div className="flex gap-3">
          <Link href={`/tests/${test.testId}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">返回套题</Link>
          <Link href={`/tests/${test.testId}/review?from=${attemptId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">进入复盘</Link>
        </div>
      </main>
    );
  }

  const item = items[current];
  const q = item.question;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const low = remaining <= 300;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href={`/tests/${test.testId}`} className="text-sm text-slate-500 hover:text-slate-700">← 返回（将不计成绩）</Link>
        <h1 className="font-semibold">{test.title} · 模拟</h1>
        <div className={`font-mono text-lg font-bold ${low ? "text-red-600" : "text-slate-800"}`}>{mm}:{ss}</div>
      </header>

      {isUnseenSample && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-center text-xs text-emerald-800">
          本次为「未见题样本」—— 套题此前未被看过，成绩可作为合法计分样本
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          {item.passage && item.showPassage && (
            <div className="mb-4 max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm">
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
              const isChosen = answers[q.number] === letter;
              return (
                <li key={letter}>
                  <button
                    type="button"
                    onClick={() => setAnswers((p) => ({ ...p, [q.number]: letter }))}
                    className={`flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm ${
                      isChosen ? "border-slate-700 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-mono font-semibold">({letter})</span>
                    <span>{q.options[letter]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex justify-between">
            <button type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">上一题</button>
            <button type="button" onClick={submit} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">交卷</button>
            <button type="button" onClick={() => setCurrent((c) => Math.min(items.length - 1, c + 1))} disabled={current === items.length - 1} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-40">下一题</button>
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">已答 {Object.keys(answers).length}/{items.length}</p>
          <div className="grid grid-cols-6 gap-1.5 md:grid-cols-5">
            {items.map((it, i) => {
              const ans = answers[it.question.number];
              return (
                <button key={it.question.number} type="button" onClick={() => setCurrent(i)}
                  className={`rounded px-1 py-1 text-xs font-mono ${
                    i === current ? "bg-slate-800 text-white" : ans ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-400"
                  }`}>
                  {it.question.number}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
