import type { UserTopNComparisonEntity } from "@/domain/entities/recommendation.entity";
import type {
  CompareUserTopNParams,
  EligibleUserSummary,
  IRecommendationRepository,
} from "@/domain/repositories/recommendation.repository";

/**
 * Use Case: CompareUserTopNUseCase
 * Mengorkestrasi perbandingan Top-N antara NBCF Biasa vs NBCF + Klaster vs Ground Truth
 * beserta perhitungan metrik Precision, Recall, F1-Score, DCG, dan NDCG per user.
 */
export class CompareUserTopNUseCase {
  constructor(
    private readonly recommendationRepository: IRecommendationRepository
  ) {}

  async execute(
    params: CompareUserTopNParams
  ): Promise<UserTopNComparisonEntity> {
    return this.recommendationRepository.compareUserTopN(params);
  }

  async getEligibleUsers(
    fold: number,
    threshold?: number
  ): Promise<readonly EligibleUserSummary[]> {
    return this.recommendationRepository.getEligibleUsers(fold, threshold);
  }
}
