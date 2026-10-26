import type { ItemEntity } from "@/domain/entities/item.entity";
import type { ItemStaticModel } from "../models/item.model";

/**
 * Data Mapper: ItemMapper
 * Mengonversi model mentah dari file statis (ItemStaticModel) menjadi Domain Entity (ItemEntity).
 */
export class ItemMapper {
  static toDomain(model: ItemStaticModel): ItemEntity {
    return {
      id: model.id,
      code: model.item_code,
      name: model.item_name,
      category: model.cluster_category,
      metrics: { ...model.feature_values },
      description: model.notes,
    };
  }
}
