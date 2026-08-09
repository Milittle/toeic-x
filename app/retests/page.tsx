import Link from "next/link";
import { listSchedule } from "@/lib/retest";
import { toISODate } from "@/lib/scheduling";
import { RetestList } from "@/components/RetestList";

export const dynamic = "force-dynamic";

export default async function RetestsPage() {
  const rows = listSchedule();
  const now = new Date();
  const today = toISODate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  const dueCount = rows.filter((r) => r.status === "pending" && r.dueDate <= today).length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← 返回首页</Link>
      <header className="mt-3 mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">复测列表</h1>
        <p className="text-sm text-slate-500">
          待复测 <b className="text-red-600">{dueCount}</b> / 共 {pendingCount} 条
        </p>
      </header>

      <p className="mb-4 text-sm text-slate-500">
        到期错题请在练习模式下重做，完成后用「对 / 错」记录复测结果。同一题有 D+2 / D+7 / D+21 三档。
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          还没有错题进入复测。完成一次模拟后，错题会按 D+2 / D+7 / D+21 自动排期。
        </p>
      ) : (
        <RetestList rows={rows} today={today} />
      )}
    </main>
  );
}
