import Link from "next/link";
import { ROUTES } from "@/config/routes";
import type { ItemEntity } from "@/domain/entities/item.entity";

interface ItemDetailViewProps {
  readonly item: ItemEntity;
}

export function ItemDetailView({ item }: ItemDetailViewProps) {
  return (
    <section className="space-y-6">
      <div>
        <Link
          href={ROUTES.ITEMS.LIST}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          &larr; Kembali ke Daftar Data
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <p className="font-mono text-xs text-zinc-500">{item.code}</p>
            <h1 className="mt-1 text-2xl font-bold">{item.name}</h1>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {item.category}
          </span>
        </div>

        {item.description && (
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            {item.description}
          </p>
        )}

        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Metrik / Nilai Fitur Statis
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-4">
            {Object.entries(item.metrics).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60"
              >
                <dt className="font-mono text-xs text-zinc-500 uppercase">
                  {key}
                </dt>
                <dd className="mt-1 text-lg font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
