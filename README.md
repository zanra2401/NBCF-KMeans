# Prototipe Evaluasi Rekomendasi Film: NBCF vs NBCF + Klaster (K-Means)

Aplikasi web berbasis **Next.js (App Router)** dan **TypeScript** yang disusun menggunakan **Clean Architecture** dengan **Data Layer Statis (SQLite Read-Only)**.  
Aplikasi ini berfungsi untuk membandingkan hasil rekomendasi **Top-N** antara:
1. **NBCF Biasa** (*Naive Bayes Collaborative Filtering* tanpa klaster: $k_u = 0, k_i = 0$)
2. **NBCF + Klaster K-Means** ($k_u, k_i \in [2..20]$)
3. **Ground Truth** (Rating asli pengguna pada data uji `u1.test` – `u5.test`)

Serta menghitung metrik evaluasi per pengguna secara *real-time*: **Hits, Precision@N, Recall@N, F1-Score@N, DCG@N, dan NDCG@N**.

---

## 1. Prasyarat Sistem

- **Node.js**: Versi **22.5.0+** (disarankan `v22.23+` karena menggunakan modul bawaan `node:sqlite`).
- **NPM**: Bawaan Node.js.
- *(Opsional)* **Python 3 + `joblib`**: Hanya diperlukan apabila Anda mengubah/melatih ulang file klaster `.pkl` di notebook dan ingin memperbarui file `clusters.json`.

---

## 2. Cara Menjalankan Aplikasi

```bash
# 1. Install dependencies (jika belum)
npm install

# 2. (Opsional) Generate ulang database SQLite dari file statis
npm run seed

# 3. Jalankan server development
npm run dev
```

Buka `http://localhost:3000` di browser:
- **`/` (Dashboard)**: Ringkasan jumlah data film, pengguna, dan pintasan menuju halaman komparasi.
- **`/compare` (Komparasi Top-N)**: Halaman utama perbandingan **NBCF Biasa vs NBCF + Klaster vs Ground Truth** per *Fold* dan *User*.
- **`/movies`**: Daftar seluruh film dari `u.item` (`id`, `title`, `link`).
- **`/users`**: Daftar seluruh pengguna dari `u.user` (`id`, `age`, `occupation`).
- **`/about`**: Dokumentasi singkat pembagian layer *Clean Architecture*.

---

## 3. Struktur Direktori (Clean Architecture)

Arsitektur mengikuti prinsip *Dependency Rule* (layer luar bergantung pada layer dalam, sedangkan **Domain Layer** tidak bergantung pada framework apa pun):

```text
prototipe/
├── config/
│   └── routes.ts                                 # Konfigurasi URL route terpusat & menu navigasi
├── domain/                                       # [1. DOMAIN LAYER] Entitas & kontrak bisnis murni
│   ├── entities/
│   │   ├── movie.entity.ts                       # Entitas Film (id, title, link)
│   │   ├── user.entity.ts                        # Entitas User (id, age, occupation)
│   │   └── recommendation.entity.ts              # Entitas Top-N, Ground Truth, & Metrik Evaluasi
│   ├── errors/
│   │   └── domain.error.ts                       # Definisi error domain (EntityNotFoundError)
│   └── repositories/
│       ├── movie.repository.ts                   # Kontrak repository film (Read-Only)
│       ├── user.repository.ts                    # Kontrak repository user (Read-Only)
│       └── recommendation.repository.ts          # Kontrak repository komparasi Top-N
├── application/                                  # [2. APPLICATION LAYER] Orkestrasi Use Cases
│   └── use-cases/
│       ├── get-all-movies.use-case.ts            # Ambil daftar film
│       ├── get-all-users.use-case.ts             # Ambil daftar user
│       └── compare-user-topn.use-case.ts         # Eksekusi perbandingan Top-N & metrik per user
├── data/                                         # [3. DATA LAYER] SQLite Read-Only & Mesin NBCF
│   ├── sources/
│   │   └── static/
│   │       ├── movielens.db                      # Database SQLite utama (satu-satunya file DB saat runtime)
│   │       ├── u.item                            # Data mentah film MovieLens 100K
│   │       ├── u.user                            # Data mentah profil user MovieLens 100K
│   │       ├── u1.base .. u5.base                # Data latih 5 fold
│   │       ├── u1.test .. u5.test                # Data uji 5 fold (Ground Truth)
│   │       └── clusters.json                     # Label klaster K-Means (user & item, k=2..20, fold 1..5)
│   ├── datasources/
│   │   ├── sqlite.client.ts                      # Koneksi singleton SQLite (mode Read-Only)
│   │   ├── movie-sqlite.datasource.ts            # Query SQLite tabel movies
│   │   ├── user-sqlite.datasource.ts             # Query SQLite tabel users
│   │   └── nbcf-engine.datasource.ts             # Mesin komputasi NBCF & Klaster NBCF di TypeScript
│   ├── models/                                   # Tipe baris mentah tabel SQLite
│   ├── mappers/                                  # Konversi model SQLite -> Domain Entity
│   └── repositories/
│       ├── movie.repository.impl.ts              # Implementasi IMovieRepository
│       ├── user.repository.impl.ts               # Implementasi IUserRepository
│       └── recommendation.repository.impl.ts     # Implementasi IRecommendationRepository (Top-N & Metrik)
├── di/                                           # [COMPOSITION ROOT] Dependency Injection
│   └── container.ts                              # Mengikat DataSource -> Repository -> UseCase
├── presentation/                                 # [4. PRESENTATION LAYER] Komponen UI & View
│   ├── components/
│   │   └── Navbar.tsx                            # Navigasi atas
│   ├── layouts/
│   │   └── MainLayout.tsx                        # Layout kerangka halaman
│   └── views/
│       ├── HomeView.tsx                          # Tampilan Dashboard
│       ├── CompareTopNView.tsx                   # Tampilan Komparasi Top-N & Metrik
│       ├── MovieListView.tsx                     # Tampilan Tabel Movies
│       ├── UserListView.tsx                      # Tampilan Tabel Users
│       └── AboutView.tsx                         # Tampilan Informasi Arsitektur
├── app/                                          # [ROUTING LAYER] Next.js App Router
│   ├── page.tsx                                  # Route: /
│   ├── compare/page.tsx                          # Route: /compare
│   ├── api/compare/route.ts                      # Endpoint API: GET /api/compare
│   ├── movies/page.tsx                           # Route: /movies
│   ├── users/page.tsx                            # Route: /users
│   └── about/page.tsx                            # Route: /about
└── scripts/
    └── seed-sqlite.mjs                           # Script pembuat database SQLite movielens.db
```

---

## 4. Manajemen Data & Database SQLite

### Apakah Aplikasi Ini Membutuhkan File Posterior `.pkl` Raksasa?
**Tidak.** File posterior `clusters/topN/cand/fold1..5.pkl` (~21 GB) **tidak digunakan** oleh aplikasi web ini.  
Sebagai gantinya, algoritma perhitungan posterior *hybrid* NBCF (`Side`, *item-based*, *user-based*, reduksi klaster K-Means dengan *fallback*, serta pembulatan *half-precision* `float16`) dijalankan langsung secara *on-the-fly* di TypeScript melalui `data/datasources/nbcf-engine.datasource.ts` hanya untuk *user* yang sedang dipilih (~10–15 ms per *request*).

### File yang Dibutuhkan Saat Runtime (Deployment)
Saat aplikasi berjalan, hanya dibutuhkan **1 file database**:
- `data/sources/static/movielens.db` (~15 MB)

### Cara Memperbarui Data Jika Klaster K-Means di Python Diubah
Jika Anda mengubah cara klasterisasi di notebook Python dan menghasilkan file `user_clusters_fold{1..5}.pkl` serta `item_clusters_fold{1..5}.pkl` baru:

1. Ekspor file `.pkl` klaster menjadi `data/sources/static/clusters.json`:
   ```bash
   python -c "
   import joblib, json
   out = {'user': {}, 'item': {}}
   for f in range(1, 6):
       uc = joblib.load(f'../../clusters/cluster_data/user_clusters_fold{f}.pkl')
       ic = joblib.load(f'../../clusters/cluster_data/item_clusters_fold{f}.pkl')
       out['user'][str(f)] = {str(k): {str(u): int(l) for u, l in v.items()} for k, v in uc.items()}
       out['item'][str(f)] = {str(k): {str(i): int(l) for i, l in v.items()} for k, v in ic.items()}
   with open('data/sources/static/clusters.json', 'w') as fp:
       json.dump(out, fp)
   "
   ```
2. Jalankan perintah *seed* untuk memperbarui `movielens.db`:
   ```bash
   npm run seed
   ```

---

## 5. Panduan Maintenance & Pengembangan Fitur Baru

### A. Mengubah Parameter Default Komparasi (`fold`, `user`, `ku`, `ki`, `N`, `threshold`)
- **Default Halaman Awal (`/compare`)**: Ubah nilai default di `app/compare/page.tsx`.
- **Default Endpoint API (`/api/compare`)**: Ubah parameter fallback di `app/api/compare/route.ts`.
- **Default Repository**: Ubah nilai default di `data/repositories/recommendation.repository.impl.ts` (fungsi `compareUserTopN`).

### B. Mengubah Aturan Pengurutan Top-N atau Rumus Metrik
Buka file `data/repositories/recommendation.repository.impl.ts`:
- Fungsi `buildTopNList(...)`:
  - Saat ini mengurutkan kandidat berdasarkan **rating prediksi tertinggi (`pred`)**, dan jika seri diputus oleh **ID film terkecil (`itemId`)** sesuai fungsi `topn_table` di Python (`np.lexsort((items, -pred))[:N]`).
  - Jika Anda ingin mengurutkan berdasarkan `score` (`argmax_score`), cukup ganti pembanding `preds[b] - preds[a]` menjadi `scores[b] - scores[a]`.
- Fungsi `calculateMetrics(...)`:
  - Menghitung `hits`, `precision`, `recall`, `f1`, `dcg`, dan `ndcg`.

### C. Menambahkan Halaman / Route Baru sesuai Clean Architecture
1. **Daftarkan Path Route**: Tambahkan konstanta URL baru di `config/routes.ts` (dan tambahkan ke `MAIN_NAV_ITEMS` jika ingin tampil di Navbar).
2. **Domain Layer**: Buat *Entity* di `domain/entities/` dan kontrak *Repository* di `domain/repositories/` (jika membutuhkan struktur data baru).
3. **Application Layer**: Buat *Use Case* di `application/use-cases/`.
4. **Data Layer**: Buat *DataSource* di `data/datasources/` dan implementasi *Repository* di `data/repositories/`.
5. **Dependency Injection**: Daftarkan *Use Case* baru ke dalam objek `container.useCases` di `di/container.ts`.
6. **Presentation & App Router**:
   - Buat komponen tampilan di `presentation/views/`.
   - Buat file route `page.tsx` di dalam folder `app/<nama-route>/page.tsx` yang memanggil `container.useCases` lalu me-*render* komponen View tersebut.

---

## 6. Perintah Berguna (Scripts)

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server development Next.js (Turbopack). |
| `npm run seed` | Membangun ulang database SQLite `data/sources/static/movielens.db`. |
| `npx tsc --noEmit` | Memeriksa validitas seluruh tipe TypeScript tanpa melakukan *build*. |
| `npm run build` | Mem-build aplikasi untuk produksi. |
| `npm run start` | Menjalankan hasil build produksi. |
