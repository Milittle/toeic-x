import Link from "next/link";
import { PageSizeSelect } from "./PageSizeSelect";

export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export const DEFAULT_PAGE_SIZE = 50;

export function Pagination({
  page,
  totalPages,
  hrefFor,
  pageSize,
  pageSizeOptions,
}: {
  page: number;
  totalPages: number;
  hrefFor: (n: number) => string;
  pageSize?: number;
  pageSizeOptions?: { value: number; href: string }[];
}) {
  const showPager = totalPages > 1;
  const showSize = !!pageSizeOptions && !!pageSize;
  if (!showPager && !showSize) return null;

  const base = "rounded-lg border px-3 py-1.5 text-sm transition";
  const linkCls = `${base} border-slate-200 bg-white text-slate-600 hover:border-slate-300`;
  const disabledCls = `${base} cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300`;

  return (
    <nav className="my-6 flex items-center gap-3" aria-label="分页">
      <div className="flex-1" />
      {showPager && (
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={linkCls} rel="prev">
              ← 上一页
            </Link>
          ) : (
            <span className={disabledCls}>← 上一页</span>
          )}
          <span className="text-sm text-slate-500">
            第 {page} / {totalPages} 页
          </span>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className={linkCls} rel="next">
              下一页 →
            </Link>
          ) : (
            <span className={disabledCls}>下一页 →</span>
          )}
        </div>
      )}
      <div className="flex flex-1 justify-end">
        {showSize && <PageSizeSelect current={pageSize!} options={pageSizeOptions!} />}
      </div>
    </nav>
  );
}
