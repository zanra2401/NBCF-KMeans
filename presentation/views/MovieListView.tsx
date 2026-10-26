import type { MovieEntity } from "@/domain/entities/movie.entity";

interface MovieListViewProps {
  readonly movies: readonly MovieEntity[];
  readonly totalCount: number;
}

export function MovieListView({ movies, totalCount }: MovieListViewProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Database Film (SQLite &bull; u.item)
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Menampilkan {movies.length} dari total{" "}
            <strong>{totalCount}</strong> film (kolom:{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              id
            </code>
            ,{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              title
            </code>
            ,{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              link
            </code>
            ).
          </p>
        </div>
        <span className="self-start rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          SQLite Read-Only
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Nama Film (Title)</th>
              <th className="px-4 py-3 font-semibold">Link IMDb</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {movies.map((movie) => (
              <tr
                key={movie.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {movie.id}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {movie.title}
                </td>
                <td className="px-4 py-3">
                  {movie.link ? (
                    <a
                      href={movie.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {movie.link}
                    </a>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
