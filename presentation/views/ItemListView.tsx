import Link from "next/link";
import { ROUTES } from "@/config/routes";
import type { ItemEntity } from "@/domain/entities/item.entity";

interface ItemListViewProps {
  readonly items: readonly ItemEntity[];
}

export function ItemListView({ items }: ItemListViewProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Daftar Data Statis
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Data diambil secara Read-Only dari{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              data/sources/static/items.static.ts
            </code>
          </p>
        </div>
        <span className="self-start rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          Mode: Read-Only (No Create)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-blue-400 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-500">
                  {item.code}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {item.category}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{item.name}</h2>
              {item.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Link
                href={ROUTES.ITEMS.DETAIL(item.id)}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Lihat Detail &rarr;
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
