import type { UserTopNComparisonEntity } from "../entities/recommendation.entity";

export interface CompareUserTopNParams {
  readonly fold: number;
  readonly userId: number;
  readonly ku?: number;
  readonly ki?: number;
  readonly n?: number;
  readonly threshold?: number;
}

export interface EligibleUserSummary {
  readonly id: number;
  readonly age: number;
  readonly occupation: string;
  readonly relevantCount: number;
}

/**
 * Kontrak Repository Domain untuk Evaluasi Top-N Rekomendasi (Read-Only)
 */
export interface IRecommendationRepository {
  getEligibleUsers(
    fold: number,
    threshold?: number
  ): Promise<readonly EligibleUserSummary[]>;
  compareUserTopN(
    params: CompareUserTopNParams
  ): Promise<UserTopNComparisonEntity>;
}
