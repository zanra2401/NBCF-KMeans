/**
 * Domain Entities untuk evaluasi & perbandingan Top-N:
 * NBCF Biasa vs NBCF + Klaster (K-Means) vs Ground Truth
 */

export interface TopNItemEntity {
  readonly rank: number;
  readonly itemId: number;
  readonly title: string;
  readonly link: string;
  readonly pred: number;
  readonly score: number;
  readonly testRating: number | null;
  readonly relevant: boolean;
}

export interface GroundTruthItemEntity {
  readonly rank: number;
  readonly itemId: number;
  readonly title: string;
  readonly link: string;
  readonly rating: number;
  readonly relevant: boolean;
}

export interface UserEvalMetricsEntity {
  readonly n: number;
  readonly hits: number;
  readonly totalRelevant: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly dcg: number;
  readonly ndcg: number;
}

export interface UserTopNComparisonEntity {
  readonly fold: number;
  readonly user: {
    readonly id: number;
    readonly age: number;
    readonly occupation: string;
  };
  readonly ku: number;
  readonly ki: number;
  readonly n: number;
  readonly threshold: number;
  readonly nbcf: {
    readonly items: readonly TopNItemEntity[];
    readonly metrics: UserEvalMetricsEntity;
  };
  readonly clusteredNbcf: {
    readonly items: readonly TopNItemEntity[];
    readonly metrics: UserEvalMetricsEntity;
  };
  readonly groundTruth: readonly GroundTruthItemEntity[];
}
