import Link from "next/link";
import { ROUTES } from "@/config/routes";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-2xl font-bold">Halaman Tidak Ditemukan (404)</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Route atau data statis yang Anda cari tidak tersedia.
      </p>
      <Link
        href={ROUTES.HOME}
        className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
