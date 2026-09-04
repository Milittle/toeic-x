import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTest } from "@/lib/content/question-bank";
import { firstTimedAttempt, statusOf } from "@/lib/application/attempts";
import type { TestStatus } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<TestStatus, string> = {
  not_started: "未开始",
  seen: "已见题",
  first_attempted: "已首次模拟",
};

const PART_INFO: Record<number, { name: string; desc: string }> = {
  5: { name: "Part 5", desc: "单句填空" },
  6: { name: "Part 6", desc: "短文填空" },
  7: { name: "Part 7", desc: "阅读理解" },
};

export default async function TestDetailPage({ params }: { params: { testId: string } }) {
  const test = await loadTest(params.testId);
  if (!test) notFound();

  const status = statusOf(test.testId);
  const first = firstTimedAttempt(test.testId);

  const counts = { 5: 0, 6: 0, 7: 0 };
  for (const p of test.parts) {
    counts[p.part] =
      p.part === 5 ? p.questions.length : p.passages.reduce((a, ps) => a + ps.questions.length, 0);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/tests" className="text-sm text-slate-500 hover:text-slate-700">
        ← 返回套题列表
      </Link>

      <header className="mt-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{test.title}</h1>
          {test.verified ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">已校验</span>
          ) : (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">未校验</span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">当前状态：{STATUS_LABEL[status]}</p>
      </header>

      {status !== "not_started" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ 本套题已被看过。再次做<b>模拟</b>时将<b>不计为「未见题样本」</b>（成绩单会如实标注）。
        </div>
      )}
      {first && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ 首次模拟成绩已锁定：正确 {first.correct} / 100
        </div>
      )}

      {/* part breakdown — informational; entry actions are whole-test */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-500">结构</h2>
        <div className="grid grid-cols-3 gap-3">
          {([5, 6, 7] as const).map((p) => (
            <div key={p} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-xs text-slate-400">{PART_INFO[p].name}</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{counts[p]}</p>
              <p className="text-xs text-slate-500">{PART_INFO[p].desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/tests/${test.testId}/practice`}
          className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
        >
          <h2 className="font-semibold">练习模式</h2>
          <p className="mt-1 text-sm text-slate-500">逐题作答，立即显示对错与解析。用于复盘与复测。</p>
        </Link>
        <Link
          href={`/tests/${test.testId}/timed`}
          className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
        >
          <h2 className="font-semibold">模拟模式 · 75 分钟</h2>
          <p className="mt-1 text-sm text-slate-500">闭卷定时，提交后出成绩单。首次成绩锁定。</p>
        </Link>
      </div>

      {first && (
        <Link
          href={`/tests/${test.testId}/review`}
          className="mt-3 block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
        >
          <h2 className="font-semibold">复盘错题</h2>
          <p className="mt-1 text-sm text-slate-500">
            对照首次模拟的作答，逐题看解析、标主错因（错题自动排期复测）。
          </p>
        </Link>
      )}
    </main>
  );
}
