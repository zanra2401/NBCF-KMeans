import type { ItemEntity } from "../entities/item.entity";

export interface ItemFilterCriteria {
  readonly search?: string;
  readonly category?: string;
}

/**
 * Domain Repository Contract: IItemRepository
 * Hanya menyediakan operasi pembacaan (Read-Only) karena sumber data berasal dari file statis.
 * Tidak ada operasi mutasi (create / update / delete).
 */
export interface IItemRepository {
  getAll(filter?: ItemFilterCriteria): Promise<readonly ItemEntity[]>;
  getById(id: string): Promise<ItemEntity | null>;
}
