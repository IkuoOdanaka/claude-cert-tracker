"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "資格を選ぶ" },
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/settings", label: "設定" },
  { href: "/about", label: "このサイトについて" },
] as const;

/** trailingSlash: true のため usePathname は "/dashboard/" を返しうる */
function normalize(path: string): string {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function SiteHeader() {
  const pathname = normalize(usePathname());

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-4">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-ink hover:text-accent"
        >
          Claude 資格トラッカー
        </Link>

        {/*
          375px では 4項目が収まらない。ページ全体を横スクロールさせず、
          ナビの中だけでスクロールさせる
        */}
        <nav
          aria-label="サイト内"
          className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
        >
          <ul className="flex w-max items-center gap-1 sm:w-auto">
            {NAV.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-control px-3 text-sm transition-colors ${
                      active
                        ? "bg-accent-soft font-medium text-ink"
                        : "text-ink-muted hover:bg-accent-soft hover:text-ink"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
