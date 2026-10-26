import type { MovieSqliteRow } from "../models/movie.model";
import { getSqliteDatabase } from "./sqlite.client";

export interface IMovieSqliteDataSource {
  findAll(search?: string, limit?: number): Promise<readonly MovieSqliteRow[]>;
  findById(id: number): Promise<MovieSqliteRow | null>;
  countAll(): Promise<number>;
}

export class MovieSqliteDataSourceImpl implements IMovieSqliteDataSource {
  async findAll(
    search?: string,
    limit = 100
  ): Promise<readonly MovieSqliteRow[]> {
    const db = getSqliteDatabase();
    if (search) {
      const stmt = db.prepare(
        "SELECT id, title, link FROM movies WHERE title LIKE ? ORDER BY id ASC LIMIT ?"
      );
      return stmt.all(`%${search}%`, limit) as unknown as MovieSqliteRow[];
    }
    const stmt = db.prepare(
      "SELECT id, title, link FROM movies ORDER BY id ASC LIMIT ?"
    );
    return stmt.all(limit) as unknown as MovieSqliteRow[];
  }

  async findById(id: number): Promise<MovieSqliteRow | null> {
    const db = getSqliteDatabase();
    const stmt = db.prepare("SELECT id, title, link FROM movies WHERE id = ?");
    const row = stmt.get(id) as unknown as MovieSqliteRow | undefined;
    return row ?? null;
  }

  async countAll(): Promise<number> {
    const db = getSqliteDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as total FROM movies")
      .get() as unknown as { total: number };
    return Number(row.total);
  }
}
