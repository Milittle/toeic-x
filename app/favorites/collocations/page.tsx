import Link from "next/link";
import { loadCollocations, partsOf } from "@/lib/content/collocations";
import { listNotebook } from "@/lib/application/notebook";
import { CollocationFavoritesList } from "@/components/CollocationFavoritesList";
import type { CollocationFavoriteItem } from "@/components/CollocationFavoritesList";

export const dynamic = "force-dynamic";

export default async function CollocationFavoritesPage() {
  const rows = listNotebook();
  const all = await loadCollocations();
  const byId = new Map(all.map((c) => [c.id, c]));
  const items: CollocationFavoriteItem[] = rows
    .map((r): CollocationFavoriteItem | null => {
      const c = byId.get(r.collocationId);
      return c
        ? {
            id: c.id,
            expression: c.expression,
            chinese: c.chinese,
            priority: c.priority,
            parts: partsOf(c),
          }
        : null;
    })
    .filter((x): x is CollocationFavoriteItem => x !== null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">搭配收藏夹</h1>
          <p className="mt-1 text-sm text-slate-500">你收藏的重点搭配，集中回顾。</p>
        </div>
        <Link href="/collocations" className="text-sm text-blue-600 hover:underline">
          去搭配库 →
        </Link>
      </header>

      <CollocationFavoritesList items={items} />
    </main>
  );
}
