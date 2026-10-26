import type { UserEntity } from "../entities/user.entity";

export interface UserFilterCriteria {
  readonly occupation?: string;
  readonly limit?: number;
}

/**
 * Domain Repository Contract: IUserRepository (Read-Only)
 */
export interface IUserRepository {
  getAll(filter?: UserFilterCriteria): Promise<readonly UserEntity[]>;
  getById(id: number): Promise<UserEntity | null>;
  count(): Promise<number>;
}
