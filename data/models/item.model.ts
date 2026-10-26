/**
 * Data Model: ItemStaticModel
 * Merepresentasikan struktur skema mentah (raw schema) di dalam file statis JSON/TS.
 */
export interface ItemStaticModel {
  readonly id: string;
  readonly item_code: string;
  readonly item_name: string;
  readonly cluster_category: string;
  readonly feature_values: Readonly<Record<string, number>>;
  readonly notes?: string;
}
