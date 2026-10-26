import type { UserEntity } from "@/domain/entities/user.entity";
import type {
  IUserRepository,
  UserFilterCriteria,
} from "@/domain/repositories/user.repository";
import type { IUserSqliteDataSource } from "../datasources/user-sqlite.datasource";
import { UserMapper } from "../mappers/user.mapper";

export class UserRepositoryImpl implements IUserRepository {
  constructor(private readonly dataSource: IUserSqliteDataSource) {}

  async getAll(filter?: UserFilterCriteria): Promise<readonly UserEntity[]> {
    const rows = await this.dataSource.findAll(
      filter?.occupation,
      filter?.limit
    );
    return rows.map(UserMapper.toDomain);
  }

  async getById(id: number): Promise<UserEntity | null> {
    const row = await this.dataSource.findById(id);
    return row ? UserMapper.toDomain(row) : null;
  }

  async count(): Promise<number> {
    return this.dataSource.countAll();
  }
}
