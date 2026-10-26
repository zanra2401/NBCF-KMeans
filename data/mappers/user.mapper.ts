import type { UserEntity } from "@/domain/entities/user.entity";
import type { UserSqliteRow } from "../models/user.model";

export class UserMapper {
  static toDomain(row: UserSqliteRow): UserEntity {
    return {
      id: Number(row.id),
      age: Number(row.age),
      occupation: String(row.occupation),
    };
  }
}
