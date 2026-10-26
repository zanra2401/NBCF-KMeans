import { getSqliteDatabase } from "./sqlite.client";

const R = 5;
const ALPHA = Math.fround(0.01);
const R_ALPHA = Math.fround(R * ALPHA);
const LOG_UNIFORM_PRIOR = Math.fround(-Math.log(R));

interface FoldCache {
  readonly fold: number;
  readonly users: Int32Array;
  readonly items: Int32Array;
  readonly allCandidateItems: Int32Array;
  readonly userToPos: Map<number, number>;
  readonly itemToPos: Map<number, number>;
  // CSR per user (baris = u_pos, kolom = i_pos, nilai = rating 0..4)
  readonly userRowOffsets: Int32Array;
  readonly userRowItems: Int32Array;
  readonly userRowRatings: Uint8Array;
  readonly userLogPrior: Float32Array; // (n_users * 5)
  // CSR per item (baris = i_pos, kolom = u_pos, nilai = rating 0..4)
  readonly itemRowOffsets: Int32Array;
  readonly itemRowUsers: Int32Array;
  readonly itemRowRatings: Uint8Array;
  readonly itemLogPrior: Float32Array; // (n_items * 5)
}

const foldCacheMap = new Map<number, FoldCache>();

function getFoldCache(fold: number): FoldCache {
  const cached = foldCacheMap.get(fold);
  if (cached) return cached;

  const db = getSqliteDatabase();
  const trainRows = db
    .prepare(
      "SELECT user_id, item_id, rating FROM ratings_train WHERE fold = ? ORDER BY user_id ASC, item_id ASC"
    )
    .all(fold) as unknown as {
    user_id: number;
    item_id: number;
    rating: number;
  }[];

  const testItemRows = db
    .prepare("SELECT DISTINCT item_id FROM ratings_test WHERE fold = ?")
    .all(fold) as unknown as { item_id: number }[];

  const userSet = new Set<number>();
  const itemSet = new Set<number>();
  const allItemSet = new Set<number>();

  for (const r of trainRows) {
    userSet.add(Number(r.user_id));
    itemSet.add(Number(r.item_id));
    allItemSet.add(Number(r.item_id));
  }
  for (const r of testItemRows) {
    allItemSet.add(Number(r.item_id));
  }

  const users = Int32Array.from(Array.from(userSet).sort((a, b) => a - b));
  const items = Int32Array.from(Array.from(itemSet).sort((a, b) => a - b));
  const allCandidateItems = Int32Array.from(
    Array.from(allItemSet).sort((a, b) => a - b)
  );

  const userToPos = new Map<number, number>();
  for (let idx = 0; idx < users.length; idx++) {
    userToPos.set(users[idx], idx);
  }

  const itemToPos = new Map<number, number>();
  for (let idx = 0; idx < items.length; idx++) {
    itemToPos.set(items[idx], idx);
  }

  const nUsers = users.length;
  const nItems = items.length;
  const nnz = trainRows.length;

  // Bangun CSR User -> Item
  const userCounts = new Int32Array(nUsers);
  const itemCounts = new Int32Array(nItems);
  for (const r of trainRows) {
    const uPos = userToPos.get(Number(r.user_id))!;
    const iPos = itemToPos.get(Number(r.item_id))!;
    userCounts[uPos]++;
    itemCounts[iPos]++;
  }

  const userRowOffsets = new Int32Array(nUsers + 1);
  for (let u = 0; u < nUsers; u++) {
    userRowOffsets[u + 1] = userRowOffsets[u] + userCounts[u];
  }

  const itemRowOffsets = new Int32Array(nItems + 1);
  for (let i = 0; i < nItems; i++) {
    itemRowOffsets[i + 1] = itemRowOffsets[i] + itemCounts[i];
  }

  const userRowItems = new Int32Array(nnz);
  const userRowRatings = new Uint8Array(nnz);
  const userWriteCursor = Int32Array.from(userRowOffsets.subarray(0, nUsers));

  const itemRowUsers = new Int32Array(nnz);
  const itemRowRatings = new Uint8Array(nnz);
  const itemWriteCursor = Int32Array.from(itemRowOffsets.subarray(0, nItems));

  const userRatingHist = new Int32Array(nUsers * R);
  const itemRatingHist = new Int32Array(nItems * R);

  for (const r of trainRows) {
    const uPos = userToPos.get(Number(r.user_id))!;
    const iPos = itemToPos.get(Number(r.item_id))!;
    const k = Number(r.rating) - 1;

    const uIdx = userWriteCursor[uPos]++;
    userRowItems[uIdx] = iPos;
    userRowRatings[uIdx] = k;
    userRatingHist[uPos * R + k]++;

    const iIdx = itemWriteCursor[iPos]++;
    itemRowUsers[iIdx] = uPos;
    itemRowRatings[iIdx] = k;
    itemRatingHist[iPos * R + k]++;
  }

  const userLogPrior = new Float32Array(nUsers * R);
  for (let u = 0; u < nUsers; u++) {
    const total = userRowOffsets[u + 1] - userRowOffsets[u];
    const denom = Math.fround(total + R_ALPHA);
    for (let c = 0; c < R; c++) {
      const num = Math.fround(userRatingHist[u * R + c] + ALPHA);
      userLogPrior[u * R + c] = Math.fround(
        Math.log(Math.fround(num / denom))
      );
    }
  }

  const itemLogPrior = new Float32Array(nItems * R);
  for (let i = 0; i < nItems; i++) {
    const total = itemRowOffsets[i + 1] - itemRowOffsets[i];
    const denom = Math.fround(total + R_ALPHA);
    for (let c = 0; c < R; c++) {
      const num = Math.fround(itemRatingHist[i * R + c] + ALPHA);
      itemLogPrior[i * R + c] = Math.fround(
        Math.log(Math.fround(num / denom))
      );
    }
  }

  const built: FoldCache = {
    fold,
    users,
    items,
    allCandidateItems,
    userToPos,
    itemToPos,
    userRowOffsets,
    userRowItems,
    userRowRatings,
    userLogPrior,
    itemRowOffsets,
    itemRowUsers,
    itemRowRatings,
    itemLogPrior,
  };

  foldCacheMap.set(fold, built);
  return built;
}

function loadClusterLabels(
  fold: number,
  ku: number,
  ki: number,
  cache: FoldCache
): { userClusters: Int32Array; itemClusters: Int32Array } {
  const db = getSqliteDatabase();
  const userClusters = new Int32Array(cache.users.length).fill(-1);
  const itemClusters = new Int32Array(cache.items.length).fill(-1);

  if (ku > 0) {
    const uRows = db
      .prepare(
        "SELECT user_id, cluster FROM user_clusters WHERE fold = ? AND k = ?"
      )
      .all(fold, ku) as unknown as { user_id: number; cluster: number }[];
    for (const r of uRows) {
      const pos = cache.userToPos.get(Number(r.user_id));
      if (pos !== undefined) {
        userClusters[pos] = Number(r.cluster);
      }
    }
  }

  if (ki > 0) {
    const iRows = db
      .prepare(
        "SELECT item_id, cluster FROM item_clusters WHERE fold = ? AND k = ?"
      )
      .all(fold, ki) as unknown as { item_id: number; cluster: number }[];
    for (const r of iRows) {
      const pos = cache.itemToPos.get(Number(r.item_id));
      if (pos !== undefined) {
        itemClusters[pos] = Number(r.cluster);
      }
    }
  }

  return { userClusters, itemClusters };
}

/**
 * Konversi float32 -> float16 -> float32 persis seperti `_store` di Python (`np.clip(x, -6e4, 6e4).astype(np.float16)`).
 * Menggunakan pembulatan IEEE-754 half-precision (10-bit mantissa, round-to-nearest-even) murni dengan Float32Array.
 */
const f32Buf = new Float32Array(1);
const u32Buf = new Uint32Array(f32Buf.buffer);

function roundFloat16(val: number): number {
  const clipped = Math.max(-6e4, Math.min(6e4, val));
  f32Buf[0] = clipped;
  const x = u32Buf[0];
  const exp = (x >>> 23) & 0xff;
  if (exp === 0) return 0;
  // Normal float16 range: bulatkan 13 bit mantissa terbawah (round-to-nearest-even)
  const rem = x & 0x1fff;
  const odd = (x & 0x2000) !== 0;
  u32Buf[0] =
    rem > 0x1000 || (rem === 0x1000 && odd)
      ? (x + 0x1000) & 0xffffe000
      : x & 0xffffe000;
  return f32Buf[0];
}

/**
 * Persis seperti fungsi Python `argmax_score(post)`:
 * Rating prediksi (argmax + 1); seri diputus margin kelas terbaik - kedua terbaik.
 */
export function argmaxScore(lp: Float32Array, offset: number): {
  pred: number;
  score: number;
} {
  let bestIdx = 0;
  let bestVal = lp[offset];
  let secondVal = -Infinity;

  for (let c = 1; c < R; c++) {
    const v = lp[offset + c];
    if (v > bestVal) {
      secondVal = bestVal;
      bestVal = v;
      bestIdx = c;
    } else if (v > secondVal) {
      secondVal = v;
    }
  }

  const pred = bestIdx + 1;
  const margin = Math.fround(bestVal - secondVal);
  const score = Math.fround(pred + Math.fround(margin / Math.fround(1.0 + margin)));
  return { pred, score };
}

export interface ComputedCandidateResult {
  readonly candidateItems: Int32Array;
  readonly basePosteriors: Float32Array; // (nq * 5)
  readonly clusterPosteriors: Float32Array; // (nq * 5)
}

/**
 * Menghitung log-posterior hybrid NBCF Biasa (ku=0, ki=0) dan NBCF + Klaster (ku, ki)
 * untuk seluruh kandidat item dari satu user pada satu fold.
 */
export function computeUserCandidatePosteriors(
  fold: number,
  userId: number,
  ku: number,
  ki: number
): ComputedCandidateResult {
  const cache = getFoldCache(fold);
  const uPos = cache.userToPos.get(userId) ?? -1;
  const nUsers = cache.users.length;

  // Tentukan daftar kandidat: semua item (train U test) dikurangi item yang sudah dirating user di train
  const seenTrainItems = new Set<number>();
  if (uPos >= 0) {
    const s = cache.userRowOffsets[uPos];
    const e = cache.userRowOffsets[uPos + 1];
    for (let idx = s; idx < e; idx++) {
      seenTrainItems.add(cache.items[cache.userRowItems[idx]]);
    }
  }

  const candList: number[] = [];
  for (let i = 0; i < cache.allCandidateItems.length; i++) {
    const itemId = cache.allCandidateItems[i];
    if (!seenTrainItems.has(itemId)) {
      candList.push(itemId);
    }
  }
  const candidateItems = Int32Array.from(candList);
  const nq = candidateItems.length;

  const { userClusters, itemClusters } = loadClusterLabels(fold, ku, ki, cache);
  const targetUserCluster = uPos >= 0 ? userClusters[uPos] : -1;

  // ============================================================================
  // 1. ITEM-BASED SIDE (side_i = Side(X)): entity = uPos, feature = item
  // ============================================================================
  // Hitung T[k_, n_, r] dan D[n_, r] untuk target user uPos terhadap semua neighbor user n_
  const D_i = new Float32Array(nUsers * R);
  const T_i = new Float32Array(R * nUsers * R);

  if (uPos >= 0) {
    const uStart = cache.userRowOffsets[uPos];
    const uEnd = cache.userRowOffsets[uPos + 1];
    for (let idx = uStart; idx < uEnd; idx++) {
      const featItemPos = cache.userRowItems[idx];
      const uRatingIdx = cache.userRowRatings[idx]; // r (0..4)

      const iStart = cache.itemRowOffsets[featItemPos];
      const iEnd = cache.itemRowOffsets[featItemPos + 1];
      for (let j = iStart; j < iEnd; j++) {
        const nbUserPos = cache.itemRowUsers[j];
        const nbRatingIdx = cache.itemRowRatings[j]; // k_ (0..4)
        D_i[nbUserPos * R + uRatingIdx] += 1.0;
        T_i[(nbRatingIdx * nUsers + nbUserPos) * R + uRatingIdx] += 1.0;
      }
    }
  }

  // Tabel log-likelihood L_i[(nbUserPos * R + k_) * R + r]
  const L_i = new Float32Array(nUsers * R * R);
  if (uPos >= 0) {
    for (let nb = 0; nb < nUsers; nb++) {
      for (let k = 0; k < R; k++) {
        const baseL = (nb * R + k) * R;
        const baseT = (k * nUsers + nb) * R;
        const baseD = nb * R;
        for (let r = 0; r < R; r++) {
          const num = Math.fround(T_i[baseT + r] + ALPHA);
          const den = Math.fround(D_i[baseD + r] + R_ALPHA);
          L_i[baseL + r] = Math.fround(Math.log(Math.fround(num / den)));
        }
      }
    }
  }

  const prior_i = new Float32Array(R);
  if (uPos >= 0) {
    for (let r = 0; r < R; r++) {
      prior_i[r] = cache.userLogPrior[uPos * R + r];
    }
  } else {
    prior_i.fill(LOG_UNIFORM_PRIOR);
  }

  const post_i_base = new Float32Array(nq * R);
  const pw_i_base = new Float32Array(nq);
  const post_i_clus = new Float32Array(nq * R);
  const pw_i_clus = new Float32Array(nq);

  const full_i = new Float32Array(R);
  const filt_i = new Float32Array(R);

  for (let q = 0; q < nq; q++) {
    const bPos = cache.itemToPos.get(candidateItems[q]) ?? -1;
    full_i.fill(0);
    filt_i.fill(0);
    let lens = 0;
    let cnt = 0;

    if (bPos >= 0) {
      const iStart = cache.itemRowOffsets[bPos];
      const iEnd = cache.itemRowOffsets[bPos + 1];
      lens = iEnd - iStart;

      if (uPos >= 0) {
        for (let j = iStart; j < iEnd; j++) {
          const nbUserPos = cache.itemRowUsers[j];
          const k = cache.itemRowRatings[j];
          const lOff = (nbUserPos * R + k) * R;
          const sameCluster =
            ku > 0 && userClusters[nbUserPos] === targetUserCluster;
          if (sameCluster) cnt++;

          for (let r = 0; r < R; r++) {
            const lv = L_i[lOff + r];
            full_i[r] = Math.fround(full_i[r] + lv);
            if (sameCluster) {
              filt_i[r] = Math.fround(filt_i[r] + lv);
            }
          }
        }
      }
    }

    const useClus = cnt > 0;
    const cClus = useClus ? cnt : lens;
    pw_i_base[q] = Math.fround(1.0 / (1.0 + lens));
    pw_i_clus[q] = Math.fround(1.0 / (1.0 + cClus));

    const qOff = q * R;
    for (let r = 0; r < R; r++) {
      post_i_base[qOff + r] = Math.fround(prior_i[r] + full_i[r]);
      post_i_clus[qOff + r] = Math.fround(
        prior_i[r] + (useClus ? filt_i[r] : full_i[r])
      );
    }
  }

  // ============================================================================
  // 2. USER-BASED SIDE (side_u = Side(XT)): entity = candItem aPos, feature = user
  // ============================================================================
  // Neighbor dari b = uPos pada XT adalah item-item yang dirating oleh uPos di train
  const uStart = uPos >= 0 ? cache.userRowOffsets[uPos] : 0;
  const uEnd = uPos >= 0 ? cache.userRowOffsets[uPos + 1] : 0;
  const numNbItems = uEnd - uStart; // M

  const nbItemPosList = new Int32Array(numNbItems);
  const nbItemRatingList = new Uint8Array(numNbItems);
  const nbItemClusterList = new Int32Array(numNbItems);

  // Untuk mempercepat perhitungan D_u dan T_u per kandidat item aPos:
  // Untuk setiap user w (0..nUsers-1), simpan daftar indeks j (0..numNbItems-1)
  // dari item neighbor yang pernah dirating user w, serta apakah ratingnya sama dengan k_
  const userToNbOffsets = new Int32Array(nUsers + 1);
  const tempCounts = new Int32Array(nUsers);

  for (let j = 0; j < numNbItems; j++) {
    const nbItemPos = cache.userRowItems[uStart + j];
    const k = cache.userRowRatings[uStart + j];
    nbItemPosList[j] = nbItemPos;
    nbItemRatingList[j] = k;
    nbItemClusterList[j] = ki > 0 ? itemClusters[nbItemPos] : -1;

    const s = cache.itemRowOffsets[nbItemPos];
    const e = cache.itemRowOffsets[nbItemPos + 1];
    for (let idx = s; idx < e; idx++) {
      tempCounts[cache.itemRowUsers[idx]]++;
    }
  }

  for (let u = 0; u < nUsers; u++) {
    userToNbOffsets[u + 1] = userToNbOffsets[u] + tempCounts[u];
  }

  const totalLinks = userToNbOffsets[nUsers];
  const userToNbIdx = new Int32Array(totalLinks);
  const userToNbSameRating = new Uint8Array(totalLinks);
  const writeCur = Int32Array.from(userToNbOffsets.subarray(0, nUsers));

  for (let j = 0; j < numNbItems; j++) {
    const nbItemPos = nbItemPosList[j];
    const k = nbItemRatingList[j];
    const s = cache.itemRowOffsets[nbItemPos];
    const e = cache.itemRowOffsets[nbItemPos + 1];
    for (let idx = s; idx < e; idx++) {
      const wUser = cache.itemRowUsers[idx];
      const wRating = cache.itemRowRatings[idx];
      const pos = writeCur[wUser]++;
      userToNbIdx[pos] = j;
      userToNbSameRating[pos] = wRating === k ? 1 : 0;
    }
  }

  const basePosteriors = new Float32Array(nq * R);
  const clusterPosteriors = new Float32Array(nq * R);

  const D_u = new Float32Array(numNbItems * R);
  const T_u = new Float32Array(numNbItems * R);
  const full_u = new Float32Array(R);
  const filt_u = new Float32Array(R);

  for (let q = 0; q < nq; q++) {
    const aPos = cache.itemToPos.get(candidateItems[q]) ?? -1;
    const lens = numNbItems;
    let cnt = 0;
    full_u.fill(0);
    filt_u.fill(0);

    if (aPos >= 0 && numNbItems > 0) {
      D_u.fill(0);
      T_u.fill(0);

      const iStart = cache.itemRowOffsets[aPos];
      const iEnd = cache.itemRowOffsets[aPos + 1];
      for (let idx = iStart; idx < iEnd; idx++) {
        const wUser = cache.itemRowUsers[idx];
        const r = cache.itemRowRatings[idx]; // rating wUser pada kandidat item aPos (0..4)

        const lStart = userToNbOffsets[wUser];
        const lEnd = userToNbOffsets[wUser + 1];
        for (let l = lStart; l < lEnd; l++) {
          const j = userToNbIdx[l];
          const dIdx = j * R + r;
          D_u[dIdx] += 1.0;
          if (userToNbSameRating[l] === 1) {
            T_u[dIdx] += 1.0;
          }
        }
      }

      const targetItemCluster = ki > 0 ? itemClusters[aPos] : -1;
      for (let j = 0; j < numNbItems; j++) {
        const sameCluster =
          ki > 0 && nbItemClusterList[j] === targetItemCluster;
        if (sameCluster) cnt++;
        const jOff = j * R;
        for (let r = 0; r < R; r++) {
          const num = Math.fround(T_u[jOff + r] + ALPHA);
          const den = Math.fround(D_u[jOff + r] + R_ALPHA);
          const lv = Math.fround(Math.log(Math.fround(num / den)));
          full_u[r] = Math.fround(full_u[r] + lv);
          if (sameCluster) {
            filt_u[r] = Math.fround(filt_u[r] + lv);
          }
        }
      }
    }

    const useClus = aPos >= 0 && cnt > 0;
    const cClus = useClus ? cnt : lens;
    const pw_u_b = Math.fround(1.0 / (1.0 + lens));
    const pw_u_c = Math.fround(1.0 / (1.0 + cClus));

    const pw_i_b = pw_i_base[q];
    const pw_i_c = pw_i_clus[q];

    const qOff = q * R;
    for (let r = 0; r < R; r++) {
      const pr_u =
        aPos >= 0 ? cache.itemLogPrior[aPos * R + r] : LOG_UNIFORM_PRIOR;
      const post_u_b = Math.fround(pr_u + full_u[r]);
      const post_u_c = Math.fround(pr_u + (useClus ? filt_u[r] : full_u[r]));

      const hybBase = Math.fround(
        Math.fround(pw_i_b * post_i_base[qOff + r]) +
          Math.fround(pw_u_b * post_u_b)
      );
      const hybClus = Math.fround(
        Math.fround(pw_i_c * post_i_clus[qOff + r]) +
          Math.fround(pw_u_c * post_u_c)
      );

      basePosteriors[qOff + r] = roundFloat16(hybBase);
      clusterPosteriors[qOff + r] = roundFloat16(hybClus);
    }
  }

  return {
    candidateItems,
    basePosteriors,
    clusterPosteriors,
  };
}
