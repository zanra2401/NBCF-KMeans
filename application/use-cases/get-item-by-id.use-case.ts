import type { ItemEntity } from "@/domain/entities/item.entity";
import { EntityNotFoundError } from "@/domain/errors/domain.error";
import type { IItemRepository } from "@/domain/repositories/item.repository";
import type { GetItemByIdQueryDTO } from "../dtos/item.dto";

/**
 * Use Case: GetItemByIdUseCase
 * Mengambil detail satu item berdasarkan ID dari repository.
 */
export class GetItemByIdUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  async execute(query: GetItemByIdQueryDTO): Promise<ItemEntity> {
    const item = await this.itemRepository.getById(query.id);
    if (!item) {
      throw new EntityNotFoundError("Item", query.id);
    }
    return item;
  }
}
