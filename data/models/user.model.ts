/**
 * Data Model: UserSqliteRow
 * Skema baris tabel `users` di dalam database SQLite.
 */
export interface UserSqliteRow {
  readonly id: number;
  readonly age: number;
  readonly occupation: string;
}
