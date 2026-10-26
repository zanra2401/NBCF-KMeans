import type {
  GroundTruthItemEntity,
  TopNItemEntity,
  UserEvalMetricsEntity,
  UserTopNComparisonEntity,
} from "@/domain/entities/recommendation.entity";
import { EntityNotFoundError } from "@/domain/errors/domain.error";
import type {
  CompareUserTopNParams,
  EligibleUserSummary,
  IRecommendationRepository,
} from "@/domain/repositories/recommendation.repository";
import {
  argmaxScore,
  computeUserCandidatePosteriors,
} from "../datasources/nbcf-engine.datasource";
import { getSqliteDatabase } from "../datasources/sqlite.client";

function buildTopNList(
  candidateItems: Int32Array,
  posteriors: Float32Array,
  n: number,
  movieMap: Map<number, { title: string; link: string }>,
  testRatingMap: Map<number, number>,
  threshold: number
): TopNItemEntity[] {
  const nq = candidateItems.length;
  const indices = Array.from({ length: nq }, (_, idx) => idx);
  const preds = new Int32Array(nq);
  const scores = new Float32Array(nq);

  for (let q = 0; q < nq; q++) {
    const { pred, score } = argmaxScore(posteriors, q * 5);
    preds[q] = pred;
    scores[q] = score;
  }

  // Persis seperti Python: top = np.lexsort((items, -pred))[:N]
  // Urutkan pred tertinggi dulu; seri diputus id item terkecil
  indices.sort((a, b) => {
    if (preds[b] !== preds[a]) {
      return preds[b] - preds[a];
    }
    return candidateItems[a] - candidateItems[b];
  });

  const topIndices = indices.slice(0, n);
  return topIndices.map((qIdx, rankIdx) => {
    const itemId = candidateItems[qIdx];
    const movie = movieMap.get(itemId) ?? {
      title: `Film #${itemId}`,
      link: "",
    };
    const testRating = testRatingMap.get(itemId) ?? null;
    const relevant = testRating !== null && testRating >= threshold;

    return {
      rank: rankIdx + 1,
      itemId,
      title: movie.title,
      link: movie.link,
      pred: preds[qIdx],
      score: Number(scores[qIdx].toFixed(6)),
      testRating,
      relevant,
    };
  });
}

function calculateMetrics(
  items: readonly TopNItemEntity[],
  totalRelevant: number,
  n: number
): UserEvalMetricsEntity {
  let hits = 0;
  let dcg = 0;

  const limit = Math.min(items.length, n);
  for (let k = 0; k < limit; k++) {
    if (items[k].relevant) {
      hits++;
      // rank 0-based = k -> penyebut log2(k + 2)
      dcg += 1.0 / Math.log2(k + 2);
    }
  }

  let idcg = 0;
  const idealCount = Math.min(totalRelevant, n);
  for (let k = 0; k < idealCount; k++) {
    idcg += 1.0 / Math.log2(k + 2);
  }

  const precision = n > 0 ? hits / n : 0;
  const recall = totalRelevant > 0 ? hits / totalRelevant : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
  const ndcg = idcg > 0 ? dcg / idcg : 0;

  return {
    n,
    hits,
    totalRelevant,
    precision,
    recall,
    f1,
    dcg,
    ndcg,
  };
}

export class RecommendationRepositoryImpl implements IRecommendationRepository {
  async getEligibleUsers(
    fold: number,
    threshold = 4
  ): Promise<readonly EligibleUserSummary[]> {
    const db = getSqliteDatabase();
    const rows = db
      .prepare(
        `SELECT 
          u.id AS id,
          u.age AS age,
          u.occupation AS occupation,
          COUNT(rt.item_id) AS relevantCount
        FROM users u
        INNER JOIN ratings_test rt ON rt.user_id = u.id
        WHERE rt.fold = ? AND rt.rating >= ?
          AND EXISTS (
            SELECT 1 FROM ratings_train tr WHERE tr.fold = ? AND tr.user_id = u.id
          )
        GROUP BY u.id, u.age, u.occupation
        ORDER BY u.id ASC`
      )
      .all(fold, threshold, fold) as unknown as {
      id: number;
      age: number;
      occupation: string;
      relevantCount: number;
    }[];

    return rows.map((r) => ({
      id: Number(r.id),
      age: Number(r.age),
      occupation: String(r.occupation),
      relevantCount: Number(r.relevantCount),
    }));
  }

  async compareUserTopN(
    params: CompareUserTopNParams
  ): Promise<UserTopNComparisonEntity> {
    const fold = Math.max(1, Math.min(5, params.fold));
    const userId = params.userId;
    const ku = params.ku ?? 17;
    const ki = params.ki ?? 8;
    const n = params.n ?? 10;
    const threshold = params.threshold ?? 4;

    const db = getSqliteDatabase();

    const userRow = db
      .prepare("SELECT id, age, occupation FROM users WHERE id = ?")
      .get(userId) as unknown as
      | { id: number; age: number; occupation: string }
      | undefined;

    if (!userRow) {
      throw new EntityNotFoundError("User", String(userId));
    }

    // Ambil peta seluruh film (id -> title, link)
    const movieRows = db
      .prepare("SELECT id, title, link FROM movies")
      .all() as unknown as { id: number; title: string; link: string }[];
    const movieMap = new Map<number, { title: string; link: string }>();
    for (const m of movieRows) {
      movieMap.set(Number(m.id), {
        title: String(m.title),
        link: String(m.link ?? ""),
      });
    }

    // Ground Truth data uji: urut rating DESC, item ASC persis seperti `ground_truth(fold, user, "test", thr)`
    const gtRows = db
      .prepare(
        `SELECT item_id, rating
         FROM ratings_test
         WHERE fold = ? AND user_id = ?
         ORDER BY rating DESC, item_id ASC`
      )
      .all(fold, userId) as unknown as { item_id: number; rating: number }[];

    const testRatingMap = new Map<number, number>();
    const groundTruth: GroundTruthItemEntity[] = gtRows.map((row, idx) => {
      const itemId = Number(row.item_id);
      const rating = Number(row.rating);
      testRatingMap.set(itemId, rating);
      const movie = movieMap.get(itemId) ?? {
        title: `Film #${itemId}`,
        link: "",
      };
      return {
        rank: idx + 1,
        itemId,
        title: movie.title,
        link: movie.link,
        rating,
        relevant: rating >= threshold,
      };
    });

    const totalRelevant = groundTruth.filter((g) => g.relevant).length;

    // Hitung log-posterior NBCF Biasa & NBCF + Klaster
    const { candidateItems, basePosteriors, clusterPosteriors } =
      computeUserCandidatePosteriors(fold, userId, ku, ki);

    const nbcfItems = buildTopNList(
      candidateItems,
      basePosteriors,
      n,
      movieMap,
      testRatingMap,
      threshold
    );

    const clusteredItems = buildTopNList(
      candidateItems,
      clusterPosteriors,
      n,
      movieMap,
      testRatingMap,
      threshold
    );

    const nbcfMetrics = calculateMetrics(nbcfItems, totalRelevant, n);
    const clusteredMetrics = calculateMetrics(clusteredItems, totalRelevant, n);

    return {
      fold,
      user: {
        id: Number(userRow.id),
        age: Number(userRow.age),
        occupation: String(userRow.occupation),
      },
      ku,
      ki,
      n,
      threshold,
      nbcf: {
        items: nbcfItems,
        metrics: nbcfMetrics,
      },
      clusteredNbcf: {
        items: clusteredItems,
        metrics: clusteredMetrics,
      },
      groundTruth,
    };
  }
}
