"use client";

import Link from "next/link";
import { useState } from "react";
import type { ScheduleRow } from "@/lib/retest";

export function RetestList({ rows, today }: { rows: ScheduleRow[]; today: string }) {
  const [state, setState] = useState(rows);

  async function mark(id: number, correct: boolean) {
    await fetch("/api/retest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, correct }),
    });
    setState((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "done", retestCorrect: correct ? 1 : 0 } : r)),
    );
  }

  return (
    <ul className="space-y-2">
      {state.map((r) => {
        const isDue = r.status === "pending" && r.dueDate <= today;
        return (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
          >
            <div>
              <span className="font-mono">
                套{r.testId.replace("reading-", "")} · {r.questionNumber}
              </span>
              <span className="ml-2 text-slate-500">{r.slot}</span>
            </div>
            <div className="flex items-center gap-3">
              {r.status === "done" ? (
                <span className={r.retestCorrect ? "text-emerald-600" : "text-red-600"}>
                  {r.retestCorrect ? "✓ 复测对" : "✗ 复测错"}
                </span>
              ) : (
                <>
                  <span className={isDue ? "font-semibold text-red-600" : "text-slate-500"}>
                    到期 {r.dueDate}
                    {isDue ? "（已到期）" : ""}
                  </span>
                  <Link
                    href={`/tests/${r.testId}/practice`}
                    className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
                  >
                    去练习
                  </Link>
                  <button
                    type="button"
                    onClick={() => mark(r.id, true)}
                    className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white"
                  >
                    对
                  </button>
                  <button
                    type="button"
                    onClick={() => mark(r.id, false)}
                    className="rounded bg-red-600 px-2 py-0.5 text-xs text-white"
                  >
                    错
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
