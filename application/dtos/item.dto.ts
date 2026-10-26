import type { ItemFilterCriteria } from "@/domain/repositories/item.repository";

/**
 * Data Transfer Objects (DTO) untuk komunikasi dari Presentation ke Application Use Case.
 */
export type GetItemsQueryDTO = ItemFilterCriteria;

export interface GetItemByIdQueryDTO {
  readonly id: string;
}
