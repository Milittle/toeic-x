import Link from "next/link";
import { loadTests } from "@/lib/loaders";
import {
  testStats,
  errorPatternCounts,
  retestStats,
} from "@/lib/summary";
import { ERROR_PATTERNS, type ErrorPattern } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  not_started: "未开始",
  seen: "已见题",
  first_attempted: "已首次模拟",
};

export default async function SummaryPage() {
  const tests = await loadTests();
  const testIds = tests.map((t) => t.testId);
  const stats = testStats(testIds);
  const patterns = errorPatternCounts();
  const retest = retestStats();

  const copyText = [
    "## 本周汇总（web 自动生成，供人工回填 PROGRESS.md）",
    "",
    "套题状态与首次正确率：",
    ...stats.map(
      (s) =>
        `- ${s.testId}：${STATUS_LABEL[s.status]}｜首次正确 ${s.firstCorrect ?? "—"}/100${
          s.firstAccuracy !== null ? `（${(s.firstAccuracy * 100).toFixed(0)}%）` : ""
        }${s.isUnseenSample ? "（未见题样本）" : ""}`,
    ),
    "",
    "错因分布：" +
      (Object.keys(ERROR_PATTERNS) as ErrorPattern[])
        .filter((p) => patterns[p] > 0)
        .map((p) => `${p}=${patterns[p]}`)
        .join("，") || "（暂无标记）",
    "",
    `复测：待复测 ${retest.pending}，已复测 ${retest.done}（其中答对 ${retest.doneCorrect}）`,
  ].join("\n");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← 返回首页</Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold tracking-tight">每周汇总</h1>
      <p className="mb-6 text-sm text-slate-500">
        本页只读，仅用于人工回填 <code>PROGRESS.md</code>。web 不会写入任何进度文件。
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">套题完成情况与首次正确率</h2>
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left">套题</th><th className="text-left">状态</th>
              <th className="text-left">首次正确</th><th className="text-left">未见题样本</th>
              <th className="text-left">作答次数</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.testId} className="border-t border-slate-100">
                <td className="py-1.5">{s.testId}</td>
                <td>{STATUS_LABEL[s.status]}</td>
                <td>{s.firstCorrect !== null ? `${s.firstCorrect}/100` : "—"}</td>
                <td>{s.isUnseenSample ? "是" : "—"}</td>
                <td>{s.attemptCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">错因分布</h2>
          <ul className="text-sm">
            {(Object.keys(ERROR_PATTERNS) as ErrorPattern[]).map((p) => (
              <li key={p} className="flex justify-between">
                <span>{p} · {ERROR_PATTERNS[p]}</span>
                <span className="font-mono">{patterns[p]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">复测表现</h2>
          <ul className="text-sm">
            <li className="flex justify-between"><span>待复测</span><span className="font-mono">{retest.pending}</span></li>
            <li className="flex justify-between"><span>已复测</span><span className="font-mono">{retest.done}</span></li>
            <li className="flex justify-between"><span>复测答对</span><span className="font-mono">{retest.doneCorrect}</span></li>
          </ul>
          <Link href="/retests" className="mt-2 inline-block text-sm text-blue-600 hover:underline">查看复测列表 →</Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="mb-2 font-semibold">回填文案（复制到 PROGRESS.md）</h2>
        <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">{copyText}</pre>
      </section>
    </main>
  );
}
