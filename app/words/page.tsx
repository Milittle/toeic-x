import Link from "next/link";
import { loadWords, loadWordLists } from "@/lib/content/words";
import type { Word, WordLevel, WordList } from "@/lib/content/words";
import { wordFavoriteIds } from "@/lib/application/word-favorites";
import { WordFavoriteButton } from "@/components/WordFavoriteButton";
import { Pagination, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "@/components/Pagination";

const LISTS: { key: WordList; short: string }[] = [
  { key: "key1500", short: "重点1500" },
  { key: "tsl1250", short: "TSL1250" },
  { key: "ngsl2809", short: "NGSL2809" },
];

const LEVELS: WordLevel[] = ["S", "A", "B", "基础"];

const LEVEL_STYLE: Record<WordLevel, string> = {
  S: "bg-red-100 text-red-700",
  A: "bg-amber-100 text-amber-700",
  B: "bg-slate-100 text-slate-600",
  "基础": "bg-blue-50 text-blue-700",
};

const SORTS = [
  { key: "composite", label: "综合分" },
  { key: "freq", label: "题库频次" },
  { key: "alpha", label: "字母序" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const PAGE_SIZE_OPTIONS_NUM = PAGE_SIZE_OPTIONS as readonly number[];

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function qs(
  list: WordList,
  levels: string[],
  q: string,
  sort: SortKey,
  page?: number,
  size?: number,
): string {
  const p = new URLSearchParams();
  p.set("list", list);
  for (const l of levels) p.append("level", l);
  if (q) p.set("q", q);
  p.set("sort", sort);
  if (page && page > 1) p.set("page", String(page));
  if (size && size !== DEFAULT_PAGE_SIZE) p.set("size", String(size));
  return `?${p.toString()}`;
}

export default async function WordsPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const [all, listsMeta] = await Promise.all([loadWords(), loadWordLists()]);
  const savedIds = wordFavoriteIds();

  const currentList: WordList = (asArray(searchParams.list)[0] as WordList) || "key1500";
  const levels = asArray(searchParams.level).filter((l): l is WordLevel =>
    (LEVELS as string[]).includes(l),
  );
  const q = (asArray(searchParams.q)[0] ?? "").trim().toLowerCase();
  const sort = ((asArray(searchParams.sort)[0] as SortKey) || "composite") as SortKey;

  let items = all.filter((w) => {
    if (w.list !== currentList) return false;
    if (levels.length && (!w.level || !levels.includes(w.level))) return false;
    if (q) {
      const hay = `${w.word} ${w.zhDef} ${w.enDef}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  items = items.sort((a, b) => {
    if (sort === "alpha") return a.word.localeCompare(b.word);
    if (sort === "freq") return b.totalFreq - a.totalFreq;
    return b.compositeScore - a.compositeScore;
  });

  const rawSize = Number(asArray(searchParams.size)[0]) || DEFAULT_PAGE_SIZE;
  const size = PAGE_SIZE_OPTIONS_NUM.includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(asArray(searchParams.page)[0]) || 1);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, totalPages);
  const shown = items.slice((current - 1) * size, current * size);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">背单词</h1>
        <p className="mt-1 text-sm text-slate-500">
          TOEIC 阅读词汇（NGSL 2809 + TSL 1250）静态浏览：音标、中/英释义、本书各 Part 词频与推荐级别。
          按词表分 Tab，点开看详情；关联固定搭配可跳到「学搭配」页看真题（沿用未见题保护）。
          综合分只用于内部排序，不是 ETS 出题概率。
        </p>
      </header>

      {/* tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {LISTS.map((t) => {
          const active = t.key === currentList;
          const meta = listsMeta[t.key];
          return (
            <Link
              key={t.key}
              href={`/words${qs(t.key, levels, q, sort)}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t.short} <span className="opacity-60">· {meta.count}</span>
            </Link>
          );
        })}
      </div>

      {/* filters */}
      <form className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <input type="hidden" name="list" value={currentList} />
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={asArray(searchParams.q)[0] ?? ""}
            placeholder="搜索单词 / 中文释义 / 英文简释"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                排序：{s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-slate-400">级别</span>
          {LEVELS.map((l) => (
            <label key={l} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" name="level" value={l} defaultChecked={levels.includes(l)} />
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[l]}`}>
                {l}
              </span>
            </label>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <button type="submit" className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm text-white">
              筛选
            </button>
            <Link href={`/words?list=${currentList}`} className="text-sm text-slate-500 hover:underline">
              重置
            </Link>
          </div>
        </div>
      </form>

      <p className="mb-3 text-sm text-slate-500">共 {items.length} 词</p>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">没有匹配的单词。试试调整筛选条件。</p>
      ) : (
        <>
          <Pagination
            page={current}
            totalPages={totalPages}
            hrefFor={(n) => `/words${qs(currentList, levels, q, sort, n, size)}`}
            pageSize={size}
            pageSizeOptions={PAGE_SIZE_OPTIONS_NUM.map((s) => ({
              value: s,
              href: `/words${qs(currentList, levels, q, sort, undefined, s)}`,
            }))}
          />
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-start">
            {shown.map((w) => (
              <WordRow key={`${w.list}-${w.id}`} w={w} saved={savedIds.has(w.id)} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function WordRow({ w, saved }: { w: Word; saved: boolean }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-800">{w.word}</span>
            {w.phonetic && <span className="text-xs text-slate-400">/{w.phonetic}/</span>}
            {w.level && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[w.level]}`}>
                {w.level}
              </span>
            )}
            {w.source && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {w.source}
              </span>
            )}
            <span className="ml-auto text-xs text-slate-400">全书 {w.totalFreq}</span>
            <WordFavoriteButton wordId={w.id} saved={saved} />
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-600">{w.zhDef || "（无中文释义）"}</p>
        </summary>

        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
          {w.enDef && <p className="text-slate-500">{w.enDef}</p>}

          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded bg-slate-50 px-2 py-0.5 text-slate-600">
              Part5 {w.partCounts[5]} · Part6 {w.partCounts[6]} · Part7 {w.partCounts[7]}
            </span>
            {w.p5AnswerCount > 0 && (
              <span className="rounded bg-slate-50 px-2 py-0.5 text-slate-600">
                Part5答案 {w.p5AnswerCount}
              </span>
            )}
          </div>

          {w.collocation && (
            <p className="text-xs text-slate-600">
              关联搭配：
              {w.collocationId ? (
                <Link href={`/collocations/${w.collocationId}`} className="text-blue-600 hover:underline">
                  {w.collocation}
                </Link>
              ) : (
                <span>{w.collocation}</span>
              )}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            {w.ngslRank && <span>NGSL #{w.ngslRank}</span>}
            {w.tslRank && <span>TSL #{w.tslRank}</span>}
            <span>综合分 {w.compositeScore}</span>
            {w.wordClassTag && <span>· {w.wordClassTag}</span>}
            {w.core1500 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">核心1500</span>
            )}
          </div>

          {(w.sourceUrls.list || w.sourceUrls.def) && (
            <div className="flex flex-wrap gap-x-3 text-xs text-slate-400">
              {w.sourceUrls.list && (
                <a href={w.sourceUrls.list} target="_blank" rel="noreferrer" className="hover:underline">
                  词表来源
                </a>
              )}
              {w.sourceUrls.def && (
                <a href={w.sourceUrls.def} target="_blank" rel="noreferrer" className="hover:underline">
                  释义来源
                </a>
              )}
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
