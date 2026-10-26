/**
 * Domain Entity: ItemEntity
 * Representasi murni objek bisnis di Domain Layer (independen dari framework & format sumber data).
 */
export interface ItemEntity {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly metrics: Readonly<Record<string, number>>;
  readonly description?: string;
}
