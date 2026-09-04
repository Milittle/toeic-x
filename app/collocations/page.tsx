import Link from "next/link";
import {
  loadCollocations,
  partsOf,
  filterAndSortCollocations,
  collocationListQuery,
} from "@/lib/content/collocations";
import { notebookIds } from "@/lib/application/notebook";
import { NotebookButton } from "@/components/NotebookButton";
import { Pagination, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "@/components/Pagination";

const PAGE_SIZE_OPTIONS_NUM = PAGE_SIZE_OPTIONS as readonly number[];

const PARTS = [5, 6, 7] as const;
const PRIORITIES = ["S", "A", "B"] as const;

const PRIORITY_STYLE: Record<string, string> = {
  S: "bg-red-100 text-red-700",
  A: "bg-amber-100 text-amber-700",
  B: "bg-slate-100 text-slate-600",
};

export default async function CollocationsPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const all = await loadCollocations();
  const saved = notebookIds();

  const types = Array.from(new Set(all.map((c) => c.type))).filter(Boolean).sort();

  const get = (k: string) =>
    typeof searchParams[k] === "string" ? (searchParams[k] as string) : "";
  const fPart = get("part");
  const fPriority = get("priority");
  const fType = get("type");
  const fQ = get("q").trim().toLowerCase();
  const sort = get("sort") === "alpha" ? "alpha" : "freq";

  const items = filterAndSortCollocations(all, {
    part: fPart,
    priority: fPriority,
    type: fType,
    q: get("q"),
    sort,
  });
  // Detail links carry the same filters/sort so prev/next inside a detail page
  // walk this exact ordered subset rather than the whole library.
  const detailQuery = collocationListQuery({
    part: fPart,
    priority: fPriority,
    type: fType,
    q: get("q"),
    sort,
  });
  const detailHref = (id: string) =>
    `/collocations/${id}${detailQuery ? `?${detailQuery}` : ""}`;

  const rawSize = Number(get("size")) || DEFAULT_PAGE_SIZE;
  const size = PAGE_SIZE_OPTIONS_NUM.includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(get("page")) || 1);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, totalPages);
  const shown = items.slice((current - 1) * size, current * size);

  const buildHref = ({
    page: pn,
    size: sz,
    sort: srt,
  }: {
    page?: number;
    size?: number;
    sort?: string;
  }) => {
    const p = new URLSearchParams();
    if (fPart) p.set("part", fPart);
    if (fPriority) p.set("priority", fPriority);
    if (fType) p.set("type", fType);
    if (fQ) p.set("q", get("q"));
    p.set("sort", srt ?? sort);
    if (sz && sz !== DEFAULT_PAGE_SIZE) p.set("size", String(sz));
    if (pn && pn > 1) p.set("page", String(pn));
    return `/collocations?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">搭配库</h1>
        <p className="mt-1 text-sm text-slate-500">
          完整词块字典：全真模拟书 Vocabulary Check 的全部固定搭配与惯用法（{all.length} 条），
          按频次 / 优先级 / 类型筛选。点击词块查看本书中出现它的真题。
          未练过的套题（not_started）会自动隐藏题目，以保护「未见题样本」。
        </p>
      </header>

      {/* filters */}
      <form className="mb-6 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="sort" value={sort} />
        <input
          name="q"
          defaultValue={get("q")}
          placeholder="搜索表达 / 中文"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:col-span-2"
        />
        <select name="part" defaultValue={fPart} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">全部 Part</option>
          {PARTS.map((p) => (
            <option key={p} value={p}>Part {p}</option>
          ))}
        </select>
        <select name="priority" defaultValue={fPriority} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">全部优先级</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>优先级 {p}</option>
          ))}
        </select>
        <select name="type" defaultValue={fType} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">全部类型</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">筛选</button>
          <Link href="/collocations" className="text-sm text-slate-500 hover:underline">重置</Link>
          <span className="ml-auto text-xs text-slate-400">
            <Link
              href={buildHref({
                size,
                sort: sort === "freq" ? "alpha" : "freq",
              })}
              className="hover:underline"
            >
              按频次/字母切换排序
            </Link>
          </span>
        </div>
      </form>

      <p className="mb-3 text-sm text-slate-500">共 {items.length} 条</p>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">没有匹配的词块。试试调整筛选条件。</p>
      ) : (
        <>
          <Pagination
            page={current}
            totalPages={totalPages}
            hrefFor={(n) => buildHref({ page: n, size })}
            pageSize={size}
            pageSizeOptions={PAGE_SIZE_OPTIONS_NUM.map((s) => ({
              value: s,
              href: buildHref({ size: s }),
            }))}
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {shown.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={detailHref(c.id)} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{c.expression}</span>
                      <span className="shrink-0 text-xs text-slate-400">频次 {c.bookFreq}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">{c.chinese || "（无中文）"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      {c.priority && (
                        <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLE[c.priority]}`}>
                          {c.priority}
                        </span>
                      )}
                      {partsOf(c).map((p) => (
                        <span key={p} className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">P{p}</span>
                      ))}
                      <span className="text-slate-400">· {c.sources.length} 处真题</span>
                    </div>
                  </Link>
                  <NotebookButton collocationId={c.id} inNotebook={saved.has(c.id)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
