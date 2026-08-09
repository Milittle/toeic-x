"use client";

import { useRouter } from "next/navigation";

export function PageSizeSelect({
  current,
  options,
}: {
  current: number;
  options: { value: number; href: string }[];
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-500">
      每页
      <select
        value={current}
        onChange={(e) => {
          const next = options.find((o) => o.value === Number(e.target.value));
          if (next) router.push(next.href);
        }}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value}
          </option>
        ))}
      </select>
    </label>
  );
}
