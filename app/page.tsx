import Link from "next/link";
import { loadTests } from "@/lib/content/question-bank";
import { loadCollocations } from "@/lib/content/collocations";
import { loadWordLists } from "@/lib/content/words";
import { testStats } from "@/lib/application/summary";
import { listSchedule } from "@/lib/application/retest";
import { notebookCount } from "@/lib/application/notebook";
import { wordFavoriteCount } from "@/lib/application/word-favorites";
import { toISODate } from "@/lib/domain/scheduling";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [tests, collocations, wordLists] = await Promise.all([
    loadTests(),
    loadCollocations(),
    loadWordLists(),
  ]);
  const wordCount = Object.values(wordLists).reduce((sum, list) => sum + list.count, 0);
  const stats = testStats(tests.map((t) => t.testId));
  const firstAttempted = stats.filter((s) => s.status === "first_attempted").length;
  const seen = stats.filter((s) => s.status === "seen").length;

  const rows = listSchedule();
  const now = new Date();
  const today = toISODate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
  const pendingTotal = rows.filter((r) => r.status === "pending").length;
  const dueCount = rows.filter((r) => r.status === "pending" && r.dueDate <= today).length;

  const notebook = notebookCount();
  const wordFavorites = wordFavoriteCount();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">总览</h1>
        <p className="mt-1 text-sm text-slate-500">
          托业阅读练习 · 10 套全真模拟 + 固定搭配 + 词汇
        </p>
      </header>

      {/* stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="套题进度"
          value={`${firstAttempted}/10`}
          hint={seen > 0 ? `${seen} 套已见题` : "尚未开始"}
          href="/tests"
        />
        <StatCard
          label="待复测"
          value={String(dueCount)}
          hint={`共 ${pendingTotal} 题排期中`}
          href="/retests"
          highlight={dueCount > 0}
        />
        <StatCard
          label="搭配收藏"
          value={String(notebook)}
          hint="收藏的词块"
          href="/favorites/collocations"
        />
        <StatCard
          label="单词收藏"
          value={String(wordFavorites)}
          hint="收藏的单词"
          href="/favorites/words"
        />
      </div>

      {/* big entries */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/tests"
          className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="text-2xl">📝</div>
          <h2 className="mt-2 text-lg font-semibold">做套题</h2>
          <p className="mt-1 text-sm text-slate-500">
            10 套阅读全真模拟。练习即时反馈对错与解析；模拟 75 分钟闭卷出成绩单。
          </p>
        </Link>
        <Link
          href="/collocations"
          className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="text-2xl">📖</div>
          <h2 className="mt-2 text-lg font-semibold">学搭配</h2>
          <p className="mt-1 text-sm text-slate-500">
            全真模拟书 Vocabulary Check 的全部固定搭配（{collocations.length} 条），按频次/优先级筛选，
            点击查看本书真题。把想记的收藏起来集中回顾。
          </p>
        </Link>
        <Link
          href="/words"
          className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="text-2xl">🔤</div>
          <h2 className="mt-2 text-lg font-semibold">背单词</h2>
          <p className="mt-1 text-sm text-slate-500">
            TOEIC 阅读词汇库（重点 1500 + NGSL 2809 + TSL 1250，共 {wordCount} 行）。按词表浏览，带音标、释义、
            本书词频与推荐级别；关联固定搭配可跳到学搭配页。
          </p>
        </Link>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
  highlight = false,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-3 transition hover:shadow-sm ${
        highlight ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-red-600" : "text-slate-800"}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>
    </Link>
  );
}
