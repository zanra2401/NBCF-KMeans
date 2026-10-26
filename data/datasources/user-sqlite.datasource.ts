import type { UserSqliteRow } from "../models/user.model";
import { getSqliteDatabase } from "./sqlite.client";

export interface IUserSqliteDataSource {
  findAll(
    occupation?: string,
    limit?: number
  ): Promise<readonly UserSqliteRow[]>;
  findById(id: number): Promise<UserSqliteRow | null>;
  countAll(): Promise<number>;
}

export class UserSqliteDataSourceImpl implements IUserSqliteDataSource {
  async findAll(
    occupation?: string,
    limit = 100
  ): Promise<readonly UserSqliteRow[]> {
    const db = getSqliteDatabase();
    if (occupation) {
      const stmt = db.prepare(
        "SELECT id, age, occupation FROM users WHERE occupation = ? ORDER BY id ASC LIMIT ?"
      );
      return stmt.all(occupation, limit) as unknown as UserSqliteRow[];
    }
    const stmt = db.prepare(
      "SELECT id, age, occupation FROM users ORDER BY id ASC LIMIT ?"
    );
    return stmt.all(limit) as unknown as UserSqliteRow[];
  }

  async findById(id: number): Promise<UserSqliteRow | null> {
    const db = getSqliteDatabase();
    const stmt = db.prepare(
      "SELECT id, age, occupation FROM users WHERE id = ?"
    );
    const row = stmt.get(id) as unknown as UserSqliteRow | undefined;
    return row ?? null;
  }

  async countAll(): Promise<number> {
    const db = getSqliteDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as total FROM users")
      .get() as unknown as { total: number };
    return Number(row.total);
  }
}
