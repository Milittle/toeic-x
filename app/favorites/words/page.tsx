import Link from "next/link";
import { loadWords } from "@/lib/words";
import type { Word } from "@/lib/words";
import { listWordFavorites } from "@/lib/word-favorites";
import { WordFavoritesList } from "@/components/WordFavoritesList";
import type { WordFavoriteItem } from "@/components/WordFavoritesList";

export const dynamic = "force-dynamic";

export default async function WordFavoritesPage() {
  const rows = listWordFavorites();
  const all = await loadWords();
  // words.json stores one row per word-list; collapse to one row per word id
  // (rows for the same id are field-identical). The favorite keys on the word
  // itself, not on a particular list row (ADR-0006).
  const byId = new Map<string, Word>();
  for (const w of all) if (!byId.has(w.id)) byId.set(w.id, w);
  const items: WordFavoriteItem[] = rows
    .map((r): WordFavoriteItem | null => {
      const w = byId.get(r.wordId);
      return w
        ? { id: w.id, word: w.word, phonetic: w.phonetic, level: w.level, zhDef: w.zhDef }
        : null;
    })
    .filter((x): x is WordFavoriteItem => x !== null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">单词收藏夹</h1>
          <p className="mt-1 text-sm text-slate-500">你收藏的单词，集中回顾。</p>
        </div>
        <Link href="/words" className="text-sm text-blue-600 hover:underline">
          去背单词 →
        </Link>
      </header>

      <WordFavoritesList items={items} />
    </main>
  );
}
