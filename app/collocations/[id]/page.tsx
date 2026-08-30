import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCollocation,
  loadCollocations,
  collocationSourceIndex,
  partsOf,
  filterAndSortCollocations,
  collocationListQuery,
} from "@/lib/collocations";
import { isInNotebook } from "@/lib/notebook";
import { NotebookButton } from "@/components/NotebookButton";
import type { TestStatus } from "@/lib/types";

export const dynamic = "force-dynamic"; // index reflects live test status

const PRIORITY_STYLE: Record<string, string> = {
  S: "bg-red-100 text-red-700",
  A: "bg-amber-100 text-amber-700",
  B: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<TestStatus, string> = {
  not_started: "未开始",
  seen: "已见题",
  first_attempted: "已首次模拟",
};

const NAV_BTN =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300";
const NAV_BTN_DISABLED =
  "cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm text-slate-300";

export default async function CollocationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const c = await getCollocation(params.id);
  if (!c) notFound();

  // Walk the same ordered subset as the list page so 上一个/下一个 follow the
  // filters + sort the user was browsing (falls back to the default freq order).
  const get = (k: string) =>
    typeof searchParams[k] === "string" ? (searchParams[k] as string) : "";
  const filters = {
    part: get("part"),
    priority: get("priority"),
    type: get("type"),
    q: get("q"),
    sort: get("sort"),
  };
  const ordered = filterAndSortCollocations(await loadCollocations(), filters);
  const currentIndex = ordered.findIndex((x) => x.id === c.id);
  const prev = currentIndex > 0 ? ordered[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < ordered.length - 1
      ? ordered[currentIndex + 1]
      : null;
  const listQuery = collocationListQuery(filters);
  const detailHref = (id: string) =>
    `/collocations/${id}${listQuery ? `?${listQuery}` : ""}`;

  const index = await collocationSourceIndex(c);
  const revealedTests = index.filter((e) => e.revealed).length;
  const revealedQuestions = index
    .filter((e) => e.revealed)
    .reduce((n, e) => n + e.numbers.length, 0);
  const inNotebook = isInNotebook(c.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <nav className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/collocations" className="text-sm text-slate-500 hover:text-slate-700">
          ← 返回搭配库
        </Link>
        <PrevNextNav
          prevId={prev?.id ?? null}
          nextId={next?.id ?? null}
          position={currentIndex}
          total={ordered.length}
          hrefFor={detailHref}
        />
      </nav>

      <header className="mt-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{c.expression}</h1>
          {c.priority && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[c.priority]}`}>
              优先级 {c.priority}
            </span>
          )}
          {partsOf(c).map((p) => (
            <span key={p} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Part {p}</span>
          ))}
          <div className="ml-auto">
            <NotebookButton collocationId={c.id} inNotebook={inNotebook} size="md" />
          </div>
        </div>
        <p className="mt-2 text-lg text-slate-700">{c.chinese || "（无中文）"}</p>
        <p className="mt-1 text-xs text-slate-400">
          类型：{c.type}　·　本书词汇栏收录 {c.bookFreq} 次　·　题册出现 {c.bookletCount} 次
        </p>
      </header>

      {/* source index — labels only, no question content (Q11: 学 vs 真题 分离) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">关联真题</h2>
          <span className="text-xs text-slate-400">共 {c.sources.length} 处</span>
        </div>

        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 text-left">套题</th>
              <th className="py-1 text-left">状态</th>
              <th className="py-1 text-left">题号</th>
            </tr>
          </thead>
          <tbody>
            {index.map((e) => (
              <tr key={e.testId} className="border-t border-slate-100">
                <td className="py-1.5">{e.title}</td>
                <td className="py-1.5">
                  <span className={e.revealed ? "text-emerald-700" : "text-slate-400"}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </td>
                <td className="py-1.5 font-mono text-slate-600">{e.numbers.join("、")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 text-xs text-slate-400">
          题号仅供定位，不含题目内容。已练过的套题（{revealedTests}/{index.length}）共 {revealedQuestions} 题可查看；
          未练过的套题在真题页中会隐藏，以免提前见到而污染「未见题样本」。
        </p>

        <Link
          href={`/collocations/${c.id}/questions`}
          className="mt-4 inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          查看真题 →
        </Link>
      </section>

      <nav className="mt-8 flex items-center justify-center">
        <PrevNextNav
          prevId={prev?.id ?? null}
          nextId={next?.id ?? null}
          position={currentIndex}
          total={ordered.length}
          hrefFor={detailHref}
        />
      </nav>
    </main>
  );
}

function PrevNextNav({
  prevId,
  nextId,
  position,
  total,
  hrefFor,
}: {
  prevId: string | null;
  nextId: string | null;
  position: number;
  total: number;
  hrefFor: (id: string) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      {prevId ? (
        <Link href={hrefFor(prevId)} className={NAV_BTN} rel="prev">
          ← 上一个
        </Link>
      ) : (
        <span className={NAV_BTN_DISABLED}>← 上一个</span>
      )}
      <span className="text-xs text-slate-400">
        {position >= 0 ? position + 1 : "-"} / {total}
      </span>
      {nextId ? (
        <Link href={hrefFor(nextId)} className={NAV_BTN} rel="next">
          下一个 →
        </Link>
      ) : (
        <span className={NAV_BTN_DISABLED}>下一个 →</span>
      )}
    </div>
  );
}
