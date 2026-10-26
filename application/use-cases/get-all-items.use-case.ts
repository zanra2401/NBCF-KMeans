import type { ItemEntity } from "@/domain/entities/item.entity";
import type { IItemRepository } from "@/domain/repositories/item.repository";
import type { GetItemsQueryDTO } from "../dtos/item.dto";

/**
 * Use Case: GetAllItemsUseCase
 * Mengorkestrasi pengambilan seluruh data statis (beserta filter opsional) melalui kontrak repository.
 */
export class GetAllItemsUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  async execute(query?: GetItemsQueryDTO): Promise<readonly ItemEntity[]> {
    return this.itemRepository.getAll(query);
  }
}
