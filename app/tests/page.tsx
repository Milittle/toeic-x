import Link from "next/link";
import { loadTests } from "@/lib/loaders";
import { summarise } from "@/lib/questions";
import { testStats } from "@/lib/summary";
import type { TestStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<TestStatus, string> = {
  not_started: "未开始",
  seen: "已见题",
  first_attempted: "已首次模拟",
};

const STATUS_STYLE: Record<TestStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  seen: "bg-amber-100 text-amber-700",
  first_attempted: "bg-emerald-100 text-emerald-700",
};

export default async function TestsPage() {
  const tests = await loadTests();
  const summaries = tests.map(summarise);
  const stats = testStats(summaries.map((s) => s.testId));
  const statById = new Map(stats.map((s) => [s.testId, s]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">套题</h1>
        <p className="mt-1 text-sm text-slate-500">
          10 套阅读全真模拟，每套 100 题（Part 5×30 / Part 6×16 / Part 7×54）。
        </p>
      </header>

      <ul className="space-y-3">
        {summaries.map((s) => {
          const stat = statById.get(s.testId)!;
          const status = stat.status as TestStatus;
          return (
            <li key={s.testId}>
              <Link
                href={`/tests/${s.testId}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold">{s.title}</h2>
                      {s.verified ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          已校验
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                          未校验
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Part 5：{s.counts[5]}　Part 6：{s.counts[6]}　Part 7：{s.counts[7]}
                    </p>
                    {stat.firstCorrect !== null && (
                      <p className="mt-1 text-xs text-emerald-600">
                        首次正确 {stat.firstCorrect}/100
                        {stat.isUnseenSample ? "（未见题样本）" : ""}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
