"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV_ITEMS, ROUTES } from "@/config/routes";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href={ROUTES.HOME}
          className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          NBCF<span className="text-blue-600 dark:text-blue-400">Klaster</span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Main Navigation">
          {MAIN_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
