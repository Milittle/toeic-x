"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/", label: "总览", match: (p) => p === "/" },
  { href: "/tests", label: "套题", match: (p) => p.startsWith("/tests") },
  { href: "/collocations", label: "搭配库", match: (p) => p.startsWith("/collocations") },
  { href: "/words", label: "背单词", match: (p) => p.startsWith("/words") },
  { href: "/favorites/collocations", label: "搭配收藏", match: (p) => p.startsWith("/favorites/collocations") },
  { href: "/favorites/words", label: "单词收藏", match: (p) => p.startsWith("/favorites/words") },
  { href: "/retests", label: "复测", match: (p) => p.startsWith("/retests") },
  { href: "/summary", label: "汇总", match: (p) => p.startsWith("/summary") },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
        <Link href="/" className="mr-3 shrink-0 font-bold text-slate-800">
          📘 托业阅读
        </Link>
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition ${
                active ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
