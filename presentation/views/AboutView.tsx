export function AboutView() {
  const layers = [
    {
      name: "1. Domain Layer (/domain)",
      desc: "Berisi business entities (ItemEntity) dan kontrak repository read-only (IItemRepository). Tidak memiliki dependensi ke framework luar.",
    },
    {
      name: "2. Application Layer (/application)",
      desc: "Berisi Use Cases (GetAllItemsUseCase, GetItemByIdUseCase) dan DTO yang mengorkestrasi alur pengambilan data dari kontrak Domain.",
    },
    {
      name: "3. Data Layer (/data)",
      desc: "Mengimplementasikan kontrak repository menggunakan sumber file statis (/data/sources/static/items.static.ts), DataSource read-only, dan Mapper (tanpa fitur create/mutasi).",
    },
    {
      name: "4. Presentation & Routing Layer (/presentation & /app)",
      desc: "Menyediakan komponen UI, View, serta file-system routing Next.js App Router yang terhubung dengan konfigurasi route terpusat (/config/routes.ts).",
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Struktur Clean Architecture
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Ringkasan pembagian layer pada kerangka kerja prototipe ini.
        </p>
      </div>

      <div className="space-y-4">
        {layers.map((layer) => (
          <div
            key={layer.name}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {layer.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {layer.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
