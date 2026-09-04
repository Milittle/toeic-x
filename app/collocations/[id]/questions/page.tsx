import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCollocation,
  collocationSourceGroups,
  type CollocationQuestion,
  type CollocationSourceGroup,
} from "@/lib/content/collocations";
import type { Letter, TestStatus } from "@/lib/domain/types";

export const dynamic = "force-dynamic"; // question reveal depends on live test status

const STATUS_LABEL: Record<TestStatus, string> = {
  not_started: "未开始",
  seen: "已见题",
  first_attempted: "已首次模拟",
};

export default async function CollocationQuestionsPage({ params }: { params: { id: string } }) {
  const c = await getCollocation(params.id);
  if (!c) notFound();
  const groups = await collocationSourceGroups(c);
  const revealedCount = groups.reduce((n, g) => n + g.questions.length, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/collocations/${c.id}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← 返回学习卡
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{c.expression} · 真题</h1>
        <p className="mt-1 text-sm text-slate-500">
          本书中出现「{c.expression}」的真题（共 {c.sources.length} 处）。
          未练过的套题自动隐藏，以免污染「未见题样本」。
        </p>
      </header>

      <section className="space-y-5">
        {groups.map((g) => (
          <SourceGroup key={g.testId} group={g} />
        ))}
      </section>

      <p className="mt-8 text-xs text-slate-400">
        共 {c.sources.length} 处真题引用，其中 {revealedCount} 题已揭示（已练过的套题）。
      </p>
    </main>
  );
}

function SourceGroup({ group }: { group: CollocationSourceGroup }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">{group.title}</h2>
        <span className="text-xs text-slate-400">状态：{STATUS_LABEL[group.status]}</span>
      </div>

      {group.revealed ? (
        group.questions.length === 0 ? (
          <p className="text-sm text-slate-500">该套题中未找到对应题号（可能题库尚未提取到这道题）。</p>
        ) : (
          <ol className="space-y-4">
            {group.questions.map((q) => (
              <li key={q.number}>
                <QuestionView q={q} />
              </li>
            ))}
          </ol>
        )
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          🔒 {group.numbers.length} 题（第 {group.numbers.join("、")} 题）已隐藏——该套题尚未练习，
          提前查看会污染「未见题样本」。完成该套题的练习或模拟后自动揭示。
        </p>
      )}
    </div>
  );
}

function QuestionView({ q }: { q: CollocationQuestion }) {
  const letters: Letter[] = ["A", "B", "C", "D"];
  return (
    <div>
      {q.passage && (
        <details className="mb-2 rounded bg-slate-50 p-2 text-sm">
          <summary className="cursor-pointer text-xs uppercase tracking-wide text-slate-400">
            {q.passage.descriptor} {q.passage.title && `· ${q.passage.title}`}
          </summary>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{q.passage.text}</p>
        </details>
      )}
      <p className="mb-2 font-medium">
        <span className="text-slate-400">{q.number}.</span> {q.stem || "（见上方文章上下文）"}
      </p>
      <ul className="mb-2 space-y-1 text-sm">
        {letters.map((l) => (
          <li
            key={l}
            className={
              l === q.answer ? "font-semibold text-emerald-700" : "text-slate-600"
            }
          >
            <span className="font-mono">({l})</span> {q.options[l]}
          </li>
        ))}
      </ul>
      {(q.translation || q.explanation) && (
        <div className="rounded bg-slate-50 p-2 text-xs text-slate-600">
          {q.translation && <p>译文：{q.translation}</p>}
          {q.explanation && <p className="mt-1">解析：{q.explanation}</p>}
        </div>
      )}
    </div>
  );
}
