import type { ItemStaticModel } from "../models/item.model";
import { STATIC_ITEMS_DATA } from "../sources/static/items.static";

/**
 * Kontrak DataSource Statis (Read-Only)
 * Hanya mendefinisikan pembacaan dari file statis tanpa fungsi create/update/delete.
 */
export interface IItemStaticDataSource {
  readAll(): Promise<readonly ItemStaticModel[]>;
  readById(id: string): Promise<ItemStaticModel | null>;
}

export class ItemStaticDataSourceImpl implements IItemStaticDataSource {
  async readAll(): Promise<readonly ItemStaticModel[]> {
    return STATIC_ITEMS_DATA;
  }

  async readById(id: string): Promise<ItemStaticModel | null> {
    const found = STATIC_ITEMS_DATA.find((item) => item.id === id);
    return found ?? null;
  }
}
