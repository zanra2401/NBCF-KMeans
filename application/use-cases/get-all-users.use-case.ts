import type { UserEntity } from "@/domain/entities/user.entity";
import type {
  IUserRepository,
  UserFilterCriteria,
} from "@/domain/repositories/user.repository";

export class GetAllUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(filter?: UserFilterCriteria): Promise<readonly UserEntity[]> {
    return this.userRepository.getAll(filter);
  }

  async count(): Promise<number> {
    return this.userRepository.count();
  }
}
