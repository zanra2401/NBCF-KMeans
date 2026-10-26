import type { ItemStaticModel } from "@/data/models/item.model";

/**
 * Static File Data Source
 * File statis yang menyimpan dataset read-only (tidak ada operasi tulis/create).
 */
export const STATIC_ITEMS_DATA: readonly ItemStaticModel[] = [
  {
    id: "1",
    item_code: "KM-001",
    item_name: "Sampel Observasi Alpha",
    cluster_category: "Cluster 1",
    feature_values: {
      x1: 12.4,
      x2: 8.1,
      x3: 4.5,
    },
    notes: "Data statis hasil observasi awal pada kelompok pertama.",
  },
  {
    id: "2",
    item_code: "KM-002",
    item_name: "Sampel Observasi Beta",
    cluster_category: "Cluster 2",
    feature_values: {
      x1: 24.8,
      x2: 19.3,
      x3: 11.2,
    },
    notes: "Data statis hasil observasi pada kelompok kedua.",
  },
  {
    id: "3",
    item_code: "KM-003",
    item_name: "Sampel Observasi Gamma",
    cluster_category: "Cluster 1",
    feature_values: {
      x1: 11.9,
      x2: 7.8,
      x3: 4.9,
    },
    notes: "Data statis dengan karakteristik serupa KM-001.",
  },
] as const;
