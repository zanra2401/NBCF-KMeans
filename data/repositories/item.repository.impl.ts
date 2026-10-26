import type { ItemEntity } from "@/domain/entities/item.entity";
import type {
  IItemRepository,
  ItemFilterCriteria,
} from "@/domain/repositories/item.repository";
import type { IItemStaticDataSource } from "../datasources/item-static.datasource";
import { ItemMapper } from "../mappers/item.mapper";

/**
 * Repository Implementation: ItemRepositoryImpl
 * Mengimplementasikan kontrak IItemRepository menggunakan sumber data file statis (Read-Only).
 */
export class ItemRepositoryImpl implements IItemRepository {
  constructor(private readonly dataSource: IItemStaticDataSource) {}

  async getAll(filter?: ItemFilterCriteria): Promise<readonly ItemEntity[]> {
    const rawItems = await this.dataSource.readAll();
    let entities = rawItems.map(ItemMapper.toDomain);

    if (filter?.category) {
      entities = entities.filter(
        (item) => item.category.toLowerCase() === filter.category?.toLowerCase()
      );
    }

    if (filter?.search) {
      const keyword = filter.search.toLowerCase();
      entities = entities.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.code.toLowerCase().includes(keyword)
      );
    }

    return entities;
  }

  async getById(id: string): Promise<ItemEntity | null> {
    const rawItem = await this.dataSource.readById(id);
    if (!rawItem) {
      return null;
    }
    return ItemMapper.toDomain(rawItem);
  }
}
