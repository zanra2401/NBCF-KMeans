import Link from "next/link";
import { ROUTES } from "@/config/routes";

interface HomeViewProps {
  readonly totalMovies: number;
  readonly totalUsers: number;
}

export function HomeView({ totalMovies, totalUsers }: HomeViewProps) {
  return (
    <section className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Sistem Rekomendasi Film &bull; MovieLens 100K
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Evaluasi Top-N NBCF vs NBCF + Klaster (K-Means)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Prototipe komparasi hasil rekomendasi film menggunakan{" "}
          <strong>Naive Bayes Collaborative Filtering (NBCF)</strong> standar
          dibandingkan dengan <strong>NBCF berbasis Klaster K-Means</strong> dan{" "}
          <strong>Ground Truth</strong> beserta metrik evaluasi{" "}
          <strong>Precision, Recall, F1-Score, DCG, dan NDCG</strong>.
        </p>
        <div className="mt-6">
          <Link
            href={ROUTES.COMPARE}
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            Mulai Komparasi Top-N &rarr;
          </Link>
        </div>
      </div>

      {/* Ringkasan Dataset */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Film (u.item)
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {totalMovies.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Data film tersimpan di SQLite
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Pengguna (u.user)
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {totalUsers.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Profil umur &amp; pekerjaan pengguna
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Skema Evaluasi
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            5-Fold CV
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Klaster K-Means User &amp; Item (k = 2..20)
          </p>
        </div>
      </div>
    </section>
  );
}
