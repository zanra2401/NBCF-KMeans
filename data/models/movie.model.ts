/**
 * Data Model: MovieSqliteRow
 * Skema baris tabel `movies` di dalam database SQLite.
 */
export interface MovieSqliteRow {
  readonly id: number;
  readonly title: string;
  readonly link: string;
}
